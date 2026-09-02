/**
 * BudgetArk - Review Inbox Storage
 * File: src/storage/reviewInboxStorage.ts
 *
 * Two per-device collections behind the bank-connections Review Inbox:
 *
 *  - The INBOX (`@budgetark_pending_transactions`): fetched bank transactions
 *    awaiting user approval. Capped to the newest MAX_INBOX_SIZE by posted
 *    date so a huge first backfill can't bloat storage.
 *
 *  - The INGEST LEDGER (`@budgetark_connection_ingest_ledger`): a
 *    identityKey -> {status} map remembering every transaction the user has
 *    approved or dismissed, so re-fetches (the sync window deliberately
 *    overlaps) and reconnects never re-offer them. Entries older than
 *    LEDGER_TTL_DAYS are pruned - far beyond any fetch window's reach.
 *
 * Neither collection exports, and the inbox never syncs. The ledger's
 * DISMISSED decisions do ride partner sync (SyncDiff.dismissedTransactions,
 * merged here by mergeLedgerFromSync) so a partner phone connected to the
 * same institution doesn't re-offer what was already skipped; approved ones
 * still dedupe via the synced BudgetEntry.externalTxId. If the ledger is
 * lost (reinstall), the next partner sync restores the dismissals.
 */

import * as EncryptedStorage from "./encryptedStorage";
import type {
  IngestLedger,
  IngestLedgerEntry,
  PendingTransaction,
} from "../types";

const INBOX_KEY = "@budgetark_pending_transactions" as const;
const LEDGER_KEY = "@budgetark_connection_ingest_ledger" as const;

export const MAX_INBOX_SIZE = 500;
export const LEDGER_TTL_DAYS = 120;

/* ─── Inbox ─── */

export const getPendingTransactions = async (): Promise<PendingTransaction[]> => {
  const raw = await EncryptedStorage.getItem(INBOX_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PendingTransaction[]) : [];
  } catch {
    return [];
  }
};

const writePendingTransactions = async (
  items: PendingTransaction[],
): Promise<void> => {
  await EncryptedStorage.setItem(INBOX_KEY, JSON.stringify(items));
};

/**
 * Insert-or-replace by id, then cap to the newest MAX_INBOX_SIZE by posted
 * date (ties broken by fetchedAt) so the oldest overflow drops first.
 */
export const upsertPendingTransactions = async (
  items: PendingTransaction[],
): Promise<PendingTransaction[]> => {
  if (items.length === 0) return getPendingTransactions();
  const existing = await getPendingTransactions();
  const byId = new Map(existing.map((item) => [item.id, item]));
  for (const item of items) {
    byId.set(item.id, item);
  }
  const merged = Array.from(byId.values()).sort((a, b) =>
    a.postedAt === b.postedAt
      ? b.fetchedAt.localeCompare(a.fetchedAt)
      : b.postedAt.localeCompare(a.postedAt),
  );
  const capped = merged.slice(0, MAX_INBOX_SIZE);
  await writePendingTransactions(capped);
  return capped;
};

export const removePendingTransaction = async (
  pendingId: string,
): Promise<PendingTransaction[]> => {
  const existing = await getPendingTransactions();
  const remaining = existing.filter((item) => item.id !== pendingId);
  if (remaining.length !== existing.length) {
    await writePendingTransactions(remaining);
  }
  return remaining;
};

export const removePendingTransactions = async (
  pendingIds: string[],
): Promise<PendingTransaction[]> => {
  const ids = new Set(pendingIds);
  const existing = await getPendingTransactions();
  const remaining = existing.filter((item) => !ids.has(item.id));
  if (remaining.length !== existing.length) {
    await writePendingTransactions(remaining);
  }
  return remaining;
};

/** Drop all unreviewed items for a removed connection. */
export const purgePendingForConnection = async (
  connectionId: string,
): Promise<void> => {
  const existing = await getPendingTransactions();
  const remaining = existing.filter(
    (item) => item.connectionId !== connectionId,
  );
  if (remaining.length === existing.length) return;
  await writePendingTransactions(remaining);
};

/* ─── Ingest ledger ─── */

export const getIngestLedger = async (): Promise<IngestLedger> => {
  const raw = await EncryptedStorage.getItem(LEDGER_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as IngestLedger)
      : {};
  } catch {
    return {};
  }
};

const writeIngestLedger = async (ledger: IngestLedger): Promise<void> => {
  await EncryptedStorage.setItem(LEDGER_KEY, JSON.stringify(ledger));
};

export const recordLedgerEntries = async (
  entries: Record<string, IngestLedgerEntry>,
): Promise<void> => {
  const keys = Object.keys(entries);
  if (keys.length === 0) return;
  const ledger = await getIngestLedger();
  for (const key of keys) {
    ledger[key] = entries[key];
  }
  await writeIngestLedger(pruneLedger(ledger, new Date()));
};

/**
 * Merge partner-synced ledger decisions: union by identity key, strictly
 * newer `at` wins, ties keep local (so the re-broadcast is idempotent).
 * Returns how many keys were applied; a no-op skips the write.
 */
export const mergeLedgerFromSync = async (
  incoming: Record<string, IngestLedgerEntry>,
): Promise<number> => {
  const keys = Object.keys(incoming);
  if (keys.length === 0) return 0;
  const ledger = await getIngestLedger();
  let applied = 0;
  for (const key of keys) {
    const local = ledger[key];
    // NaN-safe: an unparseable stamp sorts as the epoch on either side.
    const incomingAt = Date.parse(incoming[key].at);
    const incomingMs = Number.isFinite(incomingAt) ? incomingAt : 0;
    const localAt = local ? Date.parse(local.at) : Number.NaN;
    const localMs = Number.isFinite(localAt) ? localAt : 0;
    if (!local || incomingMs > localMs) {
      ledger[key] = incoming[key];
      applied += 1;
    }
  }
  if (applied > 0) await writeIngestLedger(pruneLedger(ledger, new Date()));
  return applied;
};

/**
 * Drop entries older than LEDGER_TTL_DAYS. Pure helper (exported for tests);
 * returns the same object when nothing expires.
 */
export const pruneLedger = (ledger: IngestLedger, now: Date): IngestLedger => {
  const cutoff = now.getTime() - LEDGER_TTL_DAYS * 24 * 3600_000;
  let dropped = false;
  const next: IngestLedger = {};
  for (const key of Object.keys(ledger)) {
    const at = Date.parse(ledger[key].at);
    if (Number.isFinite(at) && at < cutoff) {
      dropped = true;
      continue;
    }
    next[key] = ledger[key];
  }
  return dropped ? next : ledger;
};

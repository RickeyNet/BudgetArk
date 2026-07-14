/**
 * BudgetArk - Bank Connections: Review Inbox Service
 * File: src/services/connections/reviewInboxService.ts
 *
 * Approve/dismiss operations for Review Inbox items. Approval write order is
 * deliberate: BudgetEntry FIRST, ledger second, inbox removal last - a crash
 * mid-way leaves at worst a stale inbox row that the ingest planner will not
 * recreate (the entry's externalTxId now blocks it) and the user can dismiss.
 */

import type {
  BudgetEntry,
  BudgetEntryType,
  CategoryName,
  IngestLedgerEntry,
  MerchantRule,
  PendingTransaction,
} from "../../types";
import { addBudgetEntry } from "../../storage/budgetStorage";
import {
  getPendingTransactions,
  recordLedgerEntries,
  removePendingTransaction,
  removePendingTransactions,
} from "../../storage/reviewInboxStorage";
import { upsertMerchantRule } from "../../storage/merchantRulesStorage";
import { generateUUID } from "../../utils/uuid";
import { pendingFingerprintFor } from "./ingest";
import { matchMerchantRule } from "./merchant";

const MAX_DESCRIPTION_LENGTH = 220;

export interface ApproveOptions {
  pendingId: string;
  category: CategoryName;
  /** Defaults to the item's sign-derived suggestedType. */
  type?: BudgetEntryType;
  /** Defaults to the item's raw description. */
  description?: string;
  /** Save a merchant rule so future fetches suggest this category. */
  rememberRule?: boolean;
}

const ledgerEntryFor = (
  item: PendingTransaction,
  status: "approved" | "dismissed",
  budgetEntryId?: string,
): IngestLedgerEntry => ({
  status,
  budgetEntryId,
  at: new Date().toISOString(),
  // Captured while the item is still pending so the planner can recognize
  // the posted twin if the provider reissues the transaction id.
  pendingFingerprint: item.pending
    ? pendingFingerprintFor(item.externalAccountId, item.amount, item.postedAt)
    : undefined,
});

/**
 * Turn one inbox item into a BudgetEntry. Returns the created entry, or null
 * when the item no longer exists (double-tap, synced away, etc.).
 */
export const approvePendingTransaction = async (
  opts: ApproveOptions,
): Promise<BudgetEntry | null> => {
  const inbox = await getPendingTransactions();
  const item = inbox.find((p) => p.id === opts.pendingId);
  if (!item) return null;

  const now = new Date().toISOString();
  const type = opts.type ?? item.suggestedType;
  const description = (opts.description ?? item.description)
    .slice(0, MAX_DESCRIPTION_LENGTH)
    .trim();
  const entry: BudgetEntry = {
    id: generateUUID(),
    type,
    category: opts.category,
    // BudgetEntry.amount is positive dollars; `type` carries the direction.
    amount: Math.abs(item.amount),
    description: description || undefined,
    date: item.postedAt,
    createdAt: now,
    updatedAt: now,
    source: "bank",
    externalTxId: item.id,
    merchant: item.merchant || undefined,
  };

  await addBudgetEntry(entry);
  await recordLedgerEntries({
    [item.id]: ledgerEntryFor(item, "approved", entry.id),
  });
  await removePendingTransaction(item.id);

  if (opts.rememberRule && item.merchant) {
    await upsertMerchantRule({
      id: generateUUID(),
      merchantKey: item.merchant,
      category: opts.category,
      type,
      useCount: 1,
      lastUsedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }
  return entry;
};

/** Dismiss inbox items - they never become entries and never come back. */
export const dismissPendingTransactions = async (
  pendingIds: string[],
): Promise<void> => {
  if (pendingIds.length === 0) return;
  const inbox = await getPendingTransactions();
  const byId = new Map(inbox.map((item) => [item.id, item]));
  const ledgerUpdates: Record<string, IngestLedgerEntry> = {};
  for (const id of pendingIds) {
    const item = byId.get(id);
    if (item) ledgerUpdates[id] = ledgerEntryFor(item, "dismissed");
  }
  await recordLedgerEntries(ledgerUpdates);
  await removePendingTransactions(pendingIds);
};

export const dismissPendingTransaction = (pendingId: string): Promise<void> =>
  dismissPendingTransactions([pendingId]);

/**
 * Skip one item AND remember an "ignore" rule for its merchant, so future
 * syncs auto-dismiss it (credit-card payments, debt payments, transfers).
 * Every other inbox item matching the new rule is dismissed in the same
 * pass. Returns how many items were dismissed. Items without a usable
 * merchant key fall back to a plain single dismiss.
 */
export const dismissAndIgnoreMerchant = async (
  pendingId: string,
): Promise<number> => {
  const inbox = await getPendingTransactions();
  const item = inbox.find((p) => p.id === pendingId);
  if (!item) return 0;
  if (!item.merchant) {
    await dismissPendingTransactions([pendingId]);
    return 1;
  }

  const now = new Date().toISOString();
  const rule: MerchantRule = {
    id: generateUUID(),
    merchantKey: item.merchant,
    action: "ignore",
    // Placeholders - never read while action is "ignore".
    category: "Other",
    type: item.suggestedType,
    useCount: 1,
    lastUsedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  await upsertMerchantRule(rule);

  const ids = inbox
    .filter(
      (p) =>
        p.id === pendingId ||
        (p.merchant ? matchMerchantRule(p.merchant, [rule]) !== undefined : false),
    )
    .map((p) => p.id);
  await dismissPendingTransactions(ids);
  return ids.length;
};

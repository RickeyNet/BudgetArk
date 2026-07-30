/**
 * BudgetArk - Bank Connections: Ingest Planner
 * File: src/services/connections/ingest.ts
 *
 * Pure dedup/triage of freshly fetched provider transactions into Review
 * Inbox changes. The fetch window deliberately overlaps previous syncs (so
 * pending transactions are seen again once they post), which makes this
 * planner the single guardian against duplicates. Order of defenses per
 * transaction:
 *
 *   1. account not linked / import off      -> skip
 *   2. identity key in the ingest ledger     -> skip (dismissed stays dismissed)
 *   3. identity key on an existing entry     -> skip (covers partner-approved
 *      entries arriving via P2P sync and restored backups)
 *   4. identity key already in the inbox     -> update (pending->posted, drift)
 *   5. posted tx with a NEW id matching a pending twin by fingerprint
 *      (same account, same amount, ±4 days)  -> update + ledger alias
 *   6. otherwise                             -> new inbox item
 *
 * Node-testable: no storage, no fetch, injectable clock via `now`.
 */

import type {
  BankProvider,
  BudgetEntryType,
  ExternalAccountLink,
  IngestLedger,
  IngestLedgerEntry,
  MerchantRule,
  PendingTransaction,
} from "../../types";
import type { NormalizedTransaction } from "./types";
import { matchMerchantRule, normalizeMerchant } from "./merchant";
import CryptoJS from "crypto-js";

/** Max provider-id length embedded verbatim in an identity key. */
const MAX_PROVIDER_TX_ID_LENGTH = 128;

/** Max description length stored on an inbox item (mirrors BudgetEntry cap). */
const MAX_DESCRIPTION_LENGTH = 220;

/** Days of slack when matching a posted transaction to its pending twin. */
export const PENDING_MATCH_WINDOW_DAYS = 4;

export const TRANSFER_DESCRIPTION_PATTERN =
  /(transfer|xfer|zelle (to|from)|payment to (chase|amex|.*card)|online payment|autopay|ach pmt)/i;

/**
 * Deterministic global identity for one provider transaction. Survives
 * export/import and P2P sync via BudgetEntry.externalTxId. Oversized
 * provider ids are hashed so the key stays bounded.
 */
export const identityKeyFor = (
  provider: BankProvider,
  externalAccountId: string,
  providerTxId: string,
): string => {
  const boundedTxId =
    providerTxId.length > MAX_PROVIDER_TX_ID_LENGTH
      ? CryptoJS.SHA256(providerTxId).toString(CryptoJS.enc.Hex)
      : providerTxId;
  return `${provider}:${externalAccountId}:${boundedTxId}`;
};

/**
 * Fingerprint used to recognize a transaction across a provider-side id
 * change (SimpleFIN institutions sometimes reissue ids when a pending
 * transaction posts): account + exact amount + posted day.
 */
export const pendingFingerprintFor = (
  externalAccountId: string,
  amount: number,
  postedAtIso: string,
): string => `${externalAccountId}|${amount.toFixed(2)}|${postedAtIso.slice(0, 10)}`;

const daysBetween = (aIso: string, bIso: string): number =>
  Math.abs(Date.parse(aIso) - Date.parse(bIso)) / (24 * 3600_000);

/** Days of slack when flagging a bank tx as a likely manual-entry duplicate. */
export const DUPLICATE_MATCH_WINDOW_DAYS = 3;

/** The bits of a manually-entered BudgetEntry that duplicate matching needs. */
export interface ManualEntrySignature {
  /** Positive dollars (BudgetEntry.amount); `type` carries the direction. */
  amount: number;
  type: BudgetEntryType;
  date: string;
}

export interface IngestInputs {
  provider: BankProvider;
  connectionId: string;
  fetched: NormalizedTransaction[];
  links: ExternalAccountLink[];
  inbox: PendingTransaction[];
  ledger: IngestLedger;
  /** externalTxId of ALL budget entries, including tombstoned ones. */
  knownEntryExternalIds: Set<string>;
  rules: MerchantRule[];
  /** Live manually-entered budget entries, for duplicateLikely flagging. */
  manualEntries?: ManualEntrySignature[];
  /** ISO timestamp stamped on new/updated inbox items. */
  now: string;
}

export interface IngestPlan {
  newInboxItems: PendingTransaction[];
  updatedInboxItems: PendingTransaction[];
  /** New-id -> original-key ledger aliases discovered via fingerprints. */
  ledgerAliases: Record<string, IngestLedgerEntry>;
  /** Transactions auto-skipped by an "ignore" merchant rule - recorded as
   *  dismissed so they stay gone even if the rule is later deleted. */
  autoDismissed: Record<string, IngestLedgerEntry>;
}

export const planIngest = (input: IngestInputs): IngestPlan => {
  const plan: IngestPlan = {
    newInboxItems: [],
    updatedInboxItems: [],
    ledgerAliases: {},
    autoDismissed: {},
  };

  const importableAccounts = new Set(
    input.links
      .filter((link) => link.importTransactions)
      .map((link) => link.externalAccountId),
  );
  const inboxById = new Map(input.inbox.map((item) => [item.id, item]));
  const pendingInboxByAccount = new Map<string, PendingTransaction[]>();
  for (const item of input.inbox) {
    if (!item.pending) continue;
    const list = pendingInboxByAccount.get(item.externalAccountId) ?? [];
    list.push(item);
    pendingInboxByAccount.set(item.externalAccountId, list);
  }
  const ledgerFingerprints = new Map<string, string>();
  for (const key of Object.keys(input.ledger)) {
    const fp = input.ledger[key].pendingFingerprint;
    if (fp) ledgerFingerprints.set(fp, key);
  }

  // Opposite-signed same-amount pairs across accounts in this batch suggest
  // an internal transfer.
  const amountBuckets = new Map<string, NormalizedTransaction[]>();
  for (const tx of input.fetched) {
    const bucket = Math.abs(tx.amount).toFixed(2);
    const list = amountBuckets.get(bucket) ?? [];
    list.push(tx);
    amountBuckets.set(bucket, list);
  }
  // Manual entries bucketed by absolute amount, for duplicateLikely flagging.
  const manualByAmount = new Map<string, ManualEntrySignature[]>();
  for (const entry of input.manualEntries ?? []) {
    const bucket = entry.amount.toFixed(2);
    const list = manualByAmount.get(bucket) ?? [];
    list.push(entry);
    manualByAmount.set(bucket, list);
  }
  const looksLikeManualDuplicate = (tx: NormalizedTransaction): boolean => {
    const candidates = manualByAmount.get(Math.abs(tx.amount).toFixed(2)) ?? [];
    return candidates.some(
      (entry) =>
        entry.type === (tx.amount < 0 ? "expense" : "income") &&
        daysBetween(entry.date, tx.postedAt) <= DUPLICATE_MATCH_WINDOW_DAYS,
    );
  };

  const looksLikeTransfer = (tx: NormalizedTransaction): boolean => {
    if (TRANSFER_DESCRIPTION_PATTERN.test(tx.description)) return true;
    const peers = amountBuckets.get(Math.abs(tx.amount).toFixed(2)) ?? [];
    return peers.some(
      (peer) =>
        peer !== tx &&
        peer.externalAccountId !== tx.externalAccountId &&
        Math.sign(peer.amount) === -Math.sign(tx.amount) &&
        daysBetween(peer.postedAt, tx.postedAt) <= 3,
    );
  };

  // Track keys handled this batch so a provider double-listing one
  // transaction (seen in the wild) can't create two inbox rows.
  const handledKeys = new Set<string>();

  for (const tx of input.fetched) {
    if (!importableAccounts.has(tx.externalAccountId)) continue;
    if (tx.amount === 0) continue;

    const key = identityKeyFor(input.provider, tx.externalAccountId, tx.providerTxId);
    if (handledKeys.has(key)) continue;
    handledKeys.add(key);

    if (input.ledger[key]) continue;
    if (input.knownEntryExternalIds.has(key)) continue;

    const existing = inboxById.get(key);
    if (existing) {
      const drifted =
        existing.pending !== tx.pending ||
        existing.amount !== tx.amount ||
        existing.description !== tx.description ||
        existing.postedAt !== tx.postedAt;
      if (drifted) {
        plan.updatedInboxItems.push({
          ...existing,
          pending: tx.pending,
          postedAt: tx.postedAt,
          amount: tx.amount,
          description: tx.description.slice(0, MAX_DESCRIPTION_LENGTH),
          merchant: normalizeMerchant(tx.description),
          suggestedType: tx.amount < 0 ? "expense" : "income",
          updatedAt: input.now,
        });
      }
      continue;
    }

    // Unknown id on a POSTED transaction: look for its pending twin.
    if (!tx.pending) {
      const fingerprint = pendingFingerprintFor(
        tx.externalAccountId,
        tx.amount,
        tx.postedAt,
      );

      // Twin already decided while pending -> alias the new id to that decision.
      const decidedKey = ledgerFingerprints.get(fingerprint);
      if (decidedKey) {
        plan.ledgerAliases[key] = {
          status: input.ledger[decidedKey].status,
          budgetEntryId: input.ledger[decidedKey].budgetEntryId,
          at: input.now,
          aliasOf: decidedKey,
        };
        continue;
      }

      // Twin still sitting in the inbox -> migrate it to the new id.
      const twins = pendingInboxByAccount.get(tx.externalAccountId) ?? [];
      const twin = twins.find(
        (item) =>
          item.amount === tx.amount &&
          daysBetween(item.postedAt, tx.postedAt) <= PENDING_MATCH_WINDOW_DAYS &&
          !handledKeys.has(item.id),
      );
      if (twin) {
        handledKeys.add(twin.id);
        plan.updatedInboxItems.push({
          ...twin,
          id: key,
          providerTxId: tx.providerTxId,
          pending: false,
          postedAt: tx.postedAt,
          description: tx.description.slice(0, MAX_DESCRIPTION_LENGTH),
          merchant: normalizeMerchant(tx.description),
          updatedAt: input.now,
        });
        // Remember the old id as dismissed-by-alias so a stale re-fetch of
        // the pending id can't resurrect it.
        plan.ledgerAliases[twin.id] = {
          status: "dismissed",
          at: input.now,
          aliasOf: key,
        };
        continue;
      }
    }

    const merchant = normalizeMerchant(tx.description);
    const suggestedType: BudgetEntryType = tx.amount < 0 ? "expense" : "income";
    const rule = matchMerchantRule(merchant, input.rules);

    // "Ignore" rule: auto-skip, recorded as dismissed. The fingerprint is
    // kept for pending transactions so the posted twin (possibly under a new
    // id) aliases to this decision instead of resurfacing.
    if (rule?.action === "ignore") {
      plan.autoDismissed[key] = {
        status: "dismissed",
        at: input.now,
        pendingFingerprint: tx.pending
          ? pendingFingerprintFor(tx.externalAccountId, tx.amount, tx.postedAt)
          : undefined,
      };
      continue;
    }

    plan.newInboxItems.push({
      id: key,
      connectionId: input.connectionId,
      externalAccountId: tx.externalAccountId,
      providerTxId: tx.providerTxId,
      pending: tx.pending,
      postedAt: tx.postedAt,
      amount: tx.amount,
      description: tx.description.slice(0, MAX_DESCRIPTION_LENGTH),
      merchant,
      suggestedType,
      suggestedCategory: rule?.category,
      suggestedName: rule?.renameTo,
      suggestedBusinessId:
        suggestedType === "expense" ? rule?.businessId : undefined,
      transferLikely: looksLikeTransfer(tx) || undefined,
      duplicateLikely: looksLikeManualDuplicate(tx) || undefined,
      fetchedAt: input.now,
      updatedAt: input.now,
    });
  }

  return plan;
};

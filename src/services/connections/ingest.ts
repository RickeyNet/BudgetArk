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
 *      (the twin may be in the inbox, or already decided in the ledger)
 *   6. otherwise                             -> new inbox item
 *
 * Those defenses only see transactions as they are fetched; rows already
 * in the inbox are revisited by planInboxReconciliation (below), which
 * retires them once a partner's entry or dismissal for the same
 * transaction arrives. selectSyncableDismissals picks the ledger slice
 * partner sync carries.
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
import { matchMerchantRule, normalizeMerchant, suggestedPeopleFor } from "./merchant";
import { personAssignmentFields } from "../../utils/entryPeople";
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
 * transaction posts): account + exact amount + the day it was seen.
 *
 * The day is the PENDING item's date (transacted), while the posted twin
 * carries the settlement date - usually 1-3 days later - so consumers must
 * never compare fingerprints for exact equality: match the account+amount
 * prefix and allow PENDING_MATCH_WINDOW_DAYS on the day (see
 * splitPendingFingerprint / findDecidedTwinKey). Stored verbatim in the
 * ingest ledger, so the format is a persistence contract.
 */
export const pendingFingerprintFor = (
  externalAccountId: string,
  amount: number,
  postedAtIso: string,
): string => `${externalAccountId}|${amount.toFixed(2)}|${postedAtIso.slice(0, 10)}`;

/**
 * Pull a stored fingerprint apart into its account+amount prefix and its
 * day. Account ids may themselves contain "|", so the split is from the
 * right. Returns null for anything that isn't a well-formed fingerprint
 * (fail closed: a malformed ledger value simply never matches).
 */
export const splitPendingFingerprint = (
  fingerprint: string,
): { prefix: string; day: string } | null => {
  const cut = fingerprint.lastIndexOf("|");
  if (cut <= 0) return null;
  const day = fingerprint.slice(cut + 1);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  return { prefix: fingerprint.slice(0, cut), day };
};

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

/**
 * Day-tolerant lookup of ledger decisions made while a transaction was
 * pending (they carry a pendingFingerprint), so a posted twin that the
 * provider reissued under a new id can be recognized. A decision can be the
 * twin of exactly ONE posted transaction: once a posted id has aliased to it
 * (this batch or an earlier one - aliases are persisted in the ledger), it
 * must not absorb a second same-amount purchase from the same account
 * within the window, which would otherwise sit in the inbox as "pending"
 * forever. Shared by planIngest and planInboxReconciliation.
 */
export const buildDecidedTwinFinder = (
  ledger: IngestLedger,
): {
  find: (fingerprint: string) => string | null;
  claim: (decidedKey: string) => void;
} => {
  const decidedByPrefix = new Map<string, { day: string; key: string }[]>();
  const claimed = new Set<string>();
  for (const key of Object.keys(ledger)) {
    const entry = ledger[key];
    if (entry.aliasOf) claimed.add(entry.aliasOf);
    if (!entry.pendingFingerprint) continue;
    const parts = splitPendingFingerprint(entry.pendingFingerprint);
    if (!parts) continue;
    const list = decidedByPrefix.get(parts.prefix) ?? [];
    list.push({ day: parts.day, key });
    decidedByPrefix.set(parts.prefix, list);
  }
  return {
    find: (fingerprint) => {
      const parts = splitPendingFingerprint(fingerprint);
      if (!parts) return null;
      const candidates = decidedByPrefix.get(parts.prefix) ?? [];
      let best: { key: string; distance: number } | null = null;
      for (const candidate of candidates) {
        if (claimed.has(candidate.key)) continue;
        const distance = daysBetween(candidate.day, parts.day);
        if (!(distance <= PENDING_MATCH_WINDOW_DAYS)) continue;
        if (!best || distance < best.distance) {
          best = { key: candidate.key, distance };
        }
      }
      return best?.key ?? null;
    },
    claim: (decidedKey) => {
      claimed.add(decidedKey);
    },
  };
};

export interface ReconcileInputs {
  inbox: PendingTransaction[];
  ledger: IngestLedger;
  /** externalTxId -> BudgetEntry id for ALL entries, tombstoned included. */
  knownEntries: Map<string, string>;
  /** ISO timestamp stamped on the ledger entries this plan writes. */
  now: string;
}

export interface ReconcilePlan {
  /** Inbox rows that are already decided and must go. */
  removeIds: string[];
  /** Ledger entries recording WHY each row went, so re-fetches stay quiet. */
  ledgerWrites: Record<string, IngestLedgerEntry>;
}

/**
 * Retire inbox rows that were decided somewhere else after the row was
 * created. planIngest's dedupe only guards transactions as they are
 * FETCHED, so it never revisits a row already sitting in the inbox; this
 * pass closes the ordering gaps that partner sync opens (the partner's
 * approved entries and dismissed-transaction decisions can arrive after
 * this device's connection has already fetched the same transactions).
 * Run it before every ingest and after every applied partner diff.
 *
 *  1. ledger has the row's identity key   -> remove (decided elsewhere)
 *  2. an entry carries the row's key       -> remove + ledger "approved"
 *  3. posted row whose pending twin was
 *     decided under a different id         -> remove + ledger alias
 *
 * Pure: no storage, injectable clock.
 */
export const planInboxReconciliation = (input: ReconcileInputs): ReconcilePlan => {
  const plan: ReconcilePlan = { removeIds: [], ledgerWrites: {} };
  const decidedTwins = buildDecidedTwinFinder(input.ledger);

  for (const item of input.inbox) {
    if (input.ledger[item.id]) {
      plan.removeIds.push(item.id);
      continue;
    }

    const entryId = input.knownEntries.get(item.id);
    if (entryId !== undefined) {
      plan.removeIds.push(item.id);
      plan.ledgerWrites[item.id] = {
        status: "approved",
        budgetEntryId: entryId,
        at: input.now,
        pendingFingerprint: item.pending
          ? pendingFingerprintFor(item.externalAccountId, item.amount, item.postedAt)
          : undefined,
      };
      continue;
    }

    if (!item.pending) {
      const decidedKey = decidedTwins.find(
        pendingFingerprintFor(item.externalAccountId, item.amount, item.postedAt),
      );
      if (decidedKey) {
        decidedTwins.claim(decidedKey);
        plan.removeIds.push(item.id);
        plan.ledgerWrites[item.id] = {
          status: input.ledger[decidedKey].status,
          budgetEntryId: input.ledger[decidedKey].budgetEntryId,
          at: input.now,
          aliasOf: decidedKey,
        };
      }
    }
  }
  return plan;
};

/**
 * The slice of the ingest ledger that partner sync carries: dismissed
 * decisions (and the aliases that point at them - aliases copy the
 * original's status). Approved decisions never travel this way - the
 * BudgetEntry they created already carries the key (externalTxId), and a
 * decision behind a private entry must not leak. Incremental by `at`
 * unless `sendAll` (first sync / one-time backfill).
 */
export const selectSyncableDismissals = (
  ledger: IngestLedger,
  sinceMs: number,
  sendAll: boolean,
): Record<string, IngestLedgerEntry> => {
  const out: Record<string, IngestLedgerEntry> = {};
  for (const key of Object.keys(ledger)) {
    const entry = ledger[key];
    if (entry.status !== "dismissed") continue;
    if (!sendAll) {
      const at = Date.parse(entry.at);
      if (!Number.isFinite(at) || at <= sinceMs) continue;
    }
    out[key] = entry;
  }
  return out;
};

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
  // Account-level "whose card is this" - the person fallback when no
  // merchant rule names one.
  const personIdByAccount = new Map<string, string>();
  for (const link of input.links) {
    if (link.personId) personIdByAccount.set(link.externalAccountId, link.personId);
  }
  const inboxById = new Map(input.inbox.map((item) => [item.id, item]));
  const pendingInboxByAccount = new Map<string, PendingTransaction[]>();
  for (const item of input.inbox) {
    if (!item.pending) continue;
    const list = pendingInboxByAccount.get(item.externalAccountId) ?? [];
    list.push(item);
    pendingInboxByAccount.set(item.externalAccountId, list);
  }
  const decidedTwins = buildDecidedTwinFinder(input.ledger);
  const findDecidedTwinKey = decidedTwins.find;

  /**
   * Rule-derived suggestions for a merchant key. Shared by the new-item
   * path and BOTH update paths: when a pending item posts (same id or a
   * reissued one) its description usually changes ("PENDING COSTCO" ->
   * "COSTCO WHSE #1234"), so the merchant key changes and the suggestions
   * must be recomputed - otherwise a categorize rule for the posted
   * merchant never applies until some unrelated rule edit triggers
   * replanInboxForRules. Mirrors merchant.replanInboxForRules.
   */
  const suggestionsFor = (
    merchant: string,
    suggestedType: BudgetEntryType,
    externalAccountId: string,
  ) => {
    const rule = matchMerchantRule(merchant, input.rules);
    // A rule's people (one or many) win; otherwise the card's person.
    const { personId: suggestedPersonId, personIds: suggestedPersonIds } =
      personAssignmentFields(
        suggestedType === "expense"
          ? suggestedPeopleFor(rule, personIdByAccount.get(externalAccountId))
          : [],
      );
    return {
      rule,
      suggestedCategory: rule?.category,
      suggestedName: rule?.renameTo,
      suggestedBusinessId:
        suggestedType === "expense" ? rule?.businessId : undefined,
      suggestedPersonId,
      suggestedPersonIds,
      suggestedRecurringId:
        suggestedType === "expense" ? rule?.recurringEntryId : undefined,
    };
  };

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
  // Pending inbox items already migrated to a posted id this batch. Kept
  // SEPARATE from handledKeys on purpose: a fetch that lists both forms of
  // one purchase (pending id P, then its reissued posted id X) handles P
  // through the `existing` path first, which puts P in handledKeys - if the
  // twin search also consulted handledKeys, X would find no eligible twin
  // and become a second inbox row for the same purchase.
  const claimedTwinIds = new Set<string>();
  const findPendingInboxTwin = (
    tx: NormalizedTransaction,
  ): PendingTransaction | undefined =>
    (pendingInboxByAccount.get(tx.externalAccountId) ?? []).find(
      (item) =>
        item.amount === tx.amount &&
        daysBetween(item.postedAt, tx.postedAt) <= PENDING_MATCH_WINDOW_DAYS &&
        !claimedTwinIds.has(item.id),
    );

  for (const tx of input.fetched) {
    if (!importableAccounts.has(tx.externalAccountId)) continue;
    if (tx.amount === 0) continue;

    const key = identityKeyFor(input.provider, tx.externalAccountId, tx.providerTxId);
    if (handledKeys.has(key)) continue;
    handledKeys.add(key);

    if (input.ledger[key]) {
      // Decided under this exact id - but if that decision arrived via
      // partner sync for the POSTED id while this device still holds the
      // PENDING twin in its inbox, the twin would never migrate (this branch
      // runs before the twin path) and would sit as "pending" forever.
      // Alias the twin's id to the decision; the sync service retires
      // inbox rows whose id gains an alias.
      if (!tx.pending) {
        const twin = findPendingInboxTwin(tx);
        if (twin && !input.ledger[twin.id]) {
          claimedTwinIds.add(twin.id);
          plan.ledgerAliases[twin.id] = {
            status: input.ledger[key].status,
            budgetEntryId: input.ledger[key].budgetEntryId,
            at: input.now,
            aliasOf: key,
          };
        }
      }
      continue;
    }
    if (input.knownEntryExternalIds.has(key)) continue;

    const description = tx.description.slice(0, MAX_DESCRIPTION_LENGTH);

    const existing = inboxById.get(key);
    if (existing) {
      // Compare against the stored (capped) form - a >220-char provider
      // description would otherwise "drift" on every sync and rewrite the
      // item, bumping updatedAt forever.
      const drifted =
        existing.pending !== tx.pending ||
        existing.amount !== tx.amount ||
        existing.description !== description ||
        existing.postedAt !== tx.postedAt;
      if (drifted) {
        const merchant = normalizeMerchant(tx.description);
        const suggestedType: BudgetEntryType = tx.amount < 0 ? "expense" : "income";
        const { rule: _rule, ...suggestions } = suggestionsFor(
          merchant,
          suggestedType,
          tx.externalAccountId,
        );
        plan.updatedInboxItems.push({
          ...existing,
          pending: tx.pending,
          postedAt: tx.postedAt,
          amount: tx.amount,
          description,
          merchant,
          suggestedType,
          ...suggestions,
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

      // Twin already decided while pending -> alias the new id to that
      // decision. Day-tolerant: the decision was stamped with the pending
      // (transacted) date and this tx carries the settlement date.
      const decidedKey = findDecidedTwinKey(fingerprint);
      if (decidedKey) {
        decidedTwins.claim(decidedKey);
        plan.ledgerAliases[key] = {
          status: input.ledger[decidedKey].status,
          budgetEntryId: input.ledger[decidedKey].budgetEntryId,
          at: input.now,
          aliasOf: decidedKey,
        };
        continue;
      }

      // Twin still sitting in the inbox -> migrate it to the new id.
      const twin = findPendingInboxTwin(tx);
      if (twin) {
        claimedTwinIds.add(twin.id);
        // If the pending id was ALSO listed in this batch and drifted, that
        // update targets the old id - fold it into the migration instead of
        // upserting a row the migration is about to retire.
        const driftedIndex = plan.updatedInboxItems.findIndex(
          (item) => item.id === twin.id,
        );
        const base =
          driftedIndex >= 0
            ? plan.updatedInboxItems.splice(driftedIndex, 1)[0]
            : twin;
        const merchant = normalizeMerchant(tx.description);
        const { rule: _rule, ...suggestions } = suggestionsFor(
          merchant,
          base.suggestedType,
          tx.externalAccountId,
        );
        plan.updatedInboxItems.push({
          ...base,
          id: key,
          providerTxId: tx.providerTxId,
          pending: false,
          postedAt: tx.postedAt,
          description,
          merchant,
          ...suggestions,
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
    const { rule, ...suggestions } = suggestionsFor(
      merchant,
      suggestedType,
      tx.externalAccountId,
    );

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
      description,
      merchant,
      suggestedType,
      ...suggestions,
      transferLikely: looksLikeTransfer(tx) || undefined,
      duplicateLikely: looksLikeManualDuplicate(tx) || undefined,
      fetchedAt: input.now,
      updatedAt: input.now,
    });
  }

  return plan;
};

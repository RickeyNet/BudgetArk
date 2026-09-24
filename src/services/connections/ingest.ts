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
 *      (same account, same sign, amount within the pending tolerance,
 *      ±PENDING_MATCH_WINDOW_DAYS)           -> update + ledger alias
 *      (the twin may be in the inbox, or already decided in the ledger;
 *      an exact-amount twin always beats a tolerance match, and a twin
 *      approved while pending gets its entry amount corrected)
 *   6. otherwise                             -> new inbox item
 *
 * Those defenses only see transactions as they are fetched; rows already
 * in the inbox are revisited by planInboxReconciliation (below), which
 * retires them once a partner's entry or dismissal for the same
 * transaction arrives, and by planStalePending, which retires pending
 * rows the bank stopped reporting (a dropped hold, or a posted twin the
 * tolerance couldn't tie back). selectSyncableDismissals picks the ledger
 * slice partner sync carries.
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

/**
 * Where a transaction came from, for identity keys: a live bank provider,
 * or "csv" for rows imported from a downloaded statement file
 * (services/connections/csvStatementImport). Not a BankProvider - there is
 * no connection, credential or fetcher behind a statement - so it is widened
 * here rather than on the BankProvider union.
 */
export type IngestProvider = BankProvider | "csv";

/** Max provider-id length embedded verbatim in an identity key. */
const MAX_PROVIDER_TX_ID_LENGTH = 128;

/** Max description length stored on an inbox item (mirrors BudgetEntry cap). */
const MAX_DESCRIPTION_LENGTH = 220;

/**
 * Days of slack when matching a posted transaction to its pending twin.
 * Weekend + holiday settlement regularly takes 5-6 days (a Friday-evening
 * charge posting the next Wednesday), which a 4-day window missed - the
 * posted charge then surfaced as a second inbox row.
 */
export const PENDING_MATCH_WINDOW_DAYS = 7;

/**
 * Amount slack when matching a posted transaction to its pending twin: the
 * settled amount may differ from the authorization (restaurant tips, gas
 * pump holds, foreign-currency conversion). Within max(30% of the pending
 * amount, $1), same sign, same account. An exact-amount twin is always
 * preferred over a tolerance match (see buildDecidedTwinFinder /
 * findPendingInboxTwin), so two similar charges in one week don't merge.
 */
export const PENDING_AMOUNT_TOLERANCE_RATIO = 0.3;
export const PENDING_AMOUNT_TOLERANCE_MIN = 1;

/** Whether a posted amount is a plausible settlement of a pending one. */
export const pendingAmountsCompatible = (
  pendingAmount: number,
  postedAmount: number,
): boolean => {
  if (!Number.isFinite(pendingAmount) || !Number.isFinite(postedAmount)) {
    return false;
  }
  if (Math.sign(pendingAmount) !== Math.sign(postedAmount)) return false;
  const slack = Math.max(
    PENDING_AMOUNT_TOLERANCE_RATIO * Math.abs(pendingAmount),
    PENDING_AMOUNT_TOLERANCE_MIN,
  );
  // Half a cent of float slack: amounts are cents-rounded on both sides.
  return Math.abs(postedAmount - pendingAmount) <= slack + 0.005;
};

/** Exact beats tolerance; then the closer amount; then the closer day. */
const isCloserTwin = (
  a: { exact: boolean; amountDelta: number; dayDelta: number },
  b: { exact: boolean; amountDelta: number; dayDelta: number },
): boolean => {
  if (a.exact !== b.exact) return a.exact;
  if (a.amountDelta !== b.amountDelta) return a.amountDelta < b.amountDelta;
  return a.dayDelta < b.dayDelta;
};

export const TRANSFER_DESCRIPTION_PATTERN =
  /(transfer|xfer|zelle (to|from)|payment to (chase|amex|.*card)|online payment|autopay|ach pmt)/i;

/**
 * Deterministic global identity for one provider transaction. Survives
 * export/import and P2P sync via BudgetEntry.externalTxId. Oversized
 * provider ids are hashed so the key stays bounded.
 */
export const identityKeyFor = (
  provider: IngestProvider,
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

/**
 * Full decomposition of a fingerprint: the account, the SIGNED pending
 * amount and the day. Built on splitPendingFingerprint (right-to-left, so
 * a "|" inside an account id survives). Null for anything malformed.
 */
export const parsePendingFingerprint = (
  fingerprint: string,
): { account: string; amount: number; day: string } | null => {
  const parts = splitPendingFingerprint(fingerprint);
  if (!parts) return null;
  const cut = parts.prefix.lastIndexOf("|");
  if (cut <= 0) return null;
  const amountText = parts.prefix.slice(cut + 1);
  if (!/^-?\d+\.\d{2}$/.test(amountText)) return null;
  const amount = Number(amountText);
  if (!Number.isFinite(amount)) return null;
  return { account: parts.prefix.slice(0, cut), amount, day: parts.day };
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
  provider: IngestProvider;
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
  /** Entries approved while pending whose twin settled for another amount. */
  amountCorrections: EntryAmountCorrection[];
}

export interface DecidedTwin {
  /** Ledger key of the decision made while the transaction was pending. */
  key: string;
  /** SIGNED amount the transaction had while pending (from the fingerprint). */
  pendingAmount: number;
  /** False when the match relied on the amount tolerance. */
  exact: boolean;
}

/**
 * An entry approved from a PENDING row whose posted twin settled for a
 * different amount (tip added, hold replaced by the real charge). The
 * caller rewrites the entry only while it still carries `fromAmount` - an
 * amount the user has edited since is theirs.
 */
export interface EntryAmountCorrection {
  budgetEntryId: string;
  /** Positive dollars the entry was created with (the pending amount). */
  fromAmount: number;
  /** Positive dollars the transaction settled for. */
  toAmount: number;
}

const correctionFor = (
  decision: IngestLedgerEntry,
  twin: DecidedTwin,
  postedAmount: number,
): EntryAmountCorrection | null => {
  if (twin.exact || decision.status !== "approved" || !decision.budgetEntryId) {
    return null;
  }
  const fromAmount = Math.abs(twin.pendingAmount);
  const toAmount = Math.abs(postedAmount);
  if (fromAmount === toAmount) return null;
  return { budgetEntryId: decision.budgetEntryId, fromAmount, toAmount };
};

/**
 * Day- and amount-tolerant lookup of ledger decisions made while a
 * transaction was pending (they carry a pendingFingerprint), so a posted
 * twin that the provider reissued under a new id can be recognized. A
 * decision can be the twin of exactly ONE posted transaction: once a
 * posted id has aliased to it (this batch or an earlier one - aliases are
 * persisted in the ledger), it must not absorb a second same-amount
 * purchase from the same account within the window, which would otherwise
 * sit in the inbox as "pending" forever. Candidates are ranked exact
 * amount first, then closest amount, then closest day; `reserved` keys are
 * off limits to tolerance matches (planIngest reserves every decision some
 * posted tx in the batch matches to the cent). Shared by planIngest and
 * planInboxReconciliation.
 */
export const buildDecidedTwinFinder = (
  ledger: IngestLedger,
): {
  find: (
    fingerprint: string,
    reserved?: ReadonlySet<string>,
  ) => DecidedTwin | null;
  claim: (decidedKey: string) => void;
} => {
  const decidedByAccount = new Map<
    string,
    { day: string; amount: number; key: string }[]
  >();
  const claimed = new Set<string>();
  for (const key of Object.keys(ledger)) {
    const entry = ledger[key];
    if (entry.aliasOf) claimed.add(entry.aliasOf);
    if (!entry.pendingFingerprint) continue;
    const parts = parsePendingFingerprint(entry.pendingFingerprint);
    if (!parts) continue;
    const list = decidedByAccount.get(parts.account) ?? [];
    list.push({ day: parts.day, amount: parts.amount, key });
    decidedByAccount.set(parts.account, list);
  }
  return {
    find: (fingerprint, reserved) => {
      const parts = parsePendingFingerprint(fingerprint);
      if (!parts) return null;
      const candidates = decidedByAccount.get(parts.account) ?? [];
      let best:
        | (DecidedTwin & { amountDelta: number; dayDelta: number })
        | null = null;
      for (const candidate of candidates) {
        if (claimed.has(candidate.key)) continue;
        const dayDelta = daysBetween(candidate.day, parts.day);
        if (!(dayDelta <= PENDING_MATCH_WINDOW_DAYS)) continue;
        const exact = candidate.amount === parts.amount;
        if (!exact) {
          if (!pendingAmountsCompatible(candidate.amount, parts.amount)) continue;
          if (reserved?.has(candidate.key)) continue;
        }
        const amountDelta = Math.abs(candidate.amount - parts.amount);
        if (!best || isCloserTwin({ exact, amountDelta, dayDelta }, best)) {
          best = {
            key: candidate.key,
            pendingAmount: candidate.amount,
            exact,
            amountDelta,
            dayDelta,
          };
        }
      }
      return best
        ? { key: best.key, pendingAmount: best.pendingAmount, exact: best.exact }
        : null;
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
  /** Entries approved while pending whose twin settled for another amount. */
  amountCorrections: EntryAmountCorrection[];
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
  const plan: ReconcilePlan = {
    removeIds: [],
    ledgerWrites: {},
    amountCorrections: [],
  };
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
      const twin = decidedTwins.find(
        pendingFingerprintFor(item.externalAccountId, item.amount, item.postedAt),
      );
      if (twin) {
        decidedTwins.claim(twin.key);
        const decision = input.ledger[twin.key];
        plan.removeIds.push(item.id);
        plan.ledgerWrites[item.id] = {
          status: decision.status,
          budgetEntryId: decision.budgetEntryId,
          at: input.now,
          aliasOf: twin.key,
        };
        const correction = correctionFor(decision, twin, item.amount);
        if (correction) plan.amountCorrections.push(correction);
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
    amountCorrections: [],
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
      suggestedDebtId: suggestedType === "expense" ? rule?.debtId : undefined,
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
    reserved?: ReadonlySet<string>,
  ): { item: PendingTransaction; exact: boolean } | undefined => {
    let best:
      | {
          item: PendingTransaction;
          exact: boolean;
          amountDelta: number;
          dayDelta: number;
        }
      | undefined;
    for (const item of pendingInboxByAccount.get(tx.externalAccountId) ?? []) {
      if (claimedTwinIds.has(item.id)) continue;
      const dayDelta = daysBetween(item.postedAt, tx.postedAt);
      if (!(dayDelta <= PENDING_MATCH_WINDOW_DAYS)) continue;
      const exact = item.amount === tx.amount;
      if (!exact) {
        if (!pendingAmountsCompatible(item.amount, tx.amount)) continue;
        if (reserved?.has(item.id)) continue;
      }
      const candidate = {
        item,
        exact,
        amountDelta: Math.abs(item.amount - tx.amount),
        dayDelta,
      };
      if (!best || isCloserTwin(candidate, best)) best = candidate;
    }
    return best ? { item: best.item, exact: best.exact } : undefined;
  };

  // Exact-amount twins are spoken for before the batch is walked: a posted
  // tx whose settled amount only tolerance-matches some pending row must
  // not take a row that another posted tx in this batch matches to the
  // cent (batch order is the provider's, not ours).
  const exactReserved = new Set<string>();
  for (const tx of input.fetched) {
    if (tx.pending || tx.amount === 0) continue;
    if (!importableAccounts.has(tx.externalAccountId)) continue;
    const key = identityKeyFor(input.provider, tx.externalAccountId, tx.providerTxId);
    if (
      input.ledger[key] ||
      input.knownEntryExternalIds.has(key) ||
      inboxById.has(key)
    ) {
      continue;
    }
    const inboxTwin = findPendingInboxTwin(tx);
    if (inboxTwin?.exact) exactReserved.add(inboxTwin.item.id);
    const decided = decidedTwins.find(
      pendingFingerprintFor(tx.externalAccountId, tx.amount, tx.postedAt),
    );
    if (decided?.exact) exactReserved.add(decided.key);
  }

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
        const twin = findPendingInboxTwin(tx, exactReserved)?.item;
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

    // Unknown id on a POSTED transaction: look for its pending twin - one
    // already decided (ledger fingerprint) or one still in the inbox. An
    // exact-amount twin wins wherever it lives; a tolerance match (tip,
    // hold, conversion) is used only when no exact one exists.
    if (!tx.pending) {
      const fingerprint = pendingFingerprintFor(
        tx.externalAccountId,
        tx.amount,
        tx.postedAt,
      );
      const decided = decidedTwins.find(fingerprint, exactReserved);
      const inboxTwin = findPendingInboxTwin(tx, exactReserved);

      // Twin already decided while pending -> alias the new id to that
      // decision. Day-tolerant: the decision was stamped with the pending
      // (transacted) date and this tx carries the settlement date. When the
      // settled amount differs, the entry approved from the pending row is
      // corrected to it (applied by the caller, only while the user hasn't
      // edited the amount since).
      if (decided && (decided.exact || !inboxTwin?.exact)) {
        decidedTwins.claim(decided.key);
        const decision = input.ledger[decided.key];
        plan.ledgerAliases[key] = {
          status: decision.status,
          budgetEntryId: decision.budgetEntryId,
          at: input.now,
          aliasOf: decided.key,
        };
        const correction = correctionFor(decision, decided, tx.amount);
        if (correction) plan.amountCorrections.push(correction);
        continue;
      }

      // Twin still sitting in the inbox -> migrate it to the new id, with
      // the settled amount.
      if (inboxTwin) {
        const twin = inboxTwin.item;
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
          amount: tx.amount,
          description,
          merchant,
          ...suggestions,
          missingSince: undefined,
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

/* ─── Stale pending rows ─── */

/**
 * Days a pending row may go unreported before it is retired. Bridges
 * occasionally omit a pending transaction for a pass and list it again.
 */
export const STALE_PENDING_GRACE_DAYS = 3;
/** No authorization outlives this; a pending row this old is a leftover. */
export const MAX_PENDING_AGE_DAYS = 30;

export interface StalePendingInputs {
  provider: IngestProvider;
  connectionId: string;
  /** The inbox AFTER this pass's ingest plan has been applied. */
  inbox: PendingTransaction[];
  fetched: NormalizedTransaction[];
  /** Accounts the provider actually answered for in this pass. */
  fetchedAccountIds: ReadonlySet<string>;
  /** Start of this pass's fetch window; older rows can't be judged. */
  windowStartMs: number;
  now: string;
}

export interface StalePendingPlan {
  /** Rows whose missing-since bookkeeping changed (set or cleared). */
  updatedInboxItems: PendingTransaction[];
  /** Pending rows the bank stopped reporting: retire them. */
  retireIds: string[];
  /** Dismissals for the retired rows (NO fingerprint - see below). */
  ledgerWrites: Record<string, IngestLedgerEntry>;
}

/**
 * Retire pending inbox rows the bank no longer reports. planIngest only
 * ever sees transactions the provider returns, so a pending charge that
 * vanished - a dropped hold, a declined authorization, or a posted twin
 * that settled outside the tolerance and became its own row - used to sit
 * in the inbox forever, and approving both was the classic double count.
 *
 * A row is judged only when its account answered this pass and its date
 * sits inside the fetch window (the provider was asked for it); the first
 * unreported pass stamps `missingSince`, being seen again clears it, and
 * STALE_PENDING_GRACE_DAYS of absence retires it. Rows older than
 * MAX_PENDING_AGE_DAYS retire regardless. Retired rows are ledgered as
 * dismissed WITHOUT a fingerprint on purpose: if the real charge posts
 * later under a new id, it must surface as a fresh row for review, not be
 * swallowed by an alias to this dismissal. Pure, injectable clock.
 */
export const planStalePending = (input: StalePendingInputs): StalePendingPlan => {
  const plan: StalePendingPlan = {
    updatedInboxItems: [],
    retireIds: [],
    ledgerWrites: {},
  };
  const nowMs = Date.parse(input.now);
  if (!Number.isFinite(nowMs)) return plan;
  const seen = new Set(
    input.fetched.map((tx) =>
      identityKeyFor(input.provider, tx.externalAccountId, tx.providerTxId),
    ),
  );
  const DAY_MS = 24 * 3600_000;

  for (const row of input.inbox) {
    if (row.connectionId !== input.connectionId || !row.pending) continue;
    if (!input.fetchedAccountIds.has(row.externalAccountId)) continue;

    if (seen.has(row.id)) {
      if (row.missingSince) {
        plan.updatedInboxItems.push({ ...row, missingSince: undefined });
      }
      continue;
    }

    const postedMs = Date.parse(row.postedAt);
    const ageDays = Number.isFinite(postedMs)
      ? (nowMs - postedMs) / DAY_MS
      : Number.POSITIVE_INFINITY;
    const missingMs = row.missingSince ? Date.parse(row.missingSince) : NaN;
    const missingDays = Number.isFinite(missingMs)
      ? (nowMs - missingMs) / DAY_MS
      : 0;

    if (
      ageDays > MAX_PENDING_AGE_DAYS ||
      (row.missingSince && missingDays >= STALE_PENDING_GRACE_DAYS)
    ) {
      plan.retireIds.push(row.id);
      plan.ledgerWrites[row.id] = { status: "dismissed", at: input.now };
      continue;
    }
    // Older than the window: the provider wasn't asked, so no verdict.
    if (Number.isFinite(postedMs) && postedMs < input.windowStartMs) continue;
    if (!row.missingSince) {
      plan.updatedInboxItems.push({ ...row, missingSince: input.now });
    }
  }
  return plan;
};

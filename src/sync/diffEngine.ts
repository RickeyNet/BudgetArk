/**
 * BudgetArk - Diff Engine
 * File: src/sync/diffEngine.ts
 *
 * Computes outgoing diffs and applies incoming diffs for P2P sync.
 * Uses last-write-wins conflict resolution based on updatedAt timestamps.
 */

import {
  getDebtsIncludingDeleted,
  mergeDebtsFromSync,
  mergePaymentsFromSync,
  getPaymentsIncludingDeleted,

  getPayoffStrategyEnvelope,
  savePayoffStrategyEnvelope} from "../storage/debtStorage";
import {
  getBudgetEntriesIncludingDeleted,
  mergeBudgetEntriesFromSync,
  getAllLimitsByMonthIncludingDeleted,
  mergeLimitHistoryFromSync,
} from "../storage/budgetStorage";
import {
  getSavingsGoalsIncludingDeleted,
  mergeSavingsGoalsFromSync,
} from "../storage/savingsGoalStorage";
import {
  getAssetAccountsIncludingDeleted,
  mergeAssetAccountsFromSync,
} from "../storage/assetAccountStorage";
import {
  getHoldingsIncludingDeleted,
  mergeHoldingsFromSync,
} from "../storage/holdingsStorage";
import {
  getDebtMilestonePlan,
  saveDebtMilestonePlanFromSync,
} from "../storage/debtMilestoneStorage";

import {
  getCustomCategories,
  saveCustomCategoriesFromSync,
} from "../storage/customCategoriesStorage";
import {
  getBusinessesIncludingDeleted,
  mergeBusinessesFromSync,
} from "../storage/businessStorage";
import {
  getPeopleIncludingDeleted,
  mergePeopleFromSync,
} from "../storage/personStorage";
import {
  getCategoryBucketOverrides,
  saveCategoryBucketOverridesFromSync,
} from "../storage/categoryBucketOverridesStorage";
import {
  getNetWorthSnapshots,
  saveNetWorthSnapshots,
} from "../storage/netWorthSnapshotStorage";
import {
  getMonthStartBalances,
  saveMonthStartBalancesFromSync,
} from "../storage/monthlyBalanceStorage";
import {
  getIngestLedger,
  mergeLedgerFromSync,
} from "../storage/reviewInboxStorage";
import { selectSyncableDismissals } from "../services/connections/ingest";
import { reconcileInboxWithDecisions } from "../services/connections/reviewInboxService";
import * as EncryptedStorage from "../storage/encryptedStorage";
import { isBuiltInCategory } from "../data/categoryIcons";
import { isBudgetBucket } from "../data/categoryBuckets";
import type {
  CategoryBudgetLimit,
  CustomCategory,
  BudgetBucket,
  MonthStartBalance,
  NetWorthSnapshot,
} from "../types";
import type { SyncDiff, DiffEntry, BudgetLimitDiff } from "./types";
import { dedupeMinimumDuePayments } from "../utils/debtPaymentDedupe";
import { notifyDataChanged } from "../storage/dataChangeNotifier";
import { timestampMs } from "../utils/recordTimestamps";
import {
  isObject,
  isDebtItem,
  isPaymentItem,
  isBudgetEntryItem,
  isBudgetLimitItem,
  isSavingsGoalItem,
  isAssetAccountItem,
  isHoldingItem,
  isCustomCategoryItem,
  isBusinessItem,
  isPersonItem,
  isMonthStartBalanceRecord,
  isIngestIdentityKey,
  isIngestLedgerEntryRecord,
  isNetWorthSnapshotItem,
  isValidImportCategory,
  isMonthKey,
  sanitizeDebtMilestones,
  VALID_PAYOFF_STRATEGIES,
} from "../utils/recordValidators";

/**
 * One-time backfill marker. Net-worth snapshots (and custom categories)
 * existed before they were added to the sync diff, so for an
 * already-paired couple the incremental updatedAt/capturedAt filter would
 * never transfer the pre-existing backlog - lastSyncTimestamp postdates
 * all of it. Until a sync completes with this flag set, the outgoing diff
 * sends those collections in full; the orchestrator stamps the flag after
 * the first successful sync. New pairings don't need it (first sync has
 * no lastSyncTimestamp and sends everything anyway), and a lost ACK just
 * means one redundant - idempotent - full send on the next sync.
 */
const SYNC_BACKFILL_KEY = "@budgetark_sync_backfill_done_v1";
/**
 * Second backfill marker, for the dismissed-transactions field (v1.10.1).
 * Separate key on purpose: couples already past the first backfill would
 * otherwise never send the dismissals they made before this version.
 */
const SYNC_DISMISSALS_BACKFILL_KEY = "@budgetark_sync_backfill_dismissals_v1";

/**
 * Hard cap on the dismissed-transactions map a peer may send. The ledger
 * is pruned at 120 days, so a real device holds a few hundred decisions at
 * most; anything near this is a hostile or corrupt peer, and rejecting
 * keeps a bad diff from bloating storage.
 */
export const MAX_SYNCED_DISMISSALS = 5000;

const isBackfillSyncDone = async (): Promise<boolean> =>
  (await EncryptedStorage.getItem(SYNC_BACKFILL_KEY)) === "true";

const isDismissalsBackfillDone = async (): Promise<boolean> =>
  (await EncryptedStorage.getItem(SYNC_DISMISSALS_BACKFILL_KEY)) === "true";

/**
 * Stamps the backfill markers after a successful sync.
 *
 * `peerSupportsDismissals` must be true only when the PEER's diff carried
 * the `dismissedTransactions` field (see `peerSupportsDismissals` in the
 * orchestrator). A 1.10.0 peer silently ignores that field, so stamping
 * the dismissals marker after syncing with one would mean: partner
 * upgrades later, we only send dismissals newer than lastSyncTimestamp,
 * and they never receive the older ones - re-offering transactions this
 * device already skipped. The v1 marker (snapshots/categories) is stamped
 * unconditionally because every protocol-compatible peer understands those.
 */
export const markBackfillSyncDone = async (
  peerSupportsDismissals: boolean,
): Promise<void> => {
  await EncryptedStorage.setItem(SYNC_BACKFILL_KEY, "true");
  if (peerSupportsDismissals) {
    await EncryptedStorage.setItem(SYNC_DISMISSALS_BACKFILL_KEY, "true");
  }
};

/**
 * True when an incoming diff came from a peer that understands
 * `dismissedTransactions`: senders on that version always include the
 * field (an empty map when there is nothing to send), so its presence is
 * the capability signal and `undefined` means an older peer.
 */
export const peerSupportsDismissals = (diff: SyncDiff): boolean =>
  diff.dismissedTransactions !== undefined;

/* ─── Outgoing Diff ─── */

/**
 * Computes a diff of all local data that's been modified since lastSyncTimestamp.
 * On first sync (lastSyncTimestamp is null), sends everything.
 */
export const computeOutgoingDiff = async (
  lastSyncTimestamp: string | null
): Promise<SyncDiff> => {
  // Watermark captured BEFORE any collection is read. This value (returned
  // as syncTimestamp) is what the orchestrator persists as the next
  // lastSyncTimestamp. Stamping it after the sync instead would make any
  // record edited while the sync was in flight (reads -> network round-trip
  // -> apply) sort as "older than the last sync" and be excluded from every
  // future diff - silently, forever. With the early watermark such records
  // are simply re-sent next sync, which last-write-wins makes idempotent.
  const computedAt = new Date().toISOString();

  const [
    debts,
    payments,
    budgetEntries,
    savingsGoals,
    assetAccounts,
    holdings,
    milestonePlan,
    strategyEnvelope,
    customCategories,
    businesses,
    people,
    bucketOverrides,
    netWorthSnapshots,
    monthStartBalances,
    backfillDone,
    ingestLedger,
    dismissalsBackfillDone,
  ] = await Promise.all([
    getDebtsIncludingDeleted(),
    getPaymentsIncludingDeleted(),
    getBudgetEntriesIncludingDeleted(),
    getSavingsGoalsIncludingDeleted(),
    getAssetAccountsIncludingDeleted(),
    getHoldingsIncludingDeleted(),
    getDebtMilestonePlan(),
    getPayoffStrategyEnvelope(),
    getCustomCategories(),
    getBusinessesIncludingDeleted(),
    getPeopleIncludingDeleted(),
    getCategoryBucketOverrides(),
    getNetWorthSnapshots(),
    getMonthStartBalances(),
    isBackfillSyncDone(),
    getIngestLedger(),
    isDismissalsBackfillDone(),
  ]);

  const since = lastSyncTimestamp ? new Date(lastSyncTimestamp).getTime() : 0;

  // Send pre-feature backlogs in full until one sync has completed on a
  // version that carries them (see SYNC_BACKFILL_KEY).
  const sendBacklog = !lastSyncTimestamp || !backfillDone;

  // Records flow through here as either upserts (live records updated since
  // the last sync) or deletes (tombstoned records the partner needs to
  // remove locally). Without the delete branch the partner would silently
  // resurrect any record we deleted - its next sync would upsert it back to
  // us, since we wouldn't even mention the deletion.
  // NaN-safe: the getters normalize missing `updatedAt` on read, but a
  // record that somehow still lacks one must not vanish from every diff
  // forever (`NaN > since` is always false). It rides along on the first
  // sync like everything else, and `timestampMs` maps it to the epoch after
  // that so a stamped edit supersedes it.
  const filterChanged = <T extends { updatedAt: string; deletedAt?: string }>(
    items: T[]
  ): DiffEntry<T>[] => {
    return items
      .filter((item) => !lastSyncTimestamp || timestampMs(item.updatedAt) > since)
      .map((item) => ({
        action: item.deletedAt ? ("delete" as const) : ("upsert" as const),
        record: item,
      }));
  };

  // Load full budget limits history, TOMBSTONES INCLUDED: a removed limit
  // keeps its row with `deletedAt` and a fresh `updatedAt`, which is how the
  // removal reaches the partner (the per-category merge on the other side
  // is an LWW union - an omitted row would just be "no news"). On first
  // sync we send everything; otherwise filter per-category by updatedAt so
  // unchanged limits don't get re-broadcast every sync. Storage normalizes
  // missing updatedAt to the epoch - those still ride along on first sync,
  // then get superseded by any fresh remote edit.
  const budgetLimits: BudgetLimitDiff[] = [];
  const history = await getAllLimitsByMonthIncludingDeleted();
  const isFirstSync = !lastSyncTimestamp;
  for (const [monthKey, limits] of Object.entries(history)) {
    const changed = isFirstSync
      ? limits
      : limits.filter((limit) => timestampMs(limit.updatedAt) > since);
    if (changed.length > 0) {
      budgetLimits.push({ monthKey, limits: changed });
    }
  }

  return {
    debts: filterChanged(debts),
    payments: filterChanged(payments),
    // Private entries never leave the device - live or tombstoned. Filtered
    // here (the single place outgoing diffs are built) rather than in
    // storage so local reads are unaffected. Marking an entry private bumps
    // its updatedAt, so if the partner ever re-broadcasts an old public
    // copy (backlog/re-pair), LWW keeps the newer private version local.
    // Known limitation: a copy the partner received BEFORE the entry was
    // marked private stays on their device - we deliberately don't send a
    // retraction tombstone, because it could echo back and LWW-delete the
    // live local entry.
    budgetEntries: filterChanged(
      budgetEntries.filter((entry) => !entry.isPrivate)
    ),
    savingsGoals: filterChanged(savingsGoals),
    assetAccounts: filterChanged(assetAccounts),
    // Holdings are tombstone-aware like assetAccounts. No backlog handling
    // needed: the feature is new, so no positions predate this field for an
    // already-paired couple to miss.
    holdings: filterChanged(holdings),
    budgetLimits,
    // Custom categories are not tombstoned, so filterChanged only ever
    // emits upserts here - deletions don't propagate (same as the
    // export/import path). Without this field a partner renders synced
    // entries that reference a custom name with the fallback icon and the
    // default "wants" bucket, so bucket math diverges between devices.
    // Backlog mode sends all of them: categories created before the last
    // sync predate this field and would otherwise never transfer to an
    // already-paired partner.
    customCategories: sendBacklog
      ? customCategories.map((record) => ({
          action: "upsert" as const,
          record,
        }))
      : filterChanged(customCategories),
    // Businesses are tombstone-aware like holdings. No backlog handling
    // needed: the feature is new, so no businesses predate this field for
    // an already-paired couple to miss.
    businesses: filterChanged(businesses),
    // People mirror businesses exactly (same new-feature, no-backfill case).
    people: filterChanged(people),
    // Snapshots have no updatedAt - capturedAt plays that role (a re-capture
    // during the day restamps it). Incremental syncs send only days captured
    // since the last sync; backlog mode sends the whole history (capped at
    // 730 records, ~90 KB of JSON) so paired devices converge on the union
    // of their separately-built pasts.
    netWorthSnapshots: (() => {
      const changed = sendBacklog
        ? netWorthSnapshots
        : netWorthSnapshots.filter(
            (snap) => new Date(snap.capturedAt).getTime() > since
          );
      return changed.length > 0 ? changed : undefined;
    })(),
    // Bucket overrides carry no per-key timestamps, so there's nothing to
    // filter against lastSyncTimestamp - send the whole map whenever it's
    // non-empty. The map is small (one entry per overridden category) so
    // re-broadcasting it each sync is acceptable.
    categoryBucketOverrides:
      Object.keys(bucketOverrides).length > 0 ? bucketOverrides : undefined,
    // Month-start balances: whole map whenever non-empty (one tiny record
    // per month - even years of history is a few KB). The receiver's
    // per-month LWW makes the re-broadcast idempotent, and skipping the
    // incremental filter means no backfill flag is ever needed.
    monthStartBalances:
      Object.keys(monthStartBalances).length > 0 ? monthStartBalances : undefined,
    // Dismissed bank transactions: incremental by decision time, sent in
    // full once after updating to the version that added the field (its
    // own backfill flag - see SYNC_DISMISSALS_BACKFILL_KEY). ALWAYS present
    // - an empty map when there is nothing to send - because the receiver
    // uses the field's presence as "this peer understands dismissals"
    // (peerSupportsDismissals) to decide whether its own backfill is done.
    // Backwards compatible: an older peer ignores unknown fields.
    dismissedTransactions: selectSyncableDismissals(
      ingestLedger,
      since,
      !lastSyncTimestamp || !dismissalsBackfillDone,
    ),
    debtMilestonePlan:
      !lastSyncTimestamp ||
      new Date(milestonePlan.updatedAt).getTime() > since
        ? milestonePlan
        : undefined,
    payoffStrategy: strategyEnvelope?.value,
    payoffStrategyUpdatedAt: strategyEnvelope?.updatedAt,
    syncTimestamp: computedAt,
  };
};

/* ─── Incoming Diff Application ─── */

/**
 * Merges a collection by ID using last-write-wins on updatedAt.
 *
 * Tombstone-aware:
 *  - On `delete`: we *replace* the local entry with the incoming tombstone
 *    (rather than `localMap.delete(id)`). Keeping the tombstone locally is
 *    what blocks a stale third device from later upserting the record back
 *    - it can compare against our tombstone's updatedAt and lose LWW.
 *  - On `upsert`: if the local record is already a tombstone with a newer
 *    updatedAt, we ignore the incoming upsert. That's the resurrection
 *    case the audit flagged.
 *
 * The caller saves the full merged array (live + tombstones) via the
 * tombstone-aware setters; UI consumers see only live records via
 * `filterLive`.
 */
const mergeById = <T extends { id: string; updatedAt: string; deletedAt?: string }>(
  local: T[],
  incoming: DiffEntry<T>[]
): T[] => {
  const localMap = new Map(local.map((item) => [item.id, item]));

  for (const entry of incoming) {
    const localItem = localMap.get(entry.record.id);
    // NaN-safe (missing/garbage -> epoch): a local record without
    // `updatedAt` used to be un-overwritable (`x >= NaN` is false) and an
    // incoming one could never apply, while changedCount still counted it.
    const incomingTime = timestampMs(entry.record.updatedAt);
    const localTime = localItem ? timestampMs(localItem.updatedAt) : -Infinity;

    if (incomingTime >= localTime) {
      localMap.set(entry.record.id, entry.record);
    }
    // else: local is newer - keep it. If local is a tombstone and incoming
    // is an upsert, the tombstone wins (no resurrection). If local is live
    // and incoming is a stale delete, the live record wins.
  }

  return Array.from(localMap.values());
};

/**
 * Per-record validation for an incoming SyncDiff.
 *
 * A paired peer is *semi*-trusted (same LAN, knows the shared secret) but
 * not fully trusted: a compromised partner device or a malicious actor
 * who recovered the pairing secret can deliver arbitrary records.
 * Without this gate, `applyIncomingDiff` would write any well-typed JSON
 * into authoritative storage. We reuse the same validators the JSON-import
 * path uses, and reject the entire diff on any failure so an attacker
 * can't smuggle one bad record alongside good ones.
 */
const validateDiffEntries = <T,>(
  entries: DiffEntry<T>[] | undefined,
  label: string,
  validator: (item: unknown) => boolean,
  required = false
): void => {
  if (entries === undefined || entries === null) {
    // Optional collections may be absent (older peers predate them);
    // required ones have been in the wire contract since v1, so a missing
    // one means a malformed diff, not an old app version.
    if (required) throw new Error(`Sync rejected: missing ${label} collection`);
    return;
  }
  // Must be a real array: `applyIncomingDiff` iterates and indexes these,
  // so a non-array (e.g. `{}`) would surface as a raw TypeError mid-apply
  // instead of the labeled rejection this gate exists to produce.
  if (!Array.isArray(entries)) {
    throw new Error(`Sync rejected: malformed ${label} collection`);
  }
  for (const entry of entries) {
    if (!isObject(entry) || (entry.action !== "upsert" && entry.action !== "delete")) {
      throw new Error(`Sync rejected: malformed ${label} entry`);
    }
    if (!validator(entry.record)) {
      throw new Error(`Sync rejected: invalid ${label} record`);
    }
  }
};

const validateIncomingDiff = (diff: SyncDiff): void => {
  if (!isObject(diff)) {
    throw new Error("Sync rejected: diff is not an object");
  }

  validateDiffEntries(diff.debts, "debt", isDebtItem, true);
  validateDiffEntries(diff.payments, "payment", isPaymentItem, true);
  validateDiffEntries(diff.budgetEntries, "budget entry", isBudgetEntryItem, true);
  validateDiffEntries(diff.savingsGoals, "savings goal", isSavingsGoalItem, true);
  // Declared required in SyncDiff but added post-launch (countDiffEntries
  // optional-chains it for the same reason) - tolerate absence, reject
  // non-arrays.
  validateDiffEntries(diff.assetAccounts, "asset account", isAssetAccountItem);
  validateDiffEntries(diff.holdings, "holding", isHoldingItem);
  validateDiffEntries(diff.customCategories, "custom category", isCustomCategoryItem);
  validateDiffEntries(diff.businesses, "business", isBusinessItem);
  validateDiffEntries(diff.people, "person", isPersonItem);

  // Bucket overrides are a bare map, not DiffEntry records, so they get
  // their own gate: keys must pass the same bounded category-name check the
  // import path uses, and values must be one of the three buckets. A field
  // left absent by an older peer is fine - it just means nothing to merge.
  if (diff.categoryBucketOverrides !== undefined) {
    if (!isObject(diff.categoryBucketOverrides)) {
      throw new Error("Sync rejected: malformed category bucket overrides");
    }
    for (const [category, bucket] of Object.entries(diff.categoryBucketOverrides)) {
      if (!isValidImportCategory(category) || !isBudgetBucket(bucket)) {
        throw new Error("Sync rejected: invalid category bucket override");
      }
    }
  }

  // Month-start balances: a bare `monthKey → record` map like bucket
  // overrides. Keys gate on the month-key shape, values on the shared
  // trust-boundary validator (finite bounded balance + parseable dates).
  // Absent field = older peer, fine.
  if (diff.monthStartBalances !== undefined) {
    if (!isObject(diff.monthStartBalances)) {
      throw new Error("Sync rejected: malformed month-start balances");
    }
    for (const [monthKey, record] of Object.entries(diff.monthStartBalances)) {
      if (!isMonthKey(monthKey) || !isMonthStartBalanceRecord(record)) {
        throw new Error("Sync rejected: invalid month-start balance");
      }
    }
  }

  // Dismissed bank transactions: `identityKey → ledger entry` map. Keys
  // gate on the identity-key shape, values on the ledger-entry validator
  // (dismissed only - a peer can't mark something "approved"), and the
  // whole map on a size cap. Absent field = older peer, fine.
  if (diff.dismissedTransactions !== undefined) {
    if (!isObject(diff.dismissedTransactions)) {
      throw new Error("Sync rejected: malformed dismissed transactions");
    }
    const keys = Object.keys(diff.dismissedTransactions);
    if (keys.length > MAX_SYNCED_DISMISSALS) {
      throw new Error("Sync rejected: too many dismissed transactions");
    }
    for (const key of keys) {
      if (
        !isIngestIdentityKey(key) ||
        !isIngestLedgerEntryRecord(diff.dismissedTransactions[key])
      ) {
        throw new Error("Sync rejected: invalid dismissed transaction");
      }
    }
  }

  // Snapshots are bare records (no DiffEntry wrapper - they're never
  // deleted, so there's no action to carry). Same shape/range validator as
  // the JSON-import path.
  if (diff.netWorthSnapshots !== undefined) {
    if (!Array.isArray(diff.netWorthSnapshots)) {
      throw new Error("Sync rejected: malformed net worth snapshots");
    }
    for (const snap of diff.netWorthSnapshots) {
      if (!isNetWorthSnapshotItem(snap)) {
        throw new Error("Sync rejected: invalid net worth snapshot");
      }
    }
  }

  // In the wire contract since v1, so absence means malformed, not old peer.
  // The old `if (Array.isArray(...))` guard silently skipped validation for
  // non-arrays and let applyIncomingDiff crash on them instead.
  if (!Array.isArray(diff.budgetLimits)) {
    throw new Error("Sync rejected: missing budget limits collection");
  }
  for (const bucket of diff.budgetLimits) {
    if (!isObject(bucket) || !isMonthKey(bucket.monthKey) || !Array.isArray(bucket.limits)) {
      throw new Error("Sync rejected: malformed budget limit bucket");
    }
    for (const limit of bucket.limits) {
      if (!isBudgetLimitItem(limit)) {
        throw new Error("Sync rejected: invalid budget limit record");
      }
    }
  }

  if (diff.debtMilestonePlan !== undefined) {
    if (!sanitizeDebtMilestones(diff.debtMilestonePlan)) {
      throw new Error("Sync rejected: invalid debt milestone plan");
    }
  }

  if (diff.payoffStrategy !== undefined) {
    if (
      typeof diff.payoffStrategy !== "string" ||
      !VALID_PAYOFF_STRATEGIES.has(diff.payoffStrategy)
    ) {
      throw new Error("Sync rejected: invalid payoff strategy");
    }
  }

  if (diff.payoffStrategyUpdatedAt !== undefined) {
    if (
      typeof diff.payoffStrategyUpdatedAt !== "string" ||
      Number.isNaN(Date.parse(diff.payoffStrategyUpdatedAt))
    ) {
      throw new Error("Sync rejected: invalid payoff strategy timestamp");
    }
  }
};

/**
 * Applies an incoming SyncDiff to local storage.
 * Returns the number of records that were changed.
 *
 * Validates every record before any storage write. If validation fails,
 * the entire diff is rejected and storage is left untouched.
 */
export const applyIncomingDiff = async (diff: SyncDiff): Promise<number> => {
  validateIncomingDiff(diff);

  let changedCount = 0;

  // Every tombstoned collection below merges through its store's
  // `merge*FromSync` helper: the LWW merge runs INSIDE encryptedStorage's
  // per-key write queue against the array that is actually stored at that
  // moment. The old getX -> mergeById -> saveX sequence had a read-to-write
  // window in which a user tap (or bank auto-approval) could land and be
  // silently reverted by the merge's write - sync runs in the foreground
  // while the user is active, so the window was small but real.

  // Merge debts. Tombstone-aware so local tombstones survive the merge and
  // stop a stale partner from resurrecting the deleted record.
  if (diff.debts.length > 0) {
    await mergeDebtsFromSync((localDebts) => mergeById(localDebts, diff.debts));
    changedCount += diff.debts.length;
  }

  // Merge payments. After the id-based merge, collapse duplicate
  // minimum-due rows: a partner on an app version predating deterministic
  // prompt-payment ids still logs its "minimum due" confirmation under a
  // random id, so the same real-world payment can arrive as a second
  // record. The dedupe tombstones the duplicate (balance untouched - it
  // was only ever decremented once, see debtPaymentDedupe), and the
  // tombstone flows back to the partner on the next sync. Runs against the
  // just-merged debts (the debts block above writes before this reads).
  if (diff.payments.length > 0) {
    const localDebts = await getDebtsIncludingDeleted();
    const dedupeAt = new Date().toISOString();
    await mergePaymentsFromSync((localPayments) => {
      const merged = mergeById(localPayments, diff.payments);
      return dedupeMinimumDuePayments(localDebts, merged, dedupeAt).payments;
    });
    changedCount += diff.payments.length;
  }

  // Merge budget entries. After the LWW merge, re-stamp isPrivate on any
  // entry that was private locally: a partner still holding the pre-privacy
  // public copy can win LWW by editing it, and letting their record land
  // verbatim would silently clear the flag - the entry would resume syncing
  // out on the next diff. Privacy is device-side intent, so an incoming
  // record (upsert OR tombstone) can never un-private an entry; content
  // still merges normally, and un-privating stays a local UI action.
  // importData's reconcileBudgetEntry applies the same rule on imports.
  if (diff.budgetEntries.length > 0) {
    await mergeBudgetEntriesFromSync((localEntries) => {
      const locallyPrivateIds = new Set(
        localEntries.filter((entry) => entry.isPrivate).map((entry) => entry.id)
      );
      return mergeById(localEntries, diff.budgetEntries).map((entry) =>
        locallyPrivateIds.has(entry.id) && !entry.isPrivate
          ? { ...entry, isPrivate: true }
          : entry
      );
    });
    changedCount += diff.budgetEntries.length;
  }

  // Merge savings goals
  if (diff.savingsGoals.length > 0) {
    await mergeSavingsGoalsFromSync((localGoals) =>
      mergeById(localGoals, diff.savingsGoals)
    );
    changedCount += diff.savingsGoals.length;
  }

  // Merge asset accounts
  if (diff.assetAccounts && diff.assetAccounts.length > 0) {
    const incoming = diff.assetAccounts;
    await mergeAssetAccountsFromSync((localAccounts) =>
      mergeById(localAccounts, incoming)
    );
    changedCount += incoming.length;
  }

  // Merge holdings - same tombstone-aware LWW as asset accounts. Guarded
  // with `diff.holdings &&` because an older peer's diff omits the field.
  if (diff.holdings && diff.holdings.length > 0) {
    const incoming = diff.holdings;
    await mergeHoldingsFromSync((localHoldings) => mergeById(localHoldings, incoming));
    changedCount += incoming.length;
  }

  // Merge businesses - same tombstone-aware LWW as holdings. Guarded with
  // `diff.businesses &&` because an older peer's diff omits the field.
  // The store's sync merge skips per-mutation name validation: the merge
  // already carries every local tombstone, and re-running it would reject
  // the very merge we just computed (dup names are cosmetic - entries
  // reference by id). Businesses tombstoned by the merge cascade to
  // merchant rules inside the helper.
  if (diff.businesses && diff.businesses.length > 0) {
    const incoming = diff.businesses;
    await mergeBusinessesFromSync((localBusinesses) =>
      mergeById(localBusinesses, incoming)
    );
    changedCount += incoming.length;
  }

  // Merge people - same rationale as businesses above; tombstoned people
  // cascade to merchant rules and account links inside the helper.
  if (diff.people && diff.people.length > 0) {
    const incoming = diff.people;
    await mergePeopleFromSync((localPeople) => mergeById(localPeople, incoming));
    changedCount += incoming.length;
  }

  // Merge budget limits (union of months, per-category last-write-wins).
  // Use getAllLimitsByMonth so legacy local rows are normalized to the epoch
  // and lose to any incoming row carrying a real timestamp.
  // Tombstone-aware: an incoming row with `deletedAt` that wins LWW retires
  // the local limit (kept as a tombstone so it can flow onward); a local
  // tombstone newer than the partner's live row keeps the removal. Merged
  // atomically inside the store (see mergeLimitHistoryFromSync).
  if (diff.budgetLimits.length > 0) {
    const incomingLimits = diff.budgetLimits;
    await mergeLimitHistoryFromSync((localHistory) => {
      const merged: Record<string, CategoryBudgetLimit[]> = { ...localHistory };
      const limitTime = (limit: CategoryBudgetLimit | undefined): number =>
        limit ? timestampMs(limit.updatedAt) : -Infinity;

      for (const incoming of incomingLimits) {
        const localLimits = Array.isArray(merged[incoming.monthKey])
          ? merged[incoming.monthKey]
          : [];
        const localCatMap = new Map<string, CategoryBudgetLimit>(
          localLimits.map((l) => [l.category, l])
        );
        for (const remote of incoming.limits) {
          const local = localCatMap.get(remote.category);
          if (limitTime(remote) >= limitTime(local)) {
            localCatMap.set(remote.category, remote);
          }
        }
        merged[incoming.monthKey] = Array.from(localCatMap.values());
      }
      return merged;
    });
    changedCount += diff.budgetLimits.length;
  }

  // Merge custom categories - LWW by id on updatedAt, upserts only (no
  // tombstones exist for this type). Guarded with `diff.customCategories &&`
  // because an older peer's diff won't carry the field at all.
  if (diff.customCategories && diff.customCategories.length > 0) {
    // Older exports relayed through a peer may lack updatedAt (the
    // validator allows it); treat those as epoch so any stamped record wins.
    const tsOf = timestampMs;

    const localCategories = await getCustomCategories();
    const byId = new Map<string, CustomCategory>(
      localCategories.map((c) => [c.id, c])
    );
    for (const entry of diff.customCategories) {
      const existing = byId.get(entry.record.id);
      if (!existing || tsOf(entry.record.updatedAt) >= tsOf(existing.updatedAt)) {
        byId.set(entry.record.id, entry.record);
      }
    }

    // De-dupe by lowercased name (keep newest updatedAt) and drop any that
    // shadow a built-in - mirrors importData's computeMergedCustomCategories.
    // Both devices can independently create "Pets" with different ids; the
    // name is what budget entries reference, so duplicate names would make
    // icon/bucket lookups ambiguous.
    const nameWinner = new Map<string, string>(); // lowercased name -> winning id
    for (const [id, rec] of byId) {
      if (isBuiltInCategory(rec.name)) {
        byId.delete(id);
        continue;
      }
      const key = rec.name.toLowerCase();
      const prevId = nameWinner.get(key);
      if (prevId === undefined) {
        nameWinner.set(key, id);
      } else if (tsOf(rec.updatedAt) >= tsOf(byId.get(prevId)!.updatedAt)) {
        byId.delete(prevId);
        nameWinner.set(key, id);
      } else {
        byId.delete(id);
      }
    }

    await saveCustomCategoriesFromSync(Array.from(byId.values()));
    changedCount += diff.customCategories.length;
  }

  // Merge category bucket overrides. The store has no per-key timestamps,
  // so there's no LWW to run: incoming keys overwrite, local-only keys
  // survive. Override *removals* therefore don't propagate - same
  // limitation as the import path, and far better than the prior state
  // where overrides didn't sync at all and 50/30/20 math diverged.
  if (
    diff.categoryBucketOverrides &&
    Object.keys(diff.categoryBucketOverrides).length > 0
  ) {
    const localOverrides = await getCategoryBucketOverrides();
    const merged: Record<string, BudgetBucket> = {
      ...localOverrides,
      ...diff.categoryBucketOverrides,
    };
    await saveCategoryBucketOverridesFromSync(merged);
    changedCount += Object.keys(diff.categoryBucketOverrides).length;
  }

  // Merge month-start balances - union by monthKey, strictly-newer
  // updatedAt wins (ties keep local, so the whole-map re-broadcast every
  // sync is a no-op once devices converge). Only actually-applied months
  // count toward changedCount, and a no-op diff skips the write.
  if (
    diff.monthStartBalances &&
    Object.keys(diff.monthStartBalances).length > 0
  ) {
    const localBalances = await getMonthStartBalances();
    const merged: Record<string, MonthStartBalance> = { ...localBalances };
    let applied = 0;
    for (const [monthKey, incoming] of Object.entries(diff.monthStartBalances)) {
      const existing = merged[monthKey];
      if (
        !existing ||
        new Date(incoming.updatedAt).getTime() >
          new Date(existing.updatedAt).getTime()
      ) {
        merged[monthKey] = incoming;
        applied++;
      }
    }
    if (applied > 0) {
      await saveMonthStartBalancesFromSync(merged);
    }
    changedCount += applied;
  }

  // Merge dismissed bank transactions into the ingest ledger - union by
  // identity key, strictly-newer `at` wins (ties keep local, so a
  // re-broadcast is a no-op). Only actually-applied keys count.
  let dismissalsApplied = 0;
  if (
    diff.dismissedTransactions &&
    Object.keys(diff.dismissedTransactions).length > 0
  ) {
    dismissalsApplied = await mergeLedgerFromSync(diff.dismissedTransactions);
    changedCount += dismissalsApplied;
  }

  // Merge net-worth snapshots - union by dayKey, strictly-newer capturedAt
  // wins (ties keep local: identical content, no churn). Mirrors
  // importData's computeMergedSnapshots so import and sync agree on
  // history merges. Only actually-applied days are counted and a no-op
  // diff skips the write, since backlog mode re-sends the full history.
  // saveNetWorthSnapshots normalizes, sorts, and prunes to the 730-day cap.
  if (diff.netWorthSnapshots && diff.netWorthSnapshots.length > 0) {
    const localSnapshots = await getNetWorthSnapshots();
    const byDay = new Map<string, NetWorthSnapshot>(
      localSnapshots.map((snap) => [snap.dayKey, snap])
    );
    let applied = 0;
    for (const incoming of diff.netWorthSnapshots) {
      const existing = byDay.get(incoming.dayKey);
      if (
        !existing ||
        new Date(incoming.capturedAt).getTime() >
          new Date(existing.capturedAt).getTime()
      ) {
        byDay.set(incoming.dayKey, incoming);
        applied++;
      }
    }
    if (applied > 0) {
      await saveNetWorthSnapshots(Array.from(byDay.values()));
    }
    changedCount += applied;
  }

  // Merge milestone plan (last-write-wins on updatedAt)
  if (diff.debtMilestonePlan) {
    const localPlan = await getDebtMilestonePlan();
    if (
      new Date(diff.debtMilestonePlan.updatedAt).getTime() >=
      new Date(localPlan.updatedAt).getTime()
    ) {
      await saveDebtMilestonePlanFromSync(diff.debtMilestonePlan);
      changedCount++;
    }
  }

  // Merge payoff strategy with last-write-wins on the envelope timestamp.
  // Peers without `payoffStrategyUpdatedAt` (older versions) are treated as
  // having sent at the epoch - so any locally-stamped envelope wins, and
  // the strategy stops flip-flopping every sync direction.
  if (diff.payoffStrategy) {
    const localEnv = await getPayoffStrategyEnvelope();
    const localTime = localEnv ? new Date(localEnv.updatedAt).getTime() : -Infinity;
    const incomingStamp =
      diff.payoffStrategyUpdatedAt ?? "1970-01-01T00:00:00.000Z";
    const incomingTime = new Date(incomingStamp).getTime();
    if (incomingTime >= localTime) {
      await savePayoffStrategyEnvelope({
        value: diff.payoffStrategy,
        updatedAt: incomingStamp,
      });
      changedCount++;
    }
  }

  // The partner's approved entries and dismissals may cover transactions
  // this device's bank connection already fetched into its Review Inbox;
  // retire those rows now rather than on the next bank-sync pass. Runs
  // after the entry merge above so it sees the merged externalTxIds.
  // Best-effort: a hiccup here must not reject an already-applied diff.
  if (dismissalsApplied > 0 || diff.budgetEntries.length > 0) {
    try {
      changedCount += await reconcileInboxWithDecisions();
    } catch {
      // The next bank-sync pass reconciles again.
    }
  }

  // Mounted tabs re-run their focus loaders so the merged records show up
  // now, not on the next tab switch (see dataChangeNotifier.ts).
  if (changedCount > 0) notifyDataChanged("partner-sync");

  return changedCount;
};

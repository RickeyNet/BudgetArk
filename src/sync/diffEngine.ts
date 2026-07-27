/**
 * BudgetArk - Diff Engine
 * File: src/sync/diffEngine.ts
 *
 * Computes outgoing diffs and applies incoming diffs for P2P sync.
 * Uses last-write-wins conflict resolution based on updatedAt timestamps.
 */

import {
  getDebtsIncludingDeleted,
  saveDebts,
  getPaymentsIncludingDeleted,

  getPayoffStrategyEnvelope,
  savePayoffStrategyEnvelope} from "../storage/debtStorage";
import {
  getBudgetEntriesIncludingDeleted,
  saveBudgetEntries,
  getAllLimitsByMonth,
} from "../storage/budgetStorage";
import {
  getSavingsGoalsIncludingDeleted,
  saveSavingsGoals,
} from "../storage/savingsGoalStorage";
import {
  getAssetAccountsIncludingDeleted,
  saveAssetAccounts,
} from "../storage/assetAccountStorage";
import {
  getHoldingsIncludingDeleted,
  saveHoldings,
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
  saveBusinessesFromSync,
} from "../storage/businessStorage";
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
  isMonthStartBalanceRecord,
  isNetWorthSnapshotItem,
  isValidImportCategory,
  isMonthKey,
  sanitizeDebtMilestones,
  VALID_PAYOFF_STRATEGIES,
} from "../utils/recordValidators";

const BUDGET_LIMITS_KEY = "@budgetark_budget_limits_by_month";

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

const isBackfillSyncDone = async (): Promise<boolean> =>
  (await EncryptedStorage.getItem(SYNC_BACKFILL_KEY)) === "true";

export const markBackfillSyncDone = async (): Promise<void> => {
  await EncryptedStorage.setItem(SYNC_BACKFILL_KEY, "true");
};

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
    bucketOverrides,
    netWorthSnapshots,
    monthStartBalances,
    backfillDone,
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
    getCategoryBucketOverrides(),
    getNetWorthSnapshots(),
    getMonthStartBalances(),
    isBackfillSyncDone(),
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
  const filterChanged = <T extends { updatedAt: string; deletedAt?: string }>(
    items: T[]
  ): DiffEntry<T>[] => {
    return items
      .filter((item) => new Date(item.updatedAt).getTime() > since)
      .map((item) => ({
        action: item.deletedAt ? ("delete" as const) : ("upsert" as const),
        record: item,
      }));
  };

  // Load full budget limits history. On first sync we send everything;
  // otherwise filter per-category by updatedAt so unchanged limits don't
  // get re-broadcast every sync. Storage normalizes missing updatedAt to
  // the epoch - those still ride along on first sync, then get superseded
  // by any fresh remote edit.
  const budgetLimits: BudgetLimitDiff[] = [];
  const history = await getAllLimitsByMonth();
  const isFirstSync = !lastSyncTimestamp;
  for (const [monthKey, limits] of Object.entries(history)) {
    const changed = isFirstSync
      ? limits
      : limits.filter((limit) => new Date(limit.updatedAt).getTime() > since);
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
    const incomingTime = new Date(entry.record.updatedAt).getTime();
    const localTime = localItem
      ? new Date(localItem.updatedAt).getTime()
      : -Infinity;

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

  // Merge debts. Read+write via the tombstone-aware getters/setters so
  // local tombstones survive the merge and stop a stale partner from
  // resurrecting the deleted record.
  if (diff.debts.length > 0) {
    const localDebts = await getDebtsIncludingDeleted();
    const merged = mergeById(localDebts, diff.debts);
    await saveDebts(merged);
    changedCount += diff.debts.length;
  }

  // Merge payments. After the id-based merge, collapse duplicate
  // minimum-due rows: a partner on an app version predating deterministic
  // prompt-payment ids still logs its "minimum due" confirmation under a
  // random id, so the same real-world payment can arrive as a second
  // record. The dedupe tombstones the duplicate (balance untouched - it
  // was only ever decremented once, see debtPaymentDedupe), and the
  // tombstone flows back to the partner on the next sync. Runs against the
  // just-merged debts (the debts block above saves before this reads).
  if (diff.payments.length > 0) {
    const [localPayments, localDebts] = await Promise.all([
      getPaymentsIncludingDeleted(),
      getDebtsIncludingDeleted(),
    ]);
    const merged = mergeById(localPayments, diff.payments);
    const { payments: deduped } = dedupeMinimumDuePayments(
      localDebts,
      merged,
      new Date().toISOString()
    );
    await EncryptedStorage.setItem(
      "@budgetark_payments",
      JSON.stringify(deduped)
    );
    changedCount += diff.payments.length;
  }

  // Merge budget entries
  if (diff.budgetEntries.length > 0) {
    const localEntries = await getBudgetEntriesIncludingDeleted();
    const merged = mergeById(localEntries, diff.budgetEntries);
    await saveBudgetEntries(merged);
    changedCount += diff.budgetEntries.length;
  }

  // Merge savings goals
  if (diff.savingsGoals.length > 0) {
    const localGoals = await getSavingsGoalsIncludingDeleted();
    const merged = mergeById(localGoals, diff.savingsGoals);
    await saveSavingsGoals(merged);
    changedCount += diff.savingsGoals.length;
  }

  // Merge asset accounts
  if (diff.assetAccounts && diff.assetAccounts.length > 0) {
    const localAccounts = await getAssetAccountsIncludingDeleted();
    const merged = mergeById(localAccounts, diff.assetAccounts);
    await saveAssetAccounts(merged);
    changedCount += diff.assetAccounts.length;
  }

  // Merge holdings - same tombstone-aware LWW as asset accounts. Guarded
  // with `diff.holdings &&` because an older peer's diff omits the field.
  if (diff.holdings && diff.holdings.length > 0) {
    const localHoldings = await getHoldingsIncludingDeleted();
    const merged = mergeById(localHoldings, diff.holdings);
    await saveHoldings(merged);
    changedCount += diff.holdings.length;
  }

  // Merge businesses - same tombstone-aware LWW as holdings. Guarded with
  // `diff.businesses &&` because an older peer's diff omits the field.
  // Written via the raw sync setter: the merge already carries every local
  // tombstone, and re-running name validation here would reject the very
  // merge we just computed (dup names are cosmetic - entries reference by
  // id).
  if (diff.businesses && diff.businesses.length > 0) {
    const localBusinesses = await getBusinessesIncludingDeleted();
    const merged = mergeById(localBusinesses, diff.businesses);
    await saveBusinessesFromSync(merged);
    changedCount += diff.businesses.length;
  }

  // Merge budget limits (union of months, per-category last-write-wins).
  // Use getAllLimitsByMonth so legacy local rows are normalized to the epoch
  // and lose to any incoming row carrying a real timestamp.
  if (diff.budgetLimits.length > 0) {
    const localHistory = (await getAllLimitsByMonth()) as Record<
      string,
      CategoryBudgetLimit[]
    >;
    const merged: Record<string, CategoryBudgetLimit[]> = { ...localHistory };

    const limitTime = (limit: CategoryBudgetLimit | undefined): number =>
      limit ? new Date(limit.updatedAt).getTime() : -Infinity;

    for (const incoming of diff.budgetLimits) {
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

    await EncryptedStorage.setItem(BUDGET_LIMITS_KEY, JSON.stringify(merged));
    changedCount += diff.budgetLimits.length;
  }

  // Merge custom categories - LWW by id on updatedAt, upserts only (no
  // tombstones exist for this type). Guarded with `diff.customCategories &&`
  // because an older peer's diff won't carry the field at all.
  if (diff.customCategories && diff.customCategories.length > 0) {
    // Older exports relayed through a peer may lack updatedAt (the
    // validator allows it); treat those as epoch so any stamped record wins.
    const tsOf = (v: string | undefined): number => {
      if (typeof v !== "string") return 0;
      const t = Date.parse(v);
      return Number.isFinite(t) ? t : 0;
    };

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

  return changedCount;
};

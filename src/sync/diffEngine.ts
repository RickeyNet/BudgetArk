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
} from "../storage/debtStorage";
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
  getDebtMilestonePlan,
  saveDebtMilestonePlanFromSync,
} from "../storage/debtMilestoneStorage";
import {
  getPayoffStrategyEnvelope,
  savePayoffStrategyEnvelope,
} from "../storage/debtStorage";
import * as EncryptedStorage from "../storage/encryptedStorage";
import type {
  Debt,
  Payment,
  BudgetEntry,
  SavingsGoal,
  AssetAccount,
  DebtMilestonePlan,
  CategoryBudgetLimit,
} from "../types";
import type { PayoffStrategyPreference } from "../storage/debtStorage";
import type { SyncDiff, DiffEntry, BudgetLimitDiff } from "./types";
import {
  isObject,
  isDebtItem,
  isPaymentItem,
  isBudgetEntryItem,
  isBudgetLimitItem,
  isSavingsGoalItem,
  isAssetAccountItem,
  isMonthKey,
  sanitizeDebtMilestones,
  VALID_PAYOFF_STRATEGIES,
} from "../utils/recordValidators";

const BUDGET_LIMITS_KEY = "@budgetark_budget_limits_by_month";

/* ─── Outgoing Diff ─── */

/**
 * Computes a diff of all local data that's been modified since lastSyncTimestamp.
 * On first sync (lastSyncTimestamp is null), sends everything.
 */
export const computeOutgoingDiff = async (
  lastSyncTimestamp: string | null
): Promise<SyncDiff> => {
  const [debts, payments, budgetEntries, savingsGoals, assetAccounts, milestonePlan, strategyEnvelope] =
    await Promise.all([
      getDebtsIncludingDeleted(),
      getPaymentsIncludingDeleted(),
      getBudgetEntriesIncludingDeleted(),
      getSavingsGoalsIncludingDeleted(),
      getAssetAccountsIncludingDeleted(),
      getDebtMilestonePlan(),
      getPayoffStrategyEnvelope(),
    ]);

  const since = lastSyncTimestamp ? new Date(lastSyncTimestamp).getTime() : 0;

  // Records flow through here as either upserts (live records updated since
  // the last sync) or deletes (tombstoned records the partner needs to
  // remove locally). Without the delete branch the partner would silently
  // resurrect any record we deleted — its next sync would upsert it back to
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
    budgetEntries: filterChanged(budgetEntries),
    savingsGoals: filterChanged(savingsGoals),
    assetAccounts: filterChanged(assetAccounts),
    budgetLimits,
    debtMilestonePlan:
      !lastSyncTimestamp ||
      new Date(milestonePlan.updatedAt).getTime() > since
        ? milestonePlan
        : undefined,
    payoffStrategy: strategyEnvelope?.value,
    payoffStrategyUpdatedAt: strategyEnvelope?.updatedAt,
    syncTimestamp: new Date().toISOString(),
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
 *    — it can compare against our tombstone's updatedAt and lose LWW.
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
    // else: local is newer — keep it. If local is a tombstone and incoming
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
  validator: (item: unknown) => boolean
): void => {
  if (!entries) return;
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

  validateDiffEntries(diff.debts, "debt", isDebtItem);
  validateDiffEntries(diff.payments, "payment", isPaymentItem);
  validateDiffEntries(diff.budgetEntries, "budget entry", isBudgetEntryItem);
  validateDiffEntries(diff.savingsGoals, "savings goal", isSavingsGoalItem);
  validateDiffEntries(diff.assetAccounts, "asset account", isAssetAccountItem);

  if (Array.isArray(diff.budgetLimits)) {
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

  // Merge payments
  if (diff.payments.length > 0) {
    const localPayments = await getPaymentsIncludingDeleted();
    const merged = mergeById(localPayments, diff.payments);
    await EncryptedStorage.setItem(
      "@budgetark_payments",
      JSON.stringify(merged)
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
  // having sent at the epoch — so any locally-stamped envelope wins, and
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

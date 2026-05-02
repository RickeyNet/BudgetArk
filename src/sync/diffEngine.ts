/**
 * BudgetArk — Diff Engine
 * File: src/sync/diffEngine.ts
 *
 * Computes outgoing diffs and applies incoming diffs for P2P sync.
 * Uses last-write-wins conflict resolution based on updatedAt timestamps.
 */

import { getDebts, saveDebts, getPayments } from "../storage/debtStorage";
import {
  getBudgetEntries,
  saveBudgetEntries,
  getAllLimitsByMonth,
} from "../storage/budgetStorage";
import { getSavingsGoals, saveSavingsGoals } from "../storage/savingsGoalStorage";
import { getAssetAccounts, saveAssetAccounts } from "../storage/assetAccountStorage";
import {
  getDebtMilestonePlan,
  saveDebtMilestonePlan,
} from "../storage/debtMilestoneStorage";
import {
  getPayoffStrategyPreference,
  savePayoffStrategyPreference,
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

const BUDGET_LIMITS_KEY = "@budgetark_budget_limits_by_month";

/* ─── Outgoing Diff ─── */

/**
 * Computes a diff of all local data that's been modified since lastSyncTimestamp.
 * On first sync (lastSyncTimestamp is null), sends everything.
 */
export const computeOutgoingDiff = async (
  lastSyncTimestamp: string | null
): Promise<SyncDiff> => {
  const [debts, payments, budgetEntries, savingsGoals, assetAccounts, milestonePlan, strategy] =
    await Promise.all([
      getDebts(),
      getPayments(),
      getBudgetEntries(),
      getSavingsGoals(),
      getAssetAccounts(),
      getDebtMilestonePlan(),
      getPayoffStrategyPreference(),
    ]);

  const since = lastSyncTimestamp ? new Date(lastSyncTimestamp).getTime() : 0;

  const filterChanged = <T extends { updatedAt: string }>(
    items: T[]
  ): DiffEntry<T>[] => {
    return items
      .filter((item) => new Date(item.updatedAt).getTime() > since)
      .map((item) => ({ action: "upsert" as const, record: item }));
  };

  // Load full budget limits history. On first sync we send everything;
  // otherwise filter per-category by updatedAt so unchanged limits don't
  // get re-broadcast every sync. Storage normalizes missing updatedAt to
  // the epoch — those still ride along on first sync, then get superseded
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
    payoffStrategy: strategy ?? undefined,
    syncTimestamp: new Date().toISOString(),
  };
};

/* ─── Incoming Diff Application ─── */

/**
 * Merges a collection by ID using last-write-wins on updatedAt.
 */
const mergeById = <T extends { id: string; updatedAt: string }>(
  local: T[],
  incoming: DiffEntry<T>[]
): T[] => {
  const localMap = new Map(local.map((item) => [item.id, item]));

  for (const entry of incoming) {
    if (entry.action === "delete") {
      const localItem = localMap.get(entry.record.id);
      if (
        !localItem ||
        new Date(entry.record.updatedAt).getTime() >=
          new Date(localItem.updatedAt).getTime()
      ) {
        localMap.delete(entry.record.id);
      }
    } else {
      const localItem = localMap.get(entry.record.id);
      if (
        !localItem ||
        new Date(entry.record.updatedAt).getTime() >=
          new Date(localItem.updatedAt).getTime()
      ) {
        localMap.set(entry.record.id, entry.record);
      }
    }
  }

  return Array.from(localMap.values());
};

/**
 * Applies an incoming SyncDiff to local storage.
 * Returns the number of records that were changed.
 */
export const applyIncomingDiff = async (diff: SyncDiff): Promise<number> => {
  let changedCount = 0;

  // Merge debts
  if (diff.debts.length > 0) {
    const localDebts = await getDebts();
    const merged = mergeById(localDebts, diff.debts);
    await saveDebts(merged);
    changedCount += diff.debts.length;
  }

  // Merge payments
  if (diff.payments.length > 0) {
    const localPayments = await getPayments();
    const merged = mergeById(localPayments, diff.payments);
    await EncryptedStorage.setItem(
      "@budgetark_payments",
      JSON.stringify(merged)
    );
    changedCount += diff.payments.length;
  }

  // Merge budget entries
  if (diff.budgetEntries.length > 0) {
    const localEntries = await getBudgetEntries();
    const merged = mergeById(localEntries, diff.budgetEntries);
    await saveBudgetEntries(merged);
    changedCount += diff.budgetEntries.length;
  }

  // Merge savings goals
  if (diff.savingsGoals.length > 0) {
    const localGoals = await getSavingsGoals();
    const merged = mergeById(localGoals, diff.savingsGoals);
    await saveSavingsGoals(merged);
    changedCount += diff.savingsGoals.length;
  }

  // Merge asset accounts
  if (diff.assetAccounts && diff.assetAccounts.length > 0) {
    const localAccounts = await getAssetAccounts();
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
      await saveDebtMilestonePlan(diff.debtMilestonePlan);
      changedCount++;
    }
  }

  // Merge payoff strategy (accept remote since we can't timestamp a bare string)
  if (diff.payoffStrategy) {
    await savePayoffStrategyPreference(diff.payoffStrategy);
    changedCount++;
  }

  return changedCount;
};

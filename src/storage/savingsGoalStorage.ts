import * as EncryptedStorage from "./encryptedStorage";
import type { SavingsGoal } from "../types";
import {
  filterLive,
  mergePreservingTombstones,
  purgeExpiredTombstones,
  tombstone,
  untombstone,
} from "./tombstones";
import { repairCollectionInPlace } from "./collectionRepair";

const STORAGE_KEY = "@budgetark_savings_goals";

export const getSavingsGoals = async (): Promise<SavingsGoal[]> => {
  const all = await getSavingsGoalsIncludingDeleted();
  return filterLive(all);
};

/**
 * Sync-only: returns soft-deleted goals too so the diff engine can
 * propagate deletes to a paired partner. See `tombstones.ts` for why.
 */
export const getSavingsGoalsIncludingDeleted = async (): Promise<SavingsGoal[]> => {
  const raw = await EncryptedStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SavingsGoal[];
    const purged = purgeExpiredTombstones(parsed);
    // Ref equality: `purgeExpiredTombstones` returns the original array
    // when nothing was dropped, so the steady-state read costs O(1) here
    // instead of the previous O(n × record-size) JSON.stringify diff.
    if (purged !== parsed) {
      // Atomic recompute instead of writing our own (possibly stale)
      // snapshot: a mutation or sync write landing between the read above
      // and this write must not be reverted by the purge.
      await repairCollectionInPlace<SavingsGoal>(STORAGE_KEY, (g) => g);
    }
    return purged;
  } catch {
    return [];
  }
};

/**
 * Raw write - persists exactly the array given. Only for callers that
 * already hold the tombstone-aware array (internal CRUD helpers and the
 * purge path, which must be able to drop expired tombstones).
 */
const writeSavingsGoals = async (goals: SavingsGoal[]): Promise<void> => {
  await EncryptedStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
};

/**
 * Persists the goals array. Safe to call with a live-only
 * (`getSavingsGoals`) array: stored tombstones missing from `goals` are
 * merged back in so a screen-level save can't erase the soft-deletes that
 * Undo and sync need.
 */
export const saveSavingsGoals = async (goals: SavingsGoal[]): Promise<void> => {
  const raw = await EncryptedStorage.getItem(STORAGE_KEY);
  let stored: SavingsGoal[] = [];
  if (raw) {
    try {
      stored = JSON.parse(raw) as SavingsGoal[];
    } catch {
      stored = [];
    }
  }
  await writeSavingsGoals(mergePreservingTombstones(goals, stored));
};

export const addSavingsGoal = async (goal: SavingsGoal): Promise<SavingsGoal[]> => {
  const goals = await getSavingsGoalsIncludingDeleted();
  const updated = [...goals, goal];
  await writeSavingsGoals(updated);
  return filterLive(updated);
};

export const updateSavingsGoal = async (
  goalId: string,
  updates: Partial<SavingsGoal>
): Promise<SavingsGoal[]> => {
  const goals = await getSavingsGoalsIncludingDeleted();
  const updated = goals.map((goal) =>
    goal.id === goalId
      ? {
          ...goal,
          ...updates,
          updatedAt: new Date().toISOString(),
        }
      : goal
  );
  await writeSavingsGoals(updated);
  return filterLive(updated);
};

/**
 * Soft-deletes a savings goal. See debtStorage.deleteDebt for rationale.
 */
export const deleteSavingsGoal = async (goalId: string): Promise<SavingsGoal[]> => {
  const goals = await getSavingsGoalsIncludingDeleted();
  const now = new Date().toISOString();
  const next = goals.map((goal) =>
    goal.id === goalId ? tombstone(goal, now) : goal
  );
  await writeSavingsGoals(next);
  return filterLive(next);
};

/**
 * Undo a soft-deleted savings goal. No-op if id isn't a tombstone.
 */
export const restoreSavingsGoal = async (
  goalId: string
): Promise<SavingsGoal[]> => {
  const goals = await getSavingsGoalsIncludingDeleted();
  const now = new Date().toISOString();
  const next = goals.map((goal) =>
    goal.id === goalId && goal.deletedAt ? untombstone(goal, now) : goal
  );
  await writeSavingsGoals(next);
  return filterLive(next);
};

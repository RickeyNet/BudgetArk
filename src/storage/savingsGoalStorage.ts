import * as EncryptedStorage from "./encryptedStorage";
import type { SavingsGoal } from "../types";
import {
  filterLive,
  purgeExpiredTombstones,
  tombstone,
} from "./tombstones";

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
    if (JSON.stringify(parsed) !== JSON.stringify(purged)) {
      await saveSavingsGoals(purged);
    }
    return purged;
  } catch {
    return [];
  }
};

/**
 * Persists the full goals array (live + tombstones). Always pass the
 * tombstone-aware array; passing a `filterLive` result here will drop the
 * tombstones the next sync needs.
 */
export const saveSavingsGoals = async (goals: SavingsGoal[]): Promise<void> => {
  await EncryptedStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
};

export const addSavingsGoal = async (goal: SavingsGoal): Promise<SavingsGoal[]> => {
  const goals = await getSavingsGoalsIncludingDeleted();
  const updated = [...goals, goal];
  await saveSavingsGoals(updated);
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
  await saveSavingsGoals(updated);
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
  await saveSavingsGoals(next);
  return filterLive(next);
};

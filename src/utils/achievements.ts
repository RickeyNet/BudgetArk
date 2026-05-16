/**
 * BudgetArk - Achievements Evaluator
 * File: src/utils/achievements.ts
 *
 * Loads the user's current data context, runs every definition's `check`,
 * and persists newly-unlocked entries with a fresh timestamp. Returns the
 * full unlocked map plus the list of IDs unlocked this call so the caller
 * can show a celebration.
 *
 * Cheap to call: all reads happen in parallel, checks are pure in-memory
 * loops over already-loaded arrays. Safe to invoke on screen mount, after
 * a relevant write, or on app foreground.
 */

import {
  ACHIEVEMENT_DEFS,
  type AchievementContext,
} from "../data/achievementDefs";
import {
  getUnlockedAchievements,
  saveUnlockedAchievements,
} from "../storage/achievementsStorage";
import { getDebts, getPayments } from "../storage/debtStorage";
import { getSavingsGoals } from "../storage/savingsGoalStorage";
import { getBudgetEntries, getAllLimitsByMonth } from "../storage/budgetStorage";
import { getDebtMilestonePlan } from "../storage/debtMilestoneStorage";
import { getNetWorthSnapshots } from "../storage/netWorthSnapshotStorage";
import { getPairingState } from "../sync/pairingStorage";
import {
  getAchievementStats,
  recordAppOpenForStreak,
} from "../storage/achievementStatsStorage";

export interface EvaluationResult {
  /** Full id → unlocked-timestamp map after this run. */
  unlocked: Record<string, number>;
  /** IDs that crossed locked → unlocked during this call. */
  newlyUnlocked: string[];
  /**
   * True only on the very first evaluation after install. The caller
   * should NOT celebrate retroactive unlocks in that case — show them
   * silently in the Ship's Log instead.
   */
  isFirstEvaluation: boolean;
}

const loadContext = async (): Promise<AchievementContext> => {
  const [
    debts,
    payments,
    savingsGoals,
    budgetEntries,
    milestonePlan,
    netWorthSnapshots,
    pairing,
    stats,
    limitsByMonth,
  ] = await Promise.all([
    getDebts(),
    getPayments(),
    getSavingsGoals(),
    getBudgetEntries(),
    getDebtMilestonePlan(),
    getNetWorthSnapshots(),
    getPairingState(),
    getAchievementStats(),
    getAllLimitsByMonth(),
  ]);

  return {
    debts,
    payments,
    savingsGoals,
    budgetEntries,
    milestonePlan,
    netWorthSnapshots,
    isPaired: pairing !== null,
    stats,
    limitsByMonth,
  };
};

export const evaluateAchievements = async (): Promise<EvaluationResult> => {
  // Idempotent per calendar day, so it's safe to run on every pass; this
  // keeps the app-open streak current before the Lighthouse Keeper check.
  await recordAppOpenForStreak();

  const [ctx, state] = await Promise.all([
    loadContext(),
    getUnlockedAchievements(),
  ]);

  const next: Record<string, number> = { ...state.unlocked };
  const newlyUnlocked: string[] = [];
  const now = Date.now();
  const isFirstEvaluation = state.firstEvaluatedAt === undefined;

  for (const def of ACHIEVEMENT_DEFS) {
    if (next[def.id] !== undefined) continue;
    try {
      if (def.check(ctx)) {
        next[def.id] = now;
        newlyUnlocked.push(def.id);
      }
    } catch (error) {
      if (__DEV__) console.warn(`Achievement check failed: ${def.id}`, error);
    }
  }

  if (newlyUnlocked.length > 0 || isFirstEvaluation) {
    await saveUnlockedAchievements({
      unlocked: next,
      firstEvaluatedAt: state.firstEvaluatedAt ?? now,
      version: state.version,
    });
  }

  return { unlocked: next, newlyUnlocked, isFirstEvaluation };
};

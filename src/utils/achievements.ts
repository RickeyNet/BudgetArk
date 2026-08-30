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
  type AchievementProgress,
} from "../data/achievementDefs";
import {
  getUnlockedAchievements,
  saveUnlockedAchievements,
} from "../storage/achievementsStorage";
import { getDebts, getPayments } from "../storage/debtStorage";
import { getSavingsGoals } from "../storage/savingsGoalStorage";
import { getAssetAccounts } from "../storage/assetAccountStorage";
import { getBudgetEntries, getAllLimitsByMonth } from "../storage/budgetStorage";
import { getDebtMilestonePlan } from "../storage/debtMilestoneStorage";
import { getNetWorthSnapshots } from "../storage/netWorthSnapshotStorage";
import { getPairingState } from "../sync/pairingStorage";
import {
  getAchievementStats,
  recordAppOpenForStreak,
} from "../storage/achievementStatsStorage";
import { getLearningProgress } from "../storage/learningProgressStorage";

export interface EvaluationResult {
  /** Full id → unlocked-timestamp map after this run. */
  unlocked: Record<string, number>;
  /** IDs that crossed locked → unlocked during this call. */
  newlyUnlocked: string[];
  /**
   * IDs of `revocable: true` badges that were unlocked at the start of
   * this call but no longer satisfy `check(ctx)`. These have been removed
   * from `unlocked`. Callers can surface a subtle "badge dimmed" toast
   * but should NOT show the celebration modal.
   */
  newlyRevoked: string[];
  /**
   * True only on the very first evaluation after install. The caller
   * should NOT celebrate retroactive unlocks in that case - show them
   * silently in the Ship's Log instead.
   */
  isFirstEvaluation: boolean;
  /**
   * id → progress snapshot for every def whose `progress(ctx)` returned
   * a non-null value. Useful for UIs that want to render partial-fill
   * rings or "X / Y" captions without reloading storage.
   */
  progress: Record<string, AchievementProgress>;
}

const loadContext = async (): Promise<AchievementContext> => {
  const [
    debts,
    payments,
    savingsGoals,
    budgetEntries,
    assetAccounts,
    milestonePlan,
    netWorthSnapshots,
    pairing,
    stats,
    limitsByMonth,
    learningProgress,
  ] = await Promise.all([
    getDebts(),
    getPayments(),
    getSavingsGoals(),
    getBudgetEntries(),
    getAssetAccounts(),
    getDebtMilestonePlan(),
    getNetWorthSnapshots(),
    getPairingState(),
    getAchievementStats(),
    getAllLimitsByMonth(),
    getLearningProgress(),
  ]);

  return {
    debts,
    payments,
    savingsGoals,
    budgetEntries,
    assetAccounts,
    milestonePlan,
    netWorthSnapshots,
    isPaired: pairing !== null,
    stats,
    limitsByMonth,
    learningProgress,
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
  const newlyRevoked: string[] = [];
  const progress: Record<string, AchievementProgress> = {};
  const now = Date.now();
  const isFirstEvaluation = state.firstEvaluatedAt === undefined;

  for (const def of ACHIEVEMENT_DEFS) {
    let passes: boolean | null = null;
    try {
      passes = def.check(ctx);
    } catch (error) {
      if (__DEV__) console.warn(`Achievement check failed: ${def.id}`, error);
    }

    if (passes === true && next[def.id] === undefined) {
      next[def.id] = now;
      newlyUnlocked.push(def.id);
    } else if (
      passes === false &&
      def.revocable &&
      next[def.id] !== undefined
    ) {
      delete next[def.id];
      newlyRevoked.push(def.id);
    }

    if (def.progress) {
      try {
        const p = def.progress(ctx);
        if (p && p.target > 0) progress[def.id] = p;
      } catch (error) {
        if (__DEV__)
          console.warn(`Achievement progress failed: ${def.id}`, error);
      }
    }
  }

  if (
    newlyUnlocked.length > 0 ||
    newlyRevoked.length > 0 ||
    isFirstEvaluation
  ) {
    await saveUnlockedAchievements({
      unlocked: next,
      firstEvaluatedAt: state.firstEvaluatedAt ?? now,
      version: state.version,
    });
  }

  return {
    unlocked: next,
    newlyUnlocked,
    newlyRevoked,
    isFirstEvaluation,
    progress,
  };
};

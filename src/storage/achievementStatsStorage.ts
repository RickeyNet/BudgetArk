/**
 * BudgetArk - Achievement Stats Storage
 * File: src/storage/achievementStatsStorage.ts
 *
 * Backing counters for the few badges that can't be derived purely from
 * financial data: how many times the user exported, opened the Monthly
 * Review, and their consecutive app-open streak. Every mutation is
 * idempotent-safe to call often — the streak recorder in particular only
 * changes state once per calendar day, so it's cheap to invoke on every
 * achievement evaluation.
 */

import * as EncryptedStorage from "./encryptedStorage";
import {
  ACHIEVEMENT_STATS_VERSION,
  type AchievementStats,
} from "../types";

const STORAGE_KEY = "@budgetark_achievement_stats";

const empty = (): AchievementStats => ({
  exportCount: 0,
  monthlyReviewOpens: 0,
  appOpenStreak: 0,
  longestAppOpenStreak: 0,
  lastAppOpenDay: null,
  version: ACHIEVEMENT_STATS_VERSION,
});

/** Local-time YYYY-MM-DD, matching how the rest of the app keys days. */
const dayKeyOf = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

export const getAchievementStats = async (): Promise<AchievementStats> => {
  const raw = await EncryptedStorage.getItem(STORAGE_KEY);
  if (!raw) return empty();
  try {
    const parsed = JSON.parse(raw) as Partial<AchievementStats>;
    return {
      exportCount: parsed.exportCount ?? 0,
      monthlyReviewOpens: parsed.monthlyReviewOpens ?? 0,
      appOpenStreak: parsed.appOpenStreak ?? 0,
      longestAppOpenStreak: parsed.longestAppOpenStreak ?? 0,
      lastAppOpenDay: parsed.lastAppOpenDay ?? null,
      version: ACHIEVEMENT_STATS_VERSION,
    };
  } catch {
    return empty();
  }
};

const save = async (stats: AchievementStats): Promise<void> => {
  await EncryptedStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
};

export const recordExport = async (): Promise<void> => {
  const stats = await getAchievementStats();
  await save({ ...stats, exportCount: stats.exportCount + 1 });
};

export const recordMonthlyReviewOpen = async (): Promise<void> => {
  const stats = await getAchievementStats();
  await save({
    ...stats,
    monthlyReviewOpens: stats.monthlyReviewOpens + 1,
  });
};

/**
 * Advances the app-open streak. No-op when already counted today, so it's
 * safe to call on every foreground / evaluation pass. A gap of exactly one
 * calendar day extends the streak; any larger gap resets it to 1.
 */
export const recordAppOpenForStreak = async (): Promise<void> => {
  const stats = await getAchievementStats();
  const today = dayKeyOf(new Date());
  if (stats.lastAppOpenDay === today) return;

  const yesterday = dayKeyOf(
    new Date(Date.now() - 24 * 60 * 60 * 1000)
  );
  const nextStreak = stats.lastAppOpenDay === yesterday
    ? stats.appOpenStreak + 1
    : 1;

  await save({
    ...stats,
    appOpenStreak: nextStreak,
    longestAppOpenStreak: Math.max(stats.longestAppOpenStreak, nextStreak),
    lastAppOpenDay: today,
  });
};

export const clearAchievementStats = async (): Promise<void> => {
  await save(empty());
};

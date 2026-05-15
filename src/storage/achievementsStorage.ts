/**
 * BudgetArk - Achievements Storage
 * File: src/storage/achievementsStorage.ts
 *
 * Persists the map of unlocked achievements (`id → unlock-timestamp`).
 * Achievement definitions live in src/data/achievementDefs.ts;
 * this file only stores which have been unlocked and when.
 */

import * as EncryptedStorage from "./encryptedStorage";
import {
  ACHIEVEMENTS_STORAGE_VERSION,
  type UnlockedAchievements,
} from "../types";

const STORAGE_KEY = "@budgetark_achievements";

const empty = (): UnlockedAchievements => ({
  unlocked: {},
  version: ACHIEVEMENTS_STORAGE_VERSION,
});

export const getUnlockedAchievements = async (): Promise<UnlockedAchievements> => {
  const raw = await EncryptedStorage.getItem(STORAGE_KEY);
  if (!raw) return empty();
  try {
    const parsed = JSON.parse(raw) as Partial<UnlockedAchievements>;
    return {
      unlocked: parsed.unlocked ?? {},
      firstEvaluatedAt: parsed.firstEvaluatedAt,
      version: ACHIEVEMENTS_STORAGE_VERSION,
    };
  } catch {
    return empty();
  }
};

export const saveUnlockedAchievements = async (
  state: UnlockedAchievements
): Promise<void> => {
  await EncryptedStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const clearUnlockedAchievements = async (): Promise<void> => {
  await saveUnlockedAchievements(empty());
};

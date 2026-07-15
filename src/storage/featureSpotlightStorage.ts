/**
 * BudgetArk - Feature Spotlight Storage
 * File: src/storage/featureSpotlightStorage.ts
 *
 * Two independent per-feature id sets:
 *
 *  - SEEN spotlights: the debut carousel was shown (or skipped) for this
 *    feature. Cleared never - each feature debuts once per install.
 *  - ACKED badges: the user tapped the feature's Profile row, so its NEW
 *    badge goes away. Tracked separately from seen: dismissing the carousel
 *    should NOT clear the badges, they're the second touch that catches the
 *    user at the point of use.
 *
 * Both are seeded with every known id when onboarding completes - a fresh
 * install must never get a "NEW!" tour for features that were always there.
 */

import * as EncryptedStorage from "./encryptedStorage";
import { ALL_SPOTLIGHT_IDS } from "../data/featureSpotlights";

const SEEN_SPOTLIGHTS_KEY = "@budgetark_seen_feature_spotlights" as const;
const ACKED_BADGES_KEY = "@budgetark_acked_feature_badges" as const;

const readIds = async (key: string): Promise<string[]> => {
  try {
    const raw = await EncryptedStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
};

const writeIds = async (key: string, ids: readonly string[]): Promise<void> => {
  await EncryptedStorage.setItem(key, JSON.stringify([...new Set(ids)]));
};

export const getSeenSpotlightIds = (): Promise<string[]> =>
  readIds(SEEN_SPOTLIGHTS_KEY);

export const markSpotlightsSeen = async (
  ids: readonly string[]
): Promise<void> => {
  if (ids.length === 0) return;
  const existing = await readIds(SEEN_SPOTLIGHTS_KEY);
  await writeIds(SEEN_SPOTLIGHTS_KEY, [...existing, ...ids]);
};

export const getAckedFeatureBadgeIds = (): Promise<string[]> =>
  readIds(ACKED_BADGES_KEY);

export const ackFeatureBadge = async (id: string): Promise<void> => {
  const existing = await readIds(ACKED_BADGES_KEY);
  if (existing.includes(id)) return;
  await writeIds(ACKED_BADGES_KEY, [...existing, id]);
};

/**
 * Mark every currently-known feature as seen AND acked. Called when
 * onboarding completes so debut UI only ever appears for features added
 * AFTER the user installed.
 */
export const seedAllFeatureDebutsSeen = async (): Promise<void> => {
  await writeIds(SEEN_SPOTLIGHTS_KEY, ALL_SPOTLIGHT_IDS);
  await writeIds(ACKED_BADGES_KEY, ALL_SPOTLIGHT_IDS);
};

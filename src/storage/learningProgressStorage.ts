/**
 * BudgetArk - Learning Progress Storage
 * File: src/storage/learningProgressStorage.ts
 *
 * Per-device progress for the Charts learning hub: which lessons the user
 * has completed, where they left off, and a few affiliate-related flags that
 * stay dormant in v1 (no affiliate links shipped yet) but exist so the field
 * shape is forward-compatible.
 *
 * Deliberately NOT synced to a paired partner: each device's learning state
 * is independent. It IS included in backups (utils/exportData) so a device
 * migration keeps the user's completed lessons; import merges by keeping the
 * earliest completion per lesson. The lesson catalog itself lives in src/data/.
 */

import * as EncryptedStorage from "./encryptedStorage";
import {
  LEARNING_STORAGE_VERSION,
  type LearningProgress,
} from "../types";

export const LEARNING_PROGRESS_STORAGE_KEY = "@budgetark_learning_progress";

const empty = (): LearningProgress => ({
  completedLessons: {},
  affiliateTapCount: 0,
  showAffiliateLinks: false,
  version: LEARNING_STORAGE_VERSION,
});

export const getLearningProgress = async (): Promise<LearningProgress> => {
  const raw = await EncryptedStorage.getItem(LEARNING_PROGRESS_STORAGE_KEY);
  if (!raw) return empty();
  try {
    const parsed = JSON.parse(raw) as Partial<LearningProgress>;
    return {
      completedLessons: parsed.completedLessons ?? {},
      currentLessonId: parsed.currentLessonId,
      affiliateTapCount: parsed.affiliateTapCount ?? 0,
      affiliateDisclosureSeenAt: parsed.affiliateDisclosureSeenAt,
      showAffiliateLinks: parsed.showAffiliateLinks ?? false,
      version: LEARNING_STORAGE_VERSION,
    };
  } catch {
    return empty();
  }
};

const save = async (progress: LearningProgress): Promise<void> => {
  await EncryptedStorage.setItem(
    LEARNING_PROGRESS_STORAGE_KEY,
    JSON.stringify(progress)
  );
};

/**
 * Marks a lesson complete. Idempotent: the original completion timestamp is
 * preserved on subsequent calls so the "first completed at" date stays
 * stable for streak / activity calculations.
 */
export const markLessonComplete = async (lessonId: string): Promise<void> => {
  const progress = await getLearningProgress();
  if (progress.completedLessons[lessonId]) return;
  await save({
    ...progress,
    completedLessons: {
      ...progress.completedLessons,
      [lessonId]: new Date().toISOString(),
    },
  });
};

/** Records the lesson the user most recently opened (powers Resume). */
export const setCurrentLesson = async (lessonId: string): Promise<void> => {
  const progress = await getLearningProgress();
  if (progress.currentLessonId === lessonId) return;
  await save({ ...progress, currentLessonId: lessonId });
};

export const recordAffiliateTap = async (): Promise<void> => {
  const progress = await getLearningProgress();
  await save({
    ...progress,
    affiliateTapCount: progress.affiliateTapCount + 1,
  });
};

export const markAffiliateDisclosureSeen = async (): Promise<void> => {
  const progress = await getLearningProgress();
  if (progress.affiliateDisclosureSeenAt) return;
  await save({
    ...progress,
    affiliateDisclosureSeenAt: new Date().toISOString(),
  });
};

export const setShowAffiliateLinks = async (show: boolean): Promise<void> => {
  const progress = await getLearningProgress();
  if (progress.showAffiliateLinks === show) return;
  await save({ ...progress, showAffiliateLinks: show });
};

export const clearLearningProgress = async (): Promise<void> => {
  await save(empty());
};

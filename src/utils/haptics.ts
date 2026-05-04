/**
 * BudgetArk - Haptic feedback wrapper
 * File: src/utils/haptics.ts
 *
 * Thin wrapper around expo-haptics that:
 *   - Caches the user's haptics preference in memory so we don't hit
 *     storage on every fire.
 *   - Fails silently - haptics are progressive enhancement, never block UX.
 *   - Centralizes the small vocabulary of "moments" we want to trigger.
 *
 * Usage:
 *   triggerHaptic("success");   // payment recorded, save complete
 *   triggerHaptic("warning");   // destructive confirm prompt
 *   triggerHaptic("error");     // import failed, validation failed
 *   triggerHaptic("selection"); // theme picked, toggle flipped
 */

import * as Haptics from "expo-haptics";
import { getHapticsEnabled } from "../storage/hapticsStorage";

export type HapticMoment = "success" | "warning" | "error" | "selection" | "impactLight";

let cachedEnabled: boolean | null = null;
let initPromise: Promise<void> | null = null;

const ensureInit = (): Promise<void> => {
  if (cachedEnabled !== null) return Promise.resolve();
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      cachedEnabled = await getHapticsEnabled();
    } catch {
      cachedEnabled = true; // optimistic default
    }
  })();
  return initPromise;
};

/**
 * Update the in-memory cache so toggles in Profile take effect immediately
 * without a storage round-trip on the next fire.
 */
export const setHapticsCache = (enabled: boolean): void => {
  cachedEnabled = enabled;
};

export const triggerHaptic = async (moment: HapticMoment): Promise<void> => {
  await ensureInit();
  if (!cachedEnabled) return;

  try {
    switch (moment) {
      case "success":
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      case "warning":
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      case "error":
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      case "selection":
        await Haptics.selectionAsync();
        return;
      case "impactLight":
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return;
    }
  } catch {
    // expo-haptics can throw on some Android devices; ignore quietly.
  }
};

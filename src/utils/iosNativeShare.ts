/**
 * iOS helpers for presenting UIActivityViewController safely from React Native.
 *
 * RN transparent <Modal> overlays and the ScreenGuard privacy layer both
 * interfere with expo-sharing on iOS — the share sheet may never appear, or
 * an orphaned dimming view can block touches until the app is force-quit.
 */

import { InteractionManager, NativeModules, Platform } from "react-native";
import * as Sharing from "expo-sharing";
import { getPrivacyMode } from "../storage/privacyStorage";

const ScreenGuardModule =
  Platform.OS === "ios" ? NativeModules.ScreenGuardModule : null;

export type ShareFileOptions = {
  mimeType: string;
  dialogTitle: string;
  UTI: string;
};

/**
 * Waits for RN modal dismiss animations and any in-flight interactions to
 * finish before presenting native UI on top of the app.
 */
export const waitForIosModalTeardown = (delayMs = 400): Promise<void> =>
  new Promise((resolve) => {
    if (Platform.OS !== "ios") {
      resolve();
      return;
    }
    InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        setTimeout(resolve, delayMs);
      });
    });
  });

const suspendIosScreenGuardIfNeeded = async (): Promise<boolean> => {
  if (Platform.OS !== "ios" || !ScreenGuardModule) return false;
  const privacyOn = await getPrivacyMode();
  if (!privacyOn) return false;
  ScreenGuardModule.disable();
  await new Promise((resolve) => setTimeout(resolve, 50));
  return true;
};

const restoreIosScreenGuardIfSuspended = async (
  wasSuspended: boolean
): Promise<void> => {
  if (!wasSuspended || !ScreenGuardModule) return;
  ScreenGuardModule.enable();
};

/**
 * Opens the native share sheet for a local file URI with iOS-safe teardown.
 */
export const shareLocalFile = async (
  fileUri: string,
  options: ShareFileOptions
): Promise<void> => {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error(
      "Sharing is not available on this device. The file has been saved to the app cache."
    );
  }

  let screenGuardSuspended = false;
  try {
    if (Platform.OS === "ios") {
      await waitForIosModalTeardown(500);
      screenGuardSuspended = await suspendIosScreenGuardIfNeeded();
    }

    await Sharing.shareAsync(fileUri, options);
  } finally {
    if (Platform.OS === "ios") {
      await restoreIosScreenGuardIfSuspended(screenGuardSuspended);
    }
  }
};

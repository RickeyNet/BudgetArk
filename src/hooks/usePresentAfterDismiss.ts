/**
 * BudgetArk - Present-after-dismiss scheduler
 * File: src/hooks/usePresentAfterDismiss.ts
 *
 * iOS drops one of two Modals swapped in the same frame ("the iOS
 * silent-present failure this codebase keeps hitting"), so every
 * dismiss-then-present hand-off - search result -> edit sheet, payment
 * prompt -> celebration, celebration -> history - waits for the outgoing
 * Modal's close animation first. Thirteen call sites hand-rolled
 * `setTimeout(..., 250)` for this and none cleared the timer, so a
 * navigation away mid-animation could still flip state on an unmounted
 * screen. This hook owns the delay in one place, presents immediately on
 * Android (which has no such race; see utils/iosNativeShare's
 * waitForIosModalTeardown for the same rule), and cancels every pending
 * present on unmount.
 */

import { useCallback, useEffect, useRef } from "react";
import { Platform } from "react-native";

/** RN's Modal slide/fade dismiss animation plus a frame of slack. */
export const MODAL_DISMISS_MS = 250;

export const usePresentAfterDismiss = (): ((present: () => void) => void) => {
  const pending = useRef(new Set<ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const timers = pending.current;
    return () => {
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, []);

  return useCallback((present: () => void) => {
    if (Platform.OS !== "ios") {
      present();
      return;
    }
    const id = setTimeout(() => {
      pending.current.delete(id);
      present();
    }, MODAL_DISMISS_MS);
    pending.current.add(id);
  }, []);
};

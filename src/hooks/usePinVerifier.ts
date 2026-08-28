/**
 * BudgetArk - PIN Verifier Hook
 * File: src/hooks/usePinVerifier.ts
 *
 * The verify / lockout state machine shared by the launch gate
 * (components/AppLockGate) and the Profile setup modal
 * (components/AppLockSetupModal). Both check a candidate PIN against the
 * stored record, feed wrong guesses into the persisted escalating lockout
 * (so the setup modal is never an unthrottled oracle for someone holding
 * an unlocked phone) and count a live lockout down once a second. One
 * implementation means the two surfaces can't drift on what counts as a
 * failed attempt or how a lockout is enforced when the write fails.
 *
 * The caller owns the PIN input and what happens after a correct PIN;
 * this hook owns the record, the countdown, the busy flag and the error
 * line.
 */

import { useCallback, useEffect, useState } from "react";
import {
  type AppLockRecord,
  applyFailedAttempt,
  lockoutRemainingMs,
  verifyPinAgainstRecord,
} from "../utils/appLock";
import {
  recordFailedAttempt,
  recordSuccessfulUnlock,
} from "../storage/appLockStorage";
import { triggerHaptic } from "../utils/haptics";

export const INCORRECT_PIN_MESSAGE = "Incorrect PIN - try again";

export type PinVerifier = {
  record: AppLockRecord | null;
  /** Adopt a (re)loaded record and recompute its lockout from the clock. */
  adoptRecord: (next: AppLockRecord | null) => void;
  /** Re-sync the countdown with the clock, e.g. when a verify step opens. */
  refreshLockout: () => void;
  lockoutMsLeft: number;
  lockedOut: boolean;
  verifying: boolean;
  error: string | null;
  setError: (next: string | null) => void;
  /**
   * Resolves true on a correct PIN (attempt counter reset in the
   * background). A wrong guess persists the attempt, starts any lockout
   * and sets `error`; the caller clears its own input either way.
   */
  verify: (candidate: string) => Promise<boolean>;
};

/**
 * @param countdownActive true while the surface showing the countdown is
 *   on screen (the gate while locked, the modal on its verify step) so the
 *   one-second interval only runs when someone can see it.
 */
export const usePinVerifier = (countdownActive: boolean): PinVerifier => {
  const [record, setRecord] = useState<AppLockRecord | null>(null);
  const [lockoutMsLeft, setLockoutMsLeft] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lockedOut = lockoutMsLeft > 0;

  const adoptRecord = useCallback((next: AppLockRecord | null) => {
    setRecord(next);
    setLockoutMsLeft(next ? lockoutRemainingMs(next, Date.now()) : 0);
  }, []);

  const refreshLockout = useCallback(() => {
    if (record) setLockoutMsLeft(lockoutRemainingMs(record, Date.now()));
  }, [record]);

  /** One-second countdown while a lockout is active and visible. */
  useEffect(() => {
    if (!countdownActive || !lockedOut) return;
    const id = setInterval(() => {
      setLockoutMsLeft((prev) => Math.max(0, prev - 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [countdownActive, lockedOut]);

  const verify = useCallback(
    async (candidate: string): Promise<boolean> => {
      if (!record || verifying) return false;
      setVerifying(true);
      try {
        if (await verifyPinAgainstRecord(candidate, record)) {
          setError(null);
          // Reset the attempt counter in the background; a failed write
          // only means a stale counter, never a stuck gate. Anything the
          // caller writes next (change / disable) lands behind this on
          // encryptedStorage's per-key queue, so ordering is preserved.
          recordSuccessfulUnlock(record)
            .then(setRecord)
            .catch(() => {});
          return true;
        }
        triggerHaptic("error");
        let next: AppLockRecord;
        try {
          next = await recordFailedAttempt(record);
        } catch {
          // Persisting the counter failed - still enforce it (and any
          // lockout it triggers) in memory.
          next = applyFailedAttempt(record, Date.now());
        }
        setRecord(next);
        setLockoutMsLeft(lockoutRemainingMs(next, Date.now()));
        setError(INCORRECT_PIN_MESSAGE);
        return false;
      } finally {
        setVerifying(false);
      }
    },
    [record, verifying]
  );

  return {
    record,
    adoptRecord,
    refreshLockout,
    lockoutMsLeft,
    lockedOut,
    verifying,
    error,
    setError,
    verify,
  };
};

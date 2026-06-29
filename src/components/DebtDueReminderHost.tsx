import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import type { Debt, Payment } from "../types";
import DebtDuePaymentPromptModal from "./DebtDuePaymentPromptModal";
import DebtPayoffCelebrationModal from "./DebtPayoffCelebrationModal";
import { triggerHaptic } from "../utils/haptics";
import { getDebts, getPayments, recordPayment } from "../storage/debtStorage";
import {
  dismissDebtDueForMonth,
  getDebtDueDismissals,
  type DebtDueDismissals,
} from "../storage/debtDueReminderStorage";
import { debtsDueOrOverdueNeedingPrompt } from "../utils/debtDueCalendar";
import { syncNetWorthSnapshot } from "../storage/netWorthSnapshotStorage";
import { generateUUID } from "../utils/uuid";

interface DebtDueReminderHostProps {
  /**
   * Suppress presenting while another root modal owns the screen (the OTA
   * update prompt or the "what's new" sheet). Stacking transparent fade
   * modals leaves one hidden on iOS - the same reason those two are kept
   * mutually exclusive in App.tsx. The queued debt is retained; it surfaces
   * once this clears.
   */
  paused?: boolean;
}

/**
 * App-root host for the "minimum due today" prompt.
 *
 * The Debt Tracker screen also renders this modal for its in-tab reminder
 * banner, but the app opens to the Bridge tab (see AppNavigator's
 * `initialRouteName`) and screens mount lazily - so a tab-scoped trigger
 * never fires when the app is simply opened. This host runs the due-check on
 * launch and on every foreground regardless of the active tab, so a due
 * minimum is surfaced the moment the app is opened.
 *
 * Logging here records a Payment exactly like the Debt Tracker flow, so the
 * Budget screen counts it once via its `max(paid, minimum)` baseline - the
 * logged payment replaces the planned minimum rather than adding to it.
 */
const DebtDueReminderHost: React.FC<DebtDueReminderHostProps> = ({ paused = false }) => {
  const [debt, setDebt] = useState<Debt | null>(null);
  // Set when a logged minimum clears the last of a balance, so the payoff
  // confetti presents after the prompt finishes dismissing.
  const [celebrationDebt, setCelebrationDebt] = useState<Debt | null>(null);
  // Guards the record/dismiss handlers against a double-tap recording the
  // payment twice, and stops a foreground re-eval from swapping the prompt
  // mid-submit.
  const submittingRef = useRef(false);
  // Latest data backing the queue, so the dismiss handler can advance without
  // re-reading debts/payments it already has in hand.
  const dataRef = useRef<{
    debts: Debt[];
    payments: Payment[];
    dismissals: DebtDueDismissals;
  }>({ debts: [], payments: [], dismissals: {} });

  const evaluate = useCallback(async () => {
    if (submittingRef.current) return;
    const [debts, payments, dismissals] = await Promise.all([
      getDebts(),
      getPayments(),
      getDebtDueDismissals(),
    ]);
    dataRef.current = { debts, payments, dismissals };
    setDebt((current) => {
      // A prompt is already up (or the user is mid-queue) - don't reshuffle it.
      if (current) return current;
      const due = debtsDueOrOverdueNeedingPrompt(debts, payments, dismissals);
      return due[0] ?? null;
    });
  }, []);

  useEffect(() => {
    // Re-runs when `paused` flips back to false so a debt that was due while a
    // higher-priority modal owned the screen still gets surfaced.
    if (!paused) void evaluate();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void evaluate();
    });
    return () => sub.remove();
  }, [evaluate, paused]);

  const advance = useCallback(
    (
      debts: Debt[],
      payments: Payment[],
      dismissals: DebtDueDismissals,
      skipDebtId?: string
    ) => {
      const due = debtsDueOrOverdueNeedingPrompt(debts, payments, dismissals);
      setDebt(due.find((d) => d.id !== skipDebtId) ?? null);
    },
    []
  );

  const handleLogPayment = useCallback(
    async (debtId: string, amount: number) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      try {
        const now = new Date().toISOString();
        const result = await recordPayment({
          id: generateUUID(),
          debtId,
          amount,
          date: now,
          updatedAt: now,
        });
        await syncNetWorthSnapshot(now);
        const dismissals = await getDebtDueDismissals();
        dataRef.current = {
          debts: result.debts,
          payments: result.payments,
          dismissals,
        };
        // The reminder only ever targets a debt with a positive balance, so a
        // post-payment balance at (or below) zero means this minimum just
        // cleared it.
        const paidOff =
          result.debts.find((d) => d.id === debtId && d.balance <= 0) ?? null;
        setDebt(null);
        if (paidOff) {
          // Let the prompt's dismiss animation finish before the celebration
          // presents - iOS drops one of two modals swapped in the same frame.
          // Remaining due debts re-prompt after the celebration is dismissed.
          setTimeout(() => setCelebrationDebt(paidOff), 250);
        } else {
          triggerHaptic("success");
          advance(result.debts, result.payments, dismissals, debtId);
        }
      } finally {
        submittingRef.current = false;
      }
    },
    [advance]
  );

  const handleDismissForMonth = useCallback(
    async (debtId: string) => {
      await dismissDebtDueForMonth(debtId);
      const { debts, payments } = dataRef.current;
      const dismissals = await getDebtDueDismissals();
      dataRef.current = { debts, payments, dismissals };
      advance(debts, payments, dismissals, debtId);
    },
    [advance]
  );

  const handleClose = useCallback(() => setDebt(null), []);

  const handleCelebrationClose = useCallback(() => {
    setCelebrationDebt(null);
    // Surface the next still-due debt, if any, once the confetti dismisses.
    const { debts, payments, dismissals } = dataRef.current;
    setTimeout(() => advance(debts, payments, dismissals), 250);
  }, [advance]);

  return (
    <>
      <DebtDuePaymentPromptModal
        visible={!paused && debt !== null}
        debt={debt}
        onLogPayment={handleLogPayment}
        onDismissForMonth={handleDismissForMonth}
        onClose={handleClose}
      />
      <DebtPayoffCelebrationModal
        visible={!paused && celebrationDebt !== null}
        debt={celebrationDebt}
        onClose={handleCelebrationClose}
      />
    </>
  );
};

export default React.memo(DebtDueReminderHost);

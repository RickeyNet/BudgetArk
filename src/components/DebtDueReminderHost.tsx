/**
 * BudgetArk - Debt Due Reminder Host
 * File: src/components/DebtDueReminderHost.tsx
 *
 * App-root controller that decides when to present the due-day payment
 * prompt and the payment / payoff celebrations. Re-checks on foreground
 * (AppState) and defers presentation past interactions - presenting a
 * Modal mid-navigation is the iOS silent-present failure this codebase
 * keeps hitting. Records the payment and refreshes the net-worth snapshot
 * when the user confirms.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, InteractionManager } from "react-native";
import type { Debt, Payment } from "../types";
import DebtDuePaymentPromptModal from "./DebtDuePaymentPromptModal";
import DebtPayoffCelebrationModal from "./DebtPayoffCelebrationModal";
import DebtPaymentCelebrationModal from "./DebtPaymentCelebrationModal";
import { getDebts, getPayments, recordPayment } from "../storage/debtStorage";
import {
  dismissDebtDueForMonth,
  getDebtDueDismissals,
  type DebtDueDismissals,
} from "../storage/debtDueReminderStorage";
import { debtsDueOrOverdueNeedingPrompt } from "../utils/debtDueCalendar";
import { getMonthKey } from "../utils/budgetMonths";
import { syncNetWorthSnapshot } from "../storage/netWorthSnapshotStorage";
import { minimumDuePaymentId } from "../utils/debtPaymentDedupe";

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
  // Set after any other confirmed payment, for the lighter "payment logged"
  // confetti. Carries the updated debt (for its new balance) and the amount.
  const [paymentCelebration, setPaymentCelebration] = useState<{
    debt: Debt;
    amount: number;
  } | null>(null);
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
    // higher-priority modal owned the screen still gets surfaced. Deferred
    // past the first paint: the evaluation decrypts debts + payments, and the
    // prompt appearing a beat after launch is indistinguishable to the user -
    // but that decryption sitting in the boot window isn't.
    let task: ReturnType<typeof InteractionManager.runAfterInteractions> | null = null;
    if (!paused) {
      task = InteractionManager.runAfterInteractions(() => {
        void evaluate();
      });
    }
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void evaluate();
    });
    return () => {
      task?.cancel();
      sub.remove();
    };
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
        // Deterministic id (debt + month): if the partner's phone logs the
        // same month's minimum too, sync merges the two records into one
        // instead of double-counting the payment. recordPayment no-ops if
        // this id is already live locally.
        const result = await recordPayment({
          id: minimumDuePaymentId(debtId, getMonthKey()),
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
        // Let the prompt's dismiss animation finish before a celebration
        // presents - iOS drops one of two modals swapped in the same frame.
        // The queue advances once the celebration is dismissed.
        if (paidOff) {
          setTimeout(() => setCelebrationDebt(paidOff), 250);
        } else {
          const updatedDebt = result.debts.find((d) => d.id === debtId) ?? null;
          if (updatedDebt) {
            setTimeout(
              () => setPaymentCelebration({ debt: updatedDebt, amount }),
              250
            );
          } else {
            advance(result.debts, result.payments, dismissals, debtId);
          }
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

  const handlePaymentCelebrationClose = useCallback(() => {
    setPaymentCelebration(null);
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
      <DebtPaymentCelebrationModal
        visible={!paused && paymentCelebration !== null}
        debt={paymentCelebration?.debt ?? null}
        amount={paymentCelebration?.amount ?? 0}
        onClose={handlePaymentCelebrationClose}
      />
    </>
  );
};

export default React.memo(DebtDueReminderHost);

import type { Debt, Payment } from "../types";

export interface DebtPaymentPlanLine {
  debt: Debt;
  /** Sum of payments recorded for this debt in the month. */
  paid: number;
  /** Amount the month's Debt Payments budget counts for this debt. */
  amount: number;
}

/**
 * Per-debt "Debt Payments" lines for one budget month.
 *
 * Current and future months budget each active debt at the larger of
 * paid-so-far vs its minimum payment, so Spent and Net reflect planned
 * obligations before payments are logged. Past months are settled: they
 * count only what was actually paid - no minimum floor and no planned
 * rows - so raising a minimum later can't retroactively grow a closed
 * month. Debts paid down to zero keep their logged payments in every
 * month rather than dropping off the moment the balance clears.
 */
export const buildDebtPaymentPlanForMonth = (
  debts: readonly Debt[],
  paymentsInMonth: readonly Payment[],
  monthKey: string,
  currentMonthKey: string
): DebtPaymentPlanLine[] => {
  const paidByDebt = new Map<string, number>();
  for (const payment of paymentsInMonth) {
    paidByDebt.set(
      payment.debtId,
      (paidByDebt.get(payment.debtId) ?? 0) + payment.amount
    );
  }

  const isPastMonth = monthKey < currentMonthKey;
  return debts
    .map((debt) => {
      const paid = paidByDebt.get(debt.id) ?? 0;
      const planned = !isPastMonth && debt.balance > 0 ? debt.minPayment : 0;
      return { debt, paid, amount: Math.max(paid, planned) };
    })
    .filter((line) => line.amount > 0);
};

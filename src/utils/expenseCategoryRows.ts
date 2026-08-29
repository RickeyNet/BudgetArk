/**
 * BudgetArk - Expense Category Rows
 * File: src/utils/expenseCategoryRows.ts
 *
 * Builds the Budget tab's Spending rows: one row per expense category with
 * its spend, limit, ratio and expandable entry list - including the three
 * synthetic "Debt Payments" entries (`payment-`, `debt-min-topup-`,
 * `auto-debt-`) derived from the debt tracker rather than budget storage.
 *
 * Extracted from BudgetScreen's `expenseRows` memo so the row/limit/ratio
 * and debt-derivation rules are testable without mounting the screen. The
 * screen keeps only the memo; SpendingCard re-exports the row types so its
 * public shape is unchanged.
 */

import {
  BUDGET_CATEGORIES,
  type BudgetEntry,
  type CategoryName,
  type Payment,
  type RecurrenceInterval,
} from "../types";
import type { DebtPaymentPlanLine } from "./debtPaymentPlan";

/** One expandable line under a category row. */
export type ExpenseCategoryEntry = {
  id: string;
  amount: number;
  description?: string;
  date: string;
  recurring?: boolean;
  recurrenceInterval?: RecurrenceInterval;
  businessId?: string;
  personId?: string;
  attachmentCount?: number;
  isPrivate?: boolean;
};

export type ExpenseCategoryRow = {
  category: CategoryName;
  spent: number;
  limit: number | null;
  ratio: number | null;
  entries: ExpenseCategoryEntry[];
};

export interface ExpenseCategoryRowsInput {
  /** Recurring-aware entries for the selected month (income included; filtered here). */
  monthlyEntries: readonly BudgetEntry[];
  /** Custom category names, appended after the built-ins. */
  customCategoryNames: readonly string[];
  /** Category -> spend driving the rows; already business-filtered when `businessOnly`. */
  spendingByCategory: Record<string, number>;
  /** Category -> monthly limit. Ignored while `businessOnly`. */
  limitByCategory: Record<string, number>;
  /** The Spending card's "Business only" chip. */
  businessOnly: boolean;
  /** Per-debt baseline for the month (see buildDebtPaymentPlanForMonth). */
  debtPaymentPlanForMonth: readonly DebtPaymentPlanLine[];
  /** Payments actually logged in the month, for live debts only. */
  recordedDebtPaymentsForMonth: readonly Payment[];
  /** Anchor date for synthetic planned rows (the selected month). */
  selectedMonthDate: Date;
}

export const buildExpenseCategoryRows = ({
  monthlyEntries,
  customCategoryNames,
  spendingByCategory,
  limitByCategory,
  businessOnly,
  debtPaymentPlanForMonth,
  recordedDebtPaymentsForMonth,
  selectedMonthDate,
}: ExpenseCategoryRowsInput): ExpenseCategoryRow[] => {
  const categoriesInPlay = new Set<CategoryName>();

  const allCategories: CategoryName[] = [
    ...BUDGET_CATEGORIES,
    ...customCategoryNames,
  ];
  allCategories.forEach((category) => {
    // Filtered view: only categories with business spend - a limit alone
    // shouldn't surface an empty row there.
    if (
      (spendingByCategory[category] ?? 0) > 0 ||
      (!businessOnly && limitByCategory[category] != null)
    ) {
      categoriesInPlay.add(category);
    }
  });

  return Array.from(categoriesInPlay)
    .map((category) => {
      const spent = spendingByCategory[category] ?? 0;
      // Limits compare the WHOLE category against its budget; a business-
      // only slice against the full limit would understate usage, so the
      // filtered view drops limits and bars scale relatively instead.
      const limit = businessOnly ? null : (limitByCategory[category] ?? null);
      const ratio = limit ? spent / limit : null;
      const entries: ExpenseCategoryEntry[] = monthlyEntries
        .filter(
          (e) =>
            e.type === "expense" &&
            e.category === category &&
            (!businessOnly || e.businessId)
        )
        .map((e) => ({
          id: e.id,
          amount: e.amount,
          description: e.description,
          date: e.date,
          recurring: e.recurring,
          recurrenceInterval: e.recurrenceInterval,
          businessId: e.businessId,
          personId: e.personId,
          attachmentCount: e.attachments?.length,
          isPrivate: e.isPrivate,
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      if (category === "Debt Payments" && !businessOnly) {
        const paymentsByDebt = new Map<string, Payment[]>();
        for (const payment of recordedDebtPaymentsForMonth) {
          const list = paymentsByDebt.get(payment.debtId);
          if (list) list.push(payment);
          else paymentsByDebt.set(payment.debtId, [payment]);
        }

        for (const { debt, paid, amount } of debtPaymentPlanForMonth) {
          const debtPayments = paymentsByDebt.get(debt.id) ?? [];
          if (debtPayments.length > 0) {
            for (const payment of debtPayments) {
              entries.push({
                id: `payment-${payment.id}`,
                amount: payment.amount,
                description: `${debt.name} payment`,
                date: payment.date,
              });
            }
            // Planned shortfall on top of logged payments. `amount` only
            // exceeds `paid` for current/future months (past months carry
            // no minimum floor), so closed months never grow a phantom
            // "(planned)" row next to what was actually paid.
            if (amount > paid) {
              entries.push({
                id: `debt-min-topup-${debt.id}`,
                amount: amount - paid,
                description: `${debt.name} minimum (planned)`,
                date: selectedMonthDate.toISOString(),
              });
            }
          } else {
            entries.push({
              id: `auto-debt-${debt.id}`,
              amount,
              description: `${debt.name} minimum payment (planned)`,
              date: selectedMonthDate.toISOString(),
            });
          }
        }
      }

      return { category, spent, limit, ratio, entries };
    })
    .sort((a, b) => b.spent - a.spent);
};

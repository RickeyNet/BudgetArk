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
import { describeFulfillment } from "./billFulfillment";
import { isLoanEntry, loanOutstanding } from "./loans";

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
  personIds?: string[];
  attachmentCount?: number;
  isPrivate?: boolean;
  /** Bill this entry is the actual charge for (BudgetEntry.fulfillsRecurringId). */
  fulfillsRecurringId?: string;
  /** The bill's name, when `fulfillsRecurringId` resolves to a live bill. */
  billLabel?: string;
  /** The bill's estimate, for the "est. $120 (+$17.42)" badge. */
  billEstimate?: number;
  /** Borrower, when the expense is money lent out (BudgetEntry.lentTo). */
  lentTo?: string;
  /** What the borrower still owes on it. */
  loanOutstanding?: number;
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
  /**
   * Every live entry by id, so an actual charge can name the bill it stands
   * in for. Optional: without it entries still carry `fulfillsRecurringId`
   * but no label/estimate.
   */
  entriesById?: ReadonlyMap<string, BudgetEntry>;
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
  entriesById,
}: ExpenseCategoryRowsInput): ExpenseCategoryRow[] => {
  const categoriesInPlay = new Set<CategoryName>();

  const allCategories: CategoryName[] = [
    ...BUDGET_CATEGORIES,
    ...customCategoryNames,
  ];
  allCategories.forEach((category) => {
    // Only categories with spend this month get a row. A limit alone is
    // deliberately not enough: at the start of a month nearly every limited
    // category sits at $0, and a wall of empty rows under the chart hides the
    // few that matter. Limits for quiet categories stay reachable from the
    // card's "Limits" header link.
    if ((spendingByCategory[category] ?? 0) > 0) {
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
        .map((e) => {
          const bill = entriesById ? describeFulfillment(e, entriesById) : null;
          return {
            id: e.id,
            amount: e.amount,
            description: e.description,
            date: e.date,
            recurring: e.recurring,
            recurrenceInterval: e.recurrenceInterval,
            businessId: e.businessId,
            personId: e.personId,
            personIds: e.personIds,
            attachmentCount: e.attachments?.length,
            isPrivate: e.isPrivate,
            fulfillsRecurringId: e.fulfillsRecurringId,
            billLabel: bill?.billLabel,
            billEstimate: bill?.estimate,
            ...(isLoanEntry(e)
              ? { lentTo: e.lentTo, loanOutstanding: loanOutstanding(e) }
              : {}),
          };
        })
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

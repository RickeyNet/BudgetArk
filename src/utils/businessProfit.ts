/**
 * BudgetArk - Business profit in the personal budget
 * File: src/utils/businessProfit.ts
 *
 * A business the user tracks INCOME for is its own little ledger: what it
 * takes in and what it spends are the business's money, and only what is
 * left over - the month's profit - is the household's income. A month the
 * business loses money adds nothing (a loss is never negative income, and
 * the business's bills are not the household's spending).
 *
 * So for such a business, its tagged entries leave the personal month
 * entirely and one number takes their place: max(0, income - expenses).
 * `personalMonth` is the month-membership rule every personal total goes
 * through (Budget tab, cash flow, charts, insights, annual report, limits)
 * so no two screens can disagree about what the household earned.
 *
 * Deliberately NOT applied to a business that has never had income tagged
 * to it. Tagging only expenses is the original tax-time use ("what did I
 * spend for the LLC out of my own pocket") and those expenses stay in the
 * personal budget exactly as before - nothing changes for a user until
 * they tag a first payment to the business.
 *
 * Views that are ABOUT the business keep reading the raw entries: the
 * business report, the Spending card's "Business only" chip, the person
 * report, tax set-asides and the bill calendar. Pure and unit-tested.
 */

import type { BudgetEntry } from "../types";
import { entriesForMonth } from "./billFulfillment";
import { countsAsSpending, isEarnedIncome, spendingAmount } from "./refunds";

const roundCents = (value: number): number => Math.round(value * 100) / 100;

/** One income-tracking business's month. */
export interface BusinessMonth {
  businessId: string;
  /** Income tagged to the business that counts in the month. */
  income: number;
  /** Expenses tagged to the business that count in the month. */
  expenses: number;
  /** income - expenses; negative in a loss month. */
  net: number;
  /** What reaches the personal budget as income: the profit, never below 0. */
  profit: number;
  /** The business's entries for the month (income and expenses), stored order. */
  entries: BudgetEntry[];
}

/** A month as the personal budget counts it. */
export interface PersonalMonth {
  /**
   * Personal entries only: everything `entriesForMonth` admits once the
   * income-tracking businesses' entries are set aside.
   */
  entries: BudgetEntry[];
  /** Income-tracking businesses with activity in the month, stored order. */
  businesses: BusinessMonth[];
  /** Sum of every business's `profit` - add it to the month's income. */
  businessProfit: number;
}

/**
 * Businesses whose money is netted: any business with at least one live
 * income entry tagged to it, in any month. Once a business tracks income
 * the rule holds for all of its months, so a month where it only spent
 * reads as a loss instead of flipping its bills back into personal
 * spending.
 */
export const incomeTrackedBusinessIds = (
  entries: readonly BudgetEntry[]
): Set<string> => {
  const ids = new Set<string>();
  for (const entry of entries) {
    // A refund is not business income - it must not start netting a business.
    if (isEarnedIncome(entry) && entry.businessId && !entry.deletedAt) {
      ids.add(entry.businessId);
    }
  }
  return ids;
};

/** Whether an entry belongs to an income-tracking business. */
export const isNettedBusinessEntry = (
  entry: Pick<BudgetEntry, "businessId">,
  tracked: ReadonlySet<string>
): boolean => !!entry.businessId && tracked.has(entry.businessId);

/**
 * Groups a list of an income-tracking business's month entries into one
 * line per business. Takes the list rather than a month key so a caller
 * that counts only part of a month (paycheckCycle's "so far") can filter
 * by day first and still get the same netting.
 */
export const summarizeBusinessEntries = (
  businessEntries: readonly BudgetEntry[]
): BusinessMonth[] => {
  const byId = new Map<string, BusinessMonth>();
  for (const entry of businessEntries) {
    if (!entry.businessId || !Number.isFinite(entry.amount)) continue;
    let line = byId.get(entry.businessId);
    if (!line) {
      line = {
        businessId: entry.businessId,
        income: 0,
        expenses: 0,
        net: 0,
        profit: 0,
        entries: [],
      };
      byId.set(entry.businessId, line);
    }
    if (isEarnedIncome(entry)) line.income += entry.amount;
    else if (countsAsSpending(entry)) line.expenses += spendingAmount(entry);
    else continue;
    line.entries.push(entry);
  }
  const lines = Array.from(byId.values()).filter((line) => line.entries.length > 0);
  for (const line of lines) {
    line.income = roundCents(line.income);
    line.expenses = roundCents(line.expenses);
    line.net = roundCents(line.income - line.expenses);
    line.profit = Math.max(0, line.net);
  }
  return lines;
};

/**
 * The month's entries that belong to income-tracking businesses, through
 * the same membership rule as everything else (recurring projections,
 * actuals replacing estimates).
 */
export const businessEntriesForMonth = (
  entries: readonly BudgetEntry[],
  monthKey: string,
  tracked: ReadonlySet<string> = incomeTrackedBusinessIds(entries)
): BudgetEntry[] =>
  tracked.size === 0
    ? []
    : entriesForMonth(entries, monthKey).filter((entry) =>
        isNettedBusinessEntry(entry, tracked)
      );

/**
 * The personal entries of a month: `entriesForMonth` over everything that
 * is not an income-tracking business's. Filtering BEFORE the membership
 * rule keeps the personal side self-consistent - the rows the Budget tab
 * lists always sum to the totals it shows.
 */
export const personalEntriesForMonth = (
  entries: readonly BudgetEntry[],
  monthKey: string,
  tracked: ReadonlySet<string> = incomeTrackedBusinessIds(entries)
): BudgetEntry[] =>
  tracked.size === 0
    ? entriesForMonth(entries, monthKey)
    : entriesForMonth(
        entries.filter((entry) => !isNettedBusinessEntry(entry, tracked)),
        monthKey
      );

/**
 * THE personal month: personal entries plus each income-tracking business
 * reduced to its profit. Pass `tracked` when looping over many months so
 * the business scan runs once.
 */
export const personalMonth = (
  entries: readonly BudgetEntry[],
  monthKey: string,
  tracked: ReadonlySet<string> = incomeTrackedBusinessIds(entries)
): PersonalMonth => {
  const businesses = summarizeBusinessEntries(
    businessEntriesForMonth(entries, monthKey, tracked)
  );
  return {
    entries: personalEntriesForMonth(entries, monthKey, tracked),
    businesses,
    businessProfit: roundCents(
      businesses.reduce((sum, line) => sum + line.profit, 0)
    ),
  };
};

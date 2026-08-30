/**
 * BudgetArk - Limits Sheet
 * File: src/utils/limitsSheet.ts
 *
 * The one-screen view of category limits: every expense category (built-
 * in and custom) with the limit in force for the viewed month, last
 * month's limit, and what the category actually averaged over the
 * preceding months - so a limit can be set before there is any spending
 * to long-press, copied forward, or seeded from history. Pure and unit-
 * tested; BudgetLimitsModal renders it and budgetStorage persists the
 * result.
 */

import type { BudgetEntry, CategoryBudgetLimit, CategoryName } from "../types";
import { entriesForMonth } from "./billFulfillment";
import { shiftMonthKey } from "./recurringBillDetection";

/** Month key -> that month's limits (tombstones included); the shape budgetStorage persists. */
export type BudgetLimitHistory = Record<string, CategoryBudgetLimit[]>;

export interface LimitSheetRow {
  category: CategoryName;
  /** Limit in force this month (exact record, else the latest earlier month's). */
  current: number | null;
  /** Limit in force the month before, by the same rule. */
  lastMonth: number | null;
  /** Mean spend over the lookback months that had any spending at all. */
  averageSpend: number | null;
  spentThisMonth: number;
}

/** How many preceding months feed the average. */
export const LIMIT_LOOKBACK_MONTHS = 3;

/**
 * Limits in force for a month: the month's own record when one exists
 * (even if empty - removing every limit is a decision), else the most
 * recent earlier month's. Mirrors budgetStorage.getCategoryBudgetLimits
 * so the sheet shows exactly what the Spending card uses.
 */
export const resolveLimitsForMonth = (
  history: BudgetLimitHistory,
  monthKey: string
): CategoryBudgetLimit[] => {
  const live = (limits: CategoryBudgetLimit[] | undefined) =>
    (limits ?? []).filter((limit) => !limit.deletedAt);
  if (history[monthKey]) return live(history[monthKey]);
  const fallbackKey = Object.keys(history)
    .filter((key) => key < monthKey)
    .sort()
    .pop();
  return fallbackKey ? live(history[fallbackKey]) : [];
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

const expenseSpendByCategory = (
  entries: readonly BudgetEntry[],
  monthKey: string
): Record<string, number> => {
  const spend: Record<string, number> = {};
  for (const entry of entriesForMonth(entries, monthKey)) {
    if (entry.type !== "expense") continue;
    spend[entry.category] = (spend[entry.category] ?? 0) + entry.amount;
  }
  return spend;
};

export interface LimitSheetInput {
  /** Every category the sheet lists, in display order. */
  categories: readonly CategoryName[];
  monthKey: string;
  history: BudgetLimitHistory;
  entries: readonly BudgetEntry[];
  lookbackMonths?: number;
}

export const buildLimitSheetRows = ({
  categories,
  monthKey,
  history,
  entries,
  lookbackMonths = LIMIT_LOOKBACK_MONTHS,
}: LimitSheetInput): LimitSheetRow[] => {
  const currentByCategory = new Map(
    resolveLimitsForMonth(history, monthKey).map((l) => [l.category, l.monthlyLimit])
  );
  const lastByCategory = new Map(
    resolveLimitsForMonth(history, shiftMonthKey(monthKey, -1)).map((l) => [
      l.category,
      l.monthlyLimit,
    ])
  );
  const thisMonthSpend = expenseSpendByCategory(entries, monthKey);
  // Only months with any expense data count toward the average, so a
  // brand-new user isn't shown a third of one month's spend.
  const lookback: Record<string, number>[] = [];
  for (let back = 1; back <= lookbackMonths; back++) {
    const spend = expenseSpendByCategory(entries, shiftMonthKey(monthKey, -back));
    if (Object.keys(spend).length > 0) lookback.push(spend);
  }

  return categories.map((category) => {
    const averageSpend =
      lookback.length > 0
        ? round2(lookback.reduce((sum, m) => sum + (m[category] ?? 0), 0) / lookback.length)
        : null;
    return {
      category,
      current: currentByCategory.get(category) ?? null,
      lastMonth: lastByCategory.get(category) ?? null,
      averageSpend: averageSpend && averageSpend > 0 ? averageSpend : null,
      spentThisMonth: round2(thisMonthSpend[category] ?? 0),
    };
  });
};

/** A limit seeded from an average: rounded UP to the nearest 10 so it isn't already blown. */
export const suggestLimitFromAverage = (average: number): number =>
  Math.max(10, Math.ceil(average / 10) * 10);

/**
 * Turn the sheet's per-category drafts (raw input text) into the limit
 * list to persist: a positive number keeps or sets the limit, anything
 * else removes it. Unchanged amounts keep their `updatedAt` so a paired
 * device's newer edit still wins per category; changed ones are stamped.
 */
export const limitsFromDrafts = (
  drafts: Readonly<Record<string, string>>,
  existing: readonly CategoryBudgetLimit[],
  now: string
): CategoryBudgetLimit[] => {
  const existingByCategory = new Map(existing.map((l) => [l.category, l]));
  const next: CategoryBudgetLimit[] = [];
  for (const [category, raw] of Object.entries(drafts)) {
    const amount = parseFloat(raw);
    if (!(amount > 0)) continue;
    const prior = existingByCategory.get(category);
    next.push(
      prior && prior.monthlyLimit === amount
        ? prior
        : { category, monthlyLimit: round2(amount), updatedAt: now }
    );
  }
  return next;
};

/**
 * BudgetArk - Personal Inflation Rate
 * File: src/utils/personalInflation.ts
 *
 * Pure math behind the Charts-tab "Personal Inflation" tool: the user's
 * own price change, measured on their own basket. The last twelve complete
 * months are compared against the twelve before them, category by
 * category, on a per-tracked-month average (a year with eight tracked
 * months is not "cheaper" than one with twelve). Only categories with
 * spend in BOTH windows form the basket - a category that appeared this
 * year is new spending, not inflation - and the headline figure it is
 * compared against is the bundled constant in data/inflationData2026 (no
 * network). Debt payments and the savings-reserve categories are excluded:
 * they are transfers, not prices.
 */

import type { BudgetEntry } from "../types";
import { getMonthKey } from "./budgetMonths";
import { entriesForMonth } from "./billFulfillment";
import { roundToCents } from "./money";
import { HEADLINE_CPI_YOY_PERCENT } from "../data/inflationData2026";

/** Each comparison window spans this many complete months. */
export const INFLATION_WINDOW_MONTHS = 12;

/** A window needs at least this many tracked months to be worth comparing. */
export const INFLATION_MIN_TRACKED_MONTHS = 3;

/** Within this many percentage points of the headline counts as "in line". */
export const INFLATION_INLINE_BAND = 0.5;

/** Transfers, not prices - never part of the basket. */
export const INFLATION_EXCLUDED_CATEGORIES: ReadonlySet<string> = new Set([
  "Debt Payments",
  "Savings",
  "Retirement",
  "Investing",
]);

export type InflationCategoryRow = {
  category: string;
  /** Average spend per tracked month in the recent window. */
  currentMonthly: number;
  /** Average spend per tracked month in the prior window. */
  priorMonthly: number;
  /** Percent change, prior -> current. */
  rate: number;
  /** currentMonthly - priorMonthly. */
  deltaMonthly: number;
};

export type PersonalInflationResult =
  | {
      status: "insufficient";
      currentMonths: number;
      priorMonths: number;
    }
  | {
      status: "ok";
      /** The user's own rate over the shared basket, in percent. */
      rate: number;
      headlineRate: number;
      /** Basket spend per tracked month, recent window. */
      currentMonthly: number;
      /** Basket spend per tracked month, prior window. */
      priorMonthly: number;
      currentMonths: number;
      priorMonths: number;
      /** Basket categories, biggest absolute monthly change first. */
      categories: InflationCategoryRow[];
      /** Spend per month in categories with no prior-year history (not in the basket). */
      newSpendingMonthly: number;
    };

type WindowTotals = {
  monthsTracked: number;
  totals: Record<string, number>;
};

/**
 * Per-category totals over the `count` months ending `endOffset` months
 * before `now` (offset 1 = last month). A month counts as tracked when it
 * has ANY entry, income included - the same "was the user tracking?" rule
 * calcAvgMonthlyExpenses and the what-if tool use.
 */
const sumWindow = (
  entries: readonly BudgetEntry[],
  now: Date,
  endOffset: number,
  count: number
): WindowTotals => {
  const totals: Record<string, number> = {};
  let monthsTracked = 0;
  for (let i = endOffset; i < endOffset + count; i++) {
    const monthKey = getMonthKey(new Date(now.getFullYear(), now.getMonth() - i, 1));
    const monthEntries = entriesForMonth(entries, monthKey);
    if (monthEntries.length === 0) continue;
    monthsTracked += 1;
    for (const entry of monthEntries) {
      if (entry.type !== "expense") continue;
      if (INFLATION_EXCLUDED_CATEGORIES.has(entry.category)) continue;
      if (!Number.isFinite(entry.amount) || entry.amount <= 0) continue;
      totals[entry.category] = (totals[entry.category] ?? 0) + entry.amount;
    }
  }
  return { monthsTracked, totals };
};

const percentChange = (from: number, to: number): number =>
  Math.round(((to - from) / from) * 1000) / 10;

/**
 * The user's personal inflation rate. `now` is injectable for tests; the
 * current (incomplete) month is never part of either window.
 */
export const computePersonalInflation = (
  entries: readonly BudgetEntry[],
  now: Date = new Date(),
  headlineRate: number = HEADLINE_CPI_YOY_PERCENT
): PersonalInflationResult => {
  const current = sumWindow(entries, now, 1, INFLATION_WINDOW_MONTHS);
  const prior = sumWindow(entries, now, 1 + INFLATION_WINDOW_MONTHS, INFLATION_WINDOW_MONTHS);

  const insufficient: PersonalInflationResult = {
    status: "insufficient",
    currentMonths: current.monthsTracked,
    priorMonths: prior.monthsTracked,
  };
  if (
    current.monthsTracked < INFLATION_MIN_TRACKED_MONTHS ||
    prior.monthsTracked < INFLATION_MIN_TRACKED_MONTHS
  ) {
    return insufficient;
  }

  const categories: InflationCategoryRow[] = [];
  let basketCurrent = 0;
  let basketPrior = 0;
  let newSpending = 0;

  for (const [category, currentTotal] of Object.entries(current.totals)) {
    const currentMonthly = roundToCents(currentTotal / current.monthsTracked);
    const priorTotal = prior.totals[category] ?? 0;
    if (priorTotal <= 0 || currentMonthly <= 0) {
      newSpending += currentMonthly;
      continue;
    }
    const priorMonthly = roundToCents(priorTotal / prior.monthsTracked);
    basketCurrent += currentMonthly;
    basketPrior += priorMonthly;
    categories.push({
      category,
      currentMonthly,
      priorMonthly,
      rate: percentChange(priorMonthly, currentMonthly),
      deltaMonthly: roundToCents(currentMonthly - priorMonthly),
    });
  }

  if (categories.length === 0 || basketPrior <= 0) return insufficient;

  categories.sort(
    (a, b) =>
      Math.abs(b.deltaMonthly) - Math.abs(a.deltaMonthly) ||
      a.category.localeCompare(b.category)
  );

  return {
    status: "ok",
    rate: percentChange(basketPrior, basketCurrent),
    headlineRate,
    currentMonthly: roundToCents(basketCurrent),
    priorMonthly: roundToCents(basketPrior),
    currentMonths: current.monthsTracked,
    priorMonths: prior.monthsTracked,
    categories,
    newSpendingMonthly: roundToCents(newSpending),
  };
};

export type HeadlineComparison = "above" | "below" | "inline";

/** How the personal rate sits against the headline, with a small dead band. */
export const compareToHeadline = (
  rate: number,
  headlineRate: number,
  band: number = INFLATION_INLINE_BAND
): HeadlineComparison => {
  const diff = rate - headlineRate;
  if (Math.abs(diff) <= band) return "inline";
  return diff > 0 ? "above" : "below";
};

/** "+5.2%" / "-1.0%" / "0.0%" - signed, one decimal. */
export const formatRate = (rate: number): string => {
  if (!Number.isFinite(rate)) return "n/a";
  const fixed = Math.abs(rate).toFixed(1);
  if (rate > 0) return `+${fixed}%`;
  if (rate < 0) return `-${fixed}%`;
  return `${fixed}%`;
};

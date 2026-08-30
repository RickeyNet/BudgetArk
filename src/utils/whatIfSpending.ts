/**
 * BudgetArk - "What If I Stopped Spending on X" projections
 * File: src/utils/whatIfSpending.ts
 *
 * Pure math behind the Charts-tab what-if tool: per-category average
 * monthly spend derived from budget history, the debt-payoff impact of
 * redirecting that money as an extra monthly payment, and the growth if
 * it were saved/invested instead. Kept side-effect free so the projection
 * logic is unit-testable on Node; the screen stays a thin shell that
 * feeds a category + amount in and renders the numbers out.
 */

import type { BudgetEntry } from "../types";
import { getMonthKey } from "./budgetMonths";
import {
  calcInvestmentGrowth,
  simulatePayoffPlan,
} from "./calculations";
import type {
  PayoffDebtInput,
  PayoffMethod,
  PayoffSimulationResult,
} from "./calculations";
import { entriesForMonth } from "./billFulfillment";

/* ── Category spend averages (from budget history) ── */

/** How many past full months feed the per-category average. */
export const WHAT_IF_LOOKBACK_MONTHS = 6;

export type CategorySpendOption = {
  category: string;
  /** Average spend per tracked month over the lookback window, rounded. */
  monthlyAverage: number;
  /** How many of the lookback months had any budget activity. */
  monthsTracked: number;
};

/**
 * Per-category average monthly spend over the last
 * `WHAT_IF_LOOKBACK_MONTHS` full months (the current month is excluded as
 * incomplete). The denominator counts months with *any* entry - same
 * "was the user tracking?" rule as calcAvgMonthlyExpenses - so a tracked
 * zero-spend month correctly pulls the average down. "Debt Payments" is
 * excluded: that money already goes to debt, so "redirecting" it is
 * circular. Sorted biggest average first. `now` is injectable for tests.
 */
export const buildCategorySpendOptions = (
  entries: readonly BudgetEntry[],
  now: Date = new Date()
): CategorySpendOption[] => {
  const monthKeys: string[] = [];
  for (let i = 1; i <= WHAT_IF_LOOKBACK_MONTHS; i++) {
    monthKeys.push(
      getMonthKey(new Date(now.getFullYear(), now.getMonth() - i, 1))
    );
  }

  const monthsTracked = new Set<string>();
  const totals: Record<string, number> = {};

  for (const monthKey of monthKeys) {
    for (const entry of entriesForMonth(entries, monthKey)) {
      monthsTracked.add(monthKey);
      if (entry.type !== "expense" || entry.category === "Debt Payments") {
        continue;
      }
      totals[entry.category] = (totals[entry.category] ?? 0) + entry.amount;
    }
  }

  if (monthsTracked.size === 0) return [];

  return Object.entries(totals)
    .map(([category, total]) => ({
      category,
      monthlyAverage: Math.round(total / monthsTracked.size),
      monthsTracked: monthsTracked.size,
    }))
    .filter((option) => option.monthlyAverage > 0)
    .sort(
      (a, b) =>
        b.monthlyAverage - a.monthlyAverage ||
        a.category.localeCompare(b.category)
    );
};

/* ── Debt redirect impact ── */

export type DebtRedirectImpact = {
  baseline: PayoffSimulationResult;
  redirect: PayoffSimulationResult;
  /**
   * Whole months shaved off the payoff timeline. 0 when both plans are
   * unsolvable; Infinity when the extra payment turns an unsolvable plan
   * into a solvable one (the screen renders that case specially).
   */
  monthsSaved: number;
  /**
   * Lifetime interest avoided. Only meaningful when the BASELINE plan is
   * solvable - an unsolvable baseline's interest total is truncated at the
   * simulation cap, so the delta is reported as 0 and the screen leans on
   * `monthsSaved === Infinity` instead.
   */
  interestSaved: number;
};

/**
 * Compares the debt payoff timeline with and without `monthlyAmount`
 * applied as an extra monthly payment under the given method.
 */
export const calcDebtRedirectImpact = (
  debts: PayoffDebtInput[],
  method: PayoffMethod,
  monthlyAmount: number
): DebtRedirectImpact => {
  const baseline = simulatePayoffPlan(debts, method, 0);
  const redirect = simulatePayoffPlan(debts, method, monthlyAmount);

  let monthsSaved = 0;
  if (baseline.isPayoffPossible && redirect.isPayoffPossible) {
    monthsSaved = Math.max(0, baseline.monthsToPayoff - redirect.monthsToPayoff);
  } else if (!baseline.isPayoffPossible && redirect.isPayoffPossible) {
    monthsSaved = Infinity;
  }

  const interestSaved = baseline.isPayoffPossible
    ? Math.max(0, baseline.totalInterestPaid - redirect.totalInterestPaid)
    : 0;

  return { baseline, redirect, monthsSaved, interestSaved };
};

/* ── Savings redirect growth ── */

/** Default assumed annual return for the savings-side projection (%). */
export const WHAT_IF_DEFAULT_RETURN_RATE = 7;

/** Year horizons shown for the savings-side projection. */
export const WHAT_IF_SAVINGS_YEARS = [1, 5, 10] as const;

export type SavingsGrowthMark = {
  years: number;
  /** Projected value of the redirected money after `years`. */
  futureValue: number;
  /** Plain sum of the monthly contributions over `years`. */
  contributed: number;
  /** futureValue - contributed (compounding's share). */
  growth: number;
};

/**
 * Projected value of redirecting `monthlyAmount` into savings/investments
 * at each horizon, compounding monthly at `annualReturnRate`.
 */
export const buildSavingsGrowthMarks = (
  monthlyAmount: number,
  annualReturnRate: number = WHAT_IF_DEFAULT_RETURN_RATE,
  yearsMarks: readonly number[] = WHAT_IF_SAVINGS_YEARS
): SavingsGrowthMark[] =>
  yearsMarks.map((years) => {
    const futureValue = Math.round(
      calcInvestmentGrowth(monthlyAmount, annualReturnRate, years)
    );
    const contributed = Math.round(monthlyAmount * 12 * years);
    return {
      years,
      futureValue,
      contributed,
      growth: Math.max(0, futureValue - contributed),
    };
  });

/* ── Display helpers ── */

/**
 * "1 yr 3 mo" style formatting for a payoff duration. Mirrors the Debt
 * Tracker's formatPayoffMonths so the two surfaces read the same.
 */
export const formatWhatIfMonths = (months: number): string => {
  if (!Number.isFinite(months)) return "Not solvable";
  if (months <= 0) return "0 months";
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (years <= 0) return `${remainingMonths} mo`;
  if (remainingMonths <= 0) return `${years} yr`;
  return `${years} yr ${remainingMonths} mo`;
};

/**
 * Slider ceiling for the redirect amount: at least double the category's
 * average (rounded up to a clean $25 step) so the user can model cutting
 * more than the average, with a floor that keeps tiny categories usable.
 */
export const calcRedirectSliderMax = (monthlyAverage: number): number =>
  Math.max(100, Math.ceil((monthlyAverage * 2) / 25) * 25);

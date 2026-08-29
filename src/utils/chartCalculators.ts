/**
 * BudgetArk - Charts Screen Calculators
 * File: src/utils/chartCalculators.ts
 *
 * Pure math behind the Charts-tab financial tools: loan amortization
 * summaries + CSV export shaping, the refinance break-even comparison,
 * emergency-fund targets, the Rule of 72, and the budget-derived average
 * monthly expenses. Extracted from ChartsScreen.tsx so the projection
 * logic is unit-testable on Node; the screen stays a thin shell that
 * feeds slider state in and renders the numbers out.
 *
 * Every function here must stay value-identical to what the screen used
 * to compute inline - rounding quirks included - because these numbers
 * are shown directly to users.
 */

import type { BudgetEntry } from "../types";
import { getMonthKey } from "./budgetMonths";
import {
  calcMonthsUntilDate,
  calcPaymentForGoalDate,
  generatePayoffSchedule,
} from "./calculations";
import { entriesForMonth } from "./billFulfillment";

/* ── Loan schedule CSV export ── */

export type LoanScheduleRow = {
  month: number;
  balance: number;
  interestPaid: number;
  principalPaid: number;
};

const csvEscape = (value: string | number): string => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const buildLoanScheduleCsv = (
  schedule: readonly LoanScheduleRow[]
): string => {
  const lines = [
    ["Year", "Month", "Payment", "Principal", "Interest", "RemainingBalance"].join(","),
    ...schedule.map((row) =>
      [
        Math.ceil(row.month / 12),
        row.month,
        (row.principalPaid + row.interestPaid).toFixed(2),
        row.principalPaid.toFixed(2),
        row.interestPaid.toFixed(2),
        row.balance.toFixed(2),
      ]
        .map(csvEscape)
        .join(",")
    ),
  ];

  return lines.join("\n");
};

export const buildLoanScheduleFilename = (now: Date = new Date()): string => {
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  return `budgetark-amortization-${stamp}.csv`;
};

/* ── Loan schedule summaries ── */

export type LoanYearlySummaryRow = {
  year: number;
  payment: number;
  principal: number;
  interest: number;
  endingBalance: number;
};

/** Groups an amortization schedule into 12-payment "years" from the loan
 * start; the final year may be a shorter chunk. */
export const buildLoanYearlySummary = (
  schedule: readonly LoanScheduleRow[]
): LoanYearlySummaryRow[] =>
  Array.from({ length: Math.ceil(schedule.length / 12) }, (_, index) => {
    const start = index * 12;
    const chunk = schedule.slice(start, start + 12);
    const payment = chunk.reduce(
      (sum, row) => sum + row.principalPaid + row.interestPaid,
      0
    );
    const principal = chunk.reduce((sum, row) => sum + row.principalPaid, 0);
    const interest = chunk.reduce((sum, row) => sum + row.interestPaid, 0);
    return {
      year: index + 1,
      payment,
      principal,
      interest,
      endingBalance: chunk[chunk.length - 1]?.balance ?? 0,
    };
  });

export type LoanCostSummary = {
  totalPaid: number;
  totalInterest: number;
  /** How many of the first 60 months the loan actually runs. */
  firstFiveYearsMonths: number;
  interestFirstFiveYears: number;
  principalFirstFiveYears: number;
  /** Share of lifetime interest paid in the first 60 months (0 when there
   * is no interest at all). */
  interestFirstFiveYearsShare: number;
};

export const summarizeLoanCosts = (
  schedule: readonly LoanScheduleRow[]
): LoanCostSummary => {
  const totalPaid = schedule.reduce(
    (sum, row) => sum + row.principalPaid + row.interestPaid,
    0
  );
  const totalInterest = schedule.reduce((sum, row) => sum + row.interestPaid, 0);
  const firstFiveYearsMonths = Math.min(60, schedule.length);
  const firstFiveYears = schedule.slice(0, firstFiveYearsMonths);
  const interestFirstFiveYears = firstFiveYears.reduce(
    (sum, row) => sum + row.interestPaid,
    0
  );
  const principalFirstFiveYears = firstFiveYears.reduce(
    (sum, row) => sum + row.principalPaid,
    0
  );
  return {
    totalPaid,
    totalInterest,
    firstFiveYearsMonths,
    interestFirstFiveYears,
    principalFirstFiveYears,
    interestFirstFiveYearsShare:
      totalInterest > 0 ? interestFirstFiveYears / totalInterest : 0,
  };
};

/* ── Compound interest insights ── */

/** Rule of 72: rough years for money to double at the given annual return.
 * Returns 0 for a zero/negative rate (the screen hides the insight then). */
export const calcRuleOf72Years = (annualReturnRate: number): number =>
  annualReturnRate > 0 ? Math.round(72 / annualReturnRate) : 0;

/* ── Refinance break-even ── */

/** Combined balance of the selected debts, ignoring negative balances. */
export const sumRefinanceBalance = (
  debts: readonly { balance: number }[]
): number => debts.reduce((s, d) => s + Math.max(0, d.balance), 0);

/** Balance-weighted APR across the selected debts; 0 when nothing is
 * selected (or every balance is <= 0). */
export const calcBalanceWeightedRate = (
  debts: readonly { balance: number; rate: number }[],
  totalBalance: number
): number => {
  if (totalBalance <= 0) return 0;
  const weighted = debts.reduce(
    (s, d) => s + Math.max(0, d.balance) * d.rate,
    0
  );
  return weighted / totalBalance;
};

/**
 * Years-remaining auto-fill for the refi calculator: balance-weighted months
 * until each debt's goal date, converted to whole years and clamped to the
 * slider's 1-30 range. Returns null when the auto-fill shouldn't fire (no
 * selection, zero combined balance, or any selected debt missing a goal
 * date) so the caller leaves the user's manual value alone.
 *
 * `monthsUntilDate` is injectable for tests; production uses the shared
 * calcMonthsUntilDate (which reads the current date).
 */
export const calcAutoFillYearsRemaining = (
  debts: readonly { balance: number; goalDate?: string }[],
  totalBalance: number,
  monthsUntilDate: (goalDateISO: string) => number = calcMonthsUntilDate
): number | null => {
  if (debts.length === 0 || totalBalance <= 0) return null;
  if (!debts.every((d) => Boolean(d.goalDate))) return null;
  const weightedMonths =
    debts.reduce(
      (s, d) => s + Math.max(0, d.balance) * monthsUntilDate(d.goalDate as string),
      0
    ) / totalBalance;
  return Math.max(1, Math.min(30, Math.round(weightedMonths / 12)));
};

export type RefiComparisonInput = {
  /** Combined current balance of the selected debts. */
  balance: number;
  /** Balance-weighted current APR (%). */
  currentRate: number;
  currentTermYears: number;
  /** New loan APR (%). */
  newRate: number;
  newTermYears: number;
  closingCosts: number;
};

export type RefiComparison = {
  currentMonthlyPayment: number;
  newMonthlyPayment: number;
  currentTotalInterest: number;
  newTotalInterest: number;
  /** Positive = the new loan's payment is lower. */
  monthlyDelta: number;
  /** Positive = the new loan pays less lifetime interest. */
  interestDelta: number;
  /** Months to recover closing costs, or null when there is no monthly
   * saving (or no selection) - i.e. no break-even exists. */
  breakEvenMonths: number | null;
  /** Monthly savings across the full new term minus closing costs. */
  netSavingsOverNewTerm: number;
  /** True when the new term is longer than what's left on the current loan. */
  extendsTerm: boolean;
};

export const calcRefiComparison = (
  input: RefiComparisonInput
): RefiComparison => {
  const currentMonths = input.currentTermYears * 12;
  const newMonths = input.newTermYears * 12;
  // Matches the screen's hasRefiSelection gate: a positive combined balance
  // implies at least one selected debt.
  const hasSelection = input.balance > 0;

  const currentMonthlyPayment = hasSelection
    ? calcPaymentForGoalDate(input.balance, input.currentRate, currentMonths)
    : 0;
  const newMonthlyPayment = hasSelection
    ? calcPaymentForGoalDate(input.balance, input.newRate, newMonths)
    : 0;

  const totalInterestFor = (rate: number, monthlyPayment: number): number => {
    if (!hasSelection || !isFinite(monthlyPayment)) return 0;
    return generatePayoffSchedule(input.balance, rate, monthlyPayment).reduce(
      (sum, row) => sum + row.interestPaid,
      0
    );
  };

  const currentTotalInterest = totalInterestFor(
    input.currentRate,
    currentMonthlyPayment
  );
  const newTotalInterest = totalInterestFor(input.newRate, newMonthlyPayment);

  const monthlyDelta = currentMonthlyPayment - newMonthlyPayment;
  const interestDelta = currentTotalInterest - newTotalInterest;
  const breakEvenMonths =
    hasSelection && monthlyDelta > 0 ? input.closingCosts / monthlyDelta : null;
  const netSavingsOverNewTerm = monthlyDelta * newMonths - input.closingCosts;
  const extendsTerm = newMonths > currentMonths;

  return {
    currentMonthlyPayment,
    newMonthlyPayment,
    currentTotalInterest,
    newTotalInterest,
    monthlyDelta,
    interestDelta,
    breakEvenMonths,
    netSavingsOverNewTerm,
    extendsTerm,
  };
};

/* ── Emergency fund ── */

/** The typed override wins when present ("0" and unparsable text both
 * resolve to 0); otherwise the budget-derived average is used. */
export const resolveEmergencyFundExpenses = (
  overrideText: string,
  avgExpenses: number
): number => (overrideText ? parseFloat(overrideText) || 0 : avgExpenses);

export type EmergencyFundPlan = {
  threeMonthTarget: number;
  sixMonthTarget: number;
  /** 0..1 progress toward each target (0 when the target is 0). */
  threeMonthProgress: number;
  sixMonthProgress: number;
  threeMonthRemaining: number;
  sixMonthRemaining: number;
  /** Whole months of saving needed to reach each target; 0 when already
   * reached or when monthly savings is 0. */
  monthsToThree: number;
  monthsToSix: number;
};

export const calcEmergencyFundPlan = (
  monthlyExpenses: number,
  currentAmount: number,
  monthlySavings: number
): EmergencyFundPlan => {
  const threeMonthTarget = monthlyExpenses * 3;
  const sixMonthTarget = monthlyExpenses * 6;
  const threeMonthProgress =
    threeMonthTarget > 0 ? Math.min(1, currentAmount / threeMonthTarget) : 0;
  const sixMonthProgress =
    sixMonthTarget > 0 ? Math.min(1, currentAmount / sixMonthTarget) : 0;
  const threeMonthRemaining = Math.max(0, threeMonthTarget - currentAmount);
  const sixMonthRemaining = Math.max(0, sixMonthTarget - currentAmount);
  const monthsToThree =
    monthlySavings > 0 && threeMonthRemaining > 0
      ? Math.ceil(threeMonthRemaining / monthlySavings)
      : 0;
  const monthsToSix =
    monthlySavings > 0 && sixMonthRemaining > 0
      ? Math.ceil(sixMonthRemaining / monthlySavings)
      : 0;
  return {
    threeMonthTarget,
    sixMonthTarget,
    threeMonthProgress,
    sixMonthProgress,
    threeMonthRemaining,
    sixMonthRemaining,
    monthsToThree,
    monthsToSix,
  };
};

/* ── Average monthly expenses (from budget history) ── */

/** Average expenses across the last 6 tracked months. `now` is injectable
 * for tests; production uses the current date. */
export const calcAvgMonthlyExpenses = (
  entries: BudgetEntry[],
  now: Date = new Date()
): number => {
  const monthTotals: Record<string, number> = {};
  const monthsTracked = new Set<string>();

  // Look at the last 6 months (excluding current since it may be incomplete)
  for (let i = 1; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthTotals[getMonthKey(d)] = 0;
  }

  // A month with *any* entry (expense or income, recurring or not) is a
  // month the user was actively tracking. We previously only counted
  // months with expense > 0, which biased the average upward - a month
  // where the user paid $0 in expenses but logged income still says "I
  // was tracking, my expenses really were zero," and dropping it from
  // the denominator made historical EF targets larger than necessary.
  for (const mk of Object.keys(monthTotals)) {
    for (const entry of entriesForMonth(entries, mk)) {
      monthsTracked.add(mk);
      if (entry.type === "expense") monthTotals[mk] += entry.amount;
    }
  }

  if (monthsTracked.size === 0) return 0;
  const sum = Array.from(monthsTracked).reduce(
    (acc, mk) => acc + (monthTotals[mk] ?? 0),
    0
  );
  return Math.round(sum / monthsTracked.size);
};

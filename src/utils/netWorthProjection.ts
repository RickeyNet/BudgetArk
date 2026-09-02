/**
 * BudgetArk - Net Worth Projection & Goal
 * File: src/utils/netWorthProjection.ts
 *
 * Pure math behind the Bridge's "Where this is heading" card: the net-worth
 * line carried forward from today. Two engines, both already trusted
 * elsewhere in the app: the monthly cash surplus from budget history
 * (income minus real spending minus debt minimums, over the last six
 * tracked complete months - the what-if tool's convention) grows the
 * asset side, and a minimums-only payoff schedule (the same month loop as
 * simulatePayoffPlan, kept here because the chart needs every month's
 * balance, not just the end date) shrinks the debt side. Savings-reserve
 * and debt-payment entries are transfers between the two sides, so they
 * are left out of "spending" rather than counted twice.
 *
 * The goal - a target net worth by the end of a month - is a device-local
 * record (storage/netWorthGoalStorage); the projection says whether the
 * current pace reaches it, and what monthly surplus would.
 */

import type { BudgetEntry, Debt } from "../types";
import { getMonthKey, getMonthKeyOffset } from "./budgetMonths";
import { entriesForMonth } from "./billFulfillment";
import { roundToCents } from "./money";
import { addMonthsClamped } from "./debtFreeCountdown";

/** Complete months of budget history that feed the surplus average. */
export const SURPLUS_LOOKBACK_MONTHS = 6;

/** Longest projection the chart will draw, in months. */
export const PROJECTION_MAX_MONTHS = 120;

/** Horizon when no goal is set. */
export const PROJECTION_DEFAULT_MONTHS = 24;

/** Upper bound on a stored target - anything larger is treated as corrupt. */
export const MAX_GOAL_AMOUNT = 1_000_000_000;

/** Transfers between the asset and debt sides - not spending. */
const TRANSFER_CATEGORIES: ReadonlySet<string> = new Set([
  "Savings",
  "Retirement",
  "Investing",
  "Debt Payments",
]);

export type NetWorthGoal = {
  /** Target net worth (may be negative for a "get above -$X" goal). */
  targetAmount: number;
  /** "YYYY-MM" - the goal is measured at the end of this month. */
  targetMonth: string;
  createdAt: string;
};

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Fail-closed parse of the stored goal. */
export const parseNetWorthGoal = (raw: string | null): NetWorthGoal | null => {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
  const record = parsed as Record<string, unknown>;
  if (
    typeof record.targetAmount !== "number" ||
    !Number.isFinite(record.targetAmount) ||
    Math.abs(record.targetAmount) > MAX_GOAL_AMOUNT
  ) {
    return null;
  }
  if (typeof record.targetMonth !== "string" || !MONTH_RE.test(record.targetMonth)) return null;
  if (typeof record.createdAt !== "string" || Number.isNaN(Date.parse(record.createdAt))) {
    return null;
  }
  return {
    targetAmount: record.targetAmount,
    targetMonth: record.targetMonth,
    createdAt: record.createdAt,
  };
};

export type SurplusEstimate = {
  /** Average monthly cash left after spending and debt minimums. */
  monthly: number;
  monthsTracked: number;
};

/**
 * Average monthly surplus over the last SURPLUS_LOOKBACK_MONTHS complete
 * tracked months: income minus non-transfer expenses, minus the current
 * debt minimums (the schedule below pays those, so they leave the cash
 * side here). A month with any entry counts as tracked.
 */
export const estimateMonthlySurplus = (
  entries: readonly BudgetEntry[],
  debts: readonly Debt[],
  now: Date = new Date()
): SurplusEstimate => {
  let monthsTracked = 0;
  let net = 0;
  for (let i = 1; i <= SURPLUS_LOOKBACK_MONTHS; i++) {
    const monthKey = getMonthKey(new Date(now.getFullYear(), now.getMonth() - i, 1));
    const monthEntries = entriesForMonth(entries, monthKey);
    if (monthEntries.length === 0) continue;
    monthsTracked += 1;
    for (const entry of monthEntries) {
      if (!Number.isFinite(entry.amount)) continue;
      if (entry.type === "income") net += entry.amount;
      else if (entry.type === "expense" && !TRANSFER_CATEGORIES.has(entry.category)) {
        net -= entry.amount;
      }
    }
  }
  if (monthsTracked === 0) return { monthly: 0, monthsTracked: 0 };
  const minimums = debts
    .filter((d) => d.balance > 0)
    .reduce((sum, d) => sum + Math.max(0, d.minPayment), 0);
  return {
    monthly: roundToCents(net / monthsTracked - minimums),
    monthsTracked,
  };
};

/**
 * Total debt balance at the end of each of the next `months` months when
 * every debt receives exactly its minimum (index 0 = today). A minimum
 * that doesn't cover the interest lets that balance grow - the honest
 * answer, and the same thing simulatePayoffPlan reports as unsolvable.
 */
export const projectDebtBalances = (debts: readonly Debt[], months: number): number[] => {
  const live = debts
    .filter((d) => d.balance > 0)
    .map((d) => ({
      balance: d.balance,
      monthlyRate: Math.max(0, d.rate) / 100 / 12,
      minPayment: Math.max(0, d.minPayment),
    }));
  const out: number[] = [roundToCents(live.reduce((sum, d) => sum + d.balance, 0))];
  for (let m = 1; m <= months; m++) {
    let total = 0;
    for (const debt of live) {
      if (debt.balance <= 0) continue;
      debt.balance = Math.max(0, debt.balance + debt.balance * debt.monthlyRate - debt.minPayment);
      total += debt.balance;
    }
    out.push(roundToCents(total));
  }
  return out;
};

export type ProjectionPoint = {
  monthOffset: number;
  assets: number;
  debt: number;
  netWorth: number;
};

/** The forward line: assets grow by the surplus, debts follow the minimums schedule. */
export const projectNetWorth = (input: {
  currentAssets: number;
  debts: readonly Debt[];
  monthlySurplus: number;
  months: number;
}): ProjectionPoint[] => {
  const months = Math.max(0, Math.min(PROJECTION_MAX_MONTHS, Math.floor(input.months)));
  const debtLine = projectDebtBalances(input.debts, months);
  const points: ProjectionPoint[] = [];
  for (let m = 0; m <= months; m++) {
    const assets = roundToCents(input.currentAssets + input.monthlySurplus * m);
    const debt = debtLine[m];
    points.push({ monthOffset: m, assets, debt, netWorth: roundToCents(assets - debt) });
  }
  return points;
};

/** Whole months from the current month to the goal month (>= 1; the goal month itself counts). */
export const monthsUntilGoal = (targetMonth: string, now: Date = new Date()): number => {
  const [ty, tm] = targetMonth.split("-").map(Number);
  const diff = (ty - now.getFullYear()) * 12 + (tm - 1 - now.getMonth());
  return Math.max(1, diff);
};

export type GoalAssessment = {
  targetAmount: number;
  targetMonth: string;
  monthsUntil: number;
  /** Net worth the projection lands on in the goal month. */
  projectedAtTarget: number;
  onTrack: boolean;
  /** projectedAtTarget - targetAmount (negative = short). */
  gap: number;
  /** Monthly surplus that would land exactly on the target in time. */
  requiredMonthly: number;
  /** First projected month at or above the target within the cap; null if never. */
  reachMonths: number | null;
  reachDate: Date | null;
};

export type NetWorthOutlook = {
  surplus: SurplusEstimate;
  points: ProjectionPoint[];
  horizonMonths: number;
  goal: GoalAssessment | null;
};

/**
 * Everything the card draws. With a goal the horizon runs to the goal
 * month (capped); without one it is PROJECTION_DEFAULT_MONTHS.
 */
export const buildNetWorthOutlook = (input: {
  entries: readonly BudgetEntry[];
  debts: readonly Debt[];
  currentAssets: number;
  goal: NetWorthGoal | null;
  now?: Date;
}): NetWorthOutlook => {
  const now = input.now ?? new Date();
  const surplus = estimateMonthlySurplus(input.entries, input.debts, now);
  const monthsUntil = input.goal ? monthsUntilGoal(input.goal.targetMonth, now) : null;
  const horizonMonths = Math.min(
    PROJECTION_MAX_MONTHS,
    Math.max(monthsUntil ?? PROJECTION_DEFAULT_MONTHS, 1)
  );

  // Simulate to the cap once so "when would I get there?" can look past the horizon.
  const full = projectNetWorth({
    currentAssets: input.currentAssets,
    debts: input.debts,
    monthlySurplus: surplus.monthly,
    months: PROJECTION_MAX_MONTHS,
  });
  const points = full.slice(0, horizonMonths + 1);

  let goal: GoalAssessment | null = null;
  if (input.goal && monthsUntil !== null) {
    const target = input.goal.targetAmount;
    const atIndex = Math.min(monthsUntil, PROJECTION_MAX_MONTHS);
    const projectedAtTarget = full[atIndex].netWorth;
    const debtThen = full[atIndex].debt;
    const requiredMonthly = roundToCents(
      (target - (input.currentAssets - debtThen)) / monthsUntil
    );
    const reachIndex = full.findIndex((p) => p.netWorth >= target);
    goal = {
      targetAmount: target,
      targetMonth: input.goal.targetMonth,
      monthsUntil,
      projectedAtTarget,
      onTrack: projectedAtTarget >= target,
      gap: roundToCents(projectedAtTarget - target),
      requiredMonthly,
      reachMonths: reachIndex >= 0 ? reachIndex : null,
      reachDate: reachIndex >= 0 ? addMonthsClamped(now, reachIndex) : null,
    };
  }

  return { surplus, points, horizonMonths, goal };
};

/** Default target month for a new goal: three years out. */
export const suggestGoalMonth = (now: Date = new Date()): string => getMonthKeyOffset(36, now);

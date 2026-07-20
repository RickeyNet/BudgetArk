/**
 * BudgetArk - Debt-Free Countdown
 * File: src/utils/debtFreeCountdown.ts
 *
 * Pure math behind the Debt-Free Countdown card on the Debt Tracker: how
 * fast the user is actually paying (payment velocity from their real
 * payment history), the projected debt-free date at that pace (reusing
 * simulatePayoffPlan), and the calendar-aware years/months/days breakdown
 * the countdown renders. `now` is injected everywhere so the module stays
 * deterministic under test and render-pure in components.
 *
 * Velocity convention mirrors calcAvgMonthlyExpenses: average over the last
 * 6 COMPLETE calendar months, with the denominator starting at the user's
 * first payment month so pre-history months can't dilute the pace. The
 * current (partial) month joins the sample only once it has payments -
 * that's what makes the countdown move the moment a payment is logged,
 * without an empty young month dragging the average toward zero.
 */

import {
  simulatePayoffPlan,
  type PayoffDebtInput,
  type PayoffMethod,
} from "./calculations";
import { roundToCents } from "./money";

/** The slice of Payment this module reads - keeps tests dependency-light. */
export interface PaymentLike {
  amount: number;
  /** ISO timestamp of when the payment was recorded. */
  date: string;
  deletedAt?: string;
}

export type VelocityBasis = "history" | "current-month" | "minimums";

export interface PaymentVelocity {
  /** Average dollars paid per month at the user's demonstrated pace. */
  monthlyAverage: number;
  /** Months in the average (complete + a payment-bearing current month). */
  monthsSampled: number;
  basis: VelocityBasis;
}

export type CountdownStatus =
  | "no-debts"
  | "debt-free"
  | "counting"
  | "not-solvable";

export interface DebtFreeProjection {
  status: CountdownStatus;
  /** The pace the projection actually simulated (velocity, min-floored). */
  paceMonthly: number;
  velocity: PaymentVelocity;
  /**
   * True when real payment history averages below the combined minimums.
   * The simulator can't model paying less than minimums (which debt gets
   * shorted?), so the projection assumes minimums are met - surface the
   * gap instead of silently showing an optimistic date.
   */
  velocityBelowMinimums: boolean;
  /** Months until debt-free; Infinity when the plan is not solvable. */
  monthsToPayoff: number;
  /** Local start-of-day date the countdown targets; null unless counting. */
  projectedDate: Date | null;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const VELOCITY_WINDOW_MONTHS = 6;

const monthKeyOf = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const startOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

/**
 * Add whole months to a date, clamping the day-of-month into the target
 * month (Jan 31 + 1 month -> Feb 28/29), matching how the rest of the app
 * treats month arithmetic (billCalendar / spreadsheetExport clamping).
 */
export const addMonthsClamped = (date: Date, months: number): Date => {
  const targetMonthFirst = new Date(
    date.getFullYear(),
    date.getMonth() + months,
    1
  );
  const lastDay = new Date(
    targetMonthFirst.getFullYear(),
    targetMonthFirst.getMonth() + 1,
    0
  ).getDate();
  return new Date(
    targetMonthFirst.getFullYear(),
    targetMonthFirst.getMonth(),
    Math.min(date.getDate(), lastDay)
  );
};

/**
 * Calendar-aware breakdown of the span from `from` to `to` as full years +
 * months + leftover days (the countdown's three boxes). Walks whole months
 * first (with day clamping) and counts the remainder in days, so "Mar 15 ->
 * May 14" is 1 month 29 days, never a fuzzy 30-day-month approximation.
 * A `to` at or before `from` returns all zeros.
 */
export const diffCalendarYMD = (
  from: Date,
  to: Date
): { years: number; months: number; days: number } => {
  const start = startOfDay(from);
  const end = startOfDay(to);
  if (end.getTime() <= start.getTime()) return { years: 0, months: 0, days: 0 };

  let totalMonths =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());
  if (addMonthsClamped(start, totalMonths).getTime() > end.getTime()) {
    totalMonths -= 1;
  }
  const anchor = addMonthsClamped(start, totalMonths);
  const days = Math.round((end.getTime() - anchor.getTime()) / MS_PER_DAY);
  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
    days,
  };
};

/**
 * The user's demonstrated payment pace, or null with no usable history.
 * See the module doc for the sampling rules. Payment amounts use the face
 * `amount` (what the user said they paid - matches the history modal),
 * and tombstoned payments are skipped defensively even though getPayments
 * already filters them.
 */
export const calcPaymentVelocity = (
  payments: PaymentLike[],
  now: Date
): PaymentVelocity | null => {
  const live = payments.filter(
    (p) => !p.deletedAt && Number.isFinite(p.amount) && p.amount > 0
  );
  if (live.length === 0) return null;

  const currentKey = monthKeyOf(now);
  const windowKeys: string[] = [];
  for (let i = 1; i <= VELOCITY_WINDOW_MONTHS; i++) {
    windowKeys.push(
      monthKeyOf(new Date(now.getFullYear(), now.getMonth() - i, 1))
    );
  }

  // Zero-padded "YYYY-MM" keys compare correctly as strings.
  const totals = new Map<string, number>();
  let firstPaymentKey: string | null = null;
  for (const payment of live) {
    const paidAt = new Date(payment.date);
    if (Number.isNaN(paidAt.getTime())) continue;
    const key = monthKeyOf(paidAt);
    totals.set(key, (totals.get(key) ?? 0) + payment.amount);
    if (firstPaymentKey === null || key < firstPaymentKey) {
      firstPaymentKey = key;
    }
  }
  if (firstPaymentKey === null) return null;

  const sampledKeys = windowKeys.filter((key) => key >= (firstPaymentKey as string));
  const currentMonthTotal = totals.get(currentKey) ?? 0;

  let sum = sampledKeys.reduce((acc, key) => acc + (totals.get(key) ?? 0), 0);
  let count = sampledKeys.length;
  if (currentMonthTotal > 0) {
    sum += currentMonthTotal;
    count += 1;
  }
  if (count === 0) return null;

  return {
    monthlyAverage: roundToCents(sum / count),
    monthsSampled: count,
    basis: sampledKeys.length > 0 ? "history" : "current-month",
  };
};

/**
 * Project the debt-free date at the user's current pace. All debts count -
 * this is a DEBT-free date, mortgage included (unlike the Hull milestone
 * comparison, which deliberately excludes the house). A "custom" sort
 * preference projects as avalanche: extra dollars must target something,
 * and avalanche is the cheapest defensible assumption.
 */
export const projectDebtFree = (
  debts: PayoffDebtInput[],
  payments: PaymentLike[],
  method: PayoffMethod,
  now: Date
): DebtFreeProjection => {
  const activeDebts = debts.filter((d) => d.balance > 0);
  const sumMinimums = roundToCents(
    activeDebts.reduce((acc, d) => acc + Math.max(0, d.minPayment), 0)
  );

  const emptyVelocity: PaymentVelocity = {
    monthlyAverage: sumMinimums,
    monthsSampled: 0,
    basis: "minimums",
  };

  if (debts.length === 0) {
    return {
      status: "no-debts",
      paceMonthly: 0,
      velocity: emptyVelocity,
      velocityBelowMinimums: false,
      monthsToPayoff: 0,
      projectedDate: null,
    };
  }
  if (activeDebts.length === 0) {
    return {
      status: "debt-free",
      paceMonthly: 0,
      velocity: emptyVelocity,
      velocityBelowMinimums: false,
      monthsToPayoff: 0,
      projectedDate: null,
    };
  }

  const velocity = calcPaymentVelocity(payments, now) ?? emptyVelocity;
  const extra = Math.max(0, velocity.monthlyAverage - sumMinimums);
  const paceMonthly = Math.max(velocity.monthlyAverage, sumMinimums);
  const velocityBelowMinimums =
    velocity.basis !== "minimums" && velocity.monthlyAverage < sumMinimums;

  const result = simulatePayoffPlan(activeDebts, method, extra);
  if (!result.isPayoffPossible) {
    return {
      status: "not-solvable",
      paceMonthly,
      velocity,
      velocityBelowMinimums,
      monthsToPayoff: Infinity,
      projectedDate: null,
    };
  }

  return {
    status: "counting",
    paceMonthly,
    velocity,
    velocityBelowMinimums,
    monthsToPayoff: result.monthsToPayoff,
    projectedDate: addMonthsClamped(startOfDay(now), result.monthsToPayoff),
  };
};

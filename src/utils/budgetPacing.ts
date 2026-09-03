/**
 * BudgetArk - Budget Pacing
 * File: src/utils/budgetPacing.ts
 *
 * A category limit compared as raw spent/limit says nothing about timing:
 * 60% spent looks fine on the 28th and alarming on the 8th, and the bars
 * coloured the same either way. This module is the day-weighted view - how
 * much of a limit "should" be used by today, whether the month is on pace
 * to finish under it, and which categories deserve a passive nudge. Pure
 * and unit-tested; the Spending card and the pace banner only render it.
 *
 * Deliberately passive: no notifications (banks and bill portals do those,
 * and the app's notifications carry no amounts by rule), and no "ahead"
 * verdict in the first days of a month, when one grocery run projects to a
 * wild month-end number.
 */

import type { CategoryName } from "../types";

/** Where "today" sits in the month being viewed. Null = not the current month. */
export interface PacingClock {
  /** 1-based calendar day. */
  dayOfMonth: number;
  daysInMonth: number;
}

/**
 * `at-limit` = spent equals the limit to the cent: the budget is used up
 * but not exceeded, so it is never an alert (the banner used to announce
 * "over by $0"). It stays distinct from `on-track` so the row can say so.
 */
export type PaceStatus = "over" | "at-limit" | "ahead" | "on-track";

export interface CategoryPacing {
  status: PaceStatus;
  /** Fraction of the month elapsed, day-inclusive (day 15 of 30 = 0.5). */
  elapsedFraction: number;
  /** limit x elapsedFraction - what an even spread would have spent by today. */
  expectedSpent: number;
  /** expectedSpent / limit, 0-1; where the pace marker sits on the bar. */
  expectedRatio: number;
  /** spent / elapsedFraction - where the month lands at today's rate. */
  projectedSpent: number;
  /** spent - limit when over, else 0. */
  overBy: number;
}

/**
 * Projected overshoot tolerated before a category reads "ahead" - a bill
 * paid a day early shouldn't flip the colour.
 */
export const AHEAD_TOLERANCE = 0.05;

/**
 * Fraction of the month that must have elapsed before "ahead" can fire.
 * Below it only "over" is reported: on day 2 of 30 one purchase projects to
 * 15x itself, which is noise, not a trend.
 */
export const MIN_ELAPSED_FOR_AHEAD = 0.1;

const daysInMonthOf = (year: number, monthIndex: number): number =>
  new Date(year, monthIndex + 1, 0).getDate();

/**
 * The pacing clock for `monthKey` (YYYY-MM) as seen from `now`, or null when
 * that month isn't the device's current local month - past months are
 * settled and future months haven't started, so neither has a pace.
 */
export const pacingClockFor = (monthKey: string, now: Date): PacingClock | null => {
  const nowKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  if (monthKey !== nowKey) return null;
  return {
    dayOfMonth: now.getDate(),
    daysInMonth: daysInMonthOf(now.getFullYear(), now.getMonth()),
  };
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Day-weighted status for one category. Null when there is no limit or no
 * clock (nothing to pace against) or the inputs are not finite.
 */
export const computeCategoryPacing = (
  spent: number,
  limit: number | null | undefined,
  clock: PacingClock | null | undefined
): CategoryPacing | null => {
  if (!clock || !limit || !(limit > 0)) return null;
  if (!Number.isFinite(spent) || spent < 0) return null;
  const { dayOfMonth, daysInMonth } = clock;
  if (!(daysInMonth > 0) || !(dayOfMonth >= 1)) return null;

  const elapsedFraction = Math.min(1, dayOfMonth / daysInMonth);
  const expectedSpent = round2(limit * elapsedFraction);
  const expectedRatio = Math.min(1, elapsedFraction);
  const projectedSpent = round2(elapsedFraction > 0 ? spent / elapsedFraction : spent);

  let status: PaceStatus = "on-track";
  if (spent > limit + 0.005) {
    status = "over";
  } else if (spent >= limit - 0.005) {
    // Exactly on the limit (to the cent): used up, not exceeded.
    status = "at-limit";
  } else if (
    elapsedFraction >= MIN_ELAPSED_FOR_AHEAD &&
    spent > expectedSpent &&
    projectedSpent > limit * (1 + AHEAD_TOLERANCE)
  ) {
    status = "ahead";
  }

  return {
    status,
    elapsedFraction,
    expectedSpent,
    expectedRatio,
    projectedSpent,
    overBy: status === "over" ? round2(spent - limit) : 0,
  };
};

/** Minimal row shape the alert builder needs (matches ExpenseCategoryRow). */
export interface PaceAlertSource {
  category: CategoryName;
  spent: number;
  limit: number | null;
}

export interface PaceAlert {
  category: CategoryName;
  status: Exclude<PaceStatus, "on-track">;
  spent: number;
  limit: number;
  /** Whole-number percent of the limit spent, capped at 999 for display. */
  percentSpent: number;
  expectedSpent: number;
  projectedSpent: number;
  overBy: number;
}

/**
 * Categories that are over their limit or running ahead of pace, most
 * serious first: over-limit rows by how far over, then ahead-of-pace rows
 * by projected overshoot. Empty when everything is on pace, when the month
 * isn't current, or when no row has a limit - the banner renders nothing.
 */
export const buildPaceAlerts = (
  rows: readonly PaceAlertSource[],
  clock: PacingClock | null | undefined
): PaceAlert[] => {
  if (!clock) return [];
  const alerts: PaceAlert[] = [];
  for (const row of rows) {
    const pacing = computeCategoryPacing(row.spent, row.limit, clock);
    if (!pacing || pacing.status === "on-track" || pacing.status === "at-limit" || !row.limit) {
      continue;
    }
    alerts.push({
      category: row.category,
      status: pacing.status,
      spent: row.spent,
      limit: row.limit,
      percentSpent: Math.min(999, Math.round((row.spent / row.limit) * 100)),
      expectedSpent: pacing.expectedSpent,
      projectedSpent: pacing.projectedSpent,
      overBy: pacing.overBy,
    });
  }
  return alerts.sort((a, b) => {
    if (a.status !== b.status) return a.status === "over" ? -1 : 1;
    if (a.status === "over") return b.overBy - a.overBy;
    return b.projectedSpent - b.limit - (a.projectedSpent - a.limit);
  });
};

/** "1st", "2nd", "3rd", "12th", "22nd" - for "it's only the 12th". */
export const ordinalDay = (day: number): string => {
  const n = Math.max(1, Math.round(day));
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
};

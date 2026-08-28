/**
 * BudgetArk - Purchase Planner (sinking funds)
 * File: src/utils/purchasePlanner.ts
 *
 * Pure math behind the Charts-tab "Plan a Purchase" tool: monthly cash
 * flow derived from budget history, the save-up timeline for a purchase,
 * whether a monthly set-aside fits the user's free cash flow, and
 * Ark-milestone-aware guidance so a purchase plan never quietly derails
 * the bigger program (emergency fund, debt payoff). Side-effect free so
 * every projection is unit-testable on Node; the card component stays a
 * thin shell that feeds inputs in and renders the numbers out.
 */

import type { BudgetEntry, DebtMilestoneKey, DebtMilestonePlan } from "../types";
import { getMonthKey } from "./budgetMonths";
import { isEntryActiveInMonth } from "./recurrence";

/* ── Monthly cash flow (from budget history) ── */

/** How many past full months feed the income/expense averages. */
export const PURCHASE_LOOKBACK_MONTHS = 6;

export type MonthlyCashFlow = {
  /** Average monthly income over the tracked lookback months, rounded. */
  avgIncome: number;
  /** Average monthly expenses over the tracked lookback months, rounded. */
  avgExpenses: number;
  /** avgIncome - avgExpenses. Negative when spending exceeds income. */
  freeCashFlow: number;
  /** How many of the lookback months had any budget activity. */
  monthsTracked: number;
};

/**
 * Average monthly income and expenses over the last
 * `PURCHASE_LOOKBACK_MONTHS` full months (the current month is excluded as
 * incomplete). The denominator counts months with *any* entry - the same
 * "was the user tracking?" rule as calcAvgMonthlyExpenses - so a tracked
 * zero-spend month correctly pulls the averages down. `now` is injectable
 * for tests.
 */
export const calcMonthlyCashFlow = (
  entries: readonly BudgetEntry[],
  now: Date = new Date()
): MonthlyCashFlow => {
  const monthKeys: string[] = [];
  for (let i = 1; i <= PURCHASE_LOOKBACK_MONTHS; i++) {
    monthKeys.push(
      getMonthKey(new Date(now.getFullYear(), now.getMonth() - i, 1))
    );
  }

  const monthsTracked = new Set<string>();
  let incomeTotal = 0;
  let expenseTotal = 0;

  for (const entry of entries) {
    for (const monthKey of monthKeys) {
      if (!isEntryActiveInMonth(entry, monthKey)) continue;
      monthsTracked.add(monthKey);
      if (entry.type === "income") incomeTotal += entry.amount;
      else if (entry.type === "expense") expenseTotal += entry.amount;
    }
  }

  if (monthsTracked.size === 0) {
    return { avgIncome: 0, avgExpenses: 0, freeCashFlow: 0, monthsTracked: 0 };
  }

  const avgIncome = Math.round(incomeTotal / monthsTracked.size);
  const avgExpenses = Math.round(expenseTotal / monthsTracked.size);
  return {
    avgIncome,
    avgExpenses,
    freeCashFlow: avgIncome - avgExpenses,
    monthsTracked: monthsTracked.size,
  };
};

/* ── Save-up timeline ── */

export type PurchaseTimeline = {
  /**
   * Whole months of saving until the purchase is covered. 0 when the
   * amount already saved covers the price; Infinity when nothing is being
   * set aside and something is still owed.
   */
  monthsToReady: number;
  /** First day of the month the fund completes; null when unreachable. */
  readyDate: Date | null;
};

/**
 * Months of `monthlySetAside` needed to close the gap between
 * `alreadySaved` and `price`, and the calendar month that lands on.
 */
export const calcPurchaseTimeline = (
  price: number,
  alreadySaved: number,
  monthlySetAside: number,
  now: Date = new Date()
): PurchaseTimeline => {
  const remaining = Math.max(0, price - Math.max(0, alreadySaved));
  if (remaining <= 0) {
    return { monthsToReady: 0, readyDate: new Date(now.getFullYear(), now.getMonth(), 1) };
  }
  if (!Number.isFinite(monthlySetAside) || monthlySetAside <= 0) {
    return { monthsToReady: Infinity, readyDate: null };
  }
  const months = Math.ceil(remaining / monthlySetAside);
  return {
    monthsToReady: months,
    readyDate: new Date(now.getFullYear(), now.getMonth() + months, 1),
  };
};

/**
 * Whole months from `now` until the end of a "YYYY-MM" target month.
 * Floors at 1 (a target inside the current month still needs one saving
 * month); null when the string doesn't parse.
 */
export const monthsUntilTarget = (
  targetYearMonth: string,
  now: Date = new Date()
): number | null => {
  const match = /^(\d{4})-(\d{2})$/.exec(targetYearMonth);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  const diff = (year - now.getFullYear()) * 12 + (month - 1 - now.getMonth());
  return Math.max(1, diff);
};

/**
 * Monthly amount required to cover the remaining gap by the target month,
 * rounded up to whole currency units. null when the target doesn't parse;
 * 0 when nothing is left to save.
 */
export const calcRequiredMonthly = (
  price: number,
  alreadySaved: number,
  targetYearMonth: string,
  now: Date = new Date()
): number | null => {
  const months = monthsUntilTarget(targetYearMonth, now);
  if (months === null) return null;
  const remaining = Math.max(0, price - Math.max(0, alreadySaved));
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / months);
};

/* ── Affordability fit ── */

export type PurchaseFit = "fits" | "tight" | "over" | "unknown";

/** Share of free cash flow below which a set-aside is comfortably "fits". */
export const PURCHASE_FIT_COMFORT_SHARE = 0.5;

/**
 * How a monthly set-aside sits against the user's free cash flow:
 * - "fits":  at or under half of free cash flow - other goals unaffected.
 * - "tight": within free cash flow but claiming most of it.
 * - "over":  more than free cash flow - it WILL cut into existing
 *            spending or goals.
 * - "unknown": no tracked history (or no set-aside) to judge against.
 */
export const assessPurchaseFit = (
  monthlySetAside: number,
  cashFlow: MonthlyCashFlow
): PurchaseFit => {
  if (cashFlow.monthsTracked === 0 || monthlySetAside <= 0) return "unknown";
  if (cashFlow.freeCashFlow <= 0) return "over";
  if (monthlySetAside <= cashFlow.freeCashFlow * PURCHASE_FIT_COMFORT_SHARE) {
    return "fits";
  }
  if (monthlySetAside <= cashFlow.freeCashFlow) return "tight";
  return "over";
};

/* ── Ark milestone guidance ── */

export type ArkGuidanceTone = "go" | "caution" | "hold";

export type ArkPurchaseGuidance = {
  tone: ArkGuidanceTone;
  /** Title of the Ark step the guidance is anchored to, "" without a plan. */
  stepTitle: string;
  message: string;
};

const STEP_GUIDANCE: Record<
  DebtMilestoneKey,
  { tone: ArkGuidanceTone; message: string }
> = {
  keel: {
    tone: "hold",
    message:
      "You're building your Keel - the starter emergency fund. Fund that first: without a cushion, one surprise expense turns this purchase into new debt. Keep this set-aside small, or park the plan until the Keel is done.",
  },
  hull: {
    tone: "caution",
    message:
      "You're on the Hull step - paying off debt. A sinking fund beats financing, but every dollar set aside here is a dollar not knocking down a balance. Check the debt trade-off below and lean toward needs over wants.",
  },
  deck: {
    tone: "caution",
    message:
      "You're building the Deck - your full 3-6 month emergency fund. Saving for a purchase alongside it is fine; just keep the emergency fund the bigger slice until it's topped up.",
  },
  supplies: {
    tone: "go",
    message:
      "You're past the survival steps of your Ark - a sinking fund is exactly the right tool. Keep your 15% retirement investing first, set this aside from what's left, and pay cash.",
  },
  gather_animals: {
    tone: "go",
    message:
      "Your Ark is well underway - set the money aside monthly and pay cash so this purchase never becomes debt. Keep your education savings on pace alongside it.",
  },
  moorings: {
    tone: "go",
    message:
      "Your Ark is nearly built - a sinking fund keeps this purchase from touching your mortgage-payoff momentum. Set it aside monthly and pay cash.",
  },
  sail: {
    tone: "go",
    message:
      "You're sailing - buying with cash you set aside on purpose is exactly how this stays a wealth-building habit rather than a setback.",
  },
};

/**
 * Ark-step-aware guidance for starting a purchase fund, keyed off the
 * user's current milestone step. A completed current step is treated as
 * a green light (they've done the work; the plan just hasn't advanced).
 * Without a milestone plan the guidance is a generic go.
 */
export const buildArkPurchaseGuidance = (
  plan: DebtMilestonePlan | null
): ArkPurchaseGuidance => {
  if (!plan) {
    return {
      tone: "go",
      stepTitle: "",
      message:
        "A sinking fund sets money aside every month so the purchase is paid in cash - it never has to become debt.",
    };
  }
  const current = plan.steps.find((step) => step.key === plan.currentStepKey);
  if (!current) {
    return buildArkPurchaseGuidance(null);
  }
  if (current.isCompleted) {
    return {
      tone: "go",
      stepTitle: current.title,
      message: `Your ${current.title} step is complete - setting cash aside for this purchase won't knock the Ark off course. Keep the monthly amount inside your free cash flow and pay cash.`,
    };
  }
  const guidance = STEP_GUIDANCE[current.key];
  return { tone: guidance.tone, stepTitle: current.title, message: guidance.message };
};

/* ── Display helpers ── */

/**
 * Slider ceiling for the monthly set-aside: generous enough to cover the
 * user's whole free cash flow or a 12-month save-up of the price
 * (whichever is larger), rounded up to a clean $25 step, with a floor
 * that keeps small plans usable.
 */
export const calcPurchaseSliderMax = (
  price: number,
  cashFlow: MonthlyCashFlow
): number => {
  const targets = [
    100,
    cashFlow.freeCashFlow,
    Number.isFinite(price) && price > 0 ? price / 12 : 0,
  ];
  const raw = Math.max(...targets);
  return Math.ceil(raw / 25) * 25;
};

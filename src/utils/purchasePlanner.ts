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

import type {
  BudgetEntry,
  Debt,
  DebtMilestoneKey,
  DebtMilestonePlan,
  SavingsGoal,
} from "../types";
import { getMonthKey } from "./budgetMonths";
import { calcMonthsToPayoff, calcTotalInterest } from "./calculations";
import { entriesForMonth } from "./billFulfillment";
import { parseMoneyInput } from "./parseMoneyInput";

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

  for (const monthKey of monthKeys) {
    for (const entry of entriesForMonth(entries, monthKey)) {
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
 * Signed whole months from `now`'s month to a "YYYY-MM" target month: 0 =
 * this month, negative = already past. Null when the string doesn't parse.
 * Lateness math needs the real distance; the required-monthly math wants
 * the floored version below.
 */
export const monthsToTargetMonth = (
  targetYearMonth: string,
  now: Date = new Date()
): number | null => {
  const match = /^(\d{4})-(\d{2})$/.exec(targetYearMonth);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return (year - now.getFullYear()) * 12 + (month - 1 - now.getMonth());
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
  const diff = monthsToTargetMonth(targetYearMonth, now);
  return diff === null ? null : Math.max(1, diff);
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

/* ── Plan ordering, rollover allocation, and the list summary ── */

/**
 * How the plan list ranks purchases - the purchase-planner analogue of the
 * debt tracker's snowball / avalanche choice. Purchases carry no interest,
 * so the "avalanche" seat goes to urgency (soonest need-by date first).
 */
export type PlanPriorityMethod = "snowball" | "soonest" | "custom";

/**
 * How one combined monthly set-aside is spread across the plans:
 * `rollover` pours it all into the first unfunded plan and rolls the
 * money down the list as each completes (a debt-snowball rollover);
 * `parallel` splits it evenly across every unfunded plan.
 */
export type PlanAllocationMode = "rollover" | "parallel";

export const PLAN_PRIORITY_METHODS: readonly PlanPriorityMethod[] = [
  "snowball",
  "soonest",
  "custom",
];

export const PLAN_PRIORITY_METHOD_LABELS: Record<PlanPriorityMethod, string> = {
  snowball: "Smallest first",
  soonest: "Soonest needed",
  custom: "My order",
};

export const PLAN_PRIORITY_METHOD_HINTS: Record<PlanPriorityMethod, string> = {
  snowball: "Finish the cheapest plans first for quick wins - the snowball.",
  soonest: "Plans with the nearest need-by date come first; undated ones after.",
  custom: "Rank them yourself with the arrows on each plan.",
};

export const PLAN_ALLOCATION_MODES: readonly PlanAllocationMode[] = [
  "rollover",
  "parallel",
];

export const PLAN_ALLOCATION_LABELS: Record<PlanAllocationMode, string> = {
  rollover: "One at a time",
  parallel: "Split evenly",
};

/** Simulation horizon; a plan not funded by then reports "never" (null). */
export const MAX_PLAN_PROJECTION_MONTHS = 240;

export const remainingForPlan = (goal: SavingsGoal): number =>
  Math.max(0, goal.targetAmount - Math.max(0, goal.currentAmount));

const isFundedPlan = (goal: SavingsGoal): boolean =>
  goal.targetAmount > 0 && remainingForPlan(goal) <= 0;

/** Compare by need-by month (YYYY-MM prefix); undated sorts last. */
const compareNeedBy = (a: SavingsGoal, b: SavingsGoal): number => {
  const am = a.targetDate?.slice(0, 7) ?? null;
  const bm = b.targetDate?.slice(0, 7) ?? null;
  if (am === bm) return 0;
  if (am === null) return 1;
  if (bm === null) return -1;
  return am < bm ? -1 : 1;
};

const compareCreated = (a: SavingsGoal, b: SavingsGoal): number =>
  a.createdAt.localeCompare(b.createdAt);

/**
 * Rank purchase plans for the list and the allocation. Funded plans always
 * sink to the bottom (there's nothing left to allocate to them) and keep
 * their relative order. Ties fall back to creation order so the list never
 * shuffles between renders.
 *
 *  - snowball: smallest remaining balance first.
 *  - soonest:  nearest need-by month first, undated plans after (by
 *              remaining), so a deadline is never starved by a wish.
 *  - custom:   the user's `priority` (0 = first); plans never ranked sit
 *              after the ranked ones.
 */
export const orderPurchasePlans = (
  goals: readonly SavingsGoal[],
  method: PlanPriorityMethod
): SavingsGoal[] => {
  const compare = (a: SavingsGoal, b: SavingsGoal): number => {
    const fundedDiff = Number(isFundedPlan(a)) - Number(isFundedPlan(b));
    if (fundedDiff !== 0) return fundedDiff;
    switch (method) {
      case "snowball": {
        const diff = remainingForPlan(a) - remainingForPlan(b);
        return diff !== 0 ? diff : compareCreated(a, b);
      }
      case "soonest": {
        const byDate = compareNeedBy(a, b);
        if (byDate !== 0) return byDate;
        const diff = remainingForPlan(a) - remainingForPlan(b);
        return diff !== 0 ? diff : compareCreated(a, b);
      }
      case "custom": {
        const ap = Number.isFinite(a.priority) ? (a.priority as number) : Infinity;
        const bp = Number.isFinite(b.priority) ? (b.priority as number) : Infinity;
        if (ap !== bp) return ap < bp ? -1 : 1;
        return compareCreated(a, b);
      }
    }
  };
  return [...goals].sort(compare);
};

export type PlanPriorityAssignment = { id: string; priority: number };

/**
 * Move one plan up (-1) or down (+1) within the given order and return the
 * full priority assignment (0..n-1) that pins the new order - every plan
 * gets an explicit rank so "My order" is stable from then on. Returns null
 * when the plan is already at that edge or unknown, so callers can skip the
 * write.
 */
/**
 * Whether the plan at `index` can swap with its neighbour in `direction`.
 * False at the list ends and across the funded boundary: the display
 * order always parks funded plans last, so swapping an unfunded plan with
 * a funded one would shuffle priorities without anything moving on screen.
 */
export const canMovePlanInOrder = (
  orderedGoals: readonly SavingsGoal[],
  index: number,
  direction: -1 | 1
): boolean => {
  const target = index + direction;
  if (index < 0 || index >= orderedGoals.length) return false;
  if (target < 0 || target >= orderedGoals.length) return false;
  return isFundedPlan(orderedGoals[index]) === isFundedPlan(orderedGoals[target]);
};

export const movePlanInOrder = (
  orderedGoals: readonly SavingsGoal[],
  goalId: string,
  direction: -1 | 1
): PlanPriorityAssignment[] | null => {
  const index = orderedGoals.findIndex((goal) => goal.id === goalId);
  if (index < 0) return null;
  if (!canMovePlanInOrder(orderedGoals, index, direction)) return null;
  const target = index + direction;
  const ids = orderedGoals.map((goal) => goal.id);
  [ids[index], ids[target]] = [ids[target], ids[index]];
  return ids.map((id, priority) => ({ id, priority }));
};

export type PlanProjection = {
  goalId: string;
  /** Months from now until funded under this allocation; null = not within the horizon. */
  readyInMonths: number | null;
  readyDate: Date | null;
  /** What this plan receives in the first month of the allocation. */
  monthlyNow: number;
  /**
   * Months past the plan's need-by date it lands (0 = on time). Null when
   * the plan has no need-by date; Infinity when it never funds in horizon.
   */
  lateByMonths: number | null;
};

export type PlanProjectionResult = {
  projections: PlanProjection[];
  /** Months until the LAST plan funds; null when any plan never does. */
  allFundedInMonths: number | null;
  allFundedDate: Date | null;
};

const roundCents = (n: number): number => Math.round(n * 100) / 100;

/**
 * One month of the combined set-aside, applied IN PLACE to `remaining`
 * (per plan, in list order). `rollover` fills the first unfunded plan and
 * carries the excess down the list; `parallel` splits evenly among the
 * unfunded plans and re-splits a finished plan's share the same month
 * (bounded so float dust can't loop forever). `onPay` sees every payment.
 * Shared by the projection, the what-if nudges, and the savings chart so
 * all three agree to the cent.
 */
const allocateMonth = (
  remaining: number[],
  budget: number,
  mode: PlanAllocationMode,
  onPay?: (index: number, pay: number) => void
): void => {
  let left = budget;
  if (mode === "rollover") {
    for (let i = 0; i < remaining.length && left > 0; i++) {
      if (remaining[i] <= 0) continue;
      const pay = Math.min(remaining[i], left);
      remaining[i] = roundCents(remaining[i] - pay);
      left = roundCents(left - pay);
      onPay?.(i, pay);
    }
    return;
  }
  for (let pass = 0; pass < 10 && left > 0; pass++) {
    const open = remaining
      .map((value, i) => (value > 0 ? i : -1))
      .filter((i) => i >= 0);
    if (open.length === 0) break;
    const share = left / open.length;
    let spent = 0;
    for (const i of open) {
      const pay = Math.min(remaining[i], share);
      remaining[i] = roundCents(remaining[i] - pay);
      spent += pay;
      onPay?.(i, pay);
    }
    left = roundCents(left - spent);
  }
};

/**
 * Month-by-month simulation of one combined monthly set-aside across the
 * plans in the given order. Under `rollover` each month's money goes to the
 * first unfunded plan and any excess flows to the next (the snowball
 * rollover); under `parallel` it is split evenly among the unfunded plans,
 * with a finished plan's share re-split the same month. Already-funded
 * plans report ready now. A non-positive set-aside funds nothing.
 */
export const projectPurchasePlans = (
  orderedGoals: readonly SavingsGoal[],
  combinedMonthly: number,
  mode: PlanAllocationMode,
  now: Date = new Date()
): PlanProjectionResult => {
  const remaining = orderedGoals.map(remainingForPlan);
  const readyIn: (number | null)[] = remaining.map((left) => (left <= 0 ? 0 : null));
  const monthlyNow = orderedGoals.map(() => 0);
  const budget = Number.isFinite(combinedMonthly) ? Math.max(0, combinedMonthly) : 0;

  if (budget > 0) {
    for (let month = 1; month <= MAX_PLAN_PROJECTION_MONTHS; month++) {
      allocateMonth(remaining, budget, mode, (i, pay) => {
        if (month === 1) monthlyNow[i] = roundCents(monthlyNow[i] + pay);
        if (remaining[i] <= 0) readyIn[i] = month;
      });
      if (remaining.every((value) => value <= 0)) break;
    }
  }

  const monthStart = (months: number): Date =>
    new Date(now.getFullYear(), now.getMonth() + months, 1);

  const projections: PlanProjection[] = orderedGoals.map((goal, i) => {
    const months = readyIn[i];
    let lateByMonths: number | null = null;
    if (goal.targetDate) {
      // Unfloored on purpose: a need-by month already behind us makes
      // every month of saving a month late, not "one month away".
      const until = monthsToTargetMonth(goal.targetDate.slice(0, 7), now);
      if (until !== null) {
        lateByMonths = months === null ? Infinity : Math.max(0, months - until);
      }
    }
    return {
      goalId: goal.id,
      readyInMonths: months,
      readyDate: months === null ? null : monthStart(months),
      monthlyNow: monthlyNow[i],
      lateByMonths,
    };
  });

  const allFundedInMonths = readyIn.every((months) => months !== null)
    ? readyIn.reduce<number>((max, months) => Math.max(max, months ?? 0), 0)
    : null;

  return {
    projections,
    allFundedInMonths,
    allFundedDate: allFundedInMonths === null ? null : monthStart(allFundedInMonths),
  };
};

export type PurchasePlanSummary = {
  planCount: number;
  fundedCount: number;
  totalTarget: number;
  totalSaved: number;
  totalRemaining: number;
  /** 0..1 of the combined target already saved (0 when nothing is planned). */
  progress: number;
  /** Sum of the per-plan monthly amounts the dated, unfunded plans need to hit their dates. */
  requiredMonthlyForDates: number;
};

/** The "sum of everything" header for the plan list. */
export const summarizePurchasePlans = (
  goals: readonly SavingsGoal[],
  now: Date = new Date()
): PurchasePlanSummary => {
  let totalTarget = 0;
  let totalSaved = 0;
  let fundedCount = 0;
  let requiredMonthlyForDates = 0;
  for (const goal of goals) {
    totalTarget += Math.max(0, goal.targetAmount);
    totalSaved += Math.min(Math.max(0, goal.currentAmount), Math.max(0, goal.targetAmount));
    if (isFundedPlan(goal)) fundedCount += 1;
    else if (goal.targetDate) {
      requiredMonthlyForDates +=
        calcRequiredMonthly(goal.targetAmount, goal.currentAmount, goal.targetDate.slice(0, 7), now) ?? 0;
    }
  }
  return {
    planCount: goals.length,
    fundedCount,
    totalTarget: roundCents(totalTarget),
    totalSaved: roundCents(totalSaved),
    totalRemaining: roundCents(Math.max(0, totalTarget - totalSaved)),
    progress: totalTarget > 0 ? Math.min(1, totalSaved / totalTarget) : 0,
    requiredMonthlyForDates,
  };
};

/**
 * Starting point for the combined set-aside when the user hasn't set one:
 * what the dated plans need, else half the free cash flow (the planner's
 * "fits comfortably" line), else nothing - all in $25 steps.
 */
export const suggestCombinedMonthly = (
  summary: PurchasePlanSummary,
  cashFlow: MonthlyCashFlow | null
): number => {
  if (summary.requiredMonthlyForDates > 0) {
    return Math.ceil(summary.requiredMonthlyForDates / 25) * 25;
  }
  if (cashFlow && cashFlow.freeCashFlow > 0) {
    return Math.floor((cashFlow.freeCashFlow * PURCHASE_FIT_COMFORT_SHARE) / 25) * 25;
  }
  return 0;
};

/** Slider ceiling for the combined set-aside - same shape as calcPurchaseSliderMax. */
export const calcCombinedSliderMax = (
  summary: PurchasePlanSummary,
  cashFlow: MonthlyCashFlow | null
): number => {
  const raw = Math.max(
    100,
    cashFlow?.freeCashFlow ?? 0,
    summary.totalRemaining / 12,
    summary.requiredMonthlyForDates
  );
  return Math.ceil(raw / 25) * 25;
};

/* ── Cost analysis: hours of work, finance vs save ── */

export const DEFAULT_HOURS_PER_WEEK = 40;
export const WEEKS_PER_YEAR = 52;
/** Loan terms offered by the finance-vs-save comparison. */
export const FINANCE_TERM_OPTIONS: readonly number[] = [6, 12, 24, 36, 48, 60];
/** APR assumed when the user has no debts to borrow a rate from. */
export const DEFAULT_FINANCE_APR = 22;

/**
 * Take-home pay per hour from the budget's average monthly income (net pay
 * as logged) and the hours worked per week. Null when either is unusable -
 * the UI then offers a typed hourly rate instead.
 */
export const calcHourlyTakeHome = (
  avgMonthlyIncome: number,
  hoursPerWeek: number
): number | null => {
  if (
    !Number.isFinite(avgMonthlyIncome) ||
    avgMonthlyIncome <= 0 ||
    !Number.isFinite(hoursPerWeek) ||
    hoursPerWeek <= 0
  ) {
    return null;
  }
  return (avgMonthlyIncome * 12) / (WEEKS_PER_YEAR * hoursPerWeek);
};

export type HoursOfWork = { hours: number; weeks: number };

/** How long the user works to earn `price`, at `hourlyRate` take-home. */
export const calcHoursOfWork = (
  price: number,
  hourlyRate: number,
  hoursPerWeek: number
): HoursOfWork | null => {
  if (
    !Number.isFinite(price) ||
    price <= 0 ||
    !Number.isFinite(hourlyRate) ||
    hourlyRate <= 0 ||
    !Number.isFinite(hoursPerWeek) ||
    hoursPerWeek <= 0
  ) {
    return null;
  }
  const hours = price / hourlyRate;
  return { hours, weeks: hours / hoursPerWeek };
};

/** "under an hour" / "3 hours" / "120 hours - about 3 weeks of work". */
export const describeHoursOfWork = (work: HoursOfWork): string => {
  if (work.hours < 1) return "under an hour of work";
  const hours = Math.round(work.hours);
  const base = `${hours} hour${hours === 1 ? "" : "s"} of work`;
  if (work.weeks < 1) return base;
  const weeks = Math.round(work.weeks * 10) / 10;
  return `${base} - about ${weeks} week${weeks === 1 ? "" : "s"}`;
};

/** Standard amortized payment; 0% APR is plain division. */
export const calcLoanPayment = (
  principal: number,
  aprPercent: number,
  termMonths: number
): number => {
  if (!Number.isFinite(principal) || principal <= 0) return 0;
  if (!Number.isFinite(termMonths) || termMonths <= 0) return 0;
  const r = Number.isFinite(aprPercent) && aprPercent > 0 ? aprPercent / 100 / 12 : 0;
  if (r === 0) return principal / termMonths;
  return (principal * r) / (1 - Math.pow(1 + r, -termMonths));
};

export type FinanceVsSave = {
  /** What would be borrowed: the price less what's already saved. */
  financed: number;
  monthlyPayment: number;
  totalPaid: number;
  totalInterest: number;
  termMonths: number;
  /** Months until the plan is funded by saving; null when no set-aside. */
  saveMonths: number | null;
  /** Interest paid per month of waiting avoided (financing gets it now). */
  interestPerMonthSooner: number | null;
  /** Loan payment minus the monthly set-aside (positive = loan costs more each month). */
  extraPerMonthVsSaving: number;
};

/**
 * Buying now on credit versus saving up: the loan's payment and interest
 * against the save-up wait. Null when nothing would be financed or the
 * term is unusable.
 */
export const calcFinanceVsSave = (input: {
  price: number;
  alreadySaved: number;
  monthlySetAside: number;
  aprPercent: number;
  termMonths: number;
}): FinanceVsSave | null => {
  const financed = Math.max(0, input.price - Math.max(0, input.alreadySaved));
  if (financed <= 0 || !Number.isFinite(input.termMonths) || input.termMonths <= 0) {
    return null;
  }
  const monthlyPayment = calcLoanPayment(financed, input.aprPercent, input.termMonths);
  const totalPaid = monthlyPayment * input.termMonths;
  const totalInterest = Math.max(0, totalPaid - financed);
  const timeline = calcPurchaseTimeline(input.price, input.alreadySaved, input.monthlySetAside);
  const saveMonths = Number.isFinite(timeline.monthsToReady) ? timeline.monthsToReady : null;
  return {
    financed,
    monthlyPayment,
    totalPaid,
    totalInterest,
    termMonths: input.termMonths,
    saveMonths,
    interestPerMonthSooner:
      saveMonths !== null && saveMonths > 0 ? totalInterest / saveMonths : null,
    extraPerMonthVsSaving: monthlyPayment - Math.max(0, input.monthlySetAside),
  };
};

/** APR to start the comparison at: the user's highest-rate live debt, else a typical card. */
export const suggestFinanceApr = (
  debts: readonly { balance: number; rate: number }[]
): number => {
  let best = 0;
  for (const debt of debts) {
    if (debt.balance > 0 && Number.isFinite(debt.rate) && debt.rate > best) best = debt.rate;
  }
  return best > 0 ? best : DEFAULT_FINANCE_APR;
};

/* ── Opportunity cost against a specific debt ── */

export type OpportunityDebt = Pick<Debt, "id" | "name" | "balance" | "rate" | "minPayment">;

/**
 * The debt a plan's money would otherwise go to: the highest-rate debt
 * still carrying a balance (the avalanche target - the cheapest possible
 * use of an extra dollar, so the shown cost of saving instead is never
 * overstated). Ties go to the larger balance. Null when nothing is owed
 * or every debt is interest-free (no interest to save).
 */
export const pickOpportunityDebt = (
  debts: readonly OpportunityDebt[]
): OpportunityDebt | null => {
  let best: OpportunityDebt | null = null;
  for (const debt of debts) {
    if (!(debt.balance > 0) || !(debt.rate > 0)) continue;
    if (
      !best ||
      debt.rate > best.rate ||
      (debt.rate === best.rate && debt.balance > best.balance)
    ) {
      best = debt;
    }
  }
  return best;
};

export type DebtOpportunityCost = {
  debtId: string;
  debtName: string;
  /** The monthly amount the comparison assumes goes to the debt instead. */
  monthlyAmount: number;
  /** Months the debt clears sooner; Infinity when the minimum alone never clears it. */
  monthsSooner: number;
  /** Lifetime interest avoided (0 when the baseline never clears - see monthsSooner). */
  interestSaved: number;
};

/**
 * What `monthlyAmount` a month costs by going into a plan instead of onto
 * one debt as an extra payment, on top of its minimum. Null when there is
 * nothing to compare (no amount, no balance) or when even the extra
 * payment can't outrun the interest - there's no honest number to show.
 */
export const calcDebtOpportunityCost = (
  debt: OpportunityDebt,
  monthlyAmount: number
): DebtOpportunityCost | null => {
  if (!(monthlyAmount > 0) || !(debt.balance > 0)) return null;
  const minimum = Math.max(0, debt.minPayment);
  const baselineMonths = calcMonthsToPayoff(debt.balance, debt.rate, minimum);
  const extraMonths = calcMonthsToPayoff(debt.balance, debt.rate, minimum + monthlyAmount);
  if (extraMonths === Infinity) return null;
  if (baselineMonths === Infinity) {
    return {
      debtId: debt.id,
      debtName: debt.name,
      monthlyAmount,
      monthsSooner: Infinity,
      interestSaved: 0,
    };
  }
  const interestSaved = Math.max(
    0,
    calcTotalInterest(debt.balance, debt.rate, minimum) -
      calcTotalInterest(debt.balance, debt.rate, minimum + monthlyAmount)
  );
  return {
    debtId: debt.id,
    debtName: debt.name,
    monthlyAmount,
    monthsSooner: Math.max(0, baselineMonths - extraMonths),
    interestSaved,
  };
};

/** One plain sentence for a plan row; `money` formats a dollar amount. */
export const describeDebtOpportunityCost = (
  cost: DebtOpportunityCost,
  money: (amount: number) => string
): string => {
  const lead = `${money(cost.monthlyAmount)}/mo on ${cost.debtName} instead`;
  if (cost.monthsSooner === Infinity) {
    return `${lead} would turn a debt its minimum never clears into one that does.`;
  }
  if (cost.monthsSooner === 0) {
    // Same payoff month either way; only the interest line (if any) is worth saying.
    return cost.interestSaved >= 1
      ? `${lead} would save ${money(Math.round(cost.interestSaved))} in interest, though it clears the same month.`
      : `${lead} would barely move it - this plan costs you almost nothing there.`;
  }
  const months = `${cost.monthsSooner} month${cost.monthsSooner === 1 ? "" : "s"} sooner`;
  return cost.interestSaved >= 1
    ? `${lead} would clear it ${months} and save ${money(Math.round(cost.interestSaved))} in interest.`
    : `${lead} would clear it ${months}.`;
};

/* ── Cost per use ── */

/** "How long will you keep it" choices for the cost-per-use inputs. */
export const USEFUL_LIFE_YEAR_OPTIONS: readonly number[] = [1, 2, 3, 5, 10];
export const MAX_USES_PER_MONTH = 10_000;
export const MAX_USEFUL_LIFE_YEARS = 100;

/**
 * One cost-per-use field as typed: a positive number no larger than `max`,
 * else undefined (blank or junk clears the value). The contribute dialog's
 * live preview and its Save path both go through this, so the preview can
 * never show a cost per use that Save would then silently drop.
 */
export const parsePlanUseInput = (text: string, max: number): number | undefined => {
  const value = parseMoneyInput(text);
  return value !== null && value > 0 && value <= max ? value : undefined;
};

/** Price spread over every expected use; null until both inputs are positive. */
export const calcCostPerUse = (
  price: number,
  usesPerMonth: number | undefined,
  usefulLifeYears: number | undefined
): number | null => {
  if (
    !Number.isFinite(price) ||
    price <= 0 ||
    usesPerMonth === undefined ||
    usefulLifeYears === undefined ||
    !Number.isFinite(usesPerMonth) ||
    !Number.isFinite(usefulLifeYears) ||
    usesPerMonth <= 0 ||
    usefulLifeYears <= 0
  ) {
    return null;
  }
  return price / (usesPerMonth * 12 * usefulLifeYears);
};

/** "about $0.83 per use (20x a month for 3 years)". */
export const describeCostPerUse = (
  costPerUse: number,
  usesPerMonth: number,
  usefulLifeYears: number,
  money: (amount: number) => string
): string => {
  const rounded = Math.round(costPerUse * 100) / 100;
  const cents = rounded < 1 ? `${Math.round(costPerUse * 100)}¢` : money(rounded);
  const years = `${usefulLifeYears} year${usefulLifeYears === 1 ? "" : "s"}`;
  return `about ${cents} per use (${usesPerMonth}x a month for ${years})`;
};

/* ── Per-row what-if nudges ── */

export const NUDGE_MONTHLY_STEP = 25;
export const NUDGE_LUMP_SUM = 100;

export type PlanNudge = {
  amount: number;
  /** Months the plan lands sooner; Infinity = it goes from never to funded. */
  monthsSooner: number;
};

export type PlanNudges = {
  /** Raise the combined set-aside by NUDGE_MONTHLY_STEP. Null when it wouldn't help this plan. */
  extraMonthly: PlanNudge | null;
  /**
   * A one-time contribution today (NUDGE_LUMP_SUM, or whatever is left when
   * that's less - `finishes`). Null when the plan is funded or it wouldn't
   * move the date.
   */
  lumpSum: (PlanNudge & { finishes: boolean }) | null;
};

const monthsSoonerBetween = (
  base: number | null,
  alt: number | null
): number | null => {
  if (alt === null) return null;
  if (base === null) return Infinity;
  return base - alt > 0 ? base - alt : null;
};

const readyMonthsFor = (
  result: PlanProjectionResult,
  goalId: string
): number | null =>
  result.projections.find((item) => item.goalId === goalId)?.readyInMonths ?? null;

/**
 * "What if I did a bit more?" for one plan, under the list's current order
 * and allocation: re-runs the projection with the combined set-aside raised
 * one step, and with a lump sum added to this plan today, and reports how
 * many months sooner the plan lands in each case.
 */
export const calcPlanNudges = (
  orderedGoals: readonly SavingsGoal[],
  goalId: string,
  combinedMonthly: number,
  mode: PlanAllocationMode,
  now: Date = new Date()
): PlanNudges => {
  const goal = orderedGoals.find((item) => item.id === goalId);
  const remaining = goal ? remainingForPlan(goal) : 0;
  if (!goal || remaining <= 0) return { extraMonthly: null, lumpSum: null };

  const base = readyMonthsFor(
    projectPurchasePlans(orderedGoals, combinedMonthly, mode, now),
    goalId
  );

  const extraMonths = readyMonthsFor(
    projectPurchasePlans(orderedGoals, combinedMonthly + NUDGE_MONTHLY_STEP, mode, now),
    goalId
  );
  const extraSooner = monthsSoonerBetween(base, extraMonths);

  const lump = Math.min(NUDGE_LUMP_SUM, remaining);
  const withLump = orderedGoals.map((item) =>
    item.id === goalId
      ? { ...item, currentAmount: Math.max(0, item.currentAmount) + lump }
      : item
  );
  const finishes = lump >= remaining;
  const lumpMonths = readyMonthsFor(
    projectPurchasePlans(withLump, combinedMonthly, mode, now),
    goalId
  );
  const lumpSooner = finishes
    ? base === null
      ? Infinity
      : base
    : monthsSoonerBetween(base, lumpMonths);

  return {
    extraMonthly:
      extraSooner !== null ? { amount: NUDGE_MONTHLY_STEP, monthsSooner: extraSooner } : null,
    lumpSum:
      lumpSooner !== null && (finishes || lumpSooner > 0)
        ? { amount: lump, monthsSooner: lumpSooner, finishes }
        : null,
  };
};

/* ── Progress-to-target chart ── */

/** Longest horizon the chart draws, even when plans take longer. */
export const MAX_CHART_MONTHS = 36;
/** Shortest horizon, so a chart never collapses to a couple of points. */
export const MIN_CHART_MONTHS = 6;

/**
 * Month-by-month saved balance of every plan (capped at its target),
 * index 0 = today, under the same allocation the projection uses.
 */
export const simulatePlanBalances = (
  orderedGoals: readonly SavingsGoal[],
  combinedMonthly: number,
  mode: PlanAllocationMode,
  months: number
): number[][] => {
  const targets = orderedGoals.map((goal) => Math.max(0, goal.targetAmount));
  const remaining = orderedGoals.map(remainingForPlan);
  const saved = orderedGoals.map((goal, i) =>
    Math.min(targets[i], Math.max(0, goal.currentAmount))
  );
  const series = saved.map((value) => [value]);
  const budget = Number.isFinite(combinedMonthly) ? Math.max(0, combinedMonthly) : 0;
  for (let month = 1; month <= months; month++) {
    if (budget > 0) {
      allocateMonth(remaining, budget, mode, (i, pay) => {
        saved[i] = Math.min(targets[i], roundCents(saved[i] + pay));
      });
    }
    for (let i = 0; i < series.length; i++) series[i].push(saved[i]);
  }
  return series;
};

export type SavingsChartSeries = {
  goalId: string;
  name: string;
  target: number;
  /** Saved balance per month, index 0 = today. */
  values: number[];
  /** Share of the target saved per month (0..1, capped), index 0 = today. */
  progress: number[];
  /** Month index the plan reaches its target within the horizon, if it does. */
  readyAtMonth: number | null;
};

export type SavingsChartModel = {
  /** Number of months after today the chart covers. */
  months: number;
  series: SavingsChartSeries[];
  totalTarget: number;
  /** Highest combined balance across the horizon. */
  peakTotal: number;
};

/**
 * Data behind the progress-to-target chart: every plan's balance (and the
 * share of its own target that is) over a horizon that runs to the month
 * the last plan funds, clamped to [MIN_CHART_MONTHS, MAX_CHART_MONTHS].
 * Funded plans are included (flat at their target, ready at month 0) so
 * the combined figures still add up to what's really saved. Null when
 * there are no plans.
 */
export const buildSavingsChart = (
  orderedGoals: readonly SavingsGoal[],
  combinedMonthly: number,
  mode: PlanAllocationMode,
  now: Date = new Date()
): SavingsChartModel | null => {
  if (orderedGoals.length === 0) return null;
  const projection = projectPurchasePlans(orderedGoals, combinedMonthly, mode, now);
  const horizon = projection.allFundedInMonths ?? MAX_CHART_MONTHS;
  const months = Math.max(MIN_CHART_MONTHS, Math.min(MAX_CHART_MONTHS, horizon));
  const balances = simulatePlanBalances(orderedGoals, combinedMonthly, mode, months);
  const series: SavingsChartSeries[] = orderedGoals.map((goal, i) => {
    const target = Math.max(0, goal.targetAmount);
    const readyIndex = balances[i].findIndex((value) => target > 0 && value >= target);
    return {
      goalId: goal.id,
      name: goal.name,
      target,
      values: balances[i],
      progress: balances[i].map((value) => (target > 0 ? Math.min(1, value / target) : 0)),
      readyAtMonth: readyIndex >= 0 ? readyIndex : null,
    };
  });
  let peakTotal = 0;
  for (let m = 0; m <= months; m++) {
    let total = 0;
    for (const item of series) total += item.values[m];
    peakTotal = Math.max(peakTotal, total);
  }
  return {
    months,
    series,
    totalTarget: series.reduce((sum, item) => sum + item.target, 0),
    peakTotal,
  };
};

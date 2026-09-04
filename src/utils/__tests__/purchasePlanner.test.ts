// BudgetArk - Purchase Planner tests
//
// Pins the pure math behind the Charts-tab "Plan a Purchase" tool:
// monthly cash flow from budget history, the save-up timeline, the
// required-monthly-by-date calculation, the affordability fit tiers, and
// the Ark-milestone guidance mapping. The debt trade-off shown alongside
// the tool reuses calcDebtRedirectImpact, pinned in whatIfSpending.test.ts.

import type { BudgetEntry, DebtMilestoneKey, DebtMilestonePlan, SavingsGoal } from "../../types";
import { DEFAULT_DEBT_MILESTONE_STEPS } from "../../types";
import {
  assessPurchaseFit,
  buildArkPurchaseGuidance,
  buildSavingsChart,
  calcCombinedSliderMax,
  calcCostPerUse,
  calcDebtOpportunityCost,
  calcFinanceVsSave,
  calcHourlyTakeHome,
  calcHoursOfWork,
  calcLoanPayment,
  calcMonthlyCashFlow,
  calcPlanNudges,
  DEFAULT_FINANCE_APR,
  describeCostPerUse,
  describeDebtOpportunityCost,
  describeHoursOfWork,
  calcPurchaseSliderMax,
  calcPurchaseTimeline,
  calcRequiredMonthly,
  monthsUntilTarget,
  MAX_CHART_MONTHS,
  MIN_CHART_MONTHS,
  movePlanInOrder,
  canMovePlanInOrder,
  parsePlanUseInput,
  MAX_USES_PER_MONTH,
  NUDGE_LUMP_SUM,
  NUDGE_MONTHLY_STEP,
  orderPurchasePlans,
  pickOpportunityDebt,
  projectPurchasePlans,
  PURCHASE_LOOKBACK_MONTHS,
  simulatePlanBalances,
  suggestCombinedMonthly,
  suggestFinanceApr,
  summarizePurchasePlans,
} from "../purchasePlanner";
import type { MonthlyCashFlow } from "../purchasePlanner";

/** Fixed "today" so the 6-month lookback window is deterministic. */
const NOW = new Date(2026, 6, 15); // July 15, 2026 → window Jan..Jun 2026

const entry = (overrides: Partial<BudgetEntry>): BudgetEntry => ({
  id: "e1",
  type: "expense",
  category: "Grocery",
  amount: 50,
  date: "2026-05-10",
  createdAt: "2026-05-10T00:00:00.000Z",
  updatedAt: "2026-05-10T00:00:00.000Z",
  ...overrides,
});

const cashFlow = (overrides: Partial<MonthlyCashFlow>): MonthlyCashFlow => ({
  avgIncome: 4000,
  avgExpenses: 3000,
  freeCashFlow: 1000,
  monthsTracked: 6,
  ...overrides,
});

const plan = (
  currentStepKey: DebtMilestoneKey,
  completedKeys: readonly DebtMilestoneKey[] = []
): DebtMilestonePlan => ({
  currentStepKey,
  steps: DEFAULT_DEBT_MILESTONE_STEPS.map((step) => ({
    ...step,
    isCompleted: completedKeys.includes(step.key),
  })),
  updatedAt: "2026-07-01T00:00:00.000Z",
});

describe("calcMonthlyCashFlow", () => {
  it("returns zeros with no history", () => {
    expect(calcMonthlyCashFlow([], NOW)).toEqual({
      avgIncome: 0,
      avgExpenses: 0,
      freeCashFlow: 0,
      monthsTracked: 0,
    });
  });

  it("averages income and expenses over tracked months only", () => {
    const entries = [
      entry({ id: "a", type: "income", category: "Salary", amount: 4000, date: "2026-05-01" }),
      entry({ id: "b", type: "income", category: "Salary", amount: 4000, date: "2026-06-01" }),
      entry({ id: "c", amount: 1500, date: "2026-05-12" }),
      entry({ id: "d", amount: 2500, date: "2026-06-20" }),
    ];
    // Two tracked months: income 8000/2, expenses 4000/2.
    expect(calcMonthlyCashFlow(entries, NOW)).toEqual({
      avgIncome: 4000,
      avgExpenses: 2000,
      freeCashFlow: 2000,
      monthsTracked: 2,
    });
  });

  it("excludes the current month and months outside the window", () => {
    const entries = [
      entry({ id: "a", type: "income", amount: 9999, date: "2026-07-01" }), // current month
      entry({ id: "b", amount: 9999, date: "2025-12-31" }), // too old
      entry({ id: "c", type: "income", amount: 3000, date: "2026-06-05" }),
      entry({ id: "d", amount: 1000, date: "2026-06-06" }),
    ];
    expect(calcMonthlyCashFlow(entries, NOW)).toEqual({
      avgIncome: 3000,
      avgExpenses: 1000,
      freeCashFlow: 2000,
      monthsTracked: 1,
    });
  });

  it("counts a monthly recurring entry in every window month", () => {
    const entries = [
      entry({
        id: "rent",
        amount: 900,
        date: "2025-11-01",
        recurring: true,
      }),
    ];
    const result = calcMonthlyCashFlow(entries, NOW);
    expect(result.monthsTracked).toBe(PURCHASE_LOOKBACK_MONTHS);
    expect(result.avgExpenses).toBe(900);
    expect(result.freeCashFlow).toBe(-900);
  });

  it("reports negative free cash flow when spending exceeds income", () => {
    const entries = [
      entry({ id: "a", type: "income", amount: 1000, date: "2026-06-01" }),
      entry({ id: "b", amount: 1400, date: "2026-06-02" }),
    ];
    expect(calcMonthlyCashFlow(entries, NOW).freeCashFlow).toBe(-400);
  });
});

describe("calcPurchaseTimeline", () => {
  it("is ready immediately when savings already cover the price", () => {
    const result = calcPurchaseTimeline(500, 600, 100, NOW);
    expect(result.monthsToReady).toBe(0);
    expect(result.readyDate).toEqual(new Date(2026, 6, 1));
  });

  it("rounds partial months up", () => {
    const result = calcPurchaseTimeline(1000, 0, 300, NOW);
    expect(result.monthsToReady).toBe(4); // 3.33 → 4
    expect(result.readyDate).toEqual(new Date(2026, 10, 1)); // November 2026
  });

  it("divides exactly when the gap is a clean multiple", () => {
    expect(calcPurchaseTimeline(1200, 200, 250, NOW).monthsToReady).toBe(4);
  });

  it("is unreachable with no monthly set-aside", () => {
    const result = calcPurchaseTimeline(1000, 0, 0, NOW);
    expect(result.monthsToReady).toBe(Infinity);
    expect(result.readyDate).toBeNull();
  });

  it("ignores a negative already-saved amount", () => {
    expect(calcPurchaseTimeline(1000, -50, 500, NOW).monthsToReady).toBe(2);
  });
});

describe("monthsUntilTarget / calcRequiredMonthly", () => {
  it("counts whole months to a future target month", () => {
    expect(monthsUntilTarget("2026-12", NOW)).toBe(5);
    expect(monthsUntilTarget("2027-07", NOW)).toBe(12);
  });

  it("floors at one month for the current or past months", () => {
    expect(monthsUntilTarget("2026-07", NOW)).toBe(1);
    expect(monthsUntilTarget("2026-01", NOW)).toBe(1);
  });

  it("rejects malformed targets", () => {
    expect(monthsUntilTarget("december", NOW)).toBeNull();
    expect(monthsUntilTarget("2026-13", NOW)).toBeNull();
    expect(calcRequiredMonthly(1000, 0, "not-a-month", NOW)).toBeNull();
  });

  it("computes the rounded-up required monthly amount", () => {
    // 1000 remaining over 5 months → 200/mo; 999 over 5 → 200 (ceil).
    expect(calcRequiredMonthly(1000, 0, "2026-12", NOW)).toBe(200);
    expect(calcRequiredMonthly(999, 0, "2026-12", NOW)).toBe(200);
  });

  it("returns 0 when the fund is already covered", () => {
    expect(calcRequiredMonthly(500, 500, "2026-12", NOW)).toBe(0);
  });
});

describe("assessPurchaseFit", () => {
  it("is unknown without history or without a set-aside", () => {
    expect(assessPurchaseFit(200, cashFlow({ monthsTracked: 0 }))).toBe("unknown");
    expect(assessPurchaseFit(0, cashFlow({}))).toBe("unknown");
  });

  it("fits at or under half of free cash flow", () => {
    expect(assessPurchaseFit(500, cashFlow({}))).toBe("fits");
    expect(assessPurchaseFit(499, cashFlow({}))).toBe("fits");
  });

  it("is tight between half and all of free cash flow", () => {
    expect(assessPurchaseFit(501, cashFlow({}))).toBe("tight");
    expect(assessPurchaseFit(1000, cashFlow({}))).toBe("tight");
  });

  it("is over beyond free cash flow, or whenever cash flow is negative", () => {
    expect(assessPurchaseFit(1001, cashFlow({}))).toBe("over");
    expect(assessPurchaseFit(50, cashFlow({ freeCashFlow: 0 }))).toBe("over");
    expect(assessPurchaseFit(50, cashFlow({ freeCashFlow: -200 }))).toBe("over");
  });
});

describe("buildArkPurchaseGuidance", () => {
  it("gives generic go guidance without a milestone plan", () => {
    const guidance = buildArkPurchaseGuidance(null);
    expect(guidance.tone).toBe("go");
    expect(guidance.stepTitle).toBe("");
  });

  it("holds on the starter emergency fund step", () => {
    const guidance = buildArkPurchaseGuidance(plan("keel"));
    expect(guidance.tone).toBe("hold");
    expect(guidance.stepTitle).toBe("Keel");
  });

  it("cautions during debt payoff and the full emergency fund", () => {
    expect(buildArkPurchaseGuidance(plan("hull")).tone).toBe("caution");
    expect(buildArkPurchaseGuidance(plan("deck")).tone).toBe("caution");
  });

  it("greenlights the wealth-building steps", () => {
    for (const key of ["supplies", "gather_animals", "moorings", "sail"] as const) {
      expect(buildArkPurchaseGuidance(plan(key)).tone).toBe("go");
    }
  });

  it("greenlights a completed current step regardless of which it is", () => {
    const guidance = buildArkPurchaseGuidance(plan("keel", ["keel"]));
    expect(guidance.tone).toBe("go");
    expect(guidance.stepTitle).toBe("Keel");
  });
});

describe("calcPurchaseSliderMax", () => {
  it("keeps a usable floor for small plans", () => {
    expect(calcPurchaseSliderMax(300, cashFlow({ freeCashFlow: 0 }))).toBe(100);
  });

  it("covers free cash flow rounded up to a $25 step", () => {
    expect(calcPurchaseSliderMax(300, cashFlow({ freeCashFlow: 1010 }))).toBe(1025);
  });

  it("covers a 12-month save-up of a big price", () => {
    // price/12 = 2000 dominates the $1000 free cash flow.
    expect(calcPurchaseSliderMax(24000, cashFlow({ freeCashFlow: 1000 }))).toBe(2000);
  });
});

/* ── Plan ordering, rollover allocation, summary ── */

const goal = (over: Partial<SavingsGoal> & { id: string }): SavingsGoal => ({
  name: over.id,
  category: "other",
  targetAmount: 1000,
  currentAmount: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

describe("orderPurchasePlans", () => {
  const laptop = goal({ id: "laptop", targetAmount: 1200, currentAmount: 200, createdAt: "2026-02-01T00:00:00.000Z" });
  const bike = goal({ id: "bike", targetAmount: 600, currentAmount: 100, targetDate: "2026-09-01", createdAt: "2026-03-01T00:00:00.000Z" });
  const trip = goal({ id: "trip", targetAmount: 3000, currentAmount: 0, targetDate: "2026-12-01", createdAt: "2026-01-01T00:00:00.000Z" });
  const done = goal({ id: "done", targetAmount: 100, currentAmount: 100, createdAt: "2025-01-01T00:00:00.000Z" });

  it("snowball: smallest remaining first, funded plans last", () => {
    expect(orderPurchasePlans([trip, laptop, done, bike], "snowball").map((g) => g.id)).toEqual([
      "bike", // 500 left
      "laptop", // 1000 left
      "trip", // 3000 left
      "done",
    ]);
  });

  it("soonest: nearest need-by first, undated after by remaining, funded last", () => {
    expect(orderPurchasePlans([laptop, done, trip, bike], "soonest").map((g) => g.id)).toEqual([
      "bike", // Sep
      "trip", // Dec
      "laptop", // undated
      "done",
    ]);
  });

  it("custom: explicit priority ascending, unranked after by creation date", () => {
    const ranked = [
      goal({ ...laptop, priority: 2 }),
      goal({ ...trip, priority: 0 }),
      bike, // unranked
      goal({ ...done, priority: 1 }),
    ];
    expect(orderPurchasePlans(ranked, "custom").map((g) => g.id)).toEqual([
      "trip",
      "laptop",
      "bike",
      "done", // ranked 1 but funded - sinks regardless
    ]);
  });

  it("breaks ties by creation date so the list never shuffles", () => {
    const a = goal({ id: "a", createdAt: "2026-05-01T00:00:00.000Z" });
    const b = goal({ id: "b", createdAt: "2026-04-01T00:00:00.000Z" });
    expect(orderPurchasePlans([a, b], "snowball").map((g) => g.id)).toEqual(["b", "a"]);
    expect(orderPurchasePlans([a, b], "custom").map((g) => g.id)).toEqual(["b", "a"]);
  });

  it("does not mutate its input", () => {
    const input = [laptop, bike];
    orderPurchasePlans(input, "snowball");
    expect(input.map((g) => g.id)).toEqual(["laptop", "bike"]);
  });
});

describe("movePlanInOrder", () => {
  const ordered = [goal({ id: "a" }), goal({ id: "b" }), goal({ id: "c" })];

  it("swaps with the neighbour and pins every plan's rank", () => {
    expect(movePlanInOrder(ordered, "c", -1)).toEqual([
      { id: "a", priority: 0 },
      { id: "c", priority: 1 },
      { id: "b", priority: 2 },
    ]);
    expect(movePlanInOrder(ordered, "a", 1)).toEqual([
      { id: "b", priority: 0 },
      { id: "a", priority: 1 },
      { id: "c", priority: 2 },
    ]);
  });

  it("returns null at the edges and for unknown ids", () => {
    expect(movePlanInOrder(ordered, "a", -1)).toBeNull();
    expect(movePlanInOrder(ordered, "c", 1)).toBeNull();
    expect(movePlanInOrder(ordered, "zzz", 1)).toBeNull();
  });

  it("never swaps across the funded boundary (funded plans always display last)", () => {
    const withFunded = [
      goal({ id: "a" }),
      goal({ id: "b" }),
      goal({ id: "done", targetAmount: 100, currentAmount: 100 }),
      goal({ id: "done2", targetAmount: 50, currentAmount: 80 }),
    ];
    // Last unfunded plan can't move down; first funded plan can't move up.
    expect(canMovePlanInOrder(withFunded, 1, 1)).toBe(false);
    expect(canMovePlanInOrder(withFunded, 2, -1)).toBe(false);
    expect(movePlanInOrder(withFunded, "b", 1)).toBeNull();
    expect(movePlanInOrder(withFunded, "done", -1)).toBeNull();
    // Moves within each group still work.
    expect(canMovePlanInOrder(withFunded, 1, -1)).toBe(true);
    expect(canMovePlanInOrder(withFunded, 2, 1)).toBe(true);
    expect(movePlanInOrder(withFunded, "done2", -1)?.map((a) => a.id)).toEqual(["a", "b", "done2", "done"]);
    expect(canMovePlanInOrder(withFunded, -1, 1)).toBe(false);
    expect(canMovePlanInOrder(withFunded, 4, -1)).toBe(false);
  });
});

describe("parsePlanUseInput", () => {
  it("accepts a positive number within the cap and clears everything else", () => {
    expect(parsePlanUseInput("12", MAX_USES_PER_MONTH)).toBe(12);
    expect(parsePlanUseInput(" 2.5 ", 100)).toBe(2.5);
    expect(parsePlanUseInput("", 100)).toBeUndefined();
    expect(parsePlanUseInput("0", 100)).toBeUndefined();
    expect(parsePlanUseInput("-3", 100)).toBeUndefined();
    expect(parsePlanUseInput("abc", 100)).toBeUndefined();
    // Over the cap is dropped, not clamped - the preview and Save agree.
    expect(parsePlanUseInput(String(MAX_USES_PER_MONTH + 1), MAX_USES_PER_MONTH)).toBeUndefined();
    expect(parsePlanUseInput(String(MAX_USES_PER_MONTH), MAX_USES_PER_MONTH)).toBe(MAX_USES_PER_MONTH);
  });
});

describe("projectPurchasePlans", () => {
  const now = new Date(2026, 6, 15); // July 2026
  const first = goal({ id: "first", targetAmount: 300, currentAmount: 0 });
  const second = goal({ id: "second", targetAmount: 500, currentAmount: 0, targetDate: "2026-09-01" });
  const funded = goal({ id: "funded", targetAmount: 100, currentAmount: 100 });

  it("rollover pours everything into the first plan and rolls the remainder down", () => {
    const result = projectPurchasePlans([first, second, funded], 200, "rollover", now);
    const [p1, p2, p3] = result.projections;
    // Month 1: 200 -> first (100 left). Month 2: 100 finishes first, 100 -> second.
    // Months 3,4: 400 more -> second done in month 4.
    expect(p1).toMatchObject({ goalId: "first", readyInMonths: 2, monthlyNow: 200, lateByMonths: null });
    expect(p1.readyDate).toEqual(new Date(2026, 8, 1));
    expect(p2).toMatchObject({ goalId: "second", readyInMonths: 4, monthlyNow: 0 });
    // Need-by Sep 2026 = 2 months away; ready in 4 -> 2 months late.
    expect(p2.lateByMonths).toBe(2);
    expect(p3).toMatchObject({ goalId: "funded", readyInMonths: 0, monthlyNow: 0 });
    expect(result.allFundedInMonths).toBe(4);
    expect(result.allFundedDate).toEqual(new Date(2026, 10, 1));
  });

  it("counts every month past a need-by date that is already behind us as late", () => {
    // Need-by March 2026, now July: 4 months gone. $50 left at $100/mo
    // funds next month -> 5 months late, not "ready next month, on time".
    const overdue = goal({ id: "overdue", targetAmount: 100, currentAmount: 50, targetDate: "2026-03-01" });
    const thisMonth = goal({ id: "thisMonth", targetAmount: 300, currentAmount: 0, targetDate: "2026-07-20" });
    const result = projectPurchasePlans([overdue, thisMonth], 100, "rollover", now);
    const [p1, p2] = result.projections;
    expect(p1).toMatchObject({ readyInMonths: 1, lateByMonths: 5 });
    // Month 1: 50 -> overdue done, 50 -> thisMonth; months 2-3: 200 more -> ready month 4.
    // Need-by is this month (0 away) -> 4 months late.
    expect(p2).toMatchObject({ readyInMonths: 4, lateByMonths: 4 });
  });

  it("parallel splits evenly and re-splits a finished plan's share the same month", () => {
    const result = projectPurchasePlans([first, second], 200, "parallel", now);
    const [p1, p2] = result.projections;
    // 100/100 per month: first done in month 3 (its month-3 share is 100,
    // fully used); second has 200 left after month 3, gets 200 in month 4.
    expect(p1).toMatchObject({ readyInMonths: 3, monthlyNow: 100 });
    expect(p2).toMatchObject({ readyInMonths: 4, monthlyNow: 100 });
    expect(result.allFundedInMonths).toBe(4);
  });

  it("re-splits within a month when a plan finishes with money to spare", () => {
    const tiny = goal({ id: "tiny", targetAmount: 50, currentAmount: 0 });
    const big = goal({ id: "big", targetAmount: 1000, currentAmount: 0 });
    const result = projectPurchasePlans([tiny, big], 200, "parallel", now);
    const [t, b] = result.projections;
    expect(t).toMatchObject({ readyInMonths: 1, monthlyNow: 50 });
    expect(b.monthlyNow).toBe(150); // the tiny plan's unused 50 moved over
  });

  it("a zero set-aside funds nothing; funded plans still read ready now", () => {
    const result = projectPurchasePlans([first, second, funded], 0, "rollover", now);
    expect(result.projections.map((p) => p.readyInMonths)).toEqual([null, null, 0]);
    expect(result.projections[1].lateByMonths).toBe(Infinity);
    expect(result.allFundedInMonths).toBeNull();
    expect(result.allFundedDate).toBeNull();
  });

  it("gives up at the horizon instead of looping", () => {
    const huge = goal({ id: "huge", targetAmount: 10_000_000 });
    const result = projectPurchasePlans([huge], 10, "rollover", now);
    expect(result.projections[0].readyInMonths).toBeNull();
  });

  it("an empty list is all funded now", () => {
    const result = projectPurchasePlans([], 100, "rollover", now);
    expect(result.projections).toEqual([]);
    expect(result.allFundedInMonths).toBe(0);
  });
});

describe("summarizePurchasePlans", () => {
  const now = new Date(2026, 6, 15);

  it("adds everything up, caps saved at each target, and sums what dated plans need", () => {
    const summary = summarizePurchasePlans(
      [
        goal({ id: "a", targetAmount: 1000, currentAmount: 250, targetDate: "2026-12-01" }), // 750 / 5 mo = 150
        goal({ id: "b", targetAmount: 500, currentAmount: 900 }), // over-saved counts as 500
        goal({ id: "c", targetAmount: 300, currentAmount: 0 }), // undated: no monthly need
      ],
      now,
    );
    expect(summary).toEqual({
      planCount: 3,
      fundedCount: 1,
      totalTarget: 1800,
      totalSaved: 750,
      totalRemaining: 1050,
      progress: 750 / 1800,
      requiredMonthlyForDates: 150,
    });
  });

  it("is all zeros for no plans", () => {
    expect(summarizePurchasePlans([], now)).toEqual({
      planCount: 0,
      fundedCount: 0,
      totalTarget: 0,
      totalSaved: 0,
      totalRemaining: 0,
      progress: 0,
      requiredMonthlyForDates: 0,
    });
  });
});

describe("suggestCombinedMonthly / calcCombinedSliderMax", () => {
  const summary = (over: Partial<ReturnType<typeof summarizePurchasePlans>> = {}) => ({
    planCount: 2,
    fundedCount: 0,
    totalTarget: 3000,
    totalSaved: 0,
    totalRemaining: 3000,
    progress: 0,
    requiredMonthlyForDates: 0,
    ...over,
  });

  it("suggests what the dated plans need, rounded up to $25", () => {
    expect(suggestCombinedMonthly(summary({ requiredMonthlyForDates: 160 }), null)).toBe(175);
  });

  it("falls back to half the free cash flow in $25 steps, then to zero", () => {
    expect(suggestCombinedMonthly(summary(), cashFlow({ freeCashFlow: 420 }))).toBe(200);
    expect(suggestCombinedMonthly(summary(), cashFlow({ freeCashFlow: -50 }))).toBe(0);
    expect(suggestCombinedMonthly(summary(), null)).toBe(0);
  });

  it("slider max covers free cash flow, a 12-month save-up, the dated need, and a $100 floor", () => {
    expect(calcCombinedSliderMax(summary({ totalRemaining: 120 }), null)).toBe(100);
    expect(calcCombinedSliderMax(summary({ totalRemaining: 3000 }), null)).toBe(250);
    expect(calcCombinedSliderMax(summary(), cashFlow({ freeCashFlow: 810 }))).toBe(825);
    expect(calcCombinedSliderMax(summary({ requiredMonthlyForDates: 900 }), null)).toBe(900);
  });
});

/* ── Cost analysis ── */

describe("hours of work", () => {
  it("derives take-home per hour from average monthly income and hours per week", () => {
    // $4,333.33/mo * 12 = $52,000/yr over 52 * 40 = 2,080 hours -> $25/hr
    expect(calcHourlyTakeHome(4333.3333, 40)).toBeCloseTo(25, 2);
    expect(calcHourlyTakeHome(0, 40)).toBeNull();
    expect(calcHourlyTakeHome(4000, 0)).toBeNull();
    expect(calcHourlyTakeHome(Number.NaN, 40)).toBeNull();
  });

  it("turns a price into hours and weeks at that rate", () => {
    expect(calcHoursOfWork(1000, 25, 40)).toEqual({ hours: 40, weeks: 1 });
    expect(calcHoursOfWork(0, 25, 40)).toBeNull();
    expect(calcHoursOfWork(1000, 0, 40)).toBeNull();
  });

  it("describes the result in plain words", () => {
    expect(describeHoursOfWork({ hours: 0.4, weeks: 0.01 })).toBe("under an hour of work");
    expect(describeHoursOfWork({ hours: 1.2, weeks: 0.03 })).toBe("1 hour of work");
    expect(describeHoursOfWork({ hours: 23.6, weeks: 0.59 })).toBe("24 hours of work");
    expect(describeHoursOfWork({ hours: 120, weeks: 3 })).toBe("120 hours of work - about 3 weeks");
    expect(describeHoursOfWork({ hours: 40, weeks: 1 })).toBe("40 hours of work - about 1 week");
    expect(describeHoursOfWork({ hours: 100, weeks: 2.5 })).toBe("100 hours of work - about 2.5 weeks");
  });
});

describe("finance vs save", () => {
  it("amortizes a loan payment; 0% is plain division", () => {
    // $1,200 at 12% over 12 months -> $106.62/mo (standard table value)
    expect(calcLoanPayment(1200, 12, 12)).toBeCloseTo(106.62, 2);
    expect(calcLoanPayment(1200, 0, 12)).toBe(100);
    expect(calcLoanPayment(0, 12, 12)).toBe(0);
    expect(calcLoanPayment(1200, 12, 0)).toBe(0);
  });

  it("compares the loan's interest against the save-up wait", () => {
    const result = calcFinanceVsSave({
      price: 1500,
      alreadySaved: 300,
      monthlySetAside: 200,
      aprPercent: 12,
      termMonths: 12,
    });
    expect(result).not.toBeNull();
    expect(result!.financed).toBe(1200);
    expect(result!.monthlyPayment).toBeCloseTo(106.62, 2);
    expect(result!.totalPaid).toBeCloseTo(1279.44, 1);
    expect(result!.totalInterest).toBeCloseTo(79.44, 1);
    expect(result!.saveMonths).toBe(6); // 1200 / 200
    expect(result!.interestPerMonthSooner).toBeCloseTo(79.44 / 6, 1);
    expect(result!.extraPerMonthVsSaving).toBeCloseTo(106.62 - 200, 2);
  });

  it("reports no wait figure without a set-aside, and null when nothing would be financed", () => {
    const noSetAside = calcFinanceVsSave({
      price: 1000,
      alreadySaved: 0,
      monthlySetAside: 0,
      aprPercent: 20,
      termMonths: 24,
    });
    expect(noSetAside!.saveMonths).toBeNull();
    expect(noSetAside!.interestPerMonthSooner).toBeNull();
    expect(
      calcFinanceVsSave({ price: 500, alreadySaved: 500, monthlySetAside: 50, aprPercent: 20, termMonths: 12 }),
    ).toBeNull();
    expect(
      calcFinanceVsSave({ price: 500, alreadySaved: 0, monthlySetAside: 50, aprPercent: 20, termMonths: 0 }),
    ).toBeNull();
  });

  it("already-funded plans compare as zero months of waiting", () => {
    const result = calcFinanceVsSave({
      price: 1000,
      alreadySaved: 200,
      monthlySetAside: 5000,
      aprPercent: 20,
      termMonths: 12,
    });
    expect(result!.saveMonths).toBe(1);
  });

  it("suggests the highest live debt rate, else a typical card APR", () => {
    expect(
      suggestFinanceApr([
        { balance: 500, rate: 19.9 },
        { balance: 0, rate: 29.9 }, // paid off - ignored
        { balance: 8000, rate: 6.5 },
      ]),
    ).toBe(19.9);
    expect(suggestFinanceApr([])).toBe(DEFAULT_FINANCE_APR);
    expect(suggestFinanceApr([{ balance: 100, rate: 0 }])).toBe(DEFAULT_FINANCE_APR);
  });
});

/* ── Opportunity cost against a specific debt ── */

describe("pickOpportunityDebt", () => {
  const card = { id: "card", name: "Chase Visa", balance: 2500, rate: 24.99, minPayment: 75 };
  const loan = { id: "loan", name: "Car Loan", balance: 9000, rate: 6.5, minPayment: 250 };

  it("chooses the highest-rate debt with a balance", () => {
    expect(pickOpportunityDebt([loan, card])?.id).toBe("card");
  });

  it("ignores paid-off and interest-free debts, larger balance breaks a rate tie", () => {
    expect(pickOpportunityDebt([{ ...card, balance: 0 }, loan])?.id).toBe("loan");
    expect(pickOpportunityDebt([{ ...card, rate: 0 }])).toBeNull();
    expect(
      pickOpportunityDebt([
        { ...card, id: "small", balance: 500 },
        { ...card, id: "big", balance: 4000 },
      ])?.id,
    ).toBe("big");
    expect(pickOpportunityDebt([])).toBeNull();
  });
});

describe("calcDebtOpportunityCost", () => {
  const card = { id: "card", name: "Chase Visa", balance: 2500, rate: 24.99, minPayment: 75 };

  it("reports months sooner and interest saved for an extra payment on top of the minimum", () => {
    const cost = calcDebtOpportunityCost(card, 150);
    expect(cost).not.toBeNull();
    expect(cost!).toMatchObject({ debtId: "card", debtName: "Chase Visa", monthlyAmount: 150 });
    expect(cost!.monthsSooner).toBeGreaterThan(24);
    expect(cost!.interestSaved).toBeGreaterThan(500);
    // More money, more saved.
    expect(calcDebtOpportunityCost(card, 300)!.interestSaved).toBeGreaterThan(cost!.interestSaved);
  });

  it("is null with no amount, no balance, or when the extra still can't outrun interest", () => {
    expect(calcDebtOpportunityCost(card, 0)).toBeNull();
    expect(calcDebtOpportunityCost({ ...card, balance: 0 }, 150)).toBeNull();
    // 2500 at 24.99% accrues ~$52/mo; $10 minimum + $20 extra never clears it.
    expect(calcDebtOpportunityCost({ ...card, minPayment: 10 }, 20)).toBeNull();
  });

  it("flags a minimum that never clears the debt as Infinity months sooner", () => {
    const cost = calcDebtOpportunityCost({ ...card, minPayment: 10 }, 150);
    expect(cost!.monthsSooner).toBe(Infinity);
    expect(cost!.interestSaved).toBe(0);
  });
});

describe("describeDebtOpportunityCost", () => {
  const money = (n: number) => `$${n}`;
  const base = { debtId: "card", debtName: "Chase Visa", monthlyAmount: 150 };

  it("names the debt, the months, and the interest", () => {
    expect(describeDebtOpportunityCost({ ...base, monthsSooner: 4, interestSaved: 312.4 }, money)).toBe(
      "$150/mo on Chase Visa instead would clear it 4 months sooner and save $312 in interest.",
    );
    expect(describeDebtOpportunityCost({ ...base, monthsSooner: 1, interestSaved: 0.4 }, money)).toBe(
      "$150/mo on Chase Visa instead would clear it 1 month sooner.",
    );
  });

  it("has words for the never-clears and barely-moves cases", () => {
    expect(describeDebtOpportunityCost({ ...base, monthsSooner: Infinity, interestSaved: 0 }, money)).toMatch(
      /minimum never clears/,
    );
    expect(describeDebtOpportunityCost({ ...base, monthsSooner: 0, interestSaved: 0.2 }, money)).toMatch(
      /barely move it/,
    );
  });

  it("never says '0 months sooner' when only the interest moves", () => {
    const text = describeDebtOpportunityCost({ ...base, monthsSooner: 0, interestSaved: 18.6 }, money);
    expect(text).toBe(
      "$150/mo on Chase Visa instead would save $19 in interest, though it clears the same month.",
    );
    expect(text).not.toMatch(/0 months/);
  });
});

/* ── Cost per use ── */

describe("cost per use", () => {
  it("spreads the price over every expected use", () => {
    // $600, 20x a month for 3 years = 720 uses -> $0.83
    expect(calcCostPerUse(600, 20, 3)).toBeCloseTo(0.8333, 3);
    expect(calcCostPerUse(1200, 1, 1)).toBe(100);
  });

  it("is null until both inputs are positive", () => {
    expect(calcCostPerUse(600, undefined, 3)).toBeNull();
    expect(calcCostPerUse(600, 20, undefined)).toBeNull();
    expect(calcCostPerUse(600, 0, 3)).toBeNull();
    expect(calcCostPerUse(0, 20, 3)).toBeNull();
    expect(calcCostPerUse(600, Number.NaN, 3)).toBeNull();
  });

  it("describes cents below a dollar and money above it", () => {
    const money = (n: number) => `$${n}`;
    expect(describeCostPerUse(0.8333, 20, 3, money)).toBe("about 83¢ per use (20x a month for 3 years)");
    expect(describeCostPerUse(12.5, 4, 1, money)).toBe("about $12.5 per use (4x a month for 1 year)");
  });
});

/* ── Per-row what-if nudges ── */

describe("calcPlanNudges", () => {
  const now = new Date(2026, 6, 15);
  const first = goal({ id: "first", targetAmount: 600, currentAmount: 0 });
  const second = goal({ id: "second", targetAmount: 1000, currentAmount: 0 });
  const almost = goal({ id: "almost", targetAmount: 500, currentAmount: 440 });

  it("+$25/mo and +$100 now both pull the first rollover plan forward", () => {
    // Base: 200/mo -> first ready month 3. +25: 225/mo -> still month 3 (600/225 = 2.67 -> 3).
    // With 250/mo it would be month 3 too; use 300 base to see a difference:
    // 300/mo -> month 2; 325/mo -> month 2. Pick numbers that move: 150/mo -> month 4; 175 -> month 4 (600/175=3.4->4).
    // 100/mo -> month 6; 125/mo -> month 5. That moves.
    const nudges = calcPlanNudges([first, second], "first", 100, "rollover", now);
    expect(nudges.extraMonthly).toEqual({ amount: NUDGE_MONTHLY_STEP, monthsSooner: 1 });
    // +100 today: 500 left at 100/mo -> month 5, one sooner than 6.
    expect(nudges.lumpSum).toEqual({ amount: NUDGE_LUMP_SUM, monthsSooner: 1, finishes: false });
  });

  it("hides a nudge that wouldn't change the date", () => {
    // 300/mo -> first ready month 2; 325/mo -> still month 2.
    const nudges = calcPlanNudges([first, second], "first", 300, "rollover", now);
    expect(nudges.extraMonthly).toBeNull();
    // +100 today: 500 left at 300/mo -> month 2 as well.
    expect(nudges.lumpSum).toBeNull();
  });

  it("offers to finish a nearly-funded plan with what's left, reporting the months skipped", () => {
    // 60 left at 100/mo under rollover with `almost` first -> ready month 1.
    const nudges = calcPlanNudges([almost, first], "almost", 100, "rollover", now);
    expect(nudges.lumpSum).toEqual({ amount: 60, monthsSooner: 1, finishes: true });
  });

  it("with no set-aside, a lump sum that finishes the plan 'makes it happen'", () => {
    const nudges = calcPlanNudges([almost], "almost", 0, "rollover", now);
    expect(nudges.extraMonthly).toEqual({ amount: NUDGE_MONTHLY_STEP, monthsSooner: Infinity });
    expect(nudges.lumpSum).toEqual({ amount: 60, monthsSooner: Infinity, finishes: true });
  });

  it("is empty for funded or unknown plans", () => {
    const done = goal({ id: "done", targetAmount: 100, currentAmount: 100 });
    expect(calcPlanNudges([done], "done", 100, "rollover", now)).toEqual({
      extraMonthly: null,
      lumpSum: null,
    });
    expect(calcPlanNudges([first], "nope", 100, "rollover", now)).toEqual({
      extraMonthly: null,
      lumpSum: null,
    });
  });

  it("reflects the parallel split: a later plan still benefits from +$25/mo", () => {
    // Even split 100/mo -> 50 each: second (1000) ready month 20 (first done at
    // month 12, then second gets 100/mo: 12*50=600, 400 left / 100 = 4 -> month 16).
    // +25: 62.5 each -> first done month 10 (625), second has 625, 375 left / 125 = 3 -> month 13.
    const nudges = calcPlanNudges([first, second], "second", 100, "parallel", now);
    expect(nudges.extraMonthly).toEqual({ amount: NUDGE_MONTHLY_STEP, monthsSooner: 3 });
  });
});

/* ── Stacked cumulative-savings chart ── */

describe("simulatePlanBalances", () => {
  const first = goal({ id: "first", targetAmount: 300, currentAmount: 0 });
  const second = goal({ id: "second", targetAmount: 500, currentAmount: 100 });

  it("tracks each plan's balance month by month under rollover, capped at its target", () => {
    const series = simulatePlanBalances([first, second], 200, "rollover", 4);
    // first: 0, 200, 300 (done, 100 rolls over), 300, 300
    expect(series[0]).toEqual([0, 200, 300, 300, 300]);
    // second: 100, 100, 200, 400, 500 (capped)
    expect(series[1]).toEqual([100, 100, 200, 400, 500]);
  });

  it("splits evenly under parallel and re-splits a finished plan's share", () => {
    const series = simulatePlanBalances([first, second], 200, "parallel", 3);
    // 100 each: first 100, 200, 300(done at m3); second 200, 300, 400
    expect(series[0]).toEqual([0, 100, 200, 300]);
    expect(series[1]).toEqual([100, 200, 300, 400]);
  });

  it("stays flat with no set-aside and agrees with the projection's ready months", () => {
    expect(simulatePlanBalances([first], 0, "rollover", 2)).toEqual([[0, 0, 0]]);
    const projection = projectPurchasePlans([first, second], 200, "rollover");
    const series = simulatePlanBalances([first, second], 200, "rollover", 6);
    for (const item of projection.projections) {
      const index = item.goalId === "first" ? 0 : 1;
      const target = index === 0 ? 300 : 500;
      expect(series[index].findIndex((value) => value >= target)).toBe(item.readyInMonths);
    }
  });
});

describe("buildSavingsChart", () => {
  const now = new Date(2026, 6, 15);
  const first = goal({ id: "first", name: "Bike", targetAmount: 300, currentAmount: 0 });
  const second = goal({ id: "second", name: "Trip", targetAmount: 500, currentAmount: 100 });

  it("runs to the month the last plan funds, floored at the minimum horizon", () => {
    const model = buildSavingsChart([first, second], 200, "rollover", now);
    expect(model).not.toBeNull();
    // Last plan funds in month 4 -> clamped up to MIN_CHART_MONTHS.
    expect(model!.months).toBe(MIN_CHART_MONTHS);
    expect(model!.series.map((s) => s.name)).toEqual(["Bike", "Trip"]);
    expect(model!.series[0].readyAtMonth).toBe(2);
    expect(model!.series[1].readyAtMonth).toBe(4);
    expect(model!.totalTarget).toBe(800);
    expect(model!.peakTotal).toBe(800);
    expect(model!.series[0].values).toHaveLength(MIN_CHART_MONTHS + 1);
  });

  it("reports each plan's progress as a share of its own target, capped at 1", () => {
    const model = buildSavingsChart([first, second], 200, "rollover", now);
    // Bike: 0 -> 200 -> 300 (funded), then flat.
    expect(model!.series[0].progress.slice(0, 4)).toEqual([0, 200 / 300, 1, 1]);
    // Trip starts at 100/500 and only moves once Bike is funded.
    expect(model!.series[1].progress.slice(0, 5)).toEqual([0.2, 0.2, 0.4, 0.8, 1]);
    expect(model!.series[1].progress.every((value) => value <= 1)).toBe(true);
  });

  it("caps a long horizon and reports plans that never fund within it", () => {
    const slow = goal({ id: "slow", targetAmount: 100_000, currentAmount: 0 });
    const model = buildSavingsChart([slow], 50, "rollover", now);
    expect(model!.months).toBe(MAX_CHART_MONTHS);
    expect(model!.series[0].readyAtMonth).toBeNull();
    expect(model!.peakTotal).toBe(50 * MAX_CHART_MONTHS);
  });

  it("keeps funded plans in the stack, flat at their target, with ready-at 0", () => {
    const done = goal({ id: "done", targetAmount: 100, currentAmount: 100 });
    const model = buildSavingsChart([done, first], 100, "rollover", now);
    expect(model!.series[0].values.every((value) => value === 100)).toBe(true);
    expect(model!.series[0].readyAtMonth).toBe(0);
  });

  it("is null with no plans", () => {
    expect(buildSavingsChart([], 100, "rollover", now)).toBeNull();
  });
});

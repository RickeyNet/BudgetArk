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
  calcCombinedSliderMax,
  calcMonthlyCashFlow,
  calcPurchaseSliderMax,
  calcPurchaseTimeline,
  calcRequiredMonthly,
  monthsUntilTarget,
  movePlanInOrder,
  orderPurchasePlans,
  projectPurchasePlans,
  PURCHASE_LOOKBACK_MONTHS,
  suggestCombinedMonthly,
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

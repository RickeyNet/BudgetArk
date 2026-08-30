// BudgetArk - Purchase Planner tests
//
// Pins the pure math behind the Charts-tab "Plan a Purchase" tool:
// monthly cash flow from budget history, the save-up timeline, the
// required-monthly-by-date calculation, the affordability fit tiers, and
// the Ark-milestone guidance mapping. The debt trade-off shown alongside
// the tool reuses calcDebtRedirectImpact, pinned in whatIfSpending.test.ts.

import type { BudgetEntry, DebtMilestoneKey, DebtMilestonePlan } from "../../types";
import { DEFAULT_DEBT_MILESTONE_STEPS } from "../../types";
import {
  assessPurchaseFit,
  buildArkPurchaseGuidance,
  calcMonthlyCashFlow,
  calcPurchaseSliderMax,
  calcPurchaseTimeline,
  calcRequiredMonthly,
  monthsUntilTarget,
  PURCHASE_LOOKBACK_MONTHS,
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

// BudgetArk - Charts Screen Calculators tests
//
// Pins the pure math extracted from ChartsScreen.tsx (loan summaries + CSV
// shaping, refinance break-even, emergency-fund targets, Rule of 72, and
// the budget-derived average monthly expenses). These numbers render
// directly on screen, so the tests pin the exact legacy values - rounding
// quirks included - rather than "nicer" alternatives.

import type { BudgetEntry } from "../../types";
import { calcPaymentForGoalDate } from "../calculations";
import {
  buildLoanScheduleCsv,
  buildLoanScheduleFilename,
  buildLoanYearlySummary,
  calcAutoFillYearsRemaining,
  calcAvgMonthlyExpenses,
  calcBalanceWeightedRate,
  calcEmergencyFundPlan,
  calcRefiComparison,
  calcRuleOf72Years,
  resolveEmergencyFundExpenses,
  sumRefinanceBalance,
  summarizeLoanCosts,
} from "../chartCalculators";
import type { LoanScheduleRow } from "../chartCalculators";

/** Builds a schedule row with a payment split; balance defaults to 0. */
const row = (
  month: number,
  principalPaid: number,
  interestPaid: number,
  balance = 0
): LoanScheduleRow => ({ month, principalPaid, interestPaid, balance });

describe("buildLoanScheduleCsv", () => {
  it("emits the header plus one line per month with 2dp money columns", () => {
    const csv = buildLoanScheduleCsv([
      row(1, 100.005, 50.001, 900.4),
      row(13, 110, 40, 790.4),
    ]);
    expect(csv.split("\n")).toEqual([
      "Year,Month,Payment,Principal,Interest,RemainingBalance",
      // toFixed quirk pinned: 100.005 sits just below the half in binary
      // float, so principal renders "100.00" while the summed payment
      // (150.006) rounds up to "150.01".
      "1,1,150.01,100.00,50.00,900.40",
      // Month 13 rolls into year 2 via ceil(month / 12).
      "2,13,150.00,110.00,40.00,790.40",
    ]);
  });

  it("returns only the header for an empty schedule", () => {
    expect(buildLoanScheduleCsv([])).toBe(
      "Year,Month,Payment,Principal,Interest,RemainingBalance"
    );
  });
});

describe("buildLoanScheduleFilename", () => {
  it("stamps the injected date with : and . replaced by dashes", () => {
    const filename = buildLoanScheduleFilename(
      new Date("2026-07-16T12:34:56.789Z")
    );
    expect(filename).toBe("budgetark-amortization-2026-07-16T12-34-56-789Z.csv");
  });
});

describe("buildLoanYearlySummary", () => {
  it("returns an empty array for an empty schedule", () => {
    expect(buildLoanYearlySummary([])).toEqual([]);
  });

  it("groups 12-payment chunks and lets the final year run short", () => {
    const schedule = [
      ...Array.from({ length: 12 }, (_, i) => row(i + 1, 100, 10, 1200 - (i + 1) * 100)),
      row(13, 100, 5, 0),
    ];
    const summary = buildLoanYearlySummary(schedule);
    expect(summary).toHaveLength(2);
    expect(summary[0]).toEqual({
      year: 1,
      payment: 12 * 110,
      principal: 1200,
      interest: 120,
      endingBalance: 0, // month 12's balance
    });
    expect(summary[1]).toEqual({
      year: 2,
      payment: 105,
      principal: 100,
      interest: 5,
      endingBalance: 0,
    });
  });
});

describe("summarizeLoanCosts", () => {
  it("returns all zeros (including the share guard) for an empty schedule", () => {
    expect(summarizeLoanCosts([])).toEqual({
      totalPaid: 0,
      totalInterest: 0,
      firstFiveYearsMonths: 0,
      interestFirstFiveYears: 0,
      principalFirstFiveYears: 0,
      interestFirstFiveYearsShare: 0,
    });
  });

  it("treats a loan shorter than 60 months as 100% first-five-years", () => {
    const summary = summarizeLoanCosts([row(1, 500, 20), row(2, 500, 10)]);
    expect(summary.totalPaid).toBe(1030);
    expect(summary.totalInterest).toBe(30);
    expect(summary.firstFiveYearsMonths).toBe(2);
    expect(summary.interestFirstFiveYears).toBe(30);
    expect(summary.principalFirstFiveYears).toBe(1000);
    expect(summary.interestFirstFiveYearsShare).toBe(1);
  });

  it("slices exactly the first 60 months of a longer loan", () => {
    // 120 months: $10 interest each of the first 60, $5 each after.
    const schedule = Array.from({ length: 120 }, (_, i) =>
      row(i + 1, 100, i < 60 ? 10 : 5)
    );
    const summary = summarizeLoanCosts(schedule);
    expect(summary.firstFiveYearsMonths).toBe(60);
    expect(summary.interestFirstFiveYears).toBe(600);
    expect(summary.principalFirstFiveYears).toBe(6000);
    expect(summary.totalInterest).toBe(900);
    expect(summary.interestFirstFiveYearsShare).toBeCloseTo(600 / 900, 12);
  });

  it("keeps the share at 0 for a 0% loan (no divide-by-zero)", () => {
    const summary = summarizeLoanCosts([row(1, 500, 0)]);
    expect(summary.interestFirstFiveYearsShare).toBe(0);
  });
});

describe("calcRuleOf72Years", () => {
  it("rounds 72 / rate to whole years", () => {
    expect(calcRuleOf72Years(7)).toBe(10); // 10.28 -> 10
    expect(calcRuleOf72Years(6)).toBe(12);
    expect(calcRuleOf72Years(10)).toBe(7); // 7.2 -> 7
    expect(calcRuleOf72Years(30)).toBe(2); // 2.4 -> 2
  });

  it("returns 0 for zero or negative rates (screen hides the insight)", () => {
    expect(calcRuleOf72Years(0)).toBe(0);
    expect(calcRuleOf72Years(-5)).toBe(0);
  });
});

describe("sumRefinanceBalance", () => {
  it("sums balances, treating negatives as 0", () => {
    expect(sumRefinanceBalance([])).toBe(0);
    expect(
      sumRefinanceBalance([{ balance: 1000 }, { balance: -250 }, { balance: 500 }])
    ).toBe(1500);
  });
});

describe("calcBalanceWeightedRate", () => {
  it("weights each APR by its (non-negative) balance", () => {
    const debts = [
      { balance: 1000, rate: 10 },
      { balance: 3000, rate: 20 },
    ];
    expect(calcBalanceWeightedRate(debts, 4000)).toBe(17.5);
  });

  it("ignores negative balances in the numerator", () => {
    const debts = [
      { balance: -500, rate: 50 },
      { balance: 1000, rate: 10 },
    ];
    expect(calcBalanceWeightedRate(debts, 1000)).toBe(10);
  });

  it("returns 0 when the combined balance is zero or negative", () => {
    expect(calcBalanceWeightedRate([{ balance: 0, rate: 10 }], 0)).toBe(0);
    expect(calcBalanceWeightedRate([], -1)).toBe(0);
  });
});

describe("calcAutoFillYearsRemaining", () => {
  const monthsByGoal: Record<string, number> = {
    "2028-01": 18,
    "2032-01": 66,
  };
  const fakeMonthsUntil = (iso: string) => monthsByGoal[iso] ?? 0;

  it("returns null when it must not overwrite the user's manual value", () => {
    expect(calcAutoFillYearsRemaining([], 0, fakeMonthsUntil)).toBeNull();
    expect(
      calcAutoFillYearsRemaining([{ balance: 0, goalDate: "2028-01" }], 0, fakeMonthsUntil)
    ).toBeNull();
    expect(
      calcAutoFillYearsRemaining(
        [{ balance: 1000, goalDate: "2028-01" }, { balance: 500 }],
        1500,
        fakeMonthsUntil
      )
    ).toBeNull();
  });

  it("balance-weights the months and rounds to whole years", () => {
    const debts = [
      { balance: 1000, goalDate: "2028-01" }, // 18 months
      { balance: 3000, goalDate: "2032-01" }, // 66 months
    ];
    // (1000*18 + 3000*66) / 4000 = 54 months -> 4.5 years -> rounds to 5
    // (Math.round rounds halves up).
    expect(calcAutoFillYearsRemaining(debts, 4000, fakeMonthsUntil)).toBe(5);
  });

  it("clamps to the slider's 1-30 year range", () => {
    expect(
      calcAutoFillYearsRemaining(
        [{ balance: 1000, goalDate: "2028-01" }],
        1000,
        () => 2 // ~0.17 years -> rounds to 0 -> clamped to 1
      )
    ).toBe(1);
    expect(
      calcAutoFillYearsRemaining(
        [{ balance: 1000, goalDate: "2032-01" }],
        1000,
        () => 400 // 33.3 years -> clamped to 30
      )
    ).toBe(30);
  });
});

describe("calcRefiComparison", () => {
  it("zeroes out and reports no break-even when nothing is selected", () => {
    const result = calcRefiComparison({
      balance: 0,
      currentRate: 6,
      currentTermYears: 20,
      newRate: 5,
      newTermYears: 30,
      closingCosts: 4000,
    });
    expect(result.currentMonthlyPayment).toBe(0);
    expect(result.newMonthlyPayment).toBe(0);
    expect(result.currentTotalInterest).toBe(0);
    expect(result.newTotalInterest).toBe(0);
    expect(result.monthlyDelta).toBe(0);
    expect(result.breakEvenMonths).toBeNull();
    // Legacy quirk pinned: with no selection the net savings is just the
    // negated closing costs (0 * months - costs). The screen never shows
    // it in this state, but the value must not drift.
    expect(result.netSavingsOverNewTerm).toBe(-4000);
    expect(result.extendsTerm).toBe(true);
  });

  it("handles 0% rates with straight division and zero interest", () => {
    const result = calcRefiComparison({
      balance: 12000,
      currentRate: 0,
      currentTermYears: 1,
      newRate: 0,
      newTermYears: 2,
      closingCosts: 1000,
    });
    expect(result.currentMonthlyPayment).toBe(1000);
    expect(result.newMonthlyPayment).toBe(500);
    expect(result.currentTotalInterest).toBe(0);
    expect(result.newTotalInterest).toBe(0);
    expect(result.monthlyDelta).toBe(500);
    expect(result.breakEvenMonths).toBe(2); // 1000 / 500
    expect(result.netSavingsOverNewTerm).toBe(500 * 24 - 1000);
    expect(result.extendsTerm).toBe(true);
  });

  it("computes payments, interest deltas, and break-even for a rate drop", () => {
    const result = calcRefiComparison({
      balance: 200000,
      currentRate: 7,
      currentTermYears: 25,
      newRate: 5,
      newTermYears: 25,
      closingCosts: 6000,
    });
    // Payments must come from the shared annuity formula (pinned in
    // calculations.test.ts) - the comparison only composes it.
    expect(result.currentMonthlyPayment).toBe(calcPaymentForGoalDate(200000, 7, 300));
    expect(result.newMonthlyPayment).toBe(calcPaymentForGoalDate(200000, 5, 300));
    expect(result.currentMonthlyPayment).toBeGreaterThan(result.newMonthlyPayment);
    expect(result.monthlyDelta).toBeGreaterThan(0);
    expect(result.interestDelta).toBeGreaterThan(0);
    expect(result.breakEvenMonths).toBeCloseTo(
      6000 / result.monthlyDelta,
      12
    );
    expect(result.extendsTerm).toBe(false);
  });

  it("reports no break-even when the new payment is not lower", () => {
    const result = calcRefiComparison({
      balance: 100000,
      currentRate: 5,
      currentTermYears: 20,
      newRate: 8,
      newTermYears: 20,
      closingCosts: 3000,
    });
    expect(result.monthlyDelta).toBeLessThan(0);
    expect(result.breakEvenMonths).toBeNull();
    expect(result.interestDelta).toBeLessThan(0);
  });

  it("guards total interest against a non-finite payment", () => {
    // 0 years remaining makes calcPaymentForGoalDate return Infinity; the
    // isFinite guard must keep total interest at 0 instead of NaN.
    const result = calcRefiComparison({
      balance: 50000,
      currentRate: 6,
      currentTermYears: 0,
      newRate: 5,
      newTermYears: 30,
      closingCosts: 2000,
    });
    expect(result.currentMonthlyPayment).toBe(Infinity);
    expect(result.currentTotalInterest).toBe(0);
    expect(Number.isFinite(result.newTotalInterest)).toBe(true);
  });
});

describe("resolveEmergencyFundExpenses", () => {
  it("falls back to the budget average when the override is empty", () => {
    expect(resolveEmergencyFundExpenses("", 2100)).toBe(2100);
  });

  it("parses the override, collapsing unparsable text and '0' to 0", () => {
    expect(resolveEmergencyFundExpenses("1800", 2100)).toBe(1800);
    expect(resolveEmergencyFundExpenses("1800.50", 2100)).toBe(1800.5);
    expect(resolveEmergencyFundExpenses(".", 2100)).toBe(0);
    expect(resolveEmergencyFundExpenses("0", 2100)).toBe(0);
  });
});

describe("calcEmergencyFundPlan", () => {
  it("returns all zeros when monthly expenses are zero", () => {
    expect(calcEmergencyFundPlan(0, 5000, 500)).toEqual({
      threeMonthTarget: 0,
      sixMonthTarget: 0,
      threeMonthProgress: 0,
      sixMonthProgress: 0,
      threeMonthRemaining: 0,
      sixMonthRemaining: 0,
      monthsToThree: 0,
      monthsToSix: 0,
    });
  });

  it("computes targets, progress, and ceil'd months-to-goal", () => {
    const plan = calcEmergencyFundPlan(2000, 3000, 500);
    expect(plan.threeMonthTarget).toBe(6000);
    expect(plan.sixMonthTarget).toBe(12000);
    expect(plan.threeMonthProgress).toBe(0.5);
    expect(plan.sixMonthProgress).toBe(0.25);
    expect(plan.threeMonthRemaining).toBe(3000);
    expect(plan.sixMonthRemaining).toBe(9000);
    expect(plan.monthsToThree).toBe(6);
    expect(plan.monthsToSix).toBe(18);
  });

  it("rounds partial months up", () => {
    // 3001 remaining at 500/mo is 6.002 months -> 7.
    const plan = calcEmergencyFundPlan(2000, 2999, 500);
    expect(plan.monthsToThree).toBe(7);
  });

  it("caps progress at 1 and stops counting months once a target is reached", () => {
    const plan = calcEmergencyFundPlan(1000, 5000, 250);
    expect(plan.threeMonthProgress).toBe(1);
    expect(plan.threeMonthRemaining).toBe(0);
    expect(plan.monthsToThree).toBe(0);
    expect(plan.sixMonthProgress).toBeCloseTo(5000 / 6000, 12);
    expect(plan.monthsToSix).toBe(4);
  });

  it("reports 0 months-to-goal when monthly savings is zero", () => {
    const plan = calcEmergencyFundPlan(2000, 0, 0);
    expect(plan.monthsToThree).toBe(0);
    expect(plan.monthsToSix).toBe(0);
  });
});

describe("calcAvgMonthlyExpenses", () => {
  // Fixed "today": 2026-07-15, so the tracked window is 2026-01 .. 2026-06.
  const NOW = new Date(2026, 6, 15);

  const entry = (
    overrides: Pick<BudgetEntry, "type" | "amount" | "date"> &
      Partial<BudgetEntry>
  ): BudgetEntry => ({
    id: "test-entry",
    category: "Food",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  });

  it("returns 0 with no entries", () => {
    expect(calcAvgMonthlyExpenses([], NOW)).toBe(0);
  });

  it("averages only over months the user actually tracked", () => {
    const entries = [
      entry({ type: "expense", amount: 300, date: "2026-03-15T12:00:00.000Z" }),
    ];
    // One tracked month -> 300 / 1, not 300 / 6.
    expect(calcAvgMonthlyExpenses(entries, NOW)).toBe(300);
  });

  it("counts an income-only month as a tracked $0-expense month", () => {
    const entries = [
      entry({ type: "expense", amount: 600, date: "2026-02-10T12:00:00.000Z" }),
      entry({ type: "income", amount: 100, date: "2026-04-10T12:00:00.000Z" }),
    ];
    // 2026-04 joins the denominator with $0 expenses: (600 + 0) / 2.
    expect(calcAvgMonthlyExpenses(entries, NOW)).toBe(300);
  });

  it("projects recurring entries into every month of the window", () => {
    const entries = [
      entry({
        type: "expense",
        amount: 120,
        date: "2025-12-01T12:00:00.000Z",
        recurring: true,
        recurrenceInterval: 1,
      }),
    ];
    expect(calcAvgMonthlyExpenses(entries, NOW)).toBe(120);
  });

  it("ignores the current month and months outside the window", () => {
    const entries = [
      entry({ type: "expense", amount: 999, date: "2026-07-01T12:00:00.000Z" }),
      entry({ type: "expense", amount: 888, date: "2025-11-01T12:00:00.000Z" }),
    ];
    expect(calcAvgMonthlyExpenses(entries, NOW)).toBe(0);
  });

  it("rounds the average to a whole dollar", () => {
    const entries = [
      entry({ type: "expense", amount: 100, date: "2026-01-10T12:00:00.000Z" }),
      entry({ type: "expense", amount: 101, date: "2026-02-10T12:00:00.000Z" }),
    ];
    // 201 / 2 = 100.5 -> Math.round -> 101.
    expect(calcAvgMonthlyExpenses(entries, NOW)).toBe(101);
  });
});

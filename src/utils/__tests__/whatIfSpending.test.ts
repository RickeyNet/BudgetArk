// BudgetArk - "What If I Stopped Spending on X" projection tests
//
// Pins the pure math behind the Charts-tab what-if tool: per-category
// average monthly spend from budget history, the debt-payoff impact of an
// extra monthly payment, and the savings-side growth marks. The heavy
// simulation/annuity math itself is pinned in calculations.test.ts; these
// tests focus on the shaping, filtering, and edge-case policy this module
// layers on top.

import type { BudgetEntry } from "../../types";
import { calcInvestmentGrowth } from "../calculations";
import {
  buildCategorySpendOptions,
  buildSavingsGrowthMarks,
  calcDebtRedirectImpact,
  calcRedirectSliderMax,
  formatWhatIfMonths,
  WHAT_IF_LOOKBACK_MONTHS,
  WHAT_IF_SAVINGS_YEARS,
} from "../whatIfSpending";

/** Fixed "today" so the 6-month lookback window is deterministic. */
const NOW = new Date(2026, 6, 15); // July 15, 2026 → window Jan..Jun 2026

const entry = (overrides: Partial<BudgetEntry>): BudgetEntry => ({
  id: "e1",
  type: "expense",
  category: "Entertainment",
  amount: 50,
  date: "2026-05-10",
  createdAt: "2026-05-10T00:00:00.000Z",
  updatedAt: "2026-05-10T00:00:00.000Z",
  ...overrides,
});

describe("buildCategorySpendOptions", () => {
  it("returns an empty list when there is no history", () => {
    expect(buildCategorySpendOptions([], NOW)).toEqual([]);
  });

  it("averages over tracked months and sorts biggest first", () => {
    const entries = [
      entry({ id: "a", category: "Entertainment", amount: 60, date: "2026-05-10" }),
      entry({ id: "b", category: "Entertainment", amount: 40, date: "2026-06-02" }),
      entry({ id: "c", category: "Restaurant", amount: 300, date: "2026-06-20" }),
    ];
    // Two tracked months (May + June): Restaurant 300/2, Entertainment 100/2.
    expect(buildCategorySpendOptions(entries, NOW)).toEqual([
      { category: "Restaurant", monthlyAverage: 150, monthsTracked: 2 },
      { category: "Entertainment", monthlyAverage: 50, monthsTracked: 2 },
    ]);
  });

  it("counts income-only months in the denominator (user was tracking)", () => {
    const entries = [
      entry({ id: "a", category: "Shopping", amount: 90, date: "2026-06-05" }),
      entry({ id: "b", type: "income", category: "Salary", amount: 2000, date: "2026-05-01" }),
      entry({ id: "c", type: "income", category: "Salary", amount: 2000, date: "2026-04-01" }),
    ];
    expect(buildCategorySpendOptions(entries, NOW)).toEqual([
      { category: "Shopping", monthlyAverage: 30, monthsTracked: 3 },
    ]);
  });

  it("excludes the current month, months outside the window, income, and Debt Payments", () => {
    const entries = [
      entry({ id: "a", category: "Travel", amount: 500, date: "2026-07-01" }), // current month
      entry({ id: "b", category: "Travel", amount: 500, date: "2025-12-31" }), // too old
      entry({ id: "c", type: "income", category: "Salary", amount: 4000, date: "2026-06-01" }),
      entry({ id: "d", category: "Debt Payments", amount: 250, date: "2026-06-01" }),
      entry({ id: "e", category: "Grocery", amount: 120, date: "2026-06-14" }),
    ];
    expect(buildCategorySpendOptions(entries, NOW)).toEqual([
      { category: "Grocery", monthlyAverage: 120, monthsTracked: 1 },
    ]);
  });

  it("counts a monthly recurring entry in every window month from its start", () => {
    const entries = [
      entry({
        id: "a",
        category: "Tech",
        amount: 30,
        date: "2026-01-05",
        recurring: true,
      }),
    ];
    // Active Jan..Jun = all 6 window months.
    expect(buildCategorySpendOptions(entries, NOW)).toEqual([
      { category: "Tech", monthlyAverage: 30, monthsTracked: WHAT_IF_LOOKBACK_MONTHS },
    ]);
  });
});

describe("calcDebtRedirectImpact", () => {
  const debt = (overrides: Partial<{ id: string; balance: number; rate: number; minPayment: number }>) => ({
    id: "d1",
    balance: 1200,
    rate: 0,
    minPayment: 100,
    ...overrides,
  });

  it("shaves months off a solvable plan", () => {
    const impact = calcDebtRedirectImpact([debt({})], "snowball", 100);
    expect(impact.baseline.monthsToPayoff).toBe(12);
    expect(impact.redirect.monthsToPayoff).toBe(6);
    expect(impact.monthsSaved).toBe(6);
    expect(impact.interestSaved).toBe(0);
  });

  it("reports interest saved on an interest-bearing debt", () => {
    const impact = calcDebtRedirectImpact(
      [debt({ balance: 10000, rate: 20, minPayment: 300 })],
      "avalanche",
      200
    );
    expect(impact.monthsSaved).toBeGreaterThan(0);
    expect(impact.interestSaved).toBeGreaterThan(0);
    expect(impact.redirect.totalInterestPaid).toBeLessThan(
      impact.baseline.totalInterestPaid
    );
  });

  it("flags an unsolvable→solvable flip with Infinity monthsSaved and no interest delta", () => {
    // 5%/mo interest = $500; minimum alone can't keep up, extra $300 can.
    const impact = calcDebtRedirectImpact(
      [debt({ balance: 10000, rate: 60, minPayment: 400 })],
      "snowball",
      300
    );
    expect(impact.baseline.isPayoffPossible).toBe(false);
    expect(impact.redirect.isPayoffPossible).toBe(true);
    expect(impact.monthsSaved).toBe(Infinity);
    expect(impact.interestSaved).toBe(0);
  });

  it("returns zero savings when both plans are unsolvable", () => {
    const impact = calcDebtRedirectImpact(
      [debt({ balance: 10000, rate: 60, minPayment: 400 })],
      "snowball",
      50
    );
    expect(impact.redirect.isPayoffPossible).toBe(false);
    expect(impact.monthsSaved).toBe(0);
    expect(impact.interestSaved).toBe(0);
  });

  it("is a no-op at zero redirect amount", () => {
    const impact = calcDebtRedirectImpact([debt({})], "snowball", 0);
    expect(impact.monthsSaved).toBe(0);
    expect(impact.interestSaved).toBe(0);
  });
});

describe("buildSavingsGrowthMarks", () => {
  it("uses the default horizons and matches the shared growth math", () => {
    const marks = buildSavingsGrowthMarks(100, 7);
    expect(marks.map((m) => m.years)).toEqual([...WHAT_IF_SAVINGS_YEARS]);
    for (const mark of marks) {
      expect(mark.futureValue).toBe(
        Math.round(calcInvestmentGrowth(100, 7, mark.years))
      );
      expect(mark.contributed).toBe(100 * 12 * mark.years);
      expect(mark.growth).toBe(Math.max(0, mark.futureValue - mark.contributed));
    }
  });

  it("shows pure contributions at a 0% return", () => {
    const marks = buildSavingsGrowthMarks(200, 0, [5]);
    expect(marks).toEqual([
      { years: 5, futureValue: 12000, contributed: 12000, growth: 0 },
    ]);
  });
});

describe("formatWhatIfMonths", () => {
  it("formats durations like the Debt Tracker", () => {
    expect(formatWhatIfMonths(Infinity)).toBe("Not solvable");
    expect(formatWhatIfMonths(0)).toBe("0 months");
    expect(formatWhatIfMonths(5)).toBe("5 mo");
    expect(formatWhatIfMonths(12)).toBe("1 yr");
    expect(formatWhatIfMonths(17)).toBe("1 yr 5 mo");
  });
});

describe("calcRedirectSliderMax", () => {
  it("doubles the average rounded up to $25, with a $100 floor", () => {
    expect(calcRedirectSliderMax(10)).toBe(100);
    expect(calcRedirectSliderMax(130)).toBe(275);
    expect(calcRedirectSliderMax(500)).toBe(1000);
  });
});

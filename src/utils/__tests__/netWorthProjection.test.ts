/**
 * BudgetArk - Net Worth Projection Tests
 * File: src/utils/__tests__/netWorthProjection.test.ts
 *
 * Goal parse (fail-closed), the surplus estimate and its transfer
 * exclusions, the minimums-only debt schedule, the forward line, and the
 * goal assessment (on/off track, required pace, reach date).
 */

import { makeBudgetEntry, makeDebt } from "../../__tests__/fixtures";
import {
  buildNetWorthOutlook,
  estimateMonthlySurplus,
  monthsUntilGoal,
  parseNetWorthGoal,
  projectDebtBalances,
  projectNetWorth,
  PROJECTION_DEFAULT_MONTHS,
  PROJECTION_MAX_MONTHS,
  suggestGoalMonth,
} from "../netWorthProjection";

const NOW = new Date(2026, 8, 15);

const monthKeyAt = (offset: number): string => {
  const d = new Date(NOW.getFullYear(), NOW.getMonth() - offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

let seq = 0;
const entry = (offset: number, category: string, amount: number, type: "expense" | "income" = "expense") =>
  makeBudgetEntry({
    id: `e-${seq++}`,
    type,
    category,
    amount,
    date: `${monthKeyAt(offset)}-10T12:00:00.000Z`,
  });

describe("parseNetWorthGoal", () => {
  it("accepts a well-formed goal and rejects everything else", () => {
    const raw = '{"targetAmount":50000,"targetMonth":"2029-09","createdAt":"2026-09-02T00:00:00.000Z"}';
    expect(parseNetWorthGoal(raw)).toEqual({
      targetAmount: 50000,
      targetMonth: "2029-09",
      createdAt: "2026-09-02T00:00:00.000Z",
    });
    expect(parseNetWorthGoal(null)).toBeNull();
    expect(parseNetWorthGoal("{")).toBeNull();
    expect(parseNetWorthGoal('{"targetAmount":"50000","targetMonth":"2029-09","createdAt":"x"}')).toBeNull();
    expect(parseNetWorthGoal('{"targetAmount":5,"targetMonth":"2029-13","createdAt":"2026-09-02T00:00:00.000Z"}')).toBeNull();
    expect(parseNetWorthGoal('{"targetAmount":1e12,"targetMonth":"2029-09","createdAt":"2026-09-02T00:00:00.000Z"}')).toBeNull();
  });
});

describe("estimateMonthlySurplus", () => {
  beforeEach(() => {
    seq = 0;
  });

  it("averages income minus real spending over tracked months, minus debt minimums", () => {
    const entries = [1, 2, 3].flatMap((o) => [
      entry(o, "Salary", 3000, "income"),
      entry(o, "Grocery", 500),
      entry(o, "Savings", 400),
      entry(o, "Debt Payments", 200),
      entry(o, "Retirement", 100),
    ]);
    const debts = [makeDebt({ minPayment: 150 }), makeDebt({ id: "paid", balance: 0, minPayment: 999 })];
    expect(estimateMonthlySurplus(entries, debts, NOW)).toEqual({ monthly: 2350, monthsTracked: 3 });
  });

  it("ignores the current month and months past the lookback, and is zero with no history", () => {
    const entries = [entry(0, "Salary", 9000, "income"), entry(7, "Salary", 9000, "income")];
    expect(estimateMonthlySurplus(entries, [], NOW)).toEqual({ monthly: 0, monthsTracked: 0 });
  });
});

describe("projectDebtBalances", () => {
  it("applies interest then the minimum each month and stops at zero", () => {
    const line = projectDebtBalances([makeDebt({ balance: 100, rate: 12, minPayment: 60 })], 3);
    // 100 -> 100*1.01 - 60 = 41 -> 41.41 - 60 -> 0 -> 0
    expect(line).toEqual([100, 41, 0, 0]);
  });

  it("lets a balance grow when the minimum doesn't cover interest", () => {
    const line = projectDebtBalances([makeDebt({ balance: 1000, rate: 24, minPayment: 10 })], 1);
    expect(line[1]).toBe(1010);
  });
});

describe("projectNetWorth", () => {
  it("grows assets by the surplus while debts follow the schedule", () => {
    const points = projectNetWorth({
      currentAssets: 1000,
      debts: [makeDebt({ balance: 100, rate: 0, minPayment: 50 })],
      monthlySurplus: 200,
      months: 2,
    });
    expect(points).toEqual([
      { monthOffset: 0, assets: 1000, debt: 100, netWorth: 900, freedMinimums: 0 },
      { monthOffset: 1, assets: 1200, debt: 50, netWorth: 1150, freedMinimums: 0 },
      { monthOffset: 2, assets: 1400, debt: 0, netWorth: 1400, freedMinimums: 0 },
    ]);
  });

  it("returns a retired debt's minimum to the asset side instead of deducting it forever", () => {
    // Surplus after the $100 minimum is $400; the debt is gone after month 3
    // (three full payments), so from month 4 the whole $500 lands on assets.
    const points = projectNetWorth({
      currentAssets: 0,
      debts: [makeDebt({ balance: 300, rate: 0, minPayment: 100 })],
      monthlySurplus: 400,
      months: 5,
    });
    expect(points.map((p) => [p.debt, p.freedMinimums, p.assets])).toEqual([
      [300, 0, 0],
      [200, 0, 400],
      [100, 0, 800],
      [0, 0, 1200],
      [0, 100, 1700],
      [0, 200, 2200],
    ]);
  });

  it("frees the unused part of a final short payment", () => {
    // $150 owed at $100/mo: month 2 pays only the $50 left, freeing $50.
    const points = projectNetWorth({
      currentAssets: 0,
      debts: [makeDebt({ balance: 150, rate: 0, minPayment: 100 })],
      monthlySurplus: 0,
      months: 3,
    });
    expect(points.map((p) => [p.debt, p.freedMinimums])).toEqual([
      [150, 0],
      [50, 0],
      [0, 50],
      [0, 150],
    ]);
  });

  it("caps the horizon", () => {
    expect(projectNetWorth({ currentAssets: 0, debts: [], monthlySurplus: 1, months: 999 })).toHaveLength(
      PROJECTION_MAX_MONTHS + 1
    );
  });
});

describe("buildNetWorthOutlook", () => {
  beforeEach(() => {
    seq = 0;
  });
  const history = [1, 2, 3, 4, 5, 6].flatMap((o) => [entry(o, "Salary", 3000, "income"), entry(o, "Grocery", 2500)]);

  it("uses the default horizon without a goal", () => {
    const outlook = buildNetWorthOutlook({ entries: history, debts: [], currentAssets: 1000, goal: null, now: NOW });
    expect(outlook.surplus).toEqual({ monthly: 500, monthsTracked: 6 });
    expect(outlook.horizonMonths).toBe(PROJECTION_DEFAULT_MONTHS);
    expect(outlook.points).toHaveLength(PROJECTION_DEFAULT_MONTHS + 1);
    expect(outlook.points[PROJECTION_DEFAULT_MONTHS].netWorth).toBe(1000 + 500 * PROJECTION_DEFAULT_MONTHS);
    expect(outlook.goal).toBeNull();
  });

  it("assesses an on-track goal", () => {
    const goal = { targetAmount: 6000, targetMonth: monthKeyAt(-12), createdAt: "2026-09-02T00:00:00.000Z" };
    const outlook = buildNetWorthOutlook({ entries: history, debts: [], currentAssets: 1000, goal, now: NOW });
    expect(outlook.horizonMonths).toBe(12);
    expect(outlook.goal).toMatchObject({
      monthsUntil: 12,
      projectedAtTarget: 7000,
      onTrack: true,
      gap: 1000,
      requiredMonthly: 416.67,
      reachMonths: 10,
    });
    expect(outlook.goal!.reachDate!.getFullYear()).toBe(2027);
    expect(outlook.goal!.reachDate!.getMonth()).toBe(6);
  });

  it("assesses an off-track goal, with the pace it would take and no reach date when never reached", () => {
    const goal = { targetAmount: 100000, targetMonth: monthKeyAt(-12), createdAt: "2026-09-02T00:00:00.000Z" };
    const outlook = buildNetWorthOutlook({
      entries: history,
      debts: [makeDebt({ balance: 1200, rate: 0, minPayment: 100 })],
      currentAssets: 1000,
      goal,
      now: NOW,
    });
    // surplus 500 - 100 minimum = 400/mo; debt gone by month 12.
    expect(outlook.surplus.monthly).toBe(400);
    expect(outlook.goal).toMatchObject({
      projectedAtTarget: 1000 + 400 * 12,
      onTrack: false,
      requiredMonthly: 8250,
      reachMonths: null,
      reachDate: null,
    });
    expect(outlook.goal!.gap).toBeLessThan(0);
  });

  it("keeps counting a retired debt's minimum toward a goal past its payoff", () => {
    // Same $1,200 debt at $100/mo (gone after month 12) but a 24-month goal:
    // months 13-24 add the freed $100 back, so 1000 + 400*24 + 100*12.
    const goal = { targetAmount: 100000, targetMonth: monthKeyAt(-24), createdAt: "2026-09-02T00:00:00.000Z" };
    const outlook = buildNetWorthOutlook({
      entries: history,
      debts: [makeDebt({ balance: 1200, rate: 0, minPayment: 100 })],
      currentAssets: 1000,
      goal,
      now: NOW,
    });
    expect(outlook.goal).toMatchObject({
      monthsUntil: 24,
      projectedAtTarget: 11800,
      // (100000 - (1000 assets + 1200 freed - 0 debt)) / 24
      requiredMonthly: 4075,
    });
  });

  it("looks past the horizon for the reach date and clamps a past goal month to one month", () => {
    const soon = { targetAmount: 2000, targetMonth: monthKeyAt(2), createdAt: "2026-09-02T00:00:00.000Z" };
    const outlook = buildNetWorthOutlook({ entries: history, debts: [], currentAssets: 1000, goal: soon, now: NOW });
    expect(outlook.horizonMonths).toBe(1);
    expect(outlook.goal!.monthsUntil).toBe(1);
    expect(outlook.goal!.onTrack).toBe(false);
    expect(outlook.goal!.reachMonths).toBe(2);
  });
});

describe("month helpers", () => {
  it("counts months to the goal month inclusive and suggests three years out", () => {
    expect(monthsUntilGoal("2027-09", NOW)).toBe(12);
    expect(monthsUntilGoal("2026-09", NOW)).toBe(1);
    expect(monthsUntilGoal("2020-01", NOW)).toBe(1);
    expect(suggestGoalMonth(NOW)).toBe("2029-09");
  });
});

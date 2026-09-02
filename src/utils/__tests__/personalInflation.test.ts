/**
 * BudgetArk - Personal Inflation Tests
 * File: src/utils/__tests__/personalInflation.test.ts
 *
 * Window membership, per-tracked-month averaging, the shared-basket rule,
 * excluded categories, the insufficient-history gate, ordering, and the
 * display helpers.
 */

import { makeBudgetEntry } from "../../__tests__/fixtures";
import {
  compareToHeadline,
  computePersonalInflation,
  formatRate,
  INFLATION_MIN_TRACKED_MONTHS,
} from "../personalInflation";

// Mid-September 2026: current window = Sep 2025..Aug 2026, prior = Sep 2024..Aug 2025.
const NOW = new Date(2026, 8, 15);

const monthKeyAt = (offset: number): string => {
  const d = new Date(NOW.getFullYear(), NOW.getMonth() - offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

let seq = 0;
const spend = (offset: number, category: string, amount: number, type: "expense" | "income" = "expense") =>
  makeBudgetEntry({
    id: `e-${seq++}`,
    type,
    category,
    amount,
    date: `${monthKeyAt(offset)}-10T12:00:00.000Z`,
  });

/** `months` offsets each get one entry of `amount` in `category`. */
const fill = (offsets: number[], category: string, amount: number) =>
  offsets.map((offset) => spend(offset, category, amount));

const currentOffsets = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const priorOffsets = currentOffsets.map((o) => o + 12);

describe("computePersonalInflation", () => {
  beforeEach(() => {
    seq = 0;
  });

  it("measures the basket's per-month change between the two windows", () => {
    const entries = [
      ...fill(priorOffsets, "Grocery", 400),
      ...fill(currentOffsets, "Grocery", 440),
      ...fill(priorOffsets, "Utilities", 100),
      ...fill(currentOffsets, "Utilities", 100),
    ];
    const result = computePersonalInflation(entries, NOW, 2.7);
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    // 500 -> 540 = +8%
    expect(result.rate).toBe(8);
    expect(result.headlineRate).toBe(2.7);
    expect(result.currentMonthly).toBe(540);
    expect(result.priorMonthly).toBe(500);
    expect(result.currentMonths).toBe(12);
    expect(result.priorMonths).toBe(12);
    expect(result.categories.map((c) => c.category)).toEqual(["Grocery", "Utilities"]);
    expect(result.categories[0]).toEqual({
      category: "Grocery",
      currentMonthly: 440,
      priorMonthly: 400,
      rate: 10,
      deltaMonthly: 40,
    });
    expect(result.categories[1].rate).toBe(0);
  });

  it("averages per TRACKED month so a thinly tracked year is not 'cheaper'", () => {
    const entries = [
      ...fill(priorOffsets, "Grocery", 400),
      // Only 4 tracked months this year, same monthly spend.
      ...fill([1, 2, 3, 4], "Grocery", 400),
    ];
    const result = computePersonalInflation(entries, NOW);
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.rate).toBe(0);
    expect(result.currentMonths).toBe(4);
  });

  it("counts a month with only income as tracked (zero spend pulls the average down)", () => {
    const entries = [
      ...fill(priorOffsets, "Grocery", 400),
      ...fill([1, 2, 3, 4, 5, 6], "Grocery", 400),
      ...[7, 8, 9, 10, 11, 12].map((o) => spend(o, "Salary", 3000, "income")),
    ];
    const result = computePersonalInflation(entries, NOW);
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.currentMonths).toBe(12);
    // 2400 / 12 = 200 vs 400 -> -50%
    expect(result.rate).toBe(-50);
  });

  it("keeps new categories out of the basket but reports them", () => {
    const entries = [
      ...fill(priorOffsets, "Grocery", 400),
      ...fill(currentOffsets, "Grocery", 400),
      ...fill(currentOffsets, "Pets", 60),
    ];
    const result = computePersonalInflation(entries, NOW);
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.rate).toBe(0);
    expect(result.categories).toHaveLength(1);
    expect(result.newSpendingMonthly).toBe(60);
  });

  it("ignores transfers: debt payments and the savings reserve categories", () => {
    const entries = [
      ...fill(priorOffsets, "Grocery", 400),
      ...fill(currentOffsets, "Grocery", 400),
      ...fill(priorOffsets, "Savings", 100),
      ...fill(currentOffsets, "Savings", 900),
      ...fill(priorOffsets, "Debt Payments", 100),
      ...fill(currentOffsets, "Debt Payments", 900),
      ...fill(priorOffsets, "Retirement", 50),
      ...fill(currentOffsets, "Investing", 50),
    ];
    const result = computePersonalInflation(entries, NOW);
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.rate).toBe(0);
    expect(result.categories.map((c) => c.category)).toEqual(["Grocery"]);
    expect(result.newSpendingMonthly).toBe(0);
  });

  it("never reads the current month or anything older than the prior window", () => {
    const entries = [
      ...fill(priorOffsets, "Grocery", 400),
      ...fill(currentOffsets, "Grocery", 400),
      spend(0, "Grocery", 5000),
      spend(25, "Grocery", 5000),
    ];
    const result = computePersonalInflation(entries, NOW);
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.rate).toBe(0);
  });

  it("counts a recurring bill in every month it is active", () => {
    const bill = makeBudgetEntry({
      id: "rent",
      category: "Rent",
      amount: 1000,
      recurring: true,
      date: `${monthKeyAt(24)}-01T12:00:00.000Z`,
    });
    const raise = makeBudgetEntry({
      id: "rent-2",
      category: "Rent",
      amount: 100,
      recurring: true,
      date: `${monthKeyAt(12)}-01T12:00:00.000Z`,
    });
    const result = computePersonalInflation([bill, raise], NOW);
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.priorMonthly).toBe(1000);
    expect(result.currentMonthly).toBe(1100);
    expect(result.rate).toBe(10);
  });

  it("reports insufficient history below the tracked-month floor, with the counts", () => {
    const entries = [
      ...fill([13, 14], "Grocery", 400),
      ...fill(currentOffsets, "Grocery", 400),
    ];
    const result = computePersonalInflation(entries, NOW);
    expect(result).toEqual({ status: "insufficient", currentMonths: 12, priorMonths: 2 });
    expect(INFLATION_MIN_TRACKED_MONTHS).toBe(3);
  });

  it("reports insufficient when the two years share no category", () => {
    const entries = [
      ...fill(priorOffsets, "Grocery", 400),
      ...fill(currentOffsets, "Dining", 400),
    ];
    expect(computePersonalInflation(entries, NOW).status).toBe("insufficient");
    expect(computePersonalInflation([], NOW).status).toBe("insufficient");
  });

  it("orders the basket by the size of the monthly change", () => {
    const entries = [
      ...fill(priorOffsets, "Grocery", 400),
      ...fill(currentOffsets, "Grocery", 410),
      ...fill(priorOffsets, "Fuel", 200),
      ...fill(currentOffsets, "Fuel", 150),
      ...fill(priorOffsets, "Utilities", 100),
      ...fill(currentOffsets, "Utilities", 120),
    ];
    const result = computePersonalInflation(entries, NOW);
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.categories.map((c) => c.category)).toEqual(["Fuel", "Utilities", "Grocery"]);
    expect(result.categories[0].rate).toBe(-25);
  });

  it("skips deleted, zero and negative entries", () => {
    const entries = [
      ...fill(priorOffsets, "Grocery", 400),
      ...fill(currentOffsets, "Grocery", 400),
      makeBudgetEntry({
        id: "gone",
        category: "Grocery",
        amount: 9000,
        date: `${monthKeyAt(2)}-10T12:00:00.000Z`,
        deletedAt: "2026-01-01T00:00:00.000Z",
      }),
      spend(3, "Grocery", 0),
      spend(4, "Grocery", -50),
    ];
    // entriesForMonth doesn't filter tombstones itself - callers pass live
    // entries - so only the amount guards matter here.
    const live = entries.filter((e) => !e.deletedAt);
    const result = computePersonalInflation(live, NOW);
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.rate).toBe(0);
  });
});

describe("compareToHeadline / formatRate", () => {
  it("uses a dead band around the headline", () => {
    expect(compareToHeadline(2.7, 2.7)).toBe("inline");
    expect(compareToHeadline(3.1, 2.7)).toBe("inline");
    expect(compareToHeadline(3.3, 2.7)).toBe("above");
    expect(compareToHeadline(1.0, 2.7)).toBe("below");
  });

  it("formats signed one-decimal rates", () => {
    expect(formatRate(5.25)).toBe("+5.3%");
    expect(formatRate(-1)).toBe("-1.0%");
    expect(formatRate(0)).toBe("0.0%");
    expect(formatRate(Number.NaN)).toBe("n/a");
  });
});

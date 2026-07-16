/**
 * BudgetArk - Paycheck Math Tests
 * File: src/utils/__tests__/paycheckMath.test.ts
 *
 * Covers the W-2 / 1099 income-type helpers: per-entry tax set-aside,
 * per-entry 401(k) contribution, rate clamping, and the monthly rollup.
 */

import {
  clampTaxSetAsideRate,
  retirementContributionForEntry,
  summarizePaychecks,
  taxSetAsideForEntry,
} from "../paycheckMath";

const income1099 = (amount: number, rate?: number) => ({
  type: "income" as const,
  amount,
  incomeType: "1099" as const,
  taxSetAsideRate: rate,
});

const incomeW2 = (amount: number, contribution?: number) => ({
  type: "income" as const,
  amount,
  incomeType: "w2" as const,
  retirementContribution: contribution,
});

describe("clampTaxSetAsideRate", () => {
  it("passes through in-range rates", () => {
    expect(clampTaxSetAsideRate(25)).toBe(25);
    expect(clampTaxSetAsideRate(0)).toBe(0);
    expect(clampTaxSetAsideRate(100)).toBe(100);
  });

  it("clamps out-of-range rates", () => {
    expect(clampTaxSetAsideRate(-5)).toBe(0);
    expect(clampTaxSetAsideRate(250)).toBe(100);
  });

  it("collapses non-finite rates to 0", () => {
    expect(clampTaxSetAsideRate(NaN)).toBe(0);
    expect(clampTaxSetAsideRate(Infinity)).toBe(0);
  });
});

describe("taxSetAsideForEntry", () => {
  it("computes rate% of a 1099 amount, rounded to cents", () => {
    expect(taxSetAsideForEntry(income1099(1000, 25))).toBe(250);
    expect(taxSetAsideForEntry(income1099(333.33, 30))).toBe(100);
  });

  it("returns 0 without a rate", () => {
    expect(taxSetAsideForEntry(income1099(1000))).toBe(0);
  });

  it("clamps rates above 100", () => {
    expect(taxSetAsideForEntry(income1099(100, 500))).toBe(100);
  });

  it("returns 0 for W-2, plain income, and expense entries", () => {
    expect(taxSetAsideForEntry(incomeW2(1000, 100))).toBe(0);
    expect(
      taxSetAsideForEntry({ type: "income", amount: 1000, taxSetAsideRate: 25 })
    ).toBe(0);
    expect(
      taxSetAsideForEntry({
        type: "expense",
        amount: 1000,
        incomeType: "1099",
        taxSetAsideRate: 25,
      })
    ).toBe(0);
  });

  it("returns 0 for non-positive or non-finite amounts", () => {
    expect(taxSetAsideForEntry(income1099(0, 25))).toBe(0);
    expect(taxSetAsideForEntry(income1099(-50, 25))).toBe(0);
    expect(taxSetAsideForEntry(income1099(NaN, 25))).toBe(0);
  });
});

describe("retirementContributionForEntry", () => {
  it("returns the recorded W-2 contribution rounded to cents", () => {
    expect(retirementContributionForEntry(incomeW2(2000, 150))).toBe(150);
    expect(retirementContributionForEntry(incomeW2(2000, 33.335))).toBe(33.34);
  });

  it("returns 0 when absent, non-positive, or non-finite", () => {
    expect(retirementContributionForEntry(incomeW2(2000))).toBe(0);
    expect(retirementContributionForEntry(incomeW2(2000, 0))).toBe(0);
    expect(retirementContributionForEntry(incomeW2(2000, -10))).toBe(0);
    expect(retirementContributionForEntry(incomeW2(2000, NaN))).toBe(0);
  });

  it("returns 0 for 1099 and plain income entries", () => {
    expect(
      retirementContributionForEntry({
        type: "income",
        amount: 2000,
        incomeType: "1099",
        retirementContribution: 100,
      })
    ).toBe(0);
    expect(
      retirementContributionForEntry({
        type: "income",
        amount: 2000,
        retirementContribution: 100,
      })
    ).toBe(0);
  });
});

describe("summarizePaychecks", () => {
  it("rolls up contributions, set-asides, and 1099 gross", () => {
    const summary = summarizePaychecks([
      incomeW2(2000, 150),
      incomeW2(2000, 150),
      income1099(1000, 25),
      income1099(500, 30),
      { type: "income", amount: 99 }, // plain income - ignored
      { type: "expense", amount: 400 }, // expense - ignored
    ]);
    expect(summary.retirementContribution).toBe(300);
    expect(summary.taxSetAside).toBe(400);
    expect(summary.income1099).toBe(1500);
  });

  it("returns zeros for an empty list", () => {
    expect(summarizePaychecks([])).toEqual({
      retirementContribution: 0,
      taxSetAside: 0,
      income1099: 0,
    });
  });
});

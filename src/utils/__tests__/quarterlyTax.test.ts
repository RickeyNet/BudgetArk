/**
 * BudgetArk - Quarterly Tax Tests
 * File: src/utils/__tests__/quarterlyTax.test.ts
 *
 * Quarter definitions and due dates, self-employment tax, the annual
 * estimate, the per-quarter build (income bucketing, set-aside, the
 * annualized installment math, statuses), the paid-map parse, and the
 * default tax year.
 */

import { makeBudgetEntry } from "../../__tests__/fixtures";
import {
  buildQuarterlyTaxYear,
  calcSelfEmploymentTax,
  defaultTaxYear,
  earliestTaxYear,
  estimateAnnualTaxOn1099,
  parseQuarterPaidMap,
  quarterDueDate,
  quarterKey,
  TAX_QUARTERS,
} from "../quarterlyTax";
import { FEDERAL_STANDARD_DEDUCTION_2026, FICA_2026 } from "../../data/taxData2026";
import { calcFederalTax } from "../taxCalc";

const income1099 = (id: string, month: string, amount: number, rate = 25) =>
  makeBudgetEntry({
    id,
    type: "income",
    category: "Freelance",
    incomeType: "1099",
    taxSetAsideRate: rate,
    amount,
    date: `2026-${month}-10T12:00:00.000Z`,
  });

describe("quarter definitions", () => {
  it("covers all twelve months once and puts Q4 in January of the next year", () => {
    const months = TAX_QUARTERS.flatMap((q) => q.months).sort((a, b) => a - b);
    expect(months).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(quarterDueDate(2026, TAX_QUARTERS[0]).toDateString()).toBe(new Date(2026, 3, 15).toDateString());
    expect(quarterDueDate(2026, TAX_QUARTERS[3]).toDateString()).toBe(new Date(2027, 0, 15).toDateString());
    expect(quarterKey(2026, 2)).toBe("2026-Q2");
    expect(TAX_QUARTERS.map((q) => q.cumulativeShare)).toEqual([0.225, 0.45, 0.675, 0.9]);
  });
});

describe("calcSelfEmploymentTax", () => {
  it("applies both halves of FICA to 92.35% of profit", () => {
    const tax = calcSelfEmploymentTax(100_000, "single");
    const base = 92_350;
    expect(tax.socialSecurity).toBeCloseTo(base * 0.124, 1);
    expect(tax.medicare).toBeCloseTo(base * 0.029, 1);
    expect(tax.total).toBeCloseTo(base * 0.153, 1);
    expect(tax.deductibleHalf).toBeCloseTo(tax.total / 2, 1);
  });

  it("caps Social Security at the wage base and adds Additional Medicare above the threshold", () => {
    const tax = calcSelfEmploymentTax(300_000, "single");
    const base = 300_000 * 0.9235;
    expect(tax.socialSecurity).toBeCloseTo(FICA_2026.socialSecurityWageBase * 0.124, 2);
    expect(tax.medicare).toBeCloseTo(base * 0.029 + (base - 200_000) * 0.009, 2);
    expect(calcSelfEmploymentTax(-5, "single").total).toBe(0);
  });
});

describe("estimateAnnualTaxOn1099", () => {
  it("deducts half the SE tax and the standard deduction before the brackets", () => {
    const estimate = estimateAnnualTaxOn1099(80_000, "single");
    const taxable = 80_000 - estimate.selfEmployment.deductibleHalf - FEDERAL_STANDARD_DEDUCTION_2026.single;
    expect(estimate.federalIncomeTax).toBe(calcFederalTax(taxable, "single"));
    expect(estimate.total).toBeCloseTo(estimate.selfEmployment.total + estimate.federalIncomeTax, 2);
    expect(estimateAnnualTaxOn1099(0, "single").total).toBe(0);
  });
});

describe("buildQuarterlyTaxYear", () => {
  const entries = [
    income1099("a", "01", 10_000),
    income1099("b", "03", 10_000),
    income1099("c", "05", 5_000, 30),
    income1099("d", "07", 12_000),
    income1099("e", "10", 8_000),
    // W-2 and expenses never count.
    makeBudgetEntry({ id: "w2", type: "income", category: "Salary", incomeType: "w2", amount: 9_000, date: "2026-02-10T12:00:00.000Z" }),
    makeBudgetEntry({ id: "x", amount: 500, date: "2026-02-11T12:00:00.000Z" }),
  ];

  it("buckets 1099 income and set-aside per quarter and annualizes the installment", () => {
    const year = buildQuarterlyTaxYear({ entries, year: 2026, status: "single", paid: {}, now: new Date(2026, 8, 2) });
    expect(year.rows.map((r) => r.income1099)).toEqual([20_000, 5_000, 12_000, 8_000]);
    expect(year.rows.map((r) => r.setAside)).toEqual([5_000, 1_500, 3_000, 2_000]);
    expect(year.rows.map((r) => r.cumulativeIncome)).toEqual([20_000, 25_000, 37_000, 45_000]);
    expect(year.rows.map((r) => r.annualizedIncome)).toEqual([80_000, 60_000, 55_500, 45_000]);

    const q1 = estimateAnnualTaxOn1099(80_000, "single").total * 0.225;
    expect(year.rows[0].estimatedDue).toBeCloseTo(q1, 1);
    const q2 = estimateAnnualTaxOn1099(60_000, "single").total * 0.45 - year.rows[0].estimatedDue;
    expect(year.rows[1].estimatedDue).toBeCloseTo(q2, 1);
    expect(year.totalIncome).toBe(45_000);
    expect(year.totalSetAside).toBe(11_500);
    expect(year.hasIncome).toBe(true);
    expect(year.reserveGap).toBeCloseTo(11_500 - year.totalEstimatedDue, 2);
  });

  it("never assesses a negative quarter when income drops", () => {
    const front = [income1099("a", "01", 60_000), income1099("b", "04", 1_000)];
    const year = buildQuarterlyTaxYear({ entries: front, year: 2026, status: "single", paid: {}, now: new Date(2026, 8, 2) });
    // Annualized falls from 240k (Q1) to 146.4k (Q2): Q2's cumulative share
    // can be below what Q1 already assessed.
    expect(year.rows[1].estimatedDue).toBeGreaterThanOrEqual(0);
    expect(year.rows[2].estimatedDue).toBeGreaterThanOrEqual(0);
  });

  it("derives statuses from paid marks and the due date", () => {
    const now = new Date(2026, 8, 2); // Sep 2: Q1/Q2 overdue, Q3 due Sep 15 (soon), Q4 upcoming
    const year = buildQuarterlyTaxYear({
      entries,
      year: 2026,
      status: "single",
      paid: { "2026-Q1": { paidAt: "2026-04-10T00:00:00.000Z", amount: 2000 } },
      now,
    });
    expect(year.rows.map((r) => r.status)).toEqual(["paid", "overdue", "due-soon", "upcoming"]);
    expect(year.rows[0].paid?.amount).toBe(2000);
  });

  it("reports 'none' for an empty quarter with nothing assessed", () => {
    const year = buildQuarterlyTaxYear({ entries: [], year: 2026, status: "single", paid: {}, now: new Date(2026, 8, 2) });
    expect(year.rows.every((r) => r.status === "none")).toBe(true);
    expect(year.hasIncome).toBe(false);
  });

  it("counts a recurring 1099 income in every active month", () => {
    const retainer = makeBudgetEntry({
      id: "r",
      type: "income",
      category: "Freelance",
      incomeType: "1099",
      taxSetAsideRate: 20,
      amount: 2_000,
      recurring: true,
      date: "2026-01-05T12:00:00.000Z",
    });
    const year = buildQuarterlyTaxYear({ entries: [retainer], year: 2026, status: "marriedJoint", paid: {}, now: new Date(2026, 8, 2) });
    expect(year.rows.map((r) => r.income1099)).toEqual([6_000, 4_000, 6_000, 8_000]);
    expect(year.rows[3].annualizedIncome).toBe(24_000);
  });
});

describe("parseQuarterPaidMap / defaultTaxYear", () => {
  it("keeps only well-formed quarter keys and records", () => {
    const raw = JSON.stringify({
      "2026-Q1": { paidAt: "2026-04-10T00:00:00.000Z", amount: 100 },
      "2026-Q2": { paidAt: "2026-06-10T00:00:00.000Z", amount: -5 },
      "2026-Q5": { paidAt: "2026-06-10T00:00:00.000Z" },
      "2026-Q3": { paidAt: "nope" },
      "2026-Q4": "paid",
    });
    expect(parseQuarterPaidMap(raw)).toEqual({
      "2026-Q1": { paidAt: "2026-04-10T00:00:00.000Z", amount: 100 },
      "2026-Q2": { paidAt: "2026-06-10T00:00:00.000Z" },
    });
    expect(parseQuarterPaidMap(null)).toEqual({});
    expect(parseQuarterPaidMap("[1]")).toEqual({});
    expect(parseQuarterPaidMap("{")).toEqual({});
  });

  it("treats the first half of January as last year's Q4 window", () => {
    expect(defaultTaxYear(new Date(2027, 0, 10))).toBe(2026);
    expect(defaultTaxYear(new Date(2027, 0, 20))).toBe(2027);
    expect(defaultTaxYear(new Date(2026, 8, 2))).toBe(2026);
  });

  it("floors the browsable years at the oldest live entry, never past the current tax year", () => {
    const now = new Date(2026, 8, 2);
    expect(earliestTaxYear([], now)).toBe(2026);
    const entries = [
      makeBudgetEntry({ id: "old", date: "2023-05-01T12:00:00.000Z" }),
      makeBudgetEntry({ id: "older-deleted", date: "2019-05-01T12:00:00.000Z", deletedAt: "2026-01-01T00:00:00.000Z" }),
      makeBudgetEntry({ id: "junk", date: "not a date" }),
      makeBudgetEntry({ id: "future", date: "2030-05-01T12:00:00.000Z" }),
    ];
    expect(earliestTaxYear(entries, now)).toBe(2023);
    // Mid-January: the current tax year is last year, and the floor follows it.
    expect(earliestTaxYear([makeBudgetEntry({ id: "n", date: "2027-01-05T12:00:00.000Z" })], new Date(2027, 0, 5))).toBe(2026);
  });
});

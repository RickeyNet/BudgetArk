import {
  buildAnnualReport,
  listReportYears,
  formatAnnualReportShareText,
  type AnnualReportInputs,
} from "../annualReport";
import {
  makeBudgetEntry,
  makePayment,
  makeNetWorthSnapshot,
} from "../../__tests__/fixtures";
import type { BudgetEntry, Payment, NetWorthSnapshot } from "../../types";

// All scenarios use a PAST calendar year (2025) so every month is counted and
// the report is deterministic regardless of when the suite runs. (For the
// current year the aggregator stops at the current month.)
const YEAR = 2025;

const entry = (over: Partial<BudgetEntry> = {}): BudgetEntry =>
  makeBudgetEntry({
    id: "e",
    date: "2025-03-15T12:00:00",
    recurring: false,
    ...over,
  });

const payment = (over: Partial<Payment> = {}): Payment =>
  makePayment({ id: "p", debtId: "d1", date: "2025-02-10T12:00:00", ...over });

const snapshot = (dayKey: string, netWorth: number): NetWorthSnapshot =>
  makeNetWorthSnapshot({
    dayKey,
    capturedAt: `${dayKey}T12:00:00.000Z`,
    totalAssets: netWorth,
    totalDebt: 0,
    netWorth,
  });

const baseInputs = (): AnnualReportInputs => ({
  entries: [
    entry({ id: "inc", type: "income", category: "Salary", amount: 5000, date: "2025-03-01T12:00:00" }),
    entry({ id: "food1", category: "Food", amount: 1000, date: "2025-03-10T12:00:00" }),
    entry({ id: "save", category: "Savings", amount: 2000, date: "2025-03-12T12:00:00" }), // reserve
    entry({ id: "food2", category: "Food", amount: 500, date: "2025-07-04T12:00:00" }),
  ],
  payments: [
    payment({ id: "pa", amount: 300, date: "2025-02-10T12:00:00" }),
    payment({ id: "pb", amount: 200, date: "2025-05-10T12:00:00" }),
    payment({ id: "old", amount: 999, date: "2024-12-31T12:00:00" }), // wrong year
    payment({ id: "zero", amount: 0, date: "2025-06-10T12:00:00" }), // non-positive
  ],
  snapshots: [
    snapshot("2024-12-31", 1000), // prior-year baseline
    snapshot("2025-02-01", 1500),
    snapshot("2025-11-01", 4000),
  ],
  limitsByMonth: {
    "2025-03": [{ category: "Food", monthlyLimit: 2000, updatedAt: "x" }], // 1000 <= 2000 -> under
    "2025-07": [{ category: "Food", monthlyLimit: 100, updatedAt: "x" }], // 500 > 100 -> over
  },
});

describe("buildAnnualReport", () => {
  it("totals income, expenses and net saved", () => {
    const r = buildAnnualReport(YEAR, baseInputs());
    expect(r.totalIncome).toBe(5000);
    expect(r.totalExpenses).toBe(3500); // 1000 + 2000 (reserve still an expense) + 500
    expect(r.netSaved).toBe(1500);
    expect(r.savingsRate).toBe(30); // 1500 / 5000
    expect(r.hasData).toBe(true);
  });

  it("separates reserve contributions from spending categories", () => {
    const r = buildAnnualReport(YEAR, baseInputs());
    expect(r.totalContributed).toBe(2000); // Savings
    // Reserve categories are excluded from the spending ranking
    expect(r.topCategories.map((c) => c.category)).not.toContain("Savings");
    expect(r.biggestCategory).toMatchObject({ category: "Food", amount: 1500 });
  });

  it("sums only positive debt payments dated within the year", () => {
    const r = buildAnnualReport(YEAR, baseInputs());
    expect(r.debtPaid).toBe(500); // 300 + 200; 2024 + zero excluded
    expect(r.paymentCount).toBe(2);
  });

  it("uses the last pre-year snapshot as the net-worth baseline", () => {
    const nw = buildAnnualReport(YEAR, baseInputs()).netWorth;
    expect(nw.start).toBe(1000); // 2024-12-31 baseline, not first in-year
    expect(nw.end).toBe(4000);
    expect(nw.change).toBe(3000);
    expect(nw.startDayKey).toBe("2024-12-31");
    expect(nw.endDayKey).toBe("2025-11-01");
  });

  it("falls back to the first in-year snapshot when no prior baseline exists", () => {
    const inputs = baseInputs();
    inputs.snapshots = [snapshot("2025-02-01", 1500), snapshot("2025-11-01", 4000)];
    const nw = buildAnnualReport(YEAR, inputs).netWorth;
    expect(nw.start).toBe(1500);
    expect(nw.change).toBe(2500);
  });

  it("counts months under budget only among months that have limits", () => {
    const r = buildAnnualReport(YEAR, baseInputs());
    expect(r.monthsWithLimits).toBe(2);
    expect(r.monthsUnderBudget).toBe(1); // March under, July over
  });

  it("builds a 12-month spending sparkline, Jan→Dec", () => {
    const r = buildAnnualReport(YEAR, baseInputs());
    expect(r.monthlySpending).toHaveLength(12);
    expect(r.monthlySpending[0]).toEqual({ label: "Jan", value: 0 });
    expect(r.monthlySpending[2]).toEqual({ label: "Mar", value: 3000 }); // 1000 + 2000
    expect(r.monthlySpending[6]).toEqual({ label: "Jul", value: 500 });
  });

  it("projects recurring entries across every month of a past year", () => {
    const inputs: AnnualReportInputs = {
      entries: [entry({ id: "rent", category: "Housing", amount: 100, date: "2025-01-01T12:00:00", recurring: true, recurrenceInterval: 1 })],
      payments: [],
      snapshots: [],
      limitsByMonth: {},
    };
    const r = buildAnnualReport(YEAR, inputs);
    expect(r.totalExpenses).toBe(1200); // 100 × 12 months
  });

  it("reports no data and a null savings rate for an empty year", () => {
    const r = buildAnnualReport(YEAR, {
      entries: [],
      payments: [],
      snapshots: [],
      limitsByMonth: {},
    });
    expect(r.hasData).toBe(false);
    expect(r.savingsRate).toBeNull();
    expect(r.biggestCategory).toBeNull();
    expect(r.netWorth.change).toBeNull();
  });

  it("caps top categories at five, highest first", () => {
    const inputs: AnnualReportInputs = {
      entries: [
        entry({ id: "a", category: "Food", amount: 600 }),
        entry({ id: "b", category: "Housing", amount: 500 }),
        entry({ id: "c", category: "Transport", amount: 400 }),
        entry({ id: "d", category: "Health", amount: 300 }),
        entry({ id: "e2", category: "Entertainment", amount: 200 }),
        entry({ id: "f", category: "Shopping", amount: 100 }),
      ],
      payments: [],
      snapshots: [],
      limitsByMonth: {},
    };
    const top = buildAnnualReport(YEAR, inputs).topCategories;
    expect(top).toHaveLength(5);
    expect(top[0].category).toBe("Food");
    expect(top.map((c) => c.category)).not.toContain("Shopping"); // smallest dropped
  });
});

describe("listReportYears", () => {
  it("always includes the current year and sorts newest first", () => {
    // Freeze the clock so the "current year" assertion checks a real,
    // independently-known expected value instead of recomputing
    // `new Date().getFullYear()` the same way the source does (which would
    // pass even if the source's current-year logic were broken).
    jest.useFakeTimers().setSystemTime(new Date(2026, 5, 1));
    try {
      const years = listReportYears({
        entries: [entry({ date: "2023-05-01T12:00:00" })],
        payments: [payment({ date: "2021-01-01T12:00:00" })],
        snapshots: [snapshot("2022-06-01", 0)],
      });
      expect(years).toContain(2026);
      expect(years).toContain(2023);
      expect(years).toContain(2022);
      expect(years).toContain(2021);
      // sorted descending
      expect([...years].sort((a, b) => b - a)).toEqual(years);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe("formatAnnualReportShareText", () => {
  const fmt = (n: number) => `$${n}`;

  it("renders aggregates only (no category amounts, no PII fields)", () => {
    const data = buildAnnualReport(YEAR, baseInputs());
    const text = formatAnnualReportShareText(data, fmt);
    expect(text).toContain("My 2025 BudgetArk Report");
    expect(text).toContain("Debt paid: $500");
    expect(text).toContain("Set aside: $2000");
    expect(text).toContain("Savings rate: 30%");
    expect(text).toContain("Months under budget: 1/2");
    expect(text).toContain("Top category: Food");
    // the category name appears, but never its dollar amount
    expect(text).not.toContain("$1500");
  });

  it("shows a signed net-worth line for a gain", () => {
    const data = buildAnnualReport(YEAR, baseInputs());
    const text = formatAnnualReportShareText(data, fmt);
    expect(text).toContain("Net worth: +$3000");
  });

  it("omits optional lines when their data is absent", () => {
    const data = buildAnnualReport(YEAR, {
      entries: [],
      payments: [],
      snapshots: [],
      limitsByMonth: {},
    });
    const text = formatAnnualReportShareText(data, fmt);
    expect(text).not.toContain("Savings rate");
    expect(text).not.toContain("Months under budget");
    expect(text).not.toContain("Top category");
    expect(text).not.toContain("Net worth");
  });
});

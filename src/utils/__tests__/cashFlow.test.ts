/**
 * Cash-flow projection math + month-start balance parsing.
 *
 * The parse matrix matters most: this map crosses the trust boundary three
 * ways (storage read, JSON import, P2P sync), and every path funnels
 * through parseMonthStartBalances / isMonthStartBalanceRecord.
 */

import {
  computeCashFlow,
  computeMonthReconciliationDelta,
  computeReconciliation,
  parseMonthStartBalances,
  previousMonthKey,
  roundCashAmount,
} from "../cashFlow";
import { isMonthStartBalanceRecord } from "../recordValidators";
import type { BudgetEntry, Debt, Payment } from "../../types";

const validRecord = (over: Record<string, unknown> = {}) => ({
  balance: 3200,
  capturedAt: "2026-07-01T09:00:00.000Z",
  updatedAt: "2026-07-01T09:00:00.000Z",
  ...over,
});

describe("previousMonthKey", () => {
  it("steps back within a year", () => {
    expect(previousMonthKey("2026-07")).toBe("2026-06");
    expect(previousMonthKey("2026-10")).toBe("2026-09");
  });

  it("rolls January back to the prior December", () => {
    expect(previousMonthKey("2026-01")).toBe("2025-12");
  });

  it("zero-pads single-digit months", () => {
    expect(previousMonthKey("2026-11")).toBe("2026-10");
    expect(previousMonthKey("2026-02")).toBe("2026-01");
  });
});

describe("isMonthStartBalanceRecord", () => {
  it("accepts a valid record, including negative (overdrawn) balances", () => {
    expect(isMonthStartBalanceRecord(validRecord())).toBe(true);
    expect(isMonthStartBalanceRecord(validRecord({ balance: -250.75 }))).toBe(true);
    expect(isMonthStartBalanceRecord(validRecord({ balance: 0 }))).toBe(true);
  });

  it("rejects malformed records fail-closed", () => {
    expect(isMonthStartBalanceRecord(null)).toBe(false);
    expect(isMonthStartBalanceRecord("3200")).toBe(false);
    expect(isMonthStartBalanceRecord(validRecord({ balance: "3200" }))).toBe(false);
    expect(isMonthStartBalanceRecord(validRecord({ balance: NaN }))).toBe(false);
    expect(isMonthStartBalanceRecord(validRecord({ balance: Infinity }))).toBe(false);
    expect(
      isMonthStartBalanceRecord(validRecord({ balance: 2_000_000_000 }))
    ).toBe(false); // hostile-peer magnitude cap
    expect(isMonthStartBalanceRecord(validRecord({ capturedAt: 12345 }))).toBe(false);
    expect(isMonthStartBalanceRecord(validRecord({ updatedAt: "not a date" }))).toBe(false);
    const missingUpdatedAt: Record<string, unknown> = validRecord();
    delete missingUpdatedAt.updatedAt;
    expect(isMonthStartBalanceRecord(missingUpdatedAt)).toBe(false);
  });
});

describe("parseMonthStartBalances", () => {
  it("round-trips a valid map", () => {
    const map = { "2026-06": validRecord(), "2026-07": validRecord({ balance: 100 }) };
    const parsed = parseMonthStartBalances(map);
    expect(Object.keys(parsed).sort()).toEqual(["2026-06", "2026-07"]);
    expect(parsed["2026-07"].balance).toBe(100);
  });

  it("drops invalid entries individually instead of rejecting the map", () => {
    const parsed = parseMonthStartBalances({
      "2026-07": validRecord(),
      "2026-13": validRecord(), // impossible month
      "not-a-month": validRecord(),
      "2026-06": { balance: "corrupt" },
    });
    expect(Object.keys(parsed)).toEqual(["2026-07"]);
  });

  it("parses non-map input to empty", () => {
    expect(parseMonthStartBalances(null)).toEqual({});
    expect(parseMonthStartBalances(undefined)).toEqual({});
    expect(parseMonthStartBalances("{}")).toEqual({});
    expect(parseMonthStartBalances([validRecord()])).toEqual({});
  });

  it("strips unknown extra fields from records", () => {
    const parsed = parseMonthStartBalances({
      "2026-07": { ...validRecord(), futureField: "kept out" },
    });
    expect(parsed["2026-07"]).toEqual(validRecord());
  });
});

describe("computeCashFlow", () => {
  it("matches the spec example: 3200 start, 4100 in, 3650 out", () => {
    const p = computeCashFlow({ startingBalance: 3200, income: 4100, expenses: 3650 });
    expect(p.net).toBe(450); // "safe to spend"
    expect(p.projectedEnd).toBe(3650);
  });

  it("handles an over-budget month (negative net)", () => {
    const p = computeCashFlow({ startingBalance: 500, income: 1000, expenses: 1400 });
    expect(p.net).toBe(-400);
    expect(p.projectedEnd).toBe(100);
  });
});

describe("computeReconciliation", () => {
  it("reports ending below plan as a negative delta", () => {
    const r = computeReconciliation({
      previousBalance: 3200,
      previousNet: 450,
      actualBalance: 3500,
    });
    expect(r.expected).toBe(3650);
    expect(r.delta).toBe(-150);
  });

  it("reports ending above plan as a positive delta", () => {
    const r = computeReconciliation({
      previousBalance: 1000,
      previousNet: 0,
      actualBalance: 1200,
    });
    expect(r.delta).toBe(200);
  });
});

describe("roundCashAmount", () => {
  it("rounds float dust to cents", () => {
    expect(roundCashAmount(449.99999999)).toBe(450);
    expect(roundCashAmount(0.1 + 0.2)).toBe(0.3);
    expect(roundCashAmount(-150.005)).toBe(-150);
  });
});

describe("computeMonthReconciliationDelta", () => {
  // Minimal fixtures - `as any` keeps them concise (ts-jest is transpile-only).
  const entry = (over: Partial<BudgetEntry>): BudgetEntry =>
    ({ id: "e", type: "expense", category: "Grocery", amount: 0, date: "2026-06-10", ...over }) as any;
  const debt = (over: Partial<Debt> = {}): Debt =>
    ({ id: "d1", name: "Card", balance: 1000, minPayment: 150, ...over }) as any;
  const payment = (over: Partial<Payment> = {}): Payment =>
    ({ id: "p1", debtId: "d1", amount: 150, date: "2026-06-15", ...over }) as any;
  const balances = {
    "2026-06": validRecord({ balance: 1000 }),
    "2026-07": validRecord({ balance: 1200 }),
  } as any;
  const base = { monthKey: "2026-07", monthBalances: balances, currentMonthKey: "2026-07" };

  it("is null unless both this month and last month have a balance", () => {
    expect(
      computeMonthReconciliationDelta({ ...base, monthBalances: { "2026-07": balances["2026-07"] }, entries: [], debts: [], payments: [] })
    ).toBeNull();
    expect(
      computeMonthReconciliationDelta({ ...base, monthKey: "2026-08", entries: [], debts: [], payments: [] })
    ).toBeNull();
  });

  it("compares this month's balance against last month's projected end", () => {
    // June: 1000 start + 3000 income - 500 grocery = 3500 expected; actual 1200.
    const delta = computeMonthReconciliationDelta({
      ...base,
      entries: [
        entry({ id: "i", type: "income", category: "Salary", amount: 3000, date: "2026-06-01" }),
        entry({ id: "g", amount: 500, date: "2026-06-12" }),
        entry({ id: "july", amount: 999, date: "2026-07-03" }),
      ],
      debts: [],
      payments: [],
    });
    expect(delta).toBe(1200 - 3500);
  });

  it("counts recurring entries active last month", () => {
    const delta = computeMonthReconciliationDelta({
      ...base,
      entries: [entry({ id: "rent", amount: 800, date: "2026-01-01", recurring: true, recurrenceInterval: 1 })],
      debts: [],
      payments: [],
    });
    expect(delta).toBe(1200 - (1000 - 800));
  });

  it("includes last month's debt payment plan, ignoring payments of deleted debts", () => {
    const delta = computeMonthReconciliationDelta({
      ...base,
      entries: [],
      debts: [debt()],
      payments: [payment({ amount: 200 }), payment({ id: "p2", debtId: "gone", amount: 5000 })],
    });
    // A past month's plan is the logged payment itself (200), never a floor.
    expect(delta).toBe(1200 - (1000 - 200));
  });
});

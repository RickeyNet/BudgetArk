/**
 * BudgetArk - Quarterly Tax Paid Storage tests
 * File: src/storage/__tests__/quarterlyTaxPaidStorage.test.ts
 */

import {
  getQuarterPaidMap,
  markQuarterPaid,
  MAX_QUARTER_PAID_RECORDS,
  unmarkQuarterPaid,
} from "../quarterlyTaxPaidStorage";

let mockStore: Map<string, string>;

jest.mock("../encryptedStorage", () => ({
  getItem: jest.fn(async (k: string) => (mockStore.has(k) ? mockStore.get(k)! : null)),
  setItem: jest.fn(async (k: string, v: string) => {
    mockStore.set(k, v);
  }),
  updateItem: jest.fn(async (k: string, updater: (current: string | null) => string | null) => {
    const current = mockStore.has(k) ? mockStore.get(k)! : null;
    const next = updater(current);
    if (next !== null) mockStore.set(k, next);
  }),
}));

beforeEach(() => {
  mockStore = new Map();
});

describe("quarterlyTaxPaidStorage", () => {
  it("marks, reads back, and unmarks a quarter", async () => {
    expect(await getQuarterPaidMap()).toEqual({});
    await markQuarterPaid("2026-Q1", { paidAt: "2026-04-10T00:00:00.000Z", amount: 100 });
    const after = await markQuarterPaid("2026-Q2", { paidAt: "2026-06-10T00:00:00.000Z" });
    expect(Object.keys(after)).toEqual(["2026-Q1", "2026-Q2"]);
    expect(await unmarkQuarterPaid("2026-Q1")).toEqual({ "2026-Q2": { paidAt: "2026-06-10T00:00:00.000Z" } });
  });

  it("drops the oldest keys past the cap and reads a junk store as empty", async () => {
    for (let i = 0; i < MAX_QUARTER_PAID_RECORDS + 4; i++) {
      const year = 2000 + Math.floor(i / 4);
      await markQuarterPaid(`${year}-Q${(i % 4) + 1}`, { paidAt: "2026-01-01T00:00:00.000Z" });
    }
    const map = await getQuarterPaidMap();
    expect(Object.keys(map)).toHaveLength(MAX_QUARTER_PAID_RECORDS);
    expect(map["2000-Q1"]).toBeUndefined();
    mockStore.set("@budgetark_quarterly_tax_paid", "not json");
    expect(await getQuarterPaidMap()).toEqual({});
  });
});

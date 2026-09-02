/**
 * BudgetArk - Paycheck Cycle Storage tests
 * File: src/storage/__tests__/paycheckCycleStorage.test.ts
 */

import {
  clearPaycheckCycleSettings,
  getPaycheckCycleSettings,
  savePaycheckCycleSettings,
} from "../paycheckCycleStorage";

let mockStore: Map<string, string>;

jest.mock("../encryptedStorage", () => ({
  getItem: jest.fn(async (k: string) => (mockStore.has(k) ? mockStore.get(k)! : null)),
  setItem: jest.fn(async (k: string, v: string) => {
    mockStore.set(k, v);
  }),
  removeItem: jest.fn(async (k: string) => {
    mockStore.delete(k);
  }),
}));

beforeEach(() => {
  mockStore = new Map();
});

describe("paycheckCycleStorage", () => {
  it("round-trips a schedule and clears it", async () => {
    expect(await getPaycheckCycleSettings()).toBeNull();
    const saved = await savePaycheckCycleSettings({ frequency: "biweekly", anchorDate: "2026-09-04" });
    expect(saved).toEqual({ frequency: "biweekly", anchorDate: "2026-09-04" });
    expect(await getPaycheckCycleSettings()).toEqual(saved);
    await clearPaycheckCycleSettings();
    expect(await getPaycheckCycleSettings()).toBeNull();
  });

  it("normalizes fixed days and refuses to write an invalid record", async () => {
    expect(await savePaycheckCycleSettings({ frequency: "semimonthly", payDays: [15, 1] })).toEqual({
      frequency: "semimonthly",
      payDays: [1, 15],
    });
    expect(await savePaycheckCycleSettings({ frequency: "weekly" })).toBeNull();
    expect(await getPaycheckCycleSettings()).toEqual({ frequency: "semimonthly", payDays: [1, 15] });
  });

  it("reads a junk store as not set up", async () => {
    mockStore.set("@budgetark_paycheck_cycle", "{oops");
    expect(await getPaycheckCycleSettings()).toBeNull();
  });
});

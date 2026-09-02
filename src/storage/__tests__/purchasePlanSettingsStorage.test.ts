/**
 * BudgetArk - Purchase Plan Settings Storage tests
 * File: src/storage/__tests__/purchasePlanSettingsStorage.test.ts
 *
 * Two components (the plan list and the planner card) write the same
 * device-local record, each owning different fields. Writes must merge
 * patches over what is stored so neither side clobbers the other.
 */

import {
  getPurchasePlanSettings,
  updatePurchasePlanSettings,
} from "../purchasePlanSettingsStorage";
import { DEFAULT_PURCHASE_PLAN_SETTINGS } from "../../utils/purchasePlanSettings";

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

const KEY = "@budgetark_purchase_plan_settings";

beforeEach(() => {
  mockStore = new Map();
});

describe("purchasePlanSettingsStorage", () => {
  it("reads defaults when nothing is stored", async () => {
    expect(await getPurchasePlanSettings()).toEqual(DEFAULT_PURCHASE_PLAN_SETTINGS);
  });

  it("merges patches from different owners instead of replacing the record", async () => {
    await updatePurchasePlanSettings({ method: "custom", combinedMonthly: 300 }); // the list
    await updatePurchasePlanSettings({ financeApr: 19.9, hoursPerWeek: 35 }); // the card
    expect(await getPurchasePlanSettings()).toEqual({
      ...DEFAULT_PURCHASE_PLAN_SETTINGS,
      method: "custom",
      combinedMonthly: 300,
      financeApr: 19.9,
      hoursPerWeek: 35,
    });
  });

  it("returns the merged record and parses fail-closed over a corrupt store", async () => {
    mockStore.set(KEY, "{corrupt");
    const next = await updatePurchasePlanSettings({ allocation: "parallel" });
    expect(next).toEqual({ ...DEFAULT_PURCHASE_PLAN_SETTINGS, allocation: "parallel" });
    expect(JSON.parse(mockStore.get(KEY)!)).toEqual(next);
  });

  it("a patch carrying junk resets that field only", async () => {
    await updatePurchasePlanSettings({ method: "soonest" });
    const next = await updatePurchasePlanSettings({
      financeTermMonths: 2.5 as unknown as number,
    });
    expect(next.method).toBe("soonest");
    expect(next.financeTermMonths).toBe(24);
  });
});

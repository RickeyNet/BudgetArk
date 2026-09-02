/**
 * BudgetArk - Net Worth Goal Storage tests
 * File: src/storage/__tests__/netWorthGoalStorage.test.ts
 */

import { clearNetWorthGoal, getNetWorthGoal, saveNetWorthGoal } from "../netWorthGoalStorage";

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

const goal = { targetAmount: 50000, targetMonth: "2029-09", createdAt: "2026-09-02T00:00:00.000Z" };

describe("netWorthGoalStorage", () => {
  it("round-trips the goal and clears it", async () => {
    expect(await getNetWorthGoal()).toBeNull();
    expect(await saveNetWorthGoal(goal)).toEqual(goal);
    expect(await getNetWorthGoal()).toEqual(goal);
    await clearNetWorthGoal();
    expect(await getNetWorthGoal()).toBeNull();
  });

  it("refuses to write an invalid goal and reads a junk store as unset", async () => {
    expect(await saveNetWorthGoal({ ...goal, targetMonth: "soon" })).toBeNull();
    expect(await getNetWorthGoal()).toBeNull();
    mockStore.set("@budgetark_net_worth_goal", "[1,2]");
    expect(await getNetWorthGoal()).toBeNull();
  });
});

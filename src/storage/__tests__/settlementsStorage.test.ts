/**
 * BudgetArk - Settlements Storage tests
 * File: src/storage/__tests__/settlementsStorage.test.ts
 */

import { addSettlement, getSettlements, removeSettlementsFor } from "../settlementsStorage";

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

const record = (personId: string, monthKey: string, amount: number) => ({
  personId,
  monthKey,
  amount,
  settledAt: "2026-09-05T00:00:00.000Z",
});

describe("settlementsStorage", () => {
  it("appends, reads back, and removes one person's month", async () => {
    expect(await getSettlements()).toEqual([]);
    await addSettlement(record("alex", "2026-09", 30));
    await addSettlement(record("alex", "2026-09", 20));
    await addSettlement(record("alex", "2026-08", 5));
    const after = await addSettlement(record("sam", "2026-09", 9));
    expect(after).toHaveLength(4);
    const remaining = await removeSettlementsFor("alex", "2026-09");
    expect(remaining).toEqual([record("alex", "2026-08", 5), record("sam", "2026-09", 9)]);
    expect(await getSettlements()).toEqual(remaining);
  });

  it("reads an unparseable store as empty and recovers on the next write", async () => {
    mockStore.set("@budgetark_settlements", "junk");
    expect(await getSettlements()).toEqual([]);
    expect(await addSettlement(record("alex", "2026-09", 1))).toEqual([record("alex", "2026-09", 1)]);
  });
});

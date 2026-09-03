/**
 * BudgetArk - Sync Activity Storage tests
 * File: src/storage/__tests__/syncActivityStorage.test.ts
 */

import {
  clearSyncActivityLog,
  getSyncActivityLog,
  MAX_SYNC_ACTIVITY_RECORDS,
  recordSyncActivity,
} from "../syncActivityStorage";

let mockStore: Map<string, string>;

jest.mock("../encryptedStorage", () => ({
  getItem: jest.fn(async (k: string) => (mockStore.has(k) ? mockStore.get(k)! : null)),
  setItem: jest.fn(async (k: string, v: string) => {
    mockStore.set(k, v);
  }),
  removeItem: jest.fn(async (k: string) => {
    mockStore.delete(k);
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

describe("syncActivityStorage", () => {
  it("prepends records, trims the partner name, and clears", async () => {
    expect(await getSyncActivityLog()).toEqual([]);
    await recordSyncActivity({ partnerName: "Sam", received: { budgetEntries: { upserts: 2, deletes: 0 } }, sent: 1, at: "2026-09-01T00:00:00.000Z" });
    const log = await recordSyncActivity({ partnerName: "S".repeat(100), received: {}, sent: 0, at: "2026-09-02T00:00:00.000Z" });
    expect(log).toHaveLength(2);
    expect(log[0].at).toBe("2026-09-02T00:00:00.000Z");
    expect(log[0].partnerName).toHaveLength(80);
    expect(log[1].received.budgetEntries).toEqual({ upserts: 2, deletes: 0 });
    await clearSyncActivityLog();
    expect(await getSyncActivityLog()).toEqual([]);
  });

  it("keeps only the newest records past the cap and reads a junk store as empty", async () => {
    for (let i = 0; i < MAX_SYNC_ACTIVITY_RECORDS + 5; i++) {
      await recordSyncActivity({
        partnerName: "Sam",
        received: {},
        sent: i,
        at: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(),
      });
    }
    const log = await getSyncActivityLog();
    expect(log).toHaveLength(MAX_SYNC_ACTIVITY_RECORDS);
    expect(log[0].sent).toBe(MAX_SYNC_ACTIVITY_RECORDS + 4);
    mockStore.set("@budgetark_sync_activity", "{oops");
    expect(await getSyncActivityLog()).toEqual([]);
  });
});

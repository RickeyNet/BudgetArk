/**
 * BudgetArk - Sync Activity Tests
 * File: src/sync/__tests__/syncActivity.test.ts
 *
 * The incoming-diff summary (counts only, upserts vs removals, optional
 * collections), the description string, and the fail-closed parses.
 */

import type { SyncDiff } from "../types";
import {
  describeSyncActivity,
  parseSyncActivityLog,
  parseSyncActivityRecord,
  summarizeIncomingDiff,
  totalReceived,
} from "../syncActivity";

const emptyDiff = (): SyncDiff =>
  ({
    debts: [],
    payments: [],
    budgetEntries: [],
    budgetLimits: [],
    savingsGoals: [],
    assetAccounts: [],
    syncTimestamp: "2026-09-02T00:00:00.000Z",
  }) as unknown as SyncDiff;

const upsert = (id: string) => ({ action: "upsert" as const, record: { id } as never });
const del = (id: string) => ({ action: "delete" as const, record: { id } as never });

describe("summarizeIncomingDiff", () => {
  it("counts upserts and removals per collection and omits empty ones", () => {
    const diff = emptyDiff();
    diff.budgetEntries = [upsert("a"), upsert("b"), del("c")];
    diff.payments = [upsert("p")];
    diff.monthStartBalances = { "2026-09": { balance: 1, capturedAt: "x", updatedAt: "x" } };
    diff.dismissedTransactions = { t1: {} as never, t2: {} as never };
    diff.netWorthSnapshots = [{ dayKey: "2026-09-01", capturedAt: "x", totalAssets: 1, totalDebt: 0, netWorth: 1 }];
    diff.budgetLimits = [{ monthKey: "2026-09" } as never];
    const counts = summarizeIncomingDiff(diff);
    expect(counts).toEqual({
      budgetEntries: { upserts: 2, deletes: 1 },
      payments: { upserts: 1, deletes: 0 },
      budgetLimits: { upserts: 1, deletes: 0 },
      monthStartBalances: { upserts: 1, deletes: 0 },
      dismissedTransactions: { upserts: 2, deletes: 0 },
      netWorthSnapshots: { upserts: 1, deletes: 0 },
    });
    expect(totalReceived(counts)).toBe(9);
    expect(summarizeIncomingDiff(emptyDiff())).toEqual({});
  });

  it("never carries record contents - only numbers", () => {
    const diff = emptyDiff();
    diff.debts = [{ action: "upsert", record: { id: "d", name: "Secret Visa", balance: 9999 } as never }];
    const json = JSON.stringify(summarizeIncomingDiff(diff));
    expect(json).not.toContain("Secret");
    expect(json).not.toContain("9999");
  });
});

describe("describeSyncActivity", () => {
  it("reads naturally with singulars, plurals and removals", () => {
    expect(
      describeSyncActivity({
        budgetEntries: { upserts: 11, deletes: 1 },
        payments: { upserts: 1, deletes: 0 },
        people: { upserts: 0, deletes: 1 },
      })
    ).toBe("12 entries (1 removed), 1 payment, 1 person (1 removed)");
    expect(describeSyncActivity({})).toBe("nothing new");
  });
});

describe("parseSyncActivityLog", () => {
  const good = {
    at: "2026-09-02T10:00:00.000Z",
    partnerName: "Sam",
    received: { budgetEntries: { upserts: 3, deletes: 0 } },
    sent: 2,
  };

  it("keeps well-formed records newest first and drops the rest", () => {
    const older = { ...good, at: "2026-09-01T10:00:00.000Z" };
    const raw = JSON.stringify([
      older,
      good,
      { ...good, received: { budgetEntries: { upserts: -1, deletes: 0 } } },
      { ...good, at: "yesterday" },
      { ...good, partnerName: 5 },
      "junk",
    ]);
    const log = parseSyncActivityLog(raw);
    expect(log).toHaveLength(2);
    expect(log[0].at).toBe(good.at);
    expect(parseSyncActivityLog(null)).toEqual([]);
    expect(parseSyncActivityLog("{}")).toEqual([]);
    expect(parseSyncActivityLog("nope")).toEqual([]);
  });

  it("ignores unknown collections and defaults a missing sent count", () => {
    const record = parseSyncActivityRecord({
      ...good,
      sent: undefined,
      received: { ...good.received, secrets: { upserts: 1, deletes: 0 } },
    });
    expect(record).toEqual({ ...good, sent: 0 });
  });
});

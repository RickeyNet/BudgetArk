/**
 * BudgetArk - net worth snapshot storage tests
 * File: src/storage/__tests__/netWorthSnapshotStorage.test.ts
 *
 * Guards the daily net-worth history behind the Bridge's trend chart: one
 * snapshot per calendar day (a later write for the same day replaces it,
 * never duplicates), ascending dayKey ordering, the 730-day retention cap,
 * and fail-closed repair of malformed/legacy records read back from storage
 * (missing dayKey, non-finite totals) - with the repair actually persisted,
 * not just returned in-memory. Storage is an in-memory map, matching
 * debtStorage.test.ts's pattern.
 */
import type { NetWorthSnapshot } from "../../types";
import { makeNetWorthSnapshot } from "../../__tests__/fixtures";
import {
  clearNetWorthSnapshots,
  getNetWorthSnapshots,
  saveNetWorthSnapshots,
  upsertNetWorthSnapshot,
} from "../netWorthSnapshotStorage";

// netWorthSnapshotStorage statically imports userStorage (for
// syncNetWorthSnapshot), which pulls in the ESM-only `uuid` package. Nothing
// in these tests mints an id, but the import graph still needs a stub - same
// treatment as referentialCleanup.test.ts and pairingService.test.ts.
jest.mock("../../utils/uuid", () => ({ generateUUID: () => "gen-uuid" }));

let mockStore: Map<string, string>;

jest.mock("../encryptedStorage", () => ({
  getItem: jest.fn(async (k: string) => (mockStore.has(k) ? mockStore.get(k)! : null)),
  setItem: jest.fn(async (k: string, v: string) => {
    mockStore.set(k, v);
  }),
  removeItem: jest.fn(async (k: string) => {
    mockStore.delete(k);
  }),
  updateItem: jest.fn(
    async (k: string, updater: (current: string | null) => string | null) => {
      const next = updater(mockStore.has(k) ? mockStore.get(k)! : null);
      if (next !== null) mockStore.set(k, next);
    }
  ),
}));

const KEY = "@budgetark_net_worth_snapshots";

beforeEach(() => {
  mockStore = new Map();
});

describe("upsertNetWorthSnapshot", () => {
  it("inserts a snapshot for a new day", async () => {
    const result = await upsertNetWorthSnapshot(
      makeNetWorthSnapshot({ dayKey: "2026-06-01" })
    );
    expect(result).toHaveLength(1);
    expect(result[0].dayKey).toBe("2026-06-01");
  });

  it("replaces, rather than duplicates, an existing day's snapshot", async () => {
    await upsertNetWorthSnapshot(
      makeNetWorthSnapshot({ dayKey: "2026-06-01", netWorth: 100 })
    );
    const result = await upsertNetWorthSnapshot(
      makeNetWorthSnapshot({ dayKey: "2026-06-01", netWorth: 200 })
    );
    expect(result).toHaveLength(1);
    expect(result[0].netWorth).toBe(200);
  });

  it("derives the day key from capturedAt when not provided", async () => {
    // Local noon so the UTC round-trip through toISOString/new Date can
    // never cross a calendar-day boundary regardless of the runner's TZ.
    const capturedAt = new Date(2026, 5, 1, 12, 0, 0).toISOString();
    const result = await upsertNetWorthSnapshot({
      capturedAt,
      totalAssets: 100,
      totalDebt: 0,
      netWorth: 100,
    });
    expect(result[0].dayKey).toBe("2026-06-01");
  });

  it("keeps results sorted ascending by dayKey regardless of insert order", async () => {
    await upsertNetWorthSnapshot(makeNetWorthSnapshot({ dayKey: "2026-06-03" }));
    await upsertNetWorthSnapshot(makeNetWorthSnapshot({ dayKey: "2026-06-01" }));
    const result = await upsertNetWorthSnapshot(
      makeNetWorthSnapshot({ dayKey: "2026-06-02" })
    );
    expect(result.map((s) => s.dayKey)).toEqual([
      "2026-06-01",
      "2026-06-02",
      "2026-06-03",
    ]);
  });
});

describe("saveNetWorthSnapshots retention", () => {
  it("caps stored history at 730 days, keeping the newest and dropping the oldest", async () => {
    const start = new Date(2020, 0, 1);
    const snapshots: NetWorthSnapshot[] = Array.from({ length: 731 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(d.getDate()).padStart(2, "0")}`;
      return makeNetWorthSnapshot({ dayKey, netWorth: i });
    });

    const result = await saveNetWorthSnapshots(snapshots);
    expect(result).toHaveLength(730);
    // The oldest (index 0, netWorth 0) was dropped; index 1 is now the floor.
    expect(result[0].netWorth).toBe(1);
    expect(result[result.length - 1].netWorth).toBe(730);
  });
});

describe("getNetWorthSnapshots repair", () => {
  it("returns [] when nothing is stored", async () => {
    expect(await getNetWorthSnapshots()).toEqual([]);
  });

  it("returns [] for corrupted JSON rather than throwing", async () => {
    mockStore.set(KEY, "{not json");
    expect(await getNetWorthSnapshots()).toEqual([]);
  });

  it("fills a missing dayKey from capturedAt and persists the repair", async () => {
    const capturedAt = new Date(2026, 5, 15, 12, 0, 0).toISOString();
    mockStore.set(
      KEY,
      JSON.stringify([
        { capturedAt, totalAssets: 500, totalDebt: 100, netWorth: 400 },
      ])
    );
    const result = await getNetWorthSnapshots();
    expect(result[0].dayKey).toBe("2026-06-15");

    // The repair was written back, not just returned in-memory.
    const stored = JSON.parse(mockStore.get(KEY)!);
    expect(stored[0].dayKey).toBe("2026-06-15");
  });

  it("defaults non-finite totals to 0 and recomputes netWorth from them", async () => {
    mockStore.set(
      KEY,
      JSON.stringify([
        {
          dayKey: "2026-06-15",
          capturedAt: "2026-06-15T00:00:00.000Z",
          totalAssets: NaN,
          totalDebt: 50,
          netWorth: NaN,
        },
      ])
    );
    const result = await getNetWorthSnapshots();
    expect(result[0].totalAssets).toBe(0);
    expect(result[0].totalDebt).toBe(50);
    expect(result[0].netWorth).toBe(-50);
  });

  it("leaves an already-well-formed store untouched (no unnecessary repair write)", async () => {
    const good = [makeNetWorthSnapshot({ dayKey: "2026-06-01" })];
    mockStore.set(KEY, JSON.stringify(good));
    const before = mockStore.get(KEY);
    const result = await getNetWorthSnapshots();
    expect(result).toEqual(good);
    // updateItem is invoked only on the "changed" path; a well-formed store
    // must round-trip byte-identical.
    expect(mockStore.get(KEY)).toBe(before);
  });
});

describe("clearNetWorthSnapshots", () => {
  it("removes the stored history", async () => {
    mockStore.set(KEY, JSON.stringify([makeNetWorthSnapshot()]));
    await clearNetWorthSnapshots();
    expect(mockStore.has(KEY)).toBe(false);
  });
});

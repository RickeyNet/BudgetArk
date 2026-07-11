/**
 * diffEngine is the LAN-sync trust boundary: it computes outgoing diffs and
 * merges incoming ones (last-write-wins, tombstone-aware) into authoritative
 * storage. We mock every storage edge with an in-memory `mockState` and run
 * the REAL validators (recordValidators) + REAL category helpers, so the merge
 * logic and the security gate are both exercised for real.
 */
import {
  computeOutgoingDiff,
  applyIncomingDiff,
  markBackfillSyncDone,
} from "../diffEngine";
import type { SyncDiff } from "../types";

let mockState: any;

jest.mock("../../storage/debtStorage", () => ({
  getDebtsIncludingDeleted: jest.fn(async () => mockState.debts),
  saveDebts: jest.fn(async (v: any) => {
    mockState.debts = v;
  }),
  getPaymentsIncludingDeleted: jest.fn(async () => mockState.payments),
  getPayoffStrategyEnvelope: jest.fn(async () => mockState.strategyEnvelope),
  savePayoffStrategyEnvelope: jest.fn(async (v: any) => {
    mockState.strategyEnvelope = v;
  }),
}));
jest.mock("../../storage/budgetStorage", () => ({
  getBudgetEntriesIncludingDeleted: jest.fn(async () => mockState.budgetEntries),
  saveBudgetEntries: jest.fn(async (v: any) => {
    mockState.budgetEntries = v;
  }),
  getAllLimitsByMonth: jest.fn(async () => mockState.limitsByMonth),
}));
jest.mock("../../storage/savingsGoalStorage", () => ({
  getSavingsGoalsIncludingDeleted: jest.fn(async () => mockState.savingsGoals),
  saveSavingsGoals: jest.fn(async (v: any) => {
    mockState.savingsGoals = v;
  }),
}));
jest.mock("../../storage/assetAccountStorage", () => ({
  getAssetAccountsIncludingDeleted: jest.fn(async () => mockState.assetAccounts),
  saveAssetAccounts: jest.fn(async (v: any) => {
    mockState.assetAccounts = v;
  }),
}));
jest.mock("../../storage/holdingsStorage", () => ({
  getHoldingsIncludingDeleted: jest.fn(async () => mockState.holdings),
  saveHoldings: jest.fn(async (v: any) => {
    mockState.holdings = v;
  }),
}));
jest.mock("../../storage/debtMilestoneStorage", () => ({
  getDebtMilestonePlan: jest.fn(async () => mockState.milestonePlan),
  saveDebtMilestonePlanFromSync: jest.fn(async (v: any) => {
    mockState.milestonePlan = v;
  }),
}));
jest.mock("../../storage/customCategoriesStorage", () => ({
  getCustomCategories: jest.fn(async () => mockState.customCategories),
  saveCustomCategoriesFromSync: jest.fn(async (v: any) => {
    mockState.customCategories = v;
  }),
}));
jest.mock("../../storage/categoryBucketOverridesStorage", () => ({
  getCategoryBucketOverrides: jest.fn(async () => mockState.bucketOverrides),
  saveCategoryBucketOverridesFromSync: jest.fn(async (v: any) => {
    mockState.bucketOverrides = v;
  }),
}));
jest.mock("../../storage/netWorthSnapshotStorage", () => ({
  getNetWorthSnapshots: jest.fn(async () => mockState.snapshots),
  saveNetWorthSnapshots: jest.fn(async (v: any) => {
    mockState.snapshots = v;
  }),
}));
jest.mock("../../storage/encryptedStorage", () => ({
  getItem: jest.fn(async (k: string) =>
    mockState.encStore.has(k) ? mockState.encStore.get(k) : null
  ),
  setItem: jest.fn(async (k: string, v: string) => {
    mockState.encStore.set(k, v);
  }),
}));

const debtStorage = require("../../storage/debtStorage");
const customCatStorage = require("../../storage/customCategoriesStorage");
const snapshotStorage = require("../../storage/netWorthSnapshotStorage");

const OLD = "2026-01-01T00:00:00.000Z";
const MID = "2026-03-01T00:00:00.000Z";
const NEW = "2026-06-01T00:00:00.000Z";

// ── Valid fixtures (must pass the real recordValidators) ──
const debt = (over: Record<string, unknown> = {}): any => ({
  id: "d1",
  name: "Visa",
  balance: 1000,
  originalBalance: 2000,
  rate: 19.9,
  minPayment: 50,
  createdAt: OLD,
  updatedAt: NEW,
  ...over,
});
const payment = (over: Record<string, unknown> = {}): any => ({
  id: "p1",
  debtId: "d1",
  amount: 50,
  date: OLD,
  updatedAt: NEW,
  ...over,
});
const snapshot = (over: Record<string, unknown> = {}): any => ({
  dayKey: "2026-06-01",
  capturedAt: NEW,
  totalAssets: 1000,
  totalDebt: 200,
  netWorth: 800,
  ...over,
});
const customCat = (over: Record<string, unknown> = {}): any => ({
  id: "c1",
  name: "Kayaking",
  icon: "🛶",
  createdAt: OLD,
  updatedAt: NEW,
  ...over,
});
const holding = (over: Record<string, unknown> = {}): any => ({
  id: "h1",
  symbol: "AAPL",
  shares: 10,
  costBasis: 1500,
  createdAt: OLD,
  updatedAt: NEW,
  ...over,
});

const emptyDiff = (over: Partial<SyncDiff> = {}): SyncDiff =>
  ({
    debts: [],
    payments: [],
    budgetEntries: [],
    budgetLimits: [],
    savingsGoals: [],
    assetAccounts: [],
    holdings: [],
    syncTimestamp: NEW,
    ...over,
  }) as SyncDiff;

const freshState = () => ({
  debts: [],
  payments: [],
  budgetEntries: [],
  savingsGoals: [],
  assetAccounts: [],
  holdings: [],
  milestonePlan: { steps: [], updatedAt: OLD },
  strategyEnvelope: null,
  customCategories: [],
  bucketOverrides: {},
  snapshots: [],
  limitsByMonth: {},
  encStore: new Map<string, string>(),
});

beforeEach(() => {
  mockState = freshState();
});

describe("computeOutgoingDiff", () => {
  it("sends everything on the first sync (null timestamp)", async () => {
    mockState.debts = [debt({ id: "d1" }), debt({ id: "d2" })];
    const diff = await computeOutgoingDiff(null);
    expect(diff.debts.map((e) => e.record.id).sort()).toEqual(["d1", "d2"]);
    expect(diff.debts.every((e) => e.action === "upsert")).toBe(true);
  });

  it("filters records to those changed since the last sync", async () => {
    mockState.debts = [
      debt({ id: "stale", updatedAt: OLD }),
      debt({ id: "fresh", updatedAt: NEW }),
    ];
    const diff = await computeOutgoingDiff(MID);
    expect(diff.debts.map((e) => e.record.id)).toEqual(["fresh"]);
  });

  it("marks a tombstoned record as a delete action", async () => {
    mockState.debts = [debt({ id: "d1", deletedAt: NEW, updatedAt: NEW })];
    const diff = await computeOutgoingDiff(null);
    expect(diff.debts[0].action).toBe("delete");
  });

  it("sends the snapshot/custom-category backlog in full until backfill is done", async () => {
    mockState.snapshots = [snapshot({ dayKey: "2020-01-01", capturedAt: OLD })];
    mockState.customCategories = [customCat({ updatedAt: OLD })];
    // Incremental sync, backfill NOT yet marked -> backlog still goes out.
    const diff = await computeOutgoingDiff(MID);
    expect(diff.netWorthSnapshots).toHaveLength(1);
    expect(diff.customCategories).toHaveLength(1);
  });

  it("filters the backlog collections once backfill is marked done", async () => {
    mockState.encStore.set("@budgetark_sync_backfill_done_v1", "true");
    mockState.snapshots = [snapshot({ dayKey: "2020-01-01", capturedAt: OLD })];
    mockState.customCategories = [customCat({ updatedAt: OLD })];
    const diff = await computeOutgoingDiff(MID);
    expect(diff.netWorthSnapshots).toBeUndefined(); // nothing newer than MID
    expect(diff.customCategories).toEqual([]);
  });

  it("markBackfillSyncDone persists the flag", async () => {
    await markBackfillSyncDone();
    expect(mockState.encStore.get("@budgetark_sync_backfill_done_v1")).toBe("true");
  });
});

describe("applyIncomingDiff - validation gate", () => {
  it("rejects the whole diff if any record is invalid, writing nothing", async () => {
    const bad = emptyDiff({
      debts: [
        { action: "upsert", record: debt({ id: "ok" }) },
        { action: "upsert", record: debt({ id: "bad", rate: 999 }) }, // rate > MAX_RATE
      ],
    });
    await expect(applyIncomingDiff(bad)).rejects.toThrow(/Sync rejected/);
    expect(debtStorage.saveDebts).not.toHaveBeenCalled();
  });

  it("rejects a malformed diff entry (bad action)", async () => {
    const bad = emptyDiff({
      debts: [{ action: "nuke" as any, record: debt() }],
    });
    await expect(applyIncomingDiff(bad)).rejects.toThrow(/malformed debt/);
  });

  it("rejects an invalid category bucket override", async () => {
    const bad = emptyDiff({ categoryBucketOverrides: { Food: "lavish" as any } });
    await expect(applyIncomingDiff(bad)).rejects.toThrow(/bucket override/);
  });

  it("rejects an out-of-range net-worth snapshot", async () => {
    const bad = emptyDiff({
      netWorthSnapshots: [snapshot({ dayKey: "not-a-day" })],
    });
    await expect(applyIncomingDiff(bad)).rejects.toThrow(/snapshot/);
  });

  it("rejects an invalid payoff strategy", async () => {
    const bad = emptyDiff({ payoffStrategy: "yolo" as any });
    await expect(applyIncomingDiff(bad)).rejects.toThrow(/payoff strategy/);
  });

  it("rejects an invalid holding (zero shares)", async () => {
    const bad = emptyDiff({
      holdings: [{ action: "upsert", record: holding({ shares: 0 }) }],
    });
    await expect(applyIncomingDiff(bad)).rejects.toThrow(/holding/);
  });

  it("rejects a holding with a malformed symbol", async () => {
    const bad = emptyDiff({
      holdings: [{ action: "upsert", record: holding({ symbol: "bad symbol!" }) }],
    });
    await expect(applyIncomingDiff(bad)).rejects.toThrow(/holding/);
  });
});

describe("applyIncomingDiff - last-write-wins merge", () => {
  it("applies an incoming record that is newer than local", async () => {
    mockState.debts = [debt({ id: "d1", balance: 100, updatedAt: OLD })];
    await applyIncomingDiff(
      emptyDiff({ debts: [{ action: "upsert", record: debt({ id: "d1", balance: 999, updatedAt: NEW }) }] })
    );
    expect(mockState.debts.find((d: any) => d.id === "d1").balance).toBe(999);
  });

  it("keeps the local record when the incoming one is older", async () => {
    mockState.debts = [debt({ id: "d1", balance: 100, updatedAt: NEW })];
    await applyIncomingDiff(
      emptyDiff({ debts: [{ action: "upsert", record: debt({ id: "d1", balance: 999, updatedAt: OLD }) }] })
    );
    expect(mockState.debts.find((d: any) => d.id === "d1").balance).toBe(100);
  });

  it("does not resurrect a record deleted locally with a newer tombstone", async () => {
    mockState.debts = [debt({ id: "d1", deletedAt: NEW, updatedAt: NEW })];
    await applyIncomingDiff(
      emptyDiff({ debts: [{ action: "upsert", record: debt({ id: "d1", updatedAt: OLD }) }] })
    );
    const merged = mockState.debts.find((d: any) => d.id === "d1");
    expect(merged.deletedAt).toBe(NEW); // tombstone survives
  });

  it("applies an incoming delete that is newer than a live local record", async () => {
    mockState.debts = [debt({ id: "d1", updatedAt: OLD })];
    await applyIncomingDiff(
      emptyDiff({
        debts: [{ action: "delete", record: debt({ id: "d1", deletedAt: NEW, updatedAt: NEW }) }],
      })
    );
    expect(mockState.debts.find((d: any) => d.id === "d1").deletedAt).toBe(NEW);
  });

  it("adds a brand-new incoming record", async () => {
    await applyIncomingDiff(
      emptyDiff({ debts: [{ action: "upsert", record: debt({ id: "new" }) }] })
    );
    expect(mockState.debts.map((d: any) => d.id)).toContain("new");
  });

  it("persists merged payments through encrypted storage", async () => {
    mockState.payments = [payment({ id: "p1", amount: 10, updatedAt: OLD })];
    await applyIncomingDiff(
      emptyDiff({ payments: [{ action: "upsert", record: payment({ id: "p1", amount: 75, updatedAt: NEW }) }] })
    );
    const saved = JSON.parse(mockState.encStore.get("@budgetark_payments"));
    expect(saved.find((p: any) => p.id === "p1").amount).toBe(75);
  });
});

describe("holdings sync", () => {
  it("includes changed holdings in the outgoing diff (upsert + delete)", async () => {
    mockState.holdings = [
      holding({ id: "live", updatedAt: NEW }),
      holding({ id: "gone", deletedAt: NEW, updatedAt: NEW }),
      holding({ id: "stale", updatedAt: OLD }),
    ];
    const diff = await computeOutgoingDiff(MID);
    const byId = Object.fromEntries(
      (diff.holdings ?? []).map((e) => [e.record.id, e.action])
    );
    expect(byId).toEqual({ live: "upsert", gone: "delete" });
  });

  it("merges an incoming holding with last-write-wins", async () => {
    mockState.holdings = [holding({ id: "h1", shares: 5, updatedAt: OLD })];
    await applyIncomingDiff(
      emptyDiff({
        holdings: [{ action: "upsert", record: holding({ id: "h1", shares: 20, updatedAt: NEW }) }],
      })
    );
    expect(mockState.holdings.find((h: any) => h.id === "h1").shares).toBe(20);
  });

  it("does not resurrect a holding deleted locally with a newer tombstone", async () => {
    mockState.holdings = [holding({ id: "h1", deletedAt: NEW, updatedAt: NEW })];
    await applyIncomingDiff(
      emptyDiff({
        holdings: [{ action: "upsert", record: holding({ id: "h1", updatedAt: OLD }) }],
      })
    );
    expect(mockState.holdings.find((h: any) => h.id === "h1").deletedAt).toBe(NEW);
  });
});

describe("applyIncomingDiff - budget limits", () => {
  it("merges per-category limits with last-write-wins", async () => {
    mockState.limitsByMonth = {
      "2026-06": [{ category: "Food", monthlyLimit: 100, updatedAt: OLD }],
    };
    await applyIncomingDiff(
      emptyDiff({
        budgetLimits: [
          {
            monthKey: "2026-06",
            limits: [
              { category: "Food", monthlyLimit: 400, updatedAt: NEW }, // newer -> wins
              { category: "Gas", monthlyLimit: 60, updatedAt: NEW }, // new category
            ],
          },
        ],
      })
    );
    const saved = JSON.parse(
      mockState.encStore.get("@budgetark_budget_limits_by_month")
    );
    const june = Object.fromEntries(
      saved["2026-06"].map((l: any) => [l.category, l.monthlyLimit])
    );
    expect(june).toEqual({ Food: 400, Gas: 60 });
  });
});

describe("applyIncomingDiff - custom category dedup", () => {
  it("de-dupes duplicate names across devices, keeping the newest", async () => {
    mockState.customCategories = [customCat({ id: "c1", name: "Kayaking", updatedAt: OLD })];
    await applyIncomingDiff(
      emptyDiff({
        customCategories: [
          { action: "upsert", record: customCat({ id: "c2", name: "Kayaking", updatedAt: NEW }) },
        ],
      })
    );
    expect(customCatStorage.saveCustomCategoriesFromSync).toHaveBeenCalledTimes(1);
    expect(mockState.customCategories.map((c: any) => c.id)).toEqual(["c2"]);
  });
});

describe("applyIncomingDiff - net-worth snapshots", () => {
  it("unions by dayKey, newer capturedAt wins", async () => {
    mockState.snapshots = [
      snapshot({ dayKey: "2026-06-01", netWorth: 100, capturedAt: OLD }),
      snapshot({ dayKey: "2026-05-01", netWorth: 50, capturedAt: OLD }),
    ];
    await applyIncomingDiff(
      emptyDiff({
        netWorthSnapshots: [
          snapshot({ dayKey: "2026-06-01", netWorth: 999, capturedAt: NEW }), // newer
          snapshot({ dayKey: "2026-07-01", netWorth: 700, capturedAt: NEW }), // new day
        ],
      })
    );
    const byDay = Object.fromEntries(
      mockState.snapshots.map((s: any) => [s.dayKey, s.netWorth])
    );
    expect(byDay).toEqual({ "2026-05-01": 50, "2026-06-01": 999, "2026-07-01": 700 });
  });

  it("skips the write when no incoming snapshot is newer", async () => {
    mockState.snapshots = [snapshot({ dayKey: "2026-06-01", capturedAt: NEW })];
    await applyIncomingDiff(
      emptyDiff({ netWorthSnapshots: [snapshot({ dayKey: "2026-06-01", capturedAt: OLD })] })
    );
    expect(snapshotStorage.saveNetWorthSnapshots).not.toHaveBeenCalled();
  });
});

describe("applyIncomingDiff - milestone plan & payoff strategy LWW", () => {
  it("applies a newer milestone plan and rejects an older one", async () => {
    mockState.milestonePlan = { steps: [{ id: "x" }], updatedAt: MID };
    await applyIncomingDiff(emptyDiff({ debtMilestonePlan: { steps: [], updatedAt: OLD } as any }));
    expect(mockState.milestonePlan.updatedAt).toBe(MID); // older incoming ignored

    await applyIncomingDiff(emptyDiff({ debtMilestonePlan: { steps: [], updatedAt: NEW } as any }));
    expect(mockState.milestonePlan.updatedAt).toBe(NEW); // newer incoming applied
  });

  it("treats a strategy with no timestamp as epoch (local wins)", async () => {
    mockState.strategyEnvelope = { value: "avalanche", updatedAt: NEW };
    await applyIncomingDiff(emptyDiff({ payoffStrategy: "snowball" }));
    expect(mockState.strategyEnvelope.value).toBe("avalanche"); // local newer than epoch
  });

  it("applies a strategy whose timestamp is newer than local", async () => {
    mockState.strategyEnvelope = { value: "avalanche", updatedAt: OLD };
    await applyIncomingDiff(
      emptyDiff({ payoffStrategy: "snowball", payoffStrategyUpdatedAt: NEW })
    );
    expect(mockState.strategyEnvelope).toEqual({ value: "snowball", updatedAt: NEW });
  });

  it("returns the count of changed records", async () => {
    const count = await applyIncomingDiff(
      emptyDiff({
        debts: [{ action: "upsert", record: debt({ id: "d1" }) }],
        payments: [{ action: "upsert", record: payment({ id: "p1" }) }],
      })
    );
    expect(count).toBe(2);
  });
});

/**
 * Companion to diffEngine.test.ts, split out so the fixture migration
 * happening there doesn't collide with new coverage. Guards the same
 * last-write-wins / tombstone contract for savingsGoals and assetAccounts
 * that diffEngine.test.ts already proves for debts/holdings/businesses/
 * people, plus two collection-specific merge behaviors that had no
 * dedicated test: the categoryBucketOverrides key-wise union (no per-key
 * timestamps, so it's overwrite-not-LWW) and computeOutgoingDiff's
 * isFirstSync split for budgetLimits (first sync sends every limit in a
 * changed month regardless of its own updatedAt; incremental sync filters
 * per-category by updatedAt). Mirrors the mocking setup in diffEngine.test.ts
 * exactly - real validators + real category helpers run against an
 * in-memory `mockState`.
 */
import { computeOutgoingDiff, applyIncomingDiff } from "../diffEngine";
import type { SyncDiff } from "../types";

let mockState: any;

jest.mock("../../storage/debtStorage", () => ({
  getDebtsIncludingDeleted: jest.fn(async () => mockState.debts),
  mergeDebtsFromSync: jest.fn(async (merge: any) => {
    mockState.debts = merge(mockState.debts);
  }),
  mergePaymentsFromSync: jest.fn(async (merge: any) => {
    mockState.payments = merge(mockState.payments);
    mockState.encStore.set("@budgetark_payments", JSON.stringify(mockState.payments));
  }),
  getPaymentsIncludingDeleted: jest.fn(async () => mockState.payments),
  getPayoffStrategyEnvelope: jest.fn(async () => mockState.strategyEnvelope),
  savePayoffStrategyEnvelope: jest.fn(async (v: any) => {
    mockState.strategyEnvelope = v;
  }),
}));
jest.mock("../../storage/budgetStorage", () => ({
  getBudgetEntriesIncludingDeleted: jest.fn(async () => mockState.budgetEntries),
  mergeBudgetEntriesFromSync: jest.fn(async (merge: any) => {
    mockState.budgetEntries = merge(mockState.budgetEntries);
  }),
  getAllLimitsByMonthIncludingDeleted: jest.fn(async () => mockState.limitsByMonth),
  mergeLimitHistoryFromSync: jest.fn(async (merge: any) => {
    mockState.limitsByMonth = merge(mockState.limitsByMonth);
    mockState.encStore.set(
      "@budgetark_budget_limits_by_month",
      JSON.stringify(mockState.limitsByMonth)
    );
  }),
}));
jest.mock("../../storage/savingsGoalStorage", () => ({
  getSavingsGoalsIncludingDeleted: jest.fn(async () => mockState.savingsGoals),
  mergeSavingsGoalsFromSync: jest.fn(async (merge: any) => {
    mockState.savingsGoals = merge(mockState.savingsGoals);
  }),
}));
jest.mock("../../storage/assetAccountStorage", () => ({
  getAssetAccountsIncludingDeleted: jest.fn(async () => mockState.assetAccounts),
  mergeAssetAccountsFromSync: jest.fn(async (merge: any) => {
    mockState.assetAccounts = merge(mockState.assetAccounts);
  }),
}));
jest.mock("../../storage/holdingsStorage", () => ({
  getHoldingsIncludingDeleted: jest.fn(async () => mockState.holdings),
  mergeHoldingsFromSync: jest.fn(async (merge: any) => {
    mockState.holdings = merge(mockState.holdings);
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
jest.mock("../../storage/businessStorage", () => ({
  getBusinessesIncludingDeleted: jest.fn(async () => mockState.businesses),
  mergeBusinessesFromSync: jest.fn(async (merge: any) => {
    mockState.businesses = merge(mockState.businesses);
  }),
}));
jest.mock("../../storage/personStorage", () => ({
  getPeopleIncludingDeleted: jest.fn(async () => mockState.people),
  mergePeopleFromSync: jest.fn(async (merge: any) => {
    mockState.people = merge(mockState.people);
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
jest.mock("../../storage/monthlyBalanceStorage", () => ({
  getMonthStartBalances: jest.fn(async () => mockState.monthBalances),
  saveMonthStartBalancesFromSync: jest.fn(async (v: any) => {
    mockState.monthBalances = v;
  }),
}));
// diffEngine now reads the ingest ledger (dismissed-transaction sync) and
// reconciles the Review Inbox through the inbox service; neither is under
// test here (see diffEngine.test.ts), and the real service pulls ESM-only
// deps into this Node suite.
jest.mock("../../storage/reviewInboxStorage", () => ({
  getIngestLedger: jest.fn(async () => mockState.ledger ?? {}),
  mergeLedgerFromSync: jest.fn(async () => 0),
}));
jest.mock("../../services/connections/reviewInboxService", () => ({
  reconcileInboxWithDecisions: jest.fn(async () => 0),
}));
jest.mock("../../storage/encryptedStorage", () => ({
  getItem: jest.fn(async (k: string) =>
    mockState.encStore.has(k) ? mockState.encStore.get(k) : null
  ),
  setItem: jest.fn(async (k: string, v: string) => {
    mockState.encStore.set(k, v);
  }),
}));

const savingsGoalStorage = require("../../storage/savingsGoalStorage");
const assetAccountStorage = require("../../storage/assetAccountStorage");

const OLD = "2026-01-01T00:00:00.000Z";
const MID = "2026-03-01T00:00:00.000Z";
const NEW = "2026-06-01T00:00:00.000Z";

// ── Valid fixtures (must pass the real recordValidators) ──
const savingsGoal = (over: Record<string, unknown> = {}): any => ({
  id: "g1",
  name: "Emergency Fund",
  category: "emergency_fund",
  targetAmount: 5000,
  currentAmount: 1000,
  createdAt: OLD,
  updatedAt: NEW,
  ...over,
});

const assetAccount = (over: Record<string, unknown> = {}): any => ({
  id: "a1",
  name: "HYSA",
  category: "savings",
  balance: 2500,
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
  businesses: [],
  people: [],
  bucketOverrides: {},
  snapshots: [],
  monthBalances: {},
  limitsByMonth: {},
  encStore: new Map<string, string>(),
});

beforeEach(() => {
  mockState = freshState();
});

describe("savings goals sync", () => {
  it("includes changed goals in the outgoing diff (upsert + delete)", async () => {
    mockState.savingsGoals = [
      savingsGoal({ id: "live", updatedAt: NEW }),
      savingsGoal({ id: "gone", deletedAt: NEW, updatedAt: NEW }),
      savingsGoal({ id: "stale", updatedAt: OLD }),
    ];
    const diff = await computeOutgoingDiff(MID);
    const byId = Object.fromEntries(diff.savingsGoals.map((e) => [e.record.id, e.action]));
    expect(byId).toEqual({ live: "upsert", gone: "delete" });
  });

  it("applies an incoming goal newer than local", async () => {
    mockState.savingsGoals = [savingsGoal({ id: "g1", currentAmount: 100, updatedAt: OLD })];
    await applyIncomingDiff(
      emptyDiff({
        savingsGoals: [
          { action: "upsert", record: savingsGoal({ id: "g1", currentAmount: 999, updatedAt: NEW }) },
        ],
      })
    );
    expect(mockState.savingsGoals.find((g: any) => g.id === "g1").currentAmount).toBe(999);
  });

  it("keeps the local goal when the incoming one is older", async () => {
    mockState.savingsGoals = [savingsGoal({ id: "g1", currentAmount: 100, updatedAt: NEW })];
    await applyIncomingDiff(
      emptyDiff({
        savingsGoals: [
          { action: "upsert", record: savingsGoal({ id: "g1", currentAmount: 999, updatedAt: OLD }) },
        ],
      })
    );
    expect(mockState.savingsGoals.find((g: any) => g.id === "g1").currentAmount).toBe(100);
  });

  it("does not resurrect a goal deleted locally with a newer tombstone", async () => {
    mockState.savingsGoals = [savingsGoal({ id: "g1", deletedAt: NEW, updatedAt: NEW })];
    await applyIncomingDiff(
      emptyDiff({
        savingsGoals: [{ action: "upsert", record: savingsGoal({ id: "g1", updatedAt: OLD }) }],
      })
    );
    expect(mockState.savingsGoals.find((g: any) => g.id === "g1").deletedAt).toBe(NEW);
  });

  it("a stale incoming tombstone does not remove a newer live local goal", async () => {
    mockState.savingsGoals = [savingsGoal({ id: "g1", currentAmount: 500, updatedAt: NEW })];
    await applyIncomingDiff(
      emptyDiff({
        savingsGoals: [
          { action: "delete", record: savingsGoal({ id: "g1", deletedAt: OLD, updatedAt: OLD }) },
        ],
      })
    );
    const merged = mockState.savingsGoals.find((g: any) => g.id === "g1");
    expect(merged.deletedAt).toBeUndefined();
    expect(merged.currentAmount).toBe(500);
  });

  it("applies an incoming delete that is newer than a live local goal", async () => {
    mockState.savingsGoals = [savingsGoal({ id: "g1", updatedAt: OLD })];
    await applyIncomingDiff(
      emptyDiff({
        savingsGoals: [
          { action: "delete", record: savingsGoal({ id: "g1", deletedAt: NEW, updatedAt: NEW }) },
        ],
      })
    );
    expect(mockState.savingsGoals.find((g: any) => g.id === "g1").deletedAt).toBe(NEW);
  });

  it("treats a missing local updatedAt as epoch, so a stamped incoming record wins", async () => {
    const legacy = savingsGoal({ id: "g1", currentAmount: 100 });
    delete (legacy as any).updatedAt;
    mockState.savingsGoals = [legacy];
    await applyIncomingDiff(
      emptyDiff({
        savingsGoals: [
          { action: "upsert", record: savingsGoal({ id: "g1", currentAmount: 999, updatedAt: OLD }) },
        ],
      })
    );
    expect(mockState.savingsGoals.find((g: any) => g.id === "g1").currentAmount).toBe(999);
  });

  it("treats a missing incoming updatedAt as epoch, so a stamped local record wins", async () => {
    mockState.savingsGoals = [savingsGoal({ id: "g1", currentAmount: 100, updatedAt: OLD })];
    const incoming = savingsGoal({ id: "g1", currentAmount: 999 });
    delete (incoming as any).updatedAt;
    await applyIncomingDiff(emptyDiff({ savingsGoals: [{ action: "upsert", record: incoming }] }));
    expect(mockState.savingsGoals.find((g: any) => g.id === "g1").currentAmount).toBe(100);
  });

  it("rejects the whole diff on an invalid savings goal record, writing nothing", async () => {
    const bad = emptyDiff({
      savingsGoals: [
        { action: "upsert", record: savingsGoal({ id: "ok" }) },
        { action: "upsert", record: savingsGoal({ id: "bad", targetAmount: 0 }) },
      ],
    });
    await expect(applyIncomingDiff(bad)).rejects.toThrow(/invalid savings goal/);
    expect(savingsGoalStorage.mergeSavingsGoalsFromSync).not.toHaveBeenCalled();
  });
});

describe("asset accounts sync", () => {
  it("includes changed accounts in the outgoing diff (upsert + delete)", async () => {
    mockState.assetAccounts = [
      assetAccount({ id: "live", updatedAt: NEW }),
      assetAccount({ id: "gone", deletedAt: NEW, updatedAt: NEW }),
      assetAccount({ id: "stale", updatedAt: OLD }),
    ];
    const diff = await computeOutgoingDiff(MID);
    const byId = Object.fromEntries((diff.assetAccounts ?? []).map((e) => [e.record.id, e.action]));
    expect(byId).toEqual({ live: "upsert", gone: "delete" });
  });

  it("applies an incoming account newer than local", async () => {
    mockState.assetAccounts = [assetAccount({ id: "a1", balance: 100, updatedAt: OLD })];
    await applyIncomingDiff(
      emptyDiff({
        assetAccounts: [
          { action: "upsert", record: assetAccount({ id: "a1", balance: 999, updatedAt: NEW }) },
        ],
      })
    );
    expect(mockState.assetAccounts.find((a: any) => a.id === "a1").balance).toBe(999);
  });

  it("keeps the local account when the incoming one is older", async () => {
    mockState.assetAccounts = [assetAccount({ id: "a1", balance: 100, updatedAt: NEW })];
    await applyIncomingDiff(
      emptyDiff({
        assetAccounts: [
          { action: "upsert", record: assetAccount({ id: "a1", balance: 999, updatedAt: OLD }) },
        ],
      })
    );
    expect(mockState.assetAccounts.find((a: any) => a.id === "a1").balance).toBe(100);
  });

  it("does not resurrect an account deleted locally with a newer tombstone", async () => {
    mockState.assetAccounts = [assetAccount({ id: "a1", deletedAt: NEW, updatedAt: NEW })];
    await applyIncomingDiff(
      emptyDiff({
        assetAccounts: [{ action: "upsert", record: assetAccount({ id: "a1", updatedAt: OLD }) }],
      })
    );
    expect(mockState.assetAccounts.find((a: any) => a.id === "a1").deletedAt).toBe(NEW);
  });

  it("a stale incoming tombstone does not remove a newer live local account", async () => {
    mockState.assetAccounts = [assetAccount({ id: "a1", balance: 500, updatedAt: NEW })];
    await applyIncomingDiff(
      emptyDiff({
        assetAccounts: [
          { action: "delete", record: assetAccount({ id: "a1", deletedAt: OLD, updatedAt: OLD }) },
        ],
      })
    );
    const merged = mockState.assetAccounts.find((a: any) => a.id === "a1");
    expect(merged.deletedAt).toBeUndefined();
    expect(merged.balance).toBe(500);
  });

  it("applies an incoming delete that is newer than a live local account", async () => {
    mockState.assetAccounts = [assetAccount({ id: "a1", updatedAt: OLD })];
    await applyIncomingDiff(
      emptyDiff({
        assetAccounts: [
          { action: "delete", record: assetAccount({ id: "a1", deletedAt: NEW, updatedAt: NEW }) },
        ],
      })
    );
    expect(mockState.assetAccounts.find((a: any) => a.id === "a1").deletedAt).toBe(NEW);
  });

  it("treats a missing local updatedAt as epoch, so a stamped incoming record wins", async () => {
    const legacy = assetAccount({ id: "a1", balance: 100 });
    delete (legacy as any).updatedAt;
    mockState.assetAccounts = [legacy];
    await applyIncomingDiff(
      emptyDiff({
        assetAccounts: [
          { action: "upsert", record: assetAccount({ id: "a1", balance: 999, updatedAt: OLD }) },
        ],
      })
    );
    expect(mockState.assetAccounts.find((a: any) => a.id === "a1").balance).toBe(999);
  });

  it("treats a missing incoming updatedAt as epoch, so a stamped local record wins", async () => {
    mockState.assetAccounts = [assetAccount({ id: "a1", balance: 100, updatedAt: OLD })];
    const incoming = assetAccount({ id: "a1", balance: 999 });
    delete (incoming as any).updatedAt;
    await applyIncomingDiff(emptyDiff({ assetAccounts: [{ action: "upsert", record: incoming }] }));
    expect(mockState.assetAccounts.find((a: any) => a.id === "a1").balance).toBe(100);
  });

  it("rejects the whole diff on an invalid asset account record, writing nothing", async () => {
    const bad = emptyDiff({
      assetAccounts: [
        { action: "upsert", record: assetAccount({ id: "ok" }) },
        { action: "upsert", record: assetAccount({ id: "bad", balance: -1 }) },
      ],
    });
    await expect(applyIncomingDiff(bad)).rejects.toThrow(/invalid asset account/);
    expect(assetAccountStorage.mergeAssetAccountsFromSync).not.toHaveBeenCalled();
  });

  it("applies cleanly when an older peer's diff omits the assetAccounts field", async () => {
    mockState.assetAccounts = [assetAccount({ id: "a1" })];
    const diff = emptyDiff({});
    delete (diff as any).assetAccounts;
    await expect(applyIncomingDiff(diff)).resolves.toBe(0);
    expect(mockState.assetAccounts).toHaveLength(1);
  });
});

describe("categoryBucketOverrides merge", () => {
  it("sends the whole map whenever non-empty, omits the field when empty", async () => {
    mockState.bucketOverrides = { Coffee: "wants" };
    const diff = await computeOutgoingDiff(MID);
    expect(diff.categoryBucketOverrides).toEqual({ Coffee: "wants" });

    mockState.bucketOverrides = {};
    const diff2 = await computeOutgoingDiff(MID);
    expect(diff2.categoryBucketOverrides).toBeUndefined();
  });

  it("has no per-key timestamps: an incoming key always overwrites the local value", async () => {
    // Documented, deliberate limitation (see diffEngine.ts comment above the
    // merge) - unlike every other collection this is overwrite-wins, not
    // last-write-wins. A local edit made AFTER the partner's stale copy was
    // captured can still be clobbered by a later incoming sync.
    mockState.bucketOverrides = { Coffee: "wants" };
    await applyIncomingDiff(emptyDiff({ categoryBucketOverrides: { Coffee: "savings" } }));
    expect(mockState.bucketOverrides.Coffee).toBe("savings");
  });

  it("unions local-only and incoming-only keys", async () => {
    mockState.bucketOverrides = { Coffee: "wants" };
    await applyIncomingDiff(emptyDiff({ categoryBucketOverrides: { Groceries: "needs" } }));
    expect(mockState.bucketOverrides).toEqual({ Coffee: "wants", Groceries: "needs" });
  });

  it("rejects an unknown bucket value, writing nothing", async () => {
    mockState.bucketOverrides = { Coffee: "wants" };
    await expect(
      applyIncomingDiff(emptyDiff({ categoryBucketOverrides: { Coffee: "lavish" as any } }))
    ).rejects.toThrow(/bucket override/);
    expect(mockState.bucketOverrides).toEqual({ Coffee: "wants" });
  });

  it("does not write when the incoming map is empty", async () => {
    const overridesStorage = require("../../storage/categoryBucketOverridesStorage");
    mockState.bucketOverrides = { Coffee: "wants" };
    await applyIncomingDiff(emptyDiff({ categoryBucketOverrides: {} }));
    expect(overridesStorage.saveCategoryBucketOverridesFromSync).not.toHaveBeenCalled();
  });
});

describe("budgetLimits - isFirstSync sends full history, incremental filters", () => {
  it("first sync (null lastSyncTimestamp) sends every limit in a month regardless of its own updatedAt", async () => {
    mockState.limitsByMonth = {
      "2026-06": [
        { category: "Food", monthlyLimit: 400, updatedAt: OLD },
        { category: "Gas", monthlyLimit: 60, updatedAt: OLD },
      ],
    };
    const diff = await computeOutgoingDiff(null);
    expect(diff.budgetLimits).toEqual([
      {
        monthKey: "2026-06",
        limits: [
          { category: "Food", monthlyLimit: 400, updatedAt: OLD },
          { category: "Gas", monthlyLimit: 60, updatedAt: OLD },
        ],
      },
    ]);
  });

  it("incremental sync (a real lastSyncTimestamp) sends only limits changed since the watermark", async () => {
    mockState.limitsByMonth = {
      "2026-06": [
        { category: "Food", monthlyLimit: 400, updatedAt: OLD }, // unchanged since MID
        { category: "Gas", monthlyLimit: 60, updatedAt: NEW }, // changed since MID
      ],
    };
    const diff = await computeOutgoingDiff(MID);
    expect(diff.budgetLimits).toEqual([
      { monthKey: "2026-06", limits: [{ category: "Gas", monthlyLimit: 60, updatedAt: NEW }] },
    ]);
  });

  it("omits a month entirely from the incremental diff when nothing in it changed", async () => {
    mockState.limitsByMonth = {
      "2026-05": [{ category: "Food", monthlyLimit: 100, updatedAt: OLD }],
      "2026-06": [{ category: "Gas", monthlyLimit: 60, updatedAt: NEW }],
    };
    const diff = await computeOutgoingDiff(MID);
    expect(diff.budgetLimits.map((b) => b.monthKey)).toEqual(["2026-06"]);
  });
});

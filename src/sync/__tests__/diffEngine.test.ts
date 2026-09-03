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
  peerSupportsDismissals,
} from "../diffEngine";
import type { SyncDiff } from "../types";
import {
  makeDebt,
  makePayment,
  makeBudgetEntry,
  makeNetWorthSnapshot,
  makeCustomCategory,
  makeHolding,
  makeBusiness,
  makePerson,
  makeMonthStartBalance,
} from "../../__tests__/fixtures";
import type {
  Debt,
  Payment,
  BudgetEntry,
  NetWorthSnapshot,
  CustomCategory,
  Holding,
  Business,
  Person,
  MonthStartBalance,
} from "../../types";

let mockState: any;

jest.mock("../../storage/debtStorage", () => ({
  getDebtsIncludingDeleted: jest.fn(async () => mockState.debts),
  // The atomic merge helpers hand the merge callback the stored array and
  // persist its return value - the mocks do the same against mockState.
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
jest.mock("../../storage/reviewInboxStorage", () => ({
  getIngestLedger: jest.fn(async () => mockState.ledger),
  // Same LWW rule as the real store: union by key, strictly-newer `at` wins.
  mergeLedgerFromSync: jest.fn(async (incoming: any) => {
    let applied = 0;
    for (const key of Object.keys(incoming)) {
      const local = mockState.ledger[key];
      if (!local || Date.parse(incoming[key].at) > Date.parse(local.at)) {
        mockState.ledger[key] = incoming[key];
        applied++;
      }
    }
    return applied;
  }),
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

const debtStorage = require("../../storage/debtStorage");
const customCatStorage = require("../../storage/customCategoriesStorage");
const snapshotStorage = require("../../storage/netWorthSnapshotStorage");

const OLD = "2026-01-01T00:00:00.000Z";
const MID = "2026-03-01T00:00:00.000Z";
const NEW = "2026-06-01T00:00:00.000Z";

// ── Valid fixtures (must pass the real recordValidators) ──
const debt = (over: Partial<Debt> = {}): Debt =>
  makeDebt({ id: "d1", originalBalance: 2000, createdAt: OLD, updatedAt: NEW, ...over });
const payment = (over: Partial<Payment> = {}): Payment =>
  makePayment({ id: "p1", debtId: "d1", date: OLD, updatedAt: NEW, ...over });
const snapshot = (over: Partial<NetWorthSnapshot> = {}): NetWorthSnapshot =>
  makeNetWorthSnapshot({
    capturedAt: NEW,
    totalAssets: 1000,
    totalDebt: 200,
    netWorth: 800,
    ...over,
  });
const customCat = (over: Partial<CustomCategory> = {}): CustomCategory =>
  makeCustomCategory({
    id: "c1",
    name: "Kayaking",
    icon: "🛶",
    createdAt: OLD,
    updatedAt: NEW,
    ...over,
  });
const holding = (over: Partial<Holding> = {}): Holding =>
  makeHolding({ id: "h1", symbol: "AAPL", costBasis: 1500, createdAt: OLD, updatedAt: NEW, ...over });
const business = (over: Partial<Business> = {}): Business =>
  makeBusiness({ id: "b1", name: "Acme Consulting LLC", createdAt: OLD, updatedAt: NEW, ...over });
const person = (over: Partial<Person> = {}): Person =>
  makePerson({ id: "per1", name: "Sam", createdAt: OLD, updatedAt: NEW, ...over });

const monthBalance = (over: Partial<MonthStartBalance> = {}): MonthStartBalance =>
  makeMonthStartBalance({ balance: 3200, capturedAt: NEW, updatedAt: NEW, ...over });

const budgetEntry = (over: Partial<BudgetEntry> = {}): BudgetEntry =>
  makeBudgetEntry({ id: "e1", amount: 42.5, date: OLD, createdAt: OLD, updatedAt: NEW, ...over });

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
  ledger: {},
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

  it("still sends a record lacking updatedAt on the first sync, and as epoch afterwards", async () => {
    // Regression: `NaN > since` is always false, so such a record was
    // excluded from every diff forever - including the first one.
    const legacy = debt({ id: "legacy" });
    delete (legacy as any).updatedAt;
    mockState.debts = [legacy, debt({ id: "fresh", updatedAt: NEW })];

    const first = await computeOutgoingDiff(null);
    expect(first.debts.map((e) => e.record.id).sort()).toEqual(["fresh", "legacy"]);

    // After a sync the epoch mapping keeps it out of incremental diffs
    // (the storage getters persist a real stamp on read anyway).
    const later = await computeOutgoingDiff(OLD);
    expect(later.debts.map((e) => e.record.id)).toEqual(["fresh"]);
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

  it("markBackfillSyncDone persists both flags when the peer understands dismissals", async () => {
    await markBackfillSyncDone(true);
    expect(mockState.encStore.get("@budgetark_sync_backfill_done_v1")).toBe("true");
    // The dismissed-transactions field has its own marker (added later).
    expect(mockState.encStore.get("@budgetark_sync_backfill_dismissals_v1")).toBe("true");
  });

  it("markBackfillSyncDone leaves the dismissals flag unset after syncing with an older peer", async () => {
    await markBackfillSyncDone(false);
    expect(mockState.encStore.get("@budgetark_sync_backfill_done_v1")).toBe("true");
    expect(mockState.encStore.get("@budgetark_sync_backfill_dismissals_v1")).toBeUndefined();
  });

  it("peerSupportsDismissals keys off the field's presence, not its size", () => {
    expect(peerSupportsDismissals(emptyDiff())).toBe(false);
    expect(peerSupportsDismissals(emptyDiff({ dismissedTransactions: {} }))).toBe(true);
    expect(
      peerSupportsDismissals(
        emptyDiff({ dismissedTransactions: { "simplefin:ACT-1:TXN-A": { status: "dismissed", at: NEW } } })
      )
    ).toBe(true);
  });

  it("never sends private budget entries - live or tombstoned", async () => {
    mockState.budgetEntries = [
      budgetEntry({ id: "public", updatedAt: NEW }),
      budgetEntry({ id: "secret", isPrivate: true, updatedAt: NEW }),
      budgetEntry({
        id: "secret-deleted",
        isPrivate: true,
        deletedAt: NEW,
        updatedAt: NEW,
      }),
    ];
    // Both first sync (send-everything) and incremental must exclude them.
    const first = await computeOutgoingDiff(null);
    expect(first.budgetEntries.map((e) => e.record.id)).toEqual(["public"]);
    const incremental = await computeOutgoingDiff(MID);
    expect(incremental.budgetEntries.map((e) => e.record.id)).toEqual(["public"]);
  });

  it("sends an entry again after the private flag is cleared", async () => {
    mockState.budgetEntries = [
      budgetEntry({ id: "e1", isPrivate: undefined, updatedAt: NEW }),
    ];
    const diff = await computeOutgoingDiff(MID);
    expect(diff.budgetEntries.map((e) => e.record.id)).toEqual(["e1"]);
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
    expect(debtStorage.mergeDebtsFromSync).not.toHaveBeenCalled();
  });

  it("rejects a malformed diff entry (bad action)", async () => {
    const bad = emptyDiff({
      debts: [{ action: "nuke" as any, record: debt() }],
    });
    await expect(applyIncomingDiff(bad)).rejects.toThrow(/malformed debt/);
  });

  it("rejects a diff missing a required collection with a labeled error", async () => {
    // Regression: a missing/non-array collection used to sail past
    // validation (`if (!entries) return`) and crash applyIncomingDiff with
    // a raw TypeError instead of the "Sync rejected" message.
    const missing = emptyDiff();
    delete (missing as any).debts;
    await expect(applyIncomingDiff(missing)).rejects.toThrow(/missing debt collection/);
    expect(debtStorage.mergeDebtsFromSync).not.toHaveBeenCalled();

    const noLimits = emptyDiff();
    delete (noLimits as any).budgetLimits;
    await expect(applyIncomingDiff(noLimits)).rejects.toThrow(/budget limits/);
  });

  it("rejects a non-array collection (required or optional)", async () => {
    await expect(
      applyIncomingDiff(emptyDiff({ payments: {} as any }))
    ).rejects.toThrow(/malformed payment collection/);
    await expect(
      applyIncomingDiff(emptyDiff({ businesses: "nope" as any }))
    ).rejects.toThrow(/malformed business collection/);
  });

  it("tolerates absent optional collections (older peers)", async () => {
    const oldPeer = emptyDiff();
    delete (oldPeer as any).holdings;
    delete (oldPeer as any).assetAccounts; // post-launch addition
    await expect(applyIncomingDiff(oldPeer)).resolves.toBe(0);
  });

  it("rejects an invalid category bucket override", async () => {
    const bad = emptyDiff({ categoryBucketOverrides: { Food: "lavish" as any } });
    await expect(applyIncomingDiff(bad)).rejects.toThrow(/bucket override/);
  });

  it("re-stamps isPrivate when a partner's newer edit wins LWW (no clawback)", async () => {
    // The partner still holds the pre-privacy public copy; their later edit
    // wins on updatedAt. Content must merge, but the flag must survive -
    // otherwise the entry silently resumes syncing out.
    mockState.budgetEntries = [
      budgetEntry({ id: "e1", amount: 42.5, isPrivate: true, updatedAt: MID }),
    ];
    const incoming = emptyDiff({
      budgetEntries: [
        { action: "upsert", record: budgetEntry({ id: "e1", amount: 99, updatedAt: NEW }) },
      ],
    });
    await applyIncomingDiff(incoming);
    const stored = mockState.budgetEntries.find((e: any) => e.id === "e1");
    expect(stored.amount).toBe(99); // partner's content won...
    expect(stored.isPrivate).toBe(true); // ...but privacy sticks
    // And the re-privatized entry still never leaves the device.
    const outgoing = await computeOutgoingDiff(null);
    expect(outgoing.budgetEntries.map((e) => e.record.id)).toEqual([]);
  });

  it("merges loan repayments as a set whichever side wins LWW, honouring tombstones", async () => {
    const rA = { id: "a", amount: 20, date: OLD, createdAt: OLD };
    const rB = { id: "b", amount: 30, date: OLD, createdAt: OLD };
    const rC = { id: "c", amount: 10, date: OLD, createdAt: OLD };
    // Local logged B and removed C; the partner (newer) logged A and still holds C.
    mockState.budgetEntries = [
      budgetEntry({ id: "e1", lentTo: "Sam", loanRepayments: [rB], deletedRepaymentIds: ["c"], updatedAt: MID }),
    ];
    await applyIncomingDiff(
      emptyDiff({
        budgetEntries: [
          {
            action: "upsert",
            record: budgetEntry({ id: "e1", lentTo: "Sam", loanRepayments: [rA, rC], updatedAt: NEW }),
          },
        ],
      }),
    );
    const stored = mockState.budgetEntries.find((e: any) => e.id === "e1");
    expect(stored.loanRepayments.map((r: any) => r.id).sort()).toEqual(["a", "b"]);
    expect(stored.deletedRepaymentIds).toEqual(["c"]);

    // Same scenario with the partner OLDER: local wins, but A is still kept.
    mockState.budgetEntries = [
      budgetEntry({ id: "e1", lentTo: "Sam", loanRepayments: [rB], deletedRepaymentIds: ["c"], updatedAt: NEW }),
    ];
    await applyIncomingDiff(
      emptyDiff({
        budgetEntries: [
          {
            action: "upsert",
            record: budgetEntry({ id: "e1", lentTo: "Sam", loanRepayments: [rA, rC], updatedAt: MID }),
          },
        ],
      }),
    );
    const kept = mockState.budgetEntries.find((e: any) => e.id === "e1");
    expect(kept.updatedAt).toBe(NEW);
    expect(kept.loanRepayments.map((r: any) => r.id).sort()).toEqual(["a", "b"]);
  });

  it("keeps a tombstone private when a stale partner delete wins", async () => {
    mockState.budgetEntries = [
      budgetEntry({ id: "e1", isPrivate: true, updatedAt: MID }),
    ];
    const incoming = emptyDiff({
      budgetEntries: [
        {
          action: "delete",
          record: budgetEntry({ id: "e1", deletedAt: NEW, updatedAt: NEW }),
        },
      ],
    });
    await applyIncomingDiff(incoming);
    const stored = mockState.budgetEntries.find((e: any) => e.id === "e1");
    expect(stored.deletedAt).toBe(NEW);
    expect(stored.isPrivate).toBe(true);
  });

  it("does not invent privacy for entries that were never private", async () => {
    mockState.budgetEntries = [budgetEntry({ id: "e1", updatedAt: MID })];
    const incoming = emptyDiff({
      budgetEntries: [
        { action: "upsert", record: budgetEntry({ id: "e1", amount: 7, updatedAt: NEW }) },
      ],
    });
    await applyIncomingDiff(incoming);
    expect(mockState.budgetEntries[0].isPrivate).toBeUndefined();
  });

  it("rejects a budget entry whose isPrivate is not a boolean", async () => {
    const bad = emptyDiff({
      budgetEntries: [
        // Deliberately malformed - stands in for an untyped wire payload;
        // the point of the test is the runtime validator catching it.
        { action: "upsert", record: budgetEntry({ isPrivate: "yes" as unknown as boolean }) },
      ],
    });
    await expect(applyIncomingDiff(bad)).rejects.toThrow(/budget entry/);
    // A boolean (however unexpected from a well-behaved peer) is accepted.
    const ok = emptyDiff({
      budgetEntries: [
        { action: "upsert", record: budgetEntry({ isPrivate: true }) },
      ],
    });
    await expect(applyIncomingDiff(ok)).resolves.toBeGreaterThan(0);
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

  it("lets a stamped incoming record overwrite a local one that has no updatedAt", async () => {
    // Regression: `x >= NaN` is false, so a legacy local record without
    // updatedAt could never be overwritten - while changedCount still
    // counted the incoming record as applied.
    const legacy = debt({ id: "d1", balance: 100 });
    delete (legacy as any).updatedAt;
    mockState.debts = [legacy];
    const applied = await applyIncomingDiff(
      emptyDiff({ debts: [{ action: "upsert", record: debt({ id: "d1", balance: 999, updatedAt: OLD }) }] })
    );
    expect(mockState.debts.find((d: any) => d.id === "d1").balance).toBe(999);
    expect(applied).toBe(1);
  });

  it("treats an incoming record without updatedAt as epoch, so any stamped local wins", async () => {
    mockState.debts = [debt({ id: "d1", balance: 100, updatedAt: OLD })];
    const incoming = debt({ id: "d1", balance: 999 });
    delete (incoming as any).updatedAt;
    await applyIncomingDiff(emptyDiff({ debts: [{ action: "upsert", record: incoming }] }));
    expect(mockState.debts.find((d: any) => d.id === "d1").balance).toBe(100);
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

describe("applyIncomingDiff - duplicate minimum-due payments", () => {
  // An old-version partner logs its "minimum due" confirmation under a
  // random id, so the same real-world payment arrives as a second record.
  // The post-merge dedupe must tombstone it - the balance only reflects one
  // decrement (LWW on the debt record) - without touching genuine data.
  const dupDebt = () =>
    debt({ balance: 1950, originalBalance: 2000, minPayment: 50, updatedAt: NEW });
  const minPaid = (over: Record<string, unknown> = {}) =>
    payment({ amount: 50, appliedAmount: 50, ...over });

  // Noon-UTC dates so both rows land in the same LOCAL calendar month
  // (paymentMonthKey buckets by local month) whatever timezone runs the tests.
  const JAN_5 = "2026-01-05T12:00:00.000Z";
  const JAN_8 = "2026-01-08T12:00:00.000Z";

  it("tombstones a partner's random-id duplicate of the same month's minimum", async () => {
    mockState.debts = [dupDebt()];
    mockState.payments = [
      minPaid({ id: "duemin:d1:2026-01", date: JAN_5, updatedAt: JAN_5 }),
    ];
    await applyIncomingDiff(
      emptyDiff({
        payments: [
          {
            action: "upsert",
            record: minPaid({ id: "partner-uuid", date: JAN_8, updatedAt: MID }),
          },
        ],
      })
    );
    const saved = JSON.parse(mockState.encStore.get("@budgetark_payments"));
    const live = saved.filter((p: any) => !p.deletedAt);
    expect(live.map((p: any) => p.id)).toEqual(["duemin:d1:2026-01"]);
    // Tombstoned, not dropped - the delete must flow back to the partner.
    const dup = saved.find((p: any) => p.id === "partner-uuid");
    expect(dup.deletedAt).toBeTruthy();
  });

  it("keeps both rows when the balance shows both payments really applied", async () => {
    // Balance 1900 = both $50 decrements applied -> a genuine double payment.
    mockState.debts = [debt({ balance: 1900, originalBalance: 2000, minPayment: 50, updatedAt: NEW })];
    mockState.payments = [
      minPaid({ id: "local-uuid", date: JAN_5, updatedAt: JAN_5 }),
    ];
    await applyIncomingDiff(
      emptyDiff({
        payments: [
          {
            action: "upsert",
            record: minPaid({ id: "partner-uuid", date: JAN_8, updatedAt: MID }),
          },
        ],
      })
    );
    const saved = JSON.parse(mockState.encStore.get("@budgetark_payments"));
    expect(saved.filter((p: any) => !p.deletedAt)).toHaveLength(2);
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

describe("businesses sync", () => {
  it("includes changed businesses in the outgoing diff (upsert + delete)", async () => {
    mockState.businesses = [
      business({ id: "live", updatedAt: NEW }),
      business({ id: "gone", deletedAt: NEW, updatedAt: NEW }),
      business({ id: "stale", updatedAt: OLD }),
    ];
    const diff = await computeOutgoingDiff(MID);
    const byId = Object.fromEntries(
      (diff.businesses ?? []).map((e) => [e.record.id, e.action])
    );
    expect(byId).toEqual({ live: "upsert", gone: "delete" });
  });

  it("merges an incoming business with last-write-wins", async () => {
    mockState.businesses = [business({ id: "b1", name: "Old Name", updatedAt: OLD })];
    await applyIncomingDiff(
      emptyDiff({
        businesses: [
          { action: "upsert", record: business({ id: "b1", name: "New Name", updatedAt: NEW }) },
        ],
      })
    );
    expect(mockState.businesses.find((b: any) => b.id === "b1").name).toBe("New Name");
  });

  it("does not resurrect a business deleted locally with a newer tombstone", async () => {
    mockState.businesses = [business({ id: "b1", deletedAt: NEW, updatedAt: NEW })];
    await applyIncomingDiff(
      emptyDiff({
        businesses: [{ action: "upsert", record: business({ id: "b1", updatedAt: OLD }) }],
      })
    );
    expect(mockState.businesses.find((b: any) => b.id === "b1").deletedAt).toBe(NEW);
  });

  it("applies an incoming business delete that is newer than the live local record", async () => {
    mockState.businesses = [business({ id: "b1", updatedAt: OLD })];
    await applyIncomingDiff(
      emptyDiff({
        businesses: [
          { action: "delete", record: business({ id: "b1", deletedAt: NEW, updatedAt: NEW }) },
        ],
      })
    );
    expect(mockState.businesses.find((b: any) => b.id === "b1").deletedAt).toBe(NEW);
  });

  it("accepts duplicate business names (no dedupe on receive - would brick the merge)", async () => {
    mockState.businesses = [business({ id: "b1", name: "Acme" })];
    await applyIncomingDiff(
      emptyDiff({
        businesses: [{ action: "upsert", record: business({ id: "b2", name: "Acme" }) }],
      })
    );
    expect(mockState.businesses).toHaveLength(2);
  });

  it("rejects the whole diff on an invalid business record, writing nothing", async () => {
    const businessStorage = require("../../storage/businessStorage");
    const bad = emptyDiff({
      businesses: [
        { action: "upsert", record: business({ id: "ok" }) },
        { action: "upsert", record: business({ id: "bad", name: "a".repeat(41) }) },
      ],
    });
    await expect(applyIncomingDiff(bad)).rejects.toThrow(/invalid business/);
    expect(businessStorage.mergeBusinessesFromSync).not.toHaveBeenCalled();
  });

  it("applies cleanly when an older peer's diff omits the businesses field", async () => {
    mockState.businesses = [business({ id: "b1" })];
    const diff = emptyDiff({});
    delete (diff as any).businesses;
    await expect(applyIncomingDiff(diff)).resolves.toBe(0);
    expect(mockState.businesses).toHaveLength(1);
  });
});

describe("people sync", () => {
  it("includes changed people in the outgoing diff (upsert + delete)", async () => {
    mockState.people = [
      person({ id: "live", updatedAt: NEW }),
      person({ id: "gone", deletedAt: NEW, updatedAt: NEW }),
      person({ id: "stale", updatedAt: OLD }),
    ];
    const diff = await computeOutgoingDiff(MID);
    const byId = Object.fromEntries(
      (diff.people ?? []).map((e) => [e.record.id, e.action])
    );
    expect(byId).toEqual({ live: "upsert", gone: "delete" });
  });

  it("merges an incoming person with last-write-wins", async () => {
    mockState.people = [person({ id: "per1", name: "Old Name", updatedAt: OLD })];
    await applyIncomingDiff(
      emptyDiff({
        people: [
          { action: "upsert", record: person({ id: "per1", name: "New Name", updatedAt: NEW }) },
        ],
      })
    );
    expect(mockState.people.find((p: any) => p.id === "per1").name).toBe("New Name");
  });

  it("does not resurrect a person deleted locally with a newer tombstone", async () => {
    mockState.people = [person({ id: "per1", deletedAt: NEW, updatedAt: NEW })];
    await applyIncomingDiff(
      emptyDiff({
        people: [{ action: "upsert", record: person({ id: "per1", updatedAt: OLD }) }],
      })
    );
    expect(mockState.people.find((p: any) => p.id === "per1").deletedAt).toBe(NEW);
  });

  it("rejects the whole diff on an invalid person record, writing nothing", async () => {
    const personStorage = require("../../storage/personStorage");
    const bad = emptyDiff({
      people: [
        { action: "upsert", record: person({ id: "ok" }) },
        { action: "upsert", record: person({ id: "bad", name: "a".repeat(41) }) },
      ],
    });
    await expect(applyIncomingDiff(bad)).rejects.toThrow(/invalid person/);
    expect(personStorage.mergePeopleFromSync).not.toHaveBeenCalled();
  });

  it("applies cleanly when an older peer's diff omits the people field", async () => {
    mockState.people = [person({ id: "per1" })];
    const diff = emptyDiff({});
    delete (diff as any).people;
    await expect(applyIncomingDiff(diff)).resolves.toBe(0);
    expect(mockState.people).toHaveLength(1);
  });
});

describe("budget limits - removals propagate as tombstones", () => {
  it("sends a removed limit's tombstone in the outgoing diff", async () => {
    mockState.limitsByMonth = {
      "2026-06": [
        { category: "Food", monthlyLimit: 400, updatedAt: OLD },
        { category: "Gas", monthlyLimit: 60, updatedAt: NEW, deletedAt: NEW }, // removed after last sync
      ],
    };
    const diff = await computeOutgoingDiff(MID);
    expect(diff.budgetLimits).toEqual([
      {
        monthKey: "2026-06",
        limits: [{ category: "Gas", monthlyLimit: 60, updatedAt: NEW, deletedAt: NEW }],
      },
    ]);
  });

  it("an incoming newer tombstone retires the local live limit (kept as a tombstone)", async () => {
    mockState.limitsByMonth = {
      "2026-06": [{ category: "Gas", monthlyLimit: 60, updatedAt: OLD }],
    };
    await applyIncomingDiff(
      emptyDiff({
        budgetLimits: [
          { monthKey: "2026-06", limits: [{ category: "Gas", monthlyLimit: 60, updatedAt: NEW, deletedAt: NEW }] },
        ],
      })
    );
    const gas = mockState.limitsByMonth["2026-06"].find((l: any) => l.category === "Gas");
    expect(gas.deletedAt).toBe(NEW);
  });

  it("a local newer tombstone beats the partner's stale live copy (no resurrection)", async () => {
    mockState.limitsByMonth = {
      "2026-06": [{ category: "Gas", monthlyLimit: 60, updatedAt: NEW, deletedAt: NEW }],
    };
    await applyIncomingDiff(
      emptyDiff({
        budgetLimits: [
          { monthKey: "2026-06", limits: [{ category: "Gas", monthlyLimit: 60, updatedAt: OLD }] },
        ],
      })
    );
    const gas = mockState.limitsByMonth["2026-06"].find((l: any) => l.category === "Gas");
    expect(gas.deletedAt).toBe(NEW);
  });

  it("rejects a limit whose deletedAt is not a timestamp", async () => {
    await expect(
      applyIncomingDiff(
        emptyDiff({
          budgetLimits: [
            { monthKey: "2026-06", limits: [{ category: "Gas", monthlyLimit: 60, updatedAt: NEW, deletedAt: "soon" }] },
          ],
        })
      )
    ).rejects.toThrow();
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

describe("month-start balances sync", () => {
  const balanceStorage = require("../../storage/monthlyBalanceStorage");

  it("sends the whole map when non-empty, omits the field when empty", async () => {
    mockState.monthBalances = { "2026-07": monthBalance() };
    const diff = await computeOutgoingDiff(MID);
    expect(diff.monthStartBalances).toEqual({ "2026-07": monthBalance() });

    mockState.monthBalances = {};
    const diff2 = await computeOutgoingDiff(MID);
    expect(diff2.monthStartBalances).toBeUndefined();
  });

  it("rejects invalid month keys and malformed records outright", async () => {
    await expect(
      applyIncomingDiff(
        emptyDiff({ monthStartBalances: { "2026-13": monthBalance() } })
      )
    ).rejects.toThrow(/invalid month-start balance/i);
    await expect(
      applyIncomingDiff(
        emptyDiff({
          // Deliberately malformed - the runtime validator, not the type
          // system, is what's under test here.
          monthStartBalances: { "2026-07": monthBalance({ balance: "3200" as unknown as number }) },
        })
      )
    ).rejects.toThrow(/invalid month-start balance/i);
    await expect(
      applyIncomingDiff(
        emptyDiff({ monthStartBalances: "corrupt" as any })
      )
    ).rejects.toThrow(/malformed month-start balances/i);
    expect(mockState.monthBalances).toEqual({}); // nothing was written
  });

  it("merges per month: strictly-newer updatedAt wins, local-only months survive", async () => {
    mockState.monthBalances = {
      "2026-06": monthBalance({ balance: 100, updatedAt: NEW }),
      "2026-05": monthBalance({ balance: 50, updatedAt: OLD }),
    };
    const changed = await applyIncomingDiff(
      emptyDiff({
        monthStartBalances: {
          "2026-06": monthBalance({ balance: 999, updatedAt: OLD }), // older - ignored
          "2026-07": monthBalance({ balance: 700, updatedAt: NEW }), // new month - applied
        },
      })
    );
    expect(changed).toBe(1);
    expect(mockState.monthBalances["2026-06"].balance).toBe(100);
    expect(mockState.monthBalances["2026-05"].balance).toBe(50);
    expect(mockState.monthBalances["2026-07"].balance).toBe(700);
  });

  it("ties keep local and skip the write (idempotent re-broadcast)", async () => {
    mockState.monthBalances = { "2026-07": monthBalance({ balance: 100 }) };
    await applyIncomingDiff(
      emptyDiff({
        monthStartBalances: { "2026-07": monthBalance({ balance: 999 }) }, // same updatedAt
      })
    );
    expect(mockState.monthBalances["2026-07"].balance).toBe(100);
    expect(balanceStorage.saveMonthStartBalancesFromSync).not.toHaveBeenCalled();
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

describe("dismissed bank transactions sync", () => {
  const inboxService = require("../../services/connections/reviewInboxService");
  const KEY_A = "simplefin:ACT-1:TXN-A";
  const KEY_B = "simplefin:ACT-1:TXN-B";
  const dismissed = (at: string, over: Record<string, unknown> = {}) => ({
    status: "dismissed" as const,
    at,
    ...over,
  });

  it("sends only dismissals; approvals never leave the device", async () => {
    mockState.ledger = {
      [KEY_A]: dismissed(NEW, { pendingFingerprint: "ACT-1|-25|2026-05-30" }),
      [KEY_B]: { status: "approved", at: NEW, budgetEntryId: "e1" },
    };
    const diff = await computeOutgoingDiff(null);
    expect(diff.dismissedTransactions).toEqual({
      [KEY_A]: dismissed(NEW, { pendingFingerprint: "ACT-1|-25|2026-05-30" }),
    });
  });

  it("always includes the field - an empty map when there is nothing to send - so the peer can tell we understand it", async () => {
    mockState.ledger = { [KEY_B]: { status: "approved", at: NEW, budgetEntryId: "e1" } };
    const first = await computeOutgoingDiff(null);
    expect(first.dismissedTransactions).toEqual({});
    const incremental = await computeOutgoingDiff(MID);
    expect(incremental.dismissedTransactions).toEqual({});
  });

  it("applies an empty incoming map as a no-op (the capability signal carries no data)", async () => {
    await expect(applyIncomingDiff(emptyDiff({ dismissedTransactions: {} }))).resolves.toBe(0);
    expect(inboxService.reconcileInboxWithDecisions).not.toHaveBeenCalled();
  });

  it("sends the full dismissal backlog until its own backfill flag is set, then only newer ones", async () => {
    mockState.ledger = { [KEY_A]: dismissed(OLD), [KEY_B]: dismissed(NEW) };
    // The v1 flag alone doesn't cover this field - couples past the first
    // backfill still need their pre-existing dismissals sent once.
    mockState.encStore.set("@budgetark_sync_backfill_done_v1", "true");
    const backlog = await computeOutgoingDiff(MID);
    expect(Object.keys(backlog.dismissedTransactions!).sort()).toEqual([KEY_A, KEY_B]);

    await markBackfillSyncDone(true);
    const incremental = await computeOutgoingDiff(MID);
    expect(Object.keys(incremental.dismissedTransactions!)).toEqual([KEY_B]);
  });

  it("keeps sending the full dismissal backlog after a sync with a peer that ignores the field", async () => {
    // A upgrades first and syncs with B still on 1.10.0: B's diff has no
    // dismissedTransactions, so A must not consider its backlog delivered.
    // When B upgrades, A's older dismissals still go out once.
    mockState.ledger = { [KEY_A]: dismissed(OLD), [KEY_B]: dismissed(NEW) };
    await markBackfillSyncDone(false);
    expect(mockState.encStore.get("@budgetark_sync_backfill_done_v1")).toBe("true");
    const stillBacklog = await computeOutgoingDiff(MID);
    expect(Object.keys(stillBacklog.dismissedTransactions!).sort()).toEqual([KEY_A, KEY_B]);
  });

  it("rejects malformed maps, approvals, bad keys, and oversized maps outright", async () => {
    await expect(
      applyIncomingDiff(emptyDiff({ dismissedTransactions: "corrupt" as any }))
    ).rejects.toThrow(/malformed dismissed transactions/i);
    await expect(
      applyIncomingDiff(
        emptyDiff({
          dismissedTransactions: { [KEY_A]: { status: "approved", at: NEW } as any },
        })
      )
    ).rejects.toThrow(/invalid dismissed transaction/i);
    await expect(
      applyIncomingDiff(
        emptyDiff({ dismissedTransactions: { "no-colon-key": dismissed(NEW) } })
      )
    ).rejects.toThrow(/invalid dismissed transaction/i);
    const huge: Record<string, any> = {};
    for (let i = 0; i <= 5000; i++) huge[`simplefin:ACT-1:${i}`] = dismissed(NEW);
    await expect(
      applyIncomingDiff(emptyDiff({ dismissedTransactions: huge }))
    ).rejects.toThrow(/too many dismissed transactions/i);
    expect(mockState.ledger).toEqual({}); // nothing was written
    expect(inboxService.reconcileInboxWithDecisions).not.toHaveBeenCalled();
  });

  it("merges into the ledger (newer wins) and reconciles the inbox afterwards", async () => {
    mockState.ledger = { [KEY_A]: dismissed(NEW) };
    (inboxService.reconcileInboxWithDecisions as jest.Mock).mockResolvedValueOnce(2);
    const changed = await applyIncomingDiff(
      emptyDiff({
        dismissedTransactions: {
          [KEY_A]: dismissed(OLD), // older - ignored
          [KEY_B]: dismissed(NEW, { aliasOf: KEY_A }), // new - applied
        },
      })
    );
    expect(mockState.ledger).toEqual({
      [KEY_A]: dismissed(NEW),
      [KEY_B]: dismissed(NEW, { aliasOf: KEY_A }),
    });
    expect(inboxService.reconcileInboxWithDecisions).toHaveBeenCalledTimes(1);
    expect(changed).toBe(1 + 2); // one ledger key + two retired inbox rows
  });

  it("also reconciles the inbox when a diff brings budget entries (partner approvals)", async () => {
    await applyIncomingDiff(
      emptyDiff({
        budgetEntries: [
          { action: "upsert", record: budgetEntry({ externalTxId: KEY_A, source: "bank" }) },
        ],
      })
    );
    expect(inboxService.reconcileInboxWithDecisions).toHaveBeenCalledTimes(1);
  });

  it("skips the reconciliation when the diff carries neither", async () => {
    await applyIncomingDiff(emptyDiff({ debts: [{ action: "upsert", record: debt() }] }));
    expect(inboxService.reconcileInboxWithDecisions).not.toHaveBeenCalled();
  });

  it("an older peer's diff without the field applies unchanged", async () => {
    mockState.ledger = { [KEY_A]: dismissed(NEW) };
    await applyIncomingDiff(emptyDiff());
    expect(mockState.ledger).toEqual({ [KEY_A]: dismissed(NEW) });
  });
});

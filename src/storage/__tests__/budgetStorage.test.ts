/**
 * Budget entry CRUD must be a read-modify-write against what is CURRENTLY
 * in storage, never a save of the caller's snapshot: partner sync and bank
 * auto-approvals write entries while the Budget tab is mounted, and the
 * old `saveBudgetEntries(stateArray)` pattern hard-deleted those records
 * (the tombstone merge deliberately drops live records absent from its
 * input). These tests pin that every mutation preserves records the
 * caller never saw, plus the tombstone semantics sync and Undo rely on.
 * Storage is mocked with an in-memory map whose `updateItem` runs the
 * updater against the live map, everything else is real.
 */
import type { BudgetEntry, CategoryBudgetLimit } from "../../types";
import {
  BUDGET_STORAGE_KEYS,
  addBudgetEntry,
  addBudgetEntries,
  deleteBudgetEntries,
  deleteBudgetEntry,
  getAllLimitsByMonth,
  getAllLimitsByMonthIncludingDeleted,
  getBudgetEntries,
  getCategoryBudgetLimits,
  mergeLimitHistoryFromSync,
  restoreBudgetEntry,
  saveBudgetEntries,
  saveCategoryBudgetLimits,
  setBudgetEntryCategories,
  updateBudgetEntry,
} from "../budgetStorage";

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

const KEY = BUDGET_STORAGE_KEYS.ENTRIES;
const T0 = "2026-06-01T00:00:00.000Z";
const T1 = "2026-06-15T00:00:00.000Z";

const entry = (over: Partial<BudgetEntry> = {}): BudgetEntry =>
  ({
    id: "e1",
    type: "expense",
    category: "Food",
    amount: 12.5,
    date: "2026-06-01T12:00:00.000Z",
    createdAt: T0,
    updatedAt: T0,
    ...over,
  }) as BudgetEntry;

const seed = (entries: BudgetEntry[]) => mockStore.set(KEY, JSON.stringify(entries));
const stored = (): BudgetEntry[] => JSON.parse(mockStore.get(KEY) ?? "[]");
const ids = (list: BudgetEntry[]) => list.map((e) => e.id).sort();

beforeEach(() => {
  mockStore = new Map();
});

describe("addBudgetEntries", () => {
  it("appends to what is in storage, not to the caller's snapshot", async () => {
    // The screen loaded [e1]; a partner sync then landed e-partner.
    seed([entry({ id: "e1" }), entry({ id: "e-partner" })]);
    const live = await addBudgetEntries([entry({ id: "e-new" })]);
    expect(ids(live)).toEqual(["e-new", "e-partner", "e1"]);
    expect(ids(stored())).toEqual(["e-new", "e-partner", "e1"]);
  });

  it("keeps stored tombstones and returns only live entries", async () => {
    seed([entry({ id: "e1" }), entry({ id: "e-gone", deletedAt: T0 })]);
    const live = await addBudgetEntries([entry({ id: "e2" })]);
    expect(ids(live)).toEqual(["e1", "e2"]);
    expect(ids(stored())).toEqual(["e-gone", "e1", "e2"]);
  });

  it("skips ids already present so a retried save can't duplicate", async () => {
    seed([entry({ id: "e1", amount: 1 })]);
    await addBudgetEntries([entry({ id: "e1", amount: 999 }), entry({ id: "e2" })]);
    const all = stored();
    expect(ids(all)).toEqual(["e1", "e2"]);
    expect(all.find((e) => e.id === "e1")?.amount).toBe(1);
  });

  it("starts from empty when storage is missing or corrupt", async () => {
    await addBudgetEntry(entry({ id: "a" }));
    expect(ids(stored())).toEqual(["a"]);

    mockStore.set(KEY, "{not json");
    await addBudgetEntry(entry({ id: "b" }));
    expect(ids(stored())).toEqual(["b"]);
  });
});

describe("updateBudgetEntry", () => {
  it("patches one record in place and re-stamps updatedAt, leaving unseen records alone", async () => {
    seed([entry({ id: "e1", amount: 10 }), entry({ id: "e-partner", amount: 7 })]);
    const live = await updateBudgetEntry("e1", { amount: 42, id: "hijack" as string });
    const e1 = live.find((e) => e.id === "e1");
    expect(e1?.amount).toBe(42);
    // Patch cannot change the id.
    expect(live.some((e) => e.id === "hijack")).toBe(false);
    expect(new Date(e1!.updatedAt).getTime()).toBeGreaterThan(new Date(T0).getTime());
    // The record this caller never saw is intact.
    expect(live.find((e) => e.id === "e-partner")?.amount).toBe(7);
  });
});

describe("delete / restore", () => {
  it("soft-deletes (tombstone kept for sync) and restore clears it", async () => {
    seed([entry({ id: "e1" }), entry({ id: "e2" })]);
    const afterDelete = await deleteBudgetEntry("e1");
    expect(ids(afterDelete)).toEqual(["e2"]);
    const tomb = stored().find((e) => e.id === "e1");
    expect(tomb?.deletedAt).toBeTruthy();

    const afterRestore = await restoreBudgetEntry("e1");
    expect(ids(afterRestore)).toEqual(["e1", "e2"]);
    expect(stored().find((e) => e.id === "e1")?.deletedAt).toBeUndefined();
  });

  it("bulk delete only tombstones the given live ids", async () => {
    seed([entry({ id: "e1" }), entry({ id: "e2" }), entry({ id: "e3" })]);
    const live = await deleteBudgetEntries(["e1", "e3", "missing"]);
    expect(ids(live)).toEqual(["e2"]);
    expect(stored().filter((e) => e.deletedAt).map((e) => e.id).sort()).toEqual(["e1", "e3"]);
  });
});

describe("setBudgetEntryCategories", () => {
  it("recategorizes only the mapped ids and bumps their updatedAt", async () => {
    seed([entry({ id: "e1" }), entry({ id: "e2" }), entry({ id: "e-partner" })]);
    const live = await setBudgetEntryCategories({ e1: "Grocery", e2: "Restaurant" });
    expect(live.find((e) => e.id === "e1")?.category).toBe("Grocery");
    expect(live.find((e) => e.id === "e2")?.category).toBe("Restaurant");
    expect(live.find((e) => e.id === "e-partner")?.category).toBe("Food");
    expect(live.find((e) => e.id === "e-partner")?.updatedAt).toBe(T0);
  });
});

describe("category limits - removals become tombstones", () => {
  const LIMITS_KEY = BUDGET_STORAGE_KEYS.LIMITS_BY_MONTH;
  const MONTH = "2026-06";
  const limit = (category: string, monthlyLimit: number, updatedAt = T0) =>
    ({ category, monthlyLimit, updatedAt }) as CategoryBudgetLimit;
  const storedMonth = () => (JSON.parse(mockStore.get(LIMITS_KEY) ?? "{}") as Record<string, CategoryBudgetLimit[]>)[MONTH] ?? [];

  it("tombstones a category omitted from the save and hides it from live reads", async () => {
    await saveCategoryBudgetLimits([limit("Food", 400), limit("Gas", 60)], MONTH);
    // User removes the Gas limit: the screen saves the remaining live list.
    await saveCategoryBudgetLimits([limit("Food", 400)], MONTH);

    const stored = storedMonth();
    const gas = stored.find((l) => l.category === "Gas")!;
    expect(gas.deletedAt).toBeTruthy();
    expect(new Date(gas.updatedAt).getTime()).toBeGreaterThan(new Date(T0).getTime());
    // Untouched limit keeps its own stamp.
    expect(stored.find((l) => l.category === "Food")?.updatedAt).toBe(T0);

    expect((await getCategoryBudgetLimits(MONTH)).map((l) => l.category)).toEqual(["Food"]);
    expect((await getAllLimitsByMonth())[MONTH].map((l) => l.category)).toEqual(["Food"]);
    // Sync/export still see the removal.
    expect((await getAllLimitsByMonthIncludingDeleted())[MONTH].map((l) => l.category).sort()).toEqual(["Food", "Gas"]);
  });

  it("resurrects a removed category when it is saved again, and keeps existing tombstones", async () => {
    await saveCategoryBudgetLimits([limit("Food", 400), limit("Gas", 60)], MONTH);
    await saveCategoryBudgetLimits([limit("Food", 400)], MONTH);
    await saveCategoryBudgetLimits([limit("Food", 400), limit("Gas", 75, T1)], MONTH);
    const gas = storedMonth().find((l) => l.category === "Gas")!;
    expect(gas.deletedAt).toBeUndefined();
    expect(gas.monthlyLimit).toBe(75);

    // A tombstone that stays omitted is kept as-is (no re-stamp churn).
    await saveCategoryBudgetLimits([limit("Food", 400)], MONTH);
    const firstTombstone = storedMonth().find((l) => l.category === "Gas")!;
    await saveCategoryBudgetLimits([limit("Food", 400)], MONTH);
    expect(storedMonth().find((l) => l.category === "Gas")).toEqual(firstTombstone);
  });

  it("a month whose limits were all removed reads as empty, not as the previous month's limits", async () => {
    await saveCategoryBudgetLimits([limit("Food", 400)], "2026-05");
    await saveCategoryBudgetLimits([limit("Food", 400)], MONTH);
    await saveCategoryBudgetLimits([], MONTH);
    expect(await getCategoryBudgetLimits(MONTH)).toEqual([]);
    // Fallback for a month with no record still works and is live-only.
    expect((await getCategoryBudgetLimits("2026-07")).map((l) => l.category)).toEqual([]);
    expect((await getCategoryBudgetLimits("2026-05")).map((l) => l.category)).toEqual(["Food"]);
  });

  it("mergeLimitHistoryFromSync hands the merge the stored history including tombstones", async () => {
    await saveCategoryBudgetLimits([limit("Food", 400), limit("Gas", 60)], MONTH);
    await saveCategoryBudgetLimits([limit("Food", 400)], MONTH);
    let seen: string[] = [];
    await mergeLimitHistoryFromSync((history) => {
      seen = history[MONTH].map((l) => l.category).sort();
      return history;
    });
    expect(seen).toEqual(["Food", "Gas"]);
  });
});

describe("saveBudgetEntries (whole-array save, sync/migration use only)", () => {
  it("carries stored tombstones over but drops live records absent from its input", async () => {
    // Documents the exact hazard the CRUD helpers above avoid: a
    // whole-array save is a cleanup primitive, not a screen save path.
    seed([entry({ id: "e1" }), entry({ id: "e-partner" }), entry({ id: "gone", deletedAt: T0 })]);
    await saveBudgetEntries([entry({ id: "e1" })]);
    expect(ids(stored())).toEqual(["e1", "gone"]);
    expect(ids(await getBudgetEntries())).toEqual(["e1"]);
  });
});

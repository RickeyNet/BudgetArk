/**
 * Merge-engine tests for importData.ts, split out of importData.test.ts so
 * that file's fixture migration doesn't collide with this work.
 *
 * Covers the pieces of the transactional import pipeline that aren't
 * "one collection, LWW-by-id" (already covered elsewhere):
 *   - replace-mode `keysToRemove`: only clears storage keys the payload
 *     actually carries data for. A prior version cleared every key in KEYS
 *     unconditionally, which turned a CSV restore (entries only) into
 *     silent destruction of every other collection. This guards the fix,
 *     and also asserts storage keys outside the KEYS map entirely
 *     (unrelated app settings, connection secrets) are never touched by
 *     multiRemove regardless of mode.
 *   - the legacy flat `budgetLimits` array (the shape every spreadsheet
 *     import produces) gets wrapped into the per-month
 *     `budgetLimitsByMonth` structure under the current month key.
 *   - computeMergedSnapshots: per-day union keyed on dayKey, LWW on
 *     capturedAt, verbatim in replace mode.
 *   - computeMergedCustomCategories: LWW by id, missing updatedAt treated
 *     as epoch (loses to anything with a real timestamp), case-insensitive
 *     name-collision dedupe, and that a locally-tombstoned category isn't
 *     resurrected by a stale import (same LWW mechanism as businesses/people).
 *   - importedSingletonWins (via debtMilestones): newer incoming wins,
 *     older loses, and an import with no timestamp at all loses to any
 *     existing local value.
 *
 * Mocking setup (mirrors importData.test.ts):
 *   - ../storage/encryptedStorage -> in-memory Map (inspectable via __store)
 *   - expo-document-picker / expo-file-system -> inert (file-picker path
 *     isn't exercised here)
 *   - ./exportData -> just the two encryption-prefix constants, so the
 *     transitive react-native/storage dependency tree never loads
 *   - ./uuid -> deterministic ids
 */

import { importFromString } from "../importData";
import { getMonthKey } from "../budgetMonths";
import { DEFAULT_CATEGORY_ICON } from "../../data/categoryIcons";
import { DEFAULT_CUSTOM_CATEGORY_BUCKET } from "../../data/categoryBuckets";
import {
  makeDebt,
  makeBudgetEntry,
  makeCustomCategory,
  makeNetWorthSnapshot,
} from "../../__tests__/fixtures";

jest.mock("../../storage/encryptedStorage", () => {
  const store = new Map<string, string>();
  return {
    __store: store,
    getItem: jest.fn(async (k: string) => (store.has(k) ? store.get(k)! : null)),
    setItem: jest.fn(async (k: string, v: string) => {
      store.set(k, v);
    }),
    removeItem: jest.fn(async (k: string) => {
      store.delete(k);
    }),
    multiRemove: jest.fn(async (keys: string[]) => {
      keys.forEach((k) => store.delete(k));
    }),
  };
});

jest.mock("expo-document-picker", () => ({}));
jest.mock("expo-file-system", () => ({ File: class {} }));
jest.mock("../exportData", () => ({
  ENCRYPTED_EXPORT_PREFIX: "__BUDGETARK_ENC__:",
  ENCRYPTED_EXPORT_PREFIX_V2: "__BUDGETARK_ENC2__:",
}));

let uuidCounter = 0;
jest.mock("../uuid", () => ({
  generateUUID: () => `gen-uuid-${++uuidCounter}`,
}));

const storageMock = require("../../storage/encryptedStorage") as {
  __store: Map<string, string>;
};

const KEYS = {
  DEBTS: "@budgetark_debts",
  BUDGET_ENTRIES: "@budgetark_budget_entries",
  BUDGET_LIMITS: "@budgetark_budget_limits_by_month",
  HOLDINGS: "@budgetark_holdings",
  CUSTOM_CATEGORIES: "@budgetark_custom_categories",
  NET_WORTH_SNAPSHOTS: "@budgetark_net_worth_snapshots",
  DEBT_MILESTONES: "@budgetark_debt_milestones",
};

const readStore = (key: string): any => {
  const raw = storageMock.__store.get(key);
  return raw ? JSON.parse(raw) : null;
};

const seed = (key: string, value: unknown) => {
  storageMock.__store.set(key, JSON.stringify(value));
};

beforeEach(() => {
  storageMock.__store.clear();
  uuidCounter = 0;
});

describe("importFromString - replace mode keysToRemove", () => {
  it("only clears collections the payload carries data for, leaving everything else untouched", async () => {
    // A KEYS-listed collection the payload has no data for.
    seed(KEYS.HOLDINGS, [{ id: "h1", symbol: "AAPL", shares: 10 }]);
    // A storage key entirely outside the KEYS map - app settings, never a
    // collection the importer knows about.
    storageMock.__store.set("@budgetark_app_lock", JSON.stringify({ pin: "0000" }));
    // Connection secrets: rule 5 says this key must never even be
    // considered by import/export; assert a replace-mode wipe leaves it
    // alone the same as any other unrelated key.
    storageMock.__store.set(
      "@budgetark_connection_secrets",
      JSON.stringify({ simplefin: "super-secret-token" })
    );
    seed(KEYS.DEBTS, [makeDebt({ id: "old1" }), makeDebt({ id: "old2" })]);

    const result = await importFromString(
      JSON.stringify({ debts: [makeDebt({ id: "new1" })] }),
      "replace"
    );

    expect(result.debts).toBe(1);
    // The collection actually in the payload is replaced wholesale.
    expect(readStore(KEYS.DEBTS).map((d: any) => d.id)).toEqual(["new1"]);
    // A KEYS-listed collection absent from the payload survives untouched -
    // this is the fix for the past data-loss bug (unconditional clearing).
    expect(readStore(KEYS.HOLDINGS)).toEqual([
      { id: "h1", symbol: "AAPL", shares: 10 },
    ]);
    // Keys outside the KEYS map are never candidates for multiRemove at all.
    expect(readStore("@budgetark_app_lock")).toEqual({ pin: "0000" });
    expect(readStore("@budgetark_connection_secrets")).toEqual({
      simplefin: "super-secret-token",
    });
  });
});

describe("importFromString - legacy flat budgetLimits wrap", () => {
  it("wraps a flat budgetLimits array under the current month key", async () => {
    // This is the shape every spreadsheet import produces (no
    // budgetLimitsByMonth field, just a flat array).
    await importFromString(
      JSON.stringify({ budgetLimits: [{ category: "Food", monthlyLimit: 200 }] }),
      "merge"
    );
    const stored = readStore(KEYS.BUDGET_LIMITS);
    const currentMonthKey = getMonthKey();
    expect(Object.keys(stored)).toEqual([currentMonthKey]);
    expect(stored[currentMonthKey]).toHaveLength(1);
    expect(stored[currentMonthKey][0]).toMatchObject({
      category: "Food",
      monthlyLimit: 200,
    });
    // Rows lacking updatedAt get one stamped, so a later sync doesn't treat
    // them as epoch-time and let a stale remote write clobber them.
    expect(typeof stored[currentMonthKey][0].updatedAt).toBe("string");
    expect(Number.isNaN(Date.parse(stored[currentMonthKey][0].updatedAt))).toBe(false);
  });
});

describe("importFromString - computeMergedSnapshots", () => {
  it("keeps whichever side captured a shared day later", async () => {
    seed(KEYS.NET_WORTH_SNAPSHOTS, [
      makeNetWorthSnapshot({
        dayKey: "2026-06-01",
        capturedAt: "2026-06-01T08:00:00.000Z",
        totalAssets: 100,
        netWorth: 90,
      }),
    ]);
    await importFromString(
      JSON.stringify({
        netWorthSnapshots: [
          makeNetWorthSnapshot({
            dayKey: "2026-06-01",
            capturedAt: "2026-06-01T20:00:00.000Z",
            totalAssets: 200,
            netWorth: 180,
          }),
        ],
      }),
      "merge"
    );
    const stored = readStore(KEYS.NET_WORTH_SNAPSHOTS);
    expect(stored).toHaveLength(1);
    expect(stored[0].totalAssets).toBe(200);
  });

  it("keeps the local snapshot when the incoming one for the same day is earlier", async () => {
    seed(KEYS.NET_WORTH_SNAPSHOTS, [
      makeNetWorthSnapshot({
        dayKey: "2026-06-01",
        capturedAt: "2026-06-01T20:00:00.000Z",
        totalAssets: 100,
        netWorth: 90,
      }),
    ]);
    await importFromString(
      JSON.stringify({
        netWorthSnapshots: [
          makeNetWorthSnapshot({
            dayKey: "2026-06-01",
            capturedAt: "2026-06-01T08:00:00.000Z",
            totalAssets: 200,
            netWorth: 180,
          }),
        ],
      }),
      "merge"
    );
    expect(readStore(KEYS.NET_WORTH_SNAPSHOTS)[0].totalAssets).toBe(100);
  });

  it("merge mode unions local-only and imported-only days instead of overwriting the whole array", async () => {
    seed(KEYS.NET_WORTH_SNAPSHOTS, [
      makeNetWorthSnapshot({ dayKey: "2026-06-02", capturedAt: "2026-06-02T00:00:00.000Z" }),
    ]);
    await importFromString(
      JSON.stringify({
        netWorthSnapshots: [
          makeNetWorthSnapshot({ dayKey: "2026-06-03", capturedAt: "2026-06-03T00:00:00.000Z" }),
        ],
      }),
      "merge"
    );
    const days = readStore(KEYS.NET_WORTH_SNAPSHOTS).map((s: any) => s.dayKey);
    expect(days).toEqual(["2026-06-02", "2026-06-03"]);
  });

  it("replace mode takes the import verbatim, dropping local-only days", async () => {
    seed(KEYS.NET_WORTH_SNAPSHOTS, [
      makeNetWorthSnapshot({ dayKey: "2026-06-02", capturedAt: "2026-06-02T00:00:00.000Z" }),
    ]);
    await importFromString(
      JSON.stringify({
        netWorthSnapshots: [
          makeNetWorthSnapshot({ dayKey: "2026-06-03", capturedAt: "2026-06-03T00:00:00.000Z" }),
        ],
      }),
      "replace"
    );
    const days = readStore(KEYS.NET_WORTH_SNAPSHOTS).map((s: any) => s.dayKey);
    expect(days).toEqual(["2026-06-03"]);
  });
});

describe("importFromString - computeMergedCustomCategories", () => {
  it("applies last-write-wins by id, using the newer incoming record", async () => {
    seed(KEYS.CUSTOM_CATEGORIES, {
      categories: [
        makeCustomCategory({ id: "c1", icon: "🐾", updatedAt: "2026-01-01T00:00:00.000Z" }),
      ],
      version: 1,
    });
    await importFromString(
      JSON.stringify({
        customCategories: [
          makeCustomCategory({ id: "c1", icon: "🐕", updatedAt: "2026-06-10T00:00:00.000Z" }),
        ],
      }),
      "merge"
    );
    const categories = readStore(KEYS.CUSTOM_CATEGORIES).categories;
    expect(categories).toHaveLength(1);
    expect(categories[0].icon).toBe("🐕");
  });

  it("treats a missing updatedAt as epoch, so it loses to an existing local record", async () => {
    seed(KEYS.CUSTOM_CATEGORIES, {
      categories: [
        makeCustomCategory({ id: "c1", icon: "🐾", updatedAt: "2026-06-10T00:00:00.000Z" }),
      ],
      version: 1,
    });
    const incomingNoTimestamp = makeCustomCategory({
      id: "c1",
      icon: "🐕",
    }) as unknown as Record<string, unknown>;
    delete incomingNoTimestamp.updatedAt;
    await importFromString(
      JSON.stringify({ customCategories: [incomingNoTimestamp] }),
      "merge"
    );
    const categories = readStore(KEYS.CUSTOM_CATEGORIES).categories;
    expect(categories[0].icon).toBe("🐾"); // unchanged - incoming lost
  });

  it("does not resurrect a locally-tombstoned category from a stale import", async () => {
    // Mirrors the businesses/people tombstone guard: a category the user
    // deleted locally (deletedAt set, updatedAt bumped) must not be
    // silently reverted by re-importing an older backup taken before the
    // delete. This is plain LWW-by-id, not special tombstone code - the
    // deletedAt field just rides along like any other field.
    seed(KEYS.CUSTOM_CATEGORIES, {
      categories: [
        {
          ...makeCustomCategory({ id: "c1", icon: "🐾" }),
          updatedAt: "2026-06-10T00:00:00.000Z",
          deletedAt: "2026-06-10T00:00:00.000Z",
        },
      ],
      version: 1,
    });
    await importFromString(
      JSON.stringify({
        customCategories: [
          makeCustomCategory({ id: "c1", icon: "🐕", updatedAt: "2026-01-01T00:00:00.000Z" }),
        ],
      }),
      "merge"
    );
    const stored = readStore(KEYS.CUSTOM_CATEGORIES).categories[0];
    expect(stored.deletedAt).toBe("2026-06-10T00:00:00.000Z");
    expect(stored.icon).toBe("🐾");
  });

  it("de-dupes a case-insensitive name collision, keeping the newer record", async () => {
    await importFromString(
      JSON.stringify({
        customCategories: [
          makeCustomCategory({
            id: "c1",
            name: "Zoo Fund",
            icon: "🦁",
            updatedAt: "2026-01-01T00:00:00.000Z",
          }),
          makeCustomCategory({
            id: "c2",
            name: "zoo fund",
            icon: "🐘",
            updatedAt: "2026-06-10T00:00:00.000Z",
          }),
        ],
      }),
      "merge"
    );
    const categories = readStore(KEYS.CUSTOM_CATEGORIES).categories;
    expect(categories).toHaveLength(1);
    expect(categories[0]).toMatchObject({ id: "c2", icon: "🐘" });
  });

  it("derives a category definition for a name referenced by an entry but never defined", async () => {
    await importFromString(
      JSON.stringify({
        budgetEntries: [makeBudgetEntry({ id: "e1", category: "Zoo Supplies" })],
      }),
      "merge"
    );
    const categories = readStore(KEYS.CUSTOM_CATEGORIES).categories;
    expect(categories).toHaveLength(1);
    expect(categories[0]).toMatchObject({
      name: "Zoo Supplies",
      icon: DEFAULT_CATEGORY_ICON,
      defaultBucket: DEFAULT_CUSTOM_CATEGORY_BUCKET,
    });
  });
});

describe("importFromString - importedSingletonWins (via debtMilestones)", () => {
  const milestones = (over: Record<string, unknown> = {}) => ({
    steps: [{ id: "s1" }],
    ...over,
  });

  it("writes the incoming value when it is newer than the local one", async () => {
    seed(KEYS.DEBT_MILESTONES, { steps: [], updatedAt: "2026-01-01T00:00:00.000Z" });
    await importFromString(
      JSON.stringify({
        debtMilestones: milestones({ updatedAt: "2026-06-10T00:00:00.000Z" }),
      }),
      "merge"
    );
    expect(readStore(KEYS.DEBT_MILESTONES).steps).toHaveLength(1);
  });

  it("keeps the local value when the incoming one is older", async () => {
    seed(KEYS.DEBT_MILESTONES, { steps: [], updatedAt: "2026-06-10T00:00:00.000Z" });
    await importFromString(
      JSON.stringify({
        debtMilestones: milestones({ updatedAt: "2026-01-01T00:00:00.000Z" }),
      }),
      "merge"
    );
    expect(readStore(KEYS.DEBT_MILESTONES).steps).toHaveLength(0);
  });

  it("treats a missing incoming timestamp as epoch, so it loses to any existing local value", async () => {
    seed(KEYS.DEBT_MILESTONES, { steps: [], updatedAt: "2026-06-10T00:00:00.000Z" });
    await importFromString(
      JSON.stringify({ debtMilestones: milestones() }), // no updatedAt at all
      "merge"
    );
    expect(readStore(KEYS.DEBT_MILESTONES).steps).toHaveLength(0);
  });

  it("always writes in replace mode, regardless of timestamps", async () => {
    seed(KEYS.DEBT_MILESTONES, { steps: [], updatedAt: "2026-06-10T00:00:00.000Z" });
    await importFromString(
      JSON.stringify({ debtMilestones: milestones() }),
      "replace"
    );
    expect(readStore(KEYS.DEBT_MILESTONES).steps).toHaveLength(1);
  });
});

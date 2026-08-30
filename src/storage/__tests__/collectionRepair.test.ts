/**
 * repairCollectionInPlace: the atomic read-repair used by the tombstoned
 * collection getters. The encryptedStorage edge is mocked with a plain-text
 * in-memory updateItem (its queue/crypto behavior has its own tests); these
 * tests pin the repair semantics - what gets purged, what gets normalized,
 * and when storage is left untouched.
 */

const store = new Map<string, string>();
jest.mock("../encryptedStorage", () => ({
  updateItem: jest.fn(
    async (key: string, updater: (current: string | null) => string | null) => {
      const current = store.has(key) ? store.get(key)! : null;
      const next = updater(current);
      if (next !== null && next !== current) store.set(key, next);
    }
  ),
}));

// eslint-disable-next-line import/first -- import after the mock factory registers
import { repairCollectionInPlace } from "../collectionRepair";
// eslint-disable-next-line import/first
import { TOMBSTONE_TTL_MS, Tombstoneable } from "../tombstones";

const KEY = "@test_collection";
const NOW = Date.now();
const EXPIRED = new Date(NOW - TOMBSTONE_TTL_MS - 86_400_000).toISOString();
const FRESH = new Date(NOW - 86_400_000).toISOString();

const live = (id: string): Tombstoneable => ({ id, updatedAt: FRESH });
const dead = (id: string, deletedAt: string): Tombstoneable => ({
  id,
  updatedAt: deletedAt,
  deletedAt,
});

beforeEach(() => store.clear());

describe("repairCollectionInPlace", () => {
  it("purges expired tombstones from the CURRENT stored value", async () => {
    store.set(KEY, JSON.stringify([live("a"), dead("b", EXPIRED), dead("c", FRESH)]));
    await repairCollectionInPlace<Tombstoneable>(KEY, (r) => r);
    const after = JSON.parse(store.get(KEY)!) as Tombstoneable[];
    expect(after.map((r) => r.id)).toEqual(["a", "c"]); // fresh tombstone kept
  });

  it("applies the normalize step and persists its changes", async () => {
    store.set(KEY, JSON.stringify([{ id: "a", updatedAt: "" }]));
    await repairCollectionInPlace<Tombstoneable>(KEY, (r) =>
      r.updatedAt ? r : { ...r, updatedAt: FRESH }
    );
    const after = JSON.parse(store.get(KEY)!) as Tombstoneable[];
    expect(after[0].updatedAt).toBe(FRESH);
  });

  it("leaves clean data untouched (no needless rewrite)", async () => {
    const clean = JSON.stringify([live("a"), dead("c", FRESH)]);
    store.set(KEY, clean);
    await repairCollectionInPlace<Tombstoneable>(KEY, (r) => r);
    expect(store.get(KEY)).toBe(clean);
  });

  it("no-ops on a missing key, garbage JSON, and non-array values", async () => {
    await repairCollectionInPlace<Tombstoneable>(KEY, (r) => r);
    expect(store.has(KEY)).toBe(false);

    store.set(KEY, "not json{");
    await repairCollectionInPlace<Tombstoneable>(KEY, (r) => r);
    expect(store.get(KEY)).toBe("not json{");

    store.set(KEY, JSON.stringify({ nope: true }));
    await repairCollectionInPlace<Tombstoneable>(KEY, (r) => r);
    expect(store.get(KEY)).toBe(JSON.stringify({ nope: true }));
  });
});

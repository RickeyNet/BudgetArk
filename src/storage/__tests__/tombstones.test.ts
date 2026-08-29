/**
 * Every sync-participating collection (debts, payments, budget entries,
 * savings goals, asset accounts) shares these soft-delete primitives, so a
 * bug here is a bug everywhere at once. Pins: `filterLive`/`isLive` treat
 * only `deletedAt` as the tombstone marker; `tombstone`/`untombstone` stamp
 * `updatedAt` correctly for LWW; `mergePreservingTombstones` carries over
 * stored tombstones absent from an incoming live-only array while letting
 * an explicit incoming record win by id; `purgeExpiredTombstones` drops
 * tombstones past the 90-day TTL, keeps everything else, returns the SAME
 * ref when nothing changed, and - the one easy-to-miss edge case - never
 * purges a record whose `deletedAt` doesn't parse as a date (NaN age must
 * not compare as "expired").
 */
import {
  filterLive,
  isLive,
  mergePreservingTombstones,
  purgeExpiredTombstones,
  tombstone,
  untombstone,
  TOMBSTONE_TTL_MS,
  type Tombstoneable,
} from "../tombstones";

interface Rec extends Tombstoneable {
  name: string;
}

const rec = (over: Partial<Rec> = {}): Rec => ({
  id: "r1",
  name: "one",
  updatedAt: "2026-06-01T00:00:00.000Z",
  ...over,
});

describe("isLive / filterLive", () => {
  it("treats a record with no deletedAt as live", () => {
    expect(isLive(rec())).toBe(true);
    expect(isLive(rec({ deletedAt: "2026-06-01T00:00:00.000Z" }))).toBe(false);
  });

  it("filters tombstones out, preserving order of the survivors", () => {
    const live = filterLive([
      rec({ id: "a" }),
      rec({ id: "b", deletedAt: "2026-06-01T00:00:00.000Z" }),
      rec({ id: "c" }),
    ]);
    expect(live.map((r) => r.id)).toEqual(["a", "c"]);
  });
});

describe("tombstone / untombstone", () => {
  it("tombstone stamps deletedAt and updatedAt to the same value, leaving other fields intact", () => {
    const now = "2026-07-01T00:00:00.000Z";
    const result = tombstone(rec({ name: "keepme" }), now);
    expect(result.deletedAt).toBe(now);
    expect(result.updatedAt).toBe(now);
    expect(result.name).toBe("keepme");
  });

  it("untombstone clears deletedAt and bumps updatedAt, without leaving deletedAt as undefined-but-present", () => {
    const tombstoned = tombstone(rec(), "2026-07-01T00:00:00.000Z");
    const revived = untombstone(tombstoned, "2026-07-02T00:00:00.000Z");
    expect(revived.deletedAt).toBeUndefined();
    expect("deletedAt" in revived).toBe(false);
    expect(revived.updatedAt).toBe("2026-07-02T00:00:00.000Z");
  });
});

describe("mergePreservingTombstones", () => {
  it("carries over a stored tombstone missing from incoming", () => {
    const incoming = [rec({ id: "a" })];
    const stored = [
      rec({ id: "a" }),
      rec({ id: "b", deletedAt: "2026-06-01T00:00:00.000Z" }),
    ];
    const merged = mergePreservingTombstones(incoming, stored);
    expect(merged.map((r) => r.id).sort()).toEqual(["a", "b"]);
    expect(merged.find((r) => r.id === "b")?.deletedAt).toBeTruthy();
  });

  it("an incoming record for the same id always wins over a stored tombstone (explicit revive)", () => {
    const stored = [rec({ id: "a", deletedAt: "2026-06-01T00:00:00.000Z" })];
    const incoming = [rec({ id: "a", name: "revived" })];
    const merged = mergePreservingTombstones(incoming, stored);
    expect(merged).toHaveLength(1);
    expect(merged[0].deletedAt).toBeUndefined();
    expect(merged[0].name).toBe("revived");
  });

  it("drops a stored LIVE record absent from incoming - not preserved like a tombstone", () => {
    const stored = [rec({ id: "a" }), rec({ id: "b" })]; // both live
    const incoming = [rec({ id: "a" })];
    const merged = mergePreservingTombstones(incoming, stored);
    expect(merged.map((r) => r.id)).toEqual(["a"]);
  });

  it("returns the incoming array unchanged (by reference) when there is nothing to preserve", () => {
    const incoming = [rec({ id: "a" })];
    const merged = mergePreservingTombstones(incoming, [rec({ id: "a" })]);
    expect(merged).toBe(incoming);
  });
});

describe("purgeExpiredTombstones", () => {
  const NOW = Date.parse("2026-09-01T00:00:00.000Z");

  it("drops a tombstone older than the TTL and keeps one just inside it", () => {
    const justExpired = new Date(NOW - TOMBSTONE_TTL_MS - 1000).toISOString();
    const stillFresh = new Date(NOW - TOMBSTONE_TTL_MS + 1000).toISOString();
    const records = [
      rec({ id: "expired", deletedAt: justExpired }),
      rec({ id: "fresh", deletedAt: stillFresh }),
      rec({ id: "live" }),
    ];
    const purged = purgeExpiredTombstones(records, NOW);
    expect(purged.map((r) => r.id).sort()).toEqual(["fresh", "live"]);
  });

  it("returns the SAME array reference when nothing is dropped", () => {
    const records = [rec({ id: "live" }), rec({ id: "fresh", deletedAt: new Date(NOW).toISOString() })];
    const purged = purgeExpiredTombstones(records, NOW);
    expect(purged).toBe(records);
  });

  it("never purges a tombstone with an unparseable deletedAt (NaN age guard)", () => {
    // Date.parse("garbage") -> NaN, so `now - NaN` is NaN and
    // `Number.isFinite(age)` must gate the drop - otherwise `NaN > TTL`
    // (always false in JS) would coincidentally keep it for the wrong
    // reason and a future refactor to `age >= TTL` could silently start
    // deleting records with corrupt timestamps.
    const records = [rec({ id: "corrupt", deletedAt: "not-a-date" })];
    const purged = purgeExpiredTombstones(records, NOW);
    expect(purged).toBe(records);
    expect(purged.map((r) => r.id)).toEqual(["corrupt"]);
  });

  it("defaults `now` to Date.now() when omitted", () => {
    // Smoke-test the default param path: a tombstone from the present
    // moment must never be treated as expired.
    const records = [rec({ id: "just-now", deletedAt: new Date().toISOString() })];
    expect(purgeExpiredTombstones(records)).toBe(records);
  });
});

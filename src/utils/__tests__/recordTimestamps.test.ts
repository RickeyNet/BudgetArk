/**
 * ensureUpdatedAt is the read-time normalizer every tombstoned collection
 * runs; timestampMs is the NaN-safe comparison sync/import use. Pins the
 * same-ref contract (steady-state reads allocate nothing), the createdAt ->
 * now fallback order, and the epoch mapping for missing/garbage values.
 */
import { ensureUpdatedAt, timestampMs } from "../recordTimestamps";

const T0 = "2026-01-01T00:00:00.000Z";
const NOW = "2026-08-27T12:00:00.000Z";

describe("ensureUpdatedAt", () => {
  it("returns the same reference when updatedAt is present", () => {
    const record = { id: "a", createdAt: T0, updatedAt: "2026-02-01T00:00:00.000Z" };
    expect(ensureUpdatedAt(record, () => NOW)).toBe(record);
  });

  it("falls back to createdAt, then to now", () => {
    expect(ensureUpdatedAt({ id: "a", createdAt: T0 }, () => NOW)).toEqual({
      id: "a",
      createdAt: T0,
      updatedAt: T0,
    });
    const bare: { id: string; createdAt?: string; updatedAt?: string } = { id: "b" };
    expect(ensureUpdatedAt(bare, () => NOW)).toEqual({ id: "b", updatedAt: NOW });
    // An empty string counts as missing.
    expect(ensureUpdatedAt({ id: "c", createdAt: T0, updatedAt: "" }, () => NOW).updatedAt).toBe(T0);
  });

  it("does not mutate its input", () => {
    const record: { id: string; createdAt: string; updatedAt?: string } = { id: "a", createdAt: T0 };
    ensureUpdatedAt(record, () => NOW);
    expect(record.updatedAt).toBeUndefined();
  });
});

describe("timestampMs", () => {
  it("parses ISO timestamps and maps missing/garbage to the epoch", () => {
    expect(timestampMs(T0)).toBe(Date.parse(T0));
    expect(timestampMs(undefined)).toBe(0);
    expect(timestampMs(null)).toBe(0);
    expect(timestampMs("not a date")).toBe(0);
    expect(timestampMs(12345)).toBe(0);
  });

  it("never yields NaN, so comparisons can't silently fail", () => {
    expect(Number.isNaN(timestampMs("garbage"))).toBe(false);
    expect(timestampMs(T0) > timestampMs(undefined)).toBe(true);
  });
});

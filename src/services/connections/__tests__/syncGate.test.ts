import {
  isSyncDue,
  computeFetchWindow,
  AUTO_SYNC_MIN_INTERVAL_MS,
  MANUAL_SYNC_MIN_INTERVAL_MS,
  FETCH_OVERLAP_DAYS,
  INITIAL_BACKFILL_DAYS,
} from "../syncGate";

const NOW = Date.parse("2026-07-01T12:00:00Z");
const iso = (ms: number) => new Date(ms).toISOString();
const DAY = 24 * 3600_000;

describe("isSyncDue", () => {
  it("is always due with no prior attempt or a garbage timestamp", () => {
    expect(isSyncDue(undefined, NOW, false)).toBe(true);
    expect(isSyncDue("garbage", NOW, false)).toBe(true);
  });

  it("gates auto syncs to the 6-hour interval", () => {
    expect(isSyncDue(iso(NOW - AUTO_SYNC_MIN_INTERVAL_MS + 1000), NOW, false)).toBe(false);
    expect(isSyncDue(iso(NOW - AUTO_SYNC_MIN_INTERVAL_MS), NOW, false)).toBe(true);
  });

  it("gates manual syncs to the 15-minute interval", () => {
    expect(isSyncDue(iso(NOW - MANUAL_SYNC_MIN_INTERVAL_MS + 1000), NOW, true)).toBe(false);
    expect(isSyncDue(iso(NOW - MANUAL_SYNC_MIN_INTERVAL_MS), NOW, true)).toBe(true);
  });
});

describe("computeFetchWindow", () => {
  it("backfills 30 days on the first sync", () => {
    const { startDate, endDate } = computeFetchWindow(undefined, NOW);
    expect(startDate.getTime()).toBe(NOW - INITIAL_BACKFILL_DAYS * DAY);
    expect(endDate.getTime()).toBe(NOW);
  });

  it("overlaps the previous sync by 7 days", () => {
    const lastSynced = NOW - 2 * DAY;
    const { startDate } = computeFetchWindow(iso(lastSynced), NOW);
    expect(startDate.getTime()).toBe(lastSynced - FETCH_OVERLAP_DAYS * DAY);
  });

  it("treats a garbage lastSyncedAt as a first sync", () => {
    const { startDate } = computeFetchWindow("garbage", NOW);
    expect(startDate.getTime()).toBe(NOW - INITIAL_BACKFILL_DAYS * DAY);
  });
});

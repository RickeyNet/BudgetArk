import {
  isSyncDue,
  computeFetchWindow,
  AUTO_SYNC_MIN_INTERVAL_MS,
  MANUAL_SYNC_MIN_INTERVAL_MS,
  FETCH_OVERLAP_DAYS,
  INITIAL_BACKFILL_DAYS,
  MAX_GAP_BACKFILL_DAYS,
  planGapBackfill,
  manualRetryBypassesCooldown,
  nextManualSyncAt,
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

describe("computeFetchWindow - explicit re-import", () => {
  it("starts backfillDays ago regardless of lastSyncedAt, capped at MAX_GAP_BACKFILL_DAYS", () => {
    const w = computeFetchWindow(iso(NOW - DAY), NOW, 30);
    expect(w.startDate.getTime()).toBe(NOW - 30 * DAY);
    const capped = computeFetchWindow(iso(NOW - DAY), NOW, 500);
    expect(capped.startDate.getTime()).toBe(NOW - MAX_GAP_BACKFILL_DAYS * DAY);
  });

  it("ignores a zero, negative, or non-finite backfillDays", () => {
    expect(computeFetchWindow(iso(NOW - DAY), NOW, 0).startDate.getTime()).toBe(
      NOW - DAY - FETCH_OVERLAP_DAYS * DAY,
    );
    expect(computeFetchWindow(undefined, NOW, Number.NaN).startDate.getTime()).toBe(
      NOW - INITIAL_BACKFILL_DAYS * DAY,
    );
  });
});

describe("planGapBackfill", () => {
  // Normal window: last sync yesterday, overlap 7 days back.
  const WINDOW_START = NOW - DAY - FETCH_OVERLAP_DAYS * DAY;
  const link = (externalAccountId: string, lastExternalBalanceAt: string, importTransactions = true) => ({
    externalAccountId,
    importTransactions,
    lastExternalBalanceAt,
  });
  const account = (externalAccountId: string, balanceAsOf?: string) => ({
    externalAccountId,
    balanceAsOf,
  });

  it("returns null when every account's balance date sits inside the window", () => {
    expect(
      planGapBackfill({
        links: [link("A", iso(NOW - 2 * DAY))],
        accounts: [account("A", iso(NOW))],
        windowStartMs: WINDOW_START,
        nowMs: NOW,
      }),
    ).toBeNull();
  });

  it("returns null while a dark bank is still dark (date frozen, no jump)", () => {
    expect(
      planGapBackfill({
        links: [link("A", iso(NOW - 30 * DAY))],
        accounts: [account("A", iso(NOW - 30 * DAY))],
        windowStartMs: WINDOW_START,
        nowMs: NOW,
      }),
    ).toBeNull();
  });

  it("plans a re-fetch from the frozen date minus the overlap when the bank comes back", () => {
    const plan = planGapBackfill({
      links: [link("A", iso(NOW - 30 * DAY)), link("B", iso(NOW - 2 * DAY))],
      accounts: [account("A", iso(NOW)), account("B", iso(NOW))],
      windowStartMs: WINDOW_START,
      nowMs: NOW,
    });
    expect(plan).not.toBeNull();
    expect(plan!.staleAccountIds).toEqual(["A"]);
    expect(plan!.startDate.getTime()).toBe(NOW - 30 * DAY - FETCH_OVERLAP_DAYS * DAY);
  });

  it("uses the earliest stale date across several banks and caps at MAX_GAP_BACKFILL_DAYS", () => {
    const plan = planGapBackfill({
      links: [link("A", iso(NOW - 20 * DAY)), link("B", iso(NOW - 400 * DAY))],
      accounts: [account("A", iso(NOW)), account("B", iso(NOW))],
      windowStartMs: WINDOW_START,
      nowMs: NOW,
    });
    expect(plan!.staleAccountIds.sort()).toEqual(["A", "B"]);
    expect(plan!.startDate.getTime()).toBe(NOW - MAX_GAP_BACKFILL_DAYS * DAY);
  });

  it("ignores balance-only links, unlinked accounts, and accounts without a balance date", () => {
    expect(
      planGapBackfill({
        links: [link("A", iso(NOW - 30 * DAY), false), link("C", iso(NOW - 30 * DAY))],
        accounts: [account("A", iso(NOW)), account("B", iso(NOW)), account("C", undefined)],
        windowStartMs: WINDOW_START,
        nowMs: NOW,
      }),
    ).toBeNull();
  });

  it("ignores garbage dates on either side", () => {
    expect(
      planGapBackfill({
        links: [link("A", "not a date")],
        accounts: [account("A", iso(NOW))],
        windowStartMs: WINDOW_START,
        nowMs: NOW,
      }),
    ).toBeNull();
  });

  it("returns null when the capped start would not beat the window anyway", () => {
    // Window already reaches 90+ days back (first-sync style); nothing to gain.
    expect(
      planGapBackfill({
        links: [link("A", iso(NOW - 200 * DAY))],
        accounts: [account("A", iso(NOW))],
        windowStartMs: NOW - 100 * DAY,
        nowMs: NOW,
      }),
    ).toBeNull();
  });
});

describe("manualRetryBypassesCooldown", () => {
  it("is false for a healthy connection with no provider warnings", () => {
    expect(manualRetryBypassesCooldown({ authStatus: "ok" })).toBe(false);
    expect(
      manualRetryBypassesCooldown({ authStatus: "ok", providerWarnings: [] }),
    ).toBe(false);
  });

  it("never bypasses after a provider rate limit, whatever else is wrong", () => {
    expect(
      manualRetryBypassesCooldown({
        authStatus: "error",
        lastErrorCode: "rate-limited",
        providerWarnings: ["Connection to Bank may need attention"],
      }),
    ).toBe(false);
  });

  it("is true when the app marks the connection broken", () => {
    expect(manualRetryBypassesCooldown({ authStatus: "error" })).toBe(true);
    expect(manualRetryBypassesCooldown({ authStatus: "needs-reauth" })).toBe(true);
  });

  it("is true when the bridge reports a bank needing attention", () => {
    expect(
      manualRetryBypassesCooldown({
        authStatus: "ok",
        providerWarnings: ["Chase needs attention"],
      }),
    ).toBe(true);
  });
});

describe("nextManualSyncAt", () => {
  it("returns lastAttemptAt + the manual interval while that is in the future", () => {
    expect(nextManualSyncAt(iso(NOW - 60_000), NOW)).toBe(
      iso(NOW - 60_000 + MANUAL_SYNC_MIN_INTERVAL_MS),
    );
  });

  it("returns null once the cooldown has elapsed (boundary included)", () => {
    expect(nextManualSyncAt(iso(NOW - MANUAL_SYNC_MIN_INTERVAL_MS), NOW)).toBeNull();
    expect(nextManualSyncAt(iso(NOW - DAY), NOW)).toBeNull();
  });

  it("returns null for a missing or unparseable lastAttemptAt", () => {
    expect(nextManualSyncAt(undefined, NOW)).toBeNull();
    expect(nextManualSyncAt("garbage", NOW)).toBeNull();
  });
});

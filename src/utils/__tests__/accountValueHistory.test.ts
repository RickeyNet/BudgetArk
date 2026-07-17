/**
 * BudgetArk - Account Value History Tests
 * File: src/utils/__tests__/accountValueHistory.test.ts
 *
 * Pins the rise/drop tracker math: day-key arithmetic, daily upsert +
 * retention + deleted-account pruning, baseline selection (nearest-at-or-
 * before cutoff, earliest-day fallback, nothing-before-today null), and the
 * category roll-up that excludes baseline-less accounts from both sides.
 */

import type { AssetAccount, CachedQuote, Holding } from "../../types";
import {
  changeSince,
  combineChanges,
  computeAccountValues,
  getDayKey,
  MAX_SNAPSHOTS_PER_ACCOUNT,
  sanitizeAccountValueHistory,
  shiftDayKey,
  upsertAccountValues,
  type AccountValueSnapshot,
} from "../accountValueHistory";

const snap = (dayKey: string, value: number): AccountValueSnapshot => ({
  dayKey,
  value,
});

const account = (
  id: string,
  category: AssetAccount["category"],
  balance: number,
): AssetAccount => ({
  id,
  name: id,
  category,
  balance,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

describe("day keys", () => {
  it("formats local dates as YYYY-MM-DD", () => {
    expect(getDayKey(new Date(2026, 6, 17))).toBe("2026-07-17");
    expect(getDayKey(new Date(2026, 0, 3))).toBe("2026-01-03");
  });

  it("shifts across month and year boundaries", () => {
    expect(shiftDayKey("2026-07-17", -1)).toBe("2026-07-16");
    expect(shiftDayKey("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftDayKey("2026-01-05", -7)).toBe("2025-12-29");
    expect(shiftDayKey("2026-07-17", -30)).toBe("2026-06-17");
  });

  it("returns malformed keys unchanged", () => {
    expect(shiftDayKey("garbage", -1)).toBe("garbage");
  });
});

describe("computeAccountValues", () => {
  const quotes: Record<string, CachedQuote> = {
    VTI: { price: 100, asOf: "2026-07-17T00:00:00.000Z" },
  };
  const holdings: Holding[] = [
    {
      id: "h1",
      symbol: "VTI",
      shares: 2,
      accountId: "broker",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ];

  it("uses the cash balance for non-holdings categories", () => {
    const values = computeAccountValues(
      [account("check", "checking", 1500)],
      holdings,
      quotes,
    );
    expect(values).toEqual({ check: 1500 });
  });

  it("adds holdings market value for holdings-capable categories", () => {
    const values = computeAccountValues(
      [account("broker", "investment", 0), account("hsa1", "hsa", 250)],
      holdings,
      quotes,
    );
    expect(values.broker).toBe(200); // 2 × $100
    expect(values.hsa1).toBe(250); // cash only; no positions attached
  });
});

describe("upsertAccountValues", () => {
  it("appends a new day and keeps the list sorted", () => {
    const next = upsertAccountValues(
      { a: [snap("2026-07-15", 100)] },
      { a: 110 },
      "2026-07-16",
    );
    expect(next.a).toEqual([snap("2026-07-15", 100), snap("2026-07-16", 110)]);
  });

  it("replaces a same-day entry instead of duplicating it", () => {
    const next = upsertAccountValues(
      { a: [snap("2026-07-16", 100)] },
      { a: 120 },
      "2026-07-16",
    );
    expect(next.a).toEqual([snap("2026-07-16", 120)]);
  });

  it("drops history for accounts missing from the capture (deleted)", () => {
    const next = upsertAccountValues(
      { a: [snap("2026-07-15", 100)], gone: [snap("2026-07-15", 50)] },
      { a: 100 },
      "2026-07-16",
    );
    expect(next.gone).toBeUndefined();
  });

  it("caps each account at the retention limit, keeping the newest", () => {
    const long = Array.from({ length: MAX_SNAPSHOTS_PER_ACCOUNT }, (_, i) =>
      snap(shiftDayKey("2026-07-15", i - MAX_SNAPSHOTS_PER_ACCOUNT + 1), i),
    );
    const next = upsertAccountValues({ a: long }, { a: 999 }, "2026-07-16");
    expect(next.a).toHaveLength(MAX_SNAPSHOTS_PER_ACCOUNT);
    expect(next.a[next.a.length - 1]).toEqual(snap("2026-07-16", 999));
    expect(next.a[0].dayKey).toBe(long[1].dayKey);
  });

  it("skips non-finite values but preserves prior history", () => {
    const next = upsertAccountValues(
      { a: [snap("2026-07-15", 100)] },
      { a: Number.NaN },
      "2026-07-16",
    );
    expect(next.a).toEqual([snap("2026-07-15", 100)]);
  });
});

describe("changeSince", () => {
  const today = "2026-07-17";
  const history = [
    snap("2026-07-10", 100),
    snap("2026-07-14", 130),
    snap("2026-07-16", 120),
  ];

  it("compares against the nearest snapshot at or before the cutoff", () => {
    const change = changeSince(history, 150, "2026-07-14", today);
    expect(change).toEqual({
      amount: 20,
      percent: (20 / 130) * 100,
      baselineDayKey: "2026-07-14",
      baselineValue: 130,
    });
  });

  it("falls back to the earliest day when history is younger than the window", () => {
    const change = changeSince(history, 90, "2026-06-17", today);
    expect(change?.baselineDayKey).toBe("2026-07-10");
    expect(change?.amount).toBe(-10);
  });

  it("returns null when the only history is from today", () => {
    expect(changeSince([snap(today, 100)], 100, "2026-07-16", today)).toBeNull();
  });

  it("returns null for empty or missing history", () => {
    expect(changeSince([], 100, "2026-07-16", today)).toBeNull();
    expect(changeSince(undefined, 100, "2026-07-16", today)).toBeNull();
  });

  it("reports a null percent for a ~zero baseline", () => {
    const change = changeSince([snap("2026-07-10", 0)], 50, "2026-07-16", today);
    expect(change?.amount).toBe(50);
    expect(change?.percent).toBeNull();
  });
});

describe("combineChanges", () => {
  it("sums amounts and computes percent from summed baselines", () => {
    const combined = combineChanges([
      { amount: 10, percent: 10, baselineDayKey: "d", baselineValue: 100 },
      { amount: -5, percent: -1.6666, baselineDayKey: "d", baselineValue: 300 },
    ]);
    expect(combined?.amount).toBe(5);
    expect(combined?.percent).toBeCloseTo((5 / 400) * 100);
  });

  it("excludes baseline-less accounts and nulls out when none report", () => {
    expect(combineChanges([null, null])).toBeNull();
    const combined = combineChanges([
      null,
      { amount: 10, percent: 10, baselineDayKey: "d", baselineValue: 100 },
    ]);
    expect(combined?.amount).toBe(10);
  });
});

describe("sanitizeAccountValueHistory", () => {
  it("keeps well-formed rows and sorts them", () => {
    const history = sanitizeAccountValueHistory({
      a: [snap("2026-07-16", 120), snap("2026-07-15", 100)],
    });
    expect(history.a.map((s) => s.dayKey)).toEqual(["2026-07-15", "2026-07-16"]);
  });

  it("fails closed on malformed input", () => {
    expect(sanitizeAccountValueHistory(null)).toEqual({});
    expect(sanitizeAccountValueHistory("nope")).toEqual({});
    expect(sanitizeAccountValueHistory([snap("2026-07-15", 1)])).toEqual({});
    expect(
      sanitizeAccountValueHistory({
        a: "not-an-array",
        b: [{ dayKey: 5, value: 1 }, { dayKey: "2026-07-15", value: "x" }],
        c: [snap("2026-07-15", 100), { dayKey: "2026-07-16" }],
      }),
    ).toEqual({ c: [snap("2026-07-15", 100)] });
  });

  it("strips unknown extra fields from kept rows", () => {
    const history = sanitizeAccountValueHistory({
      a: [{ dayKey: "2026-07-15", value: 100, junk: true }],
    });
    expect(history.a).toEqual([snap("2026-07-15", 100)]);
  });
});

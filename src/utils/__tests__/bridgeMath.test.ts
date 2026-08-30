/**
 * Tests for src/utils/bridgeMath.ts - the pure derivations behind the Bridge
 * (net worth) tab, extracted from BridgeScreen so they can be exercised
 * without a renderer.
 *
 * Focus areas: the trailing cash-flow series across the January year
 * boundary (and how recurring entries roll forward into every month), the
 * per-account rise/drop map, the account/holdings category breakdowns that
 * feed the donut, the emergency-fund double-count guard on the tracked
 * total, and the quote-refresh countdown label.
 *
 * Every clock-dependent helper takes an explicit `now`, so these tests never
 * depend on the wall clock.
 */

import {
  buildAccountBreakdown,
  buildAccountChanges,
  buildAccountDonutSlices,
  buildHoldingsCategoryData,
  buildTrailingCashFlow,
  computeTrackedAccountsTotal,
  formatNextQuoteRefresh,
  hasAnyAccountChange,
  TRAILING_CASH_FLOW_MONTHS,
  type AccountCategoryGroup,
  type HoldingsCategorySection,
} from "../bridgeMath";
import type {
  AccountChangePeriodKey,
  AccountValueHistory,
} from "../accountValueHistory";
import type { AssetAccountCategory, CachedQuote } from "../../types";
import { makeAssetAccount, makeBudgetEntry, makeHolding } from "../../__tests__/fixtures";

/** Locale-independent expectation for the chart's month label. */
const shortMonth = (year: number, monthIndex: number): string =>
  new Date(year, monthIndex, 1).toLocaleDateString(undefined, { month: "short" });

/** A period key no build offers - stands in for a stale persisted value. */
const ROGUE_PERIOD_KEY = "365D" as AccountChangePeriodKey;

const COLORS: Record<AssetAccountCategory, string> = {
  checking: "#c1",
  savings: "#c2",
  retirement: "#c3",
  hsa: "#c4",
  investment: "#c5",
  other: "#c6",
};

describe("buildTrailingCashFlow", () => {
  it("returns six months oldest -> newest, ending with the month of `now`", () => {
    const points = buildTrailingCashFlow([], new Date(2026, 7, 15));
    expect(points).toHaveLength(TRAILING_CASH_FLOW_MONTHS);
    expect(points.map((p) => p.monthKey)).toEqual([
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
    ]);
  });

  it("rolls prior months into the previous year from January", () => {
    const points = buildTrailingCashFlow([], new Date(2026, 0, 3));
    expect(points.map((p) => p.monthKey)).toEqual([
      "2025-08",
      "2025-09",
      "2025-10",
      "2025-11",
      "2025-12",
      "2026-01",
    ]);
    expect(points[0].label).toBe(shortMonth(2025, 7));
    expect(points[5].label).toBe(shortMonth(2026, 0));
  });

  it("rolls prior months into the previous year from February", () => {
    const points = buildTrailingCashFlow([], new Date(2026, 1, 28));
    expect(points.map((p) => p.monthKey)).toEqual([
      "2025-09",
      "2025-10",
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
  });

  it("buckets a December entry into December, not the January window edge", () => {
    const entries = [
      makeBudgetEntry({ id: "dec", type: "expense", amount: 200, date: "2025-12-11" }),
      makeBudgetEntry({ id: "jan", type: "income", amount: 900, date: "2026-01-04" }),
    ];
    const points = buildTrailingCashFlow(entries, new Date(2026, 0, 20));
    const december = points.find((p) => p.monthKey === "2025-12");
    const january = points.find((p) => p.monthKey === "2026-01");
    expect(december).toMatchObject({ income: 0, expense: 200 });
    expect(january).toMatchObject({ income: 900, expense: 0 });
  });

  it("counts a monthly recurring entry in every month from its start onward", () => {
    const entries = [
      makeBudgetEntry({
        id: "rent",
        type: "expense",
        amount: 1500,
        date: "2025-11-01",
        recurring: true,
        recurrenceInterval: 1,
      }),
    ];
    const points = buildTrailingCashFlow(entries, new Date(2026, 0, 20));
    // Window is Aug 2025 -> Jan 2026; the entry starts in November.
    expect(points.map((p) => p.expense)).toEqual([0, 0, 0, 1500, 1500, 1500]);
    expect(points.every((p) => p.income === 0)).toBe(true);
  });

  it("honours a quarterly recurrence interval", () => {
    const entries = [
      makeBudgetEntry({
        id: "insurance",
        type: "expense",
        amount: 300,
        date: "2025-09-15",
        recurring: true,
        recurrenceInterval: 3,
      }),
    ];
    const points = buildTrailingCashFlow(entries, new Date(2026, 1, 5));
    // Window Sep 2025 -> Feb 2026: hits Sep and Dec only.
    expect(points.map((p) => [p.monthKey, p.expense])).toEqual([
      ["2025-09", 300],
      ["2025-10", 0],
      ["2025-11", 0],
      ["2025-12", 300],
      ["2026-01", 0],
      ["2026-02", 0],
    ]);
  });

  it("sums income and expense separately within a month", () => {
    const entries = [
      makeBudgetEntry({ id: "a", type: "income", amount: 2000, date: "2026-08-01" }),
      makeBudgetEntry({ id: "b", type: "income", amount: 150, date: "2026-08-09" }),
      makeBudgetEntry({ id: "c", type: "expense", amount: 75.5, date: "2026-08-14" }),
    ];
    const [latest] = buildTrailingCashFlow(entries, new Date(2026, 7, 20)).slice(-1);
    expect(latest).toMatchObject({ monthKey: "2026-08", income: 2150, expense: 75.5 });
  });

  it("accepts a custom window length", () => {
    const points = buildTrailingCashFlow([], new Date(2026, 0, 10), 3);
    expect(points.map((p) => p.monthKey)).toEqual(["2025-11", "2025-12", "2026-01"]);
  });
});

describe("buildAccountChanges", () => {
  const checking = makeAssetAccount({ id: "acc-1", category: "checking", balance: 1200 });
  const history: AccountValueHistory = {
    "acc-1": [
      { dayKey: "2026-07-01", value: 1000 },
      { dayKey: "2026-08-01", value: 1100 },
    ],
  };
  const now = new Date(2026, 7, 20); // 2026-08-20

  it("compares today's live value against the snapshot at the window cutoff", () => {
    const changes = buildAccountChanges({
      assetAccounts: [checking],
      holdings: [],
      quotes: {},
      history,
      periodKey: "30D",
      now,
    });
    // 30 days back from 2026-08-20 is 2026-07-21; nearest earlier snapshot is
    // 2026-07-01 at 1000.
    expect(changes.get("acc-1")).toMatchObject({
      amount: 200,
      baselineDayKey: "2026-07-01",
      baselineValue: 1000,
    });
    expect(changes.get("acc-1")?.percent).toBeCloseTo(20, 5);
  });

  it("uses the shorter window when a 7D period is selected", () => {
    const changes = buildAccountChanges({
      assetAccounts: [checking],
      holdings: [],
      quotes: {},
      history,
      periodKey: "7D",
      now,
    });
    expect(changes.get("acc-1")).toMatchObject({
      amount: 100,
      baselineDayKey: "2026-08-01",
    });
  });

  it("falls back to the 30D window for an unrecognised period key", () => {
    const rogue = buildAccountChanges({
      assetAccounts: [checking],
      holdings: [],
      quotes: {},
      history,
      periodKey: ROGUE_PERIOD_KEY,
      now,
    });
    const thirty = buildAccountChanges({
      assetAccounts: [checking],
      holdings: [],
      quotes: {},
      history,
      periodKey: "30D",
      now,
    });
    expect(rogue.get("acc-1")).toEqual(thirty.get("acc-1"));
  });

  it("counts an account's priced holdings in today's value", () => {
    const broker = makeAssetAccount({
      id: "acc-2",
      category: "investment",
      balance: 0,
    });
    const quotes: Record<string, CachedQuote> = {
      VTI: { price: 30, asOf: "2026-08-20T00:00:00.000Z" },
    };
    const changes = buildAccountChanges({
      assetAccounts: [broker],
      holdings: [makeHolding({ id: "h-1", accountId: "acc-2", symbol: "VTI", shares: 10 })],
      quotes,
      history: { "acc-2": [{ dayKey: "2026-08-01", value: 250 }] },
      periodKey: "30D",
      now,
    });
    expect(changes.get("acc-2")?.amount).toBeCloseTo(50, 5);
  });

  it("returns null for an account with no history before today", () => {
    const changes = buildAccountChanges({
      assetAccounts: [checking],
      holdings: [],
      quotes: {},
      history: {},
      periodKey: "30D",
      now,
    });
    expect(changes.get("acc-1")).toBeNull();
    expect(hasAnyAccountChange(changes)).toBe(false);
  });

  it("keys one entry per account and reports when any has a baseline", () => {
    const other = makeAssetAccount({ id: "acc-3", category: "savings" });
    const changes = buildAccountChanges({
      assetAccounts: [checking, other],
      holdings: [],
      quotes: {},
      history,
      periodKey: "30D",
      now,
    });
    expect([...changes.keys()]).toEqual(["acc-1", "acc-3"]);
    expect(changes.get("acc-3")).toBeNull();
    expect(hasAnyAccountChange(changes)).toBe(true);
  });
});

describe("buildHoldingsCategoryData", () => {
  const quotes: Record<string, CachedQuote> = {
    VTI: { price: 100, asOf: "2026-08-20T00:00:00.000Z" },
  };

  it("nests each broker's positions under its category and totals them", () => {
    const accounts = [
      makeAssetAccount({ id: "b-1", name: "Fidelity", category: "investment", balance: 0 }),
      makeAssetAccount({ id: "b-2", name: "Roth", category: "retirement", balance: 0 }),
      makeAssetAccount({ id: "c-1", category: "checking", balance: 500 }),
    ];
    const holdings = [
      makeHolding({ id: "h-1", accountId: "b-1", symbol: "VTI", shares: 4 }),
      makeHolding({ id: "h-2", accountId: "b-2", symbol: "VTI", shares: 1 }),
    ];
    const sections = buildHoldingsCategoryData(accounts, holdings, quotes);
    const byCategory = new Map(sections.map((s) => [s.category, s]));
    expect(byCategory.get("investment")).toMatchObject({ total: 400, hasCash: false });
    expect(byCategory.get("investment")?.accounts.map((a) => a.id)).toEqual(["b-1"]);
    expect(byCategory.get("retirement")?.total).toBe(100);
    // The checking account never appears in a holdings section.
    expect(sections.some((s) => s.accounts.some((a) => a.id === "c-1"))).toBe(false);
  });

  it("marks HSA as the cash-bearing category and adds its balance to the total", () => {
    const hsa = makeAssetAccount({ id: "hsa-1", category: "hsa", balance: 250 });
    const sections = buildHoldingsCategoryData(
      [hsa],
      [makeHolding({ id: "h-1", accountId: "hsa-1", symbol: "VTI", shares: 2 })],
      quotes
    );
    const section = sections.find((s) => s.category === "hsa");
    expect(section).toMatchObject({ hasCash: true, total: 450 });
  });

  it("still counts legacy cash sitting on a pure-holdings account", () => {
    const broker = makeAssetAccount({ id: "b-1", category: "investment", balance: 75 });
    const sections = buildHoldingsCategoryData([broker], [], quotes);
    const section = sections.find((s) => s.category === "investment");
    expect(section).toMatchObject({ hasCash: false, total: 75 });
  });

  it("returns every holdings category, empty ones included, with a zero total", () => {
    const sections = buildHoldingsCategoryData([], [], {});
    expect(sections.length).toBeGreaterThan(0);
    expect(sections.every((s) => s.total === 0 && s.accounts.length === 0)).toBe(true);
  });
});

describe("buildAccountBreakdown", () => {
  it("groups and sums non-holdings accounts in ASSET_ACCOUNT_CATEGORIES order", () => {
    const groups = buildAccountBreakdown([
      makeAssetAccount({ id: "s-1", category: "savings", balance: 2000 }),
      makeAssetAccount({ id: "c-1", category: "checking", balance: 300 }),
      makeAssetAccount({ id: "s-2", category: "savings", balance: 500 }),
      makeAssetAccount({ id: "o-1", category: "other", balance: 40 }),
    ]);
    expect(groups.map((g) => g.category)).toEqual(["checking", "savings", "other"]);
    expect(groups.map((g) => g.total)).toEqual([300, 2500, 40]);
    expect(groups[1].accounts.map((a) => a.id)).toEqual(["s-1", "s-2"]);
  });

  it("drops empty groups and excludes holdings categories entirely", () => {
    const groups = buildAccountBreakdown([
      makeAssetAccount({ id: "c-1", category: "checking", balance: 10 }),
      makeAssetAccount({ id: "i-1", category: "investment", balance: 0 }),
      makeAssetAccount({ id: "r-1", category: "retirement", balance: 0 }),
      makeAssetAccount({ id: "h-1", category: "hsa", balance: 900 }),
    ]);
    expect(groups.map((g) => g.category)).toEqual(["checking"]);
  });

  it("keeps a group whose balances net to zero", () => {
    const groups = buildAccountBreakdown([
      makeAssetAccount({ id: "c-1", category: "checking", balance: 0 }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].total).toBe(0);
  });
});

describe("buildAccountDonutSlices", () => {
  const groups: AccountCategoryGroup[] = [
    { category: "checking", accounts: [], total: 300 },
    { category: "savings", accounts: [], total: 0 },
    { category: "other", accounts: [], total: -50 },
  ];
  const sections: HoldingsCategorySection[] = [
    { category: "investment", accounts: [], hasCash: false, total: 1000 },
    { category: "retirement", accounts: [], hasCash: false, total: 0 },
    { category: "hsa", accounts: [], hasCash: true, total: 450 },
  ];

  it("emits plain categories first, then holdings sections, colored by category", () => {
    expect(buildAccountDonutSlices(groups, sections, COLORS)).toEqual([
      { label: "checking", value: 300, color: "#c1" },
      { label: "investment", value: 1000, color: "#c5" },
      { label: "hsa", value: 450, color: "#c4" },
    ]);
  });

  it("skips zero and negative totals on both sides", () => {
    const slices = buildAccountDonutSlices(groups, sections, COLORS);
    expect(slices.some((s) => s.value <= 0)).toBe(false);
    expect(slices.map((s) => s.label)).not.toContain("savings");
    expect(slices.map((s) => s.label)).not.toContain("retirement");
  });

  it("returns nothing when there is no positive value to draw", () => {
    expect(buildAccountDonutSlices([], [], COLORS)).toEqual([]);
  });
});

describe("computeTrackedAccountsTotal", () => {
  it("adds holdings value on top of the cash balances", () => {
    expect(
      computeTrackedAccountsTotal({
        totalAssetBalance: 5000,
        holdingsValue: 2500,
        emergencyFundLinked: false,
        emergencyFundAmount: 0,
      })
    ).toBe(7500);
  });

  it("adds a goal-tracked emergency fund, which lives outside the accounts", () => {
    expect(
      computeTrackedAccountsTotal({
        totalAssetBalance: 5000,
        holdingsValue: 0,
        emergencyFundLinked: false,
        emergencyFundAmount: 1200,
      })
    ).toBe(6200);
  });

  it("does NOT re-add a linked emergency fund (it is already an asset account)", () => {
    expect(
      computeTrackedAccountsTotal({
        totalAssetBalance: 5000,
        holdingsValue: 0,
        emergencyFundLinked: true,
        emergencyFundAmount: 1200,
      })
    ).toBe(5000);
  });

  it("treats a missing emergency-fund goal as zero", () => {
    expect(
      computeTrackedAccountsTotal({
        totalAssetBalance: 100,
        holdingsValue: 10,
        emergencyFundLinked: false,
      })
    ).toBe(110);
    expect(
      computeTrackedAccountsTotal({
        totalAssetBalance: 100,
        holdingsValue: 10,
        emergencyFundLinked: false,
        emergencyFundAmount: null,
      })
    ).toBe(110);
  });
});

describe("formatNextQuoteRefresh", () => {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const last = "2026-08-20T00:00:00.000Z";
  const lastMs = Date.parse(last);

  it("says nothing when prices have never been fetched", () => {
    expect(formatNextQuoteRefresh(null, lastMs)).toBe("");
    expect(formatNextQuoteRefresh(undefined, lastMs)).toBe("");
    expect(formatNextQuoteRefresh("", lastMs)).toBe("");
  });

  it("says nothing for an unparseable timestamp rather than guessing", () => {
    expect(formatNextQuoteRefresh("not-a-date", lastMs)).toBe("");
  });

  it("says nothing once the refresh window is already open", () => {
    expect(formatNextQuoteRefresh(last, lastMs + DAY_MS)).toBe("");
    expect(formatNextQuoteRefresh(last, lastMs + DAY_MS * 3)).toBe("");
  });

  it("counts remaining hours, rounded up, inside the first day", () => {
    // Just after a fetch there are 23h59m left: 24 whole hours rounds up out
    // of the hour branch and reads as a day.
    expect(formatNextQuoteRefresh(last, lastMs + 1000)).toBe("Next update in 1d");
    expect(formatNextQuoteRefresh(last, lastMs + 60 * 60 * 1000)).toBe(
      "Next update in 23h"
    );
    expect(formatNextQuoteRefresh(last, lastMs + DAY_MS - 30 * 60 * 1000)).toBe(
      "Next update in 1h"
    );
  });

  it("switches to whole days when a longer interval is configured", () => {
    const weekMs = 7 * DAY_MS;
    expect(formatNextQuoteRefresh(last, lastMs, weekMs)).toBe("Next update in 7d");
    expect(formatNextQuoteRefresh(last, lastMs + 5 * DAY_MS, weekMs)).toBe(
      "Next update in 2d"
    );
    expect(formatNextQuoteRefresh(last, lastMs + 6.5 * DAY_MS, weekMs)).toBe(
      "Next update in 12h"
    );
  });
});

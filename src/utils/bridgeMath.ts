/**
 * BudgetArk - Bridge Tab Math
 * File: src/utils/bridgeMath.ts
 *
 * Pure derivations behind the Bridge (net worth) tab: the trailing cash-flow
 * series, the per-account rise/drop map, the account/holdings category
 * breakdowns that feed the donut and the section headers, the tracked-total
 * with its emergency-fund double-count guard, and the "next update in Nh"
 * quote-refresh label.
 *
 * Extracted from screens/BridgeScreen.tsx so the arithmetic is unit-testable
 * on Node (no react-native imports) and the screen keeps only thin `useMemo`
 * wrappers. Everything clock-dependent takes an explicit `now` from the
 * caller rather than reading the clock itself, so render stays pure.
 */

import {
  ASSET_ACCOUNT_CATEGORIES,
  HOLDINGS_CATEGORIES,
  categoryIsPureHoldings,
  categorySupportsHoldings,
  type AssetAccount,
  type AssetAccountCategory,
  type BudgetEntry,
  type CachedQuote,
  type Holding,
} from "../types";
import {
  ACCOUNT_CHANGE_PERIODS,
  changeSince,
  computeAccountValues,
  getDayKey,
  shiftDayKey,
  type AccountChange,
  type AccountChangePeriodKey,
  type AccountValueHistory,
} from "./accountValueHistory";
import {
  accountHoldingsValue,
  QUOTE_REFRESH_INTERVAL_MS,
  type HoldingValueOptions,
} from "./holdingsMath";
import { isEntryActiveInMonth } from "./recurrence";

/** How many trailing months the Bridge cash-flow panel shows by default. */
export const TRAILING_CASH_FLOW_MONTHS = 6;

/**
 * One month of the cash-flow series. `label` is what the chart prints;
 * `monthKey` ("YYYY-MM") is the bucket it was summed from, kept on the point
 * so the year rollover is verifiable without re-deriving it.
 */
export interface TrailingCashFlowPoint {
  label: string;
  income: number;
  expense: number;
  monthKey: string;
}

/**
 * Trailing `months` of income vs expense, oldest → newest, ending with the
 * month `now` falls in. Recurring entries count in every month from their
 * start onward (mirrors how the Budget screen rolls them forward), which is
 * why membership goes through isEntryActiveInMonth rather than a date range.
 *
 * Month stepping uses `new Date(year, month - offset, 1)`, so a January or
 * February `now` rolls correctly back into the previous year.
 */
export const buildTrailingCashFlow = (
  entries: BudgetEntry[],
  now: Date,
  months: number = TRAILING_CASH_FLOW_MONTHS,
): TrailingCashFlowPoint[] => {
  const buckets: TrailingCashFlowPoint[] = [];
  for (let offset = months - 1; offset >= 0; offset--) {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    let income = 0;
    let expense = 0;
    for (const entry of entries) {
      if (!isEntryActiveInMonth(entry, monthKey)) continue;
      if (entry.type === "income") income += entry.amount;
      else expense += entry.amount;
    }
    buckets.push({
      label: d.toLocaleDateString(undefined, { month: "short" }),
      income,
      expense,
      monthKey,
    });
  }
  return buckets;
};

/**
 * Rise/drop per account over the selected window, keyed by account id:
 * today's live value (cash + priced holdings, the same math the rows display)
 * against the recorded daily history. A null value means nothing was recorded
 * before today yet. Category headers sum these via combineChanges.
 *
 * An unknown period key falls back to the 30D window, matching the
 * net-worth history card's default range.
 */
export const buildAccountChanges = (input: {
  assetAccounts: AssetAccount[];
  holdings: Holding[];
  quotes: Record<string, CachedQuote>;
  history: AccountValueHistory;
  periodKey: AccountChangePeriodKey;
  now: Date;
  holdingValueOpts?: HoldingValueOptions;
}): Map<string, AccountChange | null> => {
  const { assetAccounts, holdings, quotes, history, periodKey, now, holdingValueOpts } =
    input;
  const period =
    ACCOUNT_CHANGE_PERIODS.find((p) => p.key === periodKey) ?? ACCOUNT_CHANGE_PERIODS[2];
  const today = getDayKey(now);
  const cutoff = shiftDayKey(today, -period.days);
  const values = computeAccountValues(assetAccounts, holdings, quotes, holdingValueOpts);
  const changes = new Map<string, AccountChange | null>();
  for (const account of assetAccounts) {
    changes.set(
      account.id,
      changeSince(history[account.id], values[account.id], cutoff, today),
    );
  }
  return changes;
};

/** True once at least one account has a baseline to compare against. */
export const hasAnyAccountChange = (
  changes: Map<string, AccountChange | null>,
): boolean => {
  for (const change of changes.values()) {
    if (change !== null) return true;
  }
  return false;
};

/** One holdings-capable category section (Investment / Retirement / HSA). */
export interface HoldingsCategorySection {
  category: AssetAccountCategory;
  /** The category's accounts - brokers for Investment/Retirement, providers for HSA. */
  accounts: AssetAccount[];
  /** Whether the cash balance is shown/editable for this category (HSA only). */
  hasCash: boolean;
  /** Section total: every account's positions, plus its stored cash balance. */
  total: number;
}

/**
 * Per-category data for the holdings-capable sections. Pure-holdings
 * categories total their tickers only; HSA adds each account's cash balance
 * to its holdings value. The stored balance is always counted regardless of
 * `hasCash`, so any legacy cash on a pure-holdings account stays consistent
 * with net worth.
 */
export const buildHoldingsCategoryData = (
  assetAccounts: AssetAccount[],
  holdings: Holding[],
  quotes: Record<string, CachedQuote>,
  holdingValueOpts?: HoldingValueOptions,
): HoldingsCategorySection[] =>
  HOLDINGS_CATEGORIES.map((category) => {
    const accounts = assetAccounts.filter((a) => a.category === category);
    const hasCash = !categoryIsPureHoldings(category);
    const total = accounts.reduce((sum, account) => {
      const positions = accountHoldingsValue(
        account.id,
        holdings,
        quotes,
        holdingValueOpts,
      );
      return sum + positions + account.balance;
    }, 0);
    return { category, accounts, hasCash, total };
  });

/** One plain (non-holdings) category group in the accounts list. */
export interface AccountCategoryGroup {
  category: AssetAccountCategory;
  accounts: AssetAccount[];
  total: number;
}

/**
 * Group asset accounts by category, drop empty groups, and tally each.
 * Iteration order follows ASSET_ACCOUNT_CATEGORIES so the UI stays stable
 * regardless of insertion order. Holdings categories are excluded - they
 * render in their own broker-style sections (buildHoldingsCategoryData).
 */
export const buildAccountBreakdown = (
  assetAccounts: AssetAccount[],
): AccountCategoryGroup[] =>
  ASSET_ACCOUNT_CATEGORIES.filter((category) => !categorySupportsHoldings(category))
    .map((category) => {
      const accounts = assetAccounts.filter((a) => a.category === category);
      const total = accounts.reduce((sum, a) => sum + a.balance, 0);
      return { category, accounts, total };
    })
    .filter((group) => group.accounts.length > 0);

/**
 * A donut wedge. Structurally the components' DonutSlice; declared here so
 * the math stays free of react-native imports.
 */
export interface AccountDonutSlice {
  label: string;
  value: number;
  color: string;
}

/**
 * Donut wedges for the assets chart: one per non-empty plain category,
 * then one per holdings category valued by its section total (tickers, plus
 * cash for HSA). Zero/negative totals are skipped - a donut can't draw them.
 */
export const buildAccountDonutSlices = (
  groups: AccountCategoryGroup[],
  holdingsSections: HoldingsCategorySection[],
  colorForCategory: Record<AssetAccountCategory, string>,
): AccountDonutSlice[] => {
  const slices: AccountDonutSlice[] = groups
    .filter((group) => group.total > 0)
    .map((group) => ({
      label: group.category,
      value: group.total,
      color: colorForCategory[group.category],
    }));
  for (const section of holdingsSections) {
    if (section.total > 0) {
      slices.push({
        label: section.category,
        value: section.total,
        color: colorForCategory[section.category],
      });
    }
  }
  return slices;
};

/**
 * The "tracked accounts" headline total. Investment accounts carry a 0
 * balance (their value lives in holdings), so holdings value is added in
 * explicitly. The emergency-fund guard is the load-bearing part: a LINKED
 * fund is already inside `totalAssetBalance` (it *is* designated savings
 * accounts), so only a goal-tracked fund may be added on top - counting both
 * would double the fund.
 */
export const computeTrackedAccountsTotal = (input: {
  totalAssetBalance: number;
  holdingsValue: number;
  emergencyFundLinked: boolean;
  emergencyFundAmount?: number | null;
}): number =>
  input.totalAssetBalance +
  input.holdingsValue +
  (input.emergencyFundLinked ? 0 : (input.emergencyFundAmount ?? 0));

/**
 * Human label for how long until the next quote refresh is allowed, e.g.
 * "Next update in 5h" / "Next update in 2d". Empty string means "nothing to
 * say": never fetched, an unparseable timestamp, or the window is already
 * open (the button speaks for itself then).
 */
export const formatNextQuoteRefresh = (
  lastFetchedAt: string | null | undefined,
  now: number,
  intervalMs: number = QUOTE_REFRESH_INTERVAL_MS,
): string => {
  if (!lastFetchedAt) return "";
  const last = new Date(lastFetchedAt).getTime();
  if (!Number.isFinite(last)) return "";
  const msLeft = last + intervalMs - now;
  if (msLeft <= 0) return "";
  const hours = Math.ceil(msLeft / (60 * 60 * 1000));
  if (hours < 24) return `Next update in ${hours}h`;
  const days = Math.ceil(msLeft / (24 * 60 * 60 * 1000));
  return `Next update in ${days}d`;
};

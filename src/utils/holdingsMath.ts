/**
 * BudgetArk - Holdings Math
 * File: src/utils/holdingsMath.ts
 *
 * Pure helpers for the Live Stock Holdings feature: the weekly-refresh gate,
 * market-value math, and symbol collection. Kept dependency-free (no React
 * Native, no storage) so it's unit-testable under the ts-jest/node config and
 * reusable by both the service layer and net-worth aggregation.
 */

import type { CachedQuote, Holding } from "../types";

/** One refresh per week per device - matches the Worker's throttle window. */
export const QUOTE_REFRESH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

/** Same ticker shape the Worker accepts (uppercase alnum, `.`/`-` allowed). */
const SYMBOL_PATTERN = /^[A-Z0-9.-]{1,12}$/;

/** True if a raw ticker string is well-formed once uppercased + trimmed. */
export const isValidSymbol = (symbol: string): boolean =>
  SYMBOL_PATTERN.test(symbol.trim().toUpperCase());

/** Normalize a ticker to the canonical uppercase, trimmed form. */
export const normalizeSymbol = (symbol: string): string =>
  symbol.trim().toUpperCase();

/**
 * Decide whether a quote refresh is due. Returns true when we've never
 * fetched, the stored timestamp is unparseable, or a full interval has
 * elapsed. The client gate mirrors the Worker's server-side throttle so a
 * well-behaved app rarely makes a call the server would only reject.
 */
export const isQuoteRefreshDue = (
  lastFetchedAt: string | null | undefined,
  now: number,
  intervalMs: number = QUOTE_REFRESH_INTERVAL_MS,
): boolean => {
  if (!lastFetchedAt) return true;
  const last = new Date(lastFetchedAt).getTime();
  if (!Number.isFinite(last)) return true;
  return now - last >= intervalMs;
};

/**
 * Distinct, normalized, valid symbols across a set of holdings. Used to build
 * the batched request to the Worker. Order follows first appearance.
 */
export const collectSymbols = (holdings: Holding[]): string[] => {
  const seen = new Set<string>();
  for (const holding of holdings) {
    const sym = normalizeSymbol(holding.symbol);
    if (isValidSymbol(sym)) seen.add(sym);
  }
  return [...seen];
};

/**
 * Market value of a single holding given the current quote map. Returns 0
 * when there's no cached price (a missing quote must never poison the
 * net-worth total - the position simply contributes nothing until priced).
 */
export const holdingMarketValue = (
  holding: Holding,
  quotes: Record<string, CachedQuote>,
): number => {
  const quote = quotes[normalizeSymbol(holding.symbol)];
  if (!quote || !Number.isFinite(quote.price) || !Number.isFinite(holding.shares)) {
    return 0;
  }
  return holding.shares * quote.price;
};

/** Total market value across all holdings (priced positions only). */
export const holdingsTotalValue = (
  holdings: Holding[],
  quotes: Record<string, CachedQuote>,
): number =>
  holdings.reduce((sum, holding) => sum + holdingMarketValue(holding, quotes), 0);

/**
 * Total market value of the holdings belonging to one account (broker),
 * matched by `accountId`. Used for the per-broker subtotal on the Bridge.
 */
export const accountHoldingsValue = (
  accountId: string,
  holdings: Holding[],
  quotes: Record<string, CachedQuote>,
): number =>
  holdings.reduce(
    (sum, holding) =>
      holding.accountId === accountId
        ? sum + holdingMarketValue(holding, quotes)
        : sum,
    0,
  );

/**
 * Unrealized gain/loss for a holding, or null when it can't be computed
 * (no quote, or no cost basis recorded). costBasis is the TOTAL invested.
 */
export const holdingGainLoss = (
  holding: Holding,
  quotes: Record<string, CachedQuote>,
): number | null => {
  if (holding.costBasis == null || !Number.isFinite(holding.costBasis)) return null;
  const quote = quotes[normalizeSymbol(holding.symbol)];
  if (!quote || !Number.isFinite(quote.price)) return null;
  return holding.shares * quote.price - holding.costBasis;
};

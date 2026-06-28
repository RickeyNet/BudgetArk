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
import { convertAmount } from "./currencyConversion";

/** One refresh per week per device - matches the Worker's throttle window. */
export const QUOTE_REFRESH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Symbol shape the Worker accepts: uppercase alnum, `.`/`-` for class shares /
 * indices, and `/` for crypto pairs (e.g. BTC/USD). Kept in sync with the same
 * regex in the Worker (`parseSymbols`) and `recordValidators`.
 */
const SYMBOL_PATTERN = /^[A-Z0-9./-]{1,15}$/;

/** True if a raw ticker string is well-formed once uppercased + trimmed. */
export const isValidSymbol = (symbol: string): boolean =>
  SYMBOL_PATTERN.test(symbol.trim().toUpperCase());

/** Normalize a ticker to the canonical uppercase, trimmed form. */
export const normalizeSymbol = (symbol: string): string =>
  symbol.trim().toUpperCase();

/**
 * The currency a symbol's quoted price is denominated in. Crypto pairs carry
 * it explicitly after the slash (BTC/USD -> USD, ETH/EUR -> EUR); a plain
 * stock/ETF ticker is assumed USD, since the Worker's provider prices US
 * listings in USD. This is what lets us convert a holding's market value into
 * the user's display currency (everything else stored is already in it).
 */
export const quoteCurrency = (symbol: string): string => {
  const normalized = normalizeSymbol(symbol);
  const slash = normalized.indexOf("/");
  if (slash >= 0) {
    const quote = normalized.slice(slash + 1).trim();
    if (quote) return quote;
  }
  return "USD";
};

/**
 * Optional conversion context for the value helpers below. When
 * `displayCurrency` is set, a holding's market value (computed in its quote
 * currency) is converted into it via `rates` (units-per-USD, defaulting to the
 * static fallback table). Omitting it leaves values in their raw quote
 * currency - the pre-conversion behavior, and a no-op for USD-only portfolios
 * since a USD quote into a USD display currency converts 1:1.
 */
export interface HoldingValueOptions {
  displayCurrency?: string;
  rates?: Record<string, number>;
}

/**
 * Convert a raw market value from a symbol's quote currency into the display
 * currency, if one was requested. Same currency in/out (the common USD case)
 * returns the value untouched.
 */
const toDisplayCurrency = (
  rawValue: number,
  symbol: string,
  opts?: HoldingValueOptions,
): number => {
  if (!opts?.displayCurrency) return rawValue;
  return convertAmount(rawValue, quoteCurrency(symbol), opts.displayCurrency, opts.rates);
};

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
  opts?: HoldingValueOptions,
): number => {
  const quote = quotes[normalizeSymbol(holding.symbol)];
  if (!quote || !Number.isFinite(quote.price) || !Number.isFinite(holding.shares)) {
    return 0;
  }
  return toDisplayCurrency(holding.shares * quote.price, holding.symbol, opts);
};

/** Total market value across all holdings (priced positions only). */
export const holdingsTotalValue = (
  holdings: Holding[],
  quotes: Record<string, CachedQuote>,
  opts?: HoldingValueOptions,
): number =>
  holdings.reduce((sum, holding) => sum + holdingMarketValue(holding, quotes, opts), 0);

/**
 * Total market value of the holdings belonging to one account (broker),
 * matched by `accountId`. Used for the per-broker subtotal on the Bridge.
 */
export const accountHoldingsValue = (
  accountId: string,
  holdings: Holding[],
  quotes: Record<string, CachedQuote>,
  opts?: HoldingValueOptions,
): number =>
  holdings.reduce(
    (sum, holding) =>
      holding.accountId === accountId
        ? sum + holdingMarketValue(holding, quotes, opts)
        : sum,
    0,
  );

/**
 * Unrealized gain/loss for a holding, or null when it can't be computed
 * (no quote, or no cost basis recorded). costBasis is the TOTAL invested,
 * recorded in the user's display currency, so the market value is converted
 * into that currency before subtracting it.
 */
export const holdingGainLoss = (
  holding: Holding,
  quotes: Record<string, CachedQuote>,
  opts?: HoldingValueOptions,
): number | null => {
  if (holding.costBasis == null || !Number.isFinite(holding.costBasis)) return null;
  const quote = quotes[normalizeSymbol(holding.symbol)];
  if (!quote || !Number.isFinite(quote.price)) return null;
  return holdingMarketValue(holding, quotes, opts) - holding.costBasis;
};

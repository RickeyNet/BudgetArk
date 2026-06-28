/**
 * BudgetArk - Quotes Service
 * File: src/services/quotesService.ts
 *
 * Orchestrates fetching stock prices from the quote-proxy Worker and caching
 * them per-device. This is the ONLY module that talks to the network for the
 * holdings feature; storage and math stay side-effect-light and testable.
 *
 * Design rules this enforces:
 *   - One request per week per device (client gate mirrors the Worker throttle).
 *   - Never throws into net-worth math: callers always get the best cache we
 *     have; a network/upstream failure just leaves prices stale.
 *   - Sends a stable `x-device` header so the Worker can throttle abuse without
 *     learning anything about the portfolio.
 */

import { MAX_QUOTE_SYMBOLS, QUOTES_APP_KEY, QUOTES_PROXY_URL } from "../config/quotesConfig";
import { getDeviceId } from "../storage/deviceIdStorage";
import { getHoldings } from "../storage/holdingsStorage";
import {
  getQuoteCache,
  saveQuoteCache,
  type QuoteCache,
} from "../storage/quoteCacheStorage";
import { collectSymbols, isQuoteRefreshDue } from "../utils/holdingsMath";
import type { CachedQuote } from "../types";

/** Outcome of a refresh attempt, for callers that want to surface status. */
export type RefreshOutcome =
  | "updated" // fetched fresh prices from the Worker
  | "fresh" // cache still within the weekly window; no call made
  | "no-symbols" // user holds nothing to price
  | "rate-limited" // Worker throttled this device (429)
  | "unavailable"; // network/upstream failure; cache left as-is

export interface RefreshResult {
  outcome: RefreshOutcome;
  cache: QuoteCache;
}

/** Network timeout for the Worker call - prices are non-critical, fail fast. */
const REQUEST_TIMEOUT_MS = 10_000;

const buildUrl = (symbols: string[]): string => {
  const capped = symbols.slice(0, MAX_QUOTE_SYMBOLS);
  const query = encodeURIComponent(capped.join(","));
  return `${QUOTES_PROXY_URL}/quotes?symbols=${query}`;
};

/**
 * Refresh prices if due. Reads live holdings, applies the weekly gate, and on
 * a successful fetch merges the new prices into the per-device cache and
 * stamps `lastFetchedAt`. Returns the resulting cache regardless of outcome so
 * the caller can render immediately.
 *
 * @param options.force  skip the weekly gate (e.g. an explicit pull-to-refresh)
 * @param options.now    injectable clock for tests (defaults to Date.now())
 */
export const refreshQuotes = async (
  options: { force?: boolean; now?: number } = {},
): Promise<RefreshResult> => {
  const now = options.now ?? Date.now();
  const cache = await getQuoteCache();

  const holdings = await getHoldings();
  const symbols = collectSymbols(holdings);
  if (symbols.length === 0) {
    return { outcome: "no-symbols", cache };
  }

  if (!options.force && !isQuoteRefreshDue(cache.lastFetchedAt, now)) {
    return { outcome: "fresh", cache };
  }

  let deviceId: string;
  try {
    deviceId = await getDeviceId();
  } catch {
    deviceId = "";
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    // Always send the shared app key; add the device id when we have one (it
    // drives the Worker's per-device weekly throttle).
    const headers: Record<string, string> = { "x-app-key": QUOTES_APP_KEY };
    if (deviceId) headers["x-device"] = deviceId;
    const res = await fetch(buildUrl(symbols), {
      method: "GET",
      headers,
      signal: controller.signal,
    });

    if (res.status === 429) {
      // Server already served this device this week. Respect the window
      // locally so we don't keep re-asking - stamp lastFetchedAt to now.
      const next: QuoteCache = { ...cache, lastFetchedAt: new Date(now).toISOString() };
      await saveQuoteCache(next);
      return { outcome: "rate-limited", cache: next };
    }

    if (!res.ok) {
      return { outcome: "unavailable", cache };
    }

    const body = (await res.json()) as { quotes?: Record<string, CachedQuote> };
    const fetched = body.quotes ?? {};

    // Merge over the existing cache so symbols the Worker couldn't price keep
    // their last known value instead of disappearing.
    const mergedQuotes: Record<string, CachedQuote> = { ...cache.quotes };
    for (const [symbol, quote] of Object.entries(fetched)) {
      if (quote && Number.isFinite(quote.price)) {
        mergedQuotes[symbol] = quote;
      }
    }

    const next: QuoteCache = {
      quotes: mergedQuotes,
      lastFetchedAt: new Date(now).toISOString(),
    };
    await saveQuoteCache(next);
    return { outcome: "updated", cache: next };
  } catch {
    // Network error, abort/timeout, or bad JSON - keep the stale cache and
    // DON'T stamp lastFetchedAt, so the next opportunity retries.
    return { outcome: "unavailable", cache };
  } finally {
    clearTimeout(timer);
  }
};

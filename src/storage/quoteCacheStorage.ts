/**
 * BudgetArk - Quote Cache Storage
 * File: src/storage/quoteCacheStorage.ts
 *
 * Per-device cache of the most recent stock prices plus the timestamp of the
 * last successful fetch (which drives the weekly-refresh gate).
 *
 * This is deliberately NOT synced and has no tombstones: prices are public,
 * cheap to re-fetch, and device-local. Keeping them out of the sync diff
 * avoids leaking "what symbols this household watches" to the transport and
 * keeps the synced surface to just the `Holding` records themselves.
 */

import * as EncryptedStorage from "./encryptedStorage";
import type { CachedQuote } from "../types";

const STORAGE_KEY = "@budgetark_quote_cache";

export interface QuoteCache {
  /** Latest known price per symbol, keyed by uppercase ticker. */
  quotes: Record<string, CachedQuote>;
  /** ISO timestamp of the last successful refresh, or null if never. */
  lastFetchedAt: string | null;
}

const EMPTY_CACHE: QuoteCache = { quotes: {}, lastFetchedAt: null };

export const getQuoteCache = async (): Promise<QuoteCache> => {
  const raw = await EncryptedStorage.getItem(STORAGE_KEY);
  if (!raw) return { ...EMPTY_CACHE };
  try {
    const parsed = JSON.parse(raw) as Partial<QuoteCache>;
    return {
      quotes: parsed.quotes ?? {},
      lastFetchedAt: parsed.lastFetchedAt ?? null,
    };
  } catch {
    return { ...EMPTY_CACHE };
  }
};

export const saveQuoteCache = async (cache: QuoteCache): Promise<void> => {
  await EncryptedStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
};

/** Convenience accessor: just the symbol→price map. */
export const getCachedQuotes = async (): Promise<Record<string, CachedQuote>> =>
  (await getQuoteCache()).quotes;

/** Drop the cache entirely (e.g. on data wipe / sign-out flows). */
export const clearQuoteCache = async (): Promise<void> => {
  await EncryptedStorage.removeItem(STORAGE_KEY);
};

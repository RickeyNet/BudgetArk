/**
 * BudgetArk - Exchange Rates (live, with fallback)
 * File: src/utils/exchangeRates.ts
 *
 * Supplies USD-based exchange rates for the "Convert my amounts" currency
 * switch. Rates resolve through a best-available chain:
 *
 *   live fetch  ->  cached rates  ->  built-in static table
 *    (network)      (last good       (USD_EXCHANGE_RATES in
 *                    fetch on disk)    currencyConversion.ts)
 *
 * The app can therefore always convert, even fully offline. Conversion math
 * itself lives in currencyConversion.ts and is local - this module only
 * decides which rate numbers to feed it.
 *
 * RATE-PINNING POLICY: the network is only consulted at the moment the user
 * changes their currency (getCurrentRates, called from the switch flow).
 * Everything that merely DISPLAYS converted values - the CurrencyProvider
 * table, net-worth snapshots - reads the pinned snapshot via getStoredRates()
 * and never refetches, so day-to-day FX moves can't wiggle balances the user
 * didn't touch. The pin updates only on the next currency change.
 *
 * Provider: open.er-api.com - free, no API key, base USD (includes USD: 1),
 * updated daily. The request sends no user data; it's a plain GET of the
 * public rates table, so balances never leave the device.
 *
 * OTA-safe: pure fetch + storage, no native dependency.
 */

import * as EncryptedStorage from "../storage/encryptedStorage";
import { USD_EXCHANGE_RATES } from "./currencyConversion";

const RATES_CACHE_KEY = "@budgetark_fx_rates" as const;
/**
 * Separate cache for the Currency Exchange calculator (Charts tab). The
 * calculator wants reasonably-current rates and may refresh at any moment,
 * while RATES_CACHE_KEY is the PINNED display snapshot that must only move
 * when the user changes currency (see the rate-pinning policy above).
 * Sharing a key would let an innocent converter refresh silently re-pin
 * every displayed balance - keep them apart.
 */
const CONVERTER_CACHE_KEY = "@budgetark_fx_converter_rates" as const;
const PROVIDER_URL = "https://open.er-api.com/v6/latest/USD" as const;
const FETCH_TIMEOUT_MS = 8000;
/** Cached rates younger than this are reused without hitting the network. */
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

/** Currency codes the app supports - every one must be present to trust a fetch. */
const REQUIRED_CODES = Object.keys(USD_EXCHANGE_RATES);

export type RatesSource = "live" | "cache" | "static";

export interface RatesSnapshot {
  /** Always "USD"; rates are units of each currency per 1 USD. */
  base: "USD";
  rates: Record<string, number>;
  /** ISO timestamp of when these rates were obtained (fetch or cache write). */
  fetchedAt: string;
  /** Where this snapshot came from - surfaced in the UI for transparency. */
  source: RatesSource;
}

/**
 * A rates object is only trusted if USD is the base (USD === 1) and every
 * supported currency is a positive, finite number. A partial/garbage response
 * is rejected so it can never corrupt a conversion.
 */
const isValidRates = (rates: unknown): rates is Record<string, number> => {
  if (!rates || typeof rates !== "object") return false;
  const r = rates as Record<string, unknown>;
  if (r.USD !== 1) return false;
  return REQUIRED_CODES.every((code) => {
    const v = r[code];
    return typeof v === "number" && Number.isFinite(v) && v > 0;
  });
};

/** A snapshot built from the hardcoded fallback table. */
const staticSnapshot = (): RatesSnapshot => ({
  base: "USD",
  rates: { ...USD_EXCHANGE_RATES },
  fetchedAt: new Date(0).toISOString(),
  source: "static",
});

/**
 * Fetch live rates from the provider. Throws on network error, timeout, bad
 * HTTP status, or a response that fails validation - callers fall back.
 */
export const fetchLiveRates = async (): Promise<Record<string, number>> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(PROVIDER_URL, { signal: controller.signal });
    if (!res.ok) throw new Error(`FX request failed: HTTP ${res.status}`);
    const json = (await res.json()) as {
      result?: string;
      rates?: unknown;
    };
    if (json.result !== "success" || !isValidRates(json.rates)) {
      throw new Error("FX response invalid or incomplete");
    }
    return json.rates;
  } finally {
    clearTimeout(timer);
  }
};

const readCache = async (
  key: string = RATES_CACHE_KEY
): Promise<RatesSnapshot | null> => {
  try {
    const raw = await EncryptedStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RatesSnapshot;
    if (parsed.base !== "USD" || !isValidRates(parsed.rates)) return null;
    if (typeof parsed.fetchedAt !== "string") return null;
    return { ...parsed, source: "cache" };
  } catch {
    return null;
  }
};

const writeCache = async (
  snapshot: RatesSnapshot,
  key: string = RATES_CACHE_KEY
): Promise<void> => {
  try {
    await EncryptedStorage.setItem(key, JSON.stringify(snapshot));
  } catch {
    // A failed cache write is non-fatal - we just refetch next time.
  }
};

/**
 * The pinned snapshot: last-written cache, else the static table. NO network,
 * no TTL - this is what display paths read (see the rate-pinning policy in
 * the module doc). Never throws.
 */
export const getStoredRates = async (): Promise<RatesSnapshot> =>
  (await readCache()) ?? staticSnapshot();

/**
 * Resolve the best available rates, consulting the network if needed. Only
 * called from the currency-change flow - the result it caches becomes the
 * pinned snapshot that getStoredRates() serves until the next change.
 *
 * - Default: return fresh cache (< TTL) without a network call; otherwise
 *   fetch live, cache it, and return it; on failure fall back to any cache,
 *   then the static table.
 * - `forceRefresh`: always try live first (used at the moment of conversion so
 *   the irreversible change uses the most current rate), with the same
 *   cache -> static fallback if the network is unavailable.
 *
 * Never throws: the static table guarantees a usable result.
 */
export const getCurrentRates = async (opts?: {
  forceRefresh?: boolean;
}): Promise<RatesSnapshot> => {
  const cache = await readCache();
  const cacheAgeMs = cache
    ? Date.now() - new Date(cache.fetchedAt).getTime()
    : Infinity;
  const cacheFresh = cache !== null && cacheAgeMs < CACHE_TTL_MS;

  if (!opts?.forceRefresh && cacheFresh) return cache as RatesSnapshot;

  try {
    const rates = await fetchLiveRates();
    const snapshot: RatesSnapshot = {
      base: "USD",
      rates,
      fetchedAt: new Date().toISOString(),
      source: "live",
    };
    await writeCache(snapshot);
    return snapshot;
  } catch {
    if (cache) return cache;
    return staticSnapshot();
  }
};

/**
 * Rates for the Currency Exchange calculator. Same live -> cache -> static
 * shape as getCurrentRates, but against CONVERTER_CACHE_KEY so the
 * calculator's refreshes can never move the pinned display snapshot (and a
 * currency change never invalidates the converter's cache).
 *
 * - Default: reuse a fresh converter cache (< TTL); otherwise fetch live and
 *   cache it. On failure fall back to any stale converter cache, then to the
 *   pinned snapshot (which carries an honest fetchedAt), then static.
 * - `forceRefresh`: always try live first ("Refresh rates" button).
 *
 * Never throws: the static table guarantees a usable result.
 */
export const getConverterRates = async (opts?: {
  forceRefresh?: boolean;
}): Promise<RatesSnapshot> => {
  const cache = await readCache(CONVERTER_CACHE_KEY);
  const cacheAgeMs = cache
    ? Date.now() - new Date(cache.fetchedAt).getTime()
    : Infinity;
  const cacheFresh = cache !== null && cacheAgeMs < CACHE_TTL_MS;

  if (!opts?.forceRefresh && cacheFresh) return cache as RatesSnapshot;

  try {
    const rates = await fetchLiveRates();
    const snapshot: RatesSnapshot = {
      base: "USD",
      rates,
      fetchedAt: new Date().toISOString(),
      source: "live",
    };
    await writeCache(snapshot, CONVERTER_CACHE_KEY);
    return snapshot;
  } catch {
    if (cache) return cache;
    return getStoredRates();
  }
};

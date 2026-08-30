/**
 * BudgetArk - Currency Conversion
 * File: src/utils/currencyConversion.ts
 *
 * Pure conversion math plus the built-in static rate table. The "Convert my
 * amounts" currency switch feeds live rates in (see exchangeRates.ts); these
 * functions take an optional rates table and default to the static one, so
 * they work offline and in tests with no network.
 *
 * The static table below is the offline/fallback safety net and the source
 * for milestone-target seeding (round, long-term goals where exactness
 * doesn't matter). It is approximate by design and will drift - exchangeRates
 * fetches current numbers for real conversions. Keep it roughly current as a
 * sane fallback, but live rates are what users actually convert against.
 *
 * Keys are ISO currency codes matching CURRENCY_PREFERENCE_OPTIONS[].currencyCode.
 */

import { roundToCents } from "./money";

/** Fallback units of each currency per 1 USD. Last reviewed: 2026-06. */
export const USD_EXCHANGE_RATES: Readonly<Record<string, number>> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.37,
  JPY: 152,
  SEK: 9.58,
};

/**
 * Convert a USD amount into `currencyCode` using the static table. Unknown
 * currency codes fall back to a 1:1 rate (treated as USD) so callers never
 * produce NaN - the worst case is an un-converted figure, not a broken UI.
 */
export const convertFromUsd = (
  amountUsd: number,
  currencyCode: string
): number => {
  const rate = USD_EXCHANGE_RATES[currencyCode] ?? 1;
  return amountUsd * rate;
};

/**
 * Round a converted amount to a tidy, motivational figure (nearest 100).
 * This keeps targets readable ($1,000 → ~10,600 kr, not 10,594.32 kr) while
 * staying close to the true equivalent. USD amounts that are already round
 * multiples of 100 (every milestone anchor is) round back to themselves, so
 * USD users see no change.
 */
export const roundLocalTarget = (amount: number): number => {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount / 100) * 100;
};

/**
 * Localize a canonical USD milestone target into the user's currency:
 * convert via the static table, then round to a tidy figure.
 */
export const localizeUsdTarget = (
  amountUsd: number,
  currencyCode: string
): number => roundLocalTarget(convertFromUsd(amountUsd, currencyCode));

/**
 * Convert a real stored amount from one currency to another, via USD:
 *   value / rate[from] * rate[to]
 * Used by the "convert my amounts" currency switch (see currencyMigration).
 * `rates` is units-per-USD (base USD, rates.USD === 1) and defaults to the
 * static table; the migration passes a live snapshot from exchangeRates.
 * Unlike milestone targets, real balances keep cents precision - the result
 * is rounded to 2 decimals, NOT to a tidy round figure. Same code in/out, a
 * zero, or a non-finite input returns the value unchanged so the migration
 * can never turn a balance into NaN. Unknown codes fall back to rate 1.
 */
export const convertAmount = (
  value: number,
  fromCode: string,
  toCode: string,
  rates: Record<string, number> = USD_EXCHANGE_RATES
): number => {
  if (!Number.isFinite(value) || value === 0 || fromCode === toCode) {
    return Number.isFinite(value) ? value : 0;
  }
  const fromRate = rates[fromCode] ?? 1;
  const toRate = rates[toCode] ?? 1;
  const converted = (value / fromRate) * toRate;
  return roundToCents(converted);
};

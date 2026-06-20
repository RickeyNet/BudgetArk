/**
 * BudgetArk - Currency Conversion (static rates)
 * File: src/utils/currencyConversion.ts
 *
 * The app stores and tracks money in a single user-selected currency; it
 * does NOT do live FX. The only place we need a USD→local conversion is to
 * localize the canonical USD milestone targets (see DEFAULT_DEBT_MILESTONE_STEPS)
 * so a non-USD user starts with a sensible local-currency goal instead of a
 * raw dollar figure.
 *
 * These rates are deliberately a hand-maintained static table — they ship via
 * OTA like any other JS change and never require a network call. They are
 * approximate by design: milestone targets are round, long-term motivational
 * numbers, not transactional amounts. Update them occasionally if they drift
 * far from reality; nothing breaks if they're a little stale.
 *
 * Keys are ISO currency codes matching CURRENCY_PREFERENCE_OPTIONS[].currencyCode.
 */

/** Approximate units of each currency per 1 USD. Last reviewed: 2026-06. */
export const USD_EXCHANGE_RATES: Readonly<Record<string, number>> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.37,
  JPY: 152,
  SEK: 10.6,
};

/**
 * Convert a USD amount into `currencyCode` using the static table. Unknown
 * currency codes fall back to a 1:1 rate (treated as USD) so callers never
 * produce NaN — the worst case is an un-converted figure, not a broken UI.
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

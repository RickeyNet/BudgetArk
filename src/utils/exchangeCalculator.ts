/**
 * BudgetArk - Currency Exchange Calculator helpers
 * File: src/utils/exchangeCalculator.ts
 *
 * Pure logic behind the Currency Exchange tool on the Charts tab: parsing
 * the typed amount, cross-rate math between two supported currencies, and
 * the human-readable "rates last updated" line. Conversion itself reuses
 * convertAmount (currencyConversion.ts); rate resolution lives in
 * exchangeRates.getConverterRates. Kept side-effect free so the whole
 * calculator is unit-testable without React or the network.
 */

import { CURRENCY_PREFERENCE_OPTIONS } from "../types";
import type { RatesSnapshot } from "./exchangeRates";
import { parseMoneyInput } from "./parseMoneyInput";

/** One selectable currency in the converter's From/To chip rows. */
export interface ExchangeCurrency {
  /** ISO code, e.g. "USD" - matches the keys of the rates table. */
  code: string;
  /** Locale used to format amounts in this currency (symbol, digits). */
  locale: string;
}

/**
 * The currencies the converter offers: every distinct currency the app
 * supports as a display preference. Derived (not hardcoded) so a new
 * preference in CURRENCY_PREFERENCE_OPTIONS shows up here automatically -
 * the static fallback table covers exactly this set, so conversion between
 * any pair works fully offline.
 */
export const EXCHANGE_CURRENCIES: readonly ExchangeCurrency[] =
  CURRENCY_PREFERENCE_OPTIONS.reduce<ExchangeCurrency[]>((acc, option) => {
    if (!acc.some((c) => c.code === option.currencyCode)) {
      acc.push({ code: option.currencyCode, locale: option.locale });
    }
    return acc;
  }, []);

/** Upper bound on a convertible amount - matches importData's MAX_MONEY. */
export const MAX_EXCHANGE_AMOUNT = 1_000_000_000;

/**
 * Parse the free-typed amount field into a non-negative number, or null if
 * the text isn't a usable amount yet. The comma/decimal rule and the clamp
 * live in utils/parseMoneyInput (shared with every other money field);
 * this wrapper only pins the converter's non-negative, capped contract.
 */
export const parseAmountInput = (text: string): number | null =>
  parseMoneyInput(text, { max: MAX_EXCHANGE_AMOUNT });

/**
 * Units of `toCode` per 1 unit of `fromCode`, derived from a units-per-USD
 * table. Unknown codes fall back to rate 1 (same policy as convertAmount)
 * so a drifted code can never produce NaN.
 */
export const crossRate = (
  fromCode: string,
  toCode: string,
  rates: Record<string, number>
): number => {
  const fromRate = rates[fromCode] ?? 1;
  const toRate = rates[toCode] ?? 1;
  if (!Number.isFinite(fromRate) || fromRate <= 0) return 1;
  return toRate / fromRate;
};

/**
 * Format a cross rate for the "1 USD = 0.92 EUR" line. Large rates (JPY per
 * USD) read best with 2 decimals; small ones (USD per JPY) need more
 * precision to be meaningful. Trailing zeros beyond 2 decimals are trimmed.
 */
export const formatCrossRate = (rate: number): string => {
  if (!Number.isFinite(rate) || rate <= 0) return "--";
  const decimals = rate >= 100 ? 2 : rate >= 1 ? 3 : 4;
  const fixed = rate.toFixed(decimals);
  if (decimals <= 2) return fixed;
  // Trim trailing zeros but never below 2 decimals ("0.9200" -> "0.92").
  const [whole, frac = ""] = fixed.split(".");
  const trimmedFrac = frac.replace(/0+$/, "").padEnd(2, "0");
  return `${whole}.${trimmedFrac}`;
};

/**
 * Format an amount in an arbitrary supported currency (not necessarily the
 * user's display preference, which is all useCurrency() can format). Same
 * fallback ladder as CurrencyProvider's formatter so a bad locale/currency
 * pair degrades to something readable instead of throwing.
 */
export const formatAmountInCurrency = (
  amount: number,
  currency: ExchangeCurrency
): string => {
  try {
    return new Intl.NumberFormat(currency.locale, {
      style: "currency",
      currency: currency.code,
    }).format(amount);
  } catch {
    try {
      return `${new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 2,
      }).format(amount)} ${currency.code}`;
    } catch {
      return `${amount} ${currency.code}`;
    }
  }
};

/**
 * The transparency line under the result: where the rates came from and how
 * old they are. Static-table rates carry an epoch fetchedAt, so they get
 * their own honest wording instead of "updated 56 years ago".
 */
export const describeRatesSnapshot = (
  snapshot: Pick<RatesSnapshot, "fetchedAt" | "source">,
  nowMs: number
): string => {
  if (snapshot.source === "static") {
    return "Built-in approximate rates - couldn't reach the rate service";
  }
  const fetchedMs = new Date(snapshot.fetchedAt).getTime();
  const ageMs = nowMs - fetchedMs;
  if (!Number.isFinite(ageMs) || ageMs < 0) {
    return "Rates updated just now";
  }
  const minutes = Math.floor(ageMs / 60_000);
  if (minutes < 1) return "Rates updated just now";
  if (minutes < 60) {
    return `Rates updated ${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `Rates updated ${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }
  const days = Math.floor(hours / 24);
  return `Rates updated ${days} ${days === 1 ? "day" : "days"} ago`;
};

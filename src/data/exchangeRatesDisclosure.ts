/**
 * BudgetArk - Exchange-rate off-device disclosure copy.
 * File: src/data/exchangeRatesDisclosure.ts
 *
 * Single source of truth for the consent text shown before the Settings
 * currency switch fetches its first live exchange rate. Mirrors
 * holdingsDisclosure.ts / connectionsDisclosure.ts so any future surface that
 * triggers the rate fetch renders the same words.
 */

export const EXCHANGE_RATES_DISCLOSURE_TITLE = "Before we fetch a rate";

export const EXCHANGE_RATES_DISCLOSURE_INTRO =
  "Converting your amounts uses today's exchange rate. Here's exactly what leaves your device:";

export const EXCHANGE_RATES_DISCLOSURE_POINTS: readonly string[] = [
  "This device requests the day's public rate table from a free exchange-rate service (open.er-api.com). The request carries no account, amount, or identity - it's the same table everyone gets.",
  "Your balances and entries are converted on this device. Nothing about your finances is sent anywhere.",
  "If the service can't be reached, BudgetArk falls back to the last rates it saved, then to a built-in estimate - you'll see which one was used before you confirm.",
];

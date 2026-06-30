/**
 * BudgetArk - Live Holdings off-device disclosure copy.
 * File: src/data/holdingsDisclosure.ts
 *
 * Single source of truth for the consent text shown before the Live Holdings
 * feature is first enabled. Rendered both from the Bridge teaser and the
 * Profile settings toggle so the two can never drift.
 */

export const HOLDINGS_DISCLOSURE_TITLE = "Before you turn this on";

export const HOLDINGS_DISCLOSURE_INTRO =
  "Live Holdings sends a little data off your device. Here's exactly what:";

export const HOLDINGS_DISCLOSURE_POINTS: readonly string[] = [
  "Your tickers and share counts are stored on this device and sync to your paired partner, just like your accounts.",
  "To show prices, only your ticker symbols are sent to BudgetArk's quote service about once a day. Your share counts, balances, and identity are never sent.",
  "Prices come from a third-party market data provider.",
];

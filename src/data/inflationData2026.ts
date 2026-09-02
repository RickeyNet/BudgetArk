/**
 * BudgetArk - Headline Inflation Reference (2026)
 * File: src/data/inflationData2026.ts
 *
 * The one bundled "headline CPI" figure the Personal Inflation tool
 * compares the user's own basket against. A constant, deliberately: the
 * app makes no network calls for it (no BLS/FRED fetch - see the egress
 * allowlist in CLAUDE.md), and a reference number that is a few months
 * stale is still a fair yardstick for "am I running hotter than the
 * economy?". Refresh once a year alongside taxData2026 and note the
 * period it covers so the card can say so.
 */

/** Headline 12-month consumer price change, in percent. */
export const HEADLINE_CPI_YOY_PERCENT = 2.7;

/** What the figure is, in the card's own words. */
export const HEADLINE_CPI_LABEL = "US CPI-U, 12-month change";

/** The period the bundled figure covers - shown as a "as of" hint. */
export const HEADLINE_CPI_AS_OF = "mid-2026";

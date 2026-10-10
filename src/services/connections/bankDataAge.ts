/**
 * BudgetArk - Bank Data Age
 * File: src/services/connections/bankDataAge.ts
 *
 * How old a linked account's data really is, measured from the provider's
 * own balance-date (`ExternalAccountLink.lastExternalBalanceAt`), not from
 * the app's last fetch. The SimpleFIN Bridge refreshes each bank about once
 * a day, so two full days without a new balance-date means the bank behind
 * the bridge is stuck - the Connections manager should say so instead of a
 * cheerful "Last synced 2m ago", which only measures the app talking to the
 * bridge, not the bank's data being current.
 *
 * Pure so the day math is tested; the manager passes a `nowMs` captured
 * once per open.
 */

/** Whole days without a new balance-date before a row is flagged stale. */
export const STALE_BANK_DATA_DAYS = 2;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Whole days (floored) between the bank's balance-date and `nowMs`, or null
 * when the date is missing or unparseable. A date in the future (clock skew,
 * a bank stamping in its own timezone) clamps to 0 days rather than going
 * negative.
 */
export const bankDataAge = (
  lastExternalBalanceAt: string | undefined,
  nowMs: number,
): { days: number; stale: boolean } | null => {
  if (!lastExternalBalanceAt) return null;
  const asOfMs = Date.parse(lastExternalBalanceAt);
  if (!Number.isFinite(asOfMs) || !Number.isFinite(nowMs)) return null;
  const days = Math.max(0, Math.floor((nowMs - asOfMs) / DAY_MS));
  return { days, stale: days >= STALE_BANK_DATA_DAYS };
};

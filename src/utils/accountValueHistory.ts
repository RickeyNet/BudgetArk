/**
 * BudgetArk - Account Value History Math
 * File: src/utils/accountValueHistory.ts
 *
 * Pure logic behind the per-account rise/drop tracker on the Bridge: one
 * value snapshot per account per day (cash balance + holdings market value),
 * plus the change-over-period math the UI renders per account and summed per
 * category. Side-effect free so the whole feature is unit-testable; the thin
 * persistence shell lives in storage/accountValueSnapshotStorage.ts.
 */

import type { AssetAccount, CachedQuote, Holding } from "../types";
import { categorySupportsHoldings } from "../types";
import { accountHoldingsValue, type HoldingValueOptions } from "./holdingsMath";

/** One recorded end-of-day value for a single account. */
export interface AccountValueSnapshot {
  /** Local calendar day, "YYYY-MM-DD". */
  dayKey: string;
  /** Account value that day, in the user's display currency. */
  value: number;
}

/** Per-account daily history, keyed by AssetAccount id. */
export type AccountValueHistory = Record<string, AccountValueSnapshot[]>;

/**
 * Per-account cap (~13 months). Keeps the whole map bounded at
 * accounts × 400 tiny rows, comfortably under the aggregate net-worth
 * history's 730-day retention.
 */
export const MAX_SNAPSHOTS_PER_ACCOUNT = 400;

export type AccountChangePeriodKey = "1D" | "7D" | "30D" | "90D";

/**
 * Windows the Bridge selector offers. Mirrors NetWorthHistoryCard's range
 * chips (7D/30D) plus a day and a quarter on either side.
 */
export const ACCOUNT_CHANGE_PERIODS: readonly {
  key: AccountChangePeriodKey;
  label: string;
  days: number;
}[] = [
  { key: "1D", label: "1D", days: 1 },
  { key: "7D", label: "7D", days: 7 },
  { key: "30D", label: "30D", days: 30 },
  { key: "90D", label: "90D", days: 90 },
] as const;

/** Local-calendar day key (matches netWorthSnapshotStorage's convention). */
export const getDayKey = (input: string | Date): string => {
  const date = typeof input === "string" ? new Date(input) : input;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Shift a "YYYY-MM-DD" key by whole days (negative = into the past) using
 * local-calendar arithmetic, so DST transitions can't skip or repeat a day
 * the way epoch-millisecond math would. Malformed keys come back unchanged.
 */
export const shiftDayKey = (dayKey: string, byDays: number): string => {
  const [year, month, day] = dayKey.split("-").map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return dayKey;
  }
  return getDayKey(new Date(year, month - 1, day + byDays));
};

/**
 * Current value of every live account, keyed by id: stored cash balance plus,
 * for holdings-capable categories, the market value of the account's
 * positions. Matches exactly what the Bridge rows display (pure-holdings
 * accounts store balance 0, so the sum is correct for every category).
 */
export const computeAccountValues = (
  accounts: AssetAccount[],
  holdings: Holding[],
  quotes: Record<string, CachedQuote>,
  opts?: HoldingValueOptions,
): Record<string, number> => {
  const values: Record<string, number> = {};
  for (const account of accounts) {
    const holdingsValue = categorySupportsHoldings(account.category)
      ? accountHoldingsValue(account.id, holdings, quotes, opts)
      : 0;
    values[account.id] = account.balance + holdingsValue;
  }
  return values;
};

/**
 * Record today's values into the history: upserts each account's entry for
 * `dayKey` (several captures a day collapse to the latest), keeps each
 * account's list sorted and capped, and drops history for account ids absent
 * from `values` - i.e. deleted accounts stop carrying dead weight the next
 * time a capture runs. Non-finite values are skipped, never stored.
 */
export const upsertAccountValues = (
  history: AccountValueHistory,
  values: Record<string, number>,
  dayKey: string,
  maxPerAccount: number = MAX_SNAPSHOTS_PER_ACCOUNT,
): AccountValueHistory => {
  const next: AccountValueHistory = {};
  for (const accountId of Object.keys(values)) {
    const value = values[accountId];
    const prior = history[accountId] ?? [];
    if (!Number.isFinite(value)) {
      if (prior.length > 0) next[accountId] = prior;
      continue;
    }
    const kept = prior.filter(
      (snap) => snap.dayKey !== dayKey && Number.isFinite(snap.value),
    );
    kept.push({ dayKey, value });
    kept.sort((a, b) => a.dayKey.localeCompare(b.dayKey));
    next[accountId] =
      kept.length > maxPerAccount ? kept.slice(-maxPerAccount) : kept;
  }
  return next;
};

/** A computed rise/drop for one account over the selected window. */
export interface AccountChange {
  /** Signed currency delta: current value minus the baseline. */
  amount: number;
  /** Delta as % of the baseline, or null when the baseline is ~zero. */
  percent: number | null;
  /** The day the comparison runs from. */
  baselineDayKey: string;
  /** The account's recorded value on that day (category %s sum these). */
  baselineValue: number;
}

/**
 * Change between `currentValue` and the account's recorded value at (or
 * nearest before) the cutoff day. If the history doesn't reach back that
 * far, falls back to the earliest recorded day so a young account still
 * shows "since <first day>" instead of nothing. Returns null when there is
 * no snapshot from before today to compare against - a tracker that started
 * today has nothing meaningful to report yet.
 */
export const changeSince = (
  snapshots: AccountValueSnapshot[] | undefined,
  currentValue: number,
  cutoffDayKey: string,
  todayDayKey: string,
): AccountChange | null => {
  if (!snapshots || snapshots.length === 0) return null;
  let baseline: AccountValueSnapshot | null = null;
  for (const snap of snapshots) {
    if (snap.dayKey.localeCompare(cutoffDayKey) <= 0) {
      if (!baseline || snap.dayKey.localeCompare(baseline.dayKey) > 0) {
        baseline = snap;
      }
    }
  }
  if (!baseline) {
    let earliest: AccountValueSnapshot | null = null;
    for (const snap of snapshots) {
      if (!earliest || snap.dayKey.localeCompare(earliest.dayKey) < 0) {
        earliest = snap;
      }
    }
    if (!earliest || earliest.dayKey.localeCompare(todayDayKey) >= 0) return null;
    baseline = earliest;
  }
  const amount = currentValue - baseline.value;
  return {
    amount,
    percent:
      Math.abs(baseline.value) > 0.005
        ? (amount / Math.abs(baseline.value)) * 100
        : null,
    baselineDayKey: baseline.dayKey,
    baselineValue: baseline.value,
  };
};

/** A category-level rise/drop: the sum of its member accounts' changes. */
export interface CombinedChange {
  amount: number;
  percent: number | null;
}

/**
 * Sum per-account changes into a category total. Accounts with no baseline
 * (null change - e.g. created today) are excluded from both sides of the
 * comparison, so a brand-new account can't masquerade as a giant gain.
 * Returns null when no member account has anything to report.
 */
export const combineChanges = (
  changes: (AccountChange | null)[],
): CombinedChange | null => {
  const present = changes.filter((c): c is AccountChange => c !== null);
  if (present.length === 0) return null;
  const amount = present.reduce((sum, c) => sum + c.amount, 0);
  const baselineTotal = present.reduce((sum, c) => sum + c.baselineValue, 0);
  return {
    amount,
    percent:
      Math.abs(baselineTotal) > 0.005
        ? (amount / Math.abs(baselineTotal)) * 100
        : null,
  };
};

/**
 * Parse + repair an untrusted stored blob into a valid history (fail-closed:
 * anything malformed is dropped, never guessed at). Shared by the storage
 * getter and its atomic-update path so both repair identically.
 */
export const sanitizeAccountValueHistory = (raw: unknown): AccountValueHistory => {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
  const history: AccountValueHistory = {};
  for (const [accountId, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(entry)) continue;
    const snaps = entry
      .filter(
        (item): item is AccountValueSnapshot =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as AccountValueSnapshot).dayKey === "string" &&
          Number.isFinite((item as AccountValueSnapshot).value),
      )
      .map((item) => ({ dayKey: item.dayKey, value: item.value }));
    if (snaps.length === 0) continue;
    snaps.sort((a, b) => a.dayKey.localeCompare(b.dayKey));
    history[accountId] =
      snaps.length > MAX_SNAPSHOTS_PER_ACCOUNT
        ? snaps.slice(-MAX_SNAPSHOTS_PER_ACCOUNT)
        : snaps;
  }
  return history;
};

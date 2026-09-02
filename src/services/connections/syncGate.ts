/**
 * BudgetArk - Bank Connections: Sync Gating + Fetch Windows
 * File: src/services/connections/syncGate.ts
 *
 * Pure cooldown and window math for the connections sync orchestrator.
 * SimpleFIN budgets ~24 requests/day per access URL, so auto-syncs are held
 * to one per 6 hours and manual refreshes to one per 15 minutes - worst
 * realistic usage stays far under the cap. The fetch window re-covers
 * FETCH_OVERLAP_DAYS so pending transactions are re-seen once they post
 * (the ingest planner dedupes the overlap).
 *
 * planGapBackfill covers the case the overlap can't: one institution behind
 * a bridge going dark (a bank demanding a fresh login) while the bridge
 * keeps answering for the others, so lastSyncedAt keeps advancing and the
 * dark bank's backlog would never be requested once it comes back.
 */

import type { ExternalAccountLink } from "../../types";
import type { NormalizedAccount } from "./types";

export const AUTO_SYNC_MIN_INTERVAL_MS = 6 * 3600_000;
export const MANUAL_SYNC_MIN_INTERVAL_MS = 15 * 60_000;
export const FETCH_OVERLAP_DAYS = 7;
export const INITIAL_BACKFILL_DAYS = 30;

/**
 * True when enough time has passed since the last ATTEMPT (success or not -
 * a failing provider must not be hammered) for another sync of this kind.
 */
export const isSyncDue = (
  lastAttemptAt: string | undefined,
  nowMs: number,
  manual: boolean,
): boolean => {
  if (!lastAttemptAt) return true;
  const last = Date.parse(lastAttemptAt);
  if (!Number.isFinite(last)) return true;
  const interval = manual
    ? MANUAL_SYNC_MIN_INTERVAL_MS
    : AUTO_SYNC_MIN_INTERVAL_MS;
  return nowMs - last >= interval;
};

/** Furthest back a gap backfill or a manual re-import will ask for. */
export const MAX_GAP_BACKFILL_DAYS = 90;

const DAY_MS = 24 * 3600_000;

/**
 * The date range to request from the provider: from the last successful sync
 * minus the overlap (first sync: a 30-day backfill) through now. An explicit
 * `backfillDays` (the manager's "Re-import" button) overrides both, capped
 * at MAX_GAP_BACKFILL_DAYS.
 */
export const computeFetchWindow = (
  lastSyncedAt: string | undefined,
  nowMs: number,
  backfillDays?: number,
): { startDate: Date; endDate: Date } => {
  if (backfillDays !== undefined && Number.isFinite(backfillDays) && backfillDays > 0) {
    const days = Math.min(backfillDays, MAX_GAP_BACKFILL_DAYS);
    return { startDate: new Date(nowMs - days * DAY_MS), endDate: new Date(nowMs) };
  }
  const lastMs = lastSyncedAt ? Date.parse(lastSyncedAt) : NaN;
  const startMs = Number.isFinite(lastMs)
    ? lastMs - FETCH_OVERLAP_DAYS * DAY_MS
    : nowMs - INITIAL_BACKFILL_DAYS * DAY_MS;
  return { startDate: new Date(startMs), endDate: new Date(nowMs) };
};

export interface GapBackfillPlan {
  /** Earlier start to re-request from (already includes the overlap). */
  startDate: Date;
  /** Provider accounts whose balance date jumped past the window. */
  staleAccountIds: string[];
}

/**
 * Detect an institution that just came back after going dark. Each link
 * remembers the provider's balance date from the last sync
 * (`lastExternalBalanceAt`); a healthy account's date advances a little
 * every sync, so it always sits inside the next fetch window. A dark bank's
 * date freezes, then on reconnect jumps straight to now - if the frozen
 * date is OLDER than this window's start and the jump exceeds the overlap,
 * everything between is a backlog the window never asked for. Returns the
 * earliest such date minus the overlap (capped at MAX_GAP_BACKFILL_DAYS),
 * or null when no account is stale or the window already covers it. The
 * caller re-fetches from that start; the ingest ledger dedupes the rest.
 *
 * Only importing accounts count (a balance-only link has no transactions
 * to miss), and accounts the provider gives no balance date for are
 * skipped - no signal, no guess.
 */
export const planGapBackfill = (input: {
  links: Pick<
    ExternalAccountLink,
    "externalAccountId" | "importTransactions" | "lastExternalBalanceAt"
  >[];
  accounts: Pick<NormalizedAccount, "externalAccountId" | "balanceAsOf">[];
  windowStartMs: number;
  nowMs: number;
}): GapBackfillPlan | null => {
  const linkByAccount = new Map(
    input.links
      .filter((link) => link.importTransactions)
      .map((link) => [link.externalAccountId, link] as const),
  );
  let earliestMs = Number.POSITIVE_INFINITY;
  const staleAccountIds: string[] = [];
  for (const account of input.accounts) {
    const link = linkByAccount.get(account.externalAccountId);
    if (!link || !link.lastExternalBalanceAt || !account.balanceAsOf) continue;
    const previousMs = Date.parse(link.lastExternalBalanceAt);
    const nextMs = Date.parse(account.balanceAsOf);
    if (!Number.isFinite(previousMs) || !Number.isFinite(nextMs)) continue;
    if (previousMs >= input.windowStartMs) continue; // window already covers it
    if (nextMs - previousMs <= FETCH_OVERLAP_DAYS * DAY_MS) continue; // no jump
    staleAccountIds.push(account.externalAccountId);
    earliestMs = Math.min(earliestMs, previousMs);
  }
  if (staleAccountIds.length === 0) return null;
  const startMs = Math.max(
    earliestMs - FETCH_OVERLAP_DAYS * DAY_MS,
    input.nowMs - MAX_GAP_BACKFILL_DAYS * DAY_MS,
  );
  if (startMs >= input.windowStartMs) return null;
  return { startDate: new Date(startMs), staleAccountIds };
};

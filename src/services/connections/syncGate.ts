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
 */

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

/**
 * The date range to request from the provider: from the last successful sync
 * minus the overlap (first sync: a 30-day backfill) through now.
 */
export const computeFetchWindow = (
  lastSyncedAt: string | undefined,
  nowMs: number,
): { startDate: Date; endDate: Date } => {
  const dayMs = 24 * 3600_000;
  const lastMs = lastSyncedAt ? Date.parse(lastSyncedAt) : NaN;
  const startMs = Number.isFinite(lastMs)
    ? lastMs - FETCH_OVERLAP_DAYS * dayMs
    : nowMs - INITIAL_BACKFILL_DAYS * dayMs;
  return { startDate: new Date(startMs), endDate: new Date(nowMs) };
};

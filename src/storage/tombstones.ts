/**
 * BudgetArk - Tombstone Helpers
 * File: src/storage/tombstones.ts
 *
 * Shared utilities for soft-delete (tombstone) records used by every
 * collection that participates in P2P sync (debts, payments, budget
 * entries, savings goals, asset accounts).
 *
 * Why tombstones? Without them, a deletion on Device A would simply remove
 * the record from the local array. The next sync's `computeOutgoingDiff`
 * would emit nothing for that ID. Device B still has the record, and on
 * its next sync would `upsert` it back to A - silently resurrecting the
 * deletion. By keeping a `deletedAt` marker we can emit `action: "delete"`
 * with a timestamp, and the receiver applies it via the same LWW logic
 * as upserts.
 */

/**
 * Tombstones older than this age get purged from storage on read.
 * 90 days gives every paired device plenty of time to come online and
 * receive the delete; after that the surviving collection has converged.
 */
export const TOMBSTONE_TTL_MS = 90 * 24 * 60 * 60 * 1000;

export interface Tombstoneable {
  id: string;
  updatedAt: string;
  deletedAt?: string;
}

/** Returns true if the record is a live (non-tombstoned) entry. */
export const isLive = <T extends Tombstoneable>(record: T): boolean =>
  !record.deletedAt;

/** Filters out tombstones; UI consumers always go through this. */
export const filterLive = <T extends Tombstoneable>(records: T[]): T[] =>
  records.filter(isLive);

/**
 * Mark a record tombstoned. Stamps both `deletedAt` and `updatedAt` to the
 * same `now` so the LWW comparison in sync correctly orders this against
 * any concurrent edit on the partner device.
 */
export const tombstone = <T extends Tombstoneable>(record: T, now: string): T => ({
  ...record,
  deletedAt: now,
  updatedAt: now,
});

/**
 * Drop tombstones whose `deletedAt` is older than the TTL. Returns the
 * pruned array (a new copy if any were dropped, the original ref otherwise).
 */
export const purgeExpiredTombstones = <T extends Tombstoneable>(
  records: T[],
  now: number = Date.now()
): T[] => {
  let droppedAny = false;
  const kept: T[] = [];
  for (const record of records) {
    if (record.deletedAt) {
      const age = now - new Date(record.deletedAt).getTime();
      if (Number.isFinite(age) && age > TOMBSTONE_TTL_MS) {
        droppedAny = true;
        continue;
      }
    }
    kept.push(record);
  }
  return droppedAny ? kept : records;
};

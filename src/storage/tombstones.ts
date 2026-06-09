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
 * Reverse a tombstone (undo a soft-delete). Clears `deletedAt` and bumps
 * `updatedAt` to `now` so the revival wins LWW on the next sync against
 * the delete the partner may have already received - i.e. an undo
 * propagates as a normal upsert and resurrects the record everywhere.
 */
export const untombstone = <T extends Tombstoneable>(record: T, now: string): T => {
  const { deletedAt, ...rest } = record;
  void deletedAt;
  return { ...(rest as T), updatedAt: now };
};

/**
 * Re-attach stored tombstones that are missing from an incoming array.
 *
 * Screens read live-only arrays (`getX()` → `filterLive`) and historically
 * round-tripped them straight into `saveX()`, silently erasing every
 * tombstone - which both broke Undo (nothing left to restore) and let the
 * paired device resurrect the deletion on its next sync. Public `saveX`
 * helpers now run their input through this merge so a live-only array is
 * safe to save: records in `incoming` always win by id (so an explicit
 * untombstone still works), and stored tombstones absent from `incoming`
 * are carried over. Stored *live* records absent from `incoming` are
 * intentionally dropped - that's how cleanup paths discard corrupt records.
 */
export const mergePreservingTombstones = <T extends Tombstoneable>(
  incoming: T[],
  stored: T[]
): T[] => {
  const incomingIds = new Set(incoming.map((record) => record.id));
  const preserved = stored.filter(
    (record) => record.deletedAt && !incomingIds.has(record.id)
  );
  return preserved.length === 0 ? incoming : [...incoming, ...preserved];
};

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

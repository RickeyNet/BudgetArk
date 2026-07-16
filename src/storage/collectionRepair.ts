/**
 * BudgetArk - Atomic Collection Read-Repair
 * File: src/storage/collectionRepair.ts
 *
 * The tombstoned collections (debts, payments, budget entries, ...) repair
 * themselves on read: getters normalize legacy records and purge tombstones
 * past their TTL, then write the repaired array back. Writing the getter's
 * own snapshot is racy - the snapshot goes stale the moment another writer
 * (a user mutation, an incoming sync diff) lands between the getter's read
 * and its write, and the repair write would silently revert it. Worst case:
 * the day any tombstone crosses the TTL, EVERY concurrent getter enqueues a
 * stale snapshot.
 *
 * This helper recomputes the repair from the value CURRENTLY in storage,
 * inside encryptedStorage's per-key write queue, so the snapshot it writes
 * cannot go stale. Getters call it (fire-and-await) instead of saving their
 * own copy.
 */

import * as EncryptedStorage from "./encryptedStorage";
import { Tombstoneable, purgeExpiredTombstones } from "./tombstones";

/**
 * Re-runs `normalize` + tombstone purge against the current stored value of
 * `key` and persists the result - atomically with respect to all other
 * writes on that key. No-ops when the key is empty, unparseable (the
 * getters' catch branches own that case), or already clean.
 */
export const repairCollectionInPlace = async <T extends Tombstoneable>(
  key: string,
  normalize: (record: T) => T
): Promise<void> => {
  await EncryptedStorage.updateItem(key, (current) => {
    if (!current) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(current);
    } catch {
      return null;
    }
    if (!Array.isArray(parsed)) return null;

    let changed = false;
    const normalized = (parsed as T[]).map((record) => {
      const next = normalize(record);
      if (next !== record) changed = true;
      return next;
    });
    const purged = purgeExpiredTombstones(normalized);
    if (!changed && purged === normalized) return null;
    return JSON.stringify(purged);
  });
};

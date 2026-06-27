/**
 * BudgetArk - Holdings Storage
 * File: src/storage/holdingsStorage.ts
 *
 * Persisted, synced collection of stock/ETF positions. Mirrors
 * `assetAccountStorage.ts` exactly: live reads go through `filterLive`, the
 * sync diff engine reads `*IncludingDeleted`, and deletes are soft (tombstones)
 * so a deletion propagates to a paired device instead of being resurrected.
 *
 * Prices are NOT stored here - see `quoteCacheStorage.ts` (per-device, never
 * synced).
 */

import * as EncryptedStorage from "./encryptedStorage";
import type { Holding } from "../types";
import {
  filterLive,
  mergePreservingTombstones,
  purgeExpiredTombstones,
  tombstone,
  untombstone,
} from "./tombstones";

const STORAGE_KEY = "@budgetark_holdings";

export const getHoldings = async (): Promise<Holding[]> => {
  const all = await getHoldingsIncludingDeleted();
  return filterLive(all);
};

/**
 * Sync-only: returns soft-deleted holdings too so the diff engine can
 * propagate deletes to a paired partner. See `tombstones.ts` for why.
 */
export const getHoldingsIncludingDeleted = async (): Promise<Holding[]> => {
  const raw = await EncryptedStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Holding[];
    const purged = purgeExpiredTombstones(parsed);
    // Ref equality: `purgeExpiredTombstones` returns the original array when
    // nothing was dropped, so the steady-state read avoids a needless write.
    if (purged !== parsed) {
      await writeHoldings(purged);
    }
    return purged;
  } catch {
    return [];
  }
};

/**
 * Raw write - persists exactly the array given. Only for callers that already
 * hold the tombstone-aware array (internal CRUD helpers and the purge path).
 */
const writeHoldings = async (holdings: Holding[]): Promise<void> => {
  await EncryptedStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
};

/**
 * Persists the holdings array. Safe to call with a live-only (`getHoldings`)
 * array: stored tombstones missing from `holdings` are merged back in so a
 * screen-level save can't erase the soft-deletes Undo and sync need.
 */
export const saveHoldings = async (holdings: Holding[]): Promise<void> => {
  const raw = await EncryptedStorage.getItem(STORAGE_KEY);
  let stored: Holding[] = [];
  if (raw) {
    try {
      stored = JSON.parse(raw) as Holding[];
    } catch {
      stored = [];
    }
  }
  await writeHoldings(mergePreservingTombstones(holdings, stored));
};

export const addHolding = async (holding: Holding): Promise<Holding[]> => {
  const holdings = await getHoldingsIncludingDeleted();
  const updated = [...holdings, holding];
  await writeHoldings(updated);
  return filterLive(updated);
};

export const updateHolding = async (
  holdingId: string,
  updates: Partial<Holding>,
): Promise<Holding[]> => {
  const holdings = await getHoldingsIncludingDeleted();
  const updated = holdings.map((holding) =>
    holding.id === holdingId
      ? {
          ...holding,
          ...updates,
          updatedAt: new Date().toISOString(),
        }
      : holding,
  );
  await writeHoldings(updated);
  return filterLive(updated);
};

/**
 * Soft-deletes a holding. See debtStorage.deleteDebt for rationale.
 */
export const deleteHolding = async (holdingId: string): Promise<Holding[]> => {
  const holdings = await getHoldingsIncludingDeleted();
  const now = new Date().toISOString();
  const next = holdings.map((holding) =>
    holding.id === holdingId ? tombstone(holding, now) : holding,
  );
  await writeHoldings(next);
  return filterLive(next);
};

/**
 * Undo a soft-deleted holding. No-op if id isn't a tombstone.
 */
export const restoreHolding = async (holdingId: string): Promise<Holding[]> => {
  const holdings = await getHoldingsIncludingDeleted();
  const now = new Date().toISOString();
  const next = holdings.map((holding) =>
    holding.id === holdingId && holding.deletedAt
      ? untombstone(holding, now)
      : holding,
  );
  await writeHoldings(next);
  return filterLive(next);
};

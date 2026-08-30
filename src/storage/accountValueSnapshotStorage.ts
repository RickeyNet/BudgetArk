/**
 * BudgetArk - Account Value Snapshot Storage
 * File: src/storage/accountValueSnapshotStorage.ts
 *
 * Persists the per-account daily value history behind the Bridge's rise/drop
 * tracker. DEVICE-LOCAL BY DESIGN: values derive from the per-device quote
 * cache, so this history is intentionally excluded from partner sync
 * (SyncDiff) and from backups/exports - the same policy as
 * quoteCacheStorage. Each device rebuilds its own baselines; nothing here is
 * source-of-truth data.
 *
 * All math lives in utils/accountValueHistory.ts; this shell only reads,
 * atomically updates, and clears the encrypted blob.
 */

import * as EncryptedStorage from "./encryptedStorage";
import {
  getDayKey,
  sanitizeAccountValueHistory,
  upsertAccountValues,
  type AccountValueHistory,
} from "../utils/accountValueHistory";

const STORAGE_KEY = "@budgetark_account_value_history";

export const getAccountValueHistory = async (): Promise<AccountValueHistory> => {
  const raw = await EncryptedStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return sanitizeAccountValueHistory(JSON.parse(raw));
  } catch {
    return {};
  }
};

/**
 * Record a capture of every live account's current value (keyed by account
 * id, display currency). Runs inside `updateItem` so a concurrent capture
 * can't be clobbered by a stale read-modify-write; the upsert also prunes
 * ids absent from `values`, which is how deleted accounts' history ages out.
 */
export const recordAccountValues = async (
  values: Record<string, number>,
  capturedAt: string,
): Promise<AccountValueHistory> => {
  const dayKey = getDayKey(capturedAt);
  let result: AccountValueHistory = {};
  await EncryptedStorage.updateItem(STORAGE_KEY, (current) => {
    let stored: unknown = null;
    if (current) {
      try {
        stored = JSON.parse(current);
      } catch {
        stored = null;
      }
    }
    result = upsertAccountValues(
      sanitizeAccountValueHistory(stored),
      values,
      dayKey,
    );
    return JSON.stringify(result);
  });
  return result;
};

/**
 * Whole-map overwrite - only for currency migration, which rescales every
 * stored value in one pass (the caller guards against running while paired).
 */
export const saveAccountValueHistory = async (
  history: AccountValueHistory,
): Promise<void> => {
  await EncryptedStorage.setItem(STORAGE_KEY, JSON.stringify(history));
};

export const clearAccountValueHistory = async (): Promise<void> => {
  await EncryptedStorage.removeItem(STORAGE_KEY);
};

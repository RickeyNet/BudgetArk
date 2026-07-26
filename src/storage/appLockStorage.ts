/**
 * BudgetArk - App Lock Storage
 * File: src/storage/appLockStorage.ts
 *
 * Persistence shell for the optional app-launch PIN gate. One versioned
 * record under @budgetark_app_lock in EncryptedStorage; absent key = lock
 * disabled. Pure logic (validation, hashing, backoff) lives in
 * src/utils/appLock.ts.
 *
 * This record is strictly per-device and must stay that way:
 * - NOT exported (utils/exportData.ts is an allowlist; keep this key off it)
 * - NOT synced (never add it to sync/types.ts SyncDiff)
 * - wiped by Reset All Data (listed in debtStorage.RESET_KEYS)
 */

import * as EncryptedStorage from "./encryptedStorage";
import {
  type AppLockRecord,
  applyFailedAttempt,
  applySuccessfulUnlock,
  createAppLockRecord,
  parseAppLockRecord,
} from "../utils/appLock";

export const APP_LOCK_KEY = "@budgetark_app_lock" as const;

/**
 * Returns the stored record, or null when the lock is disabled.
 *
 * Deliberately fail-open on read errors: if the record can't be read
 * (storage timeout, keystore unavailable, corruption), the gate stays off
 * rather than locking the user out with no recovery path. The PIN is a
 * privacy gate, not an encryption factor - when storage is unreadable the
 * financial data can't be decrypted either, so failing open reveals
 * nothing.
 */
export const getAppLockRecord = async (): Promise<AppLockRecord | null> => {
  try {
    return parseAppLockRecord(await EncryptedStorage.getItem(APP_LOCK_KEY));
  } catch (error) {
    if (__DEV__) console.warn("App lock record unreadable:", error);
    return null;
  }
};

const saveRecord = async (record: AppLockRecord): Promise<void> => {
  await EncryptedStorage.setItem(APP_LOCK_KEY, JSON.stringify(record));
};

/** Turns the lock on with a fresh salt + hash for the given PIN. */
export const enableAppLock = async (pin: string): Promise<AppLockRecord> => {
  const record = await createAppLockRecord(pin, new Date().toISOString());
  await saveRecord(record);
  return record;
};

/** Replaces the PIN (fresh salt), preserving the original createdAt. */
export const changeAppLockPin = async (pin: string): Promise<AppLockRecord> => {
  const existing = await getAppLockRecord();
  const fresh = await createAppLockRecord(pin, new Date().toISOString());
  const record = existing ? { ...fresh, createdAt: existing.createdAt } : fresh;
  await saveRecord(record);
  return record;
};

export const disableAppLock = async (): Promise<void> => {
  await EncryptedStorage.removeItem(APP_LOCK_KEY);
};

/**
 * Persists a wrong guess (and any lockout it triggers) so force-quitting
 * the app never resets the backoff clock. Returns the updated record.
 */
export const recordFailedAttempt = async (
  record: AppLockRecord
): Promise<AppLockRecord> => {
  const next = applyFailedAttempt(record, Date.now());
  await saveRecord(next);
  return next;
};

/** Clears the failed-attempt counter after a correct PIN. */
export const recordSuccessfulUnlock = async (
  record: AppLockRecord
): Promise<AppLockRecord> => {
  const next = applySuccessfulUnlock(record);
  await saveRecord(next);
  return next;
};

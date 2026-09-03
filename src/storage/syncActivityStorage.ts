/**
 * BudgetArk - Sync Activity Storage
 * File: src/storage/syncActivityStorage.ts
 *
 * Device-local log of what recent partner syncs delivered - counts per
 * collection only (sync/syncActivity), newest first, capped. Deliberately
 * NOT synced or exported: it describes this phone's view of the exchange,
 * and it holds nothing a backup needs. Encrypted at rest like everything
 * else; appends run inside the store's write queue.
 */

import * as EncryptedStorage from "./encryptedStorage";
import {
  parseSyncActivityLog,
  type SyncActivityCounts,
  type SyncActivityRecord,
} from "../sync/syncActivity";

const STORAGE_KEY = "@budgetark_sync_activity" as const;

export const MAX_SYNC_ACTIVITY_RECORDS = 30;

export const getSyncActivityLog = async (): Promise<SyncActivityRecord[]> =>
  parseSyncActivityLog(await EncryptedStorage.getItem(STORAGE_KEY));

/** Prepends one record and trims to the cap. */
export const recordSyncActivity = async (input: {
  partnerName: string;
  received: SyncActivityCounts;
  sent: number;
  at?: string;
}): Promise<SyncActivityRecord[]> => {
  const record: SyncActivityRecord = {
    at: input.at ?? new Date().toISOString(),
    partnerName: input.partnerName.slice(0, 80),
    received: input.received,
    sent: Math.max(0, Math.floor(input.sent)),
  };
  let next: SyncActivityRecord[] = [];
  await EncryptedStorage.updateItem(STORAGE_KEY, (current) => {
    next = [record, ...parseSyncActivityLog(current)].slice(0, MAX_SYNC_ACTIVITY_RECORDS);
    return JSON.stringify(next);
  });
  return next;
};

export const clearSyncActivityLog = async (): Promise<void> => {
  await EncryptedStorage.removeItem(STORAGE_KEY);
};

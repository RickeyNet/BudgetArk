import * as EncryptedStorage from "./encryptedStorage";
import type { AssetAccount } from "../types";
import {
  filterLive,
  mergePreservingTombstones,
  purgeExpiredTombstones,
  tombstone,
  untombstone,
} from "./tombstones";
import { repairCollectionInPlace } from "./collectionRepair";

const STORAGE_KEY = "@budgetark_asset_accounts";

export const getAssetAccounts = async (): Promise<AssetAccount[]> => {
  const all = await getAssetAccountsIncludingDeleted();
  return filterLive(all);
};

/**
 * Sync-only: returns soft-deleted accounts too so the diff engine can
 * propagate deletes to a paired partner. See `tombstones.ts` for why.
 */
export const getAssetAccountsIncludingDeleted = async (): Promise<AssetAccount[]> => {
  const raw = await EncryptedStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as AssetAccount[];
    const purged = purgeExpiredTombstones(parsed);
    // Ref equality: `purgeExpiredTombstones` returns the original array
    // when nothing was dropped, so the steady-state read costs O(1) here
    // instead of the previous O(n × record-size) JSON.stringify diff.
    if (purged !== parsed) {
      // Atomic recompute instead of writing our own (possibly stale)
      // snapshot: a mutation or sync write landing between the read above
      // and this write must not be reverted by the purge.
      await repairCollectionInPlace<AssetAccount>(STORAGE_KEY, (a) => a);
    }
    return purged;
  } catch {
    return [];
  }
};

/**
 * Raw write - persists exactly the array given. Only for callers that
 * already hold the tombstone-aware array (internal CRUD helpers and the
 * purge path, which must be able to drop expired tombstones).
 */
const writeAssetAccounts = async (accounts: AssetAccount[]): Promise<void> => {
  await EncryptedStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
};

/**
 * Persists the accounts array. Safe to call with a live-only
 * (`getAssetAccounts`) array: stored tombstones missing from `accounts` are
 * merged back in so a screen-level save can't erase the soft-deletes that
 * Undo and sync need.
 */
export const saveAssetAccounts = async (accounts: AssetAccount[]): Promise<void> => {
  const raw = await EncryptedStorage.getItem(STORAGE_KEY);
  let stored: AssetAccount[] = [];
  if (raw) {
    try {
      stored = JSON.parse(raw) as AssetAccount[];
    } catch {
      stored = [];
    }
  }
  await writeAssetAccounts(mergePreservingTombstones(accounts, stored));
};

export const addAssetAccount = async (account: AssetAccount): Promise<AssetAccount[]> => {
  const accounts = await getAssetAccountsIncludingDeleted();
  const updated = [...accounts, account];
  await writeAssetAccounts(updated);
  return filterLive(updated);
};

export const updateAssetAccount = async (
  accountId: string,
  updates: Partial<AssetAccount>
): Promise<AssetAccount[]> => {
  const accounts = await getAssetAccountsIncludingDeleted();
  const updated = accounts.map((account) =>
    account.id === accountId
      ? {
          ...account,
          ...updates,
          updatedAt: new Date().toISOString(),
        }
      : account
  );
  await writeAssetAccounts(updated);
  return filterLive(updated);
};

/**
 * Soft-deletes an asset account. See debtStorage.deleteDebt for rationale.
 */
export const deleteAssetAccount = async (accountId: string): Promise<AssetAccount[]> => {
  const accounts = await getAssetAccountsIncludingDeleted();
  const now = new Date().toISOString();
  const next = accounts.map((account) =>
    account.id === accountId ? tombstone(account, now) : account
  );
  await writeAssetAccounts(next);
  return filterLive(next);
};

/**
 * Undo a soft-deleted asset account. No-op if id isn't a tombstone.
 */
export const restoreAssetAccount = async (
  accountId: string
): Promise<AssetAccount[]> => {
  const accounts = await getAssetAccountsIncludingDeleted();
  const now = new Date().toISOString();
  const next = accounts.map((account) =>
    account.id === accountId && account.deletedAt
      ? untombstone(account, now)
      : account
  );
  await writeAssetAccounts(next);
  return filterLive(next);
};

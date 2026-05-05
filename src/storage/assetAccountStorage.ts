import * as EncryptedStorage from "./encryptedStorage";
import type { AssetAccount } from "../types";
import {
  filterLive,
  purgeExpiredTombstones,
  tombstone,
} from "./tombstones";

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
      await saveAssetAccounts(purged);
    }
    return purged;
  } catch {
    return [];
  }
};

/**
 * Persists the full accounts array (live + tombstones). Always pass the
 * tombstone-aware array; passing a `filterLive` result here will drop the
 * tombstones the next sync needs.
 */
export const saveAssetAccounts = async (accounts: AssetAccount[]): Promise<void> => {
  await EncryptedStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
};

export const addAssetAccount = async (account: AssetAccount): Promise<AssetAccount[]> => {
  const accounts = await getAssetAccountsIncludingDeleted();
  const updated = [...accounts, account];
  await saveAssetAccounts(updated);
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
  await saveAssetAccounts(updated);
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
  await saveAssetAccounts(next);
  return filterLive(next);
};

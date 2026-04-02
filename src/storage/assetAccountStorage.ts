import * as EncryptedStorage from "./encryptedStorage";
import type { AssetAccount } from "../types";

const STORAGE_KEY = "@budgetark_asset_accounts";

export const getAssetAccounts = async (): Promise<AssetAccount[]> => {
  const raw = await EncryptedStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as AssetAccount[];
  } catch {
    return [];
  }
};

export const saveAssetAccounts = async (accounts: AssetAccount[]): Promise<void> => {
  await EncryptedStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
};

export const addAssetAccount = async (account: AssetAccount): Promise<AssetAccount[]> => {
  const accounts = await getAssetAccounts();
  const updated = [...accounts, account];
  await saveAssetAccounts(updated);
  return updated;
};

export const updateAssetAccount = async (
  accountId: string,
  updates: Partial<AssetAccount>
): Promise<AssetAccount[]> => {
  const accounts = await getAssetAccounts();
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
  return updated;
};

export const deleteAssetAccount = async (accountId: string): Promise<AssetAccount[]> => {
  const accounts = await getAssetAccounts();
  const updated = accounts.filter((account) => account.id !== accountId);
  await saveAssetAccounts(updated);
  return updated;
};

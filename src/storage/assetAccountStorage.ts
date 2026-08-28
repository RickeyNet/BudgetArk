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
import { applyBalanceDeltas, type BalanceDelta } from "../utils/assetBalanceDeltas";
import { ensureUpdatedAt } from "../utils/recordTimestamps";

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
    // Legacy/imported accounts may lack `updatedAt`; without it they are
    // invisible to sync in both directions (see recordTimestamps.ts).
    let normalizeChanged = false;
    const normalized = parsed.map((account) => {
      const next = ensureUpdatedAt(account);
      if (next !== account) normalizeChanged = true;
      return next;
    });
    const purged = purgeExpiredTombstones(normalized);
    // Ref equality: `purgeExpiredTombstones` returns the original array
    // when nothing was dropped and `ensureUpdatedAt` returns the same
    // element refs when nothing was missing, so the steady-state read
    // costs O(1) here instead of a JSON.stringify diff.
    if (normalizeChanged || purged !== normalized) {
      // Atomic recompute instead of writing our own (possibly stale)
      // snapshot: a mutation or sync write landing between the read above
      // and this write must not be reverted by the repair.
      await repairCollectionInPlace<AssetAccount>(STORAGE_KEY, ensureUpdatedAt);
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

/**
 * Atomic read-modify-write for the accounts collection - same contract as
 * budgetStorage's `mutateBudgetEntries` and for the same reason: partner
 * sync and bank balance refreshes write accounts behind the screens' backs,
 * so every mutation must fold into the CURRENT stored array rather than
 * persist a screen-state snapshot. Returns the live result.
 */
const mutateAssetAccounts = async (
  mutate: (stored: AssetAccount[]) => AssetAccount[]
): Promise<AssetAccount[]> => {
  let result: AssetAccount[] = [];
  await EncryptedStorage.updateItem(STORAGE_KEY, (current) => {
    let stored: AssetAccount[] = [];
    if (current) {
      try {
        const parsed: unknown = JSON.parse(current);
        if (Array.isArray(parsed)) stored = parsed as AssetAccount[];
      } catch {
        stored = [];
      }
    }
    result = mutate(stored);
    return JSON.stringify(result);
  });
  return filterLive(result);
};

export const addAssetAccount = async (account: AssetAccount): Promise<AssetAccount[]> =>
  mutateAssetAccounts((stored) =>
    stored.some((existing) => existing.id === account.id)
      ? stored
      : [...stored, account]
  );

export const updateAssetAccount = async (
  accountId: string,
  updates: Partial<AssetAccount>
): Promise<AssetAccount[]> =>
  mutateAssetAccounts((stored) => {
    const now = new Date().toISOString();
    return stored.map((account) =>
      account.id === accountId ? { ...account, ...updates, updatedAt: now } : account
    );
  });

/**
 * Shifts linked-account balances by the net of `deltas` (a budget entry
 * being added, edited, deleted or undone) in one atomic write, and returns
 * the live accounts. Unknown ids are ignored; a zero-net delta list is a
 * no-op that still returns the current live accounts.
 */
export const adjustAssetAccountBalances = async (
  deltas: BalanceDelta[]
): Promise<AssetAccount[]> =>
  mutateAssetAccounts((stored) => applyBalanceDeltas(stored, deltas));

/**
 * Soft-deletes an asset account. See debtStorage.deleteDebt for rationale.
 */
export const deleteAssetAccount = async (accountId: string): Promise<AssetAccount[]> =>
  mutateAssetAccounts((stored) => {
    const now = new Date().toISOString();
    return stored.map((account) =>
      account.id === accountId ? tombstone(account, now) : account
    );
  });

/**
 * Undo a soft-deleted asset account. No-op if id isn't a tombstone.
 */
export const restoreAssetAccount = async (
  accountId: string
): Promise<AssetAccount[]> =>
  mutateAssetAccounts((stored) => {
    const now = new Date().toISOString();
    return stored.map((account) =>
      account.id === accountId && account.deletedAt
        ? untombstone(account, now)
        : account
    );
  });

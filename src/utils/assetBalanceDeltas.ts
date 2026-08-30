/**
 * BudgetArk - Asset Balance Deltas
 * File: src/utils/assetBalanceDeltas.ts
 *
 * Pure math for "this entry moved money in/out of a linked account". The
 * Budget screen nets every add / edit / delete / undo into a list of
 * `{ accountId, amount }` deltas; `applyBalanceDeltas` folds them onto the
 * accounts array, stamping `updatedAt` only on accounts that actually
 * changed so an untouched account never wins a last-write-wins merge it
 * didn't earn. Lives outside the storage module so it stays unit-testable
 * without a storage mock and can be applied inside an atomic
 * read-modify-write (see assetAccountStorage.adjustAssetAccountBalances).
 */

import type { AssetAccount } from "../types";

export interface BalanceDelta {
  accountId: string;
  amount: number;
}

/** Sum deltas per account id; zero-net and non-finite amounts drop out. */
export const netBalanceDeltas = (deltas: BalanceDelta[]): Map<string, number> => {
  const totals = new Map<string, number>();
  for (const { accountId, amount } of deltas) {
    if (!Number.isFinite(amount)) continue;
    totals.set(accountId, (totals.get(accountId) ?? 0) + amount);
  }
  for (const [id, total] of totals) {
    if (total === 0) totals.delete(id);
  }
  return totals;
};

/**
 * Returns a new array with each affected account's balance shifted by its
 * net delta. Returns the SAME array reference when nothing changes, so
 * callers can skip a write. Deltas for unknown account ids are ignored
 * (the account may have been deleted on the partner device).
 */
export const applyBalanceDeltas = (
  accounts: AssetAccount[],
  deltas: BalanceDelta[],
  now: string = new Date().toISOString()
): AssetAccount[] => {
  const totals = netBalanceDeltas(deltas);
  if (totals.size === 0) return accounts;

  let changed = false;
  const next = accounts.map((account) => {
    const delta = totals.get(account.id);
    if (delta === undefined) return account;
    changed = true;
    return { ...account, balance: account.balance + delta, updatedAt: now };
  });
  return changed ? next : accounts;
};

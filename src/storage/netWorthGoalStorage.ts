/**
 * BudgetArk - Net Worth Goal Storage
 * File: src/storage/netWorthGoalStorage.ts
 *
 * Device-local persistence for the single net-worth goal (target amount +
 * target month; see utils/netWorthProjection for the record and its
 * fail-closed parse). Deliberately NOT synced or exported in this first
 * cut: the projection it feeds is built from this phone's view of the
 * shared ledger, and a partner can set their own. Encrypted at rest like
 * everything else.
 */

import * as EncryptedStorage from "./encryptedStorage";
import { parseNetWorthGoal, type NetWorthGoal } from "../utils/netWorthProjection";

const STORAGE_KEY = "@budgetark_net_worth_goal" as const;

export const getNetWorthGoal = async (): Promise<NetWorthGoal | null> =>
  parseNetWorthGoal(await EncryptedStorage.getItem(STORAGE_KEY));

/** Replaces the goal; a record the parser rejects is not written. */
export const saveNetWorthGoal = async (goal: NetWorthGoal): Promise<NetWorthGoal | null> => {
  const normalized = parseNetWorthGoal(JSON.stringify(goal));
  if (!normalized) return null;
  await EncryptedStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
};

export const clearNetWorthGoal = async (): Promise<void> => {
  await EncryptedStorage.removeItem(STORAGE_KEY);
};

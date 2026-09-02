/**
 * BudgetArk - Paycheck Cycle Storage
 * File: src/storage/paycheckCycleStorage.ts
 *
 * Device-local persistence for the user's pay schedule (frequency + anchor
 * payday or fixed days; see utils/paycheckCycle for the record and its
 * fail-closed parse). Deliberately NOT synced or exported: paydays are a
 * viewing preference for how one person slices the shared budget, and a
 * partner phone sets its own. Encrypted at rest like everything else.
 */

import * as EncryptedStorage from "./encryptedStorage";
import {
  parsePaycheckCycleSettings,
  type PaycheckCycleSettings,
} from "../utils/paycheckCycle";

const STORAGE_KEY = "@budgetark_paycheck_cycle" as const;

export const getPaycheckCycleSettings = async (): Promise<PaycheckCycleSettings | null> =>
  parsePaycheckCycleSettings(await EncryptedStorage.getItem(STORAGE_KEY));

/** Replaces the schedule; a record the parser rejects is not written. */
export const savePaycheckCycleSettings = async (
  settings: PaycheckCycleSettings
): Promise<PaycheckCycleSettings | null> => {
  const normalized = parsePaycheckCycleSettings(JSON.stringify(settings));
  if (!normalized) return null;
  await EncryptedStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
};

export const clearPaycheckCycleSettings = async (): Promise<void> => {
  await EncryptedStorage.removeItem(STORAGE_KEY);
};

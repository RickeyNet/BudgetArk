/**
 * BudgetArk - Purchase Plan Settings Storage
 * File: src/storage/purchasePlanSettingsStorage.ts
 *
 * Device-local persistence for the plan list's ranking method, allocation
 * mode, and combined monthly set-aside, and the planner tool's cost-analysis
 * inputs (see utils/purchasePlanSettings for the record and its fail-closed
 * parse). Deliberately NOT synced or exported: it is a viewing preference
 * like the payoff-strategy toggle, and the plans themselves (SavingsGoals,
 * including the hand-set `priority`) already travel - a partner sees the
 * same plans and picks their own way to look at them. Writes are PATCHES
 * merged inside the store's write queue: the list and the planner card
 * each own a few fields and must not overwrite each other's.
 */

import * as EncryptedStorage from "./encryptedStorage";
import {
  parsePurchasePlanSettings,
  type PurchasePlanSettings,
} from "../utils/purchasePlanSettings";

const SETTINGS_KEY = "@budgetark_purchase_plan_settings" as const;

/**
 * Tail of the most recent patch write. encryptedStorage serializes WRITES
 * per key, but a plain read does not wait behind them - so a read issued
 * right after a patch (the Charts list re-reading on focus while the
 * Bridge list's blur-time flush is still in flight) could hand back the
 * old record. Reads queue behind the last write here instead. Assigned
 * synchronously on call so a flush-then-read in the same tick is ordered.
 */
let lastWrite: Promise<unknown> = Promise.resolve();

export const getPurchasePlanSettings = async (): Promise<PurchasePlanSettings> => {
  await lastWrite;
  return parsePurchasePlanSettings(await EncryptedStorage.getItem(SETTINGS_KEY));
};

export const updatePurchasePlanSettings = (
  patch: Partial<PurchasePlanSettings>
): Promise<PurchasePlanSettings> => {
  let next: PurchasePlanSettings = parsePurchasePlanSettings(null);
  const write = EncryptedStorage.updateItem(SETTINGS_KEY, (current) => {
    next = parsePurchasePlanSettings(
      JSON.stringify({ ...parsePurchasePlanSettings(current), ...patch })
    );
    return JSON.stringify(next);
  });
  // A failed write must not wedge every later read; the caller still sees it.
  lastWrite = write.catch(() => undefined);
  return write.then(() => next);
};

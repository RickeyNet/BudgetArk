/**
 * BudgetArk - Purchase Plan Settings Storage
 * File: src/storage/purchasePlanSettingsStorage.ts
 *
 * Device-local persistence for the plan list's ranking method, allocation
 * mode, and combined monthly set-aside (see utils/purchasePlanSettings for
 * the record and its fail-closed parse). Deliberately NOT synced or
 * exported: it is a viewing preference like the payoff-strategy toggle,
 * and the plans themselves (SavingsGoals, including the hand-set
 * `priority`) already travel - a partner sees the same plans and picks
 * their own way to look at them.
 */

import * as EncryptedStorage from "./encryptedStorage";
import {
  parsePurchasePlanSettings,
  type PurchasePlanSettings,
} from "../utils/purchasePlanSettings";

const SETTINGS_KEY = "@budgetark_purchase_plan_settings" as const;

export const getPurchasePlanSettings = async (): Promise<PurchasePlanSettings> =>
  parsePurchasePlanSettings(await EncryptedStorage.getItem(SETTINGS_KEY));

export const savePurchasePlanSettings = async (
  settings: PurchasePlanSettings
): Promise<void> => {
  await EncryptedStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

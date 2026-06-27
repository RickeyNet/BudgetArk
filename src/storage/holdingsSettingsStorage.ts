/**
 * BudgetArk - Holdings Settings Storage
 * File: src/storage/holdingsSettingsStorage.ts
 *
 * Per-device opt-in state for the Live Stock Holdings feature. NOT synced -
 * each device decides for itself whether the feature is on. Default OFF: the
 * Holdings UI and the weekly quote fetch stay dormant until the user enables
 * them and acknowledges the off-device disclosure.
 *
 * Mirrors `updatePreferencesStorage.ts` for shape/merge style.
 */

import * as EncryptedStorage from "./encryptedStorage";
import type { HoldingsSettings } from "../types";

const STORAGE_KEY = "@budgetark_holdings_settings" as const;

const DEFAULT_SETTINGS: HoldingsSettings = {
  enabled: false,
  disclosureAcknowledged: false,
};

export const getHoldingsSettings = async (): Promise<HoldingsSettings> => {
  const raw = await EncryptedStorage.getItem(STORAGE_KEY);
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    const parsed = JSON.parse(raw) as Partial<HoldingsSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
};

export const saveHoldingsSettings = async (
  value: HoldingsSettings,
): Promise<HoldingsSettings> => {
  await EncryptedStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  return value;
};

/**
 * Flip the master switch. Enabling also records that the disclosure has been
 * acknowledged - the only way to reach `enabled: true` is through the
 * disclosure flow, so the two move together on the first enable. Disabling
 * leaves `disclosureAcknowledged` set so a later re-enable doesn't re-prompt.
 */
export const setHoldingsEnabled = async (
  enabled: boolean,
): Promise<HoldingsSettings> => {
  const current = await getHoldingsSettings();
  const updated: HoldingsSettings = {
    ...current,
    enabled,
    disclosureAcknowledged: enabled ? true : current.disclosureAcknowledged,
  };
  return saveHoldingsSettings(updated);
};

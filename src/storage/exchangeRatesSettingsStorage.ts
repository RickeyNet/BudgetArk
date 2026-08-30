/**
 * BudgetArk - Exchange Rates Settings Storage
 * File: src/storage/exchangeRatesSettingsStorage.ts
 *
 * Per-device consent state for the live exchange-rate fetch behind the
 * Settings currency switch. NOT synced, and deliberately NOT in RESET_KEYS
 * (same as the holdings/connections consent): acknowledging a disclosure is
 * about this device talking to a network service, not about the data set.
 * Mirrors connectionsSettingsStorage.ts.
 */

import * as EncryptedStorage from "./encryptedStorage";
import type { ExchangeRatesSettings } from "../types";

const STORAGE_KEY = "@budgetark_exchange_rates_settings" as const;

const DEFAULT_SETTINGS: ExchangeRatesSettings = {
  disclosureAcknowledged: false,
};

export const getExchangeRatesSettings =
  async (): Promise<ExchangeRatesSettings> => {
    const raw = await EncryptedStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    try {
      const parsed = JSON.parse(raw) as Partial<ExchangeRatesSettings>;
      // Fail closed: anything but a literal `true` means "not yet shown".
      return { disclosureAcknowledged: parsed.disclosureAcknowledged === true };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  };

export const acknowledgeExchangeRatesDisclosure =
  async (): Promise<ExchangeRatesSettings> => {
    const updated: ExchangeRatesSettings = { disclosureAcknowledged: true };
    await EncryptedStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  };

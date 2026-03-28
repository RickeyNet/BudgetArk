/**
 * BudgetArk — Data Export Utility
 * File: src/utils/exportData.ts
 *
 * Collects all user data from AsyncStorage and exports it
 * via the native share sheet using React Native's built-in Share API.
 * Supports optional password-based encryption for secure exports.
 */

import { Share } from "react-native";
import CryptoJS from "crypto-js";
import { getDebts, getPayments } from "../storage/debtStorage";
import { getBudgetEntries, getCategoryBudgetLimits } from "../storage/budgetStorage";
import { getOrCreateUser } from "../storage/userStorage";
import { CURRENT_APP_VERSION } from "../data/releaseNotes";

/** Prefix used to identify password-encrypted export payloads */
export const ENCRYPTED_EXPORT_PREFIX = "__BUDGETARK_ENC__:";

/**
 * Gathers all app data into a single object and opens
 * the native share sheet so the user can copy, save, or send it.
 *
 * @param password — if provided, the export is AES-encrypted with this password
 * @returns Promise<void>
 */
export const exportAllData = async (password?: string): Promise<void> => {
  // Collect all data in parallel
  const [debts, payments, budgetEntries, budgetLimits, user] = await Promise.all([
    getDebts(),
    getPayments(),
    getBudgetEntries(),
    getCategoryBudgetLimits(),
    getOrCreateUser(),
  ]);

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    appVersion: CURRENT_APP_VERSION,
    user: {
      id: user.id,
      displayName: user.displayName,
      createdAt: user.createdAt,
      onboardingComplete: user.onboardingComplete,
      currencyPreferenceId: user.currencyPreferenceId,
    },
    debts,
    payments,
    budgetEntries,
    budgetLimits,
  };

  const json = JSON.stringify(exportPayload, null, 2);

  let message: string;
  if (password) {
    const ciphertext = CryptoJS.AES.encrypt(json, password).toString();
    message = ENCRYPTED_EXPORT_PREFIX + ciphertext;
  } else {
    message = json;
  }

  await Share.share({
    title: "BudgetArk Data Export",
    message,
  });
};

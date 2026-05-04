/**
 * BudgetArk - Data Export Utility
 * File: src/utils/exportData.ts
 *
 * Collects all user data from AsyncStorage and exports it
 * via the native share sheet using React Native's built-in Share API.
 * Supports optional password-based encryption for secure exports.
 */

import { Share } from "react-native";
import CryptoJS from "crypto-js";
import {
  getDebts,
  getPayments,
  getPayoffStrategyPreference,
} from "../storage/debtStorage";
import {
  getBudgetEntries,
  getAllLimitsByMonth,
  getCategoryBudgetLimits,
} from "../storage/budgetStorage";
import { getOrCreateUser } from "../storage/userStorage";
import { getSavingsGoals } from "../storage/savingsGoalStorage";
import { getAssetAccounts } from "../storage/assetAccountStorage";
import { getDebtMilestonePlan } from "../storage/debtMilestoneStorage";
import { getNetWorthSnapshots } from "../storage/netWorthSnapshotStorage";
import { CURRENT_APP_VERSION } from "../data/releaseNotes";
import { recordBackup } from "../storage/backupReminderStorage";

/** Prefix used to identify password-encrypted export payloads */
export const ENCRYPTED_EXPORT_PREFIX = "__BUDGETARK_ENC__:";

/**
 * Gathers all app data into a single object and opens
 * the native share sheet so the user can copy, save, or send it.
 *
 * @param password - if provided, the export is AES-encrypted with this password
 * @returns Promise<void>
 */
export const exportAllData = async (password?: string): Promise<void> => {
  // Collect all data in parallel
  const [
    debts,
    payments,
    budgetEntries,
    budgetLimits,
    budgetLimitsByMonth,
    user,
    savingsGoals,
    assetAccounts,
    debtMilestones,
    payoffStrategy,
    netWorthSnapshots,
  ] = await Promise.all([
    getDebts(),
    getPayments(),
    getBudgetEntries(),
    getCategoryBudgetLimits(),
    getAllLimitsByMonth(),
    getOrCreateUser(),
    getSavingsGoals(),
    getAssetAccounts(),
    getDebtMilestonePlan(),
    getPayoffStrategyPreference(),
    getNetWorthSnapshots(),
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
    // Keep the legacy current-month-only field so older app versions can still
    // partially restore from a new export.
    budgetLimits,
    // Full per-month limit history (preferred when reading).
    budgetLimitsByMonth,
    savingsGoals,
    assetAccounts,
    debtMilestones,
    payoffStrategy,
    netWorthSnapshots,
  };

  const json = JSON.stringify(exportPayload, null, 2);

  let message: string;
  if (password) {
    const ciphertext = CryptoJS.AES.encrypt(json, password).toString();
    message = ENCRYPTED_EXPORT_PREFIX + ciphertext;
  } else {
    message = json;
  }

  const result = await Share.share({
    title: "BudgetArk Data Export",
    message,
  });

  // Stamp the backup version only when the user actually completed the
  // share sheet - dismissing without sharing leaves the reminder visible.
  if (result.action === Share.sharedAction) {
    await recordBackup(CURRENT_APP_VERSION);
  }
};

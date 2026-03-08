/**
 * BudgetArk — Data Export Utility
 * File: src/utils/exportData.ts
 *
 * Collects all user data from AsyncStorage and exports it
 * via the native share sheet using React Native's built-in Share API.
 * No extra native modules required.
 */

import { Share } from "react-native";
import { getDebts, getPayments } from "../storage/debtStorage";
import { getBudgetEntries, getCategoryBudgetLimits } from "../storage/budgetStorage";
import { getOrCreateUser } from "../storage/userStorage";
import { CURRENT_APP_VERSION } from "../data/releaseNotes";

/**
 * Gathers all app data into a single object and opens
 * the native share sheet so the user can copy, save, or send it.
 *
 * @returns Promise<void>
 */
export const exportAllData = async (): Promise<void> => {
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

  await Share.share({
    title: "BudgetArk Data Export",
    message: json,
  });
};

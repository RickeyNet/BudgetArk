/**
 * BudgetArk - Data Export Utility
 * File: src/utils/exportData.ts
 *
 * Collects all user data from AsyncStorage and exports it
 * via the native share sheet using React Native's built-in Share API.
 * Supports optional password-based encryption for secure exports.
 */

import { Share } from "react-native";
import { encryptExportEnvelopeV3 } from "./exportEncryption";
import {
  getDebtsIncludingDeleted,
  getPaymentsIncludingDeleted,
  getPayoffStrategyEnvelope,
} from "../storage/debtStorage";
import {
  getBudgetEntriesIncludingDeleted,
  getAllLimitsByMonth,
  getCategoryBudgetLimits,
} from "../storage/budgetStorage";
import { getOrCreateUser } from "../storage/userStorage";
import { getSavingsGoalsIncludingDeleted } from "../storage/savingsGoalStorage";
import { getAssetAccountsIncludingDeleted } from "../storage/assetAccountStorage";
import { getHoldingsIncludingDeleted } from "../storage/holdingsStorage";
import { getDebtMilestonePlan } from "../storage/debtMilestoneStorage";
import { getNetWorthSnapshots } from "../storage/netWorthSnapshotStorage";
import { getCustomCategories } from "../storage/customCategoriesStorage";
import { getBusinessesIncludingDeleted } from "../storage/businessStorage";
import { getCategoryBucketOverrides } from "../storage/categoryBucketOverridesStorage";
import { getUnlockedAchievements } from "../storage/achievementsStorage";
import { getAchievementStats } from "../storage/achievementStatsStorage";
import { getMonthStartBalances } from "../storage/monthlyBalanceStorage";
import { getDebtDueDismissals } from "../storage/debtDueReminderStorage";
import { getCardKeepAliveDismissals } from "../storage/cardKeepAliveDismissalStorage";
import { CURRENT_APP_VERSION } from "../data/releaseNotes";
import { recordBackup } from "../storage/backupReminderStorage";

/**
 * Legacy v1 prefix - `CryptoJS.AES.encrypt(json, password).toString()` with
 * the default OpenSSL EVP_BytesToKey KDF (single-round MD5). Brute-forceable
 * offline in seconds for short passwords. Still readable on import for users
 * with old backups, but the export path now produces v2 only.
 */
export const ENCRYPTED_EXPORT_PREFIX = "__BUDGETARK_ENC__:";

/**
 * Legacy v2 prefix - PBKDF2-SHA256 (250k) + AES-256-CBC with explicit
 * salt/iv, but NO integrity tag: a bit-flipped ciphertext decrypted to
 * silently corrupted data, and a wrong password was indistinguishable from
 * a damaged file. Still readable on import; the export path now produces
 * v3 (encrypt-then-MAC, see utils/exportEncryption.ts) only.
 */
export const ENCRYPTED_EXPORT_PREFIX_V2 = "__BUDGETARK_ENC2__:";

/**
 * Builds the export message string (plain JSON or v2-encrypted envelope).
 * Split out from `exportAllData` so the UI can dismiss any "preparing"
 * spinner before opening the share sheet - on iOS, presenting
 * UIActivityViewController over a still-visible RN <Modal> leaves the
 * share sheet's completion callback un-fired, so `Share.share` never
 * resolves and the spinner spins forever.
 */
export const buildExportMessage = async (password?: string): Promise<string> => {
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
    holdings,
    debtMilestones,
    payoffStrategyEnvelope,
    netWorthSnapshots,
    customCategories,
    businesses,
    categoryBucketOverrides,
    achievements,
    achievementStats,
    monthStartBalances,
    debtDueDismissals,
    cardKeepAliveDismissals,
  ] = await Promise.all([
    // Tombstoned records are intentionally included so a `replace`-mode
    // restore on this device, or another paired device, doesn't accidentally
    // resurrect data the user already deleted. Sync still applies LWW; the
    // backup just preserves the full state at export time.
    getDebtsIncludingDeleted(),
    getPaymentsIncludingDeleted(),
    getBudgetEntriesIncludingDeleted(),
    getCategoryBudgetLimits(),
    getAllLimitsByMonth(),
    getOrCreateUser(),
    getSavingsGoalsIncludingDeleted(),
    getAssetAccountsIncludingDeleted(),
    // Tombstones included like the other collections (see note above). Quote
    // prices are intentionally NOT exported - they live in a per-device cache
    // and are cheap to re-fetch; a backup carries only the Holding records.
    getHoldingsIncludingDeleted(),
    getDebtMilestonePlan(),
    // Pull the full envelope (value + updatedAt) rather than the bare value.
    // Without `updatedAt`, a re-import on this or a paired device stamps the
    // strategy with import-time `now`, which the next sync's LWW treats as a
    // fresh edit and propagates over whichever choice the partner had. Same
    // ping-pong we fixed for sync; export-then-import was opening it back up.
    getPayoffStrategyEnvelope(),
    getNetWorthSnapshots(),
    getCustomCategories(),
    // Tombstones included so a restore doesn't resurrect a deleted business
    // whose id entries may still reference (see note above).
    getBusinessesIncludingDeleted(),
    getCategoryBucketOverrides(),
    // Achievements + their backing stats are NOT derivable from financial
    // data (export taps, Monthly Review opens, app-open streak), so leaving
    // them out of the backup meant a device migration permanently reset the
    // stat-based badges to zero.
    getUnlockedAchievements(),
    getAchievementStats(),
    // Month-start checking balances: real financial history (the cash-flow
    // projection's anchor), so it must survive a device migration.
    getMonthStartBalances(),
    // Due-day dismissals are "<debtId>:<YYYY-MM>" facts; without them every
    // debt with a payment due day re-prompts for the current month right
    // after a restore.
    getDebtDueDismissals(),
    // Same shape/rationale for card keep-alive banner dismissals.
    getCardKeepAliveDismissals(),
  ]);

  // Bank-connection data (connections, credentials/secrets, account links,
  // the review inbox, the ingest ledger, merchant rules) is INTENTIONALLY
  // excluded from exports: it's per-device and credential-adjacent. The
  // BudgetEntry provenance fields (source/externalTxId/merchant) ride along
  // inside `budgetEntries` - that's the only bank-related data that leaves
  // the device. A regression test in __tests__/exportData.test.ts enforces
  // this.
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
    holdings,
    debtMilestones,
    payoffStrategy: payoffStrategyEnvelope?.value,
    payoffStrategyUpdatedAt: payoffStrategyEnvelope?.updatedAt,
    netWorthSnapshots,
    customCategories,
    businesses,
    categoryBucketOverrides,
    achievements,
    achievementStats,
    monthStartBalances,
    debtDueDismissals,
    cardKeepAliveDismissals,
  };

  // Compact, not pretty-printed: indentation tripled the file size, and
  // long-term users' exports were outgrowing import's size cap - making
  // the app's own backups unrestorable at exactly the moment (device
  // migration) the user needed them.
  const json = JSON.stringify(exportPayload);

  // v3 envelope: PBKDF2-derived AES + MAC keys, encrypt-then-MAC so an
  // import can verify the file is intact and untampered before parsing.
  // v1/v2 remain decryptable on import for older backups but are no longer
  // produced. See utils/exportEncryption.ts for the format contract.
  return password ? encryptExportEnvelopeV3(json, password) : json;
};

/**
 * Opens the native share sheet with a pre-built message. Caller is
 * responsible for dismissing any blocking modals first (see the note on
 * `buildExportMessage` re: iOS share-sheet presentation).
 */
export const shareExportMessage = async (message: string): Promise<void> => {
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

/**
 * Convenience wrapper that builds the export and shares it back-to-back.
 * Prefer calling `buildExportMessage` + `shareExportMessage` directly when
 * a UI spinner needs to be dismissed between the two steps.
 */
export const exportAllData = async (password?: string): Promise<void> => {
  const message = await buildExportMessage(password);
  await shareExportMessage(message);
};

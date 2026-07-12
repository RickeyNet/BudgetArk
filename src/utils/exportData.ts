/**
 * BudgetArk - Data Export Utility
 * File: src/utils/exportData.ts
 *
 * Collects all user data from AsyncStorage and exports it
 * via the native share sheet using React Native's built-in Share API.
 * Supports optional password-based encryption for secure exports.
 */

import { Share } from "react-native";
import {
  aesCbcEncryptToBase64,
  hexToBytes,
  pbkdf2Sha256,
  randomHex,
} from "../crypto/nativeCrypto";
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
import { getDebtDueDismissals } from "../storage/debtDueReminderStorage";
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
 * Current v2 prefix. Format after the prefix:
 *   <salt-hex (32 chars)> "." <iv-hex (32 chars)> "." <ciphertext-base64>
 *
 * Salt: 16 random bytes per export (so the KDF produces a different key
 * even for the same password). IV: 16 random bytes (AES-256-CBC needs a
 * fresh IV per ciphertext or two exports with the same password leak the
 * XOR of their first plaintext blocks). KDF: PBKDF2-SHA256 with 250k
 * iterations - slow enough that a 4-char password takes hours instead of
 * seconds to brute-force, while still keeping a single export decrypt
 * under ~200ms on a low-end device.
 */
export const ENCRYPTED_EXPORT_PREFIX_V2 = "__BUDGETARK_ENC2__:";

const PBKDF2_ITERATIONS = 250_000;
const PBKDF2_KEY_BYTES = 32; // 256-bit key
const SALT_BYTES = 16;
const IV_BYTES = 16;

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
    debtDueDismissals,
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
    // Due-day dismissals are "<debtId>:<YYYY-MM>" facts; without them every
    // debt with a payment due day re-prompts for the current month right
    // after a restore.
    getDebtDueDismissals(),
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
    debtDueDismissals,
  };

  // Compact, not pretty-printed: indentation tripled the file size, and
  // long-term users' exports were outgrowing import's size cap - making
  // the app's own backups unrestorable at exactly the moment (device
  // migration) the user needed them.
  const json = JSON.stringify(exportPayload);

  let message: string;
  if (password) {
    // v2 envelope: salt | iv | ciphertext, all base16/base64. PBKDF2 derives
    // the AES key so a short password isn't a few seconds of offline brute
    // force. v1 path (insecure default KDF) is still decryptable on import
    // for legacy backups but no longer produced here.
    //
    // Native crypto (quick-crypto/OpenSSL) with the exact parameters the old
    // crypto-js code used - the envelope stays byte-compatible in both
    // directions (old app reads new export, new app reads old export); the
    // golden fixtures in importData.test.ts enforce it. PBKDF2 runs async on
    // a native thread, so building an encrypted export no longer freezes the
    // UI for seconds.
    const saltHex = randomHex(SALT_BYTES);
    const ivHex = randomHex(IV_BYTES);
    const key = await pbkdf2Sha256(
      password,
      hexToBytes(saltHex),
      PBKDF2_ITERATIONS,
      PBKDF2_KEY_BYTES
    );
    const ctB64 = aesCbcEncryptToBase64(json, key, hexToBytes(ivHex));
    message = `${ENCRYPTED_EXPORT_PREFIX_V2}${saltHex}.${ivHex}.${ctB64}`;
  } else {
    message = json;
  }

  return message;
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

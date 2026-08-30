/**
 * BudgetArk - Data Export Utility
 * File: src/utils/exportData.ts
 *
 * Collects all user data from encrypted storage and exports it as a
 * backup FILE handed to the native share sheet (expo-sharing). Supports
 * optional password-based encryption for secure exports.
 *
 * The export deliberately goes out as a file, never as `Share.share({
 * message })` text: on Android the message rides an Intent extra through a
 * Binder transaction capped at ~1MB (`TransactionTooLargeException`), and a
 * multi-year backup with bank-synced entries blew past it. The chooser then
 * silently never appeared while React Native still resolved the share as
 * "shared" - so the app stamped a backup that never happened. Files have no
 * such ceiling (the spreadsheet export never had this problem).
 */

import { Platform } from "react-native";
import { File as ExpoFile, Paths } from "expo-file-system";
import { encryptExportEnvelopeV3 } from "./exportEncryption";
import { deleteLocalFileQuietly, shareLocalFileThenDelete } from "./shareTempFile";
import {
  getDebtsIncludingDeleted,
  getPaymentsIncludingDeleted,
  getPayoffStrategyEnvelope,
} from "../storage/debtStorage";
import {
  getBudgetEntriesIncludingDeleted,
  getAllLimitsByMonthIncludingDeleted,
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
import { getPeopleIncludingDeleted } from "../storage/personStorage";
import { getCategoryBucketOverrides } from "../storage/categoryBucketOverridesStorage";
import { getUnlockedAchievements } from "../storage/achievementsStorage";
import { getAchievementStats } from "../storage/achievementStatsStorage";
import { getMonthStartBalances } from "../storage/monthlyBalanceStorage";
import { getDebtDueDismissals } from "../storage/debtDueReminderStorage";
import { getCardKeepAliveDismissals } from "../storage/cardKeepAliveDismissalStorage";
import { getLearningProgress } from "../storage/learningProgressStorage";
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
    people,
    categoryBucketOverrides,
    achievements,
    achievementStats,
    monthStartBalances,
    debtDueDismissals,
    cardKeepAliveDismissals,
    learningProgress,
  ] = await Promise.all([
    // Tombstoned records are intentionally included so a `replace`-mode
    // restore on this device, or another paired device, doesn't accidentally
    // resurrect data the user already deleted. Sync still applies LWW; the
    // backup just preserves the full state at export time.
    getDebtsIncludingDeleted(),
    getPaymentsIncludingDeleted(),
    getBudgetEntriesIncludingDeleted(),
    getCategoryBudgetLimits(),
    // Removed limits ride along as tombstones for the same reason as the
    // other collections above.
    getAllLimitsByMonthIncludingDeleted(),
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
    // Same tombstone rationale for people (BudgetEntry.personId).
    getPeopleIncludingDeleted(),
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
    // Lesson completions + the Resume pointer are not derivable from any
    // other data, so a device migration silently reset the learning hub.
    // Still deliberately NOT partner-synced (see learningProgressStorage).
    getLearningProgress(),
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
    people,
    categoryBucketOverrides,
    achievements,
    achievementStats,
    monthStartBalances,
    debtDueDismissals,
    cardKeepAliveDismissals,
    learningProgress,
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

/** Detects the prefixed (v1/v2/v3) encrypted envelope vs plain JSON. */
const isEncryptedMessage = (message: string): boolean =>
  message.startsWith("__BUDGETARK_ENC");

/**
 * Builds the temp filename for an export: `budgetark-backup-<stamp>.json`
 * for plain JSON, `.txt` for the encrypted envelope (which is a prefixed
 * text blob, not JSON - labelling it `.json` would just make receiving apps
 * and the user's file manager choke on it). Both extensions/MIME types are
 * on the import picker's accept list (`application/json`, `text/plain`).
 */
export const buildExportFilename = (
  encrypted: boolean,
  now: Date = new Date()
): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
    now.getDate()
  )}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `budgetark-backup-${stamp}.${encrypted ? "txt" : "json"}`;
};

/**
 * Writes the pre-built export to a temp file and opens the native share
 * sheet for it, deleting the file once the sheet closes (or if sharing
 * throws). Caller is responsible for dismissing any blocking modals first
 * (see the note on `buildExportMessage` re: iOS share-sheet presentation;
 * `shareLocalFile` adds its own iOS teardown wait + ScreenGuard handling).
 */
export const shareExportMessage = async (message: string): Promise<void> => {
  const encrypted = isEncryptedMessage(message);
  // iOS share sheet reads more reliably from the document directory than
  // cache (same choice as spreadsheetExport).
  const fileDir = Platform.OS === "ios" ? Paths.document : Paths.cache;
  const file = new ExpoFile(fileDir, buildExportFilename(encrypted));

  try {
    file.create({ overwrite: true });
    file.write(message, { encoding: "utf8" });
  } catch (error) {
    // A partial plaintext export must not linger on disk.
    deleteLocalFileQuietly(file);
    throw error;
  }

  await shareLocalFileThenDelete(file, {
    mimeType: encrypted ? "text/plain" : "application/json",
    dialogTitle: "BudgetArk Data Export",
    UTI: encrypted ? "public.plain-text" : "public.json",
  });

  // expo-sharing resolves once the sheet is dismissed and can't tell
  // "shared" from "cancelled" (neither could the old Android Share path,
  // which always reported sharedAction). Stamping here matches the
  // spreadsheet export's behaviour; the user who cancels can re-export.
  await recordBackup(CURRENT_APP_VERSION);
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

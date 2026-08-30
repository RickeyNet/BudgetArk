/**
 * BudgetArk - Auto-backup runner (launch task)
 * File: src/services/autoBackup/autoBackupRunner.ts
 *
 * Writes a scheduled local backup when one is due, deferred past first
 * paint by the caller (App.tsx) - same shape as attachmentSweepRunner. No
 * background tasks: the check runs on every cold start, so a weekly
 * cadence means "the first launch at least a week after the last backup".
 * Due-ness derives from the newest file on disk, never from a separate
 * timestamp that could drift.
 */

import { buildExportMessage } from "../../utils/exportData";
import { getAutoBackupSettings } from "../../storage/autoBackupSettingsStorage";
import { cadenceMs, isBackupDue, type AutoBackupFileInfo } from "./autoBackupPlan";
import { listAutoBackups, writeAutoBackup } from "./autoBackupStore";

/**
 * Builds the standard (unencrypted-JSON) export and writes it as an
 * encrypted backup file. Shared by the launch task and the manual
 * "Back Up Now" button.
 *
 * @throws AutoBackupEncryptionUnavailableError when the vault is down.
 */
export const createAutoBackupNow = async (): Promise<AutoBackupFileInfo> => {
  const exportJson = await buildExportMessage();
  return writeAutoBackup(exportJson);
};

export const runAutoBackupIfDue = async (): Promise<void> => {
  try {
    const settings = await getAutoBackupSettings();
    if (!settings.enabled) return;
    const files = await listAutoBackups();
    if (!isBackupDue(files, Date.now(), cadenceMs(settings.cadence))) return;
    await createAutoBackupNow();
  } catch (error) {
    // Never let a backup break launch; the next cold start retries.
    if (__DEV__) console.error("Auto-backup failed:", error);
  }
};

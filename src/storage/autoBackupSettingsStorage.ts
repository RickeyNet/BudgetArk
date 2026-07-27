/**
 * BudgetArk - Auto-backup settings storage
 * File: src/storage/autoBackupSettingsStorage.ts
 *
 * Persists the scheduled-local-auto-backup preferences (on/off + cadence).
 * Defaults to ON/weekly - see DEFAULT_AUTO_BACKUP_SETTINGS for why. The
 * "last backup" timestamp is deliberately NOT stored here: it derives from
 * the files themselves (autoBackupStore.listAutoBackups), so state can
 * never drift from what's actually on disk.
 *
 * Per-device (not synced, not exported); in debtStorage.RESET_KEYS.
 */

import * as EncryptedStorage from "./encryptedStorage";
import {
  type AutoBackupSettings,
  parseAutoBackupSettings,
} from "../services/autoBackup/autoBackupPlan";

const SETTINGS_KEY = "@budgetark_auto_backup_settings" as const;

export const getAutoBackupSettings = async (): Promise<AutoBackupSettings> => {
  try {
    return parseAutoBackupSettings(await EncryptedStorage.getItem(SETTINGS_KEY));
  } catch (error) {
    if (__DEV__) console.warn("Auto-backup settings unreadable:", error);
    return parseAutoBackupSettings(null);
  }
};

export const setAutoBackupSettings = async (
  settings: AutoBackupSettings
): Promise<AutoBackupSettings> => {
  await EncryptedStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  return settings;
};

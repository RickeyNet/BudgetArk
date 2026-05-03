/**
 * BudgetArk — Backup Reminder Storage
 * File: src/storage/backupReminderStorage.ts
 *
 * Tracks the last successful export so the Profile banner can nudge
 * the user to take a fresh backup after an app upgrade. The reminder
 * fires when CURRENT_APP_VERSION differs from lastBackupVersion (or
 * no backup has ever been recorded), unless the user has explicitly
 * dismissed the reminder for the current version.
 */

import * as EncryptedStorage from "./encryptedStorage";

const KEY = "@budgetark_backup_reminder" as const;

export interface BackupReminderState {
  /** App version that was current when the last successful export ran */
  lastBackupVersion?: string;
  /** ISO timestamp of the last successful export */
  lastBackupAt?: string;
  /** App version the user was on when they dismissed the reminder */
  dismissedVersion?: string;
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

export const getBackupReminderState = async (): Promise<BackupReminderState> => {
  const raw = await EncryptedStorage.getItem(KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!isObject(parsed)) return {};
    const out: BackupReminderState = {};
    if (typeof parsed.lastBackupVersion === "string") {
      out.lastBackupVersion = parsed.lastBackupVersion;
    }
    if (typeof parsed.lastBackupAt === "string") {
      out.lastBackupAt = parsed.lastBackupAt;
    }
    if (typeof parsed.dismissedVersion === "string") {
      out.dismissedVersion = parsed.dismissedVersion;
    }
    return out;
  } catch {
    return {};
  }
};

const writeState = async (state: BackupReminderState): Promise<void> => {
  await EncryptedStorage.setItem(KEY, JSON.stringify(state));
};

/**
 * Record a successful export. Clears any stale dismissal so the next
 * version bump can re-trigger the banner.
 */
export const recordBackup = async (version: string): Promise<void> => {
  const current = await getBackupReminderState();
  await writeState({
    ...current,
    lastBackupVersion: version,
    lastBackupAt: new Date().toISOString(),
    dismissedVersion: undefined,
  });
};

/**
 * Dismiss the reminder for the current app version. Bumping the app
 * version later will re-show the banner.
 */
export const dismissBackupReminder = async (version: string): Promise<void> => {
  const current = await getBackupReminderState();
  await writeState({ ...current, dismissedVersion: version });
};

/**
 * Whether the banner should be visible right now.
 *
 * - No backup ever taken → show.
 * - lastBackupVersion !== currentVersion (i.e. user upgraded since last
 *   backup) → show, unless they've dismissed for this exact version.
 */
export const shouldShowBackupReminder = (
  state: BackupReminderState,
  currentVersion: string
): boolean => {
  if (state.dismissedVersion === currentVersion) return false;
  if (!state.lastBackupVersion) return true;
  return state.lastBackupVersion !== currentVersion;
};

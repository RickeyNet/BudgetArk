/**
 * BudgetArk - Auto-backup file store
 * File: src/services/autoBackup/autoBackupStore.ts
 *
 * On-disk lifecycle of scheduled local backups under
 * <document>/autobackups/. Every backup is the standard export JSON
 * encrypted with the master key (the same fixture-tested V3 envelope as
 * receipt photos) before it touches disk - never plaintext. Decision rules
 * (naming, prune, due-check) live in autoBackupPlan.ts.
 *
 * These files are DEVICE-LOCAL RECOVERY, not portable backups: the master
 * key never leaves this device, so a copied file is unreadable anywhere
 * else, and an uninstall deletes the directory. Reset All Data wipes it
 * too (clearAllAutoBackups from ProfileScreen's reset flow).
 */

import { Directory, File as ExpoFile, Paths } from "expo-file-system";
import {
  encryptStringWithMasterKey,
  decryptStringWithMasterKey,
} from "../../storage/encryptedStorage";
import {
  AUTO_BACKUP_KEEP,
  type AutoBackupFileInfo,
  autoBackupFileName,
  parseAutoBackupFileName,
  planPrune,
  sortNewestFirst,
} from "./autoBackupPlan";

const AUTO_BACKUP_DIR_NAME = "autobackups";

/**
 * Thrown when the secure vault is unavailable - the caller must skip the
 * backup (or tell the user), never write a plaintext file.
 */
export class AutoBackupEncryptionUnavailableError extends Error {
  constructor() {
    super("Secure keystore unavailable; refusing to write a plaintext backup");
    this.name = "AutoBackupEncryptionUnavailableError";
  }
}

const backupsDir = (): Directory =>
  new Directory(Paths.document, AUTO_BACKUP_DIR_NAME);

const ensureDir = (): Directory => {
  const dir = backupsDir();
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
};

/** Backups on disk, newest first. Unrecognized file names are ignored. */
export const listAutoBackups = async (): Promise<AutoBackupFileInfo[]> => {
  const dir = backupsDir();
  if (!dir.exists) return [];
  let listing: (ExpoFile | Directory)[];
  try {
    listing = dir.list();
  } catch {
    return [];
  }
  const files: AutoBackupFileInfo[] = [];
  for (const item of listing) {
    if (!(item instanceof ExpoFile)) continue;
    const timestampMs = parseAutoBackupFileName(item.name);
    if (timestampMs === null) continue;
    let sizeBytes: number | null = null;
    try {
      sizeBytes = item.size ?? null;
    } catch {
      sizeBytes = null;
    }
    files.push({ name: item.name, timestampMs, sizeBytes });
  }
  return sortNewestFirst(files);
};

/**
 * Encrypts and writes a new backup, then prunes to the newest
 * AUTO_BACKUP_KEEP. Returns the new file's info.
 *
 * @throws AutoBackupEncryptionUnavailableError when the vault is down.
 */
export const writeAutoBackup = async (
  exportJson: string
): Promise<AutoBackupFileInfo> => {
  const blob = await encryptStringWithMasterKey(exportJson);
  if (blob === null) {
    throw new AutoBackupEncryptionUnavailableError();
  }
  const timestampMs = Date.now();
  const name = autoBackupFileName(timestampMs);
  const file = new ExpoFile(ensureDir(), name);
  file.create({ overwrite: true });
  file.write(blob, { encoding: "utf8" });

  // Prune AFTER the new write succeeds - never delete the old backups to
  // make room for one that might fail.
  const files = await listAutoBackups();
  for (const doomed of planPrune(files, AUTO_BACKUP_KEEP)) {
    try {
      const old = new ExpoFile(backupsDir(), doomed);
      if (old.exists) old.delete();
    } catch {
      // Best-effort; retried after the next write.
    }
  }

  return { name, timestampMs, sizeBytes: blob.length };
};

/**
 * Reads and decrypts a backup back to the export JSON, or null when the
 * file is missing/unreadable/tampered (V3 HMAC failure). Only names that
 * parse as ours are honored - callers pass names from listAutoBackups.
 */
export const readAutoBackupJson = async (
  name: string
): Promise<string | null> => {
  if (parseAutoBackupFileName(name) === null) return null;
  const file = new ExpoFile(backupsDir(), name);
  if (!file.exists) return null;
  let blob: string;
  try {
    blob = await file.text();
  } catch {
    return null;
  }
  return decryptStringWithMasterKey(blob);
};

/** Reset All Data: remove every backup and the directory itself. */
export const clearAllAutoBackups = async (): Promise<void> => {
  try {
    const dir = backupsDir();
    if (dir.exists) dir.delete();
  } catch {
    // Best-effort - a failed delete leaves only encrypted blobs behind.
  }
};

/**
 * BudgetArk - Auto-backup planning logic
 * File: src/services/autoBackup/autoBackupPlan.ts
 *
 * Pure decision logic for the scheduled local auto-backup: file naming,
 * due-check, prune plan, and settings parsing. No filesystem or storage
 * imports so it unit-tests cleanly; the shells live in autoBackupStore.ts
 * (files) and storage/autoBackupSettingsStorage.ts (settings).
 *
 * An auto-backup is the standard export JSON encrypted with the MASTER KEY
 * (V3 envelope), written into the app's own sandbox. It protects against
 * on-device mistakes (bad import, accidental deletes, corruption) - NOT
 * device loss: sandbox files die with an uninstall, and the master key
 * never leaves this device, so these files are useless anywhere else.
 * The share-sheet export remains the device-migration path.
 */

export type AutoBackupCadence = "weekly" | "monthly";

export type AutoBackupSettings = {
  enabled: boolean;
  cadence: AutoBackupCadence;
};

/**
 * On by default: the whole point is protecting users who never tap Export,
 * and the file is sandbox-local + encrypted with the same key as every
 * other byte of app data - no new exposure surface.
 */
export const DEFAULT_AUTO_BACKUP_SETTINGS: AutoBackupSettings = {
  enabled: true,
  cadence: "weekly",
};

/** How many backups to keep; older ones are pruned after each write. */
export const AUTO_BACKUP_KEEP = 3;

export const cadenceMs = (cadence: AutoBackupCadence): number =>
  cadence === "weekly" ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;

export const cadenceLabel = (cadence: AutoBackupCadence): string =>
  cadence === "weekly" ? "Weekly" : "Monthly";

/* ── File naming ── */

const FILE_PREFIX = "auto-backup-";
const FILE_SUFFIX = ".enc";
const NAME_PATTERN = /^auto-backup-(\d{10,16})\.enc$/;

export const autoBackupFileName = (timestampMs: number): string =>
  `${FILE_PREFIX}${timestampMs}${FILE_SUFFIX}`;

/**
 * Epoch ms encoded in a backup file name, or null for anything that isn't
 * one of ours (fail-closed - unknown files are never listed or pruned).
 */
export const parseAutoBackupFileName = (name: string): number | null => {
  const match = NAME_PATTERN.exec(name);
  if (!match) return null;
  const timestampMs = Number(match[1]);
  return Number.isSafeInteger(timestampMs) && timestampMs > 0
    ? timestampMs
    : null;
};

export type AutoBackupFileInfo = {
  name: string;
  timestampMs: number;
  /** Bytes on disk, when the platform reports it. */
  sizeBytes: number | null;
};

/** Newest-first sort used by every listing surface. */
export const sortNewestFirst = (
  files: readonly AutoBackupFileInfo[]
): AutoBackupFileInfo[] =>
  [...files].sort((a, b) => b.timestampMs - a.timestampMs);

/**
 * Whether a new backup is owed. Due when there is no backup yet or the
 * newest is at least a full cadence old. A newest file stamped in the
 * future (clock rollback) reads as "not due" - it ages back into range
 * when the clock catches up, and the manual Back Up Now button is always
 * available.
 */
export const isBackupDue = (
  files: readonly AutoBackupFileInfo[],
  nowMs: number,
  intervalMs: number
): boolean => {
  if (files.length === 0) return true;
  const newest = Math.max(...files.map((file) => file.timestampMs));
  return nowMs - newest >= intervalMs;
};

/**
 * Names to delete so only the newest `keep` backups remain. Only files
 * whose names parsed as ours are ever candidates.
 */
export const planPrune = (
  files: readonly AutoBackupFileInfo[],
  keep: number
): string[] =>
  sortNewestFirst(files)
    .slice(Math.max(0, keep))
    .map((file) => file.name);

/* ── Settings parsing (fail-closed to defaults) ── */

export const parseAutoBackupSettings = (
  raw: string | null
): AutoBackupSettings => {
  if (!raw) return DEFAULT_AUTO_BACKUP_SETTINGS;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return DEFAULT_AUTO_BACKUP_SETTINGS;
  }
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return DEFAULT_AUTO_BACKUP_SETTINGS;
  }
  const record = data as Record<string, unknown>;
  return {
    enabled:
      typeof record.enabled === "boolean"
        ? record.enabled
        : DEFAULT_AUTO_BACKUP_SETTINGS.enabled,
    cadence:
      record.cadence === "weekly" || record.cadence === "monthly"
        ? record.cadence
        : DEFAULT_AUTO_BACKUP_SETTINGS.cadence,
  };
};

/** "1.2 MB", "340 KB", or null when the size is unknown. */
export const formatBackupSize = (sizeBytes: number | null): string | null => {
  if (sizeBytes === null || !Number.isFinite(sizeBytes) || sizeBytes < 0) {
    return null;
  }
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
};

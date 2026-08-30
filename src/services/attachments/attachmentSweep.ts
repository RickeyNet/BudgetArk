/**
 * BudgetArk - Attachment orphan-sweep planning (pure logic)
 * File: src/services/attachments/attachmentSweep.ts
 *
 * Receipt photo files are garbage-collected by exactly ONE mechanism: a
 * cold-start sweep that deletes files no live OR tombstoned entry references
 * anymore. Files are never eagerly deleted when an entry is deleted -
 * deletes are soft (Undo + the 90-day sync tombstone window must be able to
 * bring the photos back). The sweep therefore covers every orphan source in
 * one code path: tombstone TTL purge, sync-applied deletes, replace-mode
 * imports, screen-state save races, and crashed Add-modal staging sessions.
 *
 * The min-age gate protects in-flight work: a photo staged in the Add modal
 * exists on disk before its entry does, so anything younger than
 * DEFAULT_SWEEP_MIN_AGE_MS is left alone even when unreferenced.
 *
 * This module is pure (no I/O) so the decision logic is unit-testable;
 * attachmentStore.ts feeds it directory listings and executes the plan.
 */

/** Unreferenced files younger than this are kept (in-flight staging). */
export const DEFAULT_SWEEP_MIN_AGE_MS = 48 * 60 * 60 * 1000;

/** One file in the attachments directory, as seen by the sweeper. */
export interface AttachmentFileStat {
  /** Basename, e.g. "abc123.jpg.enc" or "abc123.thumb.jpg.enc". */
  name: string;
  /** Epoch ms, or null when the platform couldn't read it. */
  modifiedAtMs: number | null;
}

const FILE_NAME_PATTERN = /^(.+?)\.(?:thumb\.)?jpg\.enc$/;

/**
 * Extracts the attachment id from a store filename, or null for files this
 * module doesn't own (which the sweep must never touch).
 */
export const attachmentIdFromFilename = (name: string): string | null => {
  const match = name.match(FILE_NAME_PATTERN);
  return match ? match[1] : null;
};

/**
 * Decides which files to delete. A file survives when ANY of:
 *   - its id is referenced by a live or tombstoned entry,
 *   - it is younger than minAgeMs (staging in progress),
 *   - its mtime is unreadable (fail safe - never delete blind),
 *   - its name doesn't match the store's naming scheme (not ours).
 *
 * @returns filenames (not ids) to delete, so thumb and full are decided
 *          independently even though they normally live and die together.
 */
export const planAttachmentSweep = (
  files: readonly AttachmentFileStat[],
  referencedIds: ReadonlySet<string>,
  nowMs: number,
  minAgeMs: number = DEFAULT_SWEEP_MIN_AGE_MS
): string[] => {
  const doomed: string[] = [];
  for (const file of files) {
    const id = attachmentIdFromFilename(file.name);
    if (id === null) continue;
    if (referencedIds.has(id)) continue;
    if (file.modifiedAtMs === null) continue;
    if (nowMs - file.modifiedAtMs <= minAgeMs) continue;
    doomed.push(file.name);
  }
  return doomed;
};

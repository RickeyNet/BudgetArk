/**
 * BudgetArk - Share-Then-Delete for Temporary Export Files
 * File: src/utils/shareTempFile.ts
 *
 * Every plaintext export (spreadsheet, business/person CSV, loan schedule)
 * is written to a local file only so the native share sheet can hand it
 * to the app the user picks. Once the sheet closes the file has done its
 * job - leaving it behind means unencrypted financial data sitting in the
 * app's Documents/cache directory indefinitely (and, on iOS, inside device
 * backups). The receipt-photo zip already deletes itself in `finally`
 * (`receiptZipExport.ts`); this helper gives the other exports the same
 * posture. expo-sharing resolves once the sheet is dismissed, by which
 * point the receiving app has copied the file, so deleting immediately is
 * safe - and it runs even when sharing throws, so a failed share never
 * strands a plaintext file either.
 */

import { shareLocalFile, type ShareFileOptions } from "./iosNativeShare";

/** The subset of expo-file-system's `File` this module needs. */
export interface DeletableLocalFile {
  uri: string;
  exists: boolean;
  delete(): void;
}

/** Best-effort removal; a cleanup failure must never mask the share result. */
export const deleteLocalFileQuietly = (file: DeletableLocalFile): void => {
  try {
    if (file.exists) file.delete();
  } catch {
    // Documents/cache cleanup is best-effort.
  }
};

/** Opens the share sheet for `file`, then deletes it whatever happened. */
export const shareLocalFileThenDelete = async (
  file: DeletableLocalFile,
  options: ShareFileOptions
): Promise<void> => {
  try {
    await shareLocalFile(file.uri, options);
  } finally {
    deleteLocalFileQuietly(file);
  }
};

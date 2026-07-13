/**
 * BudgetArk - Receipt zip export (I/O)
 * File: src/services/attachments/receiptZipExport.ts
 *
 * Builds `budgetark-receipts-<year>.zip` from a business report: decrypts
 * each planned photo (see utils/receiptExport.ts for the naming/dedupe
 * rules) and stores it uncompressed (JPEGs don't deflate) in an in-memory
 * zip, then writes the archive to disk for the share sheet.
 *
 * PRIVACY: the zip contains DECRYPTED photos - that is the point of the
 * export (hand receipts to an accountant), but it must only run after the
 * user explicitly confirms, and the caller must delete the archive file
 * after sharing (see BusinessReportModal). Photos whose files live on the
 * partner device (metadata synced, file device-local) are skipped and
 * counted so the caller can tell the user.
 *
 * Memory note: the whole archive is assembled in JS memory (~base64 of every
 * photo, then the zip). At ~200-400KB per 1600px JPEG a full year of
 * receipts stays in the tens of MB - acceptable for a user-initiated,
 * once-a-year export.
 */

import JSZip from "jszip";
import { File as ExpoFile, Paths } from "expo-file-system";
import { Platform } from "react-native";
import type { BudgetEntry } from "../../types";
import type { BusinessReport } from "../../utils/businessReport";
import { planReceiptExport } from "../../utils/receiptExport";
import { getAttachmentJpegBase64 } from "./attachmentStore";

export interface ReceiptZipResult {
  /** Written archive, or null when no photo file was available locally. */
  file: ExpoFile | null;
  /** Photos decrypted into the zip. */
  included: number;
  /** Planned photos whose file isn't on this device (or was unreadable). */
  missing: number;
}

/**
 * Total photos the report references, and how many of those the plan can
 * even attempt (i.e. referenced by an in-year line). Used by the caller's
 * confirmation dialog before any decryption happens.
 */
export const countPlannedReceipts = (
  report: BusinessReport,
  entries: readonly BudgetEntry[]
): number => planReceiptExport(report, entries).length;

export const buildReceiptZip = async (
  report: BusinessReport,
  entries: readonly BudgetEntry[]
): Promise<ReceiptZipResult> => {
  const plan = planReceiptExport(report, entries);
  const zip = new JSZip();
  let included = 0;
  let missing = 0;

  for (const planned of plan) {
    const base64 = await getAttachmentJpegBase64(planned.attachmentId);
    if (base64 === null) {
      missing++;
      continue;
    }
    zip.file(planned.fileName, base64, { base64: true });
    included++;
  }

  if (included === 0) {
    return { file: null, included, missing };
  }

  // STORE, not DEFLATE: the entries are already-compressed JPEGs.
  const archiveBase64 = await zip.generateAsync({
    type: "base64",
    compression: "STORE",
  });

  // Same share-staging location as the report CSV: the iOS share sheet
  // needs the document dir; Android is happiest sharing from cache.
  const dir = Platform.OS === "ios" ? Paths.document : Paths.cache;
  const file = new ExpoFile(dir, `budgetark-receipts-${report.year}.zip`);
  file.create({ overwrite: true });
  file.write(archiveBase64, { encoding: "base64" });

  return { file, included, missing };
};

/** Best-effort cleanup of the shared archive (it holds plaintext photos). */
export const deleteReceiptZip = (file: ExpoFile): void => {
  try {
    if (file.exists) file.delete();
  } catch {
    // Cache/document cleanup is best-effort.
  }
};

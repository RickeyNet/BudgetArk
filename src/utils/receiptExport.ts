/**
 * BudgetArk - Receipt zip export planning (pure)
 * File: src/utils/receiptExport.ts
 *
 * Turns a BusinessReport + the underlying entries into the list of photos a
 * "receipts for <year>" zip should contain, with accountant-friendly file
 * names that line up with the report CSV's rows:
 *
 *   2026-04-02_Etsy-shop_84.20.jpg
 *   2026-04-02_Etsy-shop_84.20_2.jpg      (second photo on the same entry)
 *
 * Pure module (no RN/filesystem imports) so the naming/dedupe rules are
 * unit-testable; src/services/attachments/receiptZipExport.ts does the I/O.
 */

import type { BudgetEntry } from "../types";
import type { BusinessReport } from "./businessReport";

export interface PlannedReceiptFile {
  attachmentId: string;
  /** Zip-internal file name, unique within the plan, always ends in .jpg. */
  fileName: string;
}

/** Windows/zip-safe slug of a business name; never empty. */
const slugify = (name: string): string => {
  const slug = name
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 40);
  return slug || "business";
};

/**
 * Plans the zip contents for one report year.
 *
 * A recurring entry expands into one report line per month, but its photos
 * exist once - each entry contributes its photos exactly once, dated with
 * its earliest in-year occurrence (lines are sorted by date ascending).
 * Photos are planned from the entry metadata regardless of whether this
 * device holds the file; the zip builder skips missing files and reports
 * them, so the caller can tell the user what stayed on the partner device.
 */
export const planReceiptExport = (
  report: BusinessReport,
  entries: readonly BudgetEntry[]
): PlannedReceiptFile[] => {
  const entryById = new Map(entries.map((e) => [e.id, e]));
  const plan: PlannedReceiptFile[] = [];
  const usedNames = new Set<string>();
  const plannedEntryIds = new Set<string>();

  for (const group of report.perBusiness) {
    const businessSlug = slugify(group.name);
    for (const line of group.lines) {
      if (!line.hasReceipt || plannedEntryIds.has(line.entryId)) continue;
      plannedEntryIds.add(line.entryId);

      const attachments = entryById.get(line.entryId)?.attachments ?? [];
      const base = `${line.date}_${businessSlug}_${line.amount.toFixed(2)}`;
      attachments.forEach((attachment, index) => {
        // Second photo on an entry gets _2; a different entry that produces
        // the same base name (same day/business/amount) counts up further.
        let candidate = index === 0 ? base : `${base}_${index + 1}`;
        let bump = 2;
        while (usedNames.has(candidate)) {
          candidate = `${index === 0 ? base : `${base}_${index + 1}`}-${bump++}`;
        }
        usedNames.add(candidate);
        plan.push({
          attachmentId: attachment.id,
          fileName: `${candidate}.jpg`,
        });
      });
    }
  }

  return plan;
};

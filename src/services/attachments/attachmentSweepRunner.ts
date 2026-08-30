/**
 * BudgetArk - Attachment sweep runner (launch task)
 * File: src/services/attachments/attachmentSweepRunner.ts
 *
 * Runs the receipt-photo orphan sweep at most once per 24h, deferred past
 * first paint by the caller (App.tsx). Referenced ids come from live AND
 * tombstoned entries, so Undo and the 90-day sync tombstone window can
 * always restore a deleted entry's photos - only files nothing points at
 * anymore (and that are past the 48h staging age gate) get removed.
 */

import * as EncryptedStorage from "../../storage/encryptedStorage";
import { getBudgetEntriesIncludingDeleted } from "../../storage/budgetStorage";
import { sweepOrphanedAttachments } from "./attachmentStore";

const SWEEP_LAST_RUN_KEY = "@budgetark_attachment_sweep_last_run";
const SWEEP_INTERVAL_MS = 24 * 60 * 60 * 1000;

export const runAttachmentSweepIfDue = async (): Promise<void> => {
  try {
    // Own try/catch: EncryptedStorage.getItem THROWS on a corrupted value
    // (failed HMAC). Treat unreadable as "sweep is due" - the setItem below
    // then rewrites the marker; bailing to the outer catch instead would
    // disable the sweep for the life of the install.
    let lastRun = 0;
    try {
      const raw = await EncryptedStorage.getItem(SWEEP_LAST_RUN_KEY);
      lastRun = raw ? Date.parse(raw) : 0;
    } catch {
      lastRun = 0;
    }
    if (Number.isFinite(lastRun) && Date.now() - lastRun < SWEEP_INTERVAL_MS) {
      return;
    }

    const entries = await getBudgetEntriesIncludingDeleted();
    const referencedIds = new Set<string>();
    for (const entry of entries) {
      for (const attachment of entry.attachments ?? []) {
        referencedIds.add(attachment.id);
      }
    }
    await sweepOrphanedAttachments(referencedIds);
    await EncryptedStorage.setItem(SWEEP_LAST_RUN_KEY, new Date().toISOString());
  } catch (error) {
    // Never let cleanup break launch; the next cold start retries.
    if (__DEV__) console.error("Attachment sweep failed:", error);
  }
};

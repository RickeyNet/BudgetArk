/**
 * BudgetArk - Review Inbox Approved History
 * File: src/utils/inboxApprovedHistory.ts
 *
 * The Review Inbox's "Recently approved" list, the counterpart to "Recently
 * skipped": an approval used to leave the sheet for good, so a wrong
 * category or name meant closing the inbox and hunting the entry down in
 * the Budget tab (user request: change an approved item in the same
 * window).
 *
 * Deliberately derived from the budget entries themselves (an approval IS a
 * bank-sourced BudgetEntry carrying the transaction's externalTxId, created
 * at approval time) rather than a second stored list: there is nothing new
 * to persist, purge, or keep in step, an entry deleted elsewhere drops out
 * on its own, and rows approved by a rule or on the partner's phone show up
 * too. The cost: a row logged as a debt payment or added to a purchase plan
 * created no entry, so it is not listed here.
 *
 * A change is a plain field update on that entry - the same thing the
 * Budget tab's edit sheet does. The ingest ledger is untouched, so the
 * transaction is never re-offered.
 *
 * No React Native or storage imports: runs under plain Node Jest.
 */

import type { BudgetEntry, CategoryName } from "../types";
import { entryPersonIds, personAssignmentFields } from "./entryPeople";
import { sanitizeTextInput } from "./sanitize";

/** How far back "recently" reaches - the same window as Recently skipped. */
export const APPROVED_HISTORY_DAYS = 30;
/** Newest approvals kept in the list, so a big backfill can't flood it. */
export const MAX_APPROVED_HISTORY = 100;

const MAX_DESCRIPTION_LENGTH = 220;
const DAY_MS = 24 * 3600_000;

/**
 * Live entries that came out of the Review Inbox in the last
 * APPROVED_HISTORY_DAYS, newest approval first (by `createdAt`, which the
 * approval stamps), capped to MAX_APPROVED_HISTORY. An entry with an
 * unparseable `createdAt` is left out rather than guessed at.
 */
export const recentApprovedEntries = (
  entries: readonly BudgetEntry[],
  now: Date,
): BudgetEntry[] => {
  const nowMs = now.getTime();
  const cutoff = nowMs - APPROVED_HISTORY_DAYS * DAY_MS;
  return entries
    .filter((entry) => {
      if (entry.source !== "bank" || !entry.externalTxId || entry.deletedAt) return false;
      const at = Date.parse(entry.createdAt);
      return Number.isFinite(at) && at >= cutoff;
    })
    .sort((a, b) =>
      a.createdAt === b.createdAt
        ? a.id.localeCompare(b.id)
        : b.createdAt.localeCompare(a.createdAt),
    )
    .slice(0, MAX_APPROVED_HISTORY);
};

/** What the "Recently approved" editor lets the user change. */
export interface ApprovedEntryEdit {
  name: string;
  category: CategoryName;
  /** undefined = personal (no business). */
  businessId: string | undefined;
  /** Who spent it. Ignored for a deposit - its earner is not edited here. */
  personIds: readonly string[];
}

/** The editor's starting values for an entry. */
export const approvedEntryDraft = (entry: BudgetEntry): ApprovedEntryEdit => ({
  name: entry.description ?? "",
  category: entry.category,
  businessId: entry.businessId,
  personIds: entry.type === "expense" ? entryPersonIds(entry) : [],
});

const sameIds = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((id, index) => id === b[index]);

/**
 * The fields to write for an edit - only the ones that actually changed -
 * or null when nothing did (Save is then a no-op, and `updatedAt` is not
 * bumped for sync). Keys are present as `undefined` when a value is
 * cleared, so the update really clears it.
 *
 * Moving the entry to another business drops its tenant: a tenant belongs
 * to one business, and a stale id would file the rent under the wrong one.
 */
export const approvedEntryPatch = (
  entry: BudgetEntry,
  edit: ApprovedEntryEdit,
): Partial<BudgetEntry> | null => {
  const patch: Partial<BudgetEntry> = {};

  const description =
    sanitizeTextInput(edit.name).slice(0, MAX_DESCRIPTION_LENGTH).trim() || undefined;
  if (description !== (entry.description || undefined)) patch.description = description;

  if (edit.category !== entry.category) patch.category = edit.category;

  const businessId = edit.businessId || undefined;
  if (businessId !== (entry.businessId || undefined)) {
    patch.businessId = businessId;
    if (entry.tenantId) patch.tenantId = undefined;
  }

  if (entry.type === "expense") {
    const people = personAssignmentFields(edit.personIds);
    const next = entryPersonIds(people);
    if (!sameIds(next, entryPersonIds(entry))) {
      patch.personId = people.personId;
      patch.personIds = people.personIds;
    }
  }

  return Object.keys(patch).length > 0 ? patch : null;
};

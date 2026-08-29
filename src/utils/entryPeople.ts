/**
 * BudgetArk - Entry People (pure)
 * File: src/utils/entryPeople.ts
 *
 * "Who was this spending for" can be MORE than one person: a grocery run
 * is the whole family's, not one member's. `BudgetEntry.personIds` carries
 * everyone; `BudgetEntry.personId` stays as the FIRST of them so older
 * peers, backups and spreadsheet importers that only know the single field
 * still see one assignee. This module is the single reconciliation point
 * between the two - every reader goes through `entryPersonIds`, every
 * writer through `personAssignmentFields` - so the pair can never drift
 * into contradicting each other.
 *
 * No React Native or storage imports: runs under plain Node Jest.
 */

import type { BudgetEntry } from "../types";

export type EntryPeopleFields = Pick<BudgetEntry, "personId" | "personIds">;

/**
 * The people an entry is assigned to, in stored order, deduped.
 *
 * `personId` is authoritative for WHETHER the entry is assigned: an older
 * peer that only knows the single field edits it (or clears it) without
 * touching `personIds`, so a `personIds` that no longer contains `personId`
 * is stale and the single field wins. Returns [] for unassigned entries.
 */
export const entryPersonIds = (entry: EntryPeopleFields): string[] => {
  const primary = entry.personId;
  if (!primary) return [];
  const many = entry.personIds;
  if (!Array.isArray(many) || !many.includes(primary)) return [primary];
  return Array.from(new Set(many.filter((id) => typeof id === "string" && id)));
};

/**
 * The fields to write for an assignment. Both keys are always present (as
 * `undefined` when empty) so an update that clears people actually clears
 * stored values instead of leaving a stale `personIds` behind. A single
 * assignee is stored the pre-multi-person way (`personId` only) so the
 * common case never grows a second field.
 */
export const personAssignmentFields = (
  ids: readonly string[],
): { personId: string | undefined; personIds: string[] | undefined } => {
  const unique = Array.from(new Set(ids.filter((id) => typeof id === "string" && id)));
  return {
    personId: unique[0],
    personIds: unique.length > 1 ? unique : undefined,
  };
};

/**
 * Each assignee's share of an amount split evenly - a $90 grocery run for
 * three people is $30 of each person's spending, so per-person totals
 * still add up to what was actually spent. Full amount for one person; 0
 * shares for none.
 */
export const personShare = (amount: number, peopleCount: number): number =>
  peopleCount > 0 ? amount / peopleCount : 0;

/**
 * "Alex, Sam" for a badge; a dangling id (person deleted) renders as
 * `deletedLabel` so the assignment stays visible and can be cleared.
 */
export const formatPersonNames = (
  ids: readonly string[],
  nameById: ReadonlyMap<string, string>,
  deletedLabel = "(deleted)",
): string => ids.map((id) => nameById.get(id) ?? deletedLabel).join(", ");

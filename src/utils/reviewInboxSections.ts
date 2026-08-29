/**
 * BudgetArk - Review Inbox Sections
 * File: src/utils/reviewInboxSections.ts
 *
 * Groups pending bank transactions into the Review Inbox's SectionList
 * sections: one dated section per posted day (newest first), then the two
 * heuristic "Skip all" sections.
 *
 * Extracted from ReviewInboxModal's `sections` memo. The rule worth
 * pinning: an item flagged BOTH duplicate-likely and transfer-likely lands
 * in "Likely transfers" only - the duplicates bucket deliberately excludes
 * transfers, so no transaction is ever offered twice (skipping a section
 * would otherwise act on an item the user already sees elsewhere).
 */

import type { PendingTransaction } from "../types";
import { formatDayLabel } from "./dateFormat";

export interface InboxSection {
  title: string;
  data: PendingTransaction[];
  /** Show a "Skip all" action on the section header (heuristic sections). */
  bulkSkippable?: boolean;
}

export const DUPLICATES_SECTION_TITLE = "Possibly already in your budget";
export const TRANSFERS_SECTION_TITLE = "Likely transfers";

export const buildInboxSections = (
  pendingTransactions: readonly PendingTransaction[]
): InboxSection[] => {
  const regular = pendingTransactions.filter(
    (item) => !item.transferLikely && !item.duplicateLikely,
  );
  const duplicates = pendingTransactions.filter(
    (item) => item.duplicateLikely && !item.transferLikely,
  );
  const transfers = pendingTransactions.filter((item) => item.transferLikely);

  const byDay = new Map<string, PendingTransaction[]>();
  for (const item of regular) {
    const day = item.postedAt.slice(0, 10);
    const list = byDay.get(day) ?? [];
    list.push(item);
    byDay.set(day, list);
  }
  const result: InboxSection[] = Array.from(byDay.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([day, data]) => ({
      title: formatDayLabel(`${day}T12:00:00Z`, { weekday: true }),
      data,
    }));
  if (duplicates.length > 0) {
    result.push({
      title: DUPLICATES_SECTION_TITLE,
      data: duplicates,
      bulkSkippable: true,
    });
  }
  if (transfers.length > 0) {
    result.push({
      title: TRANSFERS_SECTION_TITLE,
      data: transfers,
      bulkSkippable: true,
    });
  }
  return result;
};

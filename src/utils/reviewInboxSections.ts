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
 *
 * buildInboxSectionsByMerchant is the alternative "group by vendor" view:
 * every transaction from the same merchant lands in one section (biggest
 * groups first), so a multi-month import can be triaged one vendor at a
 * time - see the modal's "By vendor" toggle and approvePendingGroup. The
 * heuristic duplicate/transfer sections are unchanged in both views.
 */

import type { CategoryName, PendingTransaction } from "../types";
import { formatDayLabel } from "./dateFormat";

export interface InboxSection {
  title: string;
  data: PendingTransaction[];
  /** Show a "Skip all" action on the section header (heuristic sections). */
  bulkSkippable?: boolean;
  /**
   * Merchant grouping only: the shared merchant key, and a flag that the
   * header may offer "Categorize all" (one category for the whole group).
   */
  groupKey?: string;
  bulkCategorizable?: boolean;
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


export const MERCHANT_NO_KEY_TITLE = "Other transactions";

/** Newest posted first; ties keep input order. */
const byDateDesc = (items: PendingTransaction[]): PendingTransaction[] =>
  [...items].sort((a, b) => b.postedAt.localeCompare(a.postedAt));

/**
 * "Group by vendor" sections: one section per merchant key, biggest groups
 * first (most bulk-review value) then alphabetical, each titled "<merchant>
 * · <count>". Transactions with no merchant key collect in a single
 * "Other transactions" section (mixed vendors - no shared rule, so not
 * bulk-categorizable). The heuristic duplicate/transfer sections follow,
 * exactly as in the by-day view, and the same one-item-one-section rule
 * holds (a duplicate+transfer item shows only under transfers).
 */
export const buildInboxSectionsByMerchant = (
  pendingTransactions: readonly PendingTransaction[]
): InboxSection[] => {
  const regular = pendingTransactions.filter(
    (item) => !item.transferLikely && !item.duplicateLikely,
  );
  const duplicates = pendingTransactions.filter(
    (item) => item.duplicateLikely && !item.transferLikely,
  );
  const transfers = pendingTransactions.filter((item) => item.transferLikely);

  const byMerchant = new Map<string, PendingTransaction[]>();
  const noMerchant: PendingTransaction[] = [];
  for (const item of regular) {
    const key = item.merchant?.trim();
    if (!key) {
      noMerchant.push(item);
      continue;
    }
    const list = byMerchant.get(key) ?? [];
    list.push(item);
    byMerchant.set(key, list);
  }

  const result: InboxSection[] = Array.from(byMerchant.entries())
    .sort(([aKey, aData], [bKey, bData]) =>
      bData.length - aData.length || aKey.localeCompare(bKey),
    )
    .map(([key, data]) => ({
      title: `${key} · ${data.length}`,
      data: byDateDesc(data),
      groupKey: key,
      bulkCategorizable: true,
    }));

  if (noMerchant.length > 0) {
    result.push({ title: MERCHANT_NO_KEY_TITLE, data: byDateDesc(noMerchant) });
  }
  if (duplicates.length > 0) {
    result.push({ title: DUPLICATES_SECTION_TITLE, data: duplicates, bulkSkippable: true });
  }
  if (transfers.length > 0) {
    result.push({ title: TRANSFERS_SECTION_TITLE, data: transfers, bulkSkippable: true });
  }
  return result;
};

/**
 * The category to pre-select when categorizing a whole merchant group: the
 * one most of its items were already suggested (from a rule), else
 * undefined so the caller falls back to its default. Ties break on the
 * first seen.
 */
export const groupDefaultCategory = (
  items: readonly PendingTransaction[]
): CategoryName | undefined => {
  const counts = new Map<CategoryName, number>();
  for (const item of items) {
    if (item.suggestedCategory) {
      counts.set(item.suggestedCategory, (counts.get(item.suggestedCategory) ?? 0) + 1);
    }
  }
  let best: CategoryName | undefined;
  let bestCount = 0;
  for (const [category, count] of counts) {
    if (count > bestCount) {
      best = category;
      bestCount = count;
    }
  }
  return best;
};

/**
 * BudgetArk - Bill Fulfillment
 * File: src/utils/billFulfillment.ts
 *
 * A recurring expense ("Electric, $120, monthly") is one stored record that
 * PROJECTS into every month of its cadence (see recurrence.ts). The real
 * charge is rarely exactly the estimate, and when it arrives - approved from
 * the bank's Review Inbox or typed in by hand - it must REPLACE that month's
 * projection, not stack on top of it. The link lives on the actual entry
 * (`BudgetEntry.fulfillsRecurringId`), so deleting the actual restores the
 * estimate with no cleanup and two paired phones never fight over one shared
 * recurring record.
 *
 * `entriesForMonth` is the single month-membership rule every consumer that
 * used to write `entries.filter(isEntryActiveInMonth)` now goes through, so
 * the Budget tab, cash flow, calendar, insights, charts and reports can never
 * disagree about whether a bill counts once or twice. Pure and unit-tested.
 */

import type { BudgetEntry, CategoryName } from "../types";
import { isEntryActiveInMonth, listOccurrenceMonths } from "./recurrence";

/** Sample size for the "your last N actuals averaged $X" estimate hint. */
export const ESTIMATE_SAMPLE_SIZE = 3;

/** Actuals needed before the estimate hint appears - one data point is noise. */
export const ESTIMATE_MIN_ACTUALS = 2;

/** "YYYY-MM" of an entry's stored date - the month it counts in. */
export const entryMonthKey = (iso: string): string => {
  if (/^\d{4}-\d{2}/.test(iso)) return iso.slice(0, 7);
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

/**
 * A recurring expense that an actual charge can stand in for. Linked
 * savings contributions are excluded on purpose: their projection credits
 * an asset account on a schedule (linkedAccountRecurring.ts), and an
 * "actual" replacing it would silently skip that credit.
 */
export const isBillCandidate = (
  entry: Pick<BudgetEntry, "recurring" | "type" | "linkedAccountId" | "deletedAt">
): boolean =>
  !!entry.recurring &&
  entry.type === "expense" &&
  !entry.linkedAccountId &&
  !entry.deletedAt;

/**
 * Whether an entry counts as the actual charge for a bill: a live one-off
 * expense carrying a bill id. A recurring entry can't fulfil another bill.
 */
export const isFulfillingEntry = (
  entry: Pick<BudgetEntry, "fulfillsRecurringId" | "recurring" | "type" | "deletedAt">
): entry is BudgetEntry & { fulfillsRecurringId: string } =>
  !!entry.fulfillsRecurringId &&
  !entry.recurring &&
  entry.type === "expense" &&
  !entry.deletedAt;

/**
 * Bill id -> the actual charges dated in `monthKey` that fulfil it. Only
 * bills that exist in `entries` AND are on their cycle that month count -
 * an actual pointing at a deleted or off-cycle bill is just an ordinary
 * entry, so the map never hides a projection that isn't there.
 */
export const fulfillmentsForMonth = (
  entries: readonly BudgetEntry[],
  monthKey: string
): Map<string, BudgetEntry[]> => {
  const billIds = new Set<string>();
  for (const entry of entries) {
    if (isBillCandidate(entry) && isEntryActiveInMonth(entry, monthKey)) {
      billIds.add(entry.id);
    }
  }
  const result = new Map<string, BudgetEntry[]>();
  if (billIds.size === 0) return result;
  for (const entry of entries) {
    if (!isFulfillingEntry(entry)) continue;
    if (!billIds.has(entry.fulfillsRecurringId)) continue;
    if (entryMonthKey(entry.date) !== monthKey) continue;
    const list = result.get(entry.fulfillsRecurringId);
    if (list) list.push(entry);
    else result.set(entry.fulfillsRecurringId, [entry]);
  }
  return result;
};

/**
 * The entries that count in `monthKey`: everything `isEntryActiveInMonth`
 * admits, minus recurring projections that an actual charge fulfils that
 * month. Order is preserved. This is THE month-membership rule - use it
 * instead of filtering on isEntryActiveInMonth directly.
 */
export const entriesForMonth = (
  entries: readonly BudgetEntry[],
  monthKey: string
): BudgetEntry[] => {
  const fulfilled = fulfillmentsForMonth(entries, monthKey);
  return entries.filter(
    (entry) =>
      isEntryActiveInMonth(entry, monthKey) &&
      !(entry.recurring && fulfilled.has(entry.id))
  );
};

/**
 * Bill id -> every month key in which some actual fulfils it. Precomputed
 * once for the multi-month report builders (business/person) that project
 * recurring rows across a whole year.
 */
export const fulfilledMonthsByBill = (
  entries: readonly BudgetEntry[]
): Map<string, Set<string>> => {
  const billById = new Map<string, BudgetEntry>();
  for (const entry of entries) {
    if (isBillCandidate(entry)) billById.set(entry.id, entry);
  }
  const result = new Map<string, Set<string>>();
  if (billById.size === 0) return result;
  for (const entry of entries) {
    if (!isFulfillingEntry(entry)) continue;
    const bill = billById.get(entry.fulfillsRecurringId);
    if (!bill) continue;
    const monthKey = entryMonthKey(entry.date);
    if (!isEntryActiveInMonth(bill, monthKey)) continue;
    const months = result.get(bill.id);
    if (months) months.add(monthKey);
    else result.set(bill.id, new Set([monthKey]));
  }
  return result;
};

/**
 * `listOccurrenceMonths` minus the months an actual charge stands in for
 * the bill. One-offs are unaffected (they have no projection to suppress).
 */
export const listUnfulfilledOccurrenceMonths = (
  entry: BudgetEntry,
  fulfilledMonths: ReadonlyMap<string, ReadonlySet<string>>,
  windowStartKey: string,
  windowEndKey: string
): string[] => {
  const months = listOccurrenceMonths(entry, windowStartKey, windowEndKey);
  if (!entry.recurring) return months;
  const skip = fulfilledMonths.get(entry.id);
  if (!skip || skip.size === 0) return months;
  return months.filter((key) => !skip.has(key));
};

export interface BillCandidateQuery {
  /** Category the actual is being filed under; same-category bills rank first. */
  category?: CategoryName;
  /** The actual's amount; closer estimates rank higher within a tier. */
  amount?: number;
  /** The actual being edited - never offered as its own bill. */
  excludeId?: string;
  /** Currently linked bill: kept in the list even if already fulfilled. */
  keepId?: string;
}

/**
 * Bills an actual dated in `monthKey` could stand in for, best guess first:
 * unfulfilled bills only (plus `keepId`), same-category before others, then
 * by how close the estimate is to `amount`, then by amount descending so the
 * order is stable when no amount is typed yet.
 */
export const rankBillCandidates = (
  entries: readonly BudgetEntry[],
  monthKey: string,
  query: BillCandidateQuery = {}
): BudgetEntry[] => {
  const fulfilled = fulfillmentsForMonth(entries, monthKey);
  const candidates = entries.filter(
    (entry) =>
      isBillCandidate(entry) &&
      entry.id !== query.excludeId &&
      isEntryActiveInMonth(entry, monthKey) &&
      (entry.id === query.keepId || !fulfilled.has(entry.id))
  );
  const amount = query.amount;
  const hasAmount = typeof amount === "number" && Number.isFinite(amount) && amount > 0;
  return candidates.sort((a, b) => {
    const aSame = query.category !== undefined && a.category === query.category ? 0 : 1;
    const bSame = query.category !== undefined && b.category === query.category ? 0 : 1;
    if (aSame !== bSame) return aSame - bSame;
    if (hasAmount) {
      const aDist = Math.abs(a.amount - amount);
      const bDist = Math.abs(b.amount - amount);
      if (aDist !== bDist) return aDist - bDist;
    }
    if (a.amount !== b.amount) return b.amount - a.amount;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
};

/** How an actual relates to the estimate it replaced, for row badges. */
export interface FulfillmentSummary {
  billId: string;
  /** The bill's description, or its category when it has none. */
  billLabel: string;
  estimate: number;
  /** actual - estimate; positive = over the estimate. */
  delta: number;
}

/**
 * Describes the bill an actual entry stands in for, or null when the entry
 * is not a fulfilment or its bill no longer exists (a dangling id is
 * harmless - the entry is then simply an ordinary expense).
 */
export const describeFulfillment = (
  entry: BudgetEntry,
  billById: ReadonlyMap<string, BudgetEntry>
): FulfillmentSummary | null => {
  if (!isFulfillingEntry(entry)) return null;
  const bill = billById.get(entry.fulfillsRecurringId);
  if (!bill || !isBillCandidate(bill)) return null;
  return {
    billId: bill.id,
    billLabel: bill.description?.trim() || bill.category,
    estimate: bill.amount,
    delta: Math.round((entry.amount - bill.amount) * 100) / 100,
  };
};

export interface EstimateSuggestion {
  /** Mean of the most recent `sampleSize` actuals, rounded to cents. */
  average: number;
  /** How many actuals went into the average (<= sampleSize). */
  count: number;
  /** Month keys of the sampled actuals, newest first. */
  months: string[];
}

/**
 * "Your last 3 actuals averaged $131" - the one-tap "Update estimate" hint
 * on a recurring bill. Null until `ESTIMATE_MIN_ACTUALS` actuals exist, and
 * null when the average already equals the estimate (nothing to update).
 * Nothing is ever changed automatically: the bill's amount is the user's
 * plan and only moves when they tap.
 */
export const suggestEstimateFromActuals = (
  bill: BudgetEntry,
  entries: readonly BudgetEntry[],
  sampleSize: number = ESTIMATE_SAMPLE_SIZE
): EstimateSuggestion | null => {
  if (!isBillCandidate(bill)) return null;
  const actuals = entries
    .filter(
      (entry) =>
        isFulfillingEntry(entry) &&
        entry.fulfillsRecurringId === bill.id &&
        Number.isFinite(entry.amount) &&
        entry.amount > 0
    )
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, Math.max(1, sampleSize));
  if (actuals.length < ESTIMATE_MIN_ACTUALS) return null;
  const total = actuals.reduce((sum, entry) => sum + entry.amount, 0);
  const average = Math.round((total / actuals.length) * 100) / 100;
  if (Math.abs(average - bill.amount) < 0.005) return null;
  return {
    average,
    count: actuals.length,
    months: actuals.map((entry) => entryMonthKey(entry.date)),
  };
};

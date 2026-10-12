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
 * Income works the same way with one twist. A recurring income entry is an
 * EARNER's monthly estimate ("Maria, est. $4,000/mo, paid every 2 weeks").
 * Each deposit filed against it is one paycheck, and a month usually has
 * several, so the first deposit must not collapse the estimate to itself:
 * the projection shrinks by the share of paychecks still expected
 * (`payFrequency`, see `expectedPaychecksInMonth`) and disappears once they
 * have all landed. Mid-month the budget shows "received so far + estimate
 * for the rest"; at the end it shows what was actually deposited.
 *
 * `entriesForMonth` is the single month-membership rule every consumer that
 * used to write `entries.filter(isEntryActiveInMonth)` now goes through, so
 * the Budget tab, cash flow, calendar, insights, charts and reports can never
 * disagree about whether a bill counts once or twice. Pure and unit-tested.
 */

import type {
  BudgetEntry,
  BudgetEntryType,
  CategoryName,
  PayFrequency,
} from "../types";
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
 * A recurring entry an actual can stand in for: a bill (expense) or an
 * earner's recurring income. Linked savings contributions are excluded on
 * purpose: their projection credits an asset account on a schedule
 * (linkedAccountRecurring.ts), and an "actual" replacing it would silently
 * skip that credit.
 */
export const isBillCandidate = (
  entry: Pick<BudgetEntry, "recurring" | "type" | "linkedAccountId" | "deletedAt">
): boolean =>
  !!entry.recurring &&
  (entry.type === "expense" || entry.type === "income") &&
  !entry.linkedAccountId &&
  !entry.deletedAt;

/**
 * Whether an entry counts as an actual for a recurring one: a live one-off
 * carrying a recurring id. A recurring entry can't fulfil another. The
 * type match against the recurring entry is checked where the two meet
 * (`fulfillmentsForMonth` etc.) - an expense never fulfils income.
 */
export const isFulfillingEntry = (
  entry: Pick<BudgetEntry, "fulfillsRecurringId" | "recurring" | "type" | "deletedAt">
): entry is BudgetEntry & { fulfillsRecurringId: string } =>
  !!entry.fulfillsRecurringId &&
  !entry.recurring &&
  (entry.type === "expense" || entry.type === "income") &&
  !entry.deletedAt;

/* ─── Paychecks per month ─── */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Interval in days for the anchored frequencies; null for day-of-month ones. */
const intervalDays = (frequency: PayFrequency): number | null =>
  frequency === "weekly" ? 7 : frequency === "biweekly" ? 14 : null;

/** Days from the epoch to a calendar day, DST-proof via UTC. */
const epochDay = (year: number, monthIndex: number, day: number): number =>
  Math.round(Date.UTC(year, monthIndex, day) / DAY_MS);

/**
 * The entry's date as a calendar day (its own digits, not the viewer's
 * clock): a stored "YYYY-MM-DD..." keeps its digits; anything else goes
 * through Date.
 */
const anchorEpochDay = (iso: string): number | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (match) {
    return epochDay(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return epochDay(d.getFullYear(), d.getMonth(), d.getDate());
};

/**
 * How many paychecks an earner expects in `monthKey`: 1 for monthly (or no
 * frequency), 2 for semimonthly, and for weekly / biweekly the number of
 * paydays that fall in the month when the schedule is anchored on the
 * entry's own date - so a biweekly earner sees 2 most months and 3 in the
 * two months a year that hold three paydays. Always at least 1.
 */
export const expectedPaychecksInMonth = (
  entry: Pick<BudgetEntry, "date" | "payFrequency">,
  monthKey: string
): number => {
  const frequency = entry.payFrequency;
  if (!frequency || frequency === "monthly") return 1;
  if (frequency === "semimonthly") return 2;
  const step = intervalDays(frequency);
  const anchor = anchorEpochDay(entry.date);
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (step === null || anchor === null || !match) return 2;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const first = epochDay(year, monthIndex, 1);
  const last = epochDay(year, monthIndex + 1, 0);
  // First payday on or after the 1st, stepping from the anchor in either
  // direction, then count the ones that fit before the month ends.
  const offset = (((first - anchor) % step) + step) % step;
  const firstPayday = offset === 0 ? first : first + (step - offset);
  if (firstPayday > last) return 1;
  return Math.max(1, Math.floor((last - firstPayday) / step) + 1);
};

/* ─── Month membership ─── */

/**
 * Recurring id -> the actuals dated in `monthKey` that fulfil it. Only
 * recurring entries that exist in `entries`, are on their cycle that month
 * AND share the actual's type count - an actual pointing at a deleted,
 * off-cycle or opposite-direction record is just an ordinary entry, so the
 * map never hides a projection that isn't there.
 */
export const fulfillmentsForMonth = (
  entries: readonly BudgetEntry[],
  monthKey: string
): Map<string, BudgetEntry[]> => {
  const billById = new Map<string, BudgetEntry>();
  for (const entry of entries) {
    if (isBillCandidate(entry) && isEntryActiveInMonth(entry, monthKey)) {
      billById.set(entry.id, entry);
    }
  }
  const result = new Map<string, BudgetEntry[]>();
  if (billById.size === 0) return result;
  for (const entry of entries) {
    if (!isFulfillingEntry(entry)) continue;
    const bill = billById.get(entry.fulfillsRecurringId);
    if (!bill || bill.type !== entry.type) continue;
    if (entryMonthKey(entry.date) !== monthKey) continue;
    const list = result.get(entry.fulfillsRecurringId);
    if (list) list.push(entry);
    else result.set(entry.fulfillsRecurringId, [entry]);
  }
  return result;
};

const roundCents = (value: number): number => Math.round(value * 100) / 100;

/**
 * What a recurring entry contributes to `monthKey` given the actuals filed
 * against it: itself when nothing is filed, null when the actuals cover
 * it, or - income only - a copy carrying the estimate for the paychecks
 * still expected. One of two paychecks in: half the estimate remains. The
 * copy keeps the entry's id so rows still open the real record for editing
 * (callers that persist must never write an entriesForMonth result back).
 */
export const projectRecurringForMonth = (
  entry: BudgetEntry,
  actuals: readonly BudgetEntry[] | undefined,
  monthKey: string
): BudgetEntry | null => {
  if (!actuals || actuals.length === 0) return entry;
  if (entry.type !== "income") return null;
  const expected = expectedPaychecksInMonth(entry, monthKey);
  const remaining = expected - actuals.length;
  if (remaining <= 0) return null;
  return { ...entry, amount: roundCents((entry.amount * remaining) / expected) };
};

/**
 * The entries that count in `monthKey`: everything `isEntryActiveInMonth`
 * admits, minus recurring projections that actuals fulfil that month (a
 * partly-received income estimate counts at its remaining share - see
 * projectRecurringForMonth). Order is preserved. This is THE
 * month-membership rule - use it instead of filtering on
 * isEntryActiveInMonth directly.
 */
export const entriesForMonth = (
  entries: readonly BudgetEntry[],
  monthKey: string
): BudgetEntry[] => {
  const fulfilled = fulfillmentsForMonth(entries, monthKey);
  const result: BudgetEntry[] = [];
  for (const entry of entries) {
    if (!isEntryActiveInMonth(entry, monthKey)) continue;
    if (entry.recurring && fulfilled.has(entry.id)) {
      const projected = projectRecurringForMonth(entry, fulfilled.get(entry.id), monthKey);
      if (projected) result.push(projected);
      continue;
    }
    result.push(entry);
  }
  return result;
};

/** Progress of an earner's month, for the recurring income row's tag. */
export interface IncomeProjection {
  /** Paychecks the frequency says this month holds. */
  expected: number;
  /** Deposits filed against the entry so far this month. */
  received: number;
  /** Sum of those deposits. */
  receivedTotal: number;
  /** Estimate still counted for the paychecks yet to land (0 once all are in). */
  remainingEstimate: number;
}

/**
 * How far along a recurring income entry is in `monthKey`, or null when it
 * is not an income candidate active that month. `received` is 0 with the
 * full estimate remaining until the first deposit is filed.
 */
export const describeIncomeProjection = (
  entry: BudgetEntry,
  entries: readonly BudgetEntry[],
  monthKey: string
): IncomeProjection | null => {
  if (entry.type !== "income" || !isBillCandidate(entry)) return null;
  if (!isEntryActiveInMonth(entry, monthKey)) return null;
  const actuals = fulfillmentsForMonth(entries, monthKey).get(entry.id) ?? [];
  const expected = expectedPaychecksInMonth(entry, monthKey);
  const projected = projectRecurringForMonth(entry, actuals, monthKey);
  return {
    expected,
    received: actuals.length,
    receivedTotal: roundCents(actuals.reduce((sum, actual) => sum + actual.amount, 0)),
    remainingEstimate: projected ? projected.amount : 0,
  };
};

/**
 * Recurring id -> every month key in which some actual fulfils it (same
 * type only). Precomputed once for the multi-month report builders
 * (business/person) that project recurring rows across a whole year. A
 * month counts as fulfilled from the first actual - the reports are
 * expense-only, where one actual IS the month.
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
    if (!bill || bill.type !== entry.type) continue;
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
  /**
   * Direction of the actual: "expense" (default) lists bills, "income"
   * lists earners' recurring income. An actual only ever fulfils its own
   * kind.
   */
  type?: BudgetEntryType;
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
 * Recurring entries an actual dated in `monthKey` could stand in for, best
 * guess first. Bills: unfulfilled ones only (plus `keepId`), same-category
 * before others, then by how close the estimate is to `amount`, then by
 * amount descending so the order is stable when no amount is typed yet.
 * Income: every earner active that month stays on offer even once their
 * expected paychecks are in - a third biweekly deposit, or a bonus, still
 * belongs to someone - ranked by how close one paycheck's share of the
 * estimate is to `amount`.
 */
export const rankBillCandidates = (
  entries: readonly BudgetEntry[],
  monthKey: string,
  query: BillCandidateQuery = {}
): BudgetEntry[] => {
  const type: BudgetEntryType = query.type ?? "expense";
  const fulfilled = fulfillmentsForMonth(entries, monthKey);
  const candidates = entries.filter(
    (entry) =>
      isBillCandidate(entry) &&
      entry.type === type &&
      entry.id !== query.excludeId &&
      isEntryActiveInMonth(entry, monthKey) &&
      (type === "income" || entry.id === query.keepId || !fulfilled.has(entry.id))
  );
  const amount = query.amount;
  const hasAmount = typeof amount === "number" && Number.isFinite(amount) && amount > 0;
  const comparable = (entry: BudgetEntry): number =>
    type === "income"
      ? entry.amount / expectedPaychecksInMonth(entry, monthKey)
      : entry.amount;
  return candidates.sort((a, b) => {
    const aSame = query.category !== undefined && a.category === query.category ? 0 : 1;
    const bSame = query.category !== undefined && b.category === query.category ? 0 : 1;
    if (aSame !== bSame) return aSame - bSame;
    if (hasAmount) {
      const aDist = Math.abs(comparable(a) - amount);
      const bDist = Math.abs(comparable(b) - amount);
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
  /** The recurring entry's direction (income actuals are paychecks). */
  type: BudgetEntryType;
  /** The recurring entry's earner (income) or assignee, when it has one. */
  personId?: string;
  estimate: number;
  /** actual - estimate; positive = over the estimate. */
  delta: number;
}

/**
 * Describes the recurring entry an actual stands in for, or null when the
 * entry is not a fulfilment, its record no longer exists, or the two
 * disagree on direction (a dangling id is harmless - the entry is then
 * simply an ordinary one).
 */
export const describeFulfillment = (
  entry: BudgetEntry,
  billById: ReadonlyMap<string, BudgetEntry>
): FulfillmentSummary | null => {
  if (!isFulfillingEntry(entry)) return null;
  const bill = billById.get(entry.fulfillsRecurringId);
  if (!bill || !isBillCandidate(bill) || bill.type !== entry.type) return null;
  return {
    billId: bill.id,
    billLabel: bill.description?.trim() || bill.category,
    type: bill.type,
    personId: bill.personId,
    estimate: bill.amount,
    delta: roundCents(entry.amount - bill.amount),
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
 * For an earner's income the samples are whole MONTHS - the paychecks
 * filed in each month that received all the paychecks it expected, summed
 * - because the estimate is a monthly figure and one deposit is not.
 * Nothing is ever changed automatically: the recurring amount is the
 * user's plan and only moves when they tap.
 */
export const suggestEstimateFromActuals = (
  bill: BudgetEntry,
  entries: readonly BudgetEntry[],
  sampleSize: number = ESTIMATE_SAMPLE_SIZE
): EstimateSuggestion | null => {
  if (!isBillCandidate(bill)) return null;
  const actuals = entries.filter(
    (entry) =>
      isFulfillingEntry(entry) &&
      entry.fulfillsRecurringId === bill.id &&
      entry.type === bill.type &&
      Number.isFinite(entry.amount) &&
      entry.amount > 0
  );
  let samples: { month: string; amount: number }[];
  if (bill.type === "income") {
    const byMonth = new Map<string, number[]>();
    for (const actual of actuals) {
      const month = entryMonthKey(actual.date);
      if (!isEntryActiveInMonth(bill, month)) continue;
      const list = byMonth.get(month) ?? [];
      list.push(actual.amount);
      byMonth.set(month, list);
    }
    samples = [];
    for (const [month, amounts] of byMonth) {
      if (amounts.length < expectedPaychecksInMonth(bill, month)) continue;
      samples.push({ month, amount: amounts.reduce((sum, value) => sum + value, 0) });
    }
    samples.sort((a, b) => (a.month < b.month ? 1 : a.month > b.month ? -1 : 0));
  } else {
    samples = actuals
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
      .map((entry) => ({ month: entryMonthKey(entry.date), amount: entry.amount }));
  }
  samples = samples.slice(0, Math.max(1, sampleSize));
  if (samples.length < ESTIMATE_MIN_ACTUALS) return null;
  const total = samples.reduce((sum, sample) => sum + sample.amount, 0);
  const average = roundCents(total / samples.length);
  if (Math.abs(average - bill.amount) < 0.005) return null;
  return {
    average,
    count: samples.length,
    months: samples.map((sample) => sample.month),
  };
};

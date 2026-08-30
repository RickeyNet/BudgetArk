import { BudgetEntry } from "../types";
import { isEntryActiveInMonth } from "./recurrence";
import { fulfillmentsForMonth, isFulfillingEntry } from "./billFulfillment";

export interface BillsByDay {
  /** Day-of-month (1-31) → entries that hit on that day for this month. */
  byDay: Map<number, BudgetEntry[]>;
  /** Sum across the whole month. */
  monthTotal: number;
}

export interface NextBillInfo {
  entry: BudgetEntry;
  date: Date;
  daysUntil: number;
}

export interface UpcomingBillInfo {
  entry: BudgetEntry;
  date: Date;
  daysUntil: number;
}

const lastDayOfMonth = (year: number, monthIndex: number): number =>
  new Date(year, monthIndex + 1, 0).getDate();

/**
 * Day-of-month an entry lands on for the given calendar month, clamped to that
 * month's actual length. A bill set to the 31st falls back to the last day
 * in shorter months (Feb 28/29, Apr 30, etc.) - mirrors the
 * `spreadsheetExport.lastDayOfMonth` clamp the projection logic already uses.
 */
export const getDayOfMonth = (
  entry: Pick<BudgetEntry, "date">,
  monthKey: string
): number => {
  const stored = new Date(entry.date).getDate();
  const day = Number.isFinite(stored) && stored >= 1 && stored <= 31 ? stored : 15;
  const [yStr, mStr] = monthKey.split("-");
  const last = lastDayOfMonth(Number(yStr), Number(mStr) - 1);
  return Math.min(day, last);
};

/**
 * Groups recurring (and optionally one-off) expense entries by the day they
 * land on in the given month. Non-active entries (a quarterly bill not on its
 * cycle this month, a one-off from a different month) are filtered out via
 * `isEntryActiveInMonth`.
 *
 * A bill whose actual charge landed this month (utils/billFulfillment) is
 * represented by that actual - on the day it really posted, at the real
 * amount - and its projection is dropped. `includeFulfilled: false` omits
 * the actual too, for callers asking "what is still coming" (the reminder
 * banner, "next bill") rather than "what did this month look like".
 */
export const groupBillsByDay = (
  entries: BudgetEntry[],
  monthKey: string,
  options: {
    includeOneOff?: boolean;
    includeIncome?: boolean;
    includeFulfilled?: boolean;
  } = {}
): BillsByDay => {
  const {
    includeOneOff = false,
    includeIncome = false,
    includeFulfilled = true,
  } = options;
  const byDay = new Map<number, BudgetEntry[]>();
  let monthTotal = 0;

  const fulfilled = fulfillmentsForMonth(entries, monthKey);
  const standInIds = new Set<string>();
  for (const actuals of fulfilled.values()) {
    for (const actual of actuals) standInIds.add(actual.id);
  }

  for (const entry of entries) {
    if (!includeIncome && entry.type !== "expense") continue;
    // The projection is replaced by its actual this month.
    if (entry.recurring && fulfilled.has(entry.id)) continue;
    if (standInIds.has(entry.id)) {
      if (!includeFulfilled) continue;
    } else if (!includeOneOff && !entry.recurring) {
      continue;
    }
    if (!isEntryActiveInMonth(entry, monthKey)) continue;

    const day = getDayOfMonth(entry, monthKey);
    const existing = byDay.get(day);
    if (existing) existing.push(entry);
    else byDay.set(day, [entry]);
    monthTotal += entry.amount;
  }

  return { byDay, monthTotal };
};

/**
 * The next bill to land on or after `fromDate`. Walks forward up to 12 months
 * so quarterly / semiannual / yearly entries surface even when the current
 * month has nothing left. Returns `null` when no bills exist in the window.
 */
export const nextBillFrom = (
  entries: BudgetEntry[],
  fromDate: Date = new Date()
): NextBillInfo | null => {
  const fromYear = fromDate.getFullYear();
  const fromMonth = fromDate.getMonth();
  const fromDay = fromDate.getDate();

  for (let offset = 0; offset < 12; offset++) {
    const cursorYear = fromYear + Math.floor((fromMonth + offset) / 12);
    const cursorMonth = (fromMonth + offset + 12) % 12;
    const monthKey = `${cursorYear}-${String(cursorMonth + 1).padStart(2, "0")}`;
    // A bill already covered by its actual charge isn't "next" - skip it.
    const { byDay } = groupBillsByDay(entries, monthKey, { includeFulfilled: false });
    if (byDay.size === 0) continue;

    const sortedDays = Array.from(byDay.keys()).sort((a, b) => a - b);
    for (const day of sortedDays) {
      if (offset === 0 && day < fromDay) continue;
      const list = byDay.get(day);
      if (!list || list.length === 0) continue;
      const date = new Date(cursorYear, cursorMonth, day);
      const daysUntil = Math.round(
        (date.getTime() - new Date(fromYear, fromMonth, fromDay).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      // Pick the largest bill on that day as the "headline" - matches what
      // most users mean by "next bill" when several stack on the same day.
      const headline = list.reduce((max, e) => (e.amount > max.amount ? e : max), list[0]);
      return { entry: headline, date, daysUntil };
    }
  }

  return null;
};

/**
 * Every recurring bill scheduled from `fromDate` through `daysAhead` days
 * later, inclusive. Used by the in-app reminder banner to surface the next
 * few due dates without implying the app knows whether the bill was actually
 * paid yet.
 */
export const upcomingBillsWithin = (
  entries: BudgetEntry[],
  daysAhead: number,
  fromDate: Date = new Date()
): UpcomingBillInfo[] => {
  if (daysAhead < 0) return [];

  const start = new Date(
    fromDate.getFullYear(),
    fromDate.getMonth(),
    fromDate.getDate()
  );
  const billsByMonth = new Map<string, BillsByDay>();
  const upcoming: UpcomingBillInfo[] = [];

  for (let offset = 0; offset <= daysAhead; offset++) {
    const cursor = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + offset
    );
    const monthKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    const day = cursor.getDate();
    const monthBills =
      billsByMonth.get(monthKey) ??
      // Fulfilled bills are paid - the banner must not nag about them.
      groupBillsByDay(entries, monthKey, { includeFulfilled: false });
    billsByMonth.set(monthKey, monthBills);
    const dayEntries = monthBills.byDay.get(day) ?? [];

    for (const entry of dayEntries) {
      upcoming.push({
        entry,
        date: new Date(cursor.getFullYear(), cursor.getMonth(), day),
        daysUntil: offset,
      });
    }
  }

  return upcoming.sort((a, b) => {
    if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil;
    return b.entry.amount - a.entry.amount;
  });
};

/**
 * Sum of bills already due (day ≤ today) and remaining (day > today) for the
 * given month, useful for the calendar's top stats strip. When the requested
 * month isn't the current calendar month, "paid" covers everything (past
 * month) or nothing (future month). An actual charge standing in for a bill
 * (BudgetEntry.fulfillsRecurringId) is paid by definition, whatever its day.
 */
export const splitPaidVsRemaining = (
  bills: BillsByDay,
  monthKey: string,
  now: Date = new Date()
): { paid: number; remaining: number } => {
  const nowKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  if (monthKey < nowKey) return { paid: bills.monthTotal, remaining: 0 };
  if (monthKey > nowKey) return { paid: 0, remaining: bills.monthTotal };

  const today = now.getDate();
  let paid = 0;
  let remaining = 0;
  for (const [day, list] of bills.byDay) {
    for (const e of list) {
      if (day <= today || isFulfillingEntry(e)) paid += e.amount;
      else remaining += e.amount;
    }
  }
  return { paid, remaining };
};

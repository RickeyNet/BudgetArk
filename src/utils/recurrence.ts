import {
  BudgetEntry,
  DEFAULT_RECURRENCE_INTERVAL,
  RECURRENCE_INTERVAL_OPTIONS,
  RecurrenceInterval,
} from "../types";

const VALID_INTERVALS = new Set<number>(
  RECURRENCE_INTERVAL_OPTIONS.map((o) => o.value)
);

/**
 * Returns the recurrence interval (months) for an entry. Pre-existing
 * recurring entries written before `recurrenceInterval` existed are treated
 * as monthly so their cadence doesn't silently change after upgrade.
 */
export const getRecurrenceInterval = (
  entry: Pick<BudgetEntry, "recurring" | "recurrenceInterval">
): RecurrenceInterval => {
  if (!entry.recurring) return DEFAULT_RECURRENCE_INTERVAL;
  const raw = entry.recurrenceInterval;
  if (raw && VALID_INTERVALS.has(raw)) return raw as RecurrenceInterval;
  return DEFAULT_RECURRENCE_INTERVAL;
};

/** Short tag (e.g. "Monthly", "Quarterly", "6 mo", "Yearly") for an entry. */
export const getRecurrenceTag = (
  entry: Pick<BudgetEntry, "recurring" | "recurrenceInterval">
): string => {
  if (!entry.recurring) return "";
  const interval = getRecurrenceInterval(entry);
  const opt = RECURRENCE_INTERVAL_OPTIONS.find((o) => o.value === interval);
  return opt?.tag ?? "Monthly";
};

const monthKeyFromISO = (iso: string): string => {
  if (/^\d{4}-\d{2}/.test(iso)) return iso.slice(0, 7);
  const d = new Date(iso);
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${d.getUTCFullYear()}-${m}`;
};

const monthsBetween = (fromKey: string, toKey: string): number => {
  const [fy, fm] = fromKey.split("-").map(Number);
  const [ty, tm] = toKey.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
};

/**
 * Whether an entry should appear in the given month, accounting for
 * recurrence interval. A non-recurring entry appears only in its own month.
 * A recurring entry appears in its start month and every `interval` months
 * after.
 */
export const isEntryActiveInMonth = (
  entry: Pick<BudgetEntry, "date" | "recurring" | "recurrenceInterval">,
  monthKey: string
): boolean => {
  const entryMonth = monthKeyFromISO(entry.date);
  if (!entry.recurring) return entryMonth === monthKey;
  if (entryMonth > monthKey) return false;
  const interval = getRecurrenceInterval(entry);
  const diff = monthsBetween(entryMonth, monthKey);
  return diff >= 0 && diff % interval === 0;
};

/**
 * Counts the recurring occurrences strictly between (lastApplied, currentMonth].
 * Used by the linked-account catch-up loop to know how many cycles to credit.
 */
export const countOccurrencesBetween = (
  entry: Pick<BudgetEntry, "date" | "recurring" | "recurrenceInterval">,
  lastAppliedKey: string,
  currentMonthKey: string
): number => {
  if (!entry.recurring) return 0;
  const entryMonth = monthKeyFromISO(entry.date);
  const interval = getRecurrenceInterval(entry);
  const startOffset = monthsBetween(entryMonth, lastAppliedKey);
  const endOffset = monthsBetween(entryMonth, currentMonthKey);
  if (endOffset < 0) return 0;
  const firstK = Math.max(0, Math.floor(startOffset / interval) + 1);
  const lastK = Math.floor(endOffset / interval);
  return Math.max(0, lastK - firstK + 1);
};

/**
 * Lists every month key (YYYY-MM) the entry appears in, bounded by the
 * given window. Used by the spreadsheet exporter to project recurring rows.
 */
export const listOccurrenceMonths = (
  entry: Pick<BudgetEntry, "date" | "recurring" | "recurrenceInterval">,
  windowStartKey: string,
  windowEndKey: string
): string[] => {
  const entryMonth = monthKeyFromISO(entry.date);
  if (!entry.recurring) {
    return entryMonth >= windowStartKey && entryMonth <= windowEndKey
      ? [entryMonth]
      : [];
  }
  const interval = getRecurrenceInterval(entry);
  const months: string[] = [];
  let [y, m] = entryMonth.split("-").map(Number);
  while (true) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    if (key > windowEndKey) break;
    if (key >= windowStartKey) months.push(key);
    m += interval;
    while (m > 12) {
      m -= 12;
      y += 1;
    }
  }
  return months;
};

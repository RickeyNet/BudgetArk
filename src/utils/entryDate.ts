// BudgetArk - Entry Date Helpers
//
// Single home for building and reading budget-entry dates. These used to be
// duplicated in AddBudgetEntryModal and EditBudgetEntryModal, and the copies
// drifted: the UTC-noon fix (see buildEntryDateISO) landed only in Add, so
// re-saving an entry in Edit could shift it into the previous month for
// UTC+13/+14 users. Both modals import from here now so the next date fix
// lands everywhere at once.

export const DEFAULT_RECURRENCE_DAY = 15;

/**
 * "YYYY-MM" of the given instant in the DEVICE's local calendar - the month
 * the user would say it is. Pair with `buildEntryDateISO` (and the local
 * `getDate()`) when stamping "today" on an auto-created entry; never use
 * `toISOString().slice(0, 7)`, which is the UTC month and files an evening
 * entry near a month boundary into the wrong month.
 */
export const localYearMonth = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

/** Number of days in the given "YYYY-MM" month. */
export const lastDayOfYearMonth = (yearMonth: string): number => {
  const [yStr, mStr] = yearMonth.split("-");
  return new Date(Number(yStr), Number(mStr), 0).getDate();
};

/**
 * Builds the canonical stored ISO date for an entry in the given month/day.
 *
 * Noon UTC, not local noon converted to UTC: for UTC+13/+14 locales local
 * noon serializes as the previous UTC day, so a day-1 entry lands in the
 * prior month and its recurrence fires a month early forever. Month
 * attribution everywhere slices the YYYY-MM prefix, so the stored string
 * must carry the month the user picked.
 */
export const buildEntryDateISO = (yearMonth: string, day: number): string => {
  const clamped = Math.max(1, Math.min(day, lastDayOfYearMonth(yearMonth)));
  const dd = String(clamped).padStart(2, "0");
  return `${yearMonth}-${dd}T12:00:00.000Z`;
};

/**
 * Day-of-month an entry was stored with. Reads the YYYY-MM-DD prefix
 * directly when present (the canonical write path above always produces
 * one), so the day the user picked survives regardless of device timezone.
 * Falls back to UTC calendar parts for non-prefixed dates - local getDate()
 * would shift the day by one in extreme offsets, changing the recurrence
 * day on every edit.
 */
export const dayOfMonthFromIso = (iso: string): number => {
  const prefixed = /^\d{4}-\d{2}-(\d{2})/.exec(iso);
  const day = prefixed ? Number(prefixed[1]) : new Date(iso).getUTCDate();
  return Number.isFinite(day) && day >= 1 && day <= 31
    ? day
    : DEFAULT_RECURRENCE_DAY;
};

/** Column headers for a Sunday-first month grid (see buildMonthDayGrid). */
export const WEEKDAY_SHORT_LABELS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

/**
 * Calendar layout for a "YYYY-MM" month: the days 1..N laid out Sunday
 * first, with `null` for the blank cells before the 1st and after the last
 * day, so the array is always a whole number of 7-cell weeks. One layout
 * rule for every month grid in the app (the entry form's day picker, the
 * Bill Calendar) so they can't disagree on which column a date sits in.
 * Weekday of the 1st comes from the local calendar - the same calendar the
 * user's phone shows.
 */
export const buildMonthDayGrid = (yearMonth: string): (number | null)[] => {
  const [yStr, mStr] = yearMonth.split("-");
  const firstWeekday = new Date(Number(yStr), Number(mStr) - 1, 1).getDay();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  const days = lastDayOfYearMonth(yearMonth);
  for (let day = 1; day <= days; day++) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

/** `buildMonthDayGrid` sliced into rows of seven, for row-based layouts. */
export const buildMonthDayRows = (yearMonth: string): (number | null)[][] => {
  const cells = buildMonthDayGrid(yearMonth);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
};

// BudgetArk - Entry Date Helpers
//
// Single home for building and reading budget-entry dates. These used to be
// duplicated in AddBudgetEntryModal and EditBudgetEntryModal, and the copies
// drifted: the UTC-noon fix (see buildEntryDateISO) landed only in Add, so
// re-saving an entry in Edit could shift it into the previous month for
// UTC+13/+14 users. Both modals import from here now so the next date fix
// lands everywhere at once.

export const DEFAULT_RECURRENCE_DAY = 15;

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

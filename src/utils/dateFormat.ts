// BudgetArk - Date Display Formatters
//
// Shared, display-only date formatting. MONTH_LABELS + formatYearMonthLabel
// used to be declared verbatim in three modals (Add/Edit budget entry,
// AddDebt) and formatDayLabel twice more - per-file copies of locale
// behavior are exactly how one screen ends up wording a date differently
// from the next. Parsing/anchoring helpers live elsewhere (entryDate.ts);
// this module only turns already-valid values into strings.

/** Short month names for pickers and YYYY-MM labels. */
export const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** "2026-07" -> "Jul 2026". Pure string math - no Date round-trip. */
export const formatYearMonthLabel = (yearMonth: string): string => {
  const [yearStr, monthStr] = yearMonth.split("-");
  const monthIndex = Number(monthStr) - 1;
  const monthLabel = MONTH_LABELS[monthIndex] || "Jan";
  return `${monthLabel} ${yearStr}`;
};

/**
 * Locale short day label ("Jul 16", or "Wed, Jul 16" with `weekday`).
 * Unparseable input renders as "Unknown date" instead of the locale's
 * "Invalid Date".
 */
export const formatDayLabel = (
  iso: string,
  options: { weekday?: boolean } = {}
): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleDateString(undefined, {
    ...(options.weekday ? { weekday: "short" as const } : {}),
    month: "short",
    day: "numeric",
  });
};

// BudgetArk - Date Display Formatters
//
// Shared, display-only date formatting. MONTH_LABELS + formatYearMonthLabel
// used to be declared verbatim in three modals (Add/Edit budget entry,
// AddDebt) and formatDayLabel twice more - per-file copies of locale
// behavior are exactly how one screen ends up wording a date differently
// from the next. Parsing/anchoring helpers live elsewhere (entryDate.ts);
// this module only turns already-valid values into strings. Month and
// day names follow the active app language (src/i18n/translate.ts).

import { currentLanguage, t } from "../i18n/translate";

/** English short month names - the fallback when the year is not numeric. */
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

/**
 * "2026-07" -> "Jul 2026" in the active app language. An out-of-range month
 * reads as January (matches the old string-math behaviour); a non-numeric
 * year falls back to the English short label.
 */
export const formatYearMonthLabel = (yearMonth: string): string => {
  const [yearStr, monthStr] = yearMonth.split("-");
  const rawIndex = Number(monthStr) - 1;
  const monthIndex = rawIndex >= 0 && rawIndex < 12 ? rawIndex : 0;
  const year = Number(yearStr);
  if (Number.isInteger(year)) {
    return new Date(year, monthIndex, 1).toLocaleDateString(currentLanguage(), {
      month: "short",
      year: "numeric",
    });
  }
  return `${MONTH_LABELS[monthIndex]} ${yearStr}`;
};

/**
 * Locale short day label ("Jul 16", or "Wed, Jul 16" with `weekday`).
 * Unparseable input renders as "Unknown date" (translated) instead of the
 * locale's "Invalid Date".
 */
export const formatDayLabel = (
  iso: string,
  options: { weekday?: boolean } = {}
): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return t("helpers.misc.dates.unknownDate");
  return date.toLocaleDateString(currentLanguage(), {
    ...(options.weekday ? { weekday: "short" as const } : {}),
    month: "short",
    day: "numeric",
  });
};

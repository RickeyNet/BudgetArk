/**
 * BudgetArk - English strings: shared date pickers
 * File: src/i18n/locales/en/datePicker.ts
 *
 * Covers: MonthYearPicker.tsx (used by the Add Debt sheet and the entry form).
 * Month names are keyed so the grid translates without touching the
 * "YYYY-MM" values it emits.
 */

export const datePicker = {
  closeA11y: "Close month picker",
  yearCaption: "YEAR",
  months: {
    jan: "Jan",
    feb: "Feb",
    mar: "Mar",
    apr: "Apr",
    may: "May",
    jun: "Jun",
    jul: "Jul",
    aug: "Aug",
    sep: "Sep",
    oct: "Oct",
    nov: "Nov",
    dec: "Dec",
  },
  selected: "Selected: {{month}} {{year}}",
  tapToSet: "Tap a month to set your goal",
} as const;

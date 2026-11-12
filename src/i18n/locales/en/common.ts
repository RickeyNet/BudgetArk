/**
 * BudgetArk - English strings: shared vocabulary
 * File: src/i18n/locales/en/common.ts
 *
 * Buttons and words reused across many screens (Done, Cancel, Save, On/Off).
 * Anything screen-specific belongs in that screen's fragment, not here -
 * "common" is for strings whose translation must stay identical everywhere.
 */

export const common = {
  done: "Done",
  cancel: "Cancel",
  save: "Save",
  delete: "Delete",
  ok: "OK",
  close: "Close",
  on: "On",
  off: "Off",
  yes: "Yes",
  no: "No",
  back: "Back",
  next: "Next",
  skip: "Skip",
  edit: "Edit",
  add: "Add",
  remove: "Remove",
  continue: "Continue",
  confirm: "Confirm",
  learnMore: "Learn more",
  gotIt: "Got it",
  /** Row chevron read out by screen readers. */
  opens: "Opens",
  /** Placeholder for a missing or unparseable timestamp. */
  unknown: "Unknown",
  /** Undo toast button (UndoProvider) - shouted like the debts card. */
  undo: "UNDO",
  undoLastAction: "Undo last action",
  /** Undo toast's ✕ (UndoProvider), read out by screen readers. */
  dismiss: "Dismiss",
  /** App.tsx - the saved user record couldn't be read at launch. */
  startupError: {
    title: "Couldn't load your data",
    body:
      "BudgetArk couldn't read its saved data on this device. This can happen when the phone is very low on free storage. Your data has not been changed - freeing up space usually fixes it.",
    retry: "Try Again",
  },
  /** components/LoadErrorBanner - a tab whose storage read failed. */
  loadError: {
    message:
      "Couldn't read your data from this phone. Nothing has been deleted, but what's shown here may be missing or out of date.",
    retry: "Try again",
  },
  /** Sunday-first short weekday names for every calendar grid (MonthDayCalendar). */
  weekdays: {
    sun: "Sun",
    mon: "Mon",
    tue: "Tue",
    wed: "Wed",
    thu: "Thu",
    fri: "Fri",
    sat: "Sat",
  },
} as const;

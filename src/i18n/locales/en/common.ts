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
} as const;

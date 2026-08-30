/**
 * BudgetArk - Budget Month Keys
 * File: src/utils/budgetMonths.ts
 *
 * The one definition of the app's "YYYY-MM" month key and the helpers
 * built on it. Nine private copies of getMonthKey used to exist (Budget
 * screen, budget storage, insights, charts, planners, countdown, due
 * calendar) - identical today, but a single drift (local vs UTC) would
 * have split the ledger from its limits. Everything here is LOCAL time:
 * a budget month is the month on the user's wall clock.
 *
 * Deliberately NOT used by utils/linkedAccountRecurring, which keys on UTC
 * on purpose (see its header) - that one stays separate.
 */

/** Local "YYYY-MM" for a date (default: now). */
export const getMonthKey = (date: Date = new Date()): string => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
};

/** Month key `offset` months from `fromDate` (negative = past). Day-safe: anchors on the 1st. */
export const getMonthKeyOffset = (offset: number, fromDate: Date = new Date()): string => {
  const cursor = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
  cursor.setMonth(cursor.getMonth() + offset);
  return getMonthKey(cursor);
};

/**
 * Months the Budget tab lets the user navigate: next month (forecast) +
 * current + a full trailing year of history. Matches the 13-month
 * limit-history retention in budgetStorage so every navigable month still
 * has its saved limits.
 */
export const BUDGET_HISTORY_MONTHS = 12;

/** Next month first, then current, then BUDGET_HISTORY_MONTHS back. */
export const getBudgetMonthKeys = (now: Date = new Date()): string[] => {
  const keys = [getMonthKeyOffset(1, now)];
  for (let offset = 0; offset >= -BUDGET_HISTORY_MONTHS; offset--) {
    keys.push(getMonthKeyOffset(offset, now));
  }
  return keys;
};

/** Local midnight on the 1st of the month - the anchor for month labels/pickers. */
export const getMonthDateFromKey = (monthKey: string): Date =>
  new Date(`${monthKey}-01T00:00:00`);

/** "March 2026" in the device locale. */
export const formatMonthKeyLabel = (monthKey: string): string =>
  getMonthDateFromKey(monthKey).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

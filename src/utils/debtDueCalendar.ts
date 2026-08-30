import type { Debt, Payment } from "../types";
import { getMonthKey } from "./budgetMonths";

export const DEFAULT_DEBT_PAYMENT_DUE_DAY = 15;

export interface UpcomingDebtDue {
  debt: Debt;
  date: Date;
  daysUntil: number;
  amount: number;
}

const lastDayOfMonth = (year: number, monthIndex: number): number =>
  new Date(year, monthIndex + 1, 0).getDate();

export const getEffectivePaymentDueDay = (debt: Debt): number => {
  const day = debt.paymentDueDay;
  if (typeof day === "number" && day >= 1 && day <= 31) {
    return Math.floor(day);
  }
  return DEFAULT_DEBT_PAYMENT_DUE_DAY;
};

export const clampDueDayToMonth = (
  year: number,
  monthIndex: number,
  day: number
): number => Math.min(Math.max(1, day), lastDayOfMonth(year, monthIndex));

export const dismissalKey = (debtId: string, monthKey: string): string =>
  `${debtId}:${monthKey}`;

/**
 * Month bucket for a recorded payment date. Full ISO timestamps (what
 * `recordPayment` stamps) bucket by the LOCAL calendar month the payment was
 * made in - a UTC prefix match would attribute an evening payment on the
 * last day of the month to the NEXT month for users west of UTC. Date-only
 * strings keep their stored YYYY-MM prefix (parsing them as UTC midnight
 * would shift day-1 dates into the prior local month). Shared by the
 * reminder math and the Budget screen so both attribute a payment to the
 * same month.
 */
export const paymentMonthKey = (dateISO: string): string =>
  dateISO.includes("T") ? getMonthKey(new Date(dateISO)) : dateISO.slice(0, 7);

export const hasPaymentInMonth = (
  debtId: string,
  payments: readonly Payment[],
  monthKey: string
): boolean =>
  payments.some(
    (p) => p.debtId === debtId && paymentMonthKey(p.date) === monthKey
  );

const isDebtDueOnDate = (
  debt: Debt,
  cursor: Date,
  fromStart: Date
): boolean => {
  if (debt.balance <= 0) return false;
  const dueDay = getEffectivePaymentDueDay(debt);
  const clamped = clampDueDayToMonth(
    cursor.getFullYear(),
    cursor.getMonth(),
    dueDay
  );
  if (cursor.getDate() !== clamped) return false;
  const daysUntil = Math.round(
    (cursor.getTime() - fromStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  return daysUntil >= 0;
};

/**
 * Active debts with a minimum due in the next `daysAhead` days (inclusive).
 * Skips debts already paid this calendar month.
 */
export const upcomingDebtDuesWithin = (
  debts: readonly Debt[],
  payments: readonly Payment[],
  daysAhead: number,
  dismissed: Readonly<Record<string, string>> = {},
  fromDate: Date = new Date()
): UpcomingDebtDue[] => {
  if (daysAhead < 0) return [];

  const start = new Date(
    fromDate.getFullYear(),
    fromDate.getMonth(),
    fromDate.getDate()
  );
  const active = debts.filter((d) => d.balance > 0);
  const upcoming: UpcomingDebtDue[] = [];

  for (let offset = 0; offset <= daysAhead; offset++) {
    const cursor = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + offset
    );
    const cursorMonthKey = getMonthKey(cursor);

    for (const debt of active) {
      if (!isDebtDueOnDate(debt, cursor, start)) continue;
      if (hasPaymentInMonth(debt.id, payments, cursorMonthKey)) continue;
      if (dismissed[dismissalKey(debt.id, cursorMonthKey)]) continue;

      upcoming.push({
        debt,
        date: new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()),
        daysUntil: offset,
        amount: debt.minPayment,
      });
    }
  }

  return upcoming.sort((a, b) => {
    if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil;
    return b.amount - a.amount;
  });
};

/**
 * Active debts whose minimum is due **on or before today** in the current
 * calendar month, still unpaid this month and not dismissed.
 *
 * Unlike `debtsDueTodayNeedingPrompt` (which fires only on the exact due day),
 * this also surfaces a payment whose due day has already passed this month - so
 * a reminder keeps showing once it's overdue instead of vanishing the day
 * after the due date. The due day is clamped to the month first, so a "due day
 * 31" debt counts as due once the month's last day arrives. Sorted
 * most-overdue first, then by larger minimum.
 */
export const debtsDueOrOverdueNeedingPrompt = (
  debts: readonly Debt[],
  payments: readonly Payment[],
  dismissed: Readonly<Record<string, string>> = {},
  fromDate: Date = new Date()
): Debt[] => {
  const start = new Date(
    fromDate.getFullYear(),
    fromDate.getMonth(),
    fromDate.getDate()
  );
  const monthKey = getMonthKey(start);
  const today = start.getDate();
  const matched: { debt: Debt; dueDay: number }[] = [];
  const seen = new Set<string>();

  for (const debt of debts) {
    if (debt.balance <= 0) continue;
    if (seen.has(debt.id)) continue;
    const dueDay = clampDueDayToMonth(
      start.getFullYear(),
      start.getMonth(),
      getEffectivePaymentDueDay(debt)
    );
    if (dueDay > today) continue; // not due yet this month
    if (hasPaymentInMonth(debt.id, payments, monthKey)) continue;
    if (dismissed[dismissalKey(debt.id, monthKey)]) continue;
    seen.add(debt.id);
    matched.push({ debt, dueDay });
  }

  return matched
    .sort((a, b) => {
      if (a.dueDay !== b.dueDay) return a.dueDay - b.dueDay; // most overdue first
      return b.debt.minPayment - a.debt.minPayment;
    })
    .map((m) => m.debt);
};

/** Debts due today with no payment logged this month and not dismissed. */
export const debtsDueTodayNeedingPrompt = (
  debts: readonly Debt[],
  payments: readonly Payment[],
  dismissed: Readonly<Record<string, string>> = {},
  fromDate: Date = new Date()
): Debt[] => {
  const today = upcomingDebtDuesWithin(
    debts,
    payments,
    0,
    dismissed,
    fromDate
  ).filter((item) => item.daysUntil === 0);
  const seen = new Set<string>();
  const result: Debt[] = [];
  for (const item of today) {
    if (seen.has(item.debt.id)) continue;
    seen.add(item.debt.id);
    result.push(item.debt);
  }
  return result;
};

import type { Debt, Payment } from "../types";

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

export const getMonthKey = (date: Date = new Date()): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};

export const dismissalKey = (debtId: string, monthKey: string): string =>
  `${debtId}:${monthKey}`;

export const hasPaymentInMonth = (
  debtId: string,
  payments: readonly Payment[],
  monthKey: string
): boolean =>
  // Bucket the payment by its LOCAL calendar month, like every other piece
  // of the reminder math. `p.date` is a UTC ISO timestamp - a prefix match
  // against the local-derived monthKey attributes an evening payment on the
  // last day of the month to the NEXT month for users west of UTC (keeping
  // the reminder firing today and silently suppressing next month's).
  payments.some(
    (p) => p.debtId === debtId && getMonthKey(new Date(p.date)) === monthKey
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
  const monthKey = getMonthKey(start);
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

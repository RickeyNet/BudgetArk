/**
 * BudgetArk - Paycheck Cycle
 * File: src/utils/paycheckCycle.ts
 *
 * Pure logic behind the Budget tab's "Until payday" card: the user's pay
 * schedule (weekly / biweekly anchored on a known payday, semimonthly or
 * monthly on fixed days of the month), the pay period today falls in, what
 * is still due before the next check (unpaid recurring bills + unpaid debt
 * minimums, from the same calendars the reminder banners use), and a
 * safe-to-spend figure until then. Safe-to-spend needs the month-start
 * checking balance (utils/cashFlow) as its anchor: cash now is that
 * balance plus what the ledger says has already landed this month, and
 * the period's bills come off it. Without a recorded balance the card
 * still shows the due list - it just can't say what is left.
 *
 * The schedule is a device-local viewing preference (see
 * storage/paycheckCycleStorage) - a partner phone sees the same budget and
 * sets its own paydays.
 */

import type { BudgetEntry, Debt, Payment } from "../types";
import { getDayOfMonth, upcomingBillsWithin } from "./billCalendar";
import { paymentMonthKey, upcomingDebtDuesWithin } from "./debtDueCalendar";
import { entriesForMonth } from "./billFulfillment";
import { getMonthKey } from "./budgetMonths";
import { roundToCents } from "./money";

export type PayFrequency = "weekly" | "biweekly" | "semimonthly" | "monthly";

export const PAY_FREQUENCIES: readonly PayFrequency[] = [
  "weekly",
  "biweekly",
  "semimonthly",
  "monthly",
];

export const PAY_FREQUENCY_LABELS: Record<PayFrequency, string> = {
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  semimonthly: "Twice a month",
  monthly: "Monthly",
};

/** Day-of-month value meaning "the last day of the month". */
export const LAST_DAY = 31;

export const SEMIMONTHLY_PRESETS = [
  { id: "1-15", label: "1st & 15th", days: [1, 15] },
  { id: "15-last", label: "15th & last day", days: [15, LAST_DAY] },
] as const;

export type PaycheckCycleSettings = {
  frequency: PayFrequency;
  /** Weekly / biweekly: any known payday, local "YYYY-MM-DD". */
  anchorDate?: string;
  /** Semimonthly / monthly: days of the month (LAST_DAY = last day), ascending. */
  payDays?: number[];
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const isFrequency = (value: unknown): value is PayFrequency =>
  typeof value === "string" && (PAY_FREQUENCIES as readonly string[]).includes(value);

/** Local date for a "YYYY-MM-DD" string; null when malformed or impossible. */
export const parseLocalDate = (value: string): Date | null => {
  if (!DATE_RE.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return null;
  }
  return date;
};

/** Local "YYYY-MM-DD" for a date. */
export const toLocalDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

/**
 * Fail-closed parse of the stored schedule: anything that isn't a complete,
 * self-consistent record reads as "not set up" rather than a guess.
 */
export const parsePaycheckCycleSettings = (raw: string | null): PaycheckCycleSettings | null => {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
  const record = parsed as Record<string, unknown>;
  if (!isFrequency(record.frequency)) return null;

  if (record.frequency === "weekly" || record.frequency === "biweekly") {
    if (typeof record.anchorDate !== "string" || !parseLocalDate(record.anchorDate)) return null;
    return { frequency: record.frequency, anchorDate: record.anchorDate };
  }

  if (!Array.isArray(record.payDays)) return null;
  const days = record.payDays.filter(
    (day): day is number =>
      typeof day === "number" && Number.isInteger(day) && day >= 1 && day <= LAST_DAY
  );
  const unique = Array.from(new Set(days)).sort((a, b) => a - b);
  const expected = record.frequency === "monthly" ? 1 : 2;
  if (unique.length !== expected) return null;
  return { frequency: record.frequency, payDays: unique };
};

const startOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date: Date, days: number): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const daysBetween = (from: Date, to: Date): number =>
  Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / MS_PER_DAY);

const lastDayOfMonth = (year: number, monthIndex: number): number =>
  new Date(year, monthIndex + 1, 0).getDate();

/**
 * Every payday from `from` through `to` (inclusive), ascending. Weekly and
 * biweekly step from the anchor in both directions; fixed-day schedules
 * clamp each day into the month (LAST_DAY -> the month's last day).
 */
export const listPaydays = (settings: PaycheckCycleSettings, from: Date, to: Date): Date[] => {
  const start = startOfDay(from);
  const end = startOfDay(to);
  if (end.getTime() < start.getTime()) return [];
  const out: Date[] = [];

  if (settings.frequency === "weekly" || settings.frequency === "biweekly") {
    const anchor = settings.anchorDate ? parseLocalDate(settings.anchorDate) : null;
    if (!anchor) return [];
    const step = settings.frequency === "weekly" ? 7 : 14;
    // Rewind to the first payday at or before `start`, then walk forward.
    const behind = daysBetween(anchor, start);
    const firstOffset = Math.floor(behind / step) * step;
    for (let cursor = addDays(anchor, firstOffset); cursor.getTime() <= end.getTime(); cursor = addDays(cursor, step)) {
      if (cursor.getTime() >= start.getTime()) out.push(cursor);
    }
    return out;
  }

  const days = settings.payDays ?? [];
  if (days.length === 0) return [];
  let y = start.getFullYear();
  let m = start.getMonth();
  while (new Date(y, m, 1).getTime() <= end.getTime()) {
    const last = lastDayOfMonth(y, m);
    for (const day of days) {
      const date = new Date(y, m, Math.min(day, last));
      if (date.getTime() >= start.getTime() && date.getTime() <= end.getTime()) out.push(date);
    }
    if (m === 11) {
      y += 1;
      m = 0;
    } else {
      m += 1;
    }
  }
  return out.sort((a, b) => a.getTime() - b.getTime());
};

export type PayPeriod = {
  /** The payday that opened this period (today, if today is a payday). */
  start: Date;
  /** The next payday - the first day of the next period. */
  nextPayday: Date;
  /** Whole days from today until the next payday (>= 1). */
  daysUntilNext: number;
  /** Total length of this period in days. */
  lengthDays: number;
};

/** The pay period `now` falls in, or null when the schedule can't produce one. */
export const currentPayPeriod = (
  settings: PaycheckCycleSettings,
  now: Date = new Date()
): PayPeriod | null => {
  const today = startOfDay(now);
  // A monthly schedule can leave 62 days between paydays across a clamp;
  // 100 days each way covers every frequency with room to spare.
  const paydays = listPaydays(settings, addDays(today, -100), addDays(today, 100));
  let start: Date | null = null;
  let nextPayday: Date | null = null;
  for (const payday of paydays) {
    if (payday.getTime() <= today.getTime()) start = payday;
    else if (!nextPayday) nextPayday = payday;
  }
  if (!start || !nextPayday) return null;
  return {
    start,
    nextPayday,
    daysUntilNext: daysBetween(today, nextPayday),
    lengthDays: daysBetween(start, nextPayday),
  };
};

export type DueItem = {
  id: string;
  label: string;
  amount: number;
  date: Date;
  daysUntil: number;
  kind: "bill" | "debt";
};

export type PaycheckPeriodView = {
  period: PayPeriod;
  /** Unpaid bills and debt minimums landing before the next payday, soonest first. */
  due: DueItem[];
  dueTotal: number;
  /** Month-start balance + what the ledger says has landed so far; null without a balance. */
  cashNow: number | null;
  /** cashNow - dueTotal; null without a balance. */
  safeToSpend: number | null;
  /** safeToSpend spread over the days until payday; null without a balance. */
  perDay: number | null;
};

/**
 * Income and expenses already landed this month per the ledger: every entry
 * in the month (recurring projections, fulfilled bills as their actual)
 * whose day is today or earlier, plus debt payments logged this month.
 */
export const ledgerSoFarThisMonth = (
  entries: readonly BudgetEntry[],
  debts: readonly Debt[],
  payments: readonly Payment[],
  now: Date
): { income: number; expenses: number; debtPaid: number } => {
  const monthKey = getMonthKey(now);
  const today = now.getDate();
  let income = 0;
  let expenses = 0;
  for (const entry of entriesForMonth(entries, monthKey)) {
    if (getDayOfMonth(entry, monthKey) > today) continue;
    if (!Number.isFinite(entry.amount)) continue;
    if (entry.type === "income") income += entry.amount;
    else if (entry.type === "expense") expenses += entry.amount;
  }
  const liveDebtIds = new Set(debts.map((d) => d.id));
  let debtPaid = 0;
  for (const payment of payments) {
    if (payment.deletedAt || !liveDebtIds.has(payment.debtId)) continue;
    if (paymentMonthKey(payment.date) !== monthKey) continue;
    if (Number.isFinite(payment.amount)) debtPaid += payment.amount;
  }
  return {
    income: roundToCents(income),
    expenses: roundToCents(expenses),
    debtPaid: roundToCents(debtPaid),
  };
};

/**
 * The card's model. `startingBalance` is the current month's recorded
 * month-start checking balance (null when the user hasn't set one).
 */
export const buildPaycheckPeriodView = (input: {
  settings: PaycheckCycleSettings;
  entries: readonly BudgetEntry[];
  debts: readonly Debt[];
  payments: readonly Payment[];
  startingBalance: number | null;
  now?: Date;
}): PaycheckPeriodView | null => {
  const now = input.now ?? new Date();
  const period = currentPayPeriod(input.settings, now);
  if (!period) return null;

  const daysAhead = period.daysUntilNext - 1;
  const bills = upcomingBillsWithin([...input.entries], daysAhead, now).map<DueItem>((item) => ({
    id: `bill:${item.entry.id}`,
    label: item.entry.description?.trim() || item.entry.category,
    amount: item.entry.amount,
    date: item.date,
    daysUntil: item.daysUntil,
    kind: "bill",
  }));
  const debtDues = upcomingDebtDuesWithin(input.debts, input.payments, daysAhead, {}, now).map<DueItem>(
    (item) => ({
      id: `debt:${item.debt.id}:${toLocalDateKey(item.date)}`,
      label: item.debt.name,
      amount: item.amount,
      date: item.date,
      daysUntil: item.daysUntil,
      kind: "debt",
    })
  );
  const due = [...bills, ...debtDues].sort(
    (a, b) => a.daysUntil - b.daysUntil || b.amount - a.amount
  );
  const dueTotal = roundToCents(due.reduce((sum, item) => sum + item.amount, 0));

  if (input.startingBalance === null || !Number.isFinite(input.startingBalance)) {
    return { period, due, dueTotal, cashNow: null, safeToSpend: null, perDay: null };
  }

  const soFar = ledgerSoFarThisMonth(input.entries, input.debts, input.payments, now);
  const cashNow = roundToCents(
    input.startingBalance + soFar.income - soFar.expenses - soFar.debtPaid
  );
  const safeToSpend = roundToCents(cashNow - dueTotal);
  return {
    period,
    due,
    dueTotal,
    cashNow,
    safeToSpend,
    perDay: roundToCents(safeToSpend / Math.max(1, period.daysUntilNext)),
  };
};

/** "Fri, Sep 18" style label for a payday. */
export const formatPaydayLabel = (date: Date): string =>
  date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

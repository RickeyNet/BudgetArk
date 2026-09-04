import {
  DEFAULT_DEBT_PAYMENT_DUE_DAY,
  getEffectivePaymentDueDay,
  clampDueDayToMonth,
  dismissalKey,
  hasPaymentInMonth,
  upcomingDebtDuesWithin,
  overdueDebtDuesThisMonth,
  debtsDueTodayNeedingPrompt,
  debtsDueOrOverdueNeedingPrompt,
} from "../debtDueCalendar";
import { getMonthKey } from "../budgetMonths";
import { makeDebt, makePayment } from "../../__tests__/fixtures";
import type { Debt, Payment } from "../../types";

const debt = (over: Partial<Debt> = {}): Debt =>
  makeDebt({ id: "d1", name: "Visa", balance: 1000, minPayment: 50, ...over });

// Payments are bucketed by LOCAL month; noon-UTC timestamps stay in the same
// calendar month regardless of the test runner's timezone.
const payment = (over: Partial<Payment> = {}): Payment =>
  makePayment({
    id: "p1",
    debtId: "d1",
    amount: 50,
    date: "2026-06-15T12:00:00.000Z",
    ...over,
  });

describe("getEffectivePaymentDueDay", () => {
  it("returns the stored due day when valid", () => {
    expect(getEffectivePaymentDueDay(debt({ paymentDueDay: 5 }))).toBe(5);
    expect(getEffectivePaymentDueDay(debt({ paymentDueDay: 31 }))).toBe(31);
  });

  it("floors a fractional day", () => {
    expect(getEffectivePaymentDueDay(debt({ paymentDueDay: 12.9 }))).toBe(12);
  });

  it("falls back to the default for missing or out-of-range values", () => {
    expect(getEffectivePaymentDueDay(debt({}))).toBe(DEFAULT_DEBT_PAYMENT_DUE_DAY);
    expect(getEffectivePaymentDueDay(debt({ paymentDueDay: 0 }))).toBe(DEFAULT_DEBT_PAYMENT_DUE_DAY);
    expect(getEffectivePaymentDueDay(debt({ paymentDueDay: 32 }))).toBe(DEFAULT_DEBT_PAYMENT_DUE_DAY);
    // Deliberately malformed input (e.g. from an untyped import/sync payload) -
    // the runtime guard must fall back, so the cast is the point of the test.
    expect(
      getEffectivePaymentDueDay(debt({ paymentDueDay: "15" as unknown as number }))
    ).toBe(DEFAULT_DEBT_PAYMENT_DUE_DAY);
  });
});

describe("clampDueDayToMonth", () => {
  it("leaves a valid day untouched", () => {
    expect(clampDueDayToMonth(2026, 0, 15)).toBe(15); // Jan
  });

  it("clamps day 31 to the last day of a short month", () => {
    expect(clampDueDayToMonth(2026, 1, 31)).toBe(28); // Feb 2026 (non-leap)
    expect(clampDueDayToMonth(2026, 3, 31)).toBe(30); // April (30 days)
  });

  it("respects leap-year February", () => {
    expect(clampDueDayToMonth(2024, 1, 31)).toBe(29); // Feb 2024 (leap)
  });

  it("clamps below 1 up to 1", () => {
    expect(clampDueDayToMonth(2026, 0, 0)).toBe(1);
    expect(clampDueDayToMonth(2026, 0, -5)).toBe(1);
  });
});

describe("getMonthKey", () => {
  it("formats a local date as zero-padded YYYY-MM", () => {
    expect(getMonthKey(new Date(2026, 0, 5))).toBe("2026-01");
    expect(getMonthKey(new Date(2026, 11, 31))).toBe("2026-12");
  });
});

describe("dismissalKey", () => {
  it("joins debt id and month key", () => {
    expect(dismissalKey("d1", "2026-06")).toBe("d1:2026-06");
  });
});

describe("hasPaymentInMonth", () => {
  const payments = [
    payment({ id: "p1", debtId: "d1", date: "2026-06-15T12:00:00.000Z" }),
    payment({ id: "p2", debtId: "d2", date: "2026-06-20T12:00:00.000Z" }),
  ];

  it("is true when the debt has a payment in that month", () => {
    expect(hasPaymentInMonth("d1", payments, "2026-06")).toBe(true);
  });

  it("is false for a different month", () => {
    expect(hasPaymentInMonth("d1", payments, "2026-07")).toBe(false);
  });

  it("ignores payments belonging to other debts", () => {
    expect(hasPaymentInMonth("d3", payments, "2026-06")).toBe(false);
  });
});

describe("overdueDebtDuesThisMonth", () => {
  // Wednesday 10 June 2026.
  const today = new Date(2026, 5, 10);

  it("lists unpaid minimums whose day this month has passed, most overdue first", () => {
    const debts = [
      debt({ id: "early", name: "Early", paymentDueDay: 3, minPayment: 40 }),
      debt({ id: "later", name: "Later", paymentDueDay: 8, minPayment: 90 }),
      debt({ id: "today", name: "Today", paymentDueDay: 10 }),
      debt({ id: "ahead", name: "Ahead", paymentDueDay: 20 }),
      debt({ id: "paid", name: "Paid", paymentDueDay: 2 }),
      debt({ id: "clear", name: "Clear", paymentDueDay: 2, balance: 0 }),
    ];
    const payments = [payment({ id: "pp", debtId: "paid", date: "2026-06-02T12:00:00.000Z" })];
    const rows = overdueDebtDuesThisMonth(debts, payments, today);
    expect(rows.map((r) => `${r.debt.id}:${r.daysUntil}:${r.amount}`)).toEqual(["early:-7:40", "later:-2:90"]);
    expect(rows[0].date.getDate()).toBe(3);
    // Due today or later belongs to upcomingDebtDuesWithin, never here.
    expect(rows.some((r) => r.debt.id === "today" || r.debt.id === "ahead")).toBe(false);
  });

  it("clamps a due day the month doesn't have and pays no attention to last month's payment", () => {
    const lastMonth = [payment({ id: "old", debtId: "d1", date: "2026-05-31T12:00:00.000Z" })];
    const rows = overdueDebtDuesThisMonth([debt({ paymentDueDay: 31 })], lastMonth, new Date(2026, 1, 28));
    // Feb 2026 has 28 days: due day 31 clamps to the 28th, which is today, not overdue.
    expect(rows).toEqual([]);
    expect(overdueDebtDuesThisMonth([debt({ paymentDueDay: 1 })], lastMonth, today)).toHaveLength(1);
  });
});

describe("upcomingDebtDuesWithin", () => {
  // Fixed reference point: 10 June 2026 (June has 30 days).
  const from = () => new Date(2026, 5, 10);

  it("returns [] for a negative window", () => {
    expect(upcomingDebtDuesWithin([debt({ paymentDueDay: 10 })], [], -1, {}, from())).toEqual([]);
  });

  it("includes a debt due today with daysUntil 0", () => {
    const result = upcomingDebtDuesWithin([debt({ paymentDueDay: 10 })], [], 7, {}, from());
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ daysUntil: 0, amount: 50 });
    expect(result[0].debt.id).toBe("d1");
  });

  it("includes a future due date only within the window", () => {
    const debts = [debt({ paymentDueDay: 15 })]; // due 15 June = 5 days out
    expect(upcomingDebtDuesWithin(debts, [], 7, {}, from())).toHaveLength(1);
    expect(upcomingDebtDuesWithin(debts, [], 3, {}, from())).toHaveLength(0);
  });

  it("clamps an end-of-month due day to the month's last day", () => {
    // dueDay 31 in June -> 30 June, which is 20 days from 10 June.
    const result = upcomingDebtDuesWithin([debt({ paymentDueDay: 31 })], [], 25, {}, from());
    expect(result).toHaveLength(1);
    expect(result[0].daysUntil).toBe(20);
  });

  it("excludes paid-off (zero balance) debts", () => {
    const debts = [debt({ paymentDueDay: 10, balance: 0 })];
    expect(upcomingDebtDuesWithin(debts, [], 7, {}, from())).toHaveLength(0);
  });

  it("skips a debt already paid this month", () => {
    const debts = [debt({ id: "d1", paymentDueDay: 10 })];
    const payments = [payment({ debtId: "d1", date: "2026-06-05T12:00:00.000Z" })];
    expect(upcomingDebtDuesWithin(debts, payments, 7, {}, from())).toHaveLength(0);
  });

  it("skips a dismissed debt for that month", () => {
    const debts = [debt({ id: "d1", paymentDueDay: 10 })];
    const dismissed = { [dismissalKey("d1", "2026-06")]: "2026-06-10T00:00:00.000Z" };
    expect(upcomingDebtDuesWithin(debts, [], 7, dismissed, from())).toHaveLength(0);
  });

  it("sorts by soonest first, then by larger amount", () => {
    const debts = [
      debt({ id: "small-today", paymentDueDay: 10, minPayment: 50 }),
      debt({ id: "big-today", paymentDueDay: 10, minPayment: 100 }),
      debt({ id: "later", paymentDueDay: 15, minPayment: 999 }),
    ];
    const result = upcomingDebtDuesWithin(debts, [], 7, {}, from());
    expect(result.map((r) => r.debt.id)).toEqual(["big-today", "small-today", "later"]);
  });

  it("handles a due date that rolls into the next month", () => {
    const start = new Date(2026, 5, 28); // 28 June
    // dueDay 1 -> 1 July, 3 days out; uses July's month key for paid/dismiss.
    const result = upcomingDebtDuesWithin([debt({ paymentDueDay: 1 })], [], 7, {}, start);
    expect(result).toHaveLength(1);
    expect(result[0].daysUntil).toBe(3);
    expect(getMonthKey(result[0].date)).toBe("2026-07");
  });
});

describe("debtsDueTodayNeedingPrompt", () => {
  const from = () => new Date(2026, 5, 10);

  it("returns debts due today that are unpaid and not dismissed", () => {
    const debts = [
      debt({ id: "due", paymentDueDay: 10 }),
      debt({ id: "notdue", paymentDueDay: 20 }),
    ];
    const result = debtsDueTodayNeedingPrompt(debts, [], {}, from());
    expect(result.map((d) => d.id)).toEqual(["due"]);
  });

  it("excludes a debt already paid this month", () => {
    const debts = [debt({ id: "due", paymentDueDay: 10 })];
    const payments = [payment({ debtId: "due", date: "2026-06-02T12:00:00.000Z" })];
    expect(debtsDueTodayNeedingPrompt(debts, payments, {}, from())).toEqual([]);
  });

  it("excludes a dismissed debt", () => {
    const debts = [debt({ id: "due", paymentDueDay: 10 })];
    const dismissed = { [dismissalKey("due", "2026-06")]: "x" };
    expect(debtsDueTodayNeedingPrompt(debts, [], dismissed, from())).toEqual([]);
  });

  it("returns the debt objects themselves", () => {
    const d = debt({ id: "due", paymentDueDay: 10, name: "Car Loan" });
    const result = debtsDueTodayNeedingPrompt([d], [], {}, from());
    expect(result[0]).toBe(d);
  });
});

describe("debtsDueOrOverdueNeedingPrompt", () => {
  const from = () => new Date(2026, 5, 10); // 10 June 2026

  it("includes a debt due today", () => {
    const result = debtsDueOrOverdueNeedingPrompt(
      [debt({ id: "today", paymentDueDay: 10 })],
      [],
      {},
      from()
    );
    expect(result.map((d) => d.id)).toEqual(["today"]);
  });

  it("includes a debt whose due day already passed this month", () => {
    // The key difference from debtsDueTodayNeedingPrompt: due day 5 < today 10.
    const result = debtsDueOrOverdueNeedingPrompt(
      [debt({ id: "overdue", paymentDueDay: 5 })],
      [],
      {},
      from()
    );
    expect(result.map((d) => d.id)).toEqual(["overdue"]);
  });

  it("excludes a debt not yet due later this month", () => {
    expect(
      debtsDueOrOverdueNeedingPrompt(
        [debt({ id: "future", paymentDueDay: 20 })],
        [],
        {},
        from()
      )
    ).toEqual([]);
  });

  it("excludes a debt already paid this month", () => {
    const debts = [debt({ id: "overdue", paymentDueDay: 5 })];
    const payments = [payment({ debtId: "overdue", date: "2026-06-06T12:00:00.000Z" })];
    expect(debtsDueOrOverdueNeedingPrompt(debts, payments, {}, from())).toEqual([]);
  });

  it("excludes a dismissed debt", () => {
    const debts = [debt({ id: "overdue", paymentDueDay: 5 })];
    const dismissed = { [dismissalKey("overdue", "2026-06")]: "x" };
    expect(debtsDueOrOverdueNeedingPrompt(debts, [], dismissed, from())).toEqual([]);
  });

  it("excludes paid-off (zero balance) debts", () => {
    const debts = [debt({ id: "overdue", paymentDueDay: 5, balance: 0 })];
    expect(debtsDueOrOverdueNeedingPrompt(debts, [], {}, from())).toEqual([]);
  });

  it("lists the most overdue first, then by larger minimum", () => {
    const debts = [
      debt({ id: "due-today", paymentDueDay: 10, minPayment: 999 }),
      debt({ id: "small-overdue", paymentDueDay: 3, minPayment: 25 }),
      debt({ id: "big-overdue", paymentDueDay: 3, minPayment: 200 }),
    ];
    const result = debtsDueOrOverdueNeedingPrompt(debts, [], {}, from());
    expect(result.map((d) => d.id)).toEqual([
      "big-overdue",
      "small-overdue",
      "due-today",
    ]);
  });
});

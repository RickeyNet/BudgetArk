/**
 * BudgetArk - Paycheck Cycle Tests
 * File: src/utils/__tests__/paycheckCycle.test.ts
 *
 * Schedule parse (fail-closed), payday listing for every frequency, the
 * current period, the due-before-payday list, and the safe-to-spend math.
 */

import { makeBudgetEntry, makeDebt, makePayment } from "../../__tests__/fixtures";
import {
  buildPaycheckPeriodView,
  currentPayPeriod,
  LAST_DAY,
  ledgerSoFarThisMonth,
  listPaydays,
  parseLocalDate,
  parsePaycheckCycleSettings,
  toLocalDateKey,
} from "../paycheckCycle";

const keys = (dates: Date[]) => dates.map(toLocalDateKey);

describe("parsePaycheckCycleSettings", () => {
  it("accepts a weekly/biweekly anchor and fixed-day schedules", () => {
    expect(parsePaycheckCycleSettings('{"frequency":"biweekly","anchorDate":"2026-09-04"}')).toEqual({
      frequency: "biweekly",
      anchorDate: "2026-09-04",
    });
    expect(parsePaycheckCycleSettings('{"frequency":"semimonthly","payDays":[15,1,15]}')).toEqual({
      frequency: "semimonthly",
      payDays: [1, 15],
    });
    expect(parsePaycheckCycleSettings('{"frequency":"monthly","payDays":[31]}')).toEqual({
      frequency: "monthly",
      payDays: [LAST_DAY],
    });
  });

  it("fails closed on junk, missing anchors, impossible dates and wrong day counts", () => {
    expect(parsePaycheckCycleSettings(null)).toBeNull();
    expect(parsePaycheckCycleSettings("nope")).toBeNull();
    expect(parsePaycheckCycleSettings("[]")).toBeNull();
    expect(parsePaycheckCycleSettings('{"frequency":"daily"}')).toBeNull();
    expect(parsePaycheckCycleSettings('{"frequency":"weekly"}')).toBeNull();
    expect(parsePaycheckCycleSettings('{"frequency":"weekly","anchorDate":"2026-02-30"}')).toBeNull();
    expect(parsePaycheckCycleSettings('{"frequency":"monthly","payDays":[1,15]}')).toBeNull();
    expect(parsePaycheckCycleSettings('{"frequency":"semimonthly","payDays":[0,40]}')).toBeNull();
  });

  it("parses local dates strictly", () => {
    expect(parseLocalDate("2026-09-04")?.getDate()).toBe(4);
    expect(parseLocalDate("2026-9-4")).toBeNull();
    expect(parseLocalDate("2026-13-01")).toBeNull();
  });
});

describe("listPaydays", () => {
  const from = new Date(2026, 8, 1);
  const to = new Date(2026, 9, 31);

  it("steps biweekly from the anchor in both directions", () => {
    const paydays = listPaydays({ frequency: "biweekly", anchorDate: "2026-09-18" }, from, to);
    expect(keys(paydays)).toEqual(["2026-09-04", "2026-09-18", "2026-10-02", "2026-10-16", "2026-10-30"]);
  });

  it("steps weekly", () => {
    const paydays = listPaydays({ frequency: "weekly", anchorDate: "2026-09-04" }, from, new Date(2026, 8, 30));
    expect(keys(paydays)).toEqual(["2026-09-04", "2026-09-11", "2026-09-18", "2026-09-25"]);
  });

  it("clamps fixed days into short months and honours the last-day marker", () => {
    const paydays = listPaydays(
      { frequency: "semimonthly", payDays: [15, LAST_DAY] },
      new Date(2026, 1, 1),
      new Date(2026, 3, 30)
    );
    expect(keys(paydays)).toEqual([
      "2026-02-15",
      "2026-02-28",
      "2026-03-15",
      "2026-03-31",
      "2026-04-15",
      "2026-04-30",
    ]);
  });

  it("returns nothing for an empty window or a broken schedule", () => {
    expect(listPaydays({ frequency: "monthly", payDays: [1] }, to, from)).toEqual([]);
    expect(listPaydays({ frequency: "weekly" }, from, to)).toEqual([]);
    expect(listPaydays({ frequency: "monthly" }, from, to)).toEqual([]);
  });
});

describe("currentPayPeriod", () => {
  it("finds the period around today, counting today as a payday when it is one", () => {
    const period = currentPayPeriod({ frequency: "biweekly", anchorDate: "2026-09-04" }, new Date(2026, 8, 10));
    expect(period).not.toBeNull();
    expect(toLocalDateKey(period!.start)).toBe("2026-09-04");
    expect(toLocalDateKey(period!.nextPayday)).toBe("2026-09-18");
    expect(period!.daysUntilNext).toBe(8);
    expect(period!.lengthDays).toBe(14);

    const onPayday = currentPayPeriod({ frequency: "biweekly", anchorDate: "2026-09-04" }, new Date(2026, 8, 18));
    expect(toLocalDateKey(onPayday!.start)).toBe("2026-09-18");
    expect(onPayday!.daysUntilNext).toBe(14);
  });

  it("handles a monthly schedule across the year boundary", () => {
    const period = currentPayPeriod({ frequency: "monthly", payDays: [LAST_DAY] }, new Date(2026, 11, 15));
    expect(toLocalDateKey(period!.start)).toBe("2026-11-30");
    expect(toLocalDateKey(period!.nextPayday)).toBe("2026-12-31");
  });

  it("is null when the schedule can't produce paydays", () => {
    expect(currentPayPeriod({ frequency: "weekly" }, new Date(2026, 8, 10))).toBeNull();
  });
});

describe("ledgerSoFarThisMonth", () => {
  const now = new Date(2026, 8, 10);
  const entries = [
    makeBudgetEntry({ id: "pay", type: "income", category: "Salary", amount: 2000, date: "2026-09-04T12:00:00.000Z" }),
    makeBudgetEntry({ id: "rent", category: "Housing", amount: 1200, recurring: true, date: "2026-01-01T12:00:00.000Z" }),
    makeBudgetEntry({ id: "later", category: "Utilities", amount: 90, recurring: true, date: "2026-01-20T12:00:00.000Z" }),
    makeBudgetEntry({ id: "coffee", category: "Restaurant", amount: 5.5, date: "2026-09-10T12:00:00.000Z" }),
    makeBudgetEntry({ id: "old", category: "Grocery", amount: 999, date: "2026-08-10T12:00:00.000Z" }),
  ];
  const debts = [makeDebt({ id: "visa" })];

  it("sums entries with a day at or before today plus logged debt payments", () => {
    const payments = [
      makePayment({ id: "p1", debtId: "visa", amount: 75, date: "2026-09-03T15:00:00.000Z" }),
      makePayment({ id: "p2", debtId: "visa", amount: 75, date: "2026-08-03T15:00:00.000Z" }),
      makePayment({ id: "p3", debtId: "gone", amount: 75, date: "2026-09-03T15:00:00.000Z" }),
    ];
    expect(ledgerSoFarThisMonth(entries, debts, payments, now)).toEqual({
      income: 2000,
      expenses: 1205.5,
      debtPaid: 75,
    });
  });
});

describe("buildPaycheckPeriodView", () => {
  const now = new Date(2026, 8, 10);
  const settings = { frequency: "biweekly" as const, anchorDate: "2026-09-04" };
  const entries = [
    makeBudgetEntry({ id: "pay", type: "income", category: "Salary", amount: 2000, date: "2026-09-04T12:00:00.000Z" }),
    makeBudgetEntry({ id: "rent", category: "Housing", amount: 1200, recurring: true, date: "2026-01-01T12:00:00.000Z" }),
    makeBudgetEntry({ id: "power", description: "Electric", category: "Utilities", amount: 90, recurring: true, date: "2026-01-15T12:00:00.000Z" }),
    makeBudgetEntry({ id: "gym", category: "Fitness", amount: 40, recurring: true, date: "2026-01-25T12:00:00.000Z" }),
  ];
  const debts = [makeDebt({ id: "visa", name: "Visa", minPayment: 50, paymentDueDay: 12 })];

  it("lists what lands before the next payday and derives safe-to-spend from the month-start balance", () => {
    const view = buildPaycheckPeriodView({ settings, entries, debts, payments: [], startingBalance: 500, now });
    expect(view).not.toBeNull();
    expect(view!.period.daysUntilNext).toBe(8);
    expect(view!.due.map((d) => `${d.kind}:${d.label}:${d.amount}:${d.daysUntil}`)).toEqual([
      "debt:Visa:50:2",
      "bill:Electric:90:5",
    ]);
    expect(view!.dueTotal).toBe(140);
    // 500 + 2000 - 1200 (rent on the 1st) = 1300 cash now.
    expect(view!.cashNow).toBe(1300);
    expect(view!.safeToSpend).toBe(1160);
    expect(view!.perDay).toBe(145);
  });

  it("counts a bill due today once: under 'due', not also as already spent", () => {
    const withToday = [
      ...entries,
      makeBudgetEntry({ id: "water", description: "Water", category: "Utilities", amount: 60, recurring: true, date: "2026-01-10T12:00:00.000Z" }),
      // A one-off logged today really was spent.
      makeBudgetEntry({ id: "lunch", category: "Restaurant", amount: 12, date: "2026-09-10T12:00:00.000Z" }),
    ];
    const view = buildPaycheckPeriodView({ settings, entries: withToday, debts, payments: [], startingBalance: 500, now });
    expect(view!.due.map((d) => `${d.label}:${d.daysUntil}`)).toEqual(["Water:0", "Visa:2", "Electric:5"]);
    expect(view!.dueTotal).toBe(200);
    // 500 + 2000 - 1200 (rent) - 12 (lunch); the water bill is in dueTotal only.
    expect(view!.cashNow).toBe(1288);
    expect(view!.safeToSpend).toBe(1088);
  });

  it("drops a debt already paid this month and leaves cash figures null without a balance", () => {
    const payments = [makePayment({ id: "p1", debtId: "visa", amount: 50, date: "2026-09-02T15:00:00.000Z" })];
    const view = buildPaycheckPeriodView({ settings, entries, debts, payments, startingBalance: null, now });
    expect(view!.due.map((d) => d.id)).toEqual(["bill:power"]);
    expect(view!.dueTotal).toBe(90);
    expect(view!.cashNow).toBeNull();
    expect(view!.safeToSpend).toBeNull();
    expect(view!.perDay).toBeNull();
  });

  it("is null when the schedule is unusable", () => {
    expect(
      buildPaycheckPeriodView({ settings: { frequency: "weekly" }, entries, debts, payments: [], startingBalance: 0, now })
    ).toBeNull();
  });
});

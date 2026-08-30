import {
  getDayOfMonth,
  groupBillsByDay,
  nextBillFrom,
  upcomingBillsWithin,
  splitPaidVsRemaining,
} from "../billCalendar";
import { makeBudgetEntry } from "../../__tests__/fixtures";
import type { BudgetEntry } from "../../types";

// Dates use explicit local noon ("...T12:00:00", no Z) so getDate() returns
// the intended day-of-month regardless of the test runner's timezone.
const entry = (over: Partial<BudgetEntry> = {}): BudgetEntry =>
  makeBudgetEntry({
    id: "e1",
    category: "Utilities",
    date: "2026-06-10T12:00:00",
    recurring: true,
    recurrenceInterval: 1,
    ...over,
  });

describe("getDayOfMonth", () => {
  it("returns the stored day of month", () => {
    expect(getDayOfMonth({ date: "2026-06-10T12:00:00" }, "2026-06")).toBe(10);
  });

  it("clamps an end-of-month day to the month's last day", () => {
    expect(getDayOfMonth({ date: "2026-01-31T12:00:00" }, "2026-02")).toBe(28); // non-leap
    expect(getDayOfMonth({ date: "2026-01-31T12:00:00" }, "2024-02")).toBe(29); // leap
    expect(getDayOfMonth({ date: "2026-01-31T12:00:00" }, "2026-04")).toBe(30); // 30-day month
  });

  it("falls back to day 15 for an unparseable date", () => {
    expect(getDayOfMonth({ date: "not-a-date" }, "2026-06")).toBe(15);
  });
});

describe("groupBillsByDay", () => {
  it("groups recurring expenses by day and sums the month total", () => {
    const entries = [
      entry({ id: "a", amount: 100, date: "2026-06-10T12:00:00" }),
      entry({ id: "b", amount: 50, date: "2026-06-10T12:00:00" }),
      entry({ id: "c", amount: 25, date: "2026-06-20T12:00:00" }),
    ];
    const { byDay, monthTotal } = groupBillsByDay(entries, "2026-06");
    expect(byDay.get(10)).toHaveLength(2);
    expect(byDay.get(20)).toHaveLength(1);
    expect(monthTotal).toBe(175);
  });

  it("excludes income and one-off entries by default", () => {
    const entries = [
      entry({ id: "inc", type: "income" }),
      entry({ id: "oneoff", recurring: false }),
      entry({ id: "rec" }),
    ];
    const { byDay, monthTotal } = groupBillsByDay(entries, "2026-06");
    expect(monthTotal).toBe(100); // only the recurring expense
    expect([...byDay.values()].flat().map((e) => e.id)).toEqual(["rec"]);
  });

  it("includes one-off and income when asked", () => {
    const entries = [
      entry({ id: "inc", type: "income", amount: 4000 }),
      entry({ id: "oneoff", recurring: false, amount: 30 }),
    ];
    const { monthTotal } = groupBillsByDay(entries, "2026-06", {
      includeOneOff: true,
      includeIncome: true,
    });
    expect(monthTotal).toBe(4030);
  });

  it("drops a quarterly bill that is not on its cycle this month", () => {
    const q = entry({ recurrenceInterval: 3, date: "2026-01-10T12:00:00" });
    expect(groupBillsByDay([q], "2026-02").byDay.size).toBe(0); // Feb is off-cycle
    expect(groupBillsByDay([q], "2026-04").byDay.size).toBe(1); // Apr is on-cycle
  });
});

describe("nextBillFrom", () => {
  it("finds the next bill on or after the given date", () => {
    const entries = [entry({ date: "2026-06-20T12:00:00", amount: 100 })];
    const result = nextBillFrom(entries, new Date(2026, 5, 10));
    expect(result).not.toBeNull();
    expect(result!.daysUntil).toBe(10);
    expect(result!.entry.id).toBe("e1");
  });

  it("rolls into next month when this month's bill has passed", () => {
    const entries = [entry({ date: "2026-06-05T12:00:00" })]; // monthly on the 5th
    const result = nextBillFrom(entries, new Date(2026, 5, 10)); // 10 June
    // next occurrence is 5 July
    expect(result!.date.getMonth()).toBe(6); // July (0-indexed)
    expect(result!.date.getDate()).toBe(5);
  });

  it("picks the largest bill when several land on the same day", () => {
    const entries = [
      entry({ id: "small", amount: 20, date: "2026-06-15T12:00:00" }),
      entry({ id: "big", amount: 200, date: "2026-06-15T12:00:00" }),
    ];
    const result = nextBillFrom(entries, new Date(2026, 5, 1));
    expect(result!.entry.id).toBe("big");
  });

  it("returns null when there are no bills", () => {
    expect(nextBillFrom([], new Date(2026, 5, 10))).toBeNull();
  });
});

describe("upcomingBillsWithin", () => {
  it("returns [] for a negative window", () => {
    expect(upcomingBillsWithin([entry()], -1, new Date(2026, 5, 10))).toEqual([]);
  });

  it("lists bills within the window with daysUntil", () => {
    const entries = [
      entry({ id: "soon", date: "2026-06-12T12:00:00" }), // 2 days out
      entry({ id: "later", date: "2026-06-25T12:00:00" }), // 15 days out
    ];
    const within7 = upcomingBillsWithin(entries, 7, new Date(2026, 5, 10));
    expect(within7.map((b) => b.entry.id)).toEqual(["soon"]);
    expect(within7[0].daysUntil).toBe(2);
  });

  it("sorts by soonest first, then by larger amount", () => {
    const entries = [
      entry({ id: "today-small", amount: 10, date: "2026-06-10T12:00:00" }),
      entry({ id: "today-big", amount: 99, date: "2026-06-10T12:00:00" }),
      entry({ id: "tomorrow", amount: 500, date: "2026-06-11T12:00:00" }),
    ];
    const result = upcomingBillsWithin(entries, 7, new Date(2026, 5, 10));
    expect(result.map((b) => b.entry.id)).toEqual([
      "today-big",
      "today-small",
      "tomorrow",
    ]);
  });
});

describe("bill fulfilment", () => {
  const electric = () =>
    entry({ id: "electric", description: "Electric", amount: 120, date: "2026-03-25T12:00:00" });
  const actual = () =>
    entry({
      id: "actual",
      recurring: false,
      recurrenceInterval: undefined,
      amount: 137.42,
      date: "2026-06-03T12:00:00",
      fulfillsRecurringId: "electric",
    });

  it("shows the actual charge on its own day instead of the projection", () => {
    const { byDay, monthTotal } = groupBillsByDay([electric(), actual()], "2026-06");
    expect(byDay.get(25)).toBeUndefined();
    expect(byDay.get(3)?.map((e) => e.id)).toEqual(["actual"]);
    expect(monthTotal).toBeCloseTo(137.42);
    // Other months still project the estimate.
    expect(groupBillsByDay([electric(), actual()], "2026-05").byDay.get(25)).toHaveLength(1);
  });

  it("does not double-list the actual when one-offs are included", () => {
    const { byDay } = groupBillsByDay([electric(), actual()], "2026-06", { includeOneOff: true });
    expect([...byDay.values()].flat().map((e) => e.id)).toEqual(["actual"]);
  });

  it("omits fulfilled bills from 'next' and the upcoming window", () => {
    const water = entry({ id: "water", amount: 45, date: "2026-03-28T12:00:00" });
    const entries = [electric(), actual(), water];
    expect(nextBillFrom(entries, new Date(2026, 5, 1))!.entry.id).toBe("water");
    expect(
      upcomingBillsWithin(entries, 30, new Date(2026, 5, 1)).map((b) => b.entry.id)
    ).toEqual(["water"]);
    expect(
      groupBillsByDay(entries, "2026-06", { includeFulfilled: false }).byDay.get(3)
    ).toBeUndefined();
  });

  it("counts a fulfilled bill as paid regardless of the day", () => {
    const late = entry({ id: "late", amount: 60, date: "2026-06-25T12:00:00" });
    const bills = groupBillsByDay([electric(), actual(), late], "2026-06");
    // 'now' = 1 June: nothing is due by day yet, but the actual is paid.
    expect(splitPaidVsRemaining(bills, "2026-06", new Date(2026, 5, 1))).toEqual({
      paid: 137.42,
      remaining: 60,
    });
  });
});

describe("splitPaidVsRemaining", () => {
  const bills = () =>
    groupBillsByDay(
      [
        entry({ id: "early", amount: 100, date: "2026-06-05T12:00:00" }),
        entry({ id: "late", amount: 60, date: "2026-06-25T12:00:00" }),
      ],
      "2026-06"
    );

  it("counts the whole total as paid for a past month", () => {
    expect(splitPaidVsRemaining(bills(), "2026-06", new Date(2026, 7, 1))).toEqual({
      paid: 160,
      remaining: 0,
    });
  });

  it("counts the whole total as remaining for a future month", () => {
    expect(splitPaidVsRemaining(bills(), "2026-06", new Date(2026, 3, 1))).toEqual({
      paid: 0,
      remaining: 160,
    });
  });

  it("splits by day-vs-today for the current month", () => {
    // 'now' = 10 June: the 5th is paid, the 25th is remaining
    expect(splitPaidVsRemaining(bills(), "2026-06", new Date(2026, 5, 10))).toEqual({
      paid: 100,
      remaining: 60,
    });
  });
});

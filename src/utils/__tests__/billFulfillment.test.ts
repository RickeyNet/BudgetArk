import {
  describeFulfillment,
  describeIncomeProjection,
  entriesForMonth,
  expectedPaychecksInMonth,
  fulfilledMonthsByBill,
  fulfillmentsForMonth,
  isBillCandidate,
  isFulfillingEntry,
  listUnfulfilledOccurrenceMonths,
  rankBillCandidates,
  suggestEstimateFromActuals,
} from "../billFulfillment";
import { makeBudgetEntry } from "../../__tests__/fixtures";
import type { BudgetEntry } from "../../types";

const bill = (over: Partial<BudgetEntry> = {}): BudgetEntry =>
  makeBudgetEntry({
    id: "electric",
    category: "Utilities",
    description: "Electric",
    amount: 120,
    date: "2026-03-15T12:00:00",
    recurring: true,
    recurrenceInterval: 1,
    ...over,
  });

const actual = (over: Partial<BudgetEntry> = {}): BudgetEntry =>
  makeBudgetEntry({
    id: "actual-jun",
    category: "Utilities",
    description: "CITY POWER",
    amount: 137.42,
    date: "2026-06-03T12:00:00",
    source: "bank",
    fulfillsRecurringId: "electric",
    ...over,
  });

describe("isBillCandidate / isFulfillingEntry", () => {
  it("accepts recurring expenses without a linked account", () => {
    expect(isBillCandidate(bill())).toBe(true);
  });

  it("accepts an earner's recurring income too", () => {
    expect(isBillCandidate(bill({ type: "income" }))).toBe(true);
  });

  it("rejects one-offs, linked contributions and tombstones", () => {
    expect(isBillCandidate(bill({ recurring: false }))).toBe(false);
    expect(isBillCandidate(bill({ linkedAccountId: "acct" }))).toBe(false);
    expect(isBillCandidate(bill({ deletedAt: "2026-06-01T00:00:00.000Z" }))).toBe(false);
  });

  it("only a live non-recurring entry with a recurring id fulfils", () => {
    expect(isFulfillingEntry(actual())).toBe(true);
    expect(isFulfillingEntry(actual({ type: "income" }))).toBe(true);
    expect(isFulfillingEntry(actual({ fulfillsRecurringId: undefined }))).toBe(false);
    expect(isFulfillingEntry(actual({ recurring: true }))).toBe(false);
    expect(isFulfillingEntry(actual({ deletedAt: "2026-06-05T00:00:00.000Z" }))).toBe(false);
  });
});

describe("entriesForMonth", () => {
  it("replaces the projection with the actual in the fulfilled month only", () => {
    const entries = [bill(), actual()];
    expect(entriesForMonth(entries, "2026-06").map((e) => e.id)).toEqual(["actual-jun"]);
    expect(entriesForMonth(entries, "2026-05").map((e) => e.id)).toEqual(["electric"]);
    expect(entriesForMonth(entries, "2026-07").map((e) => e.id)).toEqual(["electric"]);
  });

  it("restores the projection when the actual is gone", () => {
    expect(entriesForMonth([bill()], "2026-06").map((e) => e.id)).toEqual(["electric"]);
  });

  it("ignores an actual whose bill no longer exists", () => {
    const stray = actual({ fulfillsRecurringId: "deleted-bill" });
    expect(entriesForMonth([bill(), stray], "2026-06").map((e) => e.id)).toEqual([
      "electric",
      "actual-jun",
    ]);
  });

  it("ignores an actual pointing at a bill that is off-cycle that month", () => {
    const quarterly = bill({ recurrenceInterval: 3 }); // Mar, Jun, Sep...
    const may = actual({ id: "actual-may", date: "2026-05-04T12:00:00" });
    // May: bill not active -> the actual is a plain expense.
    expect(entriesForMonth([quarterly, may], "2026-05").map((e) => e.id)).toEqual(["actual-may"]);
    // June: bill active, no actual in June -> projection shows.
    expect(entriesForMonth([quarterly, may], "2026-06").map((e) => e.id)).toEqual(["electric"]);
  });

  it("does not let a recurring entry fulfil another bill", () => {
    const recurringActual = actual({ id: "r", recurring: true, date: "2026-06-01T12:00:00" });
    expect(entriesForMonth([bill(), recurringActual], "2026-06").map((e) => e.id)).toEqual([
      "electric",
      "r",
    ]);
  });

  it("two actuals in one month both count and the projection hides once", () => {
    const a = actual({ id: "a1", amount: 60 });
    const b = actual({ id: "a2", amount: 70, date: "2026-06-20T12:00:00" });
    const result = entriesForMonth([bill(), a, b], "2026-06");
    expect(result.map((e) => e.id)).toEqual(["a1", "a2"]);
    expect(fulfillmentsForMonth([bill(), a, b], "2026-06").get("electric")?.length).toBe(2);
  });

  it("handles date-only ISO strings without timezone drift", () => {
    const dateOnly = actual({ date: "2026-06-30" });
    expect(entriesForMonth([bill(), dateOnly], "2026-06").map((e) => e.id)).toEqual(["actual-jun"]);
  });
});

describe("fulfilledMonthsByBill / listUnfulfilledOccurrenceMonths", () => {
  it("collects the months a bill was fulfilled and drops them from projections", () => {
    const entries = [
      bill(),
      actual({ id: "a-apr", date: "2026-04-02T12:00:00" }),
      actual({ id: "a-jun", date: "2026-06-03T12:00:00" }),
      actual({ id: "a-feb", date: "2026-02-03T12:00:00" }), // before the bill started
    ];
    const months = fulfilledMonthsByBill(entries);
    expect(Array.from(months.get("electric") ?? []).sort()).toEqual(["2026-04", "2026-06"]);
    expect(listUnfulfilledOccurrenceMonths(bill(), months, "2026-03", "2026-07")).toEqual([
      "2026-03",
      "2026-05",
      "2026-07",
    ]);
  });

  it("leaves one-offs untouched", () => {
    const oneOff = makeBudgetEntry({ id: "x", date: "2026-05-10T12:00:00" });
    expect(listUnfulfilledOccurrenceMonths(oneOff, new Map(), "2026-01", "2026-12")).toEqual([
      "2026-05",
    ]);
  });
});

describe("rankBillCandidates", () => {
  const water = bill({ id: "water", description: "Water", amount: 45 });
  const rent = bill({ id: "rent", category: "Housing", description: "Rent", amount: 1400 });

  it("offers only bills on their cycle that are not yet fulfilled", () => {
    const entries = [bill(), water, rent, actual()];
    expect(rankBillCandidates(entries, "2026-06").map((e) => e.id)).toEqual(["rent", "water"]);
    expect(rankBillCandidates(entries, "2026-02")).toEqual([]);
  });

  it("ranks same-category first, then closest amount", () => {
    const entries = [bill(), water, rent];
    expect(
      rankBillCandidates(entries, "2026-06", { category: "Utilities", amount: 50 }).map((e) => e.id)
    ).toEqual(["water", "electric", "rent"]);
    expect(
      rankBillCandidates(entries, "2026-06", { category: "Housing", amount: 130 }).map((e) => e.id)
    ).toEqual(["rent", "electric", "water"]);
  });

  it("keeps the currently linked bill and never offers the entry itself", () => {
    const entries = [bill(), water, actual()];
    expect(
      rankBillCandidates(entries, "2026-06", { keepId: "electric", excludeId: "actual-jun" }).map(
        (e) => e.id
      )
    ).toEqual(["electric", "water"]);
    expect(rankBillCandidates(entries, "2026-06", { excludeId: "water" }).map((e) => e.id)).toEqual(
      []
    );
  });
});

describe("describeFulfillment", () => {
  it("names the bill and the delta versus the estimate", () => {
    const byId = new Map([[bill().id, bill()]]);
    expect(describeFulfillment(actual(), byId)).toEqual({
      billId: "electric",
      billLabel: "Electric",
      type: "expense",
      personId: undefined,
      estimate: 120,
      delta: 17.42,
    });
  });

  it("refuses to pair an income actual with an expense bill", () => {
    const byId = new Map([[bill().id, bill()]]);
    expect(describeFulfillment(actual({ type: "income" }), byId)).toBeNull();
  });

  it("falls back to the category label and returns null for dangling ids", () => {
    const unnamed = bill({ description: undefined });
    expect(describeFulfillment(actual(), new Map([[unnamed.id, unnamed]]))?.billLabel).toBe(
      "Utilities"
    );
    expect(describeFulfillment(actual(), new Map())).toBeNull();
    expect(describeFulfillment(actual({ fulfillsRecurringId: undefined }), new Map())).toBeNull();
  });
});

describe("suggestEstimateFromActuals", () => {
  const history = [
    actual({ id: "a-mar", amount: 110, date: "2026-03-20T12:00:00" }),
    actual({ id: "a-apr", amount: 125, date: "2026-04-02T12:00:00" }),
    actual({ id: "a-may", amount: 130, date: "2026-05-04T12:00:00" }),
    actual({ id: "a-jun", amount: 140, date: "2026-06-03T12:00:00" }),
  ];

  it("averages the most recent three actuals, newest first", () => {
    expect(suggestEstimateFromActuals(bill(), [bill(), ...history])).toEqual({
      average: 131.67,
      count: 3,
      months: ["2026-06", "2026-05", "2026-04"],
    });
  });

  it("needs at least two actuals", () => {
    expect(suggestEstimateFromActuals(bill(), [bill(), history[3]])).toBeNull();
    expect(suggestEstimateFromActuals(bill(), [bill(), history[2], history[3]])?.count).toBe(2);
  });

  it("is silent when the estimate already matches the average", () => {
    const matched = bill({ amount: 135 });
    expect(suggestEstimateFromActuals(matched, [matched, history[2], history[3]])).toBeNull();
  });

  it("ignores actuals for other bills and non-candidates", () => {
    const other = actual({ id: "o", fulfillsRecurringId: "water" });
    expect(suggestEstimateFromActuals(bill(), [bill(), other, history[3]])).toBeNull();
    expect(suggestEstimateFromActuals(bill({ recurring: false }), history)).toBeNull();
  });
});

/* ─── Income: an earner's paychecks against a monthly estimate ─── */

/** Maria: est. $4,000/mo, paid every 2 weeks, anchored on Fri 2026-01-09. */
const salary = (over: Partial<BudgetEntry> = {}): BudgetEntry =>
  makeBudgetEntry({
    id: "maria",
    type: "income",
    category: "Salary",
    description: "Maria",
    amount: 4000,
    date: "2026-01-09T12:00:00",
    recurring: true,
    recurrenceInterval: 1,
    personId: "per-maria",
    payFrequency: "biweekly",
    ...over,
  });

/** One deposit filed as Maria's paycheck. */
const paycheck = (over: Partial<BudgetEntry> = {}): BudgetEntry =>
  makeBudgetEntry({
    id: "pay-1",
    type: "income",
    category: "Salary",
    description: "ACME PAYROLL",
    amount: 1850,
    date: "2026-06-05T12:00:00",
    source: "bank",
    fulfillsRecurringId: "maria",
    ...over,
  });

const incomeTotal = (entries: BudgetEntry[], monthKey: string): number =>
  entriesForMonth(entries, monthKey)
    .filter((entry) => entry.type === "income")
    .reduce((sum, entry) => sum + entry.amount, 0);

describe("expectedPaychecksInMonth", () => {
  it("is 1 for monthly or no frequency and 2 for semimonthly", () => {
    expect(expectedPaychecksInMonth(salary({ payFrequency: undefined }), "2026-06")).toBe(1);
    expect(expectedPaychecksInMonth(salary({ payFrequency: "monthly" }), "2026-06")).toBe(1);
    expect(expectedPaychecksInMonth(salary({ payFrequency: "semimonthly" }), "2026-06")).toBe(2);
  });

  it("counts biweekly paydays anchored on the entry's date, three in a long month", () => {
    // Fridays every 2 weeks from 2026-01-09: Jan 9, 23; Feb 6, 20; Mar 6, 20;
    // Apr 3, 17; May 1, 15, 29 (three); Jun 12, 26; Jul 10, 24.
    expect(expectedPaychecksInMonth(salary(), "2026-01")).toBe(2);
    expect(expectedPaychecksInMonth(salary(), "2026-05")).toBe(3);
    expect(expectedPaychecksInMonth(salary(), "2026-06")).toBe(2);
    // Works backwards from the anchor too.
    expect(expectedPaychecksInMonth(salary(), "2025-10")).toBe(3);
  });

  it("counts weekly paydays - four or five depending on the month", () => {
    const weekly = salary({ payFrequency: "weekly" });
    expect(expectedPaychecksInMonth(weekly, "2026-02")).toBe(4);
    expect(expectedPaychecksInMonth(weekly, "2026-05")).toBe(5);
  });

  it("reads the stored digits, not the viewer's time zone", () => {
    expect(expectedPaychecksInMonth(salary({ date: "2026-01-09T23:30:00.000Z" }), "2026-05")).toBe(3);
  });
});

describe("entriesForMonth - income blend", () => {
  it("counts the full estimate until a paycheck is filed", () => {
    expect(incomeTotal([salary()], "2026-06")).toBe(4000);
  });

  it("keeps the estimate for the paychecks still expected after the first deposit", () => {
    const entries = [salary(), paycheck()];
    // 1 of 2 in: the $1,850 actual plus half the $4,000 estimate.
    expect(incomeTotal(entries, "2026-06")).toBe(1850 + 2000);
    const rows = entriesForMonth(entries, "2026-06");
    const projected = rows.find((entry) => entry.id === "maria");
    expect(projected?.amount).toBe(2000);
    // The projected copy still opens the real record: same id, same flags.
    expect(projected?.recurring).toBe(true);
  });

  it("shows only actuals once every expected paycheck has landed", () => {
    const entries = [
      salary(),
      paycheck(),
      paycheck({ id: "pay-2", amount: 2210, date: "2026-06-19T12:00:00" }),
    ];
    expect(incomeTotal(entries, "2026-06")).toBe(1850 + 2210);
    expect(entriesForMonth(entries, "2026-06").some((entry) => entry.id === "maria")).toBe(false);
  });

  it("a third paycheck in a three-payday month still has a share to replace", () => {
    const may = [
      salary(),
      paycheck({ id: "p1", amount: 1800, date: "2026-05-01T12:00:00" }),
      paycheck({ id: "p2", amount: 1900, date: "2026-05-15T12:00:00" }),
    ];
    // 2 of 3 in: a third of the estimate remains.
    expect(incomeTotal(may, "2026-05")).toBe(1800 + 1900 + 1333.33);
    const all = [...may, paycheck({ id: "p3", amount: 2000, date: "2026-05-29T12:00:00" })];
    expect(incomeTotal(all, "2026-05")).toBe(1800 + 1900 + 2000);
  });

  it("an unexpected extra deposit never pushes the estimate negative", () => {
    const entries = [
      salary({ payFrequency: "monthly" }),
      paycheck(),
      paycheck({ id: "pay-2", amount: 500, date: "2026-06-19T12:00:00" }),
    ];
    expect(incomeTotal(entries, "2026-06")).toBe(1850 + 500);
  });

  it("without a frequency the first deposit replaces the estimate, like a bill", () => {
    expect(incomeTotal([salary({ payFrequency: undefined }), paycheck()], "2026-06")).toBe(1850);
  });

  it("never pairs across the income/expense line", () => {
    // A deposit pointing at an expense bill, and a charge pointing at income,
    // are both plain entries: the projections stay put.
    const entries = [
      bill(),
      salary(),
      paycheck({ id: "wrong-1", fulfillsRecurringId: "electric" }),
      actual({ id: "wrong-2", fulfillsRecurringId: "maria" }),
    ];
    const rows = entriesForMonth(entries, "2026-06");
    expect(rows.map((entry) => entry.id).sort()).toEqual(["electric", "maria", "wrong-1", "wrong-2"]);
    expect(rows.find((entry) => entry.id === "maria")?.amount).toBe(4000);
    expect(fulfillmentsForMonth(entries, "2026-06").size).toBe(0);
  });

  it("only affects the month the deposit is dated in", () => {
    const entries = [salary(), paycheck()];
    expect(incomeTotal(entries, "2026-07")).toBe(4000);
    expect(incomeTotal(entries, "2026-05")).toBe(4000);
  });
});

describe("describeIncomeProjection", () => {
  it("reports paychecks expected, received and the estimate still counted", () => {
    const entries = [salary(), paycheck()];
    expect(describeIncomeProjection(salary(), entries, "2026-06")).toEqual({
      expected: 2,
      received: 1,
      receivedTotal: 1850,
      remainingEstimate: 2000,
    });
    expect(describeIncomeProjection(salary(), [salary()], "2026-06")).toEqual({
      expected: 2,
      received: 0,
      receivedTotal: 0,
      remainingEstimate: 4000,
    });
  });

  it("is null for expenses, one-offs and off-cycle months", () => {
    expect(describeIncomeProjection(bill(), [bill()], "2026-06")).toBeNull();
    expect(describeIncomeProjection(salary({ recurring: false }), [], "2026-06")).toBeNull();
    expect(describeIncomeProjection(salary(), [salary()], "2025-12")).toBeNull();
  });
});

describe("rankBillCandidates - income", () => {
  const sam = salary({
    id: "sam",
    description: "Sam",
    amount: 2400,
    personId: "per-sam",
    payFrequency: "monthly",
  });

  it("lists only recurring income for a deposit, closest paycheck share first", () => {
    const entries = [bill(), salary(), sam];
    // $1,850 is closer to Maria's $2,000 share than Sam's $2,400.
    expect(
      rankBillCandidates(entries, "2026-06", { type: "income", amount: 1850 }).map((e) => e.id)
    ).toEqual(["maria", "sam"]);
    expect(
      rankBillCandidates(entries, "2026-06", { type: "income", amount: 2400 }).map((e) => e.id)
    ).toEqual(["sam", "maria"]);
    // The default query still lists bills only.
    expect(rankBillCandidates(entries, "2026-06").map((e) => e.id)).toEqual(["electric"]);
  });

  it("keeps an earner on offer after their expected paychecks are in", () => {
    const entries = [
      sam,
      paycheck({ id: "sam-1", fulfillsRecurringId: "sam", amount: 2400 }),
    ];
    expect(rankBillCandidates(entries, "2026-06", { type: "income" }).map((e) => e.id)).toEqual([
      "sam",
    ]);
  });
});

describe("suggestEstimateFromActuals - income", () => {
  const months = [
    // April: 2 of 2 in -> 3,700. May: 2 of 3 in -> incomplete, skipped.
    // June: 2 of 2 in -> 4,060.
    paycheck({ id: "apr-1", amount: 1800, date: "2026-04-03T12:00:00" }),
    paycheck({ id: "apr-2", amount: 1900, date: "2026-04-17T12:00:00" }),
    paycheck({ id: "may-1", amount: 1850, date: "2026-05-01T12:00:00" }),
    paycheck({ id: "may-2", amount: 1850, date: "2026-05-15T12:00:00" }),
    paycheck({ id: "jun-1", amount: 1850, date: "2026-06-12T12:00:00" }),
    paycheck({ id: "jun-2", amount: 2210, date: "2026-06-26T12:00:00" }),
  ];

  it("averages whole months that received every expected paycheck", () => {
    expect(suggestEstimateFromActuals(salary(), [salary(), ...months])).toEqual({
      average: 3880,
      count: 2,
      months: ["2026-06", "2026-04"],
    });
  });

  it("needs two complete months", () => {
    expect(suggestEstimateFromActuals(salary(), [salary(), ...months.slice(0, 4)])).toBeNull();
  });
});

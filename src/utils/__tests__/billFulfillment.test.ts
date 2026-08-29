import {
  describeFulfillment,
  entriesForMonth,
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

  it("rejects one-offs, income, linked contributions and tombstones", () => {
    expect(isBillCandidate(bill({ recurring: false }))).toBe(false);
    expect(isBillCandidate(bill({ type: "income" }))).toBe(false);
    expect(isBillCandidate(bill({ linkedAccountId: "acct" }))).toBe(false);
    expect(isBillCandidate(bill({ deletedAt: "2026-06-01T00:00:00.000Z" }))).toBe(false);
  });

  it("only a live non-recurring expense with a bill id fulfils", () => {
    expect(isFulfillingEntry(actual())).toBe(true);
    expect(isFulfillingEntry(actual({ fulfillsRecurringId: undefined }))).toBe(false);
    expect(isFulfillingEntry(actual({ recurring: true }))).toBe(false);
    expect(isFulfillingEntry(actual({ type: "income" }))).toBe(false);
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
      estimate: 120,
      delta: 17.42,
    });
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

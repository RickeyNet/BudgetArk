/**
 * BudgetArk - Settle Up Tests
 * File: src/utils/__tests__/settleUp.test.ts
 *
 * Monthly per-person balances: even splits, recurring bills once per
 * month (an actual replacing its estimate), settlements subtracting, a
 * deleted person still listed, and the fail-closed record parse.
 */

import { makeBudgetEntry, makePerson } from "../../__tests__/fixtures";
import { computeSettleUp, MAX_SETTLEMENT_RECORDS, parseSettlements } from "../settleUp";

const alex = makePerson({ id: "alex", name: "Alex" });
const sam = makePerson({ id: "sam", name: "Sam" });
const gone = makePerson({ id: "gone", name: "Jo", deletedAt: "2026-05-01T00:00:00.000Z" });
const people = [alex, sam, gone];

describe("computeSettleUp", () => {
  it("splits shared expenses evenly and totals per person for the month", () => {
    const entries = [
      makeBudgetEntry({ id: "a", amount: 90, date: "2026-09-03T00:00:00.000Z", personId: "alex", personIds: ["alex", "sam"] }),
      makeBudgetEntry({ id: "b", amount: 20, date: "2026-09-10T00:00:00.000Z", personId: "sam" }),
      makeBudgetEntry({ id: "old", amount: 500, date: "2026-08-10T00:00:00.000Z", personId: "sam" }),
      makeBudgetEntry({ id: "none", amount: 500, date: "2026-09-10T00:00:00.000Z" }),
      makeBudgetEntry({ id: "inc", amount: 500, type: "income", date: "2026-09-10T00:00:00.000Z", personId: "alex" }),
    ];
    const summary = computeSettleUp(entries, people, "2026-09", []);
    expect(summary.people.map((p) => [p.name, p.owed, p.outstanding, p.entryCount])).toEqual([
      ["Sam", 65, 65, 2],
      ["Alex", 45, 45, 1],
    ]);
    expect(summary.totalOwed).toBe(110);
    expect(summary.totalOutstanding).toBe(110);
  });

  it("counts a recurring bill once in the month, replaced by its actual charge when one is filed", () => {
    const bill = makeBudgetEntry({
      id: "bill",
      amount: 100,
      date: "2026-06-05T00:00:00.000Z",
      recurring: true,
      recurrenceInterval: 1,
      personId: "alex",
    });
    expect(computeSettleUp([bill], people, "2026-09", []).people[0].owed).toBe(100);
    const actual = makeBudgetEntry({
      id: "actual",
      amount: 112,
      date: "2026-09-06T00:00:00.000Z",
      fulfillsRecurringId: "bill",
      personId: "alex",
    });
    expect(computeSettleUp([bill, actual], people, "2026-09", []).people[0].owed).toBe(112);
  });

  it("subtracts settlements for the month only, never below zero, and lists a settled-only person", () => {
    const entries = [makeBudgetEntry({ id: "a", amount: 80, date: "2026-09-03T00:00:00.000Z", personId: "alex" })];
    const settlements = [
      { personId: "alex", monthKey: "2026-09", amount: 30, settledAt: "2026-09-04T00:00:00.000Z" },
      { personId: "alex", monthKey: "2026-09", amount: 60, settledAt: "2026-09-05T00:00:00.000Z" },
      { personId: "alex", monthKey: "2026-08", amount: 999, settledAt: "2026-08-05T00:00:00.000Z" },
      { personId: "sam", monthKey: "2026-09", amount: 10, settledAt: "2026-09-05T00:00:00.000Z" },
    ];
    const summary = computeSettleUp(entries, people, "2026-09", settlements);
    expect(summary.people.map((p) => [p.name, p.owed, p.settled, p.outstanding])).toEqual([
      ["Alex", 80, 90, 0],
      ["Sam", 0, 10, 0],
    ]);
    expect(summary.totalOutstanding).toBe(0);
  });

  it("keeps a deleted person's balance under their name, flagged", () => {
    const entries = [makeBudgetEntry({ id: "a", amount: 25, date: "2026-09-03T00:00:00.000Z", personId: "gone" })];
    const summary = computeSettleUp(entries, people, "2026-09", []);
    expect(summary.people[0]).toMatchObject({ name: "Jo", deleted: true, owed: 25 });
    const unknown = computeSettleUp(entries, [alex], "2026-09", []);
    expect(unknown.people[0]).toMatchObject({ name: "(deleted person)", deleted: true });
  });
});

describe("parseSettlements", () => {
  it("keeps only well-formed records and caps the list", () => {
    const good = { personId: "alex", monthKey: "2026-09", amount: 30, settledAt: "2026-09-04T00:00:00.000Z" };
    expect(parseSettlements(null)).toEqual([]);
    expect(parseSettlements("junk")).toEqual([]);
    expect(parseSettlements("{}")).toEqual([]);
    expect(
      parseSettlements(
        JSON.stringify([
          good,
          { ...good, monthKey: "2026-13" },
          { ...good, amount: 0 },
          { ...good, amount: "30" },
          { ...good, personId: "" },
          { ...good, settledAt: "never" },
          null,
          "x",
        ]),
      ),
    ).toEqual([good]);
    const many = Array.from({ length: MAX_SETTLEMENT_RECORDS + 3 }, (_, i) => ({ ...good, amount: i + 1 }));
    const kept = parseSettlements(JSON.stringify(many));
    expect(kept).toHaveLength(MAX_SETTLEMENT_RECORDS);
    expect(kept[kept.length - 1].amount).toBe(MAX_SETTLEMENT_RECORDS + 3);
  });
});

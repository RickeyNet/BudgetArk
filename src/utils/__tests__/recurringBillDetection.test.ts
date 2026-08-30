import { makeBudgetEntry, makePendingTransaction } from "../../__tests__/fixtures";
import {
  RECURRING_BILL_MIN_MONTHS,
  detectRecurringBill,
  shiftMonthKey,
} from "../recurringBillDetection";

const charge = (id: string, date: string, amount: number, over = {}) =>
  makeBudgetEntry({
    id,
    date,
    amount,
    category: "Utilities",
    description: "Comcast",
    merchant: "COMCAST",
    source: "bank",
    ...over,
  });

const comcastNow = makePendingTransaction({
  merchant: "COMCAST",
  description: "COMCAST CABLE 8005551212",
  amount: -95.5,
  postedAt: "2026-08-14T12:00:00.000Z",
});

const priors = [
  charge("jun", "2026-06-12T12:00:00.000Z", 89.99),
  charge("jul", "2026-07-15T12:00:00.000Z", 92),
];

describe("shiftMonthKey", () => {
  it("crosses year boundaries in both directions", () => {
    expect(shiftMonthKey("2026-01", -1)).toBe("2025-12");
    expect(shiftMonthKey("2025-12", 1)).toBe("2026-01");
    expect(shiftMonthKey("2026-08", -RECURRING_BILL_MIN_MONTHS)).toBe("2026-05");
  });
});

describe("detectRecurringBill", () => {
  it("suggests a bill after once-a-month charges in each preceding month", () => {
    const suggestion = detectRecurringBill(comcastNow, priors);
    expect(suggestion).toEqual({
      merchant: "COMCAST",
      label: "Comcast",
      averageAmount: 92.5, // (95.5 + 89.99 + 92) / 3 = 92.4966..
      dayOfMonth: 14,
      months: ["2026-06", "2026-07", "2026-08"],
    });
  });

  it("prefers the merchant rule's display name for the label", () => {
    expect(detectRecurringBill({ ...comcastNow, suggestedName: "Internet" }, priors)?.label).toBe(
      "Internet"
    );
  });

  it("declines inflows, missing merchants, and charges already expected to fulfil a bill", () => {
    expect(detectRecurringBill({ ...comcastNow, amount: 95.5 }, priors)).toBeNull();
    expect(detectRecurringBill({ ...comcastNow, merchant: "" }, priors)).toBeNull();
    expect(
      detectRecurringBill({ ...comcastNow, suggestedRecurringId: "bill-1" }, priors)
    ).toBeNull();
  });

  it("declines when a recurring bill already exists for the merchant", () => {
    const bill = makeBudgetEntry({
      id: "bill",
      recurring: true,
      merchant: "COMCAST",
      category: "Utilities",
      amount: 90,
      date: "2026-05-14T12:00:00.000Z",
    });
    expect(detectRecurringBill(comcastNow, [...priors, bill])).toBeNull();
    // ...unless that bill was deleted.
    expect(
      detectRecurringBill(comcastNow, [...priors, { ...bill, deletedAt: "2026-08-01T00:00:00.000Z" }])
    ).not.toBeNull();
  });

  it("needs every preceding month, with exactly one charge in each", () => {
    expect(detectRecurringBill(comcastNow, [priors[1]])).toBeNull(); // June missing
    expect(
      detectRecurringBill(comcastNow, [...priors, charge("jul2", "2026-07-28T12:00:00.000Z", 40)])
    ).toBeNull(); // twice in July = a store
    expect(
      detectRecurringBill(comcastNow, [...priors, charge("aug", "2026-08-02T12:00:00.000Z", 12)])
    ).toBeNull(); // already charged this month
  });

  it("ignores prior charges that were already filed against a bill, deleted, or not expenses", () => {
    expect(
      detectRecurringBill(comcastNow, [priors[0], { ...priors[1], fulfillsRecurringId: "x" }])
    ).toBeNull();
    expect(
      detectRecurringBill(comcastNow, [priors[0], { ...priors[1], deletedAt: "2026-08-01T00:00:00.000Z" }])
    ).toBeNull();
    expect(detectRecurringBill(comcastNow, [priors[0], { ...priors[1], type: "income" }])).toBeNull();
  });

  it("caps the suggested day at the 28th so every month has it", () => {
    const late = detectRecurringBill(
      { ...comcastNow, postedAt: "2026-08-31T12:00:00.000Z" },
      [
        charge("jun", "2026-06-30T12:00:00.000Z", 90),
        charge("jul", "2026-07-31T12:00:00.000Z", 90),
      ]
    );
    expect(late?.dayOfMonth).toBe(28);
  });
});

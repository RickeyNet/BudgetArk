/**
 * BudgetArk - Subscription Detective Tests
 * File: src/utils/__tests__/subscriptionDetective.test.ts
 *
 * Monthly and yearly detection, the store/restaurant exclusions (two in a
 * month, drifting amounts), bills already on file, ignored merchants,
 * staleness, totals and ordering, and the bill fields a row creates.
 */

import { makeBudgetEntry } from "../../__tests__/fixtures";
import {
  amountsConsistent,
  detectSubscriptions,
  SUBSCRIPTION_MIN_MONTHS,
  subscriptionBillFields,
} from "../subscriptionDetective";

const NOW = "2026-09";

const charge = (merchant: string, date: string, amount: number, over = {}) =>
  makeBudgetEntry({
    id: `${merchant}-${date}`,
    merchant,
    source: "bank",
    amount,
    date: `${date}T12:00:00.000Z`,
    description: `${merchant} charge`,
    category: "Entertainment",
    ...over,
  });

const monthly = (merchant: string, amount: number, months: string[]) =>
  months.map((m) => charge(merchant, `${m}-14`, amount));

describe("amountsConsistent", () => {
  it("allows a spread within 30% of the smallest charge or $5, whichever is larger", () => {
    expect(amountsConsistent([10, 12, 9.5])).toBe(true);
    expect(amountsConsistent([100, 125, 105])).toBe(true);
    expect(amountsConsistent([100, 131, 100])).toBe(false);
    // A two-value pair can't hide a big jump behind its own midpoint.
    expect(amountsConsistent([50, 90])).toBe(false);
    expect(amountsConsistent([])).toBe(false);
  });
});

describe("detectSubscriptions - monthly", () => {
  it("finds a merchant charging once a month for the last three months", () => {
    const entries = monthly("NETFLIX", 15.49, ["2026-07", "2026-08", "2026-09"]);
    const scan = detectSubscriptions(entries, { nowKey: NOW });
    expect(scan.subscriptions).toHaveLength(1);
    expect(scan.subscriptions[0]).toMatchObject({
      merchant: "NETFLIX",
      label: "NETFLIX charge",
      category: "Entertainment",
      cadence: "monthly",
      averageAmount: 15.49,
      annualCost: 185.88,
      occurrences: SUBSCRIPTION_MIN_MONTHS,
      dayOfMonth: 14,
    });
    expect(scan.annualTotal).toBe(185.88);
    expect(scan.monthlyTotal).toBe(15.49);
  });

  it("tolerates this month's charge not having hit yet, but not a two-month gap", () => {
    const recent = monthly("SPOTIFY", 11.99, ["2026-06", "2026-07", "2026-08"]);
    expect(detectSubscriptions(recent, { nowKey: NOW }).subscriptions).toHaveLength(1);
    const stale = monthly("SPOTIFY", 11.99, ["2026-05", "2026-06", "2026-07"]);
    expect(detectSubscriptions(stale, { nowKey: NOW }).subscriptions).toHaveLength(0);
  });

  it("excludes merchants with two charges in any month, or drifting amounts", () => {
    const store = [
      ...monthly("COSTCO", 80, ["2026-07", "2026-08", "2026-09"]),
      charge("COSTCO", "2026-08-20", 80),
    ];
    expect(detectSubscriptions(store, { nowKey: NOW }).subscriptions).toHaveLength(0);
    const restaurant = [
      charge("BISTRO", "2026-07-03", 40),
      charge("BISTRO", "2026-08-03", 95),
      charge("BISTRO", "2026-09-03", 60),
    ];
    expect(detectSubscriptions(restaurant, { nowKey: NOW }).subscriptions).toHaveLength(0);
  });

  it("skips merchants that already have a bill on file or a charge filed against one, deleted entries, manual entries, income, and ignored merchants", () => {
    const withBill = [
      ...monthly("HULU", 9.99, ["2026-07", "2026-08", "2026-09"]),
      makeBudgetEntry({ id: "bill", merchant: "HULU", recurring: true, amount: 9.99 }),
    ];
    expect(detectSubscriptions(withBill, { nowKey: NOW }).subscriptions).toHaveLength(0);

    const fulfilled = monthly("HULU", 9.99, ["2026-07", "2026-08", "2026-09"]).map((e, i) =>
      i === 0 ? { ...e, fulfillsRecurringId: "some-bill" } : e,
    );
    expect(detectSubscriptions(fulfilled, { nowKey: NOW }).subscriptions).toHaveLength(0);

    const deleted = monthly("HULU", 9.99, ["2026-07", "2026-08", "2026-09"]).map((e, i) =>
      i === 1 ? { ...e, deletedAt: "2026-08-20T00:00:00.000Z" } : e,
    );
    expect(detectSubscriptions(deleted, { nowKey: NOW }).subscriptions).toHaveLength(0);

    const manual = monthly("HULU", 9.99, ["2026-07", "2026-08", "2026-09"]).map((e) => ({
      ...e,
      merchant: undefined,
    }));
    expect(detectSubscriptions(manual, { nowKey: NOW }).subscriptions).toHaveLength(0);

    const income = monthly("HULU", 9.99, ["2026-07", "2026-08", "2026-09"]).map((e) => ({
      ...e,
      type: "income" as const,
    }));
    expect(detectSubscriptions(income, { nowKey: NOW }).subscriptions).toHaveLength(0);

    const ok = monthly("HULU", 9.99, ["2026-07", "2026-08", "2026-09"]);
    expect(
      detectSubscriptions(ok, { nowKey: NOW, ignoredMerchants: ["HULU"] }).subscriptions,
    ).toHaveLength(0);
  });

  it("orders by annual cost and sums the totals", () => {
    const entries = [
      ...monthly("CHEAP", 5, ["2026-07", "2026-08", "2026-09"]),
      ...monthly("PRICEY", 50, ["2026-07", "2026-08", "2026-09"]),
    ];
    const scan = detectSubscriptions(entries, { nowKey: NOW });
    expect(scan.subscriptions.map((s) => s.merchant)).toEqual(["PRICEY", "CHEAP"]);
    expect(scan.annualTotal).toBe(660);
    expect(scan.monthlyTotal).toBe(55);
  });
});

describe("detectSubscriptions - yearly", () => {
  it("finds one charge a year in consecutive years around the same month", () => {
    const entries = [charge("AMAZON PRIME", "2024-09-10", 139), charge("AMAZON PRIME", "2025-10-02", 139)];
    const scan = detectSubscriptions(entries, { nowKey: NOW });
    expect(scan.subscriptions[0]).toMatchObject({
      cadence: "yearly",
      averageAmount: 139,
      annualCost: 139,
      occurrences: 2,
      lastDate: "2025-10-02T12:00:00.000Z",
    });
    expect(scan.monthlyTotal).toBe(11.58);
  });

  it("rejects a lapsed yearly charge, non-consecutive years, drifting months, or drifting amounts", () => {
    const lapsed = [charge("X", "2023-09-10", 50), charge("X", "2024-09-10", 50)];
    expect(detectSubscriptions(lapsed, { nowKey: NOW }).subscriptions).toHaveLength(0);
    const skipped = [charge("X", "2024-09-10", 50), charge("X", "2026-09-10", 50)];
    expect(detectSubscriptions(skipped, { nowKey: NOW }).subscriptions).toHaveLength(0);
    const drifted = [charge("X", "2025-03-10", 50), charge("X", "2026-09-10", 50)];
    expect(detectSubscriptions(drifted, { nowKey: NOW }).subscriptions).toHaveLength(0);
    const pricier = [charge("X", "2025-09-10", 50), charge("X", "2026-09-10", 90)];
    expect(detectSubscriptions(pricier, { nowKey: NOW }).subscriptions).toHaveLength(0);
  });

  it("rejects charges in consecutive calendar years that are only days apart", () => {
    // A monthly subscription that started in late December, seen in January:
    // two charges a week apart must not read as a $31/yr subscription.
    const newYear = [charge("LOCAL BISTRO", "2025-12-28", 30), charge("LOCAL BISTRO", "2026-01-03", 31)];
    expect(detectSubscriptions(newYear, { nowKey: "2026-01" }).subscriptions).toHaveLength(0);
    // Ten months apart is still not a year.
    const tenMonths = [charge("X", "2025-02-10", 50), charge("X", "2025-12-10", 50)];
    expect(detectSubscriptions(tenMonths, { nowKey: "2026-01" }).subscriptions).toHaveLength(0);
    // Thirteen months (one month of drift) still counts.
    const thirteen = [charge("X", "2024-11-10", 50), charge("X", "2025-12-10", 50)];
    expect(detectSubscriptions(thirteen, { nowKey: "2026-01" }).subscriptions).toHaveLength(1);
  });

  it("does not report a single charge", () => {
    expect(
      detectSubscriptions([charge("X", "2026-09-10", 50)], { nowKey: NOW }).subscriptions,
    ).toHaveLength(0);
  });
});

describe("subscriptionBillFields", () => {
  it("builds a recurring expense on the usual day, clamped, with the cadence interval and merchant", () => {
    const scan = detectSubscriptions(monthly("NETFLIX", 15.49, ["2026-07", "2026-08", "2026-09"]), {
      nowKey: NOW,
    });
    const fields = subscriptionBillFields(scan.subscriptions[0], "2026-09", 30);
    expect(fields).toEqual({
      type: "expense",
      category: "Entertainment",
      amount: 15.49,
      description: "NETFLIX charge",
      date: "2026-09-14",
      recurring: true,
      recurrenceInterval: 1,
      merchant: "NETFLIX",
    });
    const yearly = detectSubscriptions(
      [charge("PRIME", "2024-09-30", 139), charge("PRIME", "2025-09-30", 139)],
      { nowKey: NOW },
    ).subscriptions[0];
    // Day 30 -> 28 cap, then the month's last day.
    expect(subscriptionBillFields(yearly, "2026-02", 28)).toMatchObject({
      date: "2026-02-28",
      recurrenceInterval: 12,
    });
  });
});

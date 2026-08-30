import { makeBudgetEntry, makeBudgetLimit } from "../../__tests__/fixtures";
import { buildTrackingStrip, describeDaysSince } from "../trackingStrip";

const NOW = new Date("2026-08-29T18:00:00.000Z");
const at = (day: number, hour = 12) =>
  `2026-08-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00:00.000Z`;

const bill = makeBudgetEntry({
  id: "bill",
  recurring: true,
  category: "Utilities",
  description: "Electric",
  amount: 120,
  date: "2026-06-05T12:00:00.000Z",
  createdAt: "2026-06-01T12:00:00.000Z",
});

const entries = [
  bill,
  makeBudgetEntry({ id: "a", description: "Trader Joe's", category: "Grocery", amount: 64.2, date: at(28), createdAt: at(28, 9) }),
  makeBudgetEntry({ id: "b", description: "Shell", category: "Transportation", amount: 41, date: at(27), createdAt: at(27, 20) }),
  makeBudgetEntry({ id: "c", description: "", category: "Utilities", amount: 137.5, date: at(27), createdAt: at(27, 8), fulfillsRecurringId: "bill" }),
  makeBudgetEntry({ id: "d", description: "Coffee", category: "Restaurant", amount: 5, date: at(20), createdAt: at(20) }),
  makeBudgetEntry({ id: "pay", type: "income", category: "Salary", description: "Paycheck", amount: 2000, date: at(15), createdAt: at(15) }),
  makeBudgetEntry({ id: "gone", description: "Deleted", amount: 999, date: at(29), createdAt: at(29), deletedAt: at(29) }),
];

describe("buildTrackingStrip", () => {
  it("sums month-to-date expenses the way the Budget tab does (actual replaces the bill estimate)", () => {
    const strip = buildTrackingStrip({ entries, limits: [], monthKey: "2026-08", now: NOW });
    // 64.2 + 41 + 137.5 + 5; the electric estimate (120) is replaced by its actual.
    expect(strip.spentThisMonth).toBe(247.7);
    expect(strip.totalLimits).toBeNull();
  });

  it("totals live positive limits only", () => {
    const strip = buildTrackingStrip({
      entries,
      limits: [
        makeBudgetLimit({ category: "Grocery", monthlyLimit: 400 }),
        makeBudgetLimit({ category: "Shopping", monthlyLimit: 100, deletedAt: at(1) }),
        makeBudgetLimit({ category: "Other", monthlyLimit: 50.5 }),
      ],
      monthKey: "2026-08",
      now: NOW,
    });
    expect(strip.totalLimits).toBe(450.5);
  });

  it("lists the newest logged entries by creation time, skipping recurring templates and deleted rows", () => {
    const strip = buildTrackingStrip({ entries, limits: [], monthKey: "2026-08", now: NOW });
    expect(strip.recent.map((r) => r.id)).toEqual(["a", "b", "c"]);
    expect(strip.recent[2]).toMatchObject({
      label: "Utilities",
      billLabel: "Electric",
      amount: 137.5,
      type: "expense",
    });
    expect(strip.recent[0].billLabel).toBeNull();
  });

  it("measures days since the newest logged entry, ignoring projections", () => {
    expect(buildTrackingStrip({ entries, limits: [], monthKey: "2026-08", now: NOW }).daysSinceLastEntry).toBe(1);
    expect(
      buildTrackingStrip({ entries: [bill], limits: [], monthKey: "2026-08", now: NOW }).daysSinceLastEntry
    ).toBeNull();
    expect(
      buildTrackingStrip({
        entries: [makeBudgetEntry({ id: "x", createdAt: at(29, 17), date: at(29) })],
        limits: [],
        monthKey: "2026-08",
        now: NOW,
      }).daysSinceLastEntry
    ).toBe(0);
  });

  it("honours recentCount", () => {
    expect(
      buildTrackingStrip({ entries, limits: [], monthKey: "2026-08", now: NOW, recentCount: 5 }).recent
    ).toHaveLength(5);
  });
});

describe("describeDaysSince", () => {
  it("phrases the habit line", () => {
    expect(describeDaysSince(null)).toBe("nothing logged yet");
    expect(describeDaysSince(0)).toBe("logged today");
    expect(describeDaysSince(1)).toBe("last entry yesterday");
    expect(describeDaysSince(4)).toBe("last entry 4 days ago");
  });
});

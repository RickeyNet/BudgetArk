import {
  computeBusinessReport,
  buildBusinessReportCsv,
  currentMonthKey,
} from "../businessReport";
import type { BudgetEntry, Business } from "../../types";

const business = (over: Partial<Business> = {}): Business => ({
  id: "b1",
  name: "Acme Consulting LLC",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

const entry = (over: Partial<BudgetEntry> = {}): BudgetEntry => ({
  id: "e1",
  type: "expense",
  category: "Tech",
  amount: 100,
  date: "2026-03-15T12:00:00.000Z",
  createdAt: "2026-03-15T12:00:00.000Z",
  updatedAt: "2026-03-15T12:00:00.000Z",
  businessId: "b1",
  ...over,
});

describe("computeBusinessReport", () => {
  it("totals per business, expenses only, year-filtered", () => {
    const report = computeBusinessReport(
      [
        entry({ id: "e1", amount: 100 }),
        entry({ id: "e2", amount: 50, category: "Travel" }),
        // Income never counts even if somehow tagged.
        entry({ id: "e3", type: "income", category: "Freelance", amount: 999 }),
        // Untagged expense ignored.
        entry({ id: "e4", businessId: undefined, amount: 77 }),
        // Wrong year ignored.
        entry({ id: "e5", date: "2025-03-15T12:00:00.000Z", amount: 500 }),
      ],
      [business()],
      2026,
      "2026-12"
    );
    expect(report.perBusiness).toHaveLength(1);
    const acme = report.perBusiness[0];
    expect(acme.total).toBe(150);
    expect(acme.entryCount).toBe(2);
    expect(report.grandTotal).toBe(150);
    expect(acme.byMonth[2]).toBe(150); // March
    expect(acme.deleted).toBe(false);
  });

  it("expands recurring entries per cadence, capped at nowKey", () => {
    const report = computeBusinessReport(
      [
        entry({ id: "monthly", amount: 10, recurring: true, date: "2026-01-10T12:00:00.000Z" }),
        entry({
          id: "quarterly",
          amount: 100,
          recurring: true,
          recurrenceInterval: 3,
          date: "2026-01-10T12:00:00.000Z",
        }),
      ],
      [business()],
      2026,
      "2026-07" // cap mid-year: monthly hits Jan-Jul (7), quarterly Jan/Apr/Jul (3)
    );
    const acme = report.perBusiness[0];
    expect(acme.total).toBe(7 * 10 + 3 * 100);
    expect(acme.entryCount).toBe(10);
    const monthlyLines = acme.lines.filter((l) => l.entryId === "monthly");
    expect(monthlyLines).toHaveLength(7);
    expect(monthlyLines[0].projected).toBe(false);
    expect(monthlyLines[1].projected).toBe(true);
  });

  it("groups unknown business ids as a deleted pseudo-business and flags tombstoned ones", () => {
    const report = computeBusinessReport(
      [
        entry({ id: "e1", businessId: "gone-id" }),
        entry({ id: "e2", businessId: "b-tomb", amount: 30 }),
      ],
      [
        business({
          id: "b-tomb",
          name: "Old Hustle",
          deletedAt: "2026-05-01T00:00:00.000Z",
        }),
      ],
      2026,
      "2026-12"
    );
    const byId = Object.fromEntries(report.perBusiness.map((g) => [g.businessId, g]));
    expect(byId["gone-id"].name).toBe("(deleted business)");
    expect(byId["gone-id"].deleted).toBe(true);
    expect(byId["b-tomb"].name).toBe("Old Hustle");
    expect(byId["b-tomb"].deleted).toBe(true);
  });

  it("counts receipts and breaks down by category, sorted by total", () => {
    const report = computeBusinessReport(
      [
        entry({
          id: "e1",
          amount: 20,
          category: "Tech",
          attachments: [{ id: "a1", createdAt: "2026-03-15T12:00:00.000Z" }],
        }),
        entry({ id: "e2", amount: 300, category: "Travel" }),
      ],
      [business()],
      2026,
      "2026-12"
    );
    const acme = report.perBusiness[0];
    expect(acme.receiptCount).toBe(1);
    expect(acme.byCategory).toEqual([
      { category: "Travel", total: 300 },
      { category: "Tech", total: 20 },
    ]);
  });

  it("skips tombstoned entries and returns an empty report for a future year", () => {
    const report = computeBusinessReport(
      [entry({ deletedAt: "2026-04-01T00:00:00.000Z" })],
      [business()],
      2026,
      "2026-12"
    );
    expect(report.perBusiness).toHaveLength(0);
    expect(report.grandTotal).toBe(0);

    const future = computeBusinessReport([entry()], [business()], 2027, "2026-12");
    expect(future.perBusiness).toHaveLength(0);
  });

  it("clamps a day-31 recurring bill to shorter months", () => {
    const report = computeBusinessReport(
      [entry({ recurring: true, date: "2026-01-31T12:00:00.000Z" })],
      [business()],
      2026,
      "2026-02"
    );
    const feb = report.perBusiness[0].lines.find((l) => l.monthKey === "2026-02");
    expect(feb?.date).toBe("2026-02-28");
  });

  it("currentMonthKey formats a local YYYY-MM", () => {
    expect(currentMonthKey(new Date(2026, 6, 12))).toBe("2026-07");
  });
});

describe("buildBusinessReportCsv", () => {
  it("emits header + rows with proper escaping", () => {
    const report = computeBusinessReport(
      [
        entry({
          id: "e1",
          amount: 12.5,
          description: 'Monitor, 27" (office)',
        }),
      ],
      [business({ name: "Acme, LLC" })],
      2026,
      "2026-12"
    );
    const csv = buildBusinessReportCsv(report);
    const [header, row] = csv.split("\n");
    expect(header).toBe("Date,Business,Category,Description,Amount,Recurring,HasReceipt");
    expect(row).toContain('"Acme, LLC"');
    expect(row).toContain('"Monitor, 27"" (office)"');
    expect(row).toContain("12.5");
    expect(row).toContain("no,no");
  });

  it("defuses formula-injection cells", () => {
    const report = computeBusinessReport(
      [entry({ description: "=HYPERLINK(evil)" })],
      [business()],
      2026,
      "2026-12"
    );
    const csv = buildBusinessReportCsv(report);
    expect(csv).toContain("'=HYPERLINK(evil)");
  });
});

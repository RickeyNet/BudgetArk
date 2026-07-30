import { computePersonReport, buildPersonReportCsv } from "../personReport";
import type { BudgetEntry, Person } from "../../types";

const person = (over: Partial<Person> = {}): Person => ({
  id: "per1",
  name: "Sam",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

const entry = (over: Partial<BudgetEntry> = {}): BudgetEntry => ({
  id: "e1",
  type: "expense",
  category: "Grocery",
  amount: 100,
  date: "2026-03-15T12:00:00.000Z",
  createdAt: "2026-03-15T12:00:00.000Z",
  updatedAt: "2026-03-15T12:00:00.000Z",
  personId: "per1",
  ...over,
});

describe("computePersonReport", () => {
  it("totals per person, expenses only, year-filtered", () => {
    const report = computePersonReport(
      [
        entry({ id: "e1", amount: 100 }),
        entry({ id: "e2", amount: 50, category: "Shopping" }),
        // Income never counts even if somehow assigned.
        entry({ id: "e3", type: "income", category: "Salary", amount: 999 }),
        // Unassigned expense ignored.
        entry({ id: "e4", personId: undefined, amount: 77 }),
        // Wrong year ignored.
        entry({ id: "e5", date: "2025-03-15T12:00:00.000Z", amount: 500 }),
      ],
      [person()],
      2026,
      "2026-12"
    );
    expect(report.perPerson).toHaveLength(1);
    const sam = report.perPerson[0];
    expect(sam.total).toBe(150);
    expect(sam.entryCount).toBe(2);
    expect(report.grandTotal).toBe(150);
    expect(sam.byMonth[2]).toBe(150); // March
    expect(sam.deleted).toBe(false);
  });

  it("expands recurring entries per cadence, capped at nowKey", () => {
    const report = computePersonReport(
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
      [person()],
      2026,
      "2026-07" // cap mid-year: monthly hits Jan-Jul (7), quarterly Jan/Apr/Jul (3)
    );
    const sam = report.perPerson[0];
    expect(sam.total).toBe(7 * 10 + 3 * 100);
    expect(sam.entryCount).toBe(10);
    const monthlyLines = sam.lines.filter((l) => l.entryId === "monthly");
    expect(monthlyLines).toHaveLength(7);
    expect(monthlyLines[0].projected).toBe(false);
    expect(monthlyLines[1].projected).toBe(true);
  });

  it("groups unknown person ids as a deleted pseudo-person and flags tombstoned ones", () => {
    const report = computePersonReport(
      [
        entry({ id: "e1", personId: "gone-id" }),
        entry({ id: "e2", personId: "per-tomb", amount: 30 }),
      ],
      [
        person({
          id: "per-tomb",
          name: "Old Roommate",
          deletedAt: "2026-05-01T00:00:00.000Z",
        }),
      ],
      2026,
      "2026-12"
    );
    const byId = Object.fromEntries(report.perPerson.map((g) => [g.personId, g]));
    expect(byId["gone-id"].name).toBe("(deleted person)");
    expect(byId["gone-id"].deleted).toBe(true);
    expect(byId["per-tomb"].name).toBe("Old Roommate");
    expect(byId["per-tomb"].deleted).toBe(true);
  });

  it("breaks down by category, sorted by total", () => {
    const report = computePersonReport(
      [
        entry({ id: "e1", amount: 20, category: "Grocery" }),
        entry({ id: "e2", amount: 300, category: "Shopping" }),
      ],
      [person()],
      2026,
      "2026-12"
    );
    expect(report.perPerson[0].byCategory).toEqual([
      { category: "Shopping", total: 300 },
      { category: "Grocery", total: 20 },
    ]);
  });

  it("skips tombstoned entries and returns an empty report for a future year", () => {
    const report = computePersonReport(
      [entry({ deletedAt: "2026-04-01T00:00:00.000Z" })],
      [person()],
      2026,
      "2026-12"
    );
    expect(report.perPerson).toHaveLength(0);
    expect(report.grandTotal).toBe(0);

    const future = computePersonReport([entry()], [person()], 2027, "2026-12");
    expect(future.perPerson).toHaveLength(0);
  });

  it("clamps a day-31 recurring bill to shorter months", () => {
    const report = computePersonReport(
      [entry({ recurring: true, date: "2026-01-31T12:00:00.000Z" })],
      [person()],
      2026,
      "2026-02"
    );
    const feb = report.perPerson[0].lines.find((l) => l.monthKey === "2026-02");
    expect(feb?.date).toBe("2026-02-28");
  });
});

describe("buildPersonReportCsv", () => {
  it("emits header + rows with proper escaping", () => {
    const report = computePersonReport(
      [
        entry({
          id: "e1",
          amount: 12.5,
          description: 'Snacks, "movie night"',
        }),
      ],
      [person({ name: "Sam, Jr." })],
      2026,
      "2026-12"
    );
    const csv = buildPersonReportCsv(report);
    const [header, row] = csv.split("\n");
    expect(header).toBe("Date,Person,Category,Description,Amount,Recurring");
    expect(row).toContain('"Sam, Jr."');
    expect(row).toContain('"Snacks, ""movie night"""');
    expect(row).toContain("12.5");
    expect(row).toContain("no");
  });

  it("defuses formula-injection cells", () => {
    const report = computePersonReport(
      [entry({ description: "=HYPERLINK(evil)" })],
      [person()],
      2026,
      "2026-12"
    );
    const csv = buildPersonReportCsv(report);
    expect(csv).toContain("'=HYPERLINK(evil)");
  });
});

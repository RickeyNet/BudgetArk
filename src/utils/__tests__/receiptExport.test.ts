/**
 * Receipt zip export planning tests (pure - no filesystem/zip involved).
 * Plans are derived from computeBusinessReport output so the tests exercise
 * the real report shape, including recurring-entry expansion.
 */

import { computeBusinessReport } from "../businessReport";
import { planReceiptExport } from "../receiptExport";
import type { BudgetEntry, Business } from "../../types";

const entry = (over: Partial<BudgetEntry> & { id: string }): BudgetEntry =>
  ({
    type: "expense",
    category: "Supplies",
    amount: 84.2,
    date: "2026-04-02",
    createdAt: "2026-04-02T00:00:00.000Z",
    businessId: "b1",
    ...over,
  }) as BudgetEntry;

const businesses: Business[] = [
  {
    id: "b1",
    name: "Etsy shop",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

const NOW_KEY = "2026-12";

describe("planReceiptExport", () => {
  it("names files date_business_amount.jpg to match the CSV rows", () => {
    const entries = [
      entry({ id: "e1", attachments: [{ id: "att-1", createdAt: "x" }] }),
    ];
    const report = computeBusinessReport(entries, businesses, 2026, NOW_KEY);
    expect(planReceiptExport(report, entries)).toEqual([
      { attachmentId: "att-1", fileName: "2026-04-02_Etsy-shop_84.20.jpg" },
    ]);
  });

  it("suffixes additional photos on the same entry with _2, _3", () => {
    const entries = [
      entry({
        id: "e1",
        attachments: [
          { id: "att-1", createdAt: "x" },
          { id: "att-2", createdAt: "x" },
          { id: "att-3", createdAt: "x" },
        ],
      }),
    ];
    const report = computeBusinessReport(entries, businesses, 2026, NOW_KEY);
    expect(planReceiptExport(report, entries).map((p) => p.fileName)).toEqual([
      "2026-04-02_Etsy-shop_84.20.jpg",
      "2026-04-02_Etsy-shop_84.20_2.jpg",
      "2026-04-02_Etsy-shop_84.20_3.jpg",
    ]);
  });

  it("includes a recurring entry's photo ONCE, dated at its earliest in-year occurrence", () => {
    const entries = [
      entry({
        id: "e1",
        date: "2026-02-10",
        recurring: true,
        attachments: [{ id: "att-1", createdAt: "x" }],
      }),
    ];
    const report = computeBusinessReport(entries, businesses, 2026, NOW_KEY);
    // The report expands Feb..Dec (11 lines) but the photo exists once.
    expect(
      report.perBusiness[0].lines.filter((l) => l.entryId === "e1").length
    ).toBeGreaterThan(1);
    const plan = planReceiptExport(report, entries);
    expect(plan).toHaveLength(1);
    expect(plan[0].fileName).toBe("2026-02-10_Etsy-shop_84.20.jpg");
  });

  it("de-collides two entries with the same date, business, and amount", () => {
    const entries = [
      entry({ id: "e1", attachments: [{ id: "att-1", createdAt: "x" }] }),
      entry({ id: "e2", attachments: [{ id: "att-2", createdAt: "x" }] }),
    ];
    const report = computeBusinessReport(entries, businesses, 2026, NOW_KEY);
    const names = planReceiptExport(report, entries).map((p) => p.fileName);
    expect(new Set(names).size).toBe(2);
    expect(names).toContain("2026-04-02_Etsy-shop_84.20.jpg");
  });

  it("slugifies awkward business names and never produces an empty slug", () => {
    const weird: Business[] = [
      {
        id: "b1",
        name: 'A/B: "Süper" *Shop*?',
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "b2",
        name: "///",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    const entries = [
      entry({ id: "e1", attachments: [{ id: "att-1", createdAt: "x" }] }),
      entry({
        id: "e2",
        businessId: "b2",
        attachments: [{ id: "att-2", createdAt: "x" }],
      }),
    ];
    const report = computeBusinessReport(entries, weird, 2026, NOW_KEY);
    const names = planReceiptExport(report, entries).map((p) => p.fileName);
    for (const name of names) {
      expect(name).toMatch(/^[A-Za-z0-9._-]+\.jpg$/);
    }
    expect(names.some((n) => n.includes("_business_"))).toBe(true); // "///" fallback
  });

  it("skips entries without receipts and returns [] for a receipt-less year", () => {
    const entries = [entry({ id: "e1" })];
    const report = computeBusinessReport(entries, businesses, 2026, NOW_KEY);
    expect(planReceiptExport(report, entries)).toEqual([]);
  });
});

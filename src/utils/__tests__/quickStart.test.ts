import {
  QUICK_START_TEMPLATES,
  quickStartTemplateById,
  type QuickStartTemplate,
} from "../../data/quickStartTemplates";
import { buildQuickStartSeed, parseQuickStartAmount } from "../quickStart";

const NOW = "2026-08-29T12:00:00.000Z";
const byId = (id: QuickStartTemplate["id"]) => quickStartTemplateById(id) as QuickStartTemplate;

describe("QUICK_START_TEMPLATES", () => {
  it("offers the four documented starting points with sane allocations", () => {
    expect(QUICK_START_TEMPLATES.map((t) => t.id)).toEqual([
      "single",
      "couple",
      "debt-heavy",
      "zero-based",
    ]);
    for (const template of QUICK_START_TEMPLATES) {
      const total = Object.values(template.allocations).reduce((s, p) => s + (p ?? 0), 0);
      expect(total).toBeLessThanOrEqual(100);
      expect(total).toBeGreaterThanOrEqual(70);
      expect(template.allocations.Housing).toBeGreaterThan(0);
    }
    // Zero-based and the two balanced ones assign everything; debt-heavy
    // deliberately leaves room for debt payments the Debts tab plans.
    expect(Object.values(byId("zero-based").allocations).reduce((s, p) => s + (p ?? 0), 0)).toBe(100);
    expect(Object.values(byId("debt-heavy").allocations).reduce((s, p) => s + (p ?? 0), 0)).toBeLessThan(80);
    expect(quickStartTemplateById(null)).toBeNull();
  });
});

describe("parseQuickStartAmount", () => {
  it("accepts formatted money and rejects junk or zero", () => {
    expect(parseQuickStartAmount("$2,400")).toBe(2400);
    expect(parseQuickStartAmount(" 1850.5 ")).toBe(1850.5);
    expect(parseQuickStartAmount("0")).toBeNull();
    expect(parseQuickStartAmount("abc")).toBeNull();
    expect(parseQuickStartAmount("")).toBeNull();
  });
});

describe("buildQuickStartSeed", () => {
  it("seeds income + housing lines and tidy limits sized from take-home pay", () => {
    const seed = buildQuickStartSeed(byId("single"), {
      monthKey: "2026-08",
      now: NOW,
      income: 3137,
      housing: 1200,
    });
    expect(seed.entries).toEqual([
      expect.objectContaining({
        type: "income",
        category: "Salary",
        amount: 3137,
        recurring: true,
        recurrenceInterval: 1,
        date: "2026-08-01T12:00:00.000Z",
      }),
      expect.objectContaining({ type: "expense", category: "Housing", amount: 1200, recurring: true }),
    ]);
    const limit = (c: string) => seed.limits.find((l) => l.category === c)?.monthlyLimit;
    expect(limit("Housing")).toBe(1200); // the real payment, not 30%
    expect(limit("Grocery")).toBe(315); // 313.7 -> nearest 5
    expect(limit("Savings")).toBe(470); // 470.55 -> 470
    expect(seed.limits.every((l) => l.updatedAt === NOW)).toBe(true);
    expect(seed.limits.every((l) => l.monthlyLimit % 5 === 0 || l.category === "Housing")).toBe(true);
  });

  it("makes zero-based limits total take-home pay exactly", () => {
    const income = 4321;
    const seed = buildQuickStartSeed(byId("zero-based"), {
      monthKey: "2026-08",
      now: NOW,
      income,
      housing: null,
    });
    const total = seed.limits.reduce((s, l) => s + l.monthlyLimit, 0);
    expect(Math.round(total * 100) / 100).toBe(income);
  });

  it("seeds nothing to size from without income, but keeps a given housing line", () => {
    const seed = buildQuickStartSeed(byId("couple"), {
      monthKey: "2026-08",
      now: NOW,
      income: null,
      housing: 1500,
    });
    expect(seed.limits).toEqual([]);
    expect(seed.entries).toHaveLength(1);
    expect(seed.entries[0]).toMatchObject({ category: "Housing", amount: 1500 });
    expect(
      buildQuickStartSeed(byId("couple"), { monthKey: "2026-08", now: NOW, income: null, housing: null })
    ).toEqual({ entries: [], limits: [] });
  });
});

import {
  businessEntriesForMonth,
  incomeTrackedBusinessIds,
  personalEntriesForMonth,
  personalMonth,
  summarizeBusinessEntries,
} from "../businessProfit";
import type { BudgetEntry } from "../../types";

const entry = (over: Partial<BudgetEntry> = {}): BudgetEntry => ({
  id: "e1",
  type: "expense",
  category: "Tech",
  amount: 100,
  date: "2026-03-15T12:00:00.000Z",
  createdAt: "2026-03-15T12:00:00.000Z",
  updatedAt: "2026-03-15T12:00:00.000Z",
  ...over,
});

const income = (over: Partial<BudgetEntry> = {}): BudgetEntry =>
  entry({ type: "income", category: "Freelance", ...over });

describe("incomeTrackedBusinessIds", () => {
  it("lists only businesses with live tagged income", () => {
    const ids = incomeTrackedBusinessIds([
      income({ id: "i1", businessId: "shop" }),
      entry({ id: "e1", businessId: "llc" }),
      income({ id: "i2", businessId: "gone", deletedAt: "2026-03-20T00:00:00.000Z" }),
      income({ id: "i3" }),
    ]);
    expect(Array.from(ids)).toEqual(["shop"]);
  });
});

describe("personalMonth", () => {
  it("counts only the profit of a business that made money", () => {
    const month = personalMonth(
      [
        income({ id: "pay", amount: 3000, category: "Salary" }),
        entry({ id: "rent", amount: 1200, category: "Housing" }),
        income({ id: "i1", amount: 1500, businessId: "shop" }),
        entry({ id: "b1", amount: 1000, businessId: "shop" }),
      ],
      "2026-03"
    );
    expect(month.entries.map((e) => e.id)).toEqual(["pay", "rent"]);
    expect(month.businesses).toHaveLength(1);
    expect(month.businesses[0]).toMatchObject({
      businessId: "shop",
      income: 1500,
      expenses: 1000,
      net: 500,
      profit: 500,
    });
    expect(month.businesses[0].entries.map((e) => e.id)).toEqual(["i1", "b1"]);
    expect(month.businessProfit).toBe(500);
  });

  it("counts nothing for a business that lost money - neither its income nor its bills", () => {
    const month = personalMonth(
      [
        income({ id: "pay", amount: 3000, category: "Salary" }),
        income({ id: "i1", amount: 800, businessId: "shop" }),
        entry({ id: "b1", amount: 1000, businessId: "shop" }),
      ],
      "2026-03"
    );
    expect(month.entries.map((e) => e.id)).toEqual(["pay"]);
    expect(month.businesses[0]).toMatchObject({ net: -200, profit: 0 });
    expect(month.businessProfit).toBe(0);
  });

  it("nets each business on its own - one's loss never eats another's profit", () => {
    const month = personalMonth(
      [
        income({ id: "i1", amount: 900, businessId: "shop" }),
        entry({ id: "b1", amount: 400, businessId: "shop" }),
        income({ id: "i2", amount: 100, businessId: "gig" }),
        entry({ id: "b2", amount: 700, businessId: "gig" }),
      ],
      "2026-03"
    );
    expect(month.businesses.map((b) => [b.businessId, b.profit])).toEqual([
      ["shop", 500],
      ["gig", 0],
    ]);
    expect(month.businessProfit).toBe(500);
  });

  it("leaves an expense-only business in the personal budget untouched", () => {
    const entries = [
      entry({ id: "b1", amount: 250, businessId: "llc" }),
      entry({ id: "rent", amount: 1200, category: "Housing" }),
    ];
    const month = personalMonth(entries, "2026-03");
    expect(month.entries.map((e) => e.id)).toEqual(["b1", "rent"]);
    expect(month.businesses).toEqual([]);
    expect(month.businessProfit).toBe(0);
  });

  it("reads a month with only bills as a loss once the business tracks income", () => {
    const entries = [
      income({ id: "i1", amount: 900, businessId: "shop", date: "2026-02-10T12:00:00.000Z" }),
      entry({ id: "b1", amount: 300, businessId: "shop" }),
    ];
    const march = personalMonth(entries, "2026-03");
    expect(march.entries).toEqual([]);
    expect(march.businesses[0]).toMatchObject({ income: 0, expenses: 300, profit: 0 });
    expect(personalMonth(entries, "2026-02").businessProfit).toBe(900);
  });

  it("projects a business's recurring entries like any other", () => {
    const entries = [
      income({
        id: "retainer",
        amount: 1000,
        businessId: "shop",
        recurring: true,
        date: "2026-01-05T12:00:00.000Z",
      }),
      entry({
        id: "hosting",
        amount: 40,
        businessId: "shop",
        recurring: true,
        date: "2026-01-20T12:00:00.000Z",
      }),
    ];
    const month = personalMonth(entries, "2026-03");
    expect(month.businesses[0]).toMatchObject({ income: 1000, expenses: 40, profit: 960 });
    expect(month.entries).toEqual([]);
  });

  it("ignores deleted income when deciding which businesses are netted", () => {
    const entries = [
      income({ id: "i1", businessId: "shop", deletedAt: "2026-03-20T00:00:00.000Z" }),
      entry({ id: "b1", amount: 75, businessId: "shop" }),
    ];
    expect(personalMonth(entries, "2026-03").businesses).toEqual([]);
  });
});

describe("month helpers", () => {
  const entries = [
    income({ id: "i1", amount: 500, businessId: "shop" }),
    entry({ id: "b1", amount: 120.1, businessId: "shop" }),
    entry({ id: "b2", amount: 30.2, businessId: "shop" }),
    entry({ id: "p1", amount: 60 }),
  ];

  it("split a month into personal and business entries with nothing lost", () => {
    expect(personalEntriesForMonth(entries, "2026-03").map((e) => e.id)).toEqual(["p1"]);
    expect(businessEntriesForMonth(entries, "2026-03").map((e) => e.id)).toEqual([
      "i1",
      "b1",
      "b2",
    ]);
  });

  it("round to cents and net a partial list", () => {
    const [line] = summarizeBusinessEntries(entries.slice(0, 3));
    expect(line.expenses).toBe(150.3);
    expect(line.net).toBe(349.7);
    expect(summarizeBusinessEntries([])).toEqual([]);
  });
});

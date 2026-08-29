import { makeBudgetEntry, makeBudgetLimit } from "../../__tests__/fixtures";
import {
  buildLimitSheetRows,
  type BudgetLimitHistory,
  limitsFromDrafts,
  resolveLimitsForMonth,
  suggestLimitFromAverage,
} from "../limitsSheet";

const history: BudgetLimitHistory = {
  "2026-05": [makeBudgetLimit({ category: "Grocery", monthlyLimit: 400 })],
  "2026-07": [
    makeBudgetLimit({ category: "Grocery", monthlyLimit: 450 }),
    makeBudgetLimit({ category: "Restaurant", monthlyLimit: 120, deletedAt: "2026-07-20T00:00:00.000Z" }),
  ],
};

const spend = (id: string, month: string, category: string, amount: number) =>
  makeBudgetEntry({ id, date: `${month}-10T12:00:00.000Z`, category, amount });

describe("resolveLimitsForMonth", () => {
  it("uses the month's own record, else the latest earlier month, live limits only", () => {
    expect(resolveLimitsForMonth(history, "2026-07").map((l) => l.category)).toEqual(["Grocery"]);
    expect(resolveLimitsForMonth(history, "2026-06")[0].monthlyLimit).toBe(400);
    expect(resolveLimitsForMonth(history, "2026-08")[0].monthlyLimit).toBe(450);
    expect(resolveLimitsForMonth(history, "2026-04")).toEqual([]);
  });
});

describe("buildLimitSheetRows", () => {
  const entries = [
    spend("a", "2026-07", "Grocery", 410),
    spend("b", "2026-06", "Grocery", 380),
    spend("c", "2026-05", "Grocery", 300),
    spend("d", "2026-06", "Restaurant", 90),
    spend("e", "2026-08", "Grocery", 120),
    makeBudgetEntry({ id: "inc", type: "income", category: "Salary", amount: 5000, date: "2026-07-01T12:00:00.000Z" }),
  ];

  it("joins current and last-month limits with this month's spend and the lookback average", () => {
    const rows = buildLimitSheetRows({
      categories: ["Grocery", "Restaurant", "Shopping"],
      monthKey: "2026-08",
      history,
      entries,
    });
    expect(rows[0]).toEqual({
      category: "Grocery",
      current: 450,
      lastMonth: 450,
      averageSpend: 363.33, // (410 + 380 + 300) / 3
      spentThisMonth: 120,
    });
    // Restaurant spent in one of three months: averaged over the 3 months
    // that had ANY spending (30), not over one.
    expect(rows[1]).toMatchObject({ current: null, lastMonth: null, averageSpend: 30, spentThisMonth: 0 });
    expect(rows[2]).toMatchObject({ averageSpend: null });
  });

  it("averages only over months that had any expense data", () => {
    const rows = buildLimitSheetRows({
      categories: ["Grocery"],
      monthKey: "2026-08",
      history: {},
      entries: [spend("x", "2026-07", "Grocery", 200)],
    });
    expect(rows[0].averageSpend).toBe(200);
    expect(
      buildLimitSheetRows({ categories: ["Grocery"], monthKey: "2026-08", history: {}, entries: [] })[0]
        .averageSpend
    ).toBeNull();
  });
});

describe("suggestLimitFromAverage", () => {
  it("rounds up to the nearest 10 with a floor of 10", () => {
    expect(suggestLimitFromAverage(363.33)).toBe(370);
    expect(suggestLimitFromAverage(370)).toBe(370);
    expect(suggestLimitFromAverage(3)).toBe(10);
  });
});

describe("limitsFromDrafts", () => {
  const existing = [
    makeBudgetLimit({ category: "Grocery", monthlyLimit: 450, updatedAt: "2026-07-01T00:00:00.000Z" }),
    makeBudgetLimit({ category: "Shopping", monthlyLimit: 100, updatedAt: "2026-07-01T00:00:00.000Z" }),
  ];

  it("keeps unchanged limits' timestamps, stamps changed ones, drops blanks and zeros", () => {
    const next = limitsFromDrafts(
      { Grocery: "450", Shopping: "", Restaurant: "80.5", Other: "0", Bad: "abc" },
      existing,
      "2026-08-29T00:00:00.000Z"
    );
    expect(next).toEqual([
      existing[0],
      { category: "Restaurant", monthlyLimit: 80.5, updatedAt: "2026-08-29T00:00:00.000Z" },
    ]);
  });
});

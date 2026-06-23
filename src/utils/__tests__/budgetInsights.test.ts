import {
  buildMonthSummaries,
  computeCategoryChanges,
  computeCategorySpendingComparisons,
  computeStreaks,
  buildMonthlyReview,
  type MonthSummary,
} from "../budgetInsights";

/** Build a MonthSummary directly so the summary-based functions are deterministic. */
const summary = (
  monthKey: string,
  income: number,
  expenses: number,
  byCategory: Record<string, number> = {}
): MonthSummary => ({
  monthKey,
  totalIncome: income,
  totalExpenses: expenses,
  net: income - expenses,
  byCategory,
});

const getMonthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

describe("computeCategoryChanges", () => {
  it("returns [] with fewer than two months", () => {
    expect(computeCategoryChanges([summary("2026-06", 0, 0)])).toEqual([]);
  });

  it("computes delta and percent change, newest vs previous month", () => {
    const summaries = [
      summary("2026-05", 0, 150, { Food: 100, Gas: 50 }),
      summary("2026-06", 0, 230, { Food: 150, Shopping: 80 }),
    ];
    const changes = computeCategoryChanges(summaries);
    const byCat = Object.fromEntries(changes.map((c) => [c.category, c]));

    expect(byCat.Food).toMatchObject({ current: 150, previous: 100, delta: 50, percentChange: 50 });
    expect(byCat.Gas).toMatchObject({ current: 0, previous: 50, delta: -50, percentChange: -100 });
    // New category (previous 0) -> percentChange null
    expect(byCat.Shopping).toMatchObject({ current: 80, previous: 0, delta: 80, percentChange: null });
  });

  it("sorts by largest absolute delta first", () => {
    const summaries = [
      summary("2026-05", 0, 0, { Food: 100, Gas: 100 }),
      summary("2026-06", 0, 0, { Food: 150, Gas: 400 }),
    ];
    const changes = computeCategoryChanges(summaries);
    expect(changes[0].category).toBe("Gas"); // delta 300 > 50
  });

  it("skips categories that are zero in both months", () => {
    const summaries = [
      summary("2026-05", 0, 0, { Food: 100, Ghost: 0 }),
      summary("2026-06", 0, 0, { Food: 100 }),
    ];
    const cats = computeCategoryChanges(summaries).map((c) => c.category);
    expect(cats).not.toContain("Ghost");
  });
});

describe("computeCategorySpendingComparisons", () => {
  it("returns [] with fewer than two months", () => {
    expect(computeCategorySpendingComparisons([summary("2026-06", 0, 0)])).toEqual([]);
  });

  it("compares the current month against the average of prior active months", () => {
    const summaries = [
      summary("2026-03", 0, 100, { Food: 100 }),
      summary("2026-04", 0, 200, { Food: 200 }),
      summary("2026-05", 0, 300, { Food: 300 }),
      summary("2026-06", 0, 600, { Food: 600 }),
    ];
    const comps = computeCategorySpendingComparisons(summaries, 3);
    const food = comps.find((c) => c.category === "Food")!;
    expect(food.average).toBe(200); // (100+200+300)/3
    expect(food.current).toBe(600);
    expect(food.delta).toBe(400);
    expect(food.percentChange).toBe(200);
    expect(food.monthsAveraged).toBe(3);
  });

  it("reports a null percent change for a brand-new category", () => {
    const summaries = [
      summary("2026-05", 0, 100, { Food: 100 }),
      summary("2026-06", 0, 150, { Food: 100, Travel: 50 }),
    ];
    const travel = computeCategorySpendingComparisons(summaries).find(
      (c) => c.category === "Travel"
    )!;
    expect(travel.average).toBe(0);
    expect(travel.percentChange).toBeNull();
  });
});

describe("computeStreaks", () => {
  it("reports a positive-net streak and stops at the first miss", () => {
    const summaries = [
      summary("2026-03", 1000, 1200), // net negative -> breaks the streak here
      summary("2026-04", 1000, 500),
      summary("2026-05", 1000, 500),
      summary("2026-06", 1000, 500),
    ];
    const streaks = computeStreaks(summaries, {});
    const net = streaks.find((s) => s.label === "Positive net income")!;
    expect(net).toMatchObject({ count: 3, type: "positive" });
  });

  it("does not report a streak shorter than 2 months", () => {
    const summaries = [
      summary("2026-05", 1000, 1200),
      summary("2026-06", 1000, 500),
    ];
    expect(computeStreaks(summaries, {})).toEqual([]);
  });

  it("reports a decreasing-spending streak", () => {
    const summaries = [
      summary("2026-04", 0, 300),
      summary("2026-05", 0, 200),
      summary("2026-06", 0, 100),
    ];
    const s = computeStreaks(summaries, {});
    expect(s.find((x) => x.label === "Spending decreasing")).toMatchObject({
      count: 2,
      type: "positive",
    });
  });

  it("reports an increasing-spending warning streak", () => {
    const summaries = [
      summary("2026-04", 0, 100),
      summary("2026-05", 0, 200),
      summary("2026-06", 0, 300),
    ];
    const s = computeStreaks(summaries, {});
    expect(s.find((x) => x.label === "Spending increasing")).toMatchObject({
      count: 2,
      type: "warning",
    });
  });

  it("reports an under-budget streak and breaks when a month goes over", () => {
    const summaries = [
      summary("2026-04", 0, 0, { Food: 900 }), // over -> breaks
      summary("2026-05", 0, 0, { Food: 500 }),
      summary("2026-06", 0, 0, { Food: 400 }),
    ];
    const limits: any = {
      "2026-04": [{ category: "Food", monthlyLimit: 800 }],
      "2026-05": [{ category: "Food", monthlyLimit: 800 }],
      "2026-06": [{ category: "Food", monthlyLimit: 800 }],
    };
    const s = computeStreaks(summaries, limits);
    expect(s.find((x) => x.label === "All categories under budget")).toMatchObject({
      count: 2,
    });
  });
});

describe("buildMonthSummaries / buildMonthlyReview (date-relative)", () => {
  // Recurring entries dated far in the past are active in every month, so the
  // summaries are deterministic regardless of when the test runs.
  const entries: any[] = [
    { id: "inc", type: "income", category: "Salary", amount: 5000, date: "2020-01-01T12:00:00", recurring: true, recurrenceInterval: 1 },
    { id: "food", type: "expense", category: "Food", amount: 1000, date: "2020-01-01T12:00:00", recurring: true, recurrenceInterval: 1 },
  ];

  it("builds one summary per month, newest last", () => {
    const summaries = buildMonthSummaries(entries, 3);
    expect(summaries).toHaveLength(3);
    expect(summaries[summaries.length - 1].monthKey).toBe(getMonthKey(new Date()));
    for (const s of summaries) {
      expect(s.totalIncome).toBe(5000);
      expect(s.totalExpenses).toBe(1000);
      expect(s.byCategory.Food).toBe(1000);
    }
  });

  it("computes averages that match flat recurring spend", () => {
    const review = buildMonthlyReview(entries, {}, 4);
    expect(review.currentMonthSpending).toBe(1000);
    expect(review.avgMonthlySpending).toBe(1000); // every past month is also 1000
    expect(review.spendingVsAvgPercent).toBe(0);
  });
});

import {
  buildMonthSummaries,
  computeCategoryChanges,
  computeCategorySpendingComparisons,
  computeStreaks,
  computePersonMonthSpending,
  buildMonthlyReview,
  type MonthSummary,
} from "../budgetInsights";
import { getMonthKey } from "../budgetMonths";

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
    // Fixed system time: `buildMonthSummaries` and the test's own
    // `getMonthKey(new Date())` each read the clock separately, so on the
    // real clock the two reads could straddle a month/midnight boundary.
    const fixedNow = new Date("2026-06-15T12:00:00");
    jest.useFakeTimers().setSystemTime(fixedNow);
    try {
      const summaries = buildMonthSummaries(entries, 3);
      expect(summaries).toHaveLength(3);
      expect(summaries[summaries.length - 1].monthKey).toBe(getMonthKey(fixedNow));
      for (const s of summaries) {
        expect(s.totalIncome).toBe(5000);
        expect(s.totalExpenses).toBe(1000);
        expect(s.byCategory.Food).toBe(1000);
      }
    } finally {
      jest.useRealTimers();
    }
  });

  it("computes averages that match flat recurring spend", () => {
    const review = buildMonthlyReview(entries, {}, 4);
    expect(review.currentMonthSpending).toBe(1000);
    expect(review.avgMonthlySpending).toBe(1000); // every past month is also 1000
    expect(review.spendingVsAvgPercent).toBe(0);
  });
});

describe("computePersonMonthSpending", () => {
  const people: any[] = [
    { id: "p1", name: "Alex" },
    { id: "p2", name: "Sam" },
  ];
  // One-off entries pinned to a fixed month so grouping is deterministic.
  const entries: any[] = [
    { id: "e1", type: "expense", category: "Food", amount: 40, date: "2026-06-05T12:00:00", personId: "p1" },
    { id: "e2", type: "expense", category: "Food", amount: 60, date: "2026-06-10T12:00:00", personId: "p1" },
    { id: "e3", type: "expense", category: "Gas", amount: 25, date: "2026-06-12T12:00:00", personId: "p1" },
    { id: "e4", type: "expense", category: "Shopping", amount: 200, date: "2026-06-15T12:00:00", personId: "p2" },
    // Not counted: unassigned expense, income, other month.
    { id: "e5", type: "expense", category: "Food", amount: 999, date: "2026-06-20T12:00:00" },
    { id: "e6", type: "income", category: "Salary", amount: 5000, date: "2026-06-01T12:00:00", personId: "p1" },
    { id: "e7", type: "expense", category: "Food", amount: 999, date: "2026-05-20T12:00:00", personId: "p1" },
  ];

  it("groups the month's assigned expenses per person with a category breakdown", () => {
    const spending = computePersonMonthSpending(entries, people, "2026-06");
    expect(spending).toHaveLength(2);

    // Sorted by total descending: Sam (200) before Alex (125).
    expect(spending[0]).toMatchObject({ personId: "p2", name: "Sam", total: 200, entryCount: 1 });
    expect(spending[1]).toMatchObject({ personId: "p1", name: "Alex", total: 125, entryCount: 3 });

    // Categories sorted by total descending.
    expect(spending[1].byCategory).toEqual([
      { category: "Food", total: 100 },
      { category: "Gas", total: 25 },
    ]);
  });

  it("counts a recurring assigned expense in later months too", () => {
    const recurring: any[] = [
      { id: "r1", type: "expense", category: "Streaming", amount: 15, date: "2026-01-03T12:00:00", recurring: true, recurrenceInterval: 1, personId: "p1" },
    ];
    const spending = computePersonMonthSpending(recurring, people, "2026-06");
    expect(spending).toEqual([
      expect.objectContaining({
        personId: "p1",
        total: 15,
        byCategory: [{ category: "Streaming", total: 15 }],
      }),
    ]);
  });

  it("reports entries assigned to an unknown person under a placeholder", () => {
    const spending = computePersonMonthSpending(
      [{ id: "e1", type: "expense", category: "Food", amount: 50, date: "2026-06-05T12:00:00", personId: "gone" }] as any[],
      people,
      "2026-06"
    );
    expect(spending).toEqual([
      expect.objectContaining({ personId: "gone", name: "(deleted person)", deleted: true, total: 50 }),
    ]);
  });

  it("returns [] when nothing is assigned in the month", () => {
    expect(computePersonMonthSpending(entries, people, "2026-04")).toEqual([]);
  });

  it("rides along in buildMonthlyReview for the current month", () => {
    // Same midnight-flake shape as above: pin the clock so the entry's
    // month key and buildMonthlyReview's notion of "current month" can't
    // diverge on a real-clock read.
    const fixedNow = new Date("2026-06-15T12:00:00");
    jest.useFakeTimers().setSystemTime(fixedNow);
    try {
      const day = `${getMonthKey(fixedNow)}-15T12:00:00`;
      const monthEntries: any[] = [
        { id: "m1", type: "expense", category: "Food", amount: 75, date: day, personId: "p1" },
      ];
      const review = buildMonthlyReview(monthEntries, {}, 4, people);
      expect(review.personSpending).toEqual([
        expect.objectContaining({ personId: "p1", name: "Alex", total: 75 }),
      ]);
    } finally {
      jest.useRealTimers();
    }
  });

  it("defaults to no person spending when people are not passed", () => {
    // People fall back to [] -> assigned spend still reports, as unknown.
    const review = buildMonthlyReview([], {});
    expect(review.personSpending).toEqual([]);
  });
});

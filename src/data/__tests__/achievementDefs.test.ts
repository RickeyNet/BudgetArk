import {
  ACHIEVEMENT_DEFS,
  ACHIEVEMENT_DEFS_BY_ID,
  TOTAL_ACHIEVEMENTS,
  type AchievementContext,
} from "../achievementDefs";
import { CHAPTERS } from "../lessonChapters";
import { hasLessonBody } from "../lessonIndex";

// Pure check/progress rules - no mocks. Build a minimal context and override
// per test. `npm run typecheck` (tsc) covers this file too, but these
// fixtures deliberately stay partial-shape (only the fields each achievement
// check reads), so the scattered `as any` casts are the accurate escape
// hatch rather than full-record shared builders.
const ctx = (over: Partial<AchievementContext> = {}): AchievementContext =>
  ({
    debts: [],
    payments: [],
    savingsGoals: [],
    budgetEntries: [],
    assetAccounts: [],
    milestonePlan: { steps: [], updatedAt: "2020-01-01T00:00:00.000Z" } as any,
    netWorthSnapshots: [],
    isPaired: false,
    stats: {
      exportCount: 0,
      monthlyReviewOpens: 0,
      longestAppOpenStreak: 0,
    } as any,
    limitsByMonth: {},
    learningProgress: { completedLessons: {} } as any,
    ...over,
  }) as AchievementContext;

const def = (id: string) => ACHIEVEMENT_DEFS_BY_ID[id];
const debt = (over: Record<string, unknown> = {}): any => ({
  id: "d",
  originalBalance: 1000,
  balance: 1000,
  ...over,
});

describe("registry integrity", () => {
  it("indexes every def by id with unique ids", () => {
    expect(Object.keys(ACHIEVEMENT_DEFS_BY_ID)).toHaveLength(ACHIEVEMENT_DEFS.length);
    expect(TOTAL_ACHIEVEMENTS).toBe(ACHIEVEMENT_DEFS.length);
  });

  it("gives every def a check function", () => {
    for (const d of ACHIEVEMENT_DEFS) {
      expect(typeof d.check).toBe("function");
    }
  });
});

describe("simple presence badges", () => {
  it("first_steps unlocks once a debt exists", () => {
    expect(def("first_steps").check(ctx())).toBe(false);
    expect(def("first_steps").check(ctx({ debts: [debt()] }))).toBe(true);
  });

  it("patched_the_hull unlocks once a payment exists", () => {
    expect(def("patched_the_hull").check(ctx({ payments: [{} as any] }))).toBe(true);
  });

  it("first_mate tracks pairing state", () => {
    expect(def("first_mate").check(ctx({ isPaired: true }))).toBe(true);
    expect(def("first_mate").check(ctx({ isPaired: false }))).toBe(false);
  });

  it("cartographer needs at least one export", () => {
    expect(def("cartographer").check(ctx({ stats: { exportCount: 1 } as any }))).toBe(true);
  });

  it("crows_nest needs three Monthly Review opens", () => {
    expect(def("crows_nest").check(ctx({ stats: { monthlyReviewOpens: 2 } as any }))).toBe(false);
    expect(def("crows_nest").check(ctx({ stats: { monthlyReviewOpens: 3 } as any }))).toBe(true);
    expect(def("crows_nest").progress!(ctx({ stats: { monthlyReviewOpens: 2 } as any }))).toEqual({
      current: 2,
      target: 3,
    });
  });

  it("lighthouse_keeper needs a 30-day streak", () => {
    expect(def("lighthouse_keeper").check(ctx({ stats: { longestAppOpenStreak: 30 } as any }))).toBe(true);
    expect(def("lighthouse_keeper").check(ctx({ stats: { longestAppOpenStreak: 29 } as any }))).toBe(false);
  });
});

describe("debt payoff badges (exclude mortgage)", () => {
  it("half_mast unlocks at 50% of original non-mortgage debt paid", () => {
    const paidHalf = ctx({ debts: [debt({ originalBalance: 1000, balance: 400 })] }); // 60% paid
    const paidLittle = ctx({ debts: [debt({ originalBalance: 1000, balance: 600 })] }); // 40% paid
    expect(def("half_mast").check(paidHalf)).toBe(true);
    expect(def("half_mast").check(paidLittle)).toBe(false);
  });

  it("half_mast ignores house debt in the ratio", () => {
    const c = ctx({
      debts: [
        debt({ id: "card", originalBalance: 1000, balance: 200 }), // 80% paid
        debt({ id: "house", debtClass: "house", originalBalance: 500_000, balance: 500_000 }),
      ],
    });
    expect(def("half_mast").check(c)).toBe(true); // house excluded
  });

  it("half_mast progress reports paid vs half-of-original", () => {
    const p = def("half_mast").progress!(ctx({ debts: [debt({ originalBalance: 1000, balance: 400 })] }));
    expect(p).toMatchObject({ current: 600, target: 500, isCurrency: true });
  });

  it("debt_free_captain requires all non-mortgage debts cleared", () => {
    expect(def("debt_free_captain").check(ctx({ debts: [debt({ balance: 0 })] }))).toBe(true);
    expect(def("debt_free_captain").check(ctx({ debts: [debt({ balance: 5 })] }))).toBe(false);
    // only a mortgage -> no non-mortgage debts -> not unlocked
    expect(
      def("debt_free_captain").check(ctx({ debts: [debt({ debtClass: "house", balance: 0 })] }))
    ).toBe(false);
  });
});

describe("savings & net-worth badges", () => {
  it("galley_stocked unlocks from an emergency-fund goal OR Savings entries", () => {
    const viaGoal = ctx({ savingsGoals: [{ category: "emergency_fund", currentAmount: 1000 } as any] });
    const viaEntries = ctx({
      budgetEntries: [
        { type: "expense", category: "Savings", amount: 600 } as any,
        { type: "expense", category: "Savings", amount: 500 } as any,
      ],
    });
    expect(def("galley_stocked").check(viaGoal)).toBe(true);
    expect(def("galley_stocked").check(viaEntries)).toBe(true); // 1100 total
    expect(def("galley_stocked").check(ctx())).toBe(false);
  });

  it("galley_stocked reads EF-designated accounts over the goal amount", () => {
    const linked = ctx({
      savingsGoals: [{ category: "emergency_fund", currentAmount: 0 } as any],
      assetAccounts: [
        { category: "savings", balance: 1500, isEmergencyFund: true } as any,
      ],
    });
    const linkedButLow = ctx({
      // Goal says $5k, but the designated account IS the fund and holds $200.
      savingsGoals: [{ category: "emergency_fund", currentAmount: 5000 } as any],
      assetAccounts: [
        { category: "savings", balance: 200, isEmergencyFund: true } as any,
      ],
    });
    expect(def("galley_stocked").check(linked)).toBe(true);
    expect(def("galley_stocked").check(linkedButLow)).toBe(false);
    expect(def("galley_stocked").progress!(linked)).toEqual({
      current: 1500,
      target: 1000,
      isCurrency: true,
    });
  });

  it("sextant_sharp unlocks when any goal hits its target", () => {
    const met = ctx({ savingsGoals: [{ targetAmount: 500, currentAmount: 500 } as any] });
    const unmet = ctx({ savingsGoals: [{ targetAmount: 500, currentAmount: 499 } as any] });
    expect(def("sextant_sharp").check(met)).toBe(true);
    expect(def("sextant_sharp").check(unmet)).toBe(false);
  });

  it("treasure tiers read the latest net-worth snapshot", () => {
    const c = ctx({
      netWorthSnapshots: [
        { netWorth: 5000 } as any,
        { netWorth: 12000 } as any, // latest
      ],
    });
    expect(def("treasure_i").check(c)).toBe(true); // >= 10k
    expect(def("treasure_ii").check(c)).toBe(false); // < 25k
    expect(def("treasure_i").progress!(c)).toMatchObject({ current: 12000, target: 10_000 });
  });
});

describe("milestone badges", () => {
  it("ark_builder unlocks on the first completed step", () => {
    const c = ctx({ milestonePlan: { steps: [{ isCompleted: false }, { isCompleted: true }] } as any });
    expect(def("ark_builder").check(c)).toBe(true);
    expect(def("ark_builder").check(ctx())).toBe(false);
  });

  it("admiral requires every step complete and at least one step", () => {
    expect(
      def("admiral").check(ctx({ milestonePlan: { steps: [{ isCompleted: true }] } as any }))
    ).toBe(true);
    expect(
      def("admiral").check(ctx({ milestonePlan: { steps: [{ isCompleted: true }, { isCompleted: false }] } as any }))
    ).toBe(false);
    expect(def("admiral").check(ctx({ milestonePlan: { steps: [] } as any }))).toBe(false);
  });
});

describe("streak & budget-discipline badges", () => {
  it("doubloon_streak counts a recurring monthly Savings entry as a long streak", () => {
    const recurringSavings = ctx({
      budgetEntries: [
        {
          type: "expense",
          category: "Savings",
          amount: 100,
          date: "2020-01-15T12:00:00",
          recurring: true,
          recurrenceInterval: 1,
        } as any,
      ],
    });
    expect(def("doubloon_streak").check(recurringSavings)).toBe(true); // active every month since 2020
    expect(def("doubloon_streak").check(ctx())).toBe(false);
  });

  it("all_sails_set / steady_crew use under-budget months", () => {
    // A recurring $100 Food expense from Jan, with $500 Food limits in three
    // consecutive months -> all three months are under budget.
    const c = ctx({
      budgetEntries: [
        {
          type: "expense",
          category: "Food",
          amount: 100,
          date: "2026-01-10T12:00:00",
          recurring: true,
          recurrenceInterval: 1,
        } as any,
      ],
      limitsByMonth: {
        "2026-01": [{ category: "Food", monthlyLimit: 500, updatedAt: "x" } as any],
        "2026-02": [{ category: "Food", monthlyLimit: 500, updatedAt: "x" } as any],
        "2026-03": [{ category: "Food", monthlyLimit: 500, updatedAt: "x" } as any],
      },
    });
    expect(def("all_sails_set").check(c)).toBe(true); // at least one month under
    expect(def("steady_crew").check(c)).toBe(true); // 3 consecutive months
  });

  it("steady_crew breaks when a month goes over budget", () => {
    const c = ctx({
      budgetEntries: [
        { type: "expense", category: "Food", amount: 900, date: "2026-02-10T12:00:00" } as any,
      ],
      limitsByMonth: {
        "2026-01": [{ category: "Food", monthlyLimit: 500, updatedAt: "x" } as any],
        "2026-02": [{ category: "Food", monthlyLimit: 500, updatedAt: "x" } as any], // 900 > 500
        "2026-03": [{ category: "Food", monthlyLimit: 500, updatedAt: "x" } as any],
      },
    });
    // Jan and Mar are under (no spend), Feb is over -> longest run is 1.
    expect(def("steady_crew").check(c)).toBe(false);
  });
});

describe("learning badges (driven by real lesson data)", () => {
  it("first_voyage unlocks after any completed lesson", () => {
    expect(def("first_voyage").check(ctx())).toBe(false);
    expect(
      def("first_voyage").check(ctx({ learningProgress: { completedLessons: { anything: true } } as any }))
    ).toBe(true);
  });

  it("course_plotter unlocks when every authored Chapter 1 lesson is done", () => {
    const ch1 = CHAPTERS.find((c) => c.id === "ch1")!;
    const authored = ch1.lessons.filter((s) => hasLessonBody(s.id));
    expect(authored.length).toBeGreaterThan(0); // precondition: ch1 has content

    const completedLessons = Object.fromEntries(authored.map((s) => [s.id, true]));
    expect(def("course_plotter").check(ctx({ learningProgress: { completedLessons } as any }))).toBe(true);

    // Missing one lesson -> not complete.
    const partial = { ...completedLessons };
    delete partial[authored[0].id];
    expect(def("course_plotter").check(ctx({ learningProgress: { completedLessons: partial } as any }))).toBe(false);
  });
});

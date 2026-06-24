import { evaluateAchievements } from "../achievements";

/**
 * achievements.ts is an orchestrator: it loads a context from ~10 storage
 * modules, runs every definition's check/progress, and persists changes. We
 * mock the storage edges and the *definitions* so we can drive check() outcomes
 * directly and assert the evaluator's unlock / revoke / first-run / persist
 * logic in isolation.
 */

// Mutable defs array — tests reset and repopulate it. The imported
// ACHIEVEMENT_DEFS binding points at this same array, so in-place edits show up.
const mockDefs: any[] = [];
jest.mock("../../data/achievementDefs", () => ({
  // getter so the factory doesn't touch mockDefs before its `const` initializes
  get ACHIEVEMENT_DEFS() {
    return mockDefs;
  },
}));

// Controllable persisted state.
let mockState: any = { unlocked: {}, firstEvaluatedAt: 1, version: 1 };
const mockSave = jest.fn(async (..._args: any[]) => {});
const mockRecordStreak = jest.fn(async (..._args: any[]) => {});

jest.mock("../../storage/achievementsStorage", () => ({
  getUnlockedAchievements: jest.fn(async () => mockState),
  saveUnlockedAchievements: (...args: any[]) => mockSave(...args),
}));

// Context-source storage — values are irrelevant because mocked defs ignore
// the context; they just need to resolve.
jest.mock("../../storage/debtStorage", () => ({
  getDebts: jest.fn(async () => []),
  getPayments: jest.fn(async () => []),
}));
jest.mock("../../storage/savingsGoalStorage", () => ({
  getSavingsGoals: jest.fn(async () => []),
}));
jest.mock("../../storage/budgetStorage", () => ({
  getBudgetEntries: jest.fn(async () => []),
  getAllLimitsByMonth: jest.fn(async () => ({})),
}));
jest.mock("../../storage/debtMilestoneStorage", () => ({
  getDebtMilestonePlan: jest.fn(async () => null),
}));
jest.mock("../../storage/netWorthSnapshotStorage", () => ({
  getNetWorthSnapshots: jest.fn(async () => []),
}));
jest.mock("../../sync/pairingStorage", () => ({
  getPairingState: jest.fn(async () => null),
}));
jest.mock("../../storage/achievementStatsStorage", () => ({
  getAchievementStats: jest.fn(async () => ({})),
  recordAppOpenForStreak: (...args: any[]) => mockRecordStreak(...args),
}));
jest.mock("../../storage/learningProgressStorage", () => ({
  getLearningProgress: jest.fn(async () => ({})),
}));

const def = (over: Record<string, unknown> = {}): any => ({
  id: "d",
  check: () => false,
  ...over,
});

const setDefs = (...defs: any[]) => {
  mockDefs.length = 0;
  mockDefs.push(...defs);
};

beforeEach(() => {
  (global as any).__DEV__ = false;
  mockState = { unlocked: {}, firstEvaluatedAt: 1, version: 1 };
  setDefs();
});

describe("evaluateAchievements", () => {
  it("records the app-open streak before evaluating", async () => {
    await evaluateAchievements();
    expect(mockRecordStreak).toHaveBeenCalledTimes(1);
  });

  it("unlocks a newly-passing achievement and persists it", async () => {
    setDefs(def({ id: "a", check: () => true }));
    const res = await evaluateAchievements();

    expect(res.newlyUnlocked).toEqual(["a"]);
    expect(typeof res.unlocked.a).toBe("number");
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(mockSave.mock.calls[0][0].unlocked.a).toBe(res.unlocked.a);
    expect(mockSave.mock.calls[0][0].version).toBe(1);
  });

  it("does not re-unlock an already-unlocked achievement", async () => {
    mockState = { unlocked: { a: 12345 }, firstEvaluatedAt: 1, version: 1 };
    setDefs(def({ id: "a", check: () => true }));

    const res = await evaluateAchievements();
    expect(res.newlyUnlocked).toEqual([]);
    expect(res.unlocked.a).toBe(12345); // timestamp untouched
    expect(mockSave).not.toHaveBeenCalled(); // nothing changed, not first run
  });

  it("flags the first evaluation and stamps firstEvaluatedAt", async () => {
    mockState = { unlocked: {}, firstEvaluatedAt: undefined, version: 2 };
    setDefs(def({ id: "a", check: () => true }));

    const res = await evaluateAchievements();
    expect(res.isFirstEvaluation).toBe(true);
    // First run always persists, even with retroactive unlocks.
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(typeof mockSave.mock.calls[0][0].firstEvaluatedAt).toBe("number");
    expect(mockSave.mock.calls[0][0].version).toBe(2);
  });

  it("persists on first evaluation even when nothing unlocks", async () => {
    mockState = { unlocked: {}, firstEvaluatedAt: undefined, version: 1 };
    setDefs(def({ id: "a", check: () => false }));

    const res = await evaluateAchievements();
    expect(res.newlyUnlocked).toEqual([]);
    expect(res.isFirstEvaluation).toBe(true);
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  it("revokes a revocable badge that no longer passes", async () => {
    mockState = { unlocked: { a: 111, b: 222 }, firstEvaluatedAt: 1, version: 1 };
    setDefs(
      def({ id: "a", check: () => false, revocable: true }),
      def({ id: "b", check: () => false }) // not revocable -> stays
    );

    const res = await evaluateAchievements();
    expect(res.newlyRevoked).toEqual(["a"]);
    expect(res.unlocked.a).toBeUndefined();
    expect(res.unlocked.b).toBe(222); // non-revocable kept
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  it("collects progress only for defs returning a positive target", async () => {
    setDefs(
      def({ id: "withProg", check: () => false, progress: () => ({ current: 1, target: 3 }) }),
      def({ id: "zeroTarget", check: () => false, progress: () => ({ current: 0, target: 0 }) }),
      def({ id: "nullProg", check: () => false, progress: () => null })
    );

    const res = await evaluateAchievements();
    expect(res.progress.withProg).toEqual({ current: 1, target: 3 });
    expect(res.progress.zeroTarget).toBeUndefined();
    expect(res.progress.nullProg).toBeUndefined();
  });

  it("swallows a throwing check without unlocking or crashing", async () => {
    setDefs(
      def({ id: "boom", check: () => { throw new Error("bad check"); } }),
      def({ id: "ok", check: () => true })
    );

    const res = await evaluateAchievements();
    expect(res.unlocked.boom).toBeUndefined();
    expect(res.newlyUnlocked).toEqual(["ok"]); // other defs still evaluated
  });

  it("swallows a throwing progress fn", async () => {
    setDefs(
      def({ id: "p", check: () => false, progress: () => { throw new Error("nope"); } })
    );
    const res = await evaluateAchievements();
    expect(res.progress.p).toBeUndefined();
  });

  it("does not persist when nothing changes on a non-first run", async () => {
    mockState = { unlocked: {}, firstEvaluatedAt: 1, version: 1 };
    setDefs(def({ id: "a", check: () => false }));

    await evaluateAchievements();
    expect(mockSave).not.toHaveBeenCalled();
  });
});

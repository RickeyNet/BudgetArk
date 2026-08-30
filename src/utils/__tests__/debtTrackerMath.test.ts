/**
 * BudgetArk - Debt Tracker Math tests
 * File: src/utils/__tests__/debtTrackerMath.test.ts
 *
 * Pins the three derivations the Debts tab renders from: the summary totals,
 * the Build Your Ark milestone progress ring, and the payoff ordering of the
 * list. The interesting cases are the degenerate ones - a household whose only
 * debt is a mortgage, a list with no original balances, two cards sitting at
 * the same APR - which used to be reachable only by hand-editing data on a
 * device.
 */

import type { Debt, DebtMilestoneKey, DebtMilestonePlan } from "../../types";
import { FIXTURE_TIME, makeDebt, makeSavingsGoal } from "../../__tests__/fixtures";
import {
  computeMilestoneProgress,
  shouldPromoteSecuredDebts,
  sortDebtsForPayoff,
  summarizeDebtTotals,
  type MilestoneProgressInput,
} from "../debtTrackerMath";

/** Stand-in for the CurrencyProvider formatter; stable and locale-free. */
const formatCurrency = (value: number): string => `$${value}`;

const makePlan = (
  keys: DebtMilestoneKey[],
  over: Partial<Record<DebtMilestoneKey, { isCompleted?: boolean; targetAmount?: number }>> = {}
): DebtMilestonePlan => ({
  currentStepKey: keys[0],
  updatedAt: FIXTURE_TIME,
  steps: keys.map((key) => ({
    key,
    title: key,
    description: `${key} description`,
    isCompleted: over[key]?.isCompleted ?? false,
    ...(over[key]?.targetAmount === undefined ? {} : { targetAmount: over[key]?.targetAmount }),
  })),
});

const milestoneInput = (
  over: Partial<MilestoneProgressInput> = {}
): MilestoneProgressInput => ({
  plan: makePlan(["keel"]),
  debts: [],
  savingsGoals: [],
  effectiveReserve: 0,
  monthlyEssentialsEstimate: 0,
  retirementInvestingMonthly: 0,
  formatCurrency,
  ...over,
});

const progressFor = (
  key: DebtMilestoneKey,
  over: Partial<MilestoneProgressInput> = {}
): number => {
  const [step] = computeMilestoneProgress(
    milestoneInput({ plan: makePlan([key]), ...over })
  );
  return step.progress;
};

describe("summarizeDebtTotals", () => {
  it("sums balances and derives the paid-off percentage", () => {
    const totals = summarizeDebtTotals([
      makeDebt({ id: "a", balance: 400, originalBalance: 1000 }),
      makeDebt({ id: "b", balance: 100, originalBalance: 1000 }),
    ]);

    expect(totals.totalDebt).toBe(500);
    expect(totals.totalOriginal).toBe(2000);
    expect(totals.totalPaid).toBe(1500);
    expect(totals.overallPercent).toBe(75);
  });

  it("rounds the percentage to a whole number", () => {
    const totals = summarizeDebtTotals([
      makeDebt({ balance: 667, originalBalance: 1000 }),
    ]);

    // 333 / 1000 = 33.3% -> 33
    expect(totals.overallPercent).toBe(33);
  });

  it("returns zeros for an empty list instead of NaN", () => {
    // 0 / 0 would be NaN and render as "NaN%" in the summary ring.
    const totals = summarizeDebtTotals([]);

    expect(totals).toEqual({
      totalDebt: 0,
      totalOriginal: 0,
      totalPaid: 0,
      overallPercent: 0,
    });
  });

  it("guards a zero original total (debts entered with no original balance)", () => {
    const totals = summarizeDebtTotals([
      makeDebt({ balance: 0, originalBalance: 0 }),
      makeDebt({ id: "b", balance: 0, originalBalance: 0 }),
    ]);

    expect(totals.overallPercent).toBe(0);
    expect(Number.isNaN(totals.overallPercent)).toBe(false);
  });

  it("reports a negative paid total when balances grew past the original", () => {
    // Interest can push a balance above what it started at; the totals report
    // that honestly rather than clamping, and the percent goes negative with it.
    const totals = summarizeDebtTotals([
      makeDebt({ balance: 1200, originalBalance: 1000 }),
    ]);

    expect(totals.totalPaid).toBe(-200);
    expect(totals.overallPercent).toBe(-20);
  });
});

describe("computeMilestoneProgress", () => {
  it("returns an empty list before the plan loads", () => {
    expect(computeMilestoneProgress(milestoneInput({ plan: null }))).toEqual([]);
  });

  it("carries the stored step fields through untouched", () => {
    const plan = makePlan(["keel"], { keel: { isCompleted: true, targetAmount: 2000 } });
    const [step] = computeMilestoneProgress(
      milestoneInput({ plan, effectiveReserve: 500 })
    );

    // Completion is the user's own checkbox - progress never overrides it.
    expect(step.key).toBe("keel");
    expect(step.title).toBe("keel");
    expect(step.isCompleted).toBe(true);
    expect(step.targetAmount).toBe(2000);
    expect(step.progress).toBeCloseTo(0.25);
    expect(step.metricLabel).toBe("$500 / $2000");
  });

  it("computes every step of a full plan", () => {
    const plan = makePlan([
      "keel",
      "hull",
      "deck",
      "supplies",
      "gather_animals",
      "moorings",
      "sail",
    ]);
    const steps = computeMilestoneProgress(milestoneInput({ plan }));

    expect(steps.map((step) => step.key)).toEqual([
      "keel",
      "hull",
      "deck",
      "supplies",
      "gather_animals",
      "moorings",
      "sail",
    ]);
    expect(steps.every((step) => Number.isFinite(step.progress))).toBe(true);
    expect(steps.every((step) => step.nextAction.length > 0)).toBe(true);
  });

  describe("keel", () => {
    it("tracks the reserve against the step target", () => {
      expect(
        progressFor("keel", {
          plan: makePlan(["keel"], { keel: { targetAmount: 1000 } }),
          effectiveReserve: 250,
        })
      ).toBeCloseTo(0.25);
    });

    it("falls back to the $1200 default target and clamps at 1", () => {
      expect(progressFor("keel", { effectiveReserve: 600 })).toBeCloseTo(0.5);
      expect(progressFor("keel", { effectiveReserve: 99999 })).toBe(1);
    });
  });

  describe("hull", () => {
    it("tracks non-mortgage debt paid down", () => {
      const debts = [
        makeDebt({ id: "card", debtClass: "personal_credit", balance: 250, originalBalance: 1000 }),
        makeDebt({ id: "car", debtClass: "car", balance: 250, originalBalance: 1000 }),
      ];

      expect(progressFor("hull", { debts })).toBeCloseTo(0.75);
    });

    it("ignores the mortgage", () => {
      const debts = [
        makeDebt({ id: "card", debtClass: "personal_credit", balance: 500, originalBalance: 1000 }),
        makeDebt({ id: "house", debtClass: "house", balance: 200000, originalBalance: 200000 }),
      ];

      expect(progressFor("hull", { debts })).toBeCloseTo(0.5);
    });

    it("returns 0, not NaN, when the only debt is a mortgage", () => {
      // The NaN guard: `nonMortgageOriginal` is 0 here, and the old inline
      // math divided by it. 0 is the deliberate reading rather than 1/100%:
      // the bar measures non-mortgage debt actually paid down, and a full bar
      // for someone who never carried any would claim work that never
      // happened. Hull is still *completable* - `isCompleted` is the user's
      // own checkbox, which this function never touches.
      const debts = [
        makeDebt({ id: "house", debtClass: "house", balance: 200000, originalBalance: 250000 }),
      ];
      const progress = progressFor("hull", { debts });

      expect(progress).toBe(0);
      expect(Number.isNaN(progress)).toBe(false);
    });

    it("returns 0 when there are no debts at all", () => {
      expect(progressFor("hull", { debts: [] })).toBe(0);
    });

    it("labels the remaining non-mortgage balance", () => {
      const [step] = computeMilestoneProgress(
        milestoneInput({
          plan: makePlan(["hull"]),
          debts: [makeDebt({ balance: 250, originalBalance: 1000 })],
        })
      );

      expect(step.metricLabel).toBe("$250 remaining");
    });
  });

  describe("deck", () => {
    it("defaults its target to three months of essentials", () => {
      expect(
        progressFor("deck", { effectiveReserve: 900, monthlyEssentialsEstimate: 600 })
      ).toBeCloseTo(0.5);
    });

    it("returns 0 when no essentials estimate exists yet", () => {
      // target = 0 * 3 = 0; guarded rather than dividing to NaN/Infinity.
      expect(
        progressFor("deck", { effectiveReserve: 900, monthlyEssentialsEstimate: 0 })
      ).toBe(0);
    });
  });

  describe("supplies", () => {
    it("tracks monthly retirement investing against the $500 default", () => {
      expect(progressFor("supplies", { retirementInvestingMonthly: 125 })).toBeCloseTo(0.25);
    });
  });

  describe("gather_animals", () => {
    it("sums education goals against their combined target", () => {
      const savingsGoals = [
        makeSavingsGoal({ id: "g1", category: "education", currentAmount: 1000, targetAmount: 4000 }),
        makeSavingsGoal({ id: "g2", category: "education", currentAmount: 0, targetAmount: 4000 }),
        makeSavingsGoal({ id: "g3", category: "emergency_fund", currentAmount: 9999, targetAmount: 1 }),
      ];
      const [step] = computeMilestoneProgress(
        milestoneInput({ plan: makePlan(["gather_animals"]), savingsGoals })
      );

      expect(step.progress).toBeCloseTo(0.125);
      expect(step.metricLabel).toBe("$1000 / $8000");
    });

    it("prompts for a goal when none exist", () => {
      const [step] = computeMilestoneProgress(
        milestoneInput({ plan: makePlan(["gather_animals"]) })
      );

      expect(step.progress).toBe(0);
      expect(step.metricLabel).toBe("Add an education savings goal to track");
    });
  });

  describe("moorings", () => {
    it("tracks the mortgage paid down", () => {
      const debts = [
        makeDebt({ id: "house", debtClass: "house", balance: 150000, originalBalance: 200000 }),
        makeDebt({ id: "card", debtClass: "personal_credit", balance: 500, originalBalance: 500 }),
      ];

      expect(progressFor("moorings", { debts })).toBeCloseTo(0.25);
    });

    it("returns 0 and says so when no mortgage is tracked", () => {
      const [step] = computeMilestoneProgress(
        milestoneInput({
          plan: makePlan(["moorings"]),
          debts: [makeDebt({ debtClass: "personal_credit" })],
        })
      );

      expect(step.progress).toBe(0);
      expect(step.metricLabel).toBe("No mortgage debt tracked");
    });
  });

  describe("sail", () => {
    it("is all-or-nothing on the user's own completion flag", () => {
      expect(progressFor("sail")).toBe(0);
      expect(
        progressFor("sail", { plan: makePlan(["sail"], { sail: { isCompleted: true } }) })
      ).toBe(1);
    });

    it("shows the monthly giving target until completed", () => {
      const [step] = computeMilestoneProgress(milestoneInput({ plan: makePlan(["sail"]) }));

      expect(step.metricLabel).toBe("Target: $1000 /mo");
    });
  });
});

describe("shouldPromoteSecuredDebts", () => {
  const hullDone = makePlan(["hull"], { hull: { isCompleted: true } });
  const hullOpen = makePlan(["hull"]);

  it("stays closed before the plan loads", () => {
    expect(shouldPromoteSecuredDebts([], null)).toBe(false);
  });

  it("stays closed while Hull is incomplete, even with credit cleared", () => {
    expect(
      shouldPromoteSecuredDebts(
        [makeDebt({ debtClass: "personal_credit", balance: 0 })],
        hullOpen
      )
    ).toBe(false);
  });

  it("stays closed while any credit card still carries a balance", () => {
    expect(
      shouldPromoteSecuredDebts(
        [makeDebt({ debtClass: "personal_credit", balance: 1 })],
        hullDone
      )
    ).toBe(false);
  });

  it("opens once Hull is complete and every credit balance is zero", () => {
    expect(
      shouldPromoteSecuredDebts(
        [
          makeDebt({ id: "card", debtClass: "personal_credit", balance: 0 }),
          makeDebt({ id: "house", debtClass: "house", balance: 200000 }),
        ],
        hullDone
      )
    ).toBe(true);
  });
});

describe("sortDebtsForPayoff", () => {
  const ids = (debts: Debt[]): string[] => debts.map((debt) => debt.id);

  const card = makeDebt({
    id: "card",
    debtClass: "personal_credit",
    balance: 5000,
    rate: 22,
  });
  const loan = makeDebt({
    id: "loan",
    debtClass: "personal_credit",
    balance: 2000,
    rate: 9,
  });
  const car = makeDebt({ id: "car", debtClass: "car", balance: 15000, rate: 6 });
  const house = makeDebt({ id: "house", debtClass: "house", balance: 200000, rate: 3 });

  const all = [house, car, loan, card];

  it("puts credit first, then car, then house regardless of strategy", () => {
    expect(ids(sortDebtsForPayoff(all, "custom", false))).toEqual([
      "loan",
      "card",
      "car",
      "house",
    ]);
    expect(ids(sortDebtsForPayoff(all, "avalanche", false))).toEqual([
      "card",
      "loan",
      "car",
      "house",
    ]);
    expect(ids(sortDebtsForPayoff(all, "snowball", false))).toEqual([
      "loan",
      "card",
      "car",
      "house",
    ]);
  });

  it("orders avalanche by rate descending within a tier", () => {
    const debts = [
      makeDebt({ id: "low", rate: 5, balance: 100 }),
      makeDebt({ id: "high", rate: 30, balance: 100 }),
      makeDebt({ id: "mid", rate: 18, balance: 100 }),
    ];

    expect(ids(sortDebtsForPayoff(debts, "avalanche", false))).toEqual([
      "high",
      "mid",
      "low",
    ]);
  });

  it("orders snowball by balance ascending within a tier", () => {
    const debts = [
      makeDebt({ id: "big", rate: 5, balance: 9000 }),
      makeDebt({ id: "small", rate: 30, balance: 100 }),
      makeDebt({ id: "mid", rate: 18, balance: 1000 }),
    ];

    expect(ids(sortDebtsForPayoff(debts, "snowball", false))).toEqual([
      "small",
      "mid",
      "big",
    ]);
  });

  it("keeps the caller's order for the custom strategy", () => {
    const debts = [
      makeDebt({ id: "c", rate: 1, balance: 300 }),
      makeDebt({ id: "a", rate: 30, balance: 100 }),
      makeDebt({ id: "b", rate: 15, balance: 200 }),
    ];

    expect(ids(sortDebtsForPayoff(debts, "custom", false))).toEqual(["c", "a", "b"]);
  });

  it("breaks ties by keeping the incoming order (stable sort)", () => {
    const tiedRates = [
      makeDebt({ id: "first", rate: 19.9, balance: 500 }),
      makeDebt({ id: "second", rate: 19.9, balance: 100 }),
    ];
    const tiedBalances = [
      makeDebt({ id: "first", rate: 5, balance: 500 }),
      makeDebt({ id: "second", rate: 25, balance: 500 }),
    ];

    expect(ids(sortDebtsForPayoff(tiedRates, "avalanche", false))).toEqual([
      "first",
      "second",
    ]);
    expect(ids(sortDebtsForPayoff(tiedBalances, "snowball", false))).toEqual([
      "first",
      "second",
    ]);
  });

  it("promotes car above house above credit once the gate opens", () => {
    const promoted = [
      house,
      makeDebt({ id: "card", debtClass: "personal_credit", balance: 5000, rate: 22 }),
      car,
    ];

    expect(ids(sortDebtsForPayoff(promoted, "avalanche", true))).toEqual([
      "car",
      "house",
      "card",
    ]);
  });

  it("sinks zero-balance debts to the bottom in their original order", () => {
    const debts = [
      makeDebt({ id: "paid-a", balance: 0, rate: 30 }),
      makeDebt({ id: "active", balance: 100, rate: 1 }),
      makeDebt({ id: "paid-b", balance: -50, rate: 25 }),
    ];

    expect(ids(sortDebtsForPayoff(debts, "avalanche", false))).toEqual([
      "active",
      "paid-a",
      "paid-b",
    ]);
  });

  it("does not mutate the input array", () => {
    const debts = [
      makeDebt({ id: "low", rate: 5, balance: 100 }),
      makeDebt({ id: "high", rate: 30, balance: 100 }),
    ];
    const sorted = sortDebtsForPayoff(debts, "avalanche", false);

    expect(ids(debts)).toEqual(["low", "high"]);
    expect(ids(sorted)).toEqual(["high", "low"]);
  });

  it("returns an empty list for an empty input", () => {
    expect(sortDebtsForPayoff([], "snowball", false)).toEqual([]);
  });
});

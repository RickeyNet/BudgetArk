/**
 * BudgetArk - Debt Tracker Math
 * File: src/utils/debtTrackerMath.ts
 *
 * The pure derivations behind the Debts tab: the headline payoff totals, the
 * "Build Your Ark" milestone progress ring for each step, and the
 * strategy-aware payoff ordering of the debt list.
 *
 * These lived inline in `src/screens/DebtTrackerScreen.tsx`, where they could
 * only be verified by eye on a device. Extracting them keeps the screen a thin
 * `useMemo` shell and lets the Jest suite pin the awkward cases - a user with
 * nothing but a mortgage, a debt list with no original balances, tie-breaks
 * between two cards at the same APR - that are painful to reproduce by hand.
 *
 * Pure: no storage, no React, no react-native imports. Currency formatting is
 * injected so the caller's locale/currency preference stays the single source
 * of truth.
 */

import type {
  Debt,
  DebtMilestoneKey,
  DebtMilestonePlan,
  SavingsGoal,
} from "../types";

/* ────────────────────────────── Totals ────────────────────────────── */

export interface DebtTotals {
  /** Sum of current balances. */
  totalDebt: number;
  /** Sum of original balances. */
  totalOriginal: number;
  /** How much has been paid off overall (original - current). */
  totalPaid: number;
  /** `totalPaid / totalOriginal` as a whole percent, 0 when undefined. */
  overallPercent: number;
}

/**
 * Percentage of `paid` against `original`, rounded to a whole number.
 *
 * Guards the two ways this can go wrong: an `original` of 0 (a brand-new user,
 * or a filter that matched nothing) would divide to NaN, and a non-finite
 * input would propagate. Both return 0 - "nothing paid off yet" - rather than
 * rendering "NaN%" in the summary ring.
 */
const toWholePercent = (paid: number, original: number): number => {
  if (!Number.isFinite(paid) || !Number.isFinite(original) || original <= 0) {
    return 0;
  }
  return Math.round((paid / original) * 100);
};

/**
 * Ratio of progress toward clearing `original`, clamped to at most 1.
 *
 * Returns 0 when there is nothing to clear. See the note on the `hull`
 * milestone in `computeMilestoneProgress` for why 0 (and not 1) is the right
 * reading of "you never had any of this kind of debt".
 */
const clearedRatio = (original: number, remaining: number): number => {
  if (!Number.isFinite(original) || !Number.isFinite(remaining) || original <= 0) {
    return 0;
  }
  return Math.min((original - remaining) / original, 1);
};

/** Ratio of `saved` toward `target`, clamped to at most 1; 0 when no target. */
const towardTargetRatio = (saved: number, target: number): number => {
  if (!Number.isFinite(saved) || !Number.isFinite(target) || target <= 0) {
    return 0;
  }
  return Math.min(saved / target, 1);
};

/** Headline totals for the Debts summary card. */
export const summarizeDebtTotals = (debts: Debt[]): DebtTotals => {
  const totalDebt = debts.reduce((sum, debt) => sum + debt.balance, 0);
  const totalOriginal = debts.reduce((sum, debt) => sum + debt.originalBalance, 0);
  const totalPaid = totalOriginal - totalDebt;

  return {
    totalDebt,
    totalOriginal,
    totalPaid,
    overallPercent: toWholePercent(totalPaid, totalOriginal),
  };
};

/* ──────────────────────────── Milestones ──────────────────────────── */

/** A milestone step with its live progress ring + labels resolved. */
export interface ComputedMilestone {
  key: DebtMilestoneKey;
  title: string;
  description: string;
  isCompleted: boolean;
  targetAmount?: number;
  /** 0..1 for the progress bar. */
  progress: number;
  metricLabel: string;
  nextAction: string;
}

export interface MilestoneProgressInput {
  /** Null until the stored plan loads; yields an empty list. */
  plan: DebtMilestonePlan | null;
  /** All debts, unfiltered - milestones track the whole household. */
  debts: Debt[];
  savingsGoals: SavingsGoal[];
  /**
   * The emergency-fund value in force: linked account balances when savings
   * accounts are flagged as the fund, otherwise the manual reserve.
   */
  effectiveReserve: number;
  monthlyEssentialsEstimate: number;
  retirementInvestingMonthly: number;
  formatCurrency: (value: number) => string;
}

/**
 * Resolve each step of the Build Your Ark plan into a progress ratio plus the
 * two strings the card shows.
 *
 * Completion itself is *not* derived here - `isCompleted` is the user's own
 * checkbox, carried through untouched. `progress` is only the "how far along
 * the underlying metric are you" bar.
 */
export const computeMilestoneProgress = (
  input: MilestoneProgressInput
): ComputedMilestone[] => {
  const {
    plan,
    debts,
    savingsGoals,
    effectiveReserve,
    monthlyEssentialsEstimate,
    retirementInvestingMonthly,
    formatCurrency,
  } = input;

  if (!plan) return [];

  // Hull (Build Your Ark step "Clear Non-Mortgage Debt") covers credit cards,
  // personal loans, and car loans - anything that isn't the mortgage.
  const nonMortgageDebts = debts.filter((debt) => debt.debtClass !== "house");
  const nonMortgageRemaining = nonMortgageDebts.reduce(
    (sum, debt) => sum + debt.balance,
    0
  );
  const nonMortgageOriginal = nonMortgageDebts.reduce(
    (sum, debt) => sum + debt.originalBalance,
    0
  );

  // Moorings (pay down the house) is keyed only on house debts.
  const mortgageDebts = debts.filter((debt) => debt.debtClass === "house");
  const mortgageRemaining = mortgageDebts.reduce((sum, debt) => sum + debt.balance, 0);
  const mortgageOriginal = mortgageDebts.reduce(
    (sum, debt) => sum + debt.originalBalance,
    0
  );

  return plan.steps.map((step): ComputedMilestone => {
    if (step.key === "keel") {
      const target = step.targetAmount || 1200;
      return {
        ...step,
        progress: towardTargetRatio(effectiveReserve, target),
        metricLabel: `${formatCurrency(effectiveReserve)} / ${formatCurrency(target)}`,
        nextAction: "Set aside your first cushion target before pushing harder elsewhere.",
      };
    }

    if (step.key === "hull") {
      return {
        ...step,
        // A user whose only debt is a mortgage has `nonMortgageOriginal === 0`;
        // clearedRatio returns 0 rather than dividing to NaN. 0 (not 1) is the
        // deliberate reading: the bar measures debt actually paid down, and a
        // full bar for someone who never carried non-mortgage debt would claim
        // work that never happened. `moorings` below uses the same convention.
        progress: clearedRatio(nonMortgageOriginal, nonMortgageRemaining),
        metricLabel: `${formatCurrency(nonMortgageRemaining)} remaining`,
        nextAction:
          "Apply your next extra payment to the first debt in your chosen payoff order.",
      };
    }

    if (step.key === "deck") {
      const target = step.targetAmount || monthlyEssentialsEstimate * 3;
      return {
        ...step,
        progress: towardTargetRatio(effectiveReserve, target),
        metricLabel: `${formatCurrency(effectiveReserve)} / ${formatCurrency(target)}`,
        nextAction: "Grow your reserves toward 3-6 months of essentials for stability.",
      };
    }

    if (step.key === "supplies") {
      const target = step.targetAmount || 500;
      return {
        ...step,
        progress: towardTargetRatio(retirementInvestingMonthly, target),
        metricLabel: `${formatCurrency(retirementInvestingMonthly)} / ${formatCurrency(target)} /mo`,
        nextAction: "Increase retirement contributions toward 15% of household income.",
      };
    }

    if (step.key === "gather_animals") {
      const educationGoals = savingsGoals.filter((g) => g.category === "education");
      const totalSaved = educationGoals.reduce((sum, g) => sum + g.currentAmount, 0);
      const totalGoalTarget = educationGoals.reduce((sum, g) => sum + g.targetAmount, 0);
      const target = step.targetAmount || totalGoalTarget || 10000;
      return {
        ...step,
        progress: towardTargetRatio(totalSaved, target),
        metricLabel:
          educationGoals.length > 0
            ? `${formatCurrency(totalSaved)} / ${formatCurrency(target)}`
            : "Add an education savings goal to track",
        nextAction: "Open or contribute to a 529 plan or education savings account.",
      };
    }

    if (step.key === "moorings") {
      return {
        ...step,
        progress: clearedRatio(mortgageOriginal, mortgageRemaining),
        metricLabel:
          mortgageRemaining > 0
            ? `${formatCurrency(mortgageRemaining)} remaining`
            : "No mortgage debt tracked",
        nextAction: "Make extra principal payments on your mortgage when possible.",
      };
    }

    if (step.key === "sail") {
      const target = step.targetAmount || 1000;
      return {
        ...step,
        progress: step.isCompleted ? 1 : 0,
        metricLabel: step.isCompleted ? "Completed" : `Target: ${formatCurrency(target)} /mo`,
        nextAction: "Live generously, invest beyond retirement, and build lasting wealth.",
      };
    }

    return {
      ...step,
      progress: step.isCompleted ? 1 : 0,
      metricLabel: step.isCompleted ? "Completed" : "Not started",
      nextAction: "",
    };
  });
};

/* ───────────────────────────── Payoff order ───────────────────────────── */

export type PayoffStrategy = "custom" | "avalanche" | "snowball";

/**
 * Tier ordering for the debt list. Lower tier = listed first.
 *
 * Default: credit cards / personal loans first, then car loans, then house.
 *
 * Promotion gate: car and mortgage only move to the top of the list once
 * (a) the Hull milestone is marked complete and (b) every credit /
 * personal-loan debt has a zero balance. Both checks are required - Hull
 * being marked complete while credit still carries a balance shouldn't
 * bury those entries behind the mortgage. When the gate opens, car comes
 * before house (smaller balance, naturally tackled first).
 */
const getDebtTier = (debt: Debt, promoteSecured: boolean): number => {
  if (promoteSecured) {
    if (debt.debtClass === "car") return 0;
    if (debt.debtClass === "house") return 1;
    return 2; // personal_credit (paid off in this state, but ordered last)
  }
  if (debt.debtClass === "personal_credit") return 0;
  if (debt.debtClass === "car") return 1;
  return 2; // house
};

/**
 * Whether secured debt (car, then house) should be promoted above credit in
 * the payoff list. See `getDebtTier` for why both halves of the gate matter.
 */
export const shouldPromoteSecuredDebts = (
  debts: Debt[],
  plan: DebtMilestonePlan | null
): boolean => {
  const hullCompleted =
    plan?.steps.find((step) => step.key === "hull")?.isCompleted === true;
  const allCreditCleared = !debts.some(
    (debt) => debt.debtClass === "personal_credit" && debt.balance > 0
  );
  return hullCompleted && allCreditCleared;
};

/**
 * Order the debt list for payoff.
 *
 * Paid-off debts (balance <= 0) always sink to the bottom in their existing
 * order. Among the active ones, tier is applied first, and only within a tier
 * does the strategy decide: avalanche by APR descending, snowball by balance
 * ascending, custom by the order the caller supplied (the sort is stable, so
 * equal-ranked debts keep their relative positions in every strategy).
 *
 * Does not mutate the input array.
 */
export const sortDebtsForPayoff = (
  debts: Debt[],
  strategy: PayoffStrategy,
  promoteSecured: boolean
): Debt[] => {
  const active = debts.filter((debt) => debt.balance > 0);
  const paidOff = debts.filter((debt) => debt.balance <= 0);

  active.sort((a, b) => {
    const tierDiff = getDebtTier(a, promoteSecured) - getDebtTier(b, promoteSecured);
    if (tierDiff !== 0) return tierDiff;
    if (strategy === "avalanche") return b.rate - a.rate;
    if (strategy === "snowball") return a.balance - b.balance;
    return 0;
  });

  return [...active, ...paidOff];
};

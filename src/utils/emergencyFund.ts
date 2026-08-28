// BudgetArk - Emergency Fund Resolution
//
// Where the emergency-fund value comes from. When the user designates one or
// more savings accounts as their emergency fund (AssetAccount.isEmergencyFund,
// set in the Bridge account editor), the fund is "linked": its value is the
// sum of those accounts' balances - kept current automatically by
// bank-connection balance pushes - and manual goal contributions are disabled.
// Otherwise the emergency_fund SavingsGoal's currentAmount remains the source
// of truth.
//
// Lives apart from utils/savingsGoals deliberately: these helpers are needed
// by netWorth/achievementDefs/spreadsheetExport, and savingsGoals drags in the
// uuid package, which pure consumers (and their tests) shouldn't inherit.
//
// IMPORTANT for totals: linked EF money already lives in the account balances,
// so any total that sums asset accounts (net worth, Bridge tracked total) must
// not add the EF amount again in linked mode.

import { AssetAccount, BudgetEntry, SavingsGoal } from "../types";

export interface EmergencyFundSource {
  /** True when at least one live account is designated as emergency fund. */
  linked: boolean;
  /** The designated live accounts (empty when not linked). */
  accounts: AssetAccount[];
  /** Sum of the designated accounts' balances (0 when not linked). */
  linkedAmount: number;
}

export const getEmergencyFundSource = (
  accounts: AssetAccount[]
): EmergencyFundSource => {
  const designated = accounts.filter(
    (account) => account.isEmergencyFund === true && !account.deletedAt
  );
  return {
    linked: designated.length > 0,
    accounts: designated,
    linkedAmount: designated.reduce((sum, account) => sum + account.balance, 0),
  };
};

/**
 * The effective emergency-fund balance: the designated accounts' total in
 * linked mode, else the goal's stored amount (0 when neither exists).
 */
export const resolveEmergencyFundAmount = (
  goals: SavingsGoal[],
  accounts: AssetAccount[]
): number => {
  const source = getEmergencyFundSource(accounts);
  if (source.linked) return source.linkedAmount;
  const goal = goals.find((g) => g.category === "emergency_fund" && !g.deletedAt);
  return goal?.currentAmount ?? 0;
};

/**
 * Money the user has set aside via "Savings" expense entries. Only that
 * category counts toward the emergency fund - Retirement and Investing
 * aren't liquid emergency money (they feed the Gather Animals milestone
 * separately). One definition for Budget, Bridge and DebtTracker.
 */
export const sumSavingsReserve = (entries: BudgetEntry[]): number =>
  entries
    .filter((entry) => entry.type === "expense" && entry.category === "Savings")
    .reduce((sum, entry) => sum + entry.amount, 0);

export interface EmergencyFundGoalInputs {
  savingsGoals: SavingsGoal[];
  assetAccounts: AssetAccount[];
  /** Keel milestone target (0 when no debt plan yet). */
  keelTarget: number;
  /** sumSavingsReserve(entries). */
  savingsReserve: number;
}

/**
 * The emergency-fund goal a screen should display, or null when there is
 * nothing to show yet. Resolution order:
 *   1. an explicit emergency_fund SavingsGoal;
 *   2. else a synthetic goal from the Keel milestone target + the Savings
 *      reserve, so the fund appears automatically once either is non-zero;
 *   3. in linked mode (designated savings accounts - see
 *      getEmergencyFundSource) the accounts' total overlays currentAmount,
 *      keeping any explicit goal's target for the "x / y" display, and a
 *      synthetic goal is created even when 1-2 produced nothing.
 * Synthetic ids are "__keel_ef__" / "__linked_ef__" - never persisted.
 * Was duplicated in BudgetScreen and BridgeScreen "kept in sync by hand".
 */
export const resolveEmergencyFundGoal = ({
  savingsGoals,
  assetAccounts,
  keelTarget,
  savingsReserve,
}: EmergencyFundGoalInputs): SavingsGoal | null => {
  const explicit = savingsGoals.find((goal) => goal.category === "emergency_fund");
  const base =
    explicit ??
    (keelTarget > 0 || savingsReserve > 0
      ? ({
          id: "__keel_ef__",
          name: "Emergency Fund",
          category: "emergency_fund" as const,
          targetAmount: keelTarget,
          currentAmount: savingsReserve,
          createdAt: "",
          updatedAt: "",
        } satisfies SavingsGoal)
      : null);
  const source = getEmergencyFundSource(assetAccounts);
  if (!source.linked) return base;
  return {
    ...(base ?? {
      id: "__linked_ef__",
      name: "Emergency Fund",
      category: "emergency_fund" as const,
      targetAmount: keelTarget,
      createdAt: "",
      updatedAt: "",
    }),
    currentAmount: source.linkedAmount,
  } satisfies SavingsGoal;
};

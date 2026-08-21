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

import { AssetAccount, SavingsGoal } from "../types";

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

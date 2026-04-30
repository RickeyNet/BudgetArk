import type {
  AssetAccount,
  BudgetEntry,
  Debt,
  SavingsGoal,
} from "../types";

export type NetWorthTotals = {
  totalAssets: number;
  totalDebt: number;
  netWorth: number;
};

type NetWorthInput = {
  entries: BudgetEntry[];
  debts: Debt[];
  savingsGoals: SavingsGoal[];
  assetAccounts: AssetAccount[];
};

export const calculateNetWorthTotals = ({
  entries,
  debts,
  savingsGoals,
  assetAccounts,
}: NetWorthInput): NetWorthTotals => {
  const goalSavings = savingsGoals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  const entrySavings = entries
    .filter((entry) => entry.type === "expense" && entry.category === "Savings")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const totalAssetBalance = assetAccounts.reduce((sum, account) => sum + account.balance, 0);
  const totalAssets = goalSavings + entrySavings + totalAssetBalance;
  const totalDebt = debts.reduce((sum, debt) => sum + debt.balance, 0);

  return {
    totalAssets,
    totalDebt,
    netWorth: totalAssets - totalDebt,
  };
};

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

/**
 * Categories that count toward the user's "savings reserve" — kept in sync
 * with the same set used by `savingsReserve` calculations in
 * DebtTrackerScreen and BudgetScreen so Net Worth reports the same dollars
 * those screens treat as set-aside money.
 */
const RESERVE_CATEGORIES: ReadonlySet<string> = new Set([
  "Savings",
  "Retirement",
  "Investing",
]);

export const calculateNetWorthTotals = ({
  entries,
  debts,
  savingsGoals,
  assetAccounts,
}: NetWorthInput): NetWorthTotals => {
  const goalSavings = savingsGoals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  // Reserve-category expense entries flow money INTO savings. Entries that
  // are linkedAccountId-tagged have already credited an asset account (see
  // applyMissedRecurringLinkedAccountContributions + the Add/Edit handlers in
  // BudgetScreen) — counting them again here would double-count that
  // contribution against the asset balance below.
  const entrySavings = entries
    .filter(
      (entry) =>
        entry.type === "expense" &&
        RESERVE_CATEGORIES.has(entry.category) &&
        !entry.linkedAccountId,
    )
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

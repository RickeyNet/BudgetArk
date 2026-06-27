import type {
  AssetAccount,
  BudgetEntry,
  CachedQuote,
  Debt,
  Holding,
  SavingsGoal,
} from "../types";
import { holdingsTotalValue } from "./holdingsMath";

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
  /**
   * Stock/ETF positions. Optional so callers that predate the holdings
   * feature (or have it opted out) keep working unchanged - they simply
   * contribute nothing.
   */
  holdings?: Holding[];
  /**
   * Latest cached prices keyed by symbol. A holding with no cached price
   * contributes 0 (see `holdingMarketValue`), so a stale/empty cache can
   * never corrupt the net-worth total.
   */
  quotes?: Record<string, CachedQuote>;
};

/**
 * Categories that count toward the user's "savings reserve" - kept in sync
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
  holdings = [],
  quotes = {},
}: NetWorthInput): NetWorthTotals => {
  const goalSavings = savingsGoals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  // Reserve-category expense entries flow money INTO savings. Entries that
  // are linkedAccountId-tagged have already credited an asset account (see
  // applyMissedRecurringLinkedAccountContributions + the Add/Edit handlers in
  // BudgetScreen) - counting them again here would double-count that
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
  // Market value of stock/ETF positions (shares × latest cached price).
  // Unpriced positions contribute 0, so this can only ever add real money.
  const holdingsValue = holdingsTotalValue(holdings, quotes);
  const totalAssets = goalSavings + entrySavings + totalAssetBalance + holdingsValue;
  const totalDebt = debts.reduce((sum, debt) => sum + debt.balance, 0);

  return {
    totalAssets,
    totalDebt,
    netWorth: totalAssets - totalDebt,
  };
};

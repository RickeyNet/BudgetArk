/**
 * BudgetArk - Currency Migration
 * File: src/utils/currencyMigration.ts
 *
 * One-time conversion of every stored monetary value from one currency to
 * another, used by the "Convert my amounts" option when the user changes
 * their currency in Profile. Walks each storage collection, scales its money
 * fields via the static rate table (see currencyConversion), and writes them
 * back.
 *
 * IMPORTANT - pairing: this rewrites shared, sync-eligible data, and records
 * carry no per-record currency tag. Converting on one device while paired
 * would push inflated values to a partner still on the old currency and
 * corrupt their copy. The caller (ProfileScreen) must therefore block this
 * path while paired; this module assumes that guard has already run.
 *
 * Precision: balances keep cents (convertAmount rounds to 2 dp). A round trip
 * (e.g. USD→SEK→USD) will not be bit-exact, by design - static-rate rounding.
 */

import { convertAmount } from "./currencyConversion";
import {
  getDebtsIncludingDeleted,
  saveDebts,
  getPaymentsIncludingDeleted,
  savePayments,
} from "../storage/debtStorage";
import {
  getBudgetEntriesIncludingDeleted,
  saveBudgetEntries,
  getAllLimitsByMonth,
  saveCategoryBudgetLimits,
} from "../storage/budgetStorage";
import {
  getSavingsGoalsIncludingDeleted,
  saveSavingsGoals,
} from "../storage/savingsGoalStorage";
import {
  getAssetAccountsIncludingDeleted,
  saveAssetAccounts,
} from "../storage/assetAccountStorage";
import {
  getNetWorthSnapshots,
  saveNetWorthSnapshots,
} from "../storage/netWorthSnapshotStorage";
import {
  getDebtMilestonePlan,
  saveDebtMilestonePlan,
} from "../storage/debtMilestoneStorage";

export interface CurrencyMigrationResult {
  debts: number;
  payments: number;
  budgetEntries: number;
  categoryLimitMonths: number;
  savingsGoals: number;
  assetAccounts: number;
  netWorthSnapshots: number;
  milestoneSteps: number;
}

const emptyResult = (): CurrencyMigrationResult => ({
  debts: 0,
  payments: 0,
  budgetEntries: 0,
  categoryLimitMonths: 0,
  savingsGoals: 0,
  assetAccounts: 0,
  netWorthSnapshots: 0,
  milestoneSteps: 0,
});

/**
 * Convert every stored money value from `fromCode` to `toCode`. No-op (returns
 * zero counts) when the codes match. Bumps `updatedAt` on records that have it
 * so the converted values win last-write-wins on any future paired sync.
 *
 * `rates` is units-per-USD (base USD); the caller passes a live snapshot from
 * exchangeRates so the conversion uses current rates. Omitting it falls back
 * to the static table baked into convertAmount.
 */
export const convertAllStoredData = async (
  fromCode: string,
  toCode: string,
  rates?: Record<string, number>
): Promise<CurrencyMigrationResult> => {
  const result = emptyResult();
  if (fromCode === toCode) return result;

  const conv = (n: number): number => convertAmount(n, fromCode, toCode, rates);
  const now = new Date().toISOString();

  /* Debts - load with tombstones so saveDebts' merge keeps them. */
  const debts = await getDebtsIncludingDeleted();
  if (debts.length > 0) {
    await saveDebts(
      debts.map((d) => ({
        ...d,
        balance: conv(d.balance),
        originalBalance: conv(d.originalBalance),
        minPayment: conv(d.minPayment),
        updatedAt: now,
      }))
    );
    result.debts = debts.length;
  }

  /* Payments - `appliedAmount` is optional; only convert when present. */
  const payments = await getPaymentsIncludingDeleted();
  if (payments.length > 0) {
    await savePayments(
      payments.map((p) => ({
        ...p,
        amount: conv(p.amount),
        appliedAmount:
          typeof p.appliedAmount === "number"
            ? conv(p.appliedAmount)
            : p.appliedAmount,
        updatedAt: now,
      }))
    );
    result.payments = payments.length;
  }

  /* Budget entries */
  const entries = await getBudgetEntriesIncludingDeleted();
  if (entries.length > 0) {
    await saveBudgetEntries(
      entries.map((e) => ({ ...e, amount: conv(e.amount), updatedAt: now }))
    );
    result.budgetEntries = entries.length;
  }

  /* Category limits - a month → limits[] map; convert each month. */
  const limitsByMonth = await getAllLimitsByMonth();
  for (const monthKey of Object.keys(limitsByMonth)) {
    const limits = limitsByMonth[monthKey];
    if (!limits || limits.length === 0) continue;
    await saveCategoryBudgetLimits(
      limits.map((l) => ({
        ...l,
        monthlyLimit: conv(l.monthlyLimit),
        updatedAt: now,
      })),
      monthKey
    );
    result.categoryLimitMonths += 1;
  }

  /* Savings goals */
  const goals = await getSavingsGoalsIncludingDeleted();
  if (goals.length > 0) {
    await saveSavingsGoals(
      goals.map((g) => ({
        ...g,
        targetAmount: conv(g.targetAmount),
        currentAmount: conv(g.currentAmount),
        updatedAt: now,
      }))
    );
    result.savingsGoals = goals.length;
  }

  /* Asset accounts */
  const accounts = await getAssetAccountsIncludingDeleted();
  if (accounts.length > 0) {
    await saveAssetAccounts(
      accounts.map((a) => ({ ...a, balance: conv(a.balance), updatedAt: now }))
    );
    result.assetAccounts = accounts.length;
  }

  /* Net worth history - keep dayKey/capturedAt; only scale the amounts. */
  const snapshots = await getNetWorthSnapshots();
  if (snapshots.length > 0) {
    await saveNetWorthSnapshots(
      snapshots.map((s) => ({
        ...s,
        totalAssets: conv(s.totalAssets),
        totalDebt: conv(s.totalDebt),
        netWorth: conv(s.netWorth),
      }))
    );
    result.netWorthSnapshots = snapshots.length;
  }

  /* Milestone targets - saveDebtMilestonePlan stamps its own updatedAt. */
  const plan = await getDebtMilestonePlan();
  const convertedSteps = plan.steps.map((step) => {
    if (typeof step.targetAmount !== "number") return step;
    result.milestoneSteps += 1;
    return { ...step, targetAmount: conv(step.targetAmount) };
  });
  if (result.milestoneSteps > 0) {
    await saveDebtMilestonePlan({ ...plan, steps: convertedSteps });
  }

  return result;
};

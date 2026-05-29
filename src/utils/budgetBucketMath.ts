import { BUDGET_BUCKET_TARGETS } from "../data/categoryBuckets";
import type { BudgetBucket } from "../types";

export type BucketTotals = Record<BudgetBucket, number>;

export const EMPTY_BUCKET_TOTALS: BucketTotals = {
  needs: 0,
  wants: 0,
  savings: 0,
};

export const totalsByBucket = (
  spendByCategory: Record<string, number>,
  bucketByCategory: Record<string, BudgetBucket>
): BucketTotals => {
  const totals: BucketTotals = { ...EMPTY_BUCKET_TOTALS };
  for (const [category, amount] of Object.entries(spendByCategory)) {
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const bucket = bucketByCategory[category];
    if (!bucket) continue;
    totals[bucket] += amount;
  }
  return totals;
};

export const targetForBucket = (
  bucket: BudgetBucket,
  takeHomeIncome: number
): number => {
  if (!Number.isFinite(takeHomeIncome) || takeHomeIncome <= 0) return 0;
  return takeHomeIncome * BUDGET_BUCKET_TARGETS[bucket];
};

export const varianceForBucket = (
  actualAmount: number,
  targetAmount: number
): number => actualAmount - targetAmount;

export const pctOfIncome = (
  amount: number,
  income: number
): number => {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (!Number.isFinite(income) || income <= 0) return 0;
  return (amount / income) * 100;
};

export const clamp01 = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
};

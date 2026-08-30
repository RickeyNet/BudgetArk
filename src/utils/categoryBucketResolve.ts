/**
 * BudgetArk - Category Bucket Resolution
 * File: src/utils/categoryBucketResolve.ts
 *
 * Maps the selected month's spend categories onto their 50/30/20 bucket -
 * user override first, then the built-in/custom-category default - and
 * groups them into the per-bucket lists the Budget bucket card renders.
 *
 * Extracted from BudgetScreen's `bucketByCategory` / `categoriesByBucket`
 * memos: the precedence rule and the "zero spend never appears" rule are
 * the parts worth pinning in tests. Kept separate from budgetBucketMath
 * (which does the totals/target arithmetic on an already-resolved map).
 */

import {
  DEFAULT_CUSTOM_CATEGORY_BUCKET,
  getDefaultBucketForCategory,
} from "../data/categoryBuckets";
import type { BudgetBucket, CustomCategory } from "../types";

/** One category line under a bucket, as the bucket card renders it. */
export interface CategoryBucketLine {
  category: string;
  amount: number;
  /** True when the user pinned this category to the bucket by hand. */
  hasOverride: boolean;
}

export interface CategoryBucketResolution {
  /** Category -> bucket, for categories with positive spend only. */
  bucketByCategory: Record<string, BudgetBucket>;
  /** Per-bucket lines, biggest amount first. */
  categoriesByBucket: Record<BudgetBucket, CategoryBucketLine[]>;
}

export interface CategoryBucketResolveInput {
  /** Category -> month spend (unfiltered; the business chip must not move buckets). */
  expensesByCategory: Record<string, number>;
  /** Saved per-category bucket pins. */
  bucketOverrides: Record<string, BudgetBucket>;
  customCategories: CustomCategory[];
}

export const resolveCategoryBuckets = ({
  expensesByCategory,
  bucketOverrides,
  customCategories,
}: CategoryBucketResolveInput): CategoryBucketResolution => {
  const bucketByCategory: Record<string, BudgetBucket> = {};
  for (const [category, amount] of Object.entries(expensesByCategory)) {
    if (amount <= 0) continue;
    bucketByCategory[category] =
      bucketOverrides[category] ??
      getDefaultBucketForCategory(category, customCategories) ??
      DEFAULT_CUSTOM_CATEGORY_BUCKET;
  }

  const categoriesByBucket: Record<BudgetBucket, CategoryBucketLine[]> = {
    needs: [],
    wants: [],
    savings: [],
  };
  for (const [category, amount] of Object.entries(expensesByCategory)) {
    if (amount <= 0) continue;
    const bucket = bucketByCategory[category];
    if (!bucket) continue;
    categoriesByBucket[bucket].push({
      category,
      amount,
      hasOverride: bucketOverrides[category] != null,
    });
  }
  (Object.keys(categoriesByBucket) as BudgetBucket[]).forEach((bucket) => {
    categoriesByBucket[bucket].sort((a, b) => b.amount - a.amount);
  });

  return { bucketByCategory, categoriesByBucket };
};

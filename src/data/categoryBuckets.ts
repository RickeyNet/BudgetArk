import { type BudgetBucket, type BudgetCategory, type CustomCategory } from "../types";

export const BUDGET_BUCKET_ORDER: readonly BudgetBucket[] = [
  "needs",
  "wants",
  "savings",
] as const;

export const BUDGET_BUCKET_LABELS: Record<BudgetBucket, string> = {
  needs: "Needs",
  wants: "Wants",
  savings: "Savings",
};

export const BUDGET_BUCKET_TARGETS: Record<BudgetBucket, number> = {
  needs: 0.5,
  wants: 0.3,
  savings: 0.2,
};

export const DEFAULT_CUSTOM_CATEGORY_BUCKET: BudgetBucket = "wants";

const BUILT_IN_CATEGORY_BUCKETS: Partial<Record<BudgetCategory, BudgetBucket>> = {
  Housing: "needs",
  Food: "needs",
  Grocery: "needs",
  Restaurant: "wants",
  Tech: "wants",
  Fitness: "wants",
  Transportation: "needs",
  Utilities: "needs",
  Healthcare: "needs",
  Insurance: "needs",
  "Debt Payments": "needs",
  Giving: "savings",
  Retirement: "savings",
  Investing: "savings",
  Savings: "savings",
  Entertainment: "wants",
  Shopping: "wants",
  Travel: "wants",
  Other: "wants",
};

const builtInLookup = BUILT_IN_CATEGORY_BUCKETS as Record<string, BudgetBucket | undefined>;

export const getBuiltInCategoryBucket = (
  category: string
): BudgetBucket | null => builtInLookup[category] ?? null;

/** Resolve the default 50/30/20 bucket for a category (built-in map, then custom default). */
export const getDefaultBucketForCategory = (
  category: string,
  customCategories: CustomCategory[]
): BudgetBucket | null => {
  const builtIn = getBuiltInCategoryBucket(category);
  if (builtIn) return builtIn;
  const custom = customCategories.find((c) => c.name === category);
  if (custom) return custom.defaultBucket ?? DEFAULT_CUSTOM_CATEGORY_BUCKET;
  return null;
};

export const isBudgetBucket = (value: unknown): value is BudgetBucket =>
  value === "needs" || value === "wants" || value === "savings";

import * as EncryptedStorage from "./encryptedStorage";
import { isBudgetBucket } from "../data/categoryBuckets";
import type { BudgetBucket } from "../types";

const STORAGE_KEY = "@budgetark_category_bucket_overrides";

export type CategoryBucketOverrides = Record<string, BudgetBucket>;

const readStore = async (): Promise<CategoryBucketOverrides> => {
  const raw = await EncryptedStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: CategoryBucketOverrides = {};
    for (const [category, bucket] of Object.entries(parsed || {})) {
      if (typeof category === "string" && isBudgetBucket(bucket)) {
        out[category] = bucket;
      }
    }
    return out;
  } catch {
    return {};
  }
};

const writeStore = async (overrides: CategoryBucketOverrides): Promise<void> => {
  await EncryptedStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
};

export const getCategoryBucketOverrides = async (): Promise<CategoryBucketOverrides> =>
  readStore();

export const setCategoryBucketOverride = async (
  category: string,
  bucket: BudgetBucket
): Promise<CategoryBucketOverrides> => {
  const current = await readStore();
  const next = { ...current, [category]: bucket };
  await writeStore(next);
  return next;
};

export const removeCategoryBucketOverride = async (
  category: string
): Promise<CategoryBucketOverrides> => {
  const current = await readStore();
  if (!(category in current)) return current;
  const next = { ...current };
  delete next[category];
  await writeStore(next);
  return next;
};

export const clearCategoryBucketOverrides = async (): Promise<void> => {
  await EncryptedStorage.removeItem(STORAGE_KEY);
};

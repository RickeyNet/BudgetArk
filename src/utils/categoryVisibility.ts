/**
 * BudgetArk - Category Visibility
 * File: src/utils/categoryVisibility.ts
 *
 * Which built-in categories a picker offers. The built-in list itself is
 * fixed (`BUDGET_CATEGORIES` is a wire/validation contract - entries,
 * limits, sync and imports all key on those names), so "deleting" a
 * built-in means hiding it: it leaves every picker, the Limits sheet and
 * the bulk tools, while entries already filed under it keep working and
 * still show wherever they have spend. Hidden names persist per device
 * (storage/hiddenCategoriesStorage) and can be restored from Manage
 * Categories. "Other" is protected: it is the fallback the Review Inbox
 * and merchant rules file into when nothing better is known. Pure and
 * unit-tested.
 */

import { BUDGET_CATEGORIES, type BudgetCategory } from "../types";

/**
 * Built-ins a user can pick by hand. Freelance and Debt Payments are
 * driven by other features (income type, the Debts tab) and Food is the
 * legacy parent of Grocery/Restaurant - none are offered in pickers.
 */
export const SELECTABLE_BUILT_IN_CATEGORIES: readonly BudgetCategory[] =
  BUDGET_CATEGORIES.filter(
    (category) =>
      category !== "Freelance" && category !== "Debt Payments" && category !== "Food"
  );

/** Never hideable - the app files into it when nothing else fits. */
export const PROTECTED_BUILT_IN_CATEGORIES: readonly BudgetCategory[] = ["Other"];

export const canHideBuiltInCategory = (name: string): name is BudgetCategory =>
  (SELECTABLE_BUILT_IN_CATEGORIES as readonly string[]).includes(name) &&
  !(PROTECTED_BUILT_IN_CATEGORIES as readonly string[]).includes(name);

/** Fail-closed parse of the persisted hidden list: unknown or protected names are dropped. */
export const parseHiddenBuiltInCategories = (raw: string | null): BudgetCategory[] => {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<BudgetCategory>();
    for (const item of parsed) {
      if (typeof item === "string" && canHideBuiltInCategory(item)) seen.add(item);
    }
    return Array.from(seen);
  } catch {
    return [];
  }
};

/** The built-ins a picker should offer, in canonical order, minus the hidden ones. */
export const visibleBuiltInCategories = (
  hidden: ReadonlySet<string> | readonly string[]
): BudgetCategory[] => {
  const hiddenSet = hidden instanceof Set ? hidden : new Set(hidden);
  return SELECTABLE_BUILT_IN_CATEGORIES.filter((category) => !hiddenSet.has(category));
};

/**
 * BudgetArk - Hidden built-in categories
 *
 * The per-device list of built-in categories the user "deleted" from the
 * pickers (utils/categoryVisibility explains why hiding is the only safe
 * form of deleting a built-in). Device-local like the theme: not synced to
 * a partner and not part of backups - a restored phone simply shows the
 * full list again, and nothing financial lives here.
 */

import * as EncryptedStorage from "./encryptedStorage";
import type { BudgetCategory } from "../types";
import {
  canHideBuiltInCategory,
  parseHiddenBuiltInCategories,
} from "../utils/categoryVisibility";

const HIDDEN_KEY = "@budgetark_hidden_builtin_categories" as const;

export const getHiddenBuiltInCategories = async (): Promise<BudgetCategory[]> =>
  parseHiddenBuiltInCategories(await EncryptedStorage.getItem(HIDDEN_KEY));

/** Resolves the list after the change. Protected/unknown names are ignored. */
export const setBuiltInCategoryHidden = async (
  name: string,
  hidden: boolean
): Promise<BudgetCategory[]> => {
  let next: BudgetCategory[] = [];
  await EncryptedStorage.updateItem(HIDDEN_KEY, (current) => {
    const list = parseHiddenBuiltInCategories(current);
    if (!canHideBuiltInCategory(name)) {
      next = list;
      return null;
    }
    next = hidden
      ? list.includes(name)
        ? list
        : [...list, name]
      : list.filter((item) => item !== name);
    return JSON.stringify(next);
  });
  return next;
};

export const clearHiddenBuiltInCategories = async (): Promise<void> => {
  await EncryptedStorage.removeItem(HIDDEN_KEY);
};

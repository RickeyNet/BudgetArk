/**
 * BudgetArk - Category display names
 * File: src/i18n/categoryLabel.ts
 *
 * The ONE place a category's storage name becomes a label on screen.
 * Built-in `BUDGET_CATEGORIES` values are persisted on entries, synced to
 * partners, matched by merchant rules and the widget deep link - so they
 * are never translated in storage. This helper translates them for
 * DISPLAY only and passes user-created custom categories through as typed.
 *
 * Rule for callers: compare, filter, sort and store with the raw name;
 * render with `categoryLabel(t, name)` (or the hook). Never feed a label
 * back into storage or a comparison.
 */

import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { en } from "./locales/en";

type BuiltInCategory = keyof typeof en.categories;

const isBuiltInCategory = (name: string): name is BuiltInCategory =>
  Object.prototype.hasOwnProperty.call(en.categories, name);

/** Display label for a category name; custom names render unchanged. */
export const categoryLabel = (t: TFunction, name: string): string =>
  isBuiltInCategory(name) ? t(`categories.${name}`) : name;

/** Hook form: `const label = useCategoryLabel(); label(entry.category)`. */
export const useCategoryLabel = (): ((name: string) => string) => {
  const { t } = useTranslation();
  return useCallback((name: string) => categoryLabel(t, name), [t]);
};

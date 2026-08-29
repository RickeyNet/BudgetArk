/**
 * BudgetArk - Category icon mapping
 * File: src/data/categoryIcons.ts
 *
 * Emoji glyph per built-in category, the fallback glyph, the curated emoji
 * grid for the custom-category picker, and a resolver that prefers a
 * user-defined custom category's chosen icon. Emoji keeps this OTA-safe
 * (no native icon font/dep) and matches the app's existing emoji style.
 */

import { BUDGET_CATEGORIES, BudgetCategory, CustomCategory } from "../types";

export const DEFAULT_CATEGORY_ICON = "🏷️";

export const CATEGORY_ICONS: Record<BudgetCategory, string> = {
  Salary: "💵",
  Freelance: "🧾",
  Housing: "🏠",
  Food: "🍽️",
  Grocery: "🛒",
  Restaurant: "🍴",
  Tech: "💻",
  Fitness: "🏋️",
  Transportation: "🚗",
  Utilities: "💡",
  Healthcare: "🩺",
  Insurance: "🛡️",
  "Debt Payments": "💳",
  Giving: "🎁",
  Retirement: "🌅",
  Investing: "📈",
  Savings: "🐖",
  Entertainment: "🎬",
  Shopping: "🛍️",
  Travel: "✈️",
  Other: "🏷️",
};

const BUILT_IN_ICON_LOOKUP = CATEGORY_ICONS as Record<string, string | undefined>;
const BUILT_IN_NAMES = new Set<string>(BUDGET_CATEGORIES);
const BUILT_IN_NAMES_LOWER = new Set<string>(
  BUDGET_CATEGORIES.map((name) => name.toLowerCase())
);

/**
 * Curated, finance-leaning emoji set for the custom-category picker. Kept
 * deliberately short so the grid stays scannable; the keyboard's full
 * emoji set isn't needed for naming a budget bucket.
 */
export const EMOJI_CHOICES: readonly string[] = [
  "🏷️", "💵", "💰", "💳", "🪙", "🏦", "📈", "📉",
  "🏠", "🏡", "🔑", "🛠️", "🧾", "🛒", "🍽️", "🍴",
  "☕", "🍺", "🛍️", "👕", "👟", "💄", "🎁", "🎀",
  "🚗", "⛽", "🚕", "🚌", "✈️", "🏨", "🧳", "🗺️",
  "💡", "🔌", "💧", "🔥", "📱", "💻", "📶", "📺",
  "🩺", "💊", "🦷", "🏥", "🏋️", "🧘", "⚽", "🚴",
  "🎬", "🎮", "🎵", "📚", "🎓", "🐶", "🐱", "🪴",
  "👶", "👨‍👩‍👧", "💍", "🎉", "🍕", "🍔", "🍦", "🧹",
] as const;

/**
 * Resolve the glyph for any category name: a built-in's fixed icon, else a
 * matching custom category's chosen icon, else the default tag glyph.
 */
export const getCategoryIcon = (
  name: string,
  customCategories: CustomCategory[] = []
): string => {
  const builtIn = BUILT_IN_ICON_LOOKUP[name];
  if (builtIn) return builtIn;
  const custom = customCategories.find((c) => c.name === name);
  return custom?.icon || DEFAULT_CATEGORY_ICON;
};

export const isBuiltInCategory = (name: string): boolean =>
  BUILT_IN_NAMES.has(name);

/**
 * Case-insensitive variant for NAME VALIDATION: a custom category called
 * "food" would shadow the built-in "Food" in every picker while dodging the
 * exact-match check. Storage/sync keep using `isBuiltInCategory` for
 * identity (category names are stored verbatim); only the "may the user
 * create this name?" gate folds case.
 */
export const collidesWithBuiltInCategory = (name: string): boolean =>
  BUILT_IN_NAMES_LOWER.has(name.toLowerCase());

/**
 * Deterministic non-negative hash of a category name. Used to pick a stable
 * chart color slot for custom categories so the donut color doesn't shuffle
 * between renders or app launches.
 */
export const categoryNameHash = (name: string): number => {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
};

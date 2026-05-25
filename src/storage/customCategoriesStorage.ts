/**
 * BudgetArk - Custom categories storage
 * File: src/storage/customCategoriesStorage.ts
 *
 * CRUD for user-defined budget categories (v1: additive only - built-in
 * categories are fixed). Same EncryptedStorage + try/catch-with-default
 * pattern as the other storage modules. Names are sanitized and validated
 * (length, control chars, duplicate vs. built-in/custom) before write.
 */

import * as EncryptedStorage from "./encryptedStorage";
import {
  CustomCategory,
  CUSTOM_CATEGORY_STORAGE_VERSION,
} from "../types";
import { isBuiltInCategory, DEFAULT_CATEGORY_ICON } from "../data/categoryIcons";
import { sanitizeTextInput } from "../utils/sanitize";
import { generateUUID } from "../utils/uuid";

const STORAGE_KEY = "@budgetark_custom_categories";

export const MAX_CUSTOM_CATEGORIES = 30;
export const MAX_CATEGORY_NAME_LENGTH = 24;

interface CustomCategoryStore {
  categories: CustomCategory[];
  version: number;
}

export type CategoryMutationResult =
  | { ok: true; categories: CustomCategory[] }
  | { ok: false; error: string };

const readStore = async (): Promise<CustomCategory[]> => {
  const raw = await EncryptedStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Partial<CustomCategoryStore>;
    if (parsed && Array.isArray(parsed.categories)) {
      return parsed.categories.filter(
        (c): c is CustomCategory =>
          !!c && typeof c.id === "string" && typeof c.name === "string"
      );
    }
    return [];
  } catch {
    return [];
  }
};

const writeStore = async (categories: CustomCategory[]): Promise<void> => {
  const store: CustomCategoryStore = {
    categories,
    version: CUSTOM_CATEGORY_STORAGE_VERSION,
  };
  await EncryptedStorage.setItem(STORAGE_KEY, JSON.stringify(store));
};

export const getCustomCategories = async (): Promise<CustomCategory[]> =>
  readStore();

/** Normalize + bound the chosen icon to a single non-empty glyph. */
const normalizeIcon = (icon: string): string => {
  const cleaned = sanitizeTextInput(icon).trim();
  if (!cleaned) return DEFAULT_CATEGORY_ICON;
  // Take the first grapheme so a pasted string can't smuggle in extra text.
  return Array.from(cleaned)[0] ?? DEFAULT_CATEGORY_ICON;
};

/**
 * Validate a candidate name against the same rules the UI enforces, plus a
 * case-insensitive collision check against built-ins and existing customs
 * (optionally excluding one id, for rename). Returns the cleaned name or an
 * error string.
 */
const validateName = (
  rawName: string,
  existing: CustomCategory[],
  excludeId?: string
): { ok: true; name: string } | { ok: false; error: string } => {
  const name = sanitizeTextInput(rawName).trim();
  if (!name) return { ok: false, error: "Enter a category name." };
  if (name.length > MAX_CATEGORY_NAME_LENGTH) {
    return {
      ok: false,
      error: `Keep it under ${MAX_CATEGORY_NAME_LENGTH} characters.`,
    };
  }
  if (isBuiltInCategory(name)) {
    return { ok: false, error: `"${name}" is already a built-in category.` };
  }
  const lower = name.toLowerCase();
  const clash = existing.some(
    (c) => c.id !== excludeId && c.name.toLowerCase() === lower
  );
  if (clash) {
    return { ok: false, error: `"${name}" already exists.` };
  }
  return { ok: true, name };
};

export const addCustomCategory = async (
  rawName: string,
  rawIcon: string
): Promise<CategoryMutationResult> => {
  const existing = await readStore();
  if (existing.length >= MAX_CUSTOM_CATEGORIES) {
    return {
      ok: false,
      error: `You can have up to ${MAX_CUSTOM_CATEGORIES} custom categories.`,
    };
  }
  const checked = validateName(rawName, existing);
  if (!checked.ok) return checked;

  const now = new Date().toISOString();
  const next: CustomCategory[] = [
    ...existing,
    {
      id: generateUUID(),
      name: checked.name,
      icon: normalizeIcon(rawIcon),
      createdAt: now,
      updatedAt: now,
    },
  ];
  await writeStore(next);
  return { ok: true, categories: next };
};

export const updateCustomCategory = async (
  id: string,
  patch: { name?: string; icon?: string }
): Promise<CategoryMutationResult> => {
  const existing = await readStore();
  const target = existing.find((c) => c.id === id);
  if (!target) return { ok: false, error: "Category not found." };

  let name = target.name;
  if (patch.name !== undefined) {
    const checked = validateName(patch.name, existing, id);
    if (!checked.ok) return checked;
    name = checked.name;
  }
  const icon =
    patch.icon !== undefined ? normalizeIcon(patch.icon) : target.icon;

  const next = existing.map((c) =>
    c.id === id
      ? { ...c, name, icon, updatedAt: new Date().toISOString() }
      : c
  );
  await writeStore(next);
  return { ok: true, categories: next };
};

export const deleteCustomCategory = async (
  id: string
): Promise<CustomCategory[]> => {
  const existing = await readStore();
  const next = existing.filter((c) => c.id !== id);
  await writeStore(next);
  return next;
};

/**
 * Undo a delete by re-inserting the exact category object (same id, name,
 * icon, timestamps). Unlike addCustomCategory this does NOT mint a new id,
 * so any budget entries still tagged with the name keep resolving its icon.
 * Skips if the id is already present, the cap is full, or the name now
 * collides with a built-in or another custom (e.g. the user re-created it
 * during the undo window) - restoring a duplicate would corrupt lookups.
 */
export const restoreCustomCategory = async (
  category: CustomCategory
): Promise<CategoryMutationResult> => {
  const existing = await readStore();
  if (existing.some((c) => c.id === category.id)) {
    return { ok: true, categories: existing };
  }
  if (existing.length >= MAX_CUSTOM_CATEGORIES) {
    return {
      ok: false,
      error: `You can have up to ${MAX_CUSTOM_CATEGORIES} custom categories.`,
    };
  }
  const lower = category.name.toLowerCase();
  if (
    isBuiltInCategory(category.name) ||
    existing.some((c) => c.name.toLowerCase() === lower)
  ) {
    return { ok: false, error: `"${category.name}" already exists.` };
  }
  const next = [...existing, category];
  await writeStore(next);
  return { ok: true, categories: next };
};

export const clearCustomCategories = async (): Promise<void> => {
  await EncryptedStorage.removeItem(STORAGE_KEY);
};

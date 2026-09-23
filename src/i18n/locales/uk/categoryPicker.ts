/**
 * BudgetArk - Українські тексти: вибір категорії
 * File: src/i18n/locales/uk/categoryPicker.ts
 *
 * Ukrainian counterpart of en/categoryPicker.ts (the inline "+ New"
 * category creator shared by the entry form and the inbox).
 */

import type { LocalizedPlural } from "../types";
import type { categoryPicker as en } from "../en/categoryPicker";

export const categoryPicker: LocalizedPlural<typeof en> = {
  newPill: "+ Нова",
  cancelPill: "× Скасувати",
  a11yCreate: "Створити нову категорію",
  a11yCancelCreate: "Скасувати створення категорії",
  newCategoryLabel: "НОВА КАТЕГОРІЯ",
  namePlaceholder: "напр. Улюбленці, Діти, Хобі",
  pickIcon: "Вибрати значок {{glyph}}",
  adding: "Додаємо…",
  addAndSelect: "Додати й вибрати",
};

/**
 * BudgetArk - Русские тексты: выбор категории
 * File: src/i18n/locales/ru/categoryPicker.ts
 *
 * Russian counterpart of en/categoryPicker.ts (the inline "+ New" category
 * creator shared by the entry form and the inbox).
 */

import type { LocalizedPlural } from "../types";
import type { categoryPicker as en } from "../en/categoryPicker";

export const categoryPicker: LocalizedPlural<typeof en> = {
  newPill: "+ Новая",
  cancelPill: "× Отмена",
  a11yCreate: "Создать новую категорию",
  a11yCancelCreate: "Отменить создание категории",
  newCategoryLabel: "НОВАЯ КАТЕГОРИЯ",
  namePlaceholder: "напр. Питомцы, Дети, Хобби",
  pickIcon: "Выбрать значок {{glyph}}",
  adding: "Добавляем…",
  addAndSelect: "Добавить и выбрать",
};

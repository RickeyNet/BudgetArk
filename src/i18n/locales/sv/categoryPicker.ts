/**
 * BudgetArk - Svenska texter: kategoriväljaren
 * File: src/i18n/locales/sv/categoryPicker.ts
 *
 * Swedish counterpart of en/categoryPicker.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { categoryPicker as en } from "../en/categoryPicker";

export const categoryPicker: Localized<typeof en> = {
  newPill: "+ Ny",
  cancelPill: "× Avbryt",
  a11yCreate: "Skapa en ny kategori",
  a11yCancelCreate: "Avbryt ny kategori",
  newCategoryLabel: "NY KATEGORI",
  namePlaceholder: "t.ex. Husdjur, Barnomsorg, Hobbyer",
  pickIcon: "Välj ikon {{glyph}}",
  adding: "Lägger till…",
  addAndSelect: "Lägg till & välj",
};

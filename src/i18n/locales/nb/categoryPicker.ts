/**
 * BudgetArk - Norske tekster: kategorivelgeren
 * File: src/i18n/locales/nb/categoryPicker.ts
 *
 * Norwegian (Bokmål) counterpart of en/categoryPicker.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { categoryPicker as en } from "../en/categoryPicker";

export const categoryPicker: Localized<typeof en> = {
  newPill: "+ Ny",
  cancelPill: "× Avbryt",
  a11yCreate: "Opprett en ny kategori",
  a11yCancelCreate: "Avbryt ny kategori",
  newCategoryLabel: "NY KATEGORI",
  namePlaceholder: "f.eks. Kjæledyr, Barnepass, Hobbyer",
  pickIcon: "Velg ikon {{glyph}}",
  adding: "Legger til…",
  addAndSelect: "Legg til og velg",
};

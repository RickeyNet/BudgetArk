/**
 * BudgetArk - Deutsche Texte: Kategorie-Auswahl
 * File: src/i18n/locales/de/categoryPicker.ts
 *
 * German counterpart of en/categoryPicker.ts.
 */

import type { Localized } from "../types";
import type { categoryPicker as en } from "../en/categoryPicker";

export const categoryPicker: Localized<typeof en> = {
  newPill: "+ Neu",
  cancelPill: "× Abbrechen",
  a11yCreate: "Neue Kategorie anlegen",
  a11yCancelCreate: "Neue Kategorie verwerfen",
  newCategoryLabel: "NEUE KATEGORIE",
  namePlaceholder: "z. B. Haustiere, Kinderbetreuung, Hobbys",
  pickIcon: "Symbol {{glyph}} wählen",
  adding: "Wird angelegt…",
  addAndSelect: "Anlegen & auswählen",
};

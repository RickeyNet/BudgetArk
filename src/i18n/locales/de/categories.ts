/**
 * BudgetArk - Deutsche Texte: Anzeigenamen der eingebauten Kategorien
 * File: src/i18n/locales/de/categories.ts
 *
 * German counterpart of en/categories.ts. Keys stay the English storage
 * names - only the values are German.
 */

import type { Localized } from "../types";
import type { categories as en } from "../en/categories";

export const categories: Localized<typeof en> = {
  Salary: "Gehalt",
  Freelance: "Freiberuflich",
  Housing: "Wohnen",
  Food: "Essen",
  Grocery: "Lebensmittel",
  Restaurant: "Restaurant",
  Tech: "Technik",
  Fitness: "Fitness",
  Transportation: "Transport",
  Utilities: "Nebenkosten",
  Healthcare: "Gesundheit",
  Insurance: "Versicherung",
  "Debt Payments": "Schuldentilgung",
  Giving: "Spenden",
  Retirement: "Altersvorsorge",
  Investing: "Investieren",
  Savings: "Sparen",
  Entertainment: "Unterhaltung",
  Shopping: "Einkaufen",
  Travel: "Reisen",
  Other: "Sonstiges",
};

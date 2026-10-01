/**
 * BudgetArk - Svenska texter: visningsnamn för inbyggda kategorier
 * File: src/i18n/locales/sv/categories.ts
 *
 * Swedish counterpart of en/categories.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. Keys stay the English
 * storage names - only the values are Swedish.
 */

import type { Localized } from "../types";
import type { categories as en } from "../en/categories";

export const categories: Localized<typeof en> = {
  Salary: "Lön",
  Freelance: "Frilans",
  Housing: "Boende",
  Food: "Mat",
  Grocery: "Matvaror",
  Restaurant: "Restaurang",
  Tech: "Teknik",
  Fitness: "Träning",
  Transportation: "Transport",
  Utilities: "El & vatten",
  Healthcare: "Hälsa",
  Insurance: "Försäkring",
  "Debt Payments": "Skuldbetalningar",
  Giving: "Gåvor",
  Retirement: "Pension",
  Investing: "Investeringar",
  Savings: "Sparande",
  Entertainment: "Nöje",
  Shopping: "Shopping",
  Travel: "Resor",
  Other: "Övrigt",
};

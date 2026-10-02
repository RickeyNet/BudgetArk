/**
 * BudgetArk - Norske tekster: visningsnavn for innebygde kategorier
 * File: src/i18n/locales/nb/categories.ts
 *
 * Norwegian (Bokmål) counterpart of en/categories.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. Keys stay the English
 * storage names - only the values are Norwegian.
 */

import type { Localized } from "../types";
import type { categories as en } from "../en/categories";

export const categories: Localized<typeof en> = {
  Salary: "Lønn",
  Freelance: "Frilans",
  Housing: "Bolig",
  Food: "Mat",
  Grocery: "Dagligvarer",
  Restaurant: "Restaurant",
  Tech: "Teknologi",
  Fitness: "Trening",
  Transportation: "Transport",
  Utilities: "Strøm og vann",
  Healthcare: "Helse",
  Insurance: "Forsikring",
  "Debt Payments": "Gjeldsbetalinger",
  Giving: "Gaver",
  Retirement: "Pensjon",
  Investing: "Investering",
  Savings: "Sparing",
  Entertainment: "Underholdning",
  Shopping: "Shopping",
  Travel: "Reise",
  Other: "Annet",
};

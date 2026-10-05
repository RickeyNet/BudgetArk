/**
 * BudgetArk - English strings: built-in category display names
 * File: src/i18n/locales/en/categories.ts
 *
 * Keys are the EXACT `BUDGET_CATEGORIES` values (persisted on entries,
 * shipped in SyncDiff, used by merchant rules and the widget deep link) -
 * the value is what the user sees. Storage never changes; only the label
 * does. Custom categories have no entry here and render as typed (see
 * ../../categoryLabel.ts). `satisfies` keeps this table in lockstep with
 * the type: add a built-in category and this file fails typecheck.
 */

import type { BudgetCategory } from "../../../types";

export const categories = {
  Salary: "Salary",
  Freelance: "Freelance",
  Housing: "Housing",
  Food: "Food",
  Grocery: "Grocery",
  Restaurant: "Restaurant",
  Tech: "Tech",
  Fitness: "Fitness",
  Transportation: "Transportation",
  Utilities: "Utilities",
  Healthcare: "Healthcare",
  Insurance: "Insurance",
  "Debt Payments": "Debt Payments",
  Giving: "Giving",
  Retirement: "Retirement",
  Investing: "Investing",
  Savings: "Savings",
  Entertainment: "Entertainment",
  Shopping: "Shopping",
  Travel: "Travel",
  Other: "Other",
} as const satisfies Record<BudgetCategory, string>;

/**
 * BudgetArk - Українські тексти: назви категорій
 * File: src/i18n/locales/uk/categories.ts
 *
 * Ukrainian counterpart of en/categories.ts. KEYS are the persisted
 * BUDGET_CATEGORIES ids and never change; only the display names move.
 */

import type { LocalizedPlural } from "../types";
import type { categories as en } from "../en/categories";

export const categories: LocalizedPlural<typeof en> = {
  Salary: "Зарплата",
  Freelance: "Фриланс",
  Housing: "Житло",
  Food: "Їжа",
  Grocery: "Продукти",
  Restaurant: "Ресторани",
  Tech: "Техніка",
  Fitness: "Фітнес",
  Transportation: "Транспорт",
  Utilities: "Комунальні",
  Healthcare: "Здоров'я",
  Insurance: "Страхування",
  "Debt Payments": "Платежі за боргами",
  Giving: "Пожертви",
  Retirement: "Пенсія",
  Investing: "Інвестиції",
  Savings: "Заощадження",
  Entertainment: "Розваги",
  Shopping: "Покупки",
  Travel: "Подорожі",
  Other: "Інше",
};

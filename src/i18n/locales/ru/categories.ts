/**
 * BudgetArk - Русские тексты: названия категорий
 * File: src/i18n/locales/ru/categories.ts
 *
 * Russian counterpart of en/categories.ts. KEYS are the persisted
 * BUDGET_CATEGORIES ids and never change; only the display names move.
 */

import type { LocalizedPlural } from "../types";
import type { categories as en } from "../en/categories";

export const categories: LocalizedPlural<typeof en> = {
  Salary: "Зарплата",
  Freelance: "Фриланс",
  Housing: "Жильё",
  Food: "Еда",
  Grocery: "Продукты",
  Restaurant: "Рестораны",
  Tech: "Техника",
  Fitness: "Фитнес",
  Transportation: "Транспорт",
  Utilities: "Коммунальные",
  Healthcare: "Здоровье",
  Insurance: "Страховка",
  "Debt Payments": "Платежи по долгам",
  Giving: "Пожертвования",
  Retirement: "Пенсия",
  Investing: "Инвестиции",
  Savings: "Сбережения",
  Entertainment: "Развлечения",
  Shopping: "Покупки",
  Travel: "Путешествия",
  Other: "Прочее",
};

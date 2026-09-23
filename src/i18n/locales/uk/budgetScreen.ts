/**
 * BudgetArk - Українські тексти: вкладка «Бюджет» (screen)
 * File: src/i18n/locales/uk/budgetScreen.ts
 *
 * Ukrainian counterpart of en/budgetScreen.ts. Informal "ти" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. Four plural forms
 * (one / few / many / other) per English `_one` key.
 */

import type { LocalizedPlural } from "../types";
import type { budgetScreen as en } from "../en/budgetScreen";

export const budgetScreen: LocalizedPlural<typeof en> = {
  header: {
    title: "Бюджет",
    subtitle: "Відстежуй доходи, витрати та ліміти за категоріями.",
    billCalendarA11y: "Календар рахунків",
    searchA11y: "Пошук за боргами, платежами та записами бюджету",
    inboxA11y: "Вхідні на перевірку, очікує: {{count}}",
  },
  monthNav: {
    previousA11y: "Попередній місяць",
    nextA11y: "Наступний місяць",
  },
  insights: {
    title: "Аналітика",
    hint: "Тренди, зміни, серії, порівняння",
  },
  summary: {
    income: "Дохід",
    spent: "Витрачено",
    net: "Разом",
    plannedMinimums: "Разом із {{amount}} планових мінімальних платежів із вкладки «Борги»",
    retirement: "Плюс {{amount}} у 401(k) цього місяця (не рахується як дохід)",
    taxSetAside: "Відклади {{amount}} з доходу 1099 за цей місяць на податки",
  },
  selection: {
    cancelA11y: "Скасувати вибір",
    selected_one: "Вибрано: {{count}}",
    selected_few: "Вибрано: {{count}}",
    selected_many: "Вибрано: {{count}}",
    selected_other: "Вибрано: {{count}}",
    recategorize: "Змінити категорію",
    recategorizeA11y: "Змінити категорію вибраних записів",
    deleteA11y: "Видалити вибрані записи",
    moveTitle_one: "Перемістити {{count}} запис до…",
    moveTitle_few: "Перемістити {{count}} записи до…",
    moveTitle_many: "Перемістити {{count}} записів до…",
    moveTitle_other: "Перемістити {{count}} запису до…",
  },
  bucket: {
    title: "Змінити кошик",
    currently: " - зараз {{bucket}}",
    useDefault: "За замовчуванням ({{bucket}})",
  },
  limit: {
    title: "Місячний ліміт",
    placeholder: "0,00",
    hint: "Залиш порожнім, щоб прибрати ліміт.",
  },
  emergencyFund: {
    title: "Резервний фонд",
    currentBalance: "Поточний баланс: {{amount}}",
    target: " / {{amount}}",
    tracked_one: " • рахується за {{count}} вибраним ощадним рахунком",
    tracked_few: " • рахується за {{count}} вибраними ощадними рахунками",
    tracked_many: " • рахується за {{count}} вибраними ощадними рахунками",
    tracked_other: " • рахується за {{count}} вибраними ощадними рахунками",
    placeholder: "Сума поповнення (або від'ємна для зняття)",
    hint: "Додатне число - поповнити, від'ємне - зняти.",
  },
  undo: {
    edited: "Змінено: «{{label}}»",
    deleted: "Видалено: «{{label}}»",
    deletedEntry: "Запис видалено",
    deletedCount_one: "Видалено {{count}} запис",
    deletedCount_few: "Видалено {{count}} записи",
    deletedCount_many: "Видалено {{count}} записів",
    deletedCount_other: "Видалено {{count}} запису",
    moved_one: "{{count}} запис переміщено до {{category}}",
    moved_few: "{{count}} записи переміщено до {{category}}",
    moved_many: "{{count}} записів переміщено до {{category}}",
    moved_other: "{{count}} запису переміщено до {{category}}",
  },
};

/**
 * BudgetArk - Русские тексты: вкладка «Бюджет» (screen)
 * File: src/i18n/locales/ru/budgetScreen.ts
 *
 * Russian counterpart of en/budgetScreen.ts. Informal "ты" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. Four plural forms
 * (one / few / many / other) per English `_one` key.
 */

import type { LocalizedPlural } from "../types";
import type { budgetScreen as en } from "../en/budgetScreen";

export const budgetScreen: LocalizedPlural<typeof en> = {
  header: {
    title: "Бюджет",
    subtitle: "Учитывай доходы, расходы и лимиты по категориям.",
    billCalendarA11y: "Календарь счетов",
    searchA11y: "Поиск по долгам, платежам и записям бюджета",
    inboxA11y: "Входящие на проверку, ожидает: {{count}}",
  },
  monthNav: {
    previousA11y: "Предыдущий месяц",
    nextA11y: "Следующий месяц",
  },
  insights: {
    title: "Аналитика",
    hint: "Тренды, изменения, серии, сравнения",
  },
  summary: {
    income: "Доход",
    spent: "Потрачено",
    net: "Итого",
    plannedMinimums: "Включая {{amount}} плановых минимальных платежей с вкладки «Долги»",
    retirement: "Плюс {{amount}} в 401(k) в этом месяце (не считается доходом)",
    taxSetAside: "Отложи {{amount}} из дохода 1099 за этот месяц на налоги",
  },
  selection: {
    cancelA11y: "Отменить выбор",
    selected_one: "Выбрано: {{count}}",
    selected_few: "Выбрано: {{count}}",
    selected_many: "Выбрано: {{count}}",
    selected_other: "Выбрано: {{count}}",
    recategorize: "Сменить категорию",
    recategorizeA11y: "Сменить категорию выбранных записей",
    deleteA11y: "Удалить выбранные записи",
    moveTitle_one: "Переместить {{count}} запись в…",
    moveTitle_few: "Переместить {{count}} записи в…",
    moveTitle_many: "Переместить {{count}} записей в…",
    moveTitle_other: "Переместить {{count}} записи в…",
  },
  bucket: {
    title: "Изменить корзину",
    currently: " - сейчас {{bucket}}",
    useDefault: "По умолчанию ({{bucket}})",
  },
  limit: {
    title: "Месячный лимит",
    placeholder: "0,00",
    hint: "Оставь пустым, чтобы убрать лимит.",
  },
  emergencyFund: {
    title: "Резервный фонд",
    currentBalance: "Текущий баланс: {{amount}}",
    target: " / {{amount}}",
    tracked_one: " • учитывается по {{count}} выбранному сберегательному счёту",
    tracked_few: " • учитывается по {{count}} выбранным сберегательным счетам",
    tracked_many: " • учитывается по {{count}} выбранным сберегательным счетам",
    tracked_other: " • учитывается по {{count}} выбранным сберегательным счетам",
    placeholder: "Сумма пополнения (или отрицательная для снятия)",
    hint: "Положительное число - пополнить, отрицательное - снять.",
  },
  undo: {
    edited: "Изменено: «{{label}}»",
    deleted: "Удалено: «{{label}}»",
    deletedEntry: "Запись удалена",
    deletedCount_one: "Удалена {{count}} запись",
    deletedCount_few: "Удалено {{count}} записи",
    deletedCount_many: "Удалено {{count}} записей",
    deletedCount_other: "Удалено {{count}} записи",
    moved_one: "{{count}} запись перемещена в {{category}}",
    moved_few: "{{count}} записи перемещены в {{category}}",
    moved_many: "{{count}} записей перемещено в {{category}}",
    moved_other: "{{count}} записи перемещено в {{category}}",
  },
};

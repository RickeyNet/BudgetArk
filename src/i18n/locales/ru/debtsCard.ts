/**
 * BudgetArk - Русские тексты: вкладка «Долги» (карточка)
 * File: src/i18n/locales/ru/debtsCard.ts
 *
 * Russian counterpart of en/debtsCard.ts. Informal "ты" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { LocalizedPlural } from "../types";
import type { debtsCard as en } from "../en/debtsCard";

export const debtsCard: LocalizedPlural<typeof en> = {
  card: {
    status: {
      almost: "Почти готово!",
      progress: "Есть прогресс",
      keepGoing: "Так держать",
    },
    collapsedDetail: "{{balance}} · {{rate}}% годовых",
    rateLine: "{{rate}}% годовых · минимум {{minimum}}/мес",
    meta: "Владелец: {{owner}} · Тип: {{type}}",
    reviewType: "Проверить тип",
    remaining: "ОСТАЛОСЬ",
    paidOff: "ВЫПЛАЧЕНО",
    bankSync: "Баланс из {{account}}",
    bankSyncAsOf: "Баланс из {{account}} · на {{date}}",
    goal: {
      passed: "Дата цели прошла",
      line: "Цель: {{date}} ({{monthsLeft}})",
      monthsLeft_one: "остался {{count}} мес",
      monthsLeft_few: "осталось {{count}} мес",
      monthsLeft_many: "осталось {{count}} мес",
      monthsLeft_other: "осталось {{count}} мес",
      onTrack: "По плану",
      need: "Нужно {{amount}}/мес",
    },
    keepAlive: {
      active: "Карта активна · следующее использование до {{date}}",
      overdue: "Срок неактивности прошёл ({{date}}) · воспользуйся скорее",
      useBy: "Использовать до {{date}} ({{when}})",
      today: "сегодня",
      tomorrow: "завтра",
      days_one: "{{count}} день",
      days_few: "{{count}} дня",
      days_many: "{{count}} дней",
      days_other: "{{count}} дня",
      usedIt: "Я пользовался",
    },
    timeline: {
      adjust: "Изменить план платежей",
      months_one: "{{count}} месяц до погашения",
      months_few: "{{count}} месяца до погашения",
      months_many: "{{count}} месяцев до погашения",
      months_other: "{{count}} месяца до погашения",
    },
    pay: "Оплатить",
    deleteA11y: "Удалить {{name}}",
    confirmPaymentA11y: "Подтвердить платёж",
    paymentPlaceholder: "Сумма платежа",
  },
  history: {
    title: "История платежей",
    totalPaid: "Всего выплачено: {{amount}}",
    deletedDebt: "Удалённый долг",
    empty: {
      title: "Платежей пока нет",
      subtitle: "Здесь появятся твои платежи.",
    },
    selected_one: "Выбран {{count}}",
    selected_few: "Выбрано {{count}}",
    selected_many: "Выбрано {{count}}",
    selected_other: "Выбрано {{count}}",
    deleteSelectedA11y: "Удалить выбранные платежи",
    deleted_one: "Удалён {{count}} платёж",
    deleted_few: "Удалено {{count}} платежа",
    deleted_many: "Удалено {{count}} платежей",
    deleted_other: "Удалено {{count}} платежа",
    undoA11y: "Отменить удаление платежей",
    undo: "ОТМЕНИТЬ",
  },
};

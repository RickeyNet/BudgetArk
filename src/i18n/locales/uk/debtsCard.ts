/**
 * BudgetArk - Українські тексти: вкладка «Борги» (картка)
 * File: src/i18n/locales/uk/debtsCard.ts
 *
 * Ukrainian counterpart of en/debtsCard.ts. Informal "ти" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { LocalizedPlural } from "../types";
import type { debtsCard as en } from "../en/debtsCard";

export const debtsCard: LocalizedPlural<typeof en> = {
  card: {
    status: {
      almost: "Майже готово!",
      progress: "Є прогрес",
      keepGoing: "Так тримати",
    },
    collapsedDetail: "{{balance}} · {{rate}}% річних",
    rateLine: "{{rate}}% річних · мінімум {{minimum}}/міс",
    meta: "Власник: {{owner}} · Тип: {{type}}",
    reviewType: "Перевірити тип",
    remaining: "ЗАЛИШИЛОСЯ",
    paidOff: "ВИПЛАЧЕНО",
    bankSync: "Баланс із {{account}}",
    bankSyncAsOf: "Баланс із {{account}} · станом на {{date}}",
    goal: {
      passed: "Дата цілі минула",
      line: "Ціль: {{date}} ({{monthsLeft}})",
      monthsLeft_one: "залишився {{count}} міс",
      monthsLeft_few: "залишилося {{count}} міс",
      monthsLeft_many: "залишилося {{count}} міс",
      monthsLeft_other: "залишилося {{count}} міс",
      onTrack: "За планом",
      need: "Потрібно {{amount}}/міс",
    },
    keepAlive: {
      active: "Картка активна · наступне використання до {{date}}",
      overdue: "Термін неактивності минув ({{date}}) · скористайся якнайшвидше",
      useBy: "Використати до {{date}} ({{when}})",
      today: "сьогодні",
      tomorrow: "завтра",
      days_one: "{{count}} день",
      days_few: "{{count}} дні",
      days_many: "{{count}} днів",
      days_other: "{{count}} дня",
      usedIt: "Я користувався",
    },
    timeline: {
      adjust: "Змінити план платежів",
      months_one: "{{count}} місяць до погашення",
      months_few: "{{count}} місяці до погашення",
      months_many: "{{count}} місяців до погашення",
      months_other: "{{count}} місяця до погашення",
    },
    pay: "Сплатити",
    deleteA11y: "Видалити {{name}}",
    confirmPaymentA11y: "Підтвердити платіж",
    paymentPlaceholder: "Сума платежу",
  },
  history: {
    title: "Історія платежів",
    totalPaid: "Усього сплачено: {{amount}}",
    deletedDebt: "Видалений борг",
    empty: {
      title: "Платежів ще немає",
      subtitle: "Тут з'являться твої платежі.",
    },
    selected_one: "Вибрано {{count}}",
    selected_few: "Вибрано {{count}}",
    selected_many: "Вибрано {{count}}",
    selected_other: "Вибрано {{count}}",
    deleteSelectedA11y: "Видалити вибрані платежі",
    deleted_one: "Видалено {{count}} платіж",
    deleted_few: "Видалено {{count}} платежі",
    deleted_many: "Видалено {{count}} платежів",
    deleted_other: "Видалено {{count}} платежу",
    undoA11y: "Скасувати видалення платежів",
    undo: "СКАСУВАТИ",
  },
};

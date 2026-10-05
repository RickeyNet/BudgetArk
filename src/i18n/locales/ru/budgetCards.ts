/**
 * BudgetArk - Русские тексты: вкладка «Бюджет» (cards)
 * File: src/i18n/locales/ru/budgetCards.ts
 *
 * Russian counterpart of en/budgetCards.ts. Informal "ты" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 *
 * Ordinal days: Russian writes "12-е" for every day, so every English
 * plural-rule bucket carries the same "-е" suffix.
 */

import type { LocalizedPlural } from "../types";
import type { budgetCards as en } from "../en/budgetCards";

export const budgetCards: LocalizedPlural<typeof en> = {
  paycheck: {
    title: "До зарплаты",
    change: "Изменить",
    emptyIntro:
      "Скажи BudgetArk, когда тебе платят, и он покажет, что нужно оплатить до следующей выплаты - и сколько можно потратить до неё.",
    setUp: "Настроить периоды выплат",
    noNextPayday: "По твоему графику не удалось вычислить следующую выплату - проверь его.",
    howOften: "Как часто тебе платят?",
    frequency: {
      weekly: "Еженедельно",
      biweekly: "Раз в 2 недели",
      semimonthly: "Дважды в месяц",
      monthly: "Ежемесячно",
    },
    recentPayday: "Последняя выплата",
    paydays: "Дни выплат",
    payday: "День выплаты",
    semimonthly: {
      "1-15": "1-го и 15-го",
      "15-last": "15-го и в последний день",
    },
    lastDay: "Последний день",
    ordinalSuffix: { one: "-е", two: "-е", few: "-е", other: "-е" },
    dayOrdinal: "{{day}}{{suffix}}",
    pickPayday: "Сначала выбери недавний день выплаты.",
    saveFailed: "Не удалось сохранить график выплат.",
    saveSchedule: "Сохранить график",
    privacyHint: "Остаётся на этом телефоне. Нужно только чтобы разбить бюджет на периоды выплат.",
    nextCheck: "Следующая выплата {{date}} · {{when}}",
    tomorrow: "завтра",
    inDays_one: "через {{count}} день",
    inDays_few: "через {{count}} дня",
    inDays_many: "через {{count}} дней",
    inDays_other: "через {{count}} дня",
    dueBefore: "Оплатить до неё",
    nothingDue: "До следующей выплаты в календаре ничего нет.",
    today: "сегодня",
    overdue: "просрочено · {{date}}",
    showFewer: "Свернуть",
    showMore: "+ещё {{count}}",
    safeUntilPayday: "Можно потратить до зарплаты",
    shortBy: "Не хватает до зарплаты",
    perDay: "Примерно {{amount}} в день. ",
    cashNow:
      "Сейчас на руках ≈ {{amount}}: начальный баланс плюс то, что по записям уже поступило в этом месяце.",
    recordBalance:
      "Запиши начальный баланс текущего счёта за этот месяц - и карточка покажет, сколько можно потратить до зарплаты. ",
    setIt: "Указать",
  },
  monthBalance: {
    promptTitle: "Новый месяц - обнови баланс",
    title: "Начальный баланс",
    subtitle:
      "Сколько на текущем счёте в начале {{month}}? BudgetArk использует это, чтобы спрогнозировать остаток на конец месяца и сумму, которую можно потратить.",
    inputPlaceholder: "0,00",
    inputA11y: "Начальный баланс текущего счёта",
    usePrefill: "Взять сумму текущих счетов с Мостика: {{amount}}",
    alsoUpdates: "Также обновит «{{account}}» на Мостике, чтобы чистые активы были актуальны.",
    saveFailed: "Не удалось сохранить баланс. Попробуй ещё раз.",
    notNow: "Не сейчас",
    saving: "Сохранение…",
  },
  cashFlow: {
    title: "Денежный поток",
    emptyIntro:
      "Введи начальный баланс текущего счёта за этот месяц - и BudgetArk спрогнозирует, чем закончится месяц и сколько можно потратить.",
    setStarting: "Указать начальный баланс",
    update: "Обновить",
    startingCash: "Начальный баланс",
    projectedEnd: "Прогноз на конец месяца",
    safeToSpend: "Можно потратить",
    overPlanBy: "Сверх плана на",
    hint: "Доходы минус расходы за месяц, включая плановые счета и минимальные платежи по долгам.",
    reconcileOnPlan: "Старт точно по плану прошлого месяца",
    reconcileAbove: "Старт на {{amount}} выше плана прошлого месяца",
    reconcileBelow: "Старт на {{amount}} ниже плана прошлого месяца",
  },
  reminderOffer: {
    eyebrow: "НАПОМИНАНИЯ ОБ УЧЁТЕ",
    title: "🔔 Напоминать вести учёт?",
    body:
      "Короткое напоминание, если несколько дней нет записей, и подсказка 1-го числа. Никаких сумм, балансов, счетов или платежей - только повод вернуться в приложение. Настроить или выключить можно в любой момент: Профиль → Напоминания об учёте.",
    turnOn: "Включить",
    asking: "Запрашиваем у телефона...",
    noThanks: "Нет, спасибо",
    permissionTitle: "Уведомления выключены",
    permissionMessage:
      "Чтобы присылать напоминания, BudgetArk нужно разрешение на уведомления. Включи его в настройках телефона, а затем включи напоминания в Профиль → Напоминания об учёте.",
    notNow: "Не сейчас",
    openSettings: "Открыть настройки",
    failedTitle: "Не удалось включить напоминания",
    failedMessage:
      "Не получилось сохранить настройку. Попробуй ещё раз в Профиль → Напоминания об учёте.",
  },
  debtDue: {
    eyebrow: "НАПОМИНАНИЕ О ПЛАТЕЖЕ ПО ДОЛГУ",
    summary_one: "{{count}} минимальный платёж в ближайшие {{days}} дн.",
    summary_few: "{{count}} минимальных платежа в ближайшие {{days}} дн.",
    summary_many: "{{count}} минимальных платежей в ближайшие {{days}} дн.",
    summary_other: "{{count}} минимального платежа в ближайшие {{days}} дн.",
    total: "{{amount}} минимальных платежей всего (с вкладки «Долги»)",
    next: "Следующий: {{name}} · {{amount}} · {{when}}",
    today: "сегодня",
    tomorrow: "завтра",
    inDays_one: "через {{count}} день",
    inDays_few: "через {{count}} дня",
    inDays_many: "через {{count}} дней",
    inDays_other: "через {{count}} дня",
  },
  dueDate: {
    eyebrow: "НАПОМИНАНИЕ О СРОКЕ",
    summary_one: "{{count}} счёт в ближайшие {{days}} дн.",
    summary_few: "{{count}} счёта в ближайшие {{days}} дн.",
    summary_many: "{{count}} счетов в ближайшие {{days}} дн.",
    summary_other: "{{count}} счёта в ближайшие {{days}} дн.",
    total: "{{amount}} запланировано всего",
    next: "Следующий: {{name}} · {{amount}} · {{when}}",
    today: "сегодня",
    tomorrow: "завтра",
    inDays_one: "через {{count}} день",
    inDays_few: "через {{count}} дня",
    inDays_many: "через {{count}} дней",
    inDays_other: "через {{count}} дня",
  },
  pace: {
    eyebrow: "ТЕМП РАСХОДОВ",
    overTitle: "{{category}}: лимит {{limit}} превышен на {{overBy}}",
    overDetail: "Всё, что ещё потратишь в этой категории в этом месяце, выходит за план.",
    aheadTitle: "{{category}}: потрачено {{percent}} %, а сегодня только {{dayOrdinal}}",
    aheadDetail:
      "В таком темпе к концу месяца выйдет {{projected}} при лимите {{limit}} - в норме к сегодняшнему дню было бы {{expected}}.",
    more_one: "+ещё {{count}} категория вне темпа: {{list}}",
    more_few: "+ещё {{count}} категории вне темпа: {{list}}",
    more_many: "+ещё {{count}} категорий вне темпа: {{list}}",
    more_other: "+ещё {{count}} категории вне темпа: {{list}}",
    listSeparator: ", ",
  },
};

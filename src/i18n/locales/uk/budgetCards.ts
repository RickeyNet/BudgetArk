/**
 * BudgetArk - Українські тексти: вкладка «Бюджет» (cards)
 * File: src/i18n/locales/uk/budgetCards.ts
 *
 * Ukrainian counterpart of en/budgetCards.ts. Informal "ти" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 *
 * Ordinal days: Ukrainian ordinal endings line up with the English
 * plural-rule buckets the component uses - 1-ше / 21-ше (one), 2-ге / 22-ге
 * (two), 3-тє / 23-тє (few), everything else -те (4-те, 11-те, 12-те...).
 */

import type { LocalizedPlural } from "../types";
import type { budgetCards as en } from "../en/budgetCards";

export const budgetCards: LocalizedPlural<typeof en> = {
  paycheck: {
    title: "До зарплати",
    change: "Змінити",
    emptyIntro:
      "Скажи BudgetArk, коли тобі платять, і він покаже, що треба оплатити до наступної виплати - і скільки можна витратити до неї.",
    setUp: "Налаштувати періоди виплат",
    noNextPayday: "За твоїм графіком не вдалося обчислити наступну виплату - перевір його.",
    howOften: "Як часто тобі платять?",
    frequency: {
      weekly: "Щотижня",
      biweekly: "Раз на 2 тижні",
      semimonthly: "Двічі на місяць",
      monthly: "Щомісяця",
    },
    recentPayday: "Остання виплата",
    paydays: "Дні виплат",
    payday: "День виплати",
    semimonthly: {
      "1-15": "1-го та 15-го",
      "15-last": "15-го та в останній день",
    },
    lastDay: "Останній день",
    ordinalSuffix: { one: "-ше", two: "-ге", few: "-тє", other: "-те" },
    dayOrdinal: "{{day}}{{suffix}}",
    pickPayday: "Спочатку вибери недавній день виплати.",
    saveFailed: "Не вдалося зберегти графік виплат.",
    saveSchedule: "Зберегти графік",
    privacyHint: "Залишається на цьому телефоні. Потрібно лише щоб розбити бюджет на періоди виплат.",
    nextCheck: "Наступна виплата {{date}} · {{when}}",
    tomorrow: "завтра",
    inDays_one: "через {{count}} день",
    inDays_few: "через {{count}} дні",
    inDays_many: "через {{count}} днів",
    inDays_other: "через {{count}} дня",
    dueBefore: "Оплатити до неї",
    nothingDue: "До наступної виплати в календарі нічого немає.",
    today: "сьогодні",
    overdue: "прострочено · {{date}}",
    showFewer: "Згорнути",
    showMore: "+ще {{count}}",
    safeUntilPayday: "Можна витратити до зарплати",
    shortBy: "Не вистачає до зарплати",
    perDay: "Приблизно {{amount}} на день. ",
    cashNow:
      "Зараз на руках ≈ {{amount}}: початковий баланс плюс те, що за записами вже надійшло цього місяця.",
    recordBalance:
      "Запиши початковий баланс поточного рахунку за цей місяць - і картка покаже, скільки можна витратити до зарплати. ",
    setIt: "Вказати",
  },
  monthBalance: {
    promptTitle: "Новий місяць - онови баланс",
    title: "Початковий баланс",
    subtitle:
      "Скільки на поточному рахунку на початку {{month}}? BudgetArk використовує це, щоб спрогнозувати залишок на кінець місяця та суму, яку можна витратити.",
    inputPlaceholder: "0,00",
    inputA11y: "Початковий баланс поточного рахунку",
    usePrefill: "Узяти суму поточних рахунків із Містка: {{amount}}",
    alsoUpdates: "Також оновить «{{account}}» на Містку, щоб чисті активи були актуальні.",
    saveFailed: "Не вдалося зберегти баланс. Спробуй ще раз.",
    notNow: "Не зараз",
    saving: "Збереження…",
  },
  cashFlow: {
    title: "Грошовий потік",
    emptyIntro:
      "Введи початковий баланс поточного рахунку за цей місяць - і BudgetArk спрогнозує, чим закінчиться місяць і скільки можна витратити.",
    setStarting: "Вказати початковий баланс",
    update: "Оновити",
    startingCash: "Початковий баланс",
    projectedEnd: "Прогноз на кінець місяця",
    safeToSpend: "Можна витратити",
    overPlanBy: "Понад план на",
    hint: "Доходи мінус витрати за місяць, разом із плановими рахунками та мінімальними платежами за боргами.",
    reconcileOnPlan: "Старт точно за планом минулого місяця",
    reconcileAbove: "Старт на {{amount}} вище за план минулого місяця",
    reconcileBelow: "Старт на {{amount}} нижче за план минулого місяця",
  },
  reminderOffer: {
    eyebrow: "НАГАДУВАННЯ ПРО ОБЛІК",
    title: "🔔 Нагадувати вести облік?",
    body:
      "Коротке нагадування, якщо кілька днів немає записів, і підказка 1-го числа. Жодних сум, балансів, рахунків чи платежів - лише привід повернутися до застосунку. Налаштувати або вимкнути можна будь-коли: Профіль → Нагадування про облік.",
    turnOn: "Увімкнути",
    asking: "Запитуємо в телефона...",
    noThanks: "Ні, дякую",
    permissionTitle: "Сповіщення вимкнено",
    permissionMessage:
      "Щоб надсилати нагадування, BudgetArk потрібен дозвіл на сповіщення. Увімкни його в налаштуваннях телефона, а потім увімкни нагадування в Профіль → Нагадування про облік.",
    notNow: "Не зараз",
    openSettings: "Відкрити налаштування",
    failedTitle: "Не вдалося ввімкнути нагадування",
    failedMessage:
      "Не вдалося зберегти налаштування. Спробуй ще раз у Профіль → Нагадування про облік.",
  },
  debtDue: {
    eyebrow: "НАГАДУВАННЯ ПРО ПЛАТІЖ ЗА БОРГОМ",
    summary_one: "{{count}} мінімальний платіж у найближчі {{days}} дн.",
    summary_few: "{{count}} мінімальні платежі в найближчі {{days}} дн.",
    summary_many: "{{count}} мінімальних платежів у найближчі {{days}} дн.",
    summary_other: "{{count}} мінімального платежу в найближчі {{days}} дн.",
    total: "{{amount}} мінімальних платежів разом (із вкладки «Борги»)",
    next: "Наступний: {{name}} · {{amount}} · {{when}}",
    today: "сьогодні",
    tomorrow: "завтра",
    inDays_one: "через {{count}} день",
    inDays_few: "через {{count}} дні",
    inDays_many: "через {{count}} днів",
    inDays_other: "через {{count}} дня",
  },
  dueDate: {
    eyebrow: "НАГАДУВАННЯ ПРО ТЕРМІН",
    summary_one: "{{count}} рахунок у найближчі {{days}} дн.",
    summary_few: "{{count}} рахунки в найближчі {{days}} дн.",
    summary_many: "{{count}} рахунків у найближчі {{days}} дн.",
    summary_other: "{{count}} рахунку в найближчі {{days}} дн.",
    total: "{{amount}} заплановано разом",
    next: "Наступний: {{name}} · {{amount}} · {{when}}",
    today: "сьогодні",
    tomorrow: "завтра",
    inDays_one: "через {{count}} день",
    inDays_few: "через {{count}} дні",
    inDays_many: "через {{count}} днів",
    inDays_other: "через {{count}} дня",
  },
  pace: {
    eyebrow: "ТЕМП ВИТРАТ",
    overTitle: "{{category}}: ліміт {{limit}} перевищено на {{overBy}}",
    overDetail: "Усе, що ще витратиш у цій категорії цього місяця, виходить за план.",
    aheadTitle: "{{category}}: витрачено {{percent}} %, а сьогодні лише {{dayOrdinal}}",
    aheadDetail:
      "У такому темпі до кінця місяця вийде {{projected}} за ліміту {{limit}} - у нормі на сьогодні було б {{expected}}.",
    more_one: "+ще {{count}} категорія поза темпом: {{list}}",
    more_few: "+ще {{count}} категорії поза темпом: {{list}}",
    more_many: "+ще {{count}} категорій поза темпом: {{list}}",
    more_other: "+ще {{count}} категорії поза темпом: {{list}}",
    listSeparator: ", ",
  },
};

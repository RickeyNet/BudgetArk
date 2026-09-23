/**
 * BudgetArk - Українські тексти: вкладка «Бюджет» (tools)
 * File: src/i18n/locales/uk/budgetTools.ts
 *
 * Ukrainian counterpart of en/budgetTools.ts. Informal "ти" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { LocalizedPlural } from "../types";
import type { budgetTools as en } from "../en/budgetTools";

export const budgetTools: LocalizedPlural<typeof en> = {
  search: {
    title: "Пошук",
    subtitle: "Знайди все, що записав: борги, платежі та записи бюджету.",
    closeA11y: "Закрити пошук",
    placeholder: "Наприклад «chase», «продукти» або суму",
    inputA11y: "Шукати всюди",
    clearA11y: "Очистити пошук",
    filtersToggle: "Фільтри",
    filtersToggleCount: "Фільтри ({{count}})",
    filtersA11y: "Фільтри, активно: {{count}}",
    reset: "Скинути",
    resetA11y: "Скинути фільтри",
    scopeLabel: "Шукати в",
    scope: {
      all: "Усюди",
      debts: "Борги",
      payments: "Платежі",
      entries: "Бюджет",
    },
    dateLabel: "Дата",
    datePreset: {
      any: "За весь час",
      "30d": "Останні 30 днів",
      "90d": "Останні 90 днів",
      year: "Цей рік",
    },
    entryTypeLabel: "Тип запису бюджету",
    entryType: {
      all: "Доходи + витрати",
      income: "Доходи",
      expense: "Витрати",
    },
    categoriesLabel: "Категорії",
    amountLabel: "Сума",
    minPlaceholder: "Мін.",
    minA11y: "Мінімальна сума",
    maxPlaceholder: "Макс.",
    maxA11y: "Максимальна сума",
    promptTitle: "Пошук за записами",
    promptBody:
      "Введи назву боргу, нотатку, продавця, категорію або суму - або відкрий фільтри, щоб шукати за датою, типом чи категорією.",
    noMatchesTitle: "Нічого не знайдено",
    noMatchesBody: "Спробуй менше слів або м'якші фільтри.",
    debtsHidden: "Борги не показуються, доки ввімкнено фільтр за датою, типом запису або категорією.",
    sectionDebts: "БОРГИ · {{count}}",
    sectionPayments: "ПЛАТЕЖІ ЗА БОРГАМИ · {{count}}",
    sectionEntries: "ЗАПИСИ БЮДЖЕТУ · {{count}}",
    debtA11y: "Борг {{name}}",
    paymentA11y: "Платіж: {{name}}",
    entryA11y: "Запис бюджету {{name}}",
    apr: "{{rate}} % річних",
    paidOff: "Погашено 🎉",
    truncation: "Показано перші {{shown}} з {{total}} - уточни запит, щоб побачити решту.",
  },
  billCalendar: {
    title: "Календар рахунків",
    stats: {
      bills: "Рахунки",
      paid: "Оплачено",
      remaining: "Лишилося",
    },
    nextLabel: "НАСТУПНИЙ",
    nextRow: "{{name}} · {{amount}} · {{when}}",
    when: {
      today: "сьогодні",
      tomorrow: "завтра",
      daysAgo: "{{count}} дн. тому",
      inDays: "через {{count}} дн.",
    },
    /** Sunday-first single-letter weekday headers, matching the grid. */
    weekdays: {
      sun: "Н",
      mon: "П",
      tue: "В",
      wed: "С",
      thu: "Ч",
      fri: "П",
      sat: "С",
    },
    showOneOff: "Показувати й разові витрати",
    emptyHint:
      "Цього місяця регулярних рахунків немає. Додай регулярну витрату у формі нового запису та вкажи день місяця, щоб побачити її тут.",
    paidActual: "✓ Оплачено (факт)",
    payButton: "Оплатити ↗",
    payA11y: "Відкрити сайт оплати для {{name}}",
    linkError: {
      title: "Не вдалося відкрити посилання",
      invalid: "Збережена адреса - не дійсне http(s)-посилання. Зміни рахунок, щоб виправити.",
      noBrowser: "Немає браузера, щоб відкрити посилання.",
      failed: "Під час відкриття посилання щось пішло не так.",
    },
  },
  monthlyReview: {
    title: "Підсумки місяця",
    emptyTitle: "Поки замало даних",
    emptyBody: "Додай записи бюджету хоча б за 2 місяці, щоб побачити тренди, зміни за категоріями та серії.",
    vsAverage: {
      title: "Цей місяць і середнє",
      thisMonth: "Цей місяць",
      avgPerMonth: "Сер. / місяць",
      change: "Зміна",
    },
    byPerson: {
      title: "Витрати за людьми",
      hint: "Призначені витрати за цей місяць",
    },
    comparison: {
      title: "Порівняння витрат за категоріями",
      hint: "до середнього за минулі 3 місяці",
      row: "{{current}} цього місяця · сер. {{average}}",
      new: "Нове",
      stopped: "Припинилося",
      flat: "Без змін",
    },
    spendingTrend: "Тренд витрат",
    netIncomeTrend: "Тренд чистого доходу",
    streaks: {
      title: "Серії",
      months: "{{count}} міс.",
    },
    changes: {
      title: "Зміни за категоріями",
      hint: "до минулого місяця",
    },
  },
};

/**
 * BudgetArk - Русские тексты: вкладка «Бюджет» (tools)
 * File: src/i18n/locales/ru/budgetTools.ts
 *
 * Russian counterpart of en/budgetTools.ts. Informal "ты" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { LocalizedPlural } from "../types";
import type { budgetTools as en } from "../en/budgetTools";

export const budgetTools: LocalizedPlural<typeof en> = {
  search: {
    title: "Поиск",
    subtitle: "Найди всё, что записал: долги, платежи и записи бюджета.",
    closeA11y: "Закрыть поиск",
    placeholder: "Например «chase», «продукты» или сумму",
    inputA11y: "Искать везде",
    clearA11y: "Очистить поиск",
    filtersToggle: "Фильтры",
    filtersToggleCount: "Фильтры ({{count}})",
    filtersA11y: "Фильтры, активно: {{count}}",
    reset: "Сбросить",
    resetA11y: "Сбросить фильтры",
    scopeLabel: "Искать в",
    scope: {
      all: "Везде",
      debts: "Долги",
      payments: "Платежи",
      entries: "Бюджет",
    },
    dateLabel: "Дата",
    datePreset: {
      any: "За всё время",
      "30d": "Последние 30 дней",
      "90d": "Последние 90 дней",
      year: "Этот год",
    },
    entryTypeLabel: "Тип записи бюджета",
    entryType: {
      all: "Доходы + расходы",
      income: "Доходы",
      expense: "Расходы",
    },
    categoriesLabel: "Категории",
    amountLabel: "Сумма",
    minPlaceholder: "Мин.",
    minA11y: "Минимальная сумма",
    maxPlaceholder: "Макс.",
    maxA11y: "Максимальная сумма",
    promptTitle: "Поиск по записям",
    promptBody:
      "Введи название долга, заметку, продавца, категорию или сумму - или открой фильтры, чтобы искать по дате, типу или категории.",
    noMatchesTitle: "Ничего не найдено",
    noMatchesBody: "Попробуй меньше слов или мягче фильтры.",
    debtsHidden: "Долги не показываются, пока включён фильтр по дате, типу записи или категории.",
    sectionDebts: "ДОЛГИ · {{count}}",
    sectionPayments: "ПЛАТЕЖИ ПО ДОЛГАМ · {{count}}",
    sectionEntries: "ЗАПИСИ БЮДЖЕТА · {{count}}",
    debtA11y: "Долг {{name}}",
    paymentA11y: "Платёж: {{name}}",
    entryA11y: "Запись бюджета {{name}}",
    apr: "{{rate}} % годовых",
    paidOff: "Погашен 🎉",
    truncation: "Показаны первые {{shown}} из {{total}} - уточни запрос, чтобы увидеть остальные.",
  },
  billCalendar: {
    title: "Календарь счетов",
    stats: {
      bills: "Счета",
      paid: "Оплачено",
      remaining: "Осталось",
    },
    nextLabel: "СЛЕДУЮЩИЙ",
    nextRow: "{{name}} · {{amount}} · {{when}}",
    when: {
      today: "сегодня",
      tomorrow: "завтра",
      daysAgo: "{{count}} дн. назад",
      inDays: "через {{count}} дн.",
    },
    /** Sunday-first single-letter weekday headers, matching the grid. */
    weekdays: {
      sun: "В",
      mon: "П",
      tue: "В",
      wed: "С",
      thu: "Ч",
      fri: "П",
      sat: "С",
    },
    showOneOff: "Показывать и разовые расходы",
    emptyHint:
      "В этом месяце регулярных счетов нет. Добавь регулярный расход в форме новой записи и укажи день месяца, чтобы увидеть его здесь.",
    paidActual: "✓ Оплачено (факт)",
    payButton: "Оплатить ↗",
    payA11y: "Открыть сайт оплаты для {{name}}",
    linkError: {
      title: "Не удалось открыть ссылку",
      invalid: "Сохранённый адрес - не действительная http(s)-ссылка. Измени счёт, чтобы исправить.",
      noBrowser: "Нет браузера, чтобы открыть ссылку.",
      failed: "При открытии ссылки что-то пошло не так.",
    },
  },
  monthlyReview: {
    title: "Итоги месяца",
    emptyTitle: "Пока мало данных",
    emptyBody: "Добавь записи бюджета хотя бы за 2 месяца, чтобы увидеть тренды, изменения по категориям и серии.",
    vsAverage: {
      title: "Этот месяц и среднее",
      thisMonth: "Этот месяц",
      avgPerMonth: "Ср. / месяц",
      change: "Изменение",
    },
    byPerson: {
      title: "Расходы по людям",
      hint: "Назначенные расходы за этот месяц",
    },
    comparison: {
      title: "Сравнение расходов по категориям",
      hint: "к среднему за прошлые 3 месяца",
      row: "{{current}} в этом месяце · ср. {{average}}",
      new: "Новое",
      stopped: "Прекратилось",
      flat: "Без изменений",
    },
    spendingTrend: "Тренд расходов",
    netIncomeTrend: "Тренд чистого дохода",
    streaks: {
      title: "Серии",
      months: "{{count}} мес.",
    },
    changes: {
      title: "Изменения по категориям",
      hint: "к прошлому месяцу",
    },
  },
};

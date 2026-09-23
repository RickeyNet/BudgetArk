/**
 * BudgetArk - Русские тексты: вкладка «Бюджет» (spending)
 * File: src/i18n/locales/ru/budgetSpending.ts
 *
 * Russian counterpart of en/budgetSpending.ts. Informal "ты" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { LocalizedPlural } from "../types";
import type { budgetSpending as en } from "../en/budgetSpending";

export const budgetSpending: LocalizedPlural<typeof en> = {
  spendingCard: {
    title: "Расходы",
    splitFood: "Разделить «Еду» ({{count}})",
    limitsA11y: "Задать месячные лимиты для всех категорий",
    tapToExpand: "Нажми на строку, чтобы раскрыть · ",
    limitsLink: "Лимиты ›",
    tapToExpandHold: "Нажми, чтобы раскрыть · Удерживай для лимита",
    businessOnlyA11y: "Показать только деловые расходы",
    businessOnlyChip: "💼 Только деловые",
    limitsHiddenFiltered: "Лимиты скрыты при фильтре",
    total: "Итого",
    emptyBusinessTitle: "В этом месяце нет деловых расходов",
    emptyTitle: "В этом месяце нет расходов",
    emptyBusinessSubtext: "Отметь расход бизнесом, чтобы увидеть его здесь.",
    emptySubtext: "Добавь записи, чтобы увидеть график расходов.",
    pace: {
      over: "Лимит превышен на {{amount}}",
      atLimit: "Лимит достигнут - в этом месяце ничего не осталось",
      ahead: "Быстрее плана - в норме к сегодняшнему дню было бы {{amount}}",
      onPace: "В темпе - к сегодняшнему дню ожидалось {{amount}}",
    },
    expandedHeader_one: "Раскрыто - {{count}} запись",
    expandedHeader_few: "Раскрыто - {{count}} записи",
    expandedHeader_many: "Раскрыто - {{count}} записей",
    expandedHeader_other: "Раскрыто - {{count}} записи",
    loggedPayment: {
      title: "Платёж по долгу",
      message:
        "Этот платёж записан на вкладке «Долги». Чтобы изменить или удалить его, открой там историю платежей по долгу.",
    },
    deletedBusiness: "(удалено)",
    owed: " · {{amount}} к возврату",
    paidBack: " · возвращено",
    billFallback: "Счёт",
    billEstimate: " · ≈ {{amount}}",
    logActualA11y: "Записать фактическую сумму для {{name}}",
    logActual: "Факт",
    auto: "Авто",
    showMoreA11y_one: "Показать ещё {{count}} запись",
    showMoreA11y_few: "Показать ещё {{count}} записи",
    showMoreA11y_many: "Показать ещё {{count}} записей",
    showMoreA11y_other: "Показать ещё {{count}} записи",
    showMore_one: "Ещё {{count}} запись",
    showMore_few: "Ещё {{count}} записи",
    showMore_many: "Ещё {{count}} записей",
    showMore_other: "Ещё {{count}} записи",
  },
  buckets: {
    title: "50/30/20",
    takeHome: "На руки в этом месяце: {{amount}}",
    emptyTitle: "Добавь доход, чтобы увидеть разбивку 50/30/20",
    emptySubtext: "Запиши зарплату или фриланс-доход за этот месяц.",
    onTarget: "В норме: {{bucket}}",
    overTarget: "{{amount}} сверх цели: {{bucket}}",
    underTarget: "{{amount}} до цели: {{bucket}}",
    targetChip: "цель {{percent}} %",
    hide: "Скрыть",
    show: "Показать",
    emptyBucket: "В этой корзине в этом месяце расходов нет.",
    override: " (вручную)",
    reassignHint: "Удерживай категорию, чтобы сменить её корзину.",
  },
  limits: {
    title: "Месячные лимиты",
    subtitle:
      "{{month}}. Заданный здесь лимит действует и в следующих месяцах, пока ты его не изменишь. Оставь поле пустым, чтобы не ставить лимит.",
    loadFailed: "Не удалось загрузить лимиты.",
    saveFailed: "Не удалось сохранить лимиты.",
    saving: "Сохранение...",
    copyLastMonth: "Как в прошлом месяце",
    useAverages: "Среднее за 3 месяца",
    spent: "Потрачено {{amount}}",
    avg: "среднее {{amount}}",
    lastMonth: "прошлый месяц {{amount}}",
    useAverageA11y: "Использовать среднее для {{category}}",
    avgChip: "ср.",
    nonePlaceholder: "нет",
    limitInputA11y: "Месячный лимит для {{category}}",
    loading: "Загрузка...",
  },
  foodSplit: {
    title: "Разделить записи «Еда»",
    subtitle: "Просмотри каждый расход «Еда» и отнеси его к «Продуктам» или «Ресторанам».",
    apply: "Применить",
  },
};

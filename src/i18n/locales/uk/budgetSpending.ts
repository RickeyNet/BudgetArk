/**
 * BudgetArk - Українські тексти: вкладка «Бюджет» (spending)
 * File: src/i18n/locales/uk/budgetSpending.ts
 *
 * Ukrainian counterpart of en/budgetSpending.ts. Informal "ти" throughout;
 * see src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { LocalizedPlural } from "../types";
import type { budgetSpending as en } from "../en/budgetSpending";

export const budgetSpending: LocalizedPlural<typeof en> = {
  spendingCard: {
    title: "Витрати",
    splitFood: "Розділити «Їжу» ({{count}})",
    limitsA11y: "Задати місячні ліміти для всіх категорій",
    tapToExpand: "Торкнись рядка, щоб розгорнути · ",
    limitsLink: "Ліміти ›",
    tapToExpandHold: "Торкнись, щоб розгорнути · Утримуй для ліміту",
    businessOnlyA11y: "Показати лише бізнес-витрати",
    businessOnlyChip: "💼 Лише бізнес",
    limitsHiddenFiltered: "Ліміти приховано під час фільтра",
    total: "Разом",
    emptyBusinessTitle: "Цього місяця немає бізнес-витрат",
    emptyTitle: "Цього місяця немає витрат",
    emptyBusinessSubtext: "Познач витрату бізнесом, щоб побачити її тут.",
    emptySubtext: "Додай записи, щоб побачити графік витрат.",
    pace: {
      over: "Ліміт перевищено на {{amount}}",
      atLimit: "Ліміт вичерпано - цього місяця нічого не лишилося",
      ahead: "Швидше за план - у нормі на сьогодні було б {{amount}}",
      onPace: "У темпі - на сьогодні очікувалося {{amount}}",
    },
    expandedHeader_one: "Розгорнуто - {{count}} запис",
    expandedHeader_few: "Розгорнуто - {{count}} записи",
    expandedHeader_many: "Розгорнуто - {{count}} записів",
    expandedHeader_other: "Розгорнуто - {{count}} запису",
    loggedPayment: {
      title: "Платіж за боргом",
      message:
        "Цей платіж записано на вкладці «Борги». Щоб змінити або видалити його, відкрий там історію платежів за боргом.",
    },
    deletedBusiness: "(видалено)",
    owed: " · {{amount}} до повернення",
    paidBack: " · повернуто",
    billFallback: "Рахунок",
    billEstimate: " · ≈ {{amount}}",
    logActualA11y: "Записати фактичну суму для {{name}}",
    logActual: "Факт",
    auto: "Авто",
    showMoreA11y_one: "Показати ще {{count}} запис",
    showMoreA11y_few: "Показати ще {{count}} записи",
    showMoreA11y_many: "Показати ще {{count}} записів",
    showMoreA11y_other: "Показати ще {{count}} запису",
    showMore_one: "Ще {{count}} запис",
    showMore_few: "Ще {{count}} записи",
    showMore_many: "Ще {{count}} записів",
    showMore_other: "Ще {{count}} запису",
  },
  buckets: {
    title: "50/30/20",
    takeHome: "На руки цього місяця: {{amount}}",
    emptyTitle: "Додай дохід, щоб побачити розподіл 50/30/20",
    emptySubtext: "Запиши зарплату або фриланс-дохід за цей місяць.",
    onTarget: "У нормі: {{bucket}}",
    overTarget: "{{amount}} понад ціль: {{bucket}}",
    underTarget: "{{amount}} до цілі: {{bucket}}",
    targetChip: "ціль {{percent}} %",
    hide: "Сховати",
    show: "Показати",
    emptyBucket: "У цьому кошику цього місяця витрат немає.",
    override: " (вручну)",
    reassignHint: "Утримуй категорію, щоб змінити її кошик.",
  },
  limits: {
    title: "Місячні ліміти",
    subtitle:
      "{{month}}. Заданий тут ліміт діє і в наступних місяцях, доки ти його не зміниш. Залиш поле порожнім, щоб не ставити ліміт.",
    loadFailed: "Не вдалося завантажити ліміти.",
    saveFailed: "Не вдалося зберегти ліміти.",
    saving: "Збереження...",
    copyLastMonth: "Як минулого місяця",
    useAverages: "Середнє за 3 місяці",
    spent: "Витрачено {{amount}}",
    avg: "середнє {{amount}}",
    lastMonth: "минулий місяць {{amount}}",
    useAverageA11y: "Використати середнє для {{category}}",
    avgChip: "сер.",
    nonePlaceholder: "немає",
    limitInputA11y: "Місячний ліміт для {{category}}",
    loading: "Завантаження...",
  },
  foodSplit: {
    title: "Розділити записи «Їжа»",
    subtitle: "Переглянь кожну витрату «Їжа» і віднеси її до «Продуктів» або «Ресторанів».",
    apply: "Застосувати",
  },
};

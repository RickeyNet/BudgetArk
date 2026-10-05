/**
 * BudgetArk - Русские тексты: чистые помощники (insights)
 * File: src/i18n/locales/ru/helpersInsights.ts
 *
 * Russian counterpart of en/helpersInsights.ts. Informal "ты" throughout;
 * see src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { LocalizedPlural } from "../types";
import type { helpersInsights as en } from "../en/helpersInsights";

export const helpersInsights: LocalizedPlural<typeof en> = {
  streaks: {
    positiveNet: "Положительный чистый доход",
    allUnderBudget: "Все категории в рамках бюджета",
    spendingDecreasing: "Расходы снижаются",
    spendingIncreasing: "Расходы растут",
  },
  people: {
    deletedPerson: "(удалённый человек)",
  },
  unusual: {
    firstTime: "Первое списание от этого продавца - стоит взглянуть",
    aboveUsual: "{{ratio}}× от обычных {{usual}} - стоит взглянуть",
  },
  tipNudge: {
    debtPayoff: {
      titleWithLabel: "{{label}} закрыт. В этом весь смысл.",
      title: "Один долг закрыт. В этом весь смысл.",
      body: "BudgetArk остаётся бесплатным и без рекламы, без аккаунта и без утечки данных с телефона, потому что люди в такие моменты немного помогают. Чаевые необязательны и ничего не открывают - приложение и так полностью твоё.",
    },
    billPaid: {
      titleWithLabel: "{{label}} оплачен, строка бюджета обновлена",
      title: "Счёт оплачен, строка бюджета обновлена",
      body: "BudgetArk бесплатен, без рекламы, и ничего не покидает твой телефон. Если он делает день оплаты счетов проще, необязательные чаевые помогут так и оставить. Открывать нечего.",
    },
    debtPayment: {
      title: "Ещё кусочек долга долой",
      body: "BudgetArk бесплатен, без рекламы и хранит всё на твоём телефоне. Если он помогает, необязательные чаевые держат его на плаву - открывать нечего.",
    },
  },
  inbox: {
    duplicates: "Возможно, уже есть в бюджете",
    transfers: "Похоже на переводы",
    otherTransactions: "Другие операции",
  },
  recurrence: {
    tag: {
      "1": "Ежемесячно",
      "3": "Ежеквартально",
      "6": "Раз в 6 мес.",
      "12": "Ежегодно",
    },
  },
};

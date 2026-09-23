/**
 * BudgetArk - Русские тексты: встроенные данные (templates)
 * File: src/i18n/locales/ru/dataTemplates.ts
 *
 * Russian counterpart of en/dataTemplates.ts. Informal "ты" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { LocalizedPlural } from "../types";
import type { dataTemplates as en } from "../en/dataTemplates";

export const dataTemplates: LocalizedPlural<typeof en> = {
  single: {
    title: "Один человек",
    tagline: "Один доход, баланс 50/30/20",
    description:
      "Около половины на нужды, меньше трети на желания и пятая часть на сбережения и пенсию. Вариант по умолчанию на каждый день.",
  },
  couple: {
    title: "Пара / семья",
    tagline: "Общие расходы, строка на путешествия, место для двоих",
    description:
      "Продукты и страховка в расчёте на двоих, бюджет на путешествия и сбережения, разделённые между подушкой и пенсией. Позже свяжи телефоны, чтобы делить бюджет.",
  },
  "debt-heavy": {
    title: "Погашение долгов",
    tagline: "Скромные желания, четверть дохода свободна для выплат",
    description:
      "Желания сильно урезаны, чтобы около 27 % зарплаты на руки оставалось на выплаты по долгам, которые вкладка «Долги» планирует за тебя. Сочетается с «Построй свой Ковчег».",
  },
  "zero-based": {
    title: "Нулевой бюджет",
    tagline: "У каждой суммы есть задача",
    description:
      "Лимиты по всем категориям в сумме дают ровно твою зарплату на руки, включая пожертвования. Ничего не остаётся нераспределённым.",
  },
};

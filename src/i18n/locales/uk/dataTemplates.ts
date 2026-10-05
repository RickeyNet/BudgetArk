/**
 * BudgetArk - Українські тексти: вбудовані дані (templates)
 * File: src/i18n/locales/uk/dataTemplates.ts
 *
 * Ukrainian counterpart of en/dataTemplates.ts. Informal "ти" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { LocalizedPlural } from "../types";
import type { dataTemplates as en } from "../en/dataTemplates";

export const dataTemplates: LocalizedPlural<typeof en> = {
  single: {
    title: "Одна людина",
    tagline: "Один дохід, баланс 50/30/20",
    description:
      "Близько половини на потреби, менше третини на бажання і п'ята частина на заощадження та пенсію. Варіант за замовчуванням на щодень.",
  },
  couple: {
    title: "Пара / родина",
    tagline: "Спільні витрати, рядок на подорожі, місце для двох",
    description:
      "Продукти й страхування з розрахунку на двох, бюджет на подорожі та заощадження, поділені між подушкою і пенсією. Пізніше зв'яжи телефони, щоб ділити бюджет.",
  },
  "debt-heavy": {
    title: "Погашення боргів",
    tagline: "Скромні бажання, чверть доходу вільна для виплат",
    description:
      "Бажання сильно урізані, щоб близько 27 % зарплати на руки лишалося на виплати за боргами, які вкладка «Борги» планує за тебе. Поєднується з «Побудуй свій Ковчег».",
  },
  "zero-based": {
    title: "Нульовий бюджет",
    tagline: "У кожної суми є завдання",
    description:
      "Ліміти за всіма категоріями в сумі дають рівно твою зарплату на руки, включно з пожертвами. Нічого не лишається нерозподіленим.",
  },
};

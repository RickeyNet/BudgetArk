/**
 * BudgetArk - Українські тексти: вкладка «Карти» (tax)
 * File: src/i18n/locales/uk/chartsTax.ts
 *
 * Ukrainian counterpart of en/chartsTax.ts. The tools model US federal /
 * state rules only, so the titles carry "(лише США)" and US terms (W-2,
 * 1099, 401(k), HSA, FICA, IRS) stay as they are. Informal "ти" throughout.
 */

import type { LocalizedPlural } from "../types";
import type { chartsTax as en } from "../en/chartsTax";

export const chartsTax: LocalizedPlural<typeof en> = {
  filingStatus: {
    single: "Не у шлюбі",
    marriedJoint: "У шлюбі, спільно",
    marriedSeparate: "У шлюбі, окремо",
    headOfHousehold: "Голова сім'ї",
  },
  takeHome: {
    title: "Зарплата на руки (лише США)",
    hint: "Оціни федеральний податок, податок штату та внески із зарплати",
    income: {
      sectionTitle: "Твій дохід",
      grossLabel: "Річна зарплата до відрахувань (USD)",
      grossPlaceholder: "напр. 75000",
      filingStatusLabel: "Статус подання",
      paidEveryLabel: "Виплата кожні",
    },
    payFrequency: {
      "52": "Щотижня",
      "26": "Раз на два тижні",
      "24": "Двічі на місяць",
      "12": "Щомісяця",
    },
    periodNoun: {
      "52": "тиждень",
      "26": "два тижні",
      "24": "півмісяця",
      "12": "місяць",
      default: "період",
    },
    state: {
      sectionTitle: "Штат",
      noWageTax: " - штат не оподатковує зарплату прибутковим податком",
      pickPrompt: "Вибери штат, щоб побачити оцінку.",
    },
    deductions: {
      sectionTitle: "Відрахування до податків (необов'язково)",
      k401Label: "401(k), % від зарплати",
      hsaLabel: "HSA на рік",
      healthLabel: "Мед. страхування / місяць",
      hint: "Традиційний 401(k) знижує прибутковий податок; HSA і внески на мед. страхування знижують ще й податок із зарплати (FICA).",
    },
    result: {
      perPeriodLabel: "НА РУКИ ЗА {{period}}",
      perYearAndMonth: "{{year}} / рік · {{month}} / місяць",
    },
    segments: {
      sectionTitle: "Куди йде кожен долар",
      home: "На руки",
      saved: "Заощадження до податків",
      fed: "Федеральний",
      state: "Штат",
      fica: "FICA",
    },
    breakdown: {
      sectionTitle: "Розбивка за рік",
      gross: "Зарплата до відрахувань",
      k401: "Внесок у 401(k)",
      cafeteria: "HSA + мед. страхування",
      federal: "Федеральний прибутковий податок",
      stateTax: "Прибутковий податок: {{state}}",
      stateFallback: "Штат",
      socialSecurity: "Social Security",
      medicare: "Medicare",
      takeHome: "На руки",
      effectiveRate: "Ефективна ставка",
      marginalBracket: "Федеральна гранична ставка",
    },
    compare: {
      sectionTitle: "А якщо переїхати?",
      lead: "Та сама зарплата в штаті {{state}}: {{amount}} на руки - ",
      more: "на {{amount}} БІЛЬШЕ на рік.",
      less: "на {{amount}} МЕНШЕ на рік.",
      same: "стільки ж.",
    },
    disclaimer:
      "Лише оцінка - реальний податок залежить від кредитів, відрахувань, місцевих податків та інших чинників, яких тут не враховано. Не податкова консультація. Рахується повністю на телефоні за вбудованими таблицями {{year}} року (IRS Rev. Proc. 2025-32; дані Tax Foundation по штатах) - нічого з введеного не залишає пристрій.",
  },
  quarterly: {
    title: "Квартальні податки (лише США)",
    hintWithIncome: "{{year}}: відкладено {{setAside}} з ~{{estimated}} за оцінкою",
    hintEmpty: "Розрахункові платежі з доходу за 1099",
    updateFailed: "Не вдалося оновити цей квартал.",
    prevYear: "Попередній рік",
    nextYear: "Наступний рік",
    taxYear: "Податковий рік {{year}}",
    filingStatusLabel: "Статус подання",
    empty:
      "За {{year}} немає доходу за 1099. Познач записи доходу як 1099 (зі ставкою відрахувань на податок) у формі додавання запису - і квартали заповняться тут.",
    summary: {
      label: "РОЗРАХУНКОВІ ПЛАТЕЖІ ЗА {{year}}",
      sub: "з {{income}} доходу за 1099 · відкладено {{setAside}}",
      short: " (бракує {{amount}})",
      spare: " (запас {{amount}})",
    },
    status: {
      paid: "Сплачено {{date}}",
      overdue: "Термін був {{date}}",
      due: "Термін {{date}}",
      none: "Немає доходу за 1099",
    },
    row: {
      title: "{{quarter}} · {{from}}–{{to}}",
      income: "Дохід за 1099",
      setAside: "Відкладено",
      estimated: "Розрахунковий платіж",
      markPaid: "Позначити сплаченим",
      undoPaid: "Скасувати сплату",
    },
    disclaimer:
      "Оцінка за федеральними таблицями {{year}} року: податок на самозайнятість плюс прибутковий податок із річного доходу за 1099 зі стандартним відрахуванням. Без податку штату, кредитів, утримань за W-2 та інших доходів - якщо в тебе є ще робота за W-2, реальний платіж може відрізнятися. Терміни - за календарем IRS; позначка про сплату лишається на цьому телефоні.",
  },
};

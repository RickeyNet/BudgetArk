/**
 * BudgetArk - Русские тексты: вкладка «Карты» (tax)
 * File: src/i18n/locales/ru/chartsTax.ts
 *
 * Russian counterpart of en/chartsTax.ts. The tools model US federal / state
 * rules only, so the titles carry "(только США)" and US terms (W-2, 1099,
 * 401(k), HSA, FICA, IRS) stay as they are. Informal "ты" throughout.
 */

import type { LocalizedPlural } from "../types";
import type { chartsTax as en } from "../en/chartsTax";

export const chartsTax: LocalizedPlural<typeof en> = {
  filingStatus: {
    single: "Не в браке",
    marriedJoint: "В браке, совместно",
    marriedSeparate: "В браке, раздельно",
    headOfHousehold: "Глава семьи",
  },
  takeHome: {
    title: "Зарплата на руки (только США)",
    hint: "Оцени федеральный налог, налог штата и взносы с зарплаты",
    income: {
      sectionTitle: "Твой доход",
      grossLabel: "Годовая зарплата до вычетов (USD)",
      grossPlaceholder: "напр. 75000",
      filingStatusLabel: "Статус подачи",
      paidEveryLabel: "Выплата каждые",
    },
    payFrequency: {
      "52": "Еженедельно",
      "26": "Раз в две недели",
      "24": "Дважды в месяц",
      "12": "Ежемесячно",
    },
    periodNoun: {
      "52": "неделю",
      "26": "две недели",
      "24": "полмесяца",
      "12": "месяц",
      default: "период",
    },
    state: {
      sectionTitle: "Штат",
      noWageTax: " - штат не облагает зарплату подоходным налогом",
      pickPrompt: "Выбери штат, чтобы увидеть оценку.",
    },
    deductions: {
      sectionTitle: "Вычеты до налогов (необязательно)",
      k401Label: "401(k), % от зарплаты",
      hsaLabel: "HSA в год",
      healthLabel: "Мед. страховка / месяц",
      hint: "Традиционный 401(k) снижает подоходный налог; HSA и взносы на мед. страховку снижают ещё и налог с зарплаты (FICA).",
    },
    result: {
      perPeriodLabel: "НА РУКИ ЗА {{period}}",
      perYearAndMonth: "{{year}} / год · {{month}} / месяц",
    },
    segments: {
      sectionTitle: "Куда уходит каждый доллар",
      home: "На руки",
      saved: "Сбережения до налогов",
      fed: "Федеральный",
      state: "Штат",
      fica: "FICA",
    },
    breakdown: {
      sectionTitle: "Разбивка за год",
      gross: "Зарплата до вычетов",
      k401: "Взнос в 401(k)",
      cafeteria: "HSA + мед. страховка",
      federal: "Федеральный подоходный налог",
      stateTax: "Подоходный налог: {{state}}",
      stateFallback: "Штат",
      socialSecurity: "Social Security",
      medicare: "Medicare",
      takeHome: "На руки",
      effectiveRate: "Эффективная ставка",
      marginalBracket: "Федеральная предельная ставка",
    },
    compare: {
      sectionTitle: "А если переехать?",
      lead: "Та же зарплата в штате {{state}}: {{amount}} на руки - ",
      more: "на {{amount}} БОЛЬШЕ в год.",
      less: "на {{amount}} МЕНЬШЕ в год.",
      same: "столько же.",
    },
    disclaimer:
      "Только оценка - реальный налог зависит от кредитов, вычетов, местных налогов и других факторов, которые здесь не учтены. Не налоговая консультация. Считается целиком на телефоне по встроенным таблицам {{year}} года (IRS Rev. Proc. 2025-32; данные Tax Foundation по штатам) - ничего из введённого не покидает устройство.",
  },
  quarterly: {
    title: "Квартальные налоги (только США)",
    hintWithIncome: "{{year}}: отложено {{setAside}} из ~{{estimated}} по оценке",
    hintEmpty: "Расчётные платежи с дохода по 1099",
    updateFailed: "Не удалось обновить этот квартал.",
    prevYear: "Предыдущий год",
    nextYear: "Следующий год",
    taxYear: "Налоговый год {{year}}",
    filingStatusLabel: "Статус подачи",
    empty:
      "За {{year}} нет дохода по 1099. Отметь записи дохода как 1099 (со ставкой отчислений на налог) в форме добавления записи - и кварталы заполнятся здесь.",
    summary: {
      label: "РАСЧЁТНЫЕ ПЛАТЕЖИ ЗА {{year}}",
      sub: "с {{income}} дохода по 1099 · отложено {{setAside}}",
      short: " (не хватает {{amount}})",
      spare: " (запас {{amount}})",
    },
    status: {
      paid: "Оплачено {{date}}",
      overdue: "Срок был {{date}}",
      due: "Срок {{date}}",
      none: "Нет дохода по 1099",
    },
    row: {
      title: "{{quarter}} · {{from}}–{{to}}",
      income: "Доход по 1099",
      setAside: "Отложено",
      estimated: "Расчётный платёж",
      markPaid: "Отметить оплаченным",
      undoPaid: "Отменить оплату",
    },
    disclaimer:
      "Оценка по федеральным таблицам {{year}} года: налог на самозанятость плюс подоходный налог с годового дохода по 1099 со стандартным вычетом. Без налога штата, кредитов, удержаний по W-2 и других доходов - если у тебя есть ещё работа по W-2, реальный платёж может отличаться. Сроки - по календарю IRS; отметка об оплате остаётся на этом телефоне.",
  },
};

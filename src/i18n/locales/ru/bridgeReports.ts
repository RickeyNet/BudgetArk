/**
 * BudgetArk - Русские тексты: вкладка «Мостик» (отчёты)
 * File: src/i18n/locales/ru/bridgeReports.ts
 *
 * Russian counterpart of en/bridgeReports.ts. Informal "ты" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { LocalizedPlural } from "../types";
import type { bridgeReports as en } from "../en/bridgeReports";

export const bridgeReports: LocalizedPlural<typeof en> = {
  annual: {
    title: "Годовой отчёт",
    subtitle: "Твой {{year}} год в цифрах",
    closeA11y: "Закрыть годовой отчёт",
    empty: {
      title: "За {{year}} ничего не записано",
      body: "Добавляй записи бюджета, платежи по долгам или счета - и отчёт за {{year}} заполнится сам.",
    },
    tiles: {
      debtPaid: "Выплачено долгов",
      payments_one: "{{count}} платёж",
      payments_few: "{{count}} платежа",
      payments_many: "{{count}} платежей",
      payments_other: "{{count}} платежа",
      setAside: "Отложено",
      setAsideHint: "Сбережения · Пенсия · Инвестиции",
      netWorthChange: "Изменение чистых активов",
      notEnoughHistory: "Недостаточно истории",
      startVsEnd: "Начало и конец года",
      savingsRate: "Норма сбережений",
      savingsRateHint: "Доход, который остался, а не потрачен",
    },
    cashFlow: {
      title: "Денежный поток",
      income: "Доходы",
      expenses: "Расходы",
      netSaved: "Чистые сбережения",
    },
    underBudget: {
      title: "Месяцев в рамках бюджета",
      hint: "Месяцы, в которых каждая категория с лимитом уложилась в него. Лимиты хранятся за полный год, так что текущий год учтён целиком; у прошлых лет лимиты могли устареть.",
    },
    topCategories: "Главные категории расходов",
    trend: "Расходы по месяцам",
    share: {
      button: "Поделиться сводкой",
      a11y: "Поделиться годовой сводкой",
      note: "Передаются только итоги и проценты - без названий и деталей.",
    },
  },
  history: {
    title: "Чистые активы",
    subtext: "Активы {{assets}} · Долги {{debt}}",
    ranges: {
      "7D": "7 дн.",
      "30D": "30 дн.",
      ALL: "Все",
    },
    change: "Изменение",
    sinceStart: "С начала",
    rangeChange: "Изменение за {{range}}",
    empty: "Учёт начнётся после первого снимка.",
    footer: "Ежедневные снимки. История начинается сейчас. Проведи пальцем по линии, чтобы увидеть значение за день.",
    chartA11y: "График чистых активов. Проведи по нему, чтобы узнать чистые активы за день.",
  },
  cashFlowChart: {
    title: "Денежный поток по месяцам",
    subtitle: "Доходы и расходы",
    legendIn: "Приход",
    legendOut: "Расход",
    scrub: "{{label}} · Приход {{income}} · Расход {{expense}} · Итог {{net}}",
    chartA11y: "График денежного потока. Проведи по нему, чтобы узнать доходы, расходы и итог за месяц.",
    empty: "Добавь несколько месяцев доходов и расходов, чтобы увидеть денежный поток.",
  },
  trackingStrip: {
    eyebrow: "ЭТОТ МЕСЯЦ",
    budgetLink: "Бюджет ›",
    openBudgetA11y: "Открыть вкладку «Бюджет»",
    spentOfLimits: "Потрачено {{spent}} из лимитов {{limits}}",
    spentThisMonth: "Потрачено {{spent}} в этом месяце",
    empty: "Пока ничего не записано. Добавь первую покупку или зарплату, и она появится здесь.",
    openEntryA11y: "Открыть {{label}}, {{amount}}",
    addEntry: "+ Добавить запись",
    addEntryA11y: "Добавить запись бюджета",
  },
};

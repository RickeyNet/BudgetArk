/**
 * BudgetArk - Українські тексти: вкладка «Місток» (звіти)
 * File: src/i18n/locales/uk/bridgeReports.ts
 *
 * Ukrainian counterpart of en/bridgeReports.ts. Informal "ти" throughout;
 * see src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { LocalizedPlural } from "../types";
import type { bridgeReports as en } from "../en/bridgeReports";

export const bridgeReports: LocalizedPlural<typeof en> = {
  annual: {
    title: "Річний звіт",
    subtitle: "Твій {{year}} рік у цифрах",
    closeA11y: "Закрити річний звіт",
    empty: {
      title: "За {{year}} нічого не записано",
      body: "Додавай записи бюджету, платежі за боргами або рахунки - і звіт за {{year}} заповниться сам.",
    },
    tiles: {
      debtPaid: "Виплачено боргів",
      payments_one: "{{count}} платіж",
      payments_few: "{{count}} платежі",
      payments_many: "{{count}} платежів",
      payments_other: "{{count}} платежу",
      setAside: "Відкладено",
      setAsideHint: "Заощадження · Пенсія · Інвестиції",
      netWorthChange: "Зміна чистих активів",
      notEnoughHistory: "Недостатньо історії",
      startVsEnd: "Початок і кінець року",
      savingsRate: "Норма заощаджень",
      savingsRateHint: "Дохід, який залишився, а не витрачено",
    },
    cashFlow: {
      title: "Грошовий потік",
      income: "Доходи",
      expenses: "Витрати",
      netSaved: "Чисті заощадження",
    },
    underBudget: {
      title: "Місяців у межах бюджету",
      hint: "Місяці, у яких кожна категорія з лімітом вклалася в нього. Ліміти зберігаються за повний рік, тож поточний рік враховано повністю; у минулих років ліміти могли застаріти.",
    },
    topCategories: "Головні категорії витрат",
    trend: "Витрати за місяцями",
    share: {
      button: "Поділитися підсумком",
      a11y: "Поділитися річним підсумком",
      note: "Передаються лише підсумки та відсотки - без назв і деталей.",
    },
  },
  history: {
    title: "Чисті активи",
    subtext: "Активи {{assets}} · Борги {{debt}}",
    ranges: {
      "7D": "7 дн.",
      "30D": "30 дн.",
      ALL: "Усі",
    },
    change: "Зміна",
    sinceStart: "Від початку",
    rangeChange: "Зміна за {{range}}",
    empty: "Облік почнеться після першого знімка.",
    footer: "Щоденні знімки. Історія починається зараз.",
  },
  cashFlowChart: {
    title: "Грошовий потік за місяцями",
    subtitle: "Доходи та витрати",
    legendIn: "Надходження",
    legendOut: "Витрати",
    empty: "Додай кілька місяців доходів і витрат, щоб побачити грошовий потік.",
  },
  trackingStrip: {
    eyebrow: "ЦЬОГО МІСЯЦЯ",
    budgetLink: "Бюджет ›",
    openBudgetA11y: "Відкрити вкладку «Бюджет»",
    spentOfLimits: "Витрачено {{spent}} із лімітів {{limits}}",
    spentThisMonth: "Витрачено {{spent}} цього місяця",
    empty: "Поки нічого не записано. Додай першу покупку або зарплату, і вона з'явиться тут.",
    openEntryA11y: "Відкрити {{label}}, {{amount}}",
    addEntry: "+ Додати запис",
    addEntryA11y: "Додати запис бюджету",
  },
};

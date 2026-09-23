/**
 * BudgetArk - Українські тексти: чисті помічники (insights)
 * File: src/i18n/locales/uk/helpersInsights.ts
 *
 * Ukrainian counterpart of en/helpersInsights.ts. Informal "ти" throughout;
 * see src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { LocalizedPlural } from "../types";
import type { helpersInsights as en } from "../en/helpersInsights";

export const helpersInsights: LocalizedPlural<typeof en> = {
  streaks: {
    positiveNet: "Додатний чистий дохід",
    allUnderBudget: "Усі категорії в межах бюджету",
    spendingDecreasing: "Витрати зменшуються",
    spendingIncreasing: "Витрати зростають",
  },
  people: {
    deletedPerson: "(видалена людина)",
  },
  unusual: {
    firstTime: "Перше списання від цього продавця - варто глянути",
    aboveUsual: "{{ratio}}× від звичних {{usual}} - варто глянути",
  },
  tipNudge: {
    debtPayoff: {
      titleWithLabel: "{{label}} закрито. У цьому весь сенс.",
      title: "Один борг закрито. У цьому весь сенс.",
      body: "BudgetArk залишається безплатним і без реклами, без облікового запису й без витоку даних із телефону, бо люди в такі моменти трохи допомагають. Чайові необов'язкові й нічого не відкривають - застосунок і так повністю твій.",
    },
    billPaid: {
      titleWithLabel: "{{label}} сплачено, рядок бюджету оновлено",
      title: "Рахунок сплачено, рядок бюджету оновлено",
      body: "BudgetArk безплатний, без реклами, і нічого не залишає твій телефон. Якщо він робить день оплати рахунків простішим, необов'язкові чайові допоможуть так і лишити. Відкривати нічого.",
    },
    debtPayment: {
      title: "Ще шматочок боргу геть",
      body: "BudgetArk безплатний, без реклами й зберігає все на твоєму телефоні. Якщо він допомагає, необов'язкові чайові тримають його на плаву - відкривати нічого.",
    },
  },
  inbox: {
    duplicates: "Можливо, вже є в бюджеті",
    transfers: "Схоже на перекази",
    otherTransactions: "Інші операції",
  },
  recurrence: {
    tag: {
      "1": "Щомісяця",
      "3": "Щокварталу",
      "6": "Раз на 6 міс.",
      "12": "Щороку",
    },
  },
};

/**
 * BudgetArk - Svenska texter: rena hjälpfunktioner (insikter)
 * File: src/i18n/locales/sv/helpersInsights.ts
 *
 * Swedish counterpart of en/helpersInsights.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { helpersInsights as en } from "../en/helpersInsights";

export const helpersInsights: Localized<typeof en> = {
  streaks: {
    positiveNet: "Positiv nettoinkomst",
    allUnderBudget: "Alla kategorier under budget",
    spendingDecreasing: "Utgifterna minskar",
    spendingIncreasing: "Utgifterna ökar",
  },
  people: {
    deletedPerson: "(borttagen person)",
  },
  unusual: {
    firstTime: "Första köpet hos den här handlaren - värt en titt",
    aboveUsual: "{{ratio}}× det vanliga {{usual}} - värt en titt",
  },
  tipNudge: {
    debtPayoff: {
      titleWithLabel: "{{label}} är borta. Det är hela poängen.",
      title: "En skuld borta. Det är hela poängen.",
      body: "BudgetArk förblir gratis och reklamfritt, utan konto och utan att något lämnar din telefon, tack vare att människor som når stunder som den här bidrar. En dricks är frivillig och låser inte upp något - appen är redan helt din.",
    },
    billPaid: {
      titleWithLabel: "{{label}} betald, budgetraden justerad",
      title: "Räkning betald, budgetraden justerad",
      body: "BudgetArk är gratis och reklamfritt och inget lämnar din telefon. Om det gör räkningsdagen enklare håller en frivillig dricks det så. Inget att låsa upp.",
    },
    debtPayment: {
      title: "Ännu en bit av saldot borta",
      body: "BudgetArk är gratis, reklamfritt och behåller allt på din telefon. Om det hjälper dig håller en frivillig dricks det på kurs - inget att låsa upp.",
    },
  },
  inbox: {
    duplicates: "Kanske redan i din budget",
    transfers: "Troligen överföringar",
    otherTransactions: "Övriga transaktioner",
  },
  recurrence: {
    tag: {
      "1": "Månadsvis",
      "3": "Kvartalsvis",
      "6": "6 mån",
      "12": "Årligen",
    },
  },
};

/**
 * BudgetArk - Norske tekster: rene hjelpefunksjoner (innsikt)
 * File: src/i18n/locales/nb/helpersInsights.ts
 *
 * Norwegian (Bokmål) counterpart of en/helpersInsights.ts. Informal "du"
 * throughout; see src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { helpersInsights as en } from "../en/helpersInsights";

export const helpersInsights: Localized<typeof en> = {
  streaks: {
    positiveNet: "Positiv nettoinntekt",
    allUnderBudget: "Alle kategorier under budsjett",
    spendingDecreasing: "Forbruket synker",
    spendingIncreasing: "Forbruket øker",
  },
  people: {
    deletedPerson: "(slettet person)",
  },
  unusual: {
    firstTime: "Første kjøp hos denne forhandleren - verdt en titt",
    aboveUsual: "{{ratio}}× det vanlige {{usual}} - verdt en titt",
  },
  tipNudge: {
    debtPayoff: {
      titleWithLabel: "{{label}} er borte. Det er hele poenget.",
      title: "Én gjeldspost borte. Det er hele poenget.",
      body: "BudgetArk forblir gratis og reklamefri, uten konto og uten at noe forlater telefonen din, fordi folk som opplever øyeblikk som dette bidrar. Et tips er frivillig og låser ikke opp noe - appen er allerede helt din.",
    },
    billPaid: {
      titleWithLabel: "{{label}} betalt, budsjettlinjen justert",
      title: "Regning betalt, budsjettlinjen justert",
      body: "BudgetArk er gratis og reklamefri, og ingenting forlater telefonen din. Hvis det gjør regningsdagen enklere, holder et frivillig tips det slik. Ingenting å låse opp.",
    },
    debtPayment: {
      title: "Enda en bit av saldoen borte",
      body: "BudgetArk er gratis, reklamefri og beholder alt på telefonen din. Hvis det hjelper, holder et frivillig tips det på kurs - ingenting å låse opp.",
    },
  },
  inbox: {
    duplicates: "Kanskje allerede i budsjettet ditt",
    transfers: "Sannsynligvis overføringer",
    otherTransactions: "Andre transaksjoner",
  },
  recurrence: {
    tag: {
      "1": "Månedlig",
      "3": "Kvartalsvis",
      "6": "6 mnd",
      "12": "Årlig",
    },
  },
};

/**
 * BudgetArk - Deutsche Texte: reine Helfer (insights)
 * File: src/i18n/locales/de/helpersInsights.ts
 *
 * German counterpart of en/helpersInsights.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { helpersInsights as en } from "../en/helpersInsights";

export const helpersInsights: Localized<typeof en> = {
  streaks: {
    positiveNet: "Positives Nettoeinkommen",
    allUnderBudget: "Alle Kategorien unter Budget",
    spendingDecreasing: "Ausgaben sinken",
    spendingIncreasing: "Ausgaben steigen",
  },
  people: {
    deletedPerson: "(gelöschte Person)",
  },
  unusual: {
    firstTime: "Erste Abbuchung dieses Händlers – lohnt einen Blick",
    aboveUsual: "{{ratio}}× so viel wie sonst ({{usual}}) – lohnt einen Blick",
  },
  tipNudge: {
    debtPayoff: {
      titleWithLabel: "{{label}} ist weg. Genau darum geht es.",
      title: "Eine Schuld weniger. Genau darum geht es.",
      body: "BudgetArk bleibt kostenlos und werbefrei, ohne Konto und ohne dass etwas dein Handy verlässt – weil Leute, die solche Momente erleben, etwas beisteuern. Ein Trinkgeld ist freiwillig und schaltet nichts frei – die App gehört schon ganz dir.",
    },
    billPaid: {
      titleWithLabel: "{{label}} beglichen, Budgetposten angepasst",
      title: "Rechnung beglichen, Budgetposten angepasst",
      body: "BudgetArk ist kostenlos und werbefrei, und nichts verlässt dein Handy. Wenn es den Rechnungstag leichter macht, hält ein freiwilliges Trinkgeld das so. Nichts freizuschalten.",
    },
    debtPayment: {
      title: "Wieder ein Stück vom Saldo weg",
      body: "BudgetArk ist kostenlos, werbefrei und behält alles auf deinem Handy. Wenn es dir hilft, hält ein freiwilliges Trinkgeld es auf Kurs – nichts freizuschalten.",
    },
  },
  inbox: {
    duplicates: "Vielleicht schon in deinem Budget",
    transfers: "Wahrscheinlich Umbuchungen",
    otherTransactions: "Weitere Umsätze",
  },
  recurrence: {
    tag: {
      "1": "Monatlich",
      "3": "Vierteljährlich",
      "6": "6 Mon.",
      "12": "Jährlich",
    },
  },
};

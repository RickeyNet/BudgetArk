/**
 * BudgetArk - Deutsche Texte: Budget-Tab (inbox)
 * File: src/i18n/locales/de/budgetInbox.ts
 *
 * German counterpart of en/budgetInbox.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { budgetInbox as en } from "../en/budgetInbox";

export const budgetInbox: Localized<typeof en> = {
  title: "Prüfposteingang",
  subtitle: {
    waiting_one: "{{count}} importierter Umsatz wartet auf Freigabe",
    waiting_other: "{{count}} importierte Umsätze warten auf Freigabe",
    empty: "Nichts zu prüfen",
  },
  header: {
    rules: "Regeln",
    sync: "Sync",
  },
  groupBy: {
    label: "Gruppieren nach",
    date: "Datum",
    vendor: "Händler",
  },
  bulk: {
    approving: "Wird freigegeben...",
    approveSuggested: "{{count}} mit vorgeschlagenen Kategorien freigeben",
    skipAll: "Alle überspringen",
    categorizeAll: "Alle kategorisieren",
    close: "Schließen",
    alwaysFileVendor: "Diesen Händler immer hier einordnen",
    working: "Bitte warten...",
    approveGroupAs: "{{count}} als {{category}} freigeben",
  },
  empty: "Posteingang leer. Neue Umsätze landen hier nach einem Sync.",
  row: {
    noDescription: "(keine Beschreibung)",
    pending: "ausstehend",
    suggested: "Vorschlag: {{category}}",
    deletedBusiness: "(gelöschtes Unternehmen)",
    deletedPerson: "(gelöschte Person)",
    deletedDebt: "(gelöschte Schuld)",
  },
  form: {
    nameLabel: "NAME",
    namePlaceholder: "Diesem Umsatz einen Namen geben",
    categoryLabel: "KATEGORIE",
    appliesToBill: "GEHÖRT ZU RECHNUNG",
    notABill: "Keine Rechnung",
    billOption: "{{name}} · ca. {{amount}}",
    debtOption: "{{name}} · mind. {{amount}}",
    debtHint:
      "Wird als Zahlung auf diese Schuld gebucht - Saldo und Zahlungsverlauf aktualisieren sich im Schulden-Tab, und das Budget zählt sie unter Schuldentilgung. Es entsteht keine separate Ausgabe, und die Kategorie oben wird nicht verwendet. Hake unten „Immer so machen“ an, dann werden künftige Zahlungen an diesen Händler direkt auf die Schuld gebucht, ohne hier zu stoppen.",
    businessLabel: "UNTERNEHMEN",
    personal: "Privat",
    peopleLabel: "PERSONEN",
    unassigned: "Nicht zugewiesen",
    lentToLabel: "JEMANDEM GELIEHEN?",
    lentToHint:
      "Geld, das du zurückerwartest? Trag ein, wer es hat, und verfolge die Rückzahlungen unter Profil → Personen → Dir geschuldet.",
    lentToPlaceholder: "Leer lassen, wenn das kein Darlehen ist",
    lentToChip: "Geliehen an {{name}}",
    planLabel: "ZU EINEM ANSCHAFFUNGSPLAN HINZUFÜGEN",
    planHint:
      "Hast du dieses Geld für einen deiner Pläne zur Seite gelegt? Tippe auf den Plan, und der Betrag landet auf dessen Guthaben statt als Ausgabe.",
    planChipA11y: "{{amount}} zu {{plan}} hinzufügen",
    planToGo: " · noch {{amount}}",
    planFunded: " · voll finanziert",
    rememberRule:
      "Immer so machen für „{{merchant}}“ - bei Freigabe werden passende Umsätze hier und in künftigen Importen automatisch mit diesen Einstellungen freigegeben; bei Überspringen wird der Händler nie wieder importiert",
  },
  billSuggest: {
    title: "🧾 Sieht nach einer monatlichen Rechnung aus",
    body_one:
      "{{label}} ist seit {{count}} Monat einmal monatlich gebucht worden, im Schnitt {{amount}}. Mach daraus eine wiederkehrende Rechnung, dann wird diese Buchung - und künftige - darauf angerechnet, statt sich auf die Schätzung zu stapeln.",
    body_other:
      "{{label}} ist seit {{count}} Monaten einmal monatlich gebucht worden, im Schnitt {{amount}}. Mach daraus eine wiederkehrende Rechnung, dann wird diese Buchung - und künftige - darauf angerechnet, statt sich auf die Schätzung zu stapeln.",
    creating: "Wird erstellt...",
    create: "Als wiederkehrende Rechnung anlegen · {{amount}}/Monat",
  },
  ruleNudge: {
    title: "🔁 Das hast du schon mal gemacht",
    body_one:
      "Du hast „{{merchant}}“ {{count}} Mal als {{category}} freigegeben. Mach eine Regel daraus, dann geben sich künftige Importe dieses Händlers mit derselben Kategorie selbst frei.",
    body_other:
      "Du hast „{{merchant}}“ {{count}} Mal als {{category}} freigegeben. Mach eine Regel daraus, dann geben sich künftige Importe dieses Händlers mit derselben Kategorie selbst frei.",
    saving: "Wird gespeichert...",
    alwaysApproveAs: "Immer als {{category}} freigeben",
  },
  actions: {
    skip: "Überspringen",
    alwaysSkip: "Immer überspringen",
    saving: "Wird gespeichert...",
    logPayment: "Zahlung buchen",
    alwaysLogPayment: "Immer als Zahlung buchen",
    approve: "Freigeben",
    alwaysApprove: "Immer freigeben",
  },
  notices: {
    alreadyLogged:
      "Schon im Schulden-Tab - passt zur Zahlung über {{amount}} vom {{date}}. Nichts wurde doppelt gezählt.",
  },
  errors: {
    load: "Der Posteingang konnte nicht geladen werden.",
    approve: "Dieser Umsatz konnte nicht freigegeben werden.",
    skip: "Dieser Umsatz konnte nicht übersprungen werden.",
    addToPlan: "Konnte nicht zum Plan hinzugefügt werden.",
    logDebtPayment: "Diese Schuldenzahlung konnte nicht gebucht werden.",
    skipMany: "Diese Umsätze konnten nicht übersprungen werden.",
    createBill: "Die wiederkehrende Rechnung konnte nicht erstellt werden.",
    categorizeVendor: "Die Umsätze dieses Händlers konnten nicht kategorisiert werden.",
    bulkApprove: "Nicht alle vorgeschlagenen Umsätze konnten freigegeben werden.",
  },
};

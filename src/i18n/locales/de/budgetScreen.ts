/**
 * BudgetArk - Deutsche Texte: Budget-Tab (screen)
 * File: src/i18n/locales/de/budgetScreen.ts
 *
 * German counterpart of en/budgetScreen.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { budgetScreen as en } from "../en/budgetScreen";

export const budgetScreen: Localized<typeof en> = {
  header: {
    title: "Budget",
    subtitle: "Einnahmen, Ausgaben und Kategorie-Limits im Blick.",
    billCalendarA11y: "Rechnungskalender",
    searchA11y: "Schulden, Zahlungen und Buchungen durchsuchen",
    inboxA11y: "Prüfposteingang, {{count}} wartend",
  },
  monthNav: {
    previousA11y: "Vorheriger Monat",
    nextA11y: "Nächster Monat",
  },
  insights: {
    title: "Einblicke",
    hint: "Trends, Veränderungen, Serien, Vergleiche",
  },
  summary: {
    income: "Einnahmen",
    spent: "Ausgegeben",
    net: "Netto",
    plannedMinimums: "Enthält {{amount}} geplante Mindestraten aus dem Schulden-Tab",
    retirement: "Plus {{amount}} in deine Altersvorsorge (401(k)) diesen Monat (zählt nicht als Einnahme)",
    taxSetAside: "Lege {{amount}} der 1099-Einnahmen dieses Monats für Steuern zurück",
  },
  selection: {
    cancelA11y: "Auswahl abbrechen",
    selected_one: "{{count}} ausgewählt",
    selected_other: "{{count}} ausgewählt",
    recategorize: "Umkategorisieren",
    recategorizeA11y: "Ausgewählte Buchungen umkategorisieren",
    deleteA11y: "Ausgewählte Buchungen löschen",
    moveTitle_one: "{{count}} Buchung verschieben nach…",
    moveTitle_other: "{{count}} Buchungen verschieben nach…",
  },
  bucket: {
    title: "Topf neu zuweisen",
    currently: " - aktuell {{bucket}}",
    useDefault: "Standard verwenden ({{bucket}})",
  },
  limit: {
    title: "Monatslimit festlegen",
    placeholder: "0,00",
    hint: "Leer lassen, um das Limit zu entfernen.",
  },
  emergencyFund: {
    title: "Notgroschen",
    currentBalance: "Aktueller Stand: {{amount}}",
    target: " / {{amount}}",
    tracked_one: " • aus {{count}} zugewiesenem Sparkonto",
    tracked_other: " • aus {{count}} zugewiesenen Sparkonten",
    placeholder: "Betrag zum Einzahlen (negativ zum Abheben)",
    hint: "Positive Zahl zum Einzahlen, negative zum Abheben.",
  },
  undo: {
    edited: "„{{label}}“ bearbeitet",
    deleted: "„{{label}}“ gelöscht",
    deletedEntry: "Buchung gelöscht",
    deletedCount_one: "{{count}} Buchung gelöscht",
    deletedCount_other: "{{count}} Buchungen gelöscht",
    moved_one: "{{count}} Buchung nach {{category}} verschoben",
    moved_other: "{{count}} Buchungen nach {{category}} verschoben",
  },
};

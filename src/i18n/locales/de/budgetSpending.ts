/**
 * BudgetArk - Deutsche Texte: Budget-Tab (spending)
 * File: src/i18n/locales/de/budgetSpending.ts
 *
 * German counterpart of en/budgetSpending.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { budgetSpending as en } from "../en/budgetSpending";

export const budgetSpending: Localized<typeof en> = {
  spendingCard: {
    title: "Ausgaben",
    splitFood: "Essen aufteilen ({{count}})",
    limitsA11y: "Monatliche Limits für jede Kategorie festlegen",
    tapToExpand: "Zeile antippen zum Aufklappen · ",
    limitsLink: "Limits ›",
    tapToExpandHold: "Antippen zum Aufklappen · Halten für Limit",
    businessOnlyA11y: "Nur Geschäftsausgaben anzeigen",
    businessOnlyChip: "💼 Nur geschäftlich",
    limitsHiddenFiltered: "Limits bei aktivem Filter ausgeblendet",
    total: "Gesamt",
    emptyBusinessTitle: "Keine Geschäftsausgaben in diesem Monat",
    emptyTitle: "Keine Ausgaben in diesem Monat",
    emptyBusinessSubtext: "Ordne einer Ausgabe ein Unternehmen zu, damit sie hier erscheint.",
    emptySubtext: "Füge Buchungen hinzu, um dein Ausgabendiagramm zu sehen.",
    pace: {
      over: "{{amount}} über dem Limit",
      atLimit: "Limit erreicht - diesen Monat ist nichts mehr übrig",
      ahead: "Schneller als geplant - im Plan wären bis heute {{amount}}",
      onPace: "Im Plan - bis heute sind {{amount}} zu erwarten",
    },
    expandedHeader_one: "Aufgeklappt - {{count}} Buchung",
    expandedHeader_other: "Aufgeklappt - {{count}} Buchungen",
    loggedPayment: {
      title: "Erfasste Schuldenzahlung",
      message:
        "Diese Zahlung wurde im Schulden-Tab erfasst. Zum Bearbeiten oder Löschen öffne dort den Zahlungsverlauf der Schuld.",
    },
    deletedBusiness: "(gelöscht)",
    owed: " · {{amount}} offen",
    paidBack: " · zurückgezahlt",
    billFallback: "Rechnung",
    billEstimate: " · ca. {{amount}}",
    logActualA11y: "Tatsächlichen Betrag für {{name}} erfassen",
    logActual: "Ist-Betrag",
    auto: "Auto",
    showMoreA11y_one: "{{count}} weitere Buchung anzeigen",
    showMoreA11y_other: "{{count}} weitere Buchungen anzeigen",
    showMore_one: "{{count}} weitere Buchung anzeigen",
    showMore_other: "{{count}} weitere Buchungen anzeigen",
  },
  buckets: {
    title: "50/30/20",
    takeHome: "Netto diesen Monat: {{amount}}",
    emptyTitle: "Erfasse Einnahmen, um die 50/30/20-Aufteilung zu sehen",
    emptySubtext: "Erfasse Gehalt oder freiberufliche Einnahmen für diesen Monat.",
    onTarget: "{{bucket}} im Ziel",
    overTarget: "{{amount}} über dem Ziel bei {{bucket}}",
    underTarget: "{{amount}} unter dem Ziel bei {{bucket}}",
    targetChip: "{{percent}} % Ziel",
    hide: "Ausblenden",
    show: "Anzeigen",
    emptyBucket: "Keine Ausgaben in diesem Bereich in diesem Monat.",
    override: " (angepasst)",
    reassignHint: "Halte eine Kategorie gedrückt, um ihren Bereich zu ändern.",
  },
  limits: {
    title: "Monatliche Limits",
    subtitle:
      "{{month}}. Ein hier gesetztes Limit gilt auch für spätere Monate, bis du es änderst. Lass ein Feld leer für kein Limit.",
    loadFailed: "Deine Limits konnten nicht geladen werden.",
    saveFailed: "Deine Limits konnten nicht gespeichert werden.",
    saving: "Speichern...",
    copyLastMonth: "Letzten Monat übernehmen",
    useAverages: "3-Monats-Durchschnitt nutzen",
    spent: "Ausgegeben {{amount}}",
    avg: "Ø {{amount}}",
    lastMonth: "letzter Monat {{amount}}",
    useAverageA11y: "Durchschnitt für {{category}} verwenden",
    avgChip: "Ø",
    nonePlaceholder: "keins",
    limitInputA11y: "Monatliches Limit für {{category}}",
    loading: "Lädt...",
  },
  foodSplit: {
    title: "Essen-Buchungen aufteilen",
    subtitle: "Prüfe jede Essen-Ausgabe und ordne sie Lebensmittel oder Restaurant zu.",
    apply: "Aufteilung anwenden",
  },
};

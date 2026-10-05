/**
 * BudgetArk - Deutsche Texte: Schulden-Tab (card)
 * File: src/i18n/locales/de/debtsCard.ts
 *
 * German counterpart of en/debtsCard.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { debtsCard as en } from "../en/debtsCard";

export const debtsCard: Localized<typeof en> = {
  card: {
    status: {
      almost: "Fast geschafft!",
      progress: "Auf gutem Weg",
      keepGoing: "Dranbleiben",
    },
    collapsedDetail: "{{balance}} · {{rate}} % Zinsen",
    rateLine: "{{rate}} % Zinsen · {{minimum}}/Monat Mindestrate",
    meta: "Inhaber: {{owner}} · Art: {{type}}",
    reviewType: "Art prüfen",
    remaining: "OFFEN",
    paidOff: "ABBEZAHLT",
    bankSync: "Saldo von {{account}}",
    bankSyncAsOf: "Saldo von {{account}} · Stand {{date}}",
    goal: {
      passed: "Zieldatum ist verstrichen",
      line: "Ziel: {{date}} ({{monthsLeft}})",
      monthsLeft_one: "noch {{count}} Mon.",
      monthsLeft_other: "noch {{count}} Mon.",
      onTrack: "Im Plan",
      need: "Nötig: {{amount}}/Monat",
    },
    keepAlive: {
      active: "Karte aktiv · nächste Nutzung bis {{date}}",
      overdue: "Inaktivitätsfrist verstrichen ({{date}}) · bald nutzen",
      useBy: "Nutzen bis {{date}} ({{when}})",
      today: "heute",
      tomorrow: "morgen",
      days_one: "{{count}} Tag",
      days_other: "{{count}} Tage",
      usedIt: "Benutzt",
    },
    timeline: {
      adjust: "Zahlungsplan anpassen",
      months_one: "{{count}} Monat bis zur Tilgung",
      months_other: "{{count}} Monate bis zur Tilgung",
    },
    pay: "Zahlen",
    deleteA11y: "{{name}} löschen",
    confirmPaymentA11y: "Zahlung bestätigen",
    paymentPlaceholder: "Zahlungsbetrag",
  },
  history: {
    title: "Zahlungsverlauf",
    totalPaid: "Gesamt gezahlt: {{amount}}",
    deletedDebt: "Gelöschte Schuld",
    empty: {
      title: "Noch keine Zahlungen",
      subtitle: "Deine Zahlungen erscheinen hier.",
    },
    selected_one: "{{count}} ausgewählt",
    selected_other: "{{count}} ausgewählt",
    deleteSelectedA11y: "Ausgewählte Zahlungen löschen",
    deleted_one: "{{count}} Zahlung gelöscht",
    deleted_other: "{{count}} Zahlungen gelöscht",
    undoA11y: "Löschen der Zahlungen rückgängig machen",
    undo: "RÜCKGÄNGIG",
  },
};

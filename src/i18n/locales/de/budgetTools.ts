/**
 * BudgetArk - Deutsche Texte: Budget-Tab (tools)
 * File: src/i18n/locales/de/budgetTools.ts
 *
 * German counterpart of en/budgetTools.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { budgetTools as en } from "../en/budgetTools";

export const budgetTools: Localized<typeof en> = {
  search: {
    title: "Suche",
    subtitle: "Finde alles, was du erfasst hast - Schulden, Zahlungen und Buchungen.",
    closeA11y: "Suche schließen",
    placeholder: "Z. B. „Sparkasse“, „Lebensmittel“ oder einen Betrag",
    inputA11y: "Alles durchsuchen",
    clearA11y: "Suche leeren",
    filtersToggle: "Filter",
    filtersToggleCount: "Filter ({{count}})",
    filtersA11y: "Filter, {{count}} aktiv",
    reset: "Zurücksetzen",
    resetA11y: "Filter zurücksetzen",
    scopeLabel: "Suchen in",
    scope: {
      all: "Alles",
      debts: "Schulden",
      payments: "Zahlungen",
      entries: "Budget",
    },
    dateLabel: "Datum",
    datePreset: {
      any: "Jederzeit",
      "30d": "Letzte 30 Tage",
      "90d": "Letzte 90 Tage",
      year: "Dieses Jahr",
    },
    entryTypeLabel: "Buchungsart",
    entryType: {
      all: "Einnahmen + Ausgaben",
      income: "Einnahmen",
      expense: "Ausgaben",
    },
    categoriesLabel: "Kategorien",
    amountLabel: "Betrag",
    minPlaceholder: "Min.",
    minA11y: "Mindestbetrag",
    maxPlaceholder: "Max.",
    maxA11y: "Höchstbetrag",
    promptTitle: "Durchsuche deine Einträge",
    promptBody:
      "Tippe einen Schuldnamen, eine Notiz, einen Händler, eine Kategorie oder einen Betrag ein - oder öffne die Filter, um nach Datum, Art oder Kategorie zu stöbern.",
    noMatchesTitle: "Keine Treffer",
    noMatchesBody: "Versuch es mit weniger Wörtern oder lockereren Filtern.",
    debtsHidden: "Schulden werden ausgeblendet, solange ein Datums-, Buchungsart- oder Kategoriefilter aktiv ist.",
    sectionDebts: "SCHULDEN · {{count}}",
    sectionPayments: "SCHULDENZAHLUNGEN · {{count}}",
    sectionEntries: "BUCHUNGEN · {{count}}",
    debtA11y: "Schuld {{name}}",
    paymentA11y: "Zahlung an {{name}}",
    entryA11y: "Buchung {{name}}",
    apr: "{{rate}} % eff. Jahreszins",
    paidOff: "Abbezahlt 🎉",
    truncation: "Die ersten {{shown}} von {{total}} werden angezeigt - grenze die Suche ein, um den Rest zu sehen.",
  },
  billCalendar: {
    title: "Rechnungskalender",
    stats: {
      bills: "Rechnungen",
      paid: "Bezahlt",
      remaining: "Offen",
    },
    nextLabel: "NÄCHSTE",
    nextRow: "{{name}} · {{amount}} · {{when}}",
    when: {
      today: "heute",
      tomorrow: "morgen",
      daysAgo: "vor {{count}} T.",
      inDays: "in {{count}} T.",
    },
    weekdays: {
      sun: "S",
      mon: "M",
      tue: "D",
      wed: "M",
      thu: "D",
      fri: "F",
      sat: "S",
    },
    showOneOff: "Auch einmalige Ausgaben anzeigen",
    emptyHint:
      "In diesem Monat fallen keine wiederkehrenden Rechnungen an. Lege im Buchungsformular eine wiederkehrende Ausgabe an und setze ihren Monatstag, um sie hier zu sehen.",
    paidActual: "✓ Bezahlt (tatsächlich)",
    payButton: "Zahlen ↗",
    payA11y: "Zahlungsseite für {{name}} öffnen",
    linkError: {
      title: "Link kann nicht geöffnet werden",
      invalid: "Die gespeicherte URL ist keine gültige http(s)-Adresse. Bearbeite die Rechnung, um sie zu korrigieren.",
      noBrowser: "Kein Browser verfügbar, um die URL zu öffnen.",
      failed: "Beim Öffnen der URL ist etwas schiefgelaufen.",
    },
  },
  monthlyReview: {
    title: "Monatsrückblick",
    emptyTitle: "Noch nicht genug Daten",
    emptyBody: "Erfasse mindestens 2 Monate lang Buchungen, um Trends, Kategorieänderungen und Serien zu sehen.",
    vsAverage: {
      title: "Dieser Monat vs. Durchschnitt",
      thisMonth: "Dieser Monat",
      avgPerMonth: "Ø / Monat",
      change: "Änderung",
    },
    byPerson: {
      title: "Ausgaben nach Person",
      hint: "Zugeordnete Ausgaben in diesem Monat",
    },
    comparison: {
      title: "Kategorievergleich",
      hint: "vs. Durchschnitt der letzten 3 Monate",
      row: "{{current}} diesen Monat · Ø {{average}}",
      new: "Neu",
      stopped: "Gestoppt",
      flat: "Gleich",
    },
    spendingTrend: "Ausgabentrend",
    netIncomeTrend: "Nettoeinkommen-Trend",
    streaks: {
      title: "Serien",
      months: "{{count}} Mon.",
    },
    changes: {
      title: "Kategorieänderungen",
      hint: "vs. Vormonat",
    },
  },
};

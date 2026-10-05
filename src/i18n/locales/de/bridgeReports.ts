/**
 * BudgetArk - Deutsche Texte: Bruecke-Tab (reports)
 * File: src/i18n/locales/de/bridgeReports.ts
 *
 * German counterpart of en/bridgeReports.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { bridgeReports as en } from "../en/bridgeReports";

export const bridgeReports: Localized<typeof en> = {
  annual: {
    title: "Jahresbericht",
    subtitle: "Dein Jahr {{year}} im Rückblick",
    closeA11y: "Jahresbericht schließen",
    empty: {
      title: "Nichts erfasst für {{year}}",
      body: "Erfasse Buchungen, Schuldenzahlungen oder Konten, und dein Bericht für {{year}} füllt sich automatisch.",
    },
    tiles: {
      debtPaid: "Schulden getilgt",
      payments_one: "{{count}} Zahlung",
      payments_other: "{{count}} Zahlungen",
      setAside: "Zurückgelegt",
      setAsideHint: "Sparen · Vorsorge · Investieren",
      netWorthChange: "Nettovermögen",
      notEnoughHistory: "Zu wenig Verlauf",
      startVsEnd: "Jahresanfang vs. -ende",
      savingsRate: "Sparquote",
      savingsRateHint: "Behaltener Anteil vom Einkommen",
    },
    cashFlow: {
      title: "Cashflow",
      income: "Einnahmen",
      expenses: "Ausgaben",
      netSaved: "Netto gespart",
    },
    underBudget: {
      title: "Monate unter Budget",
      hint: "Monate, in denen jede Kategorie mit Limit darunter blieb. Limits werden ein volles Jahr aufbewahrt, das laufende Jahr ist also komplett abgedeckt; bei älteren Jahren können Limits fehlen.",
    },
    topCategories: "Top-Ausgabenkategorien",
    trend: "Ausgaben nach Monat",
    share: {
      button: "Zusammenfassung teilen",
      a11y: "Jahreszusammenfassung teilen",
      note: "Teilt nur Summen und Prozentwerte - keine Namen oder Details.",
    },
  },
  history: {
    title: "Nettovermögen",
    subtext: "Vermögen {{assets}} · Schulden {{debt}}",
    ranges: {
      "7D": "7T",
      "30D": "30T",
      ALL: "Alle",
    },
    change: "Veränderung",
    sinceStart: "Seit Beginn",
    rangeChange: "Veränderung {{range}}",
    empty: "Die Aufzeichnung beginnt mit der ersten Momentaufnahme.",
    footer: "Tägliche Momentaufnahmen. Der Verlauf beginnt jetzt. Fahr mit dem Finger über die Linie, um den Wert eines Tages zu sehen.",
    chartA11y: "Nettovermögen-Diagramm. Fahr darüber, um das Nettovermögen eines Tages zu lesen.",
  },
  cashFlowChart: {
    title: "Monatlicher Cashflow",
    subtitle: "Einnahmen vs. Ausgaben",
    legendIn: "Ein",
    legendOut: "Aus",
    scrub: "{{label}} · Ein {{income}} · Aus {{expense}} · Netto {{net}}",
    chartA11y: "Cashflow-Diagramm. Fahr darüber, um Einnahmen, Ausgaben und Netto eines Monats zu lesen.",
    empty: "Erfasse ein paar Monate Einnahmen und Ausgaben, um den Cashflow zu sehen.",
  },
  trackingStrip: {
    eyebrow: "DIESER MONAT",
    budgetLink: "Budget ›",
    openBudgetA11y: "Budget-Tab öffnen",
    spentOfLimits: "{{spent}} von {{limits}} Limit ausgegeben",
    spentThisMonth: "{{spent}} diesen Monat ausgegeben",
    empty: "Noch nichts erfasst. Trag deinen ersten Einkauf oder dein Gehalt ein, und es erscheint hier.",
    openEntryA11y: "{{label}} öffnen, {{amount}}",
    addEntry: "+ Buchung",
    addEntryA11y: "Buchung hinzufügen",
  },
};

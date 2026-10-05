/**
 * BudgetArk - Deutsche Texte: Budget-Tab (cards)
 * File: src/i18n/locales/de/budgetCards.ts
 *
 * German counterpart of en/budgetCards.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. German ordinals are
 * always "12." - every ordinalSuffix bucket is ".".
 */

import type { Localized } from "../types";
import type { budgetCards as en } from "../en/budgetCards";

export const budgetCards: Localized<typeof en> = {
  paycheck: {
    title: "Bis zum Zahltag",
    change: "Ändern",
    emptyIntro:
      "Sag BudgetArk, wann du bezahlt wirst, und es zeigt dir, was vor dem nächsten Gehalt fällig ist - und was du bis dahin ausgeben kannst.",
    setUp: "Zahlungsperioden einrichten",
    noNextPayday: "Aus deinem Zahlungsrhythmus ergibt sich kein nächster Zahltag - bitte prüfen.",
    howOften: "Wie oft wirst du bezahlt?",
    frequency: {
      weekly: "Wöchentlich",
      biweekly: "Alle 2 Wochen",
      semimonthly: "Zweimal im Monat",
      monthly: "Monatlich",
    },
    recentPayday: "Dein letzter Zahltag",
    paydays: "Zahltage",
    payday: "Zahltag",
    semimonthly: {
      "1-15": "1. & 15.",
      "15-last": "15. & letzter Tag",
    },
    lastDay: "Letzter Tag",
    ordinalSuffix: { one: ".", two: ".", few: ".", other: "." },
    dayOrdinal: "{{day}}{{suffix}}",
    pickPayday: "Wähle zuerst einen letzten Zahltag.",
    saveFailed: "Dein Zahlungsrhythmus konnte nicht gespeichert werden.",
    saveSchedule: "Rhythmus speichern",
    privacyHint: "Bleibt auf diesem Telefon. Wird nur genutzt, um dein Budget in Zahlungsperioden zu teilen.",
    nextCheck: "Nächstes Gehalt {{date}} · {{when}}",
    tomorrow: "morgen",
    inDays_one: "in {{count}} Tag",
    inDays_other: "in {{count}} Tagen",
    dueBefore: "Fällig bis dahin",
    nothingDue: "Vor deinem nächsten Gehalt steht nichts im Kalender.",
    today: "heute",
    overdue: "überfällig · {{date}}",
    showFewer: "Weniger anzeigen",
    showMore: "+{{count}} weitere",
    safeUntilPayday: "Verfügbar bis zum Zahltag",
    shortBy: "Fehlbetrag bis zum Zahltag",
    perDay: "Etwa {{amount}} pro Tag. ",
    cashNow:
      "Bargeld jetzt ≈ {{amount}}: dein Startsaldo plus das, was laut Buchungen diesen Monat schon eingegangen ist.",
    recordBalance:
      "Trage den Girokonto-Startsaldo dieses Monats ein, dann zeigt diese Karte auch, was bis zum Zahltag verfügbar ist. ",
    setIt: "Eintragen",
  },
  monthBalance: {
    promptTitle: "Neuer Monat - Kontostand aktualisieren",
    title: "Startsaldo",
    subtitle:
      "Was ist zu Beginn von {{month}} auf dem Girokonto? BudgetArk berechnet daraus deinen Kontostand zum Monatsende und was verfügbar ist.",
    inputPlaceholder: "0,00",
    inputA11y: "Startsaldo Girokonto",
    usePrefill: "Girokonto-Summe von der Brücke übernehmen: {{amount}}",
    alsoUpdates: "Aktualisiert auch „{{account}}“ auf deiner Brücke, damit das Nettovermögen aktuell bleibt.",
    saveFailed: "Dein Kontostand konnte nicht gespeichert werden. Bitte versuch es erneut.",
    notNow: "Jetzt nicht",
    saving: "Speichern…",
  },
  cashFlow: {
    title: "Cashflow",
    emptyIntro:
      "Trage den Girokonto-Startsaldo dieses Monats ein, und BudgetArk berechnet, wo der Monat endet - und was verfügbar ist.",
    setStarting: "Startsaldo eintragen",
    update: "Aktualisieren",
    startingCash: "Startsaldo",
    projectedEnd: "Voraussichtlich am Monatsende",
    safeToSpend: "Verfügbar",
    overPlanBy: "Über Plan um",
    hint: "Einnahmen minus Ausgaben diesen Monat, inklusive geplanter Rechnungen und Mindestraten.",
    reconcileOnPlan: "Genau nach Plan des letzten Monats gestartet",
    reconcileAbove: "{{amount}} über dem Plan des letzten Monats gestartet",
    reconcileBelow: "{{amount}} unter dem Plan des letzten Monats gestartet",
  },
  reminderOffer: {
    eyebrow: "ERINNERUNGEN",
    title: "🔔 Möchtest du einen Anstupser zum Dranbleiben?",
    body:
      "Eine kurze Nachfrage, wenn ein paar Tage ohne Buchung vergehen, und ein Hinweis am 1. Nie ein Betrag, Kontostand, Konto oder eine Rechnung - nur ein Tipp zurück in die App. Jederzeit anpassen oder ausschalten unter Profil → Erinnerungen.",
    turnOn: "Einschalten",
    asking: "Frage dein Telefon...",
    noThanks: "Nein danke",
    permissionTitle: "Benachrichtigungen sind aus",
    permissionMessage:
      "BudgetArk braucht die Berechtigung für Benachrichtigungen, um Erinnerungen zu senden. Du kannst sie in den Einstellungen deines Telefons erlauben und Erinnerungen dann unter Profil → Erinnerungen einschalten.",
    notNow: "Jetzt nicht",
    openSettings: "Einstellungen öffnen",
    failedTitle: "Erinnerungen konnten nicht eingeschaltet werden",
    failedMessage:
      "Beim Speichern der Einstellung ist etwas schiefgelaufen. Du kannst es unter Profil → Erinnerungen erneut versuchen.",
  },
  debtDue: {
    eyebrow: "ERINNERUNG SCHULDENZAHLUNG",
    summary_one: "{{count}} Mindestrate fällig in den nächsten {{days}} Tagen",
    summary_other: "{{count}} Mindestraten fällig in den nächsten {{days}} Tagen",
    total: "{{amount}} Mindestraten gesamt (aus dem Schulden-Tab)",
    next: "Als Nächstes: {{name}} · {{amount}} · {{when}}",
    today: "heute",
    tomorrow: "morgen",
    inDays_one: "in {{count}} Tag",
    inDays_other: "in {{count}} Tagen",
  },
  dueDate: {
    eyebrow: "FÄLLIGKEITS-ERINNERUNG",
    summary_one: "{{count}} Rechnung in den nächsten {{days}} Tagen geplant",
    summary_other: "{{count}} Rechnungen in den nächsten {{days}} Tagen geplant",
    total: "{{amount}} geplant gesamt",
    next: "Als Nächstes: {{name}} · {{amount}} · {{when}}",
    today: "heute",
    tomorrow: "morgen",
    inDays_one: "in {{count}} Tag",
    inDays_other: "in {{count}} Tagen",
  },
  pace: {
    eyebrow: "AUSGABENTEMPO",
    overTitle: "{{category}} liegt {{overBy}} über dem Limit von {{limit}}",
    overDetail: "Alles Weitere in dieser Kategorie geht diesen Monat vom Plan ab.",
    aheadTitle: "{{category}} ist zu {{percent}} % ausgegeben, und wir haben erst den {{dayOrdinal}}",
    aheadDetail:
      "In diesem Tempo endet der Monat bei {{projected}} gegenüber einem Limit von {{limit}} - {{expected}} wären bis heute im Plan.",
    more_one: "+{{count}} weitere Kategorie aus dem Tempo: {{list}}",
    more_other: "+{{count}} weitere Kategorien aus dem Tempo: {{list}}",
    listSeparator: ", ",
  },
};

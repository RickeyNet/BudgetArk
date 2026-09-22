/**
 * BudgetArk - Deutsche Texte: Bruecke-Tab (planner)
 * File: src/i18n/locales/de/bridgePlanner.ts
 *
 * German counterpart of en/bridgePlanner.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { bridgePlanner as en } from "../en/bridgePlanner";

export const bridgePlanner: Localized<typeof en> = {
  summary: {
    saved: "GESPART",
    stillToGo: "NOCH OFFEN",
    total: "GESAMT",
    plans_one: "{{count}} Plan",
    plans_other: "{{count}} Pläne",
    funded: " · {{count}} finanziert",
    allFundedNow: " · alle finanziert",
    allFundedBy: " · alle finanziert bis {{date}}",
    notFundedInHorizon: " · in diesem Tempo nicht alle innerhalb von 20 Jahren finanziert",
    setAmountToSee: " · lege unten einen Monatsbetrag fest, um zu sehen, wann",
    late_one: "{{count}} Plan würde in diesem Tempo seinen Wunschtermin verpassen.",
    late_other: "{{count}} Pläne würden in diesem Tempo ihren Wunschtermin verpassen.",
  },
  order: {
    label: "REIHENFOLGE",
    methods: {
      snowball: "Kleinste zuerst",
      soonest: "Dringendste zuerst",
      custom: "Meine Reihenfolge",
    },
    hints: {
      snowball: "Die günstigsten Pläne zuerst abschließen - schnelle Erfolge, der Schneeball.",
      soonest: "Pläne mit dem nächsten Wunschtermin kommen zuerst; undatierte danach.",
      custom: "Ordne sie selbst mit den Pfeilen an jedem Plan.",
    },
  },
  setAside: {
    label: "Zurücklegen für alle Pläne",
    perMonth: "{{amount}}/Mon.",
    chartNow: "Jetzt",
  },
  fit: {
    trackFirst: "Erfasse einen vollen Monat Einnahmen und Ausgaben, dann siehst du hier, ob der Betrag passt.",
    fits: "Passt: etwa {{amount}}/Mon. bleiben nach deinen durchschnittlichen Ausgaben frei.",
    tight: "Knapp: das nimmt den Großteil der ~{{amount}}/Mon., die nach deinen durchschnittlichen Ausgaben frei bleiben.",
    over: "Zu viel: mehr als die ~{{amount}}/Mon., die nach deinen durchschnittlichen Ausgaben frei bleiben.",
    overNoFreeCash: "Zu viel: deine durchschnittlichen Ausgaben übersteigen bereits dein Einkommen, also kommt jede Rücklage von woanders.",
  },
  allocation: {
    modes: {
      rollover: "Nacheinander",
      parallel: "Gleich aufteilen",
    },
    hints: {
      rollover: "Der ganze Betrag geht an den ersten Plan; ist er finanziert, fließt das Geld in den nächsten - wie ein Schulden-Schneeball.",
      parallel: "Der Betrag wird gleichmäßig auf alle unfinanzierten Pläne verteilt; der Anteil eines fertigen Plans geht an die übrigen.",
    },
  },
  row: {
    a11yAddFunds: "Geld zu {{name}} hinzufügen",
    fundedMeta: "Finanziert - bereit zum Kauf 🎉",
    progressMeta: "{{current}} von {{target}}",
    requiredSuffix: " · {{amount}}/Mon. bis {{date}}",
    ready: "Bereit {{date}}",
    monthlyNow: " · jetzt {{amount}}/Mon.",
    waitsTurn: " · wartet, bis es dran ist",
    misses: " · verpasst {{date}}",
    lateFor_one: " · {{count}} Mon. zu spät für {{date}}",
    lateFor_other: " · {{count}} Mon. zu spät für {{date}}",
    itsDate: "seinen Termin",
    notFundedInHorizon: "In diesem Tempo nicht innerhalb von 20 Jahren finanziert",
    moveUp: "{{name}} nach oben",
    moveDown: "{{name}} nach unten",
  },
  nudges: {
    makesItHappen: "macht es möglich",
    sooner_one: "{{count}} Mon. früher",
    sooner_other: "{{count}} Mon. früher",
    extraMonthlyA11y: "{{amount}} pro Monat zu allen Plänen hinzufügen",
    extraMonthly: "+{{amount}}/Mon. · {{sooner}}",
    lumpSumA11y: "{{amount}} jetzt zu {{name}} hinzufügen",
    finishIt: "Abschließen: {{amount}} jetzt",
    lumpSumNow: "+{{amount}} jetzt · {{sooner}}",
  },
  contribute: {
    savedOf: "{{current}} von {{target}} gespart.",
    amountPlaceholder: "Betrag hinzufügen",
    negativeHint: "Mit einem negativen Betrag korrigierst du einen Fehler.",
    costPerUseLabel: "KOSTEN PRO NUTZUNG (OPTIONAL)",
    usesPlaceholder: "Nutzungen pro Monat",
    yearsPlaceholder: "Jahre, die du es behältst",
    costPerUseHint: "Wie oft und wie lange du es nutzt, macht aus dem Preis Kosten pro Nutzung.",
    deleteLink: "Diesen Plan löschen",
  },
  errors: {
    reorder: "Die neue Reihenfolge konnte nicht gespeichert werden.",
    save: "Dieser Plan konnte nicht gespeichert werden.",
    delete: "Dieser Plan konnte nicht gelöscht werden.",
  },
  deleteDialog: {
    title: "Plan löschen?",
    message: "„{{name}}“ und der bisher gesparte Betrag von {{amount}} werden entfernt. Das Geld selbst bleibt, wo du es aufbewahrst.",
    keep: "Behalten",
  },
};

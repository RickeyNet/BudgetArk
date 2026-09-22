/**
 * BudgetArk - Deutsche Texte: Schulden-Tab (screen)
 * File: src/i18n/locales/de/debtsScreen.ts
 *
 * German counterpart of en/debtsScreen.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { debtsScreen as en } from "../en/debtsScreen";

export const debtsScreen: Localized<typeof en> = {
  header: {
    title: "Schulden-Tracker",
    subtitle: "Verfolge deinen Fortschritt. Tilge deine Schulden.",
    searchA11y: "Schulden, Zahlungen und Buchungen durchsuchen",
  },
  summary: {
    totalRemaining: "GESAMT OFFEN",
    paidOff: "{{amount}} getilgt",
    ringA11y: "{{percent}} Prozent getilgt. Tippen für die Zahlungshistorie.",
    viewHistory: "🕐 Historie",
  },
  owner: {
    all: "Alle",
    mine: "Meine",
    partner: "Partner",
    joint: "Gemeinsam",
  },
  milestoneBar: {
    step: "Schritt {{step}}/{{total}} • {{title}}",
    runway: " • {{months}} Mon. Reserve",
    goal: " • {{name}} {{percent}} %",
    tapToPlan: "{{strategy}} • Tippen zum Planen",
    ark: "Baue deine Arche →",
  },
  strategy: {
    labels: {
      avalanche: "Lawine",
      snowball: "Schneeball",
      custom: "Eigene Reihenfolge",
    },
    order: {
      avalanche: "Lawinen-Reihenfolge",
      snowball: "Schneeball-Reihenfolge",
      custom: "Eigene Reihenfolge",
    },
  },
  sections: {
    debts: "Schulden",
  },
  empty: {
    title: "Baue deine Arche",
    sub: "Füge Schulden hinzu, wenn du bereit bist, oder lege zuerst deine Meilensteinziele fest.",
    setUp: "Meilensteine einrichten",
  },
  payoff: {
    notSolvable: "Nicht lösbar",
    zeroMonths: "0 Monate",
    months: "{{count}} Mon.",
    years: "{{count}} J.",
    yearsMonths: "{{years}} J. {{months}} Mon.",
    interest: "{{amount}} Zinsen",
    interestDash: "— Zinsen",
    makesPossible: "Macht die Tilgung möglich",
    stillNotEnough: "Reicht noch nicht zur Tilgung",
    savings: "Spare {{amount}} • {{months}} Mon. schneller",
    rec: {
      increase: "Erhöhe die Zahlungen, bis beide Pläne lösbar sind.",
      avalanche: "Wenigste Zinsen: Lawine.",
      snowball: "Wenigste Zinsen: Schneeball.",
      tie: "Unentschieden - beide Methoden kosten gleich viel Zinsen.",
    },
  },
  milestones: {
    title: "Meilensteine: Baue deine Arche",
    message: "Kiel, Rumpf, Deck, Vorräte, Segel. Geh jede Etappe in deinem Tempo.",
    complete: "Fertig",
    completed: "Abgeschlossen",
    rebuild: "Neu aufbauen",
    current: "Aktuell",
    targetPlaceholder: "Ziel",
    saveTarget: "Ziel speichern",
    compareTitle: "Tilgungsstrategien vergleichen",
    extraLabel: "ZUSÄTZLICHE MONATSZAHLUNG",
    avalancheHint: "Höchster Zinssatz zuerst",
    snowballHint: "Kleinster Saldo zuerst",
    currentColumn: "Aktuell",
    perMonth: "+{{amount}}/Mon.",
    currentMethod: "Aktuelle Methode",
    useAvalanche: "Lawine nutzen",
    useSnowball: "Schneeball nutzen",
    trackedLinked_one:
      "🛡️ Übernommen aus deinem Notgroschen-Sparkonto ({{amount}}). Aktualisiere den Kontostand auf der Brücke - mit Bank-Sync bleibt er automatisch aktuell.",
    trackedLinked_other:
      "🛡️ Übernommen aus deinen {{count}} Notgroschen-Sparkonten ({{amount}}). Aktualisiere die Kontostände auf der Brücke - mit Bank-Sync bleiben sie automatisch aktuell.",
    setSavings: "Ersparnisse festlegen",
    currentAmount: "Aktuell: {{amount}}",
    set: "Setzen",
    collapse: "Einklappen",
    markInProgress: "Als offen markieren",
    markComplete: "Als erledigt markieren",
    arkComplete: "Arche fertig",
    arkCompleteMessage: "Deine Arche ist fertig. Setz die Segel und entdecke neue Ufer.",
    congrats: {
      keel: "Guter Start. Dein Fundament steht.",
      hull: "Stark. Alle Schulden außer der Hypothek sind getilgt.",
      deck: "Hervorragende Disziplin. Dein Notgroschen ist voll.",
      supplies: "Schön konsequent. Deine Altersvorsorge ist auf Kurs.",
      gather_animals: "Gut gemacht. Die Zukunft deiner Kinder wird aufgebaut.",
      moorings: "Unglaublich. Dein Zuhause ist abbezahlt.",
      sail: "Geschafft. Deine Arche ist komplett. Baue Vermögen auf und gib großzügig.",
      default: "Glückwunsch! Ein weiterer Meilenstein geschafft. Weiter so.",
    },
    action: {
      supplies: "Investieren",
      gather_animals: "Sammeln",
      moorings: "Sichern",
      sail: "Ablegen",
      default: "Bauen",
    },
  },
  savingsEntry: {
    logged: "Aus „Baue deine Arche“ erfasst",
    correction: "Korrektur aus „Baue deine Arche“",
  },
  alerts: {
    couldntSave: "Konnte nicht speichern",
    keepAliveUse: "Das Datum der letzten Nutzung wurde nicht aktualisiert. Bitte versuch es erneut.",
    keepAliveMute: "Die Erinnerung wurde nicht stummgeschaltet. Bitte versuch es erneut.",
  },
  undo: {
    edited: "„{{name}}“ bearbeitet",
    deleted: "„{{name}}“ gelöscht",
  },
  deleteDialog: {
    title: "Schuld löschen",
    message: "{{name}} löschen? Das kann nicht rückgängig gemacht werden.",
  },
};

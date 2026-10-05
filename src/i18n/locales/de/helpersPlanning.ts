/**
 * BudgetArk - Deutsche Texte: reine Helfer (planning)
 * File: src/i18n/locales/de/helpersPlanning.ts
 *
 * German counterpart of en/helpersPlanning.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. Milestone names match the
 * Debts tab intro (Kiel, Rumpf, Deck, Vorräte, Tiere sammeln, Anker, Segel).
 */

import type { Localized } from "../types";
import type { helpersPlanning as en } from "../en/helpersPlanning";

export const helpersPlanning: Localized<typeof en> = {
  milestones: {
    steps: {
      keel: {
        title: "Kiel",
        description: "Spar einen ersten Notgroschen an, damit dein Plan ein stabiles Fundament hat.",
        nextAction: "Leg zuerst dein erstes Polster zurück, bevor du woanders Gas gibst.",
      },
      hull: {
        title: "Rumpf",
        description: "Tilge alle Schulden außer der Hypothek mit dem Schneeball.",
        nextAction:
          "Steck deine nächste Extrazahlung in die erste Schuld deiner gewählten Tilgungsreihenfolge.",
      },
      deck: {
        title: "Deck",
        description:
          "Spar 3 bis 6 Monatsausgaben an, damit dein Notgroschen voll ist.",
        nextAction: "Bau deine Reserven auf 3-6 Monate Grundkosten aus, für echte Stabilität.",
      },
      supplies: {
        title: "Vorräte",
        description: "Investiere 15 % des Haushaltseinkommens für die Altersvorsorge.",
        nextAction: "Erhöh deine Altersvorsorge-Beiträge Richtung 15 % des Haushaltseinkommens.",
      },
      gather_animals: {
        title: "Tiere sammeln",
        description: "Spar für die Ausbildung deiner Kinder.",
        nextAction: "Eröffne einen Bildungs-Sparplan für deine Kinder oder zahl weiter ein.",
      },
      moorings: {
        title: "Anker",
        description: "Zahl dein Zuhause mit Sondertilgungen früher ab.",
        nextAction: "Leiste Sondertilgungen auf deine Hypothek, wann immer es geht.",
      },
      sail: {
        title: "Segel",
        description: "Baue Vermögen auf und gib großzügig.",
        nextAction: "Lebe großzügig, investiere über die Altersvorsorge hinaus und baue bleibendes Vermögen auf.",
      },
    },
    metric: {
      ratio: "{{current}} / {{target}}",
      ratioMonthly: "{{current}} / {{target}} /Mon.",
      remaining: "{{amount}} offen",
      addEducationGoal: "Leg ein Bildungs-Sparziel an, um es zu verfolgen",
      noMortgage: "Keine Hypothek erfasst",
      targetMonthly: "Ziel: {{amount}} /Mon.",
      completed: "Erledigt",
      notStarted: "Nicht begonnen",
    },
  },
  ark: {
    noPlan:
      "Ein Ansparposten legt jeden Monat Geld zurück, damit du die Anschaffung bar bezahlst - sie muss nie zur Schuld werden.",
    stepComplete:
      "Deine Etappe {{step}} ist erledigt - Geld für diese Anschaffung zurückzulegen bringt die Arche nicht vom Kurs ab. Halte den Monatsbetrag innerhalb deines freien Cashflows und zahl bar.",
    steps: {
      keel: "Du baust gerade deinen Kiel - den ersten Notgroschen. Füll den zuerst: Ohne Polster macht eine einzige Überraschung aus dieser Anschaffung neue Schulden. Halte den Sparbetrag klein oder parke den Plan, bis der Kiel steht.",
      hull: "Du bist auf der Etappe Rumpf - Schulden tilgen. Ein Ansparposten schlägt jede Finanzierung, aber jeder Euro hier fehlt beim Abbau eines Saldos. Schau dir unten den Schulden-Vergleich an und bevorzuge Bedürfnisse vor Wünschen.",
      deck: "Du baust gerade das Deck - deinen vollen Notgroschen für 3-6 Monate. Parallel für eine Anschaffung zu sparen ist okay; lass den Notgroschen nur das größere Stück, bis er voll ist.",
      supplies:
        "Die Überlebens-Etappen deiner Arche liegen hinter dir - ein Ansparposten ist genau das richtige Werkzeug. Deine 15 % Altersvorsorge kommen zuerst, dann leg vom Rest zurück und zahl bar.",
      gather_animals:
        "Deine Arche ist gut unterwegs - leg das Geld monatlich zurück und zahl bar, damit diese Anschaffung nie zur Schuld wird. Halte parallel dein Bildungssparen auf Kurs.",
      moorings:
        "Deine Arche ist fast fertig - ein Ansparposten hält diese Anschaffung von deinem Hypotheken-Schwung fern. Leg monatlich zurück und zahl bar.",
      sail: "Du segelst - mit bewusst zurückgelegtem Geld zu kaufen ist genau das, was daraus eine Vermögensgewohnheit statt eines Rückschlags macht.",
    },
  },
  hoursOfWork: {
    underAnHour: "weniger als eine Stunde Arbeit",
    hours_one: "{{count}} Stunde Arbeit",
    hours_other: "{{count}} Stunden Arbeit",
    withWeeks_one: "{{base}} - etwa {{count}} Woche",
    withWeeks_other: "{{base}} - etwa {{count}} Wochen",
  },
  debtOpportunity: {
    lead: "{{amount}}/Mon. stattdessen auf {{debt}}",
    neverClears: "{{lead}} würde aus einer Schuld, die ihre Mindestrate nie tilgt, eine machen, die es schafft.",
    sameMonthInterest:
      "{{lead}} würde {{interest}} Zinsen sparen, auch wenn sie im selben Monat getilgt wäre.",
    barelyMoves: "{{lead}} würde kaum etwas bewegen - dieser Plan kostet dich dort fast nichts.",
    soonerWithInterest: "{{lead}} würde sie {{months}} tilgen und {{interest}} Zinsen sparen.",
    sooner: "{{lead}} würde sie {{months}} tilgen.",
    monthsSooner_one: "{{count}} Monat früher",
    monthsSooner_other: "{{count}} Monate früher",
  },
  costPerUse: {
    cents: "{{cents}} Cent",
    sentence_one: "etwa {{cost}} pro Nutzung ({{uses}}× im Monat, {{count}} Jahr lang)",
    sentence_other: "etwa {{cost}} pro Nutzung ({{uses}}× im Monat, {{count}} Jahre lang)",
  },
  unsolvable: {
    capped:
      "Die Mindestraten übersteigen die Zinsen kaum - das Tilgen würde über {{years}} Jahre dauern. Füg eine Extrazahlung hinzu, damit es lösbar wird.",
    noMinimum:
      "Für {{name}} ist keine Mindestrate erfasst, deshalb schrumpft die Schuld nie. Leg die Mindestrate fest oder füg eine Extrazahlung hinzu.",
    underwater:
      "Die Mindestrate von {{minimum}} für {{name}} deckt die ~{{interest}}/Mon. Zinsen nicht, deshalb schrumpft die Schuld nie. Erhöh die Mindestrate oder füg eine Extrazahlung hinzu.",
    several:
      "{{names}}: Die Mindestraten decken die monatlichen Zinsen nicht, deshalb schrumpfen diese Schulden nie. Erhöh die Mindestraten oder füg eine Extrazahlung hinzu.",
  },
  apy: {
    line: "{{apy}} Zinsen p. a. · ~{{amount}}/Jahr",
    gap: "Ein typisches Tagesgeldkonto mit {{apy}} würde etwa {{amount}}/Jahr mehr bringen",
  },
  daysSince: {
    none: "noch nichts erfasst",
    today: "heute erfasst",
    yesterday: "letzte Buchung gestern",
    daysAgo: "letzte Buchung vor {{days}} Tagen",
  },
  nextQuote: {
    hours: "Nächstes Update in {{hours}} Std.",
    days: "Nächstes Update in {{days}} T.",
  },
  rates: {
    static: "Eingebaute Näherungskurse - der Kursdienst war nicht erreichbar",
    justNow: "Kurse gerade aktualisiert",
    minutesAgo_one: "Kurse vor {{count}} Minute aktualisiert",
    minutesAgo_other: "Kurse vor {{count}} Minuten aktualisiert",
    hoursAgo_one: "Kurse vor {{count}} Stunde aktualisiert",
    hoursAgo_other: "Kurse vor {{count}} Stunden aktualisiert",
    daysAgo_one: "Kurse vor {{count}} Tag aktualisiert",
    daysAgo_other: "Kurse vor {{count}} Tagen aktualisiert",
  },
  annualReport: {
    title: "⚓ Mein BudgetArk-Bericht {{year}}",
    debtPaid: "💳 Schulden getilgt: {{amount}}",
    setAside: "🐖 Zurückgelegt: {{amount}}",
    netWorth: "📈 Nettovermögen: {{amount}}",
    savingsRate: "💰 Sparquote: {{rate}} %",
    monthsUnderBudget: "🎯 Monate unter Budget: {{under}}/{{total}}",
    topCategory: "🏷️ Top-Kategorie: {{category}}",
    footer: "Offline erfasst mit BudgetArk.",
  },
};

/**
 * BudgetArk - Svenska texter: Skulder-fliken (screen)
 * File: src/i18n/locales/sv/debtsScreen.ts
 *
 * Swedish counterpart of en/debtsScreen.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. Milestone ids (keel, hull,
 * deck, supplies, gather_animals, moorings, sail) and strategy ids stay
 * English - only their labels live here.
 */

import type { Localized } from "../types";
import type { debtsScreen as en } from "../en/debtsScreen";

export const debtsScreen: Localized<typeof en> = {
  header: {
    title: "Skuldkoll",
    subtitle: "Följ dina framsteg. Krossa dina skulder.",
    searchA11y: "Sök bland skulder, betalningar och budgetposter",
  },
  summary: {
    totalRemaining: "TOTALT KVAR",
    paidOff: "{{amount}} avbetalat",
    ringA11y: "{{percent}} procent avbetalat. Tryck för att se betalningshistoriken.",
    viewHistory: "🕐 Visa historik",
  },
  owner: {
    all: "Alla",
    mine: "Mina",
    partner: "Partnerns",
    joint: "Gemensamma",
  },
  milestoneBar: {
    step: "Steg {{step}}/{{total}} • {{title}}",
    runway: " • {{months}} mån reserv",
    goal: " • {{name}} {{percent}} %",
    tapToPlan: "{{strategy}} • Tryck för att planera",
    ark: "Bygg din ark →",
  },
  strategy: {
    labels: {
      avalanche: "Lavin",
      snowball: "Snöboll",
      custom: "Egen ordning",
    },
    order: {
      avalanche: "Lavinordning",
      snowball: "Snöbollsordning",
      custom: "Egen ordning",
    },
  },
  sections: {
    debts: "Skulder",
  },
  empty: {
    title: "Bygg din ark",
    sub: "Lägg till skulder när du är redo, eller sätt dina milstolpemål först.",
    setUp: "Ställ in milstolpar",
  },
  payoff: {
    notSolvable: "Går inte ihop",
    zeroMonths: "0 månader",
    months: "{{count}} mån",
    years: "{{count}} år",
    yearsMonths: "{{years}} år {{months}} mån",
    interest: "{{amount}} ränta",
    interestDash: "— ränta",
    makesPossible: "Gör avbetalningen möjlig",
    stillNotEnough: "Räcker ännu inte för att betala av",
    savings: "Spara {{amount}} • {{months}} mån snabbare",
    rec: {
      increase: "Öka betalningarna tills båda planerna går att lösa.",
      avalanche: "Lägst ränta: Lavin.",
      snowball: "Lägst ränta: Snöboll.",
      tie: "Oavgjort - båda metoderna kostar lika mycket i ränta.",
    },
  },
  milestones: {
    title: "Milstolpar: Bygg din ark",
    message: "Köl, skrov, däck, förråd, segel. Ta varje etapp i din egen takt.",
    complete: "Slutför",
    completed: "Klar",
    rebuild: "Bygg om",
    current: "Nuvarande",
    targetPlaceholder: "Mål",
    saveTarget: "Spara mål",
    compareTitle: "Jämför återbetalningsstrategier",
    extraLabel: "EXTRA MÅNADSBETALNING",
    avalancheHint: "Högst ränta först",
    snowballHint: "Minsta saldo först",
    currentColumn: "Nuvarande",
    perMonth: "+{{amount}}/mån",
    currentMethod: "Nuvarande metod",
    useAvalanche: "Använd lavin",
    useSnowball: "Använd snöboll",
    trackedLinked_one:
      "🛡️ Hämtas från ditt utsedda buffertsparkonto ({{amount}}). Uppdatera saldot på Bryggan - banksynk håller det aktuellt automatiskt.",
    trackedLinked_other:
      "🛡️ Hämtas från dina {{count}} utsedda buffertsparkonton ({{amount}}). Uppdatera saldona på Bryggan - banksynk håller dem aktuella automatiskt.",
    setSavings: "Ange sparande",
    currentAmount: "Nu: {{amount}}",
    set: "Ange",
    collapse: "Fäll ihop",
    markInProgress: "Markera som pågående",
    markComplete: "Markera som klar",
    arkComplete: "Arken är klar",
    arkCompleteMessage: "Du har byggt färdigt din ark. Hissa segel och upptäck nya länder.",
    congrats: {
      keel: "Bra start. Din grund är lagd.",
      hull: "Starkt jobbat. Alla skulder utom bolånet är borta.",
      deck: "Utmärkt disciplin. Din buffert är fullt finansierad.",
      supplies: "Fin kontinuitet. Ditt pensionssparande är på rätt kurs.",
      gather_animals: "Bra gjort. Dina barns framtid tar form.",
      moorings: "Otroligt. Ditt hem är avbetalat.",
      sail: "Du klarade det. Din ark är klar. Bygg förmögenhet och ge generöst.",
      default: "Grattis! Ännu en milstolpe avklarad. Fortsätt så.",
    },
    action: {
      supplies: "Investera",
      gather_animals: "Samla",
      moorings: "Säkra",
      sail: "Sjösätt",
      default: "Bygg",
    },
  },
  savingsEntry: {
    logged: "Loggat från Bygg din ark",
    correction: "Korrigering från Bygg din ark",
  },
  alerts: {
    couldntSave: "Kunde inte spara",
    keepAliveUse: "Kortets senaste användningsdatum uppdaterades inte. Försök igen.",
    keepAliveMute: "Påminnelsen tystades inte. Försök igen.",
  },
  undo: {
    edited: "Redigerade ”{{name}}”",
    deleted: "Tog bort ”{{name}}”",
  },
  deleteDialog: {
    title: "Ta bort skuld",
    message: "Ta bort {{name}}? Det går inte att ångra.",
  },
};

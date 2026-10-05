/**
 * BudgetArk - Norske tekster: Gjeld-fanen (screen)
 * File: src/i18n/locales/nb/debtsScreen.ts
 *
 * Norwegian (Bokmål) counterpart of en/debtsScreen.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. Milestone ids (keel, hull,
 * deck, supplies, gather_animals, moorings, sail) and strategy ids stay
 * English - only their labels live here.
 */

import type { Localized } from "../types";
import type { debtsScreen as en } from "../en/debtsScreen";

export const debtsScreen: Localized<typeof en> = {
  header: {
    title: "Gjeldsoversikt",
    subtitle: "Følg fremgangen din. Knus gjelden.",
    searchA11y: "Søk i gjeldsposter, betalinger og budsjettposter",
  },
  summary: {
    totalRemaining: "TOTALT IGJEN",
    paidOff: "{{amount}} nedbetalt",
    ringA11y: "{{percent}} prosent nedbetalt. Trykk for å se betalingshistorikken.",
    viewHistory: "🕐 Vis historikk",
  },
  owner: {
    all: "Alle",
    mine: "Mine",
    partner: "Partnerens",
    joint: "Felles",
  },
  milestoneBar: {
    step: "Trinn {{step}}/{{total}} • {{title}}",
    runway: " • {{months}} mnd reserve",
    goal: " • {{name}} {{percent}} %",
    tapToPlan: "{{strategy}} • Trykk for å planlegge",
    ark: "Bygg arken din →",
  },
  strategy: {
    labels: {
      avalanche: "Snøskred",
      snowball: "Snøball",
      custom: "Egen rekkefølge",
    },
    order: {
      avalanche: "Snøskredrekkefølge",
      snowball: "Snøballrekkefølge",
      custom: "Egen rekkefølge",
    },
  },
  sections: {
    debts: "Gjeldsposter",
  },
  empty: {
    title: "Bygg arken din",
    sub: "Legg til gjeldsposter når du er klar, eller sett milepælmålene dine først.",
    setUp: "Sett opp milepæler",
  },
  payoff: {
    notSolvable: "Går ikke opp",
    zeroMonths: "0 måneder",
    months: "{{count}} mnd",
    years: "{{count}} år",
    yearsMonths: "{{years}} år {{months}} mnd",
    interest: "{{amount}} rente",
    interestDash: "— rente",
    makesPossible: "Gjør nedbetaling mulig",
    stillNotEnough: "Fortsatt ikke nok til å betale ned",
    savings: "Spar {{amount}} • {{months}} mnd raskere",
    rec: {
      increase: "Øk betalingene til begge planene går opp.",
      avalanche: "Lavest rente: Snøskred.",
      snowball: "Lavest rente: Snøball.",
      tie: "Uavgjort - begge metodene koster like mye i rente.",
    },
  },
  milestones: {
    title: "Milepæler: Bygg arken din",
    message: "Kjøl, skrog, dekk, forsyninger, seil. Ta hvert trinn i ditt eget tempo.",
    complete: "Fullfør",
    completed: "Fullført",
    rebuild: "Bygg om",
    current: "Nåværende",
    targetPlaceholder: "Mål",
    saveTarget: "Lagre mål",
    compareTitle: "Sammenlign nedbetalingsstrategier",
    extraLabel: "EKSTRA MÅNEDLIG BETALING",
    avalancheHint: "Høyest rente først",
    snowballHint: "Minste saldo først",
    currentColumn: "Nåværende",
    perMonth: "+{{amount}}/mnd",
    currentMethod: "Nåværende metode",
    useAvalanche: "Bruk snøskred",
    useSnowball: "Bruk snøball",
    trackedLinked_one:
      "🛡️ Hentes fra den utpekte buffersparekontoen din ({{amount}}). Oppdater saldoen på Broen - banksynk holder den oppdatert automatisk.",
    trackedLinked_other:
      "🛡️ Hentes fra de {{count}} utpekte buffersparekontoene dine ({{amount}}). Oppdater saldoene på Broen - banksynk holder dem oppdatert automatisk.",
    setSavings: "Angi sparing",
    currentAmount: "Nå: {{amount}}",
    set: "Angi",
    collapse: "Fold sammen",
    markInProgress: "Merk som pågående",
    markComplete: "Merk som fullført",
    arkComplete: "Arken er ferdig",
    arkCompleteMessage: "Du har bygd ferdig arken din. Sett seil og finn nye land.",
    congrats: {
      keel: "God start. Grunnlaget ditt er lagt.",
      hull: "Sterkt jobbet. All gjeld utenom boliglånet er borte.",
      deck: "Utmerket disiplin. Bufferen din er fullt finansiert.",
      supplies: "Fin kontinuitet. Pensjonssparingen din er på rett kurs.",
      gather_animals: "Godt gjort. Fremtiden til barna dine tar form.",
      moorings: "Utrolig. Boligen din er nedbetalt.",
      sail: "Du klarte det. Arken din er ferdig. Bygg formue og gi raust.",
      default: "Gratulerer! Enda en milepæl fullført. Fortsett.",
    },
    action: {
      supplies: "Invester",
      gather_animals: "Samle",
      moorings: "Sikre",
      sail: "Sjøsett",
      default: "Bygg",
    },
  },
  savingsEntry: {
    logged: "Logget fra Bygg arken din",
    correction: "Korrigering fra Bygg arken din",
  },
  alerts: {
    couldntSave: "Kunne ikke lagre",
    keepAliveUse: "Kortets sist-brukt-dato ble ikke oppdatert. Prøv igjen.",
    keepAliveMute: "Påminnelsen ble ikke dempet. Prøv igjen.",
  },
  undo: {
    edited: "Redigerte «{{name}}»",
    deleted: "Slettet «{{name}}»",
  },
  deleteDialog: {
    title: "Slett gjeldspost",
    message: "Slette {{name}}? Dette kan ikke angres.",
  },
};

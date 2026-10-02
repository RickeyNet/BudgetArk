/**
 * BudgetArk - Norske tekster: Sjøkart-fanen (insights)
 * File: src/i18n/locales/nb/chartsInsights.ts
 *
 * Norwegian (Bokmål) counterpart of en/chartsInsights.ts. Informal "du"
 * throughout; see src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { chartsInsights as en } from "../en/chartsInsights";

export const chartsInsights: Localized<typeof en> = {
  whatIf: {
    title: "Hva om jeg sluttet å bruke penger på…",
    hint: "Flytt en kategori over til gjeld eller sparing",
    empty:
      "Logg noen måneder med utgifter i Budsjett-fanen, og kom tilbake for å se hva det kan gjøre å flytte en kategori.",
    pickCategory: "Velg en kategori",
    averagesHint: "Månedlige gjennomsnitt fra postene dine de siste {{months}} månedene",
    perMonth: "{{amount}}/mnd",
    sliderLabel: "Månedlig beløp å flytte",
    youAverage: "Du bruker i snitt {{amount}}/mnd på {{category}}",
    towardDebt: "Bruk det på gjelden",
    methods: {
      avalanche: "Snøskred",
      snowball: "Snøball",
    },
    currentPlan: "Nåværende plan",
    redirecting: "Med omfordeling",
    months: {
      notSolvable: "Går ikke opp",
      zero: "0 måneder",
      mo: "{{count}} mnd",
      yr: "{{count}} år",
      yrMo: "{{years}} år {{months}} mnd",
    },
    unpayableFixed: "Denne ekstrabetalingen gjør en plan som ikke går opp, til en reell nedbetalingsdato.",
    stillUnpayable: "Minstebetalingene pluss dette ekstra dekker fortsatt ikke renten - prøv et større beløp.",
    sooner: "Gjeldfri {{duration}} tidligere",
    savesInterest: " · sparer {{amount}} i rente",
    growSavingsOr: "…eller la det vokse i sparing",
    growSavings: "La det vokse i sparing",
    noDebts: "Ingen aktiv gjeld å betale ned - viser bare sparevekst.",
    inYears_one: "Om {{count}} år",
    inYears_other: "Om {{count}} år",
    fromReturns: "+{{amount}} fra avkastning",
    assumesReturn: "Forutsetter {{rate}} % gjennomsnittlig årlig avkastning, med månedlig rentes rente.",
    note: "Dette er anslag, ikke garantier - forbruk går sjelden ned til null, og markedsavkastningen varierer. Selv å flytte halve kategorien kan flytte tidslinjen din merkbart.",
  },
  subscriptions: {
    title: "Abonnementsdetektiven",
    hintCount: "{{count}} uten registrert regning · ~{{amount}}/år",
    hintIdle: "Finn gjentatte trekk uten registrert regning",
    noBankHistory:
      "Abonnementer finnes blant bankimporterte utgifter. Koble til en bank under Profil → Tilkoblinger og godkjenn noen måneder med trekk, og kom så tilbake.",
    nothingHiding:
      "Ingenting gjemmer seg akkurat nå: hvert gjentatte trekk har allerede en gjentakende regning, eller du har merket det som ikke et abonnement.",
    resultLabel: "UTEN REGISTRERT REGNING",
    perYear: "{{amount}}/år",
    summary_one:
      "omtrent {{monthly}} i måneden på {{count}} abonnement. Gjør det til en regning, så legger budsjettet det inn per {{cadence}} - eller skjul de som ikke er abonnementer.",
    summary_other:
      "omtrent {{monthly}} i måneden på {{count}} abonnementer. Gjør hvert av dem til en regning, så legger budsjettet dem inn per {{cadence}} - eller skjul de som ikke er abonnementer.",
    cadenceWord: {
      month: "måned",
      year: "år",
      mixed: "måned eller år",
    },
    cadence: {
      monthly: "månedlig",
      yearly: "årlig",
    },
    rowMeta: "{{amount}} {{cadence}} · {{charges}} · {{category}}",
    charges_one: "{{count}} trekk",
    charges_other: "{{count}} trekk",
    makeBill: "Gjør til regning",
    saving: "Lagrer...",
    notSubscription: "Ikke et abonnement",
    a11yMakeBill: "Gjør {{merchant}} til en gjentakende regning",
    a11yNotSubscription: "{{merchant}} er ikke et abonnement",
    errors: {
      createBill: "Kunne ikke opprette den gjentakende regningen.",
      hideMerchant: "Kunne ikke skjule den forhandleren.",
    },
  },
  exchange: {
    title: "Valutaveksling",
    hint: "Regn om et beløp mellom valutaer",
    resultLabel: "OMREGNET VERDI",
    amount: "Beløp",
    amountPlaceholder: "Beløp å regne om",
    from: "Fra",
    to: "Til",
    swap: "⇅ Bytt",
    refresh: "↻ Oppdater kurser",
    refreshing: "Oppdaterer…",
    loadFailed: "Kunne ikke laste inn kurser - trykk på Oppdater for å prøve igjen.",
    refreshFailed: "Kunne ikke oppdatere kursene - viser de sist lagrede kursene.",
    privacyNote:
      "Kursene kommer fra en gratis, offentlig valutakurstjeneste og oppdateres vanligvis én gang om dagen. Bare forespørselen om dagens kurstabell forlater telefonen din - aldri beløpene dine.",
  },
  inflation: {
    title: "Personlig inflasjon",
    hintRates: "Dine priser {{rate}} mot {{headline}} offisielt",
    hintIdle: "Dine egne priser år for år mot offisiell KPI",
    insufficient_one:
      "Dette krever minst {{min}} loggede måneder i hvert av de siste to årene, i kategorier du brukte penger på begge årene. Så langt: {{count}} måned de siste {{window}}, {{prior}} i de {{window}} før. Fortsett å logge, så fylles det inn.",
    insufficient_other:
      "Dette krever minst {{min}} loggede måneder i hvert av de siste to årene, i kategorier du brukte penger på begge årene. Så langt: {{count}} måneder de siste {{window}}, {{prior}} i de {{window}} før. Fortsett å logge, så fylles det inn.",
    resultLabel: "DIN INFLASJONSRATE",
    above: "Ligger over den offisielle på {{headline}}",
    below: "Ligger under den offisielle på {{headline}}",
    inLine: "På linje med den offisielle på {{headline}}",
    basket_one: "{{prior}}/mnd → {{current}}/mnd i den samme {{count}} kategorien",
    basket_other: "{{prior}}/mnd → {{current}}/mnd i de samme {{count}} kategoriene",
    byCategory: "Per kategori",
    averageHint:
      "Snitt per logget måned: siste {{window}} måneder ({{current}} logget) mot de {{window}} før ({{prior}} logget)",
    rowMeta: "{{prior}} → {{current}}/mnd",
    newSpending:
      "Pluss {{amount}}/mnd i kategorier du ikke hadde i fjor - nytt forbruk, ikke inflasjon, så det holdes utenfor raten.",
    note: "Offisielt tall: {{label}}, per {{asOf}}, følger med appen - ingenting hentes. Raten din blander prisendringer med hvor mye du kjøpte, så en kategori som har skutt i været kan like gjerne være en vaneendring som en prisøkning. Gjeldsbetalinger og sparing er overføringer, ikke priser, og holdes utenfor.",
  },
};

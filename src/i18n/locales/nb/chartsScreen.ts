/**
 * BudgetArk - Norske tekster: Sjøkart-fanen (screen)
 * File: src/i18n/locales/nb/chartsScreen.ts
 *
 * Norwegian (Bokmål) counterpart of en/chartsScreen.ts. Informal "du"
 * throughout; see src/i18n/GLOSSARY.md for the fixed vocabulary. The
 * "Why 7%?" card keeps its US-market framing (S&P 500, dollars) because
 * that is what the calculator's default rate is based on.
 */

import type { Localized } from "../types";
import type { chartsScreen as en } from "../en/chartsScreen";

export const chartsScreen: Localized<typeof en> = {
  header: {
    title: "Sjøkart",
    subtitle: "Lær havet å kjenne. Legg kursen din.",
  },
  course: {
    eyebrow: "⭐ KAPTEINSKURSET",
    startHere: "START HER",
    resume: "FORTSETT",
    chapterRef: "Kap. {{number}} · {{title}}",
    readMin: " · {{count}} min",
    lessonReadMin: "{{count}} min",
    filterOnly: "Bare leksjoner om {{glyph}} {{topic}}",
    showAll: "Vis alle ✕",
    comingSoon: "Kommer snart",
  },
  topics: {
    sectionTitle: "EMNER",
    hint: "Trykk for å filtrere kurset etter emne",
    labels: {
      budgeting: "Budsjettering",
      debt: "Gjeld",
      saving: "Sparing",
      investing: "Investering",
      taxes: "Skatt",
      insurance: "Forsikring",
      real_estate: "Eiendom",
      retirement: "Pensjon",
      mindset: "Tankesett",
    },
  },
  tools: {
    sectionTitle: "VERKTØY",
    hint: "Kalkulatorer & hjelpemidler",
  },
  units: {
    percent: "{{value}} %",
    years: "{{value}} år",
    yearPreset: "{{count}} år",
  },
  compound: {
    title: "Rentes rente-kalkulator",
    hint: "Se hvordan investeringen din vokser over tid",
    projectedValue: "BEREGNET VERDI",
    subLump: "{{lump}} nå + {{monthly}}/mnd · etter {{years}} år med {{rate}} %",
    subPlain: "i dagens pengeverdi · etter {{years}} år med {{rate}} %",
    sliders: {
      lumpSum: "Engangsbeløp ved start",
      contribution: "Månedlig sparing",
      returnRate: "Årlig avkastning",
      years: "Tidshorisont",
    },
    presets: {
      savings: "Sparekonto",
      bonds: "Obligasjoner",
      sp500: "S&P 500",
      aggressive: "Offensiv",
    },
    comparison: {
      title: "Engangsbeløp vs. månedlig",
      once: "{{amount}} én gang",
      perMonth: "{{amount}}/mnd",
      both: "Begge",
      crossover:
        "Månedsplanen tar igjen engangsbeløpet i år {{year}} - men den legger også inn {{putIn}} mot {{lump}}. Å gjøre begge er den virkelige gevinsten.",
      noCrossover:
        "Over {{years}} år ligger engangsbeløpet alene foran månedsplanen. Å gjøre begge er den virkelige gevinsten.",
    },
    rule72: "Med {{rate}} % dobles pengene dine på omtrent ~{{years}} år (72-regelen)",
    whyShow: "Hvorfor 7 %?",
    whyHide: "Skjul: Hvorfor 7 %?",
    why: {
      title: "S&P 500 og inflasjon",
      p1: "S&P 500 er en indeks over de 500 største amerikanske selskapene. Den har gitt en gjennomsnittlig avkastning på ~10 % per år siden 1926.",
      p2: "Men inflasjonen (at varer blir dyrere) har historisk ligget på ~3 % per år. Det betyr at 100 dollar i dag kjøper mindre i fremtiden.",
      p3: "Når vi trekker fra inflasjonen (10 % - 3 %), blir realavkastningen omtrent 7 %. Denne kalkulatoren bruker inflasjonsjustert avkastning som standard, så den beregnede verdien viser hva pengene dine faktisk kan kjøpe i dagens pengeverdi.",
      footer: "Historisk avkastning er ingen garanti for fremtidige resultater. Faktisk avkastning varierer fra år til år.",
    },
    chart: {
      title: "Vekst over tid",
      totalValue: "Total verdi",
      contributions: "Innskudd",
      axisYear: "{{count}} år",
    },
    breakdown: {
      title: "Fordeling",
      putIn: "Du setter inn",
      contribute: "Dine innskudd",
      interest: "Opptjent rente",
      ratio: "Pengene dine ga {{percent}} % mer takket være rentes rente",
    },
  },
  refi: {
    title: "Refinansieringskalkulator",
    hint: "Se om refinansiering faktisk sparer deg penger",
    breakEven: "NULLPUNKT",
    pickOne: "Velg minst én gjeldspost nedenfor for å se sammenligningen.",
    months: "{{count}} mnd",
    recoverYears: "~{{years}} år før {{amount}} i etableringskostnader er tjent inn",
    recoverUnderYear: "{{amount}} i etableringskostnader tjent inn på under ett år",
    noBreakEven: "Den nye betalingen er ikke lavere enn den nåværende - ikke noe nullpunkt.",
    currentLoan: "NÅVÆRENDE LÅN",
    pickDebts: "Velg gjeldspostene du vil refinansiere",
    noDebts: "Legg til en gjeldspost i Gjeldsoversikten for å bruke denne kalkulatoren.",
    debtMeta: "{{balance}} · {{rate}} % rente",
    goalSet: " · mål satt",
    summaryTitle: "SAMMENDRAG NÅVÆRENDE LÅN",
    combinedBalance: "Samlet saldo",
    apr: "Effektiv rente",
    weightedApr: "Vektet rente",
    selected: "{{selected}} av {{total}} gjeldsposter valgt",
    weightedByBalance: " · vektet etter saldo",
    autoFilledHint:
      "Gjenstående år er fylt inn fra måldatoen på hver gjeldspost. Juster fritt hvis måldatoene ikke er nøyaktige.",
    setGoalHint: "Sett en måldato på hver gjeldspost i Gjeldsoversikten, så fylles gjenstående år inn automatisk.",
    newLoan: "NYTT LÅN",
    sliders: {
      refiCurrentTerm: "Gjenstående år",
      refiNewRate: "Ny rente (effektiv)",
      refiNewTerm: "Ny løpetid (år)",
      refiClosingCosts: "Etableringskostnader",
    },
    monthlyPayment: "Månedlig betaling",
    current: "Nåværende",
    new: "Ny",
    savesPerMonth: "Sparer {{amount}}/mnd",
    costsPerMonth: "Koster {{amount}}/mnd mer",
    samePayment: "Samme månedlige betaling",
    lifetimeInterest: "Samlet rente over løpetiden",
    keepCurrent: "Behold nåværende",
    refinance: "Refinansier",
    savesLifetime: "Sparer {{amount}} over lånets løpetid",
    paysMore: "Betaler {{amount}} mer i rente totalt",
    sameLifetime: "Samme samlede rente",
    netSavings: "Nettobesparelse over den nye løpetiden på {{years}} år: ",
    extendsWarning:
      "Obs: den nye løpetiden er lengre enn det som gjenstår på det nåværende lånet ditt. Den lavere månedlige betalingen kommer delvis av at saldoen spres over flere måneder - sjekk den samlede renten over for å se om byttet er verdt det.",
  },
  ef: {
    title: "Bufferkalkulator",
    hint: "Følg med på hvordan sikkerhetsnettet ditt vokser",
    expensesTitle: "Dine månedlige utgifter",
    basedOn: "Basert på budsjettet ditt: {{amount}}/mnd i snitt",
    noData: "Ingen budsjettdata enda - skriv inn de månedlige utgiftene dine nedenfor",
    placeholder: "Månedlige utgifter",
    threeMonth: "3 måneders buffer",
    sixMonth: "6 måneders buffer",
    saved: "{{amount}} spart",
    monthsToReach_one: "~{{count}} måned til målet med {{amount}}/mnd",
    monthsToReach_other: "~{{count}} måneder til målet med {{amount}}/mnd",
    threeReached: "3 måneders buffer nådd!",
    sixReached: "6 måneders buffer nådd!",
    monthlySavings: "Månedlig sparing",
    note: "Et vanlig mål er 3-6 måneders levekostnader i kontanter. Det kan dekke tap av jobb, medisinske nødsituasjoner eller uventede reparasjoner uten ny gjeld. Din situasjon kan være annerledes.",
  },
  errors: {
    loadFailed: "Kunne ikke laste inn dataene dine. Åpne fanen igjen for å prøve på nytt.",
  },
};

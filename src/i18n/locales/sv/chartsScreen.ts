/**
 * BudgetArk - Svenska texter: Sjökort-fliken (screen)
 * File: src/i18n/locales/sv/chartsScreen.ts
 *
 * Swedish counterpart of en/chartsScreen.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. The "Why 7%?" card keeps
 * its US-market framing (S&P 500, dollars) because that is what the
 * calculator's default rate is based on.
 */

import type { Localized } from "../types";
import type { chartsScreen as en } from "../en/chartsScreen";

export const chartsScreen: Localized<typeof en> = {
  header: {
    title: "Sjökort",
    subtitle: "Lär känna havet. Lägg ut din kurs.",
  },
  course: {
    eyebrow: "⭐ KAPTENSKURSEN",
    startHere: "BÖRJA HÄR",
    resume: "FORTSÄTT",
    chapterRef: "Kap. {{number}} · {{title}}",
    readMin: " · {{count}} min",
    lessonReadMin: "{{count}} min",
    filterOnly: "Bara lektioner om {{glyph}} {{topic}}",
    showAll: "Visa alla ✕",
    comingSoon: "Kommer snart",
  },
  topics: {
    sectionTitle: "ÄMNEN",
    hint: "Tryck för att filtrera kursen efter ämne",
    labels: {
      budgeting: "Budgetering",
      debt: "Skulder",
      saving: "Sparande",
      investing: "Investering",
      taxes: "Skatt",
      insurance: "Försäkring",
      real_estate: "Fastigheter",
      retirement: "Pension",
      mindset: "Tankesätt",
    },
  },
  tools: {
    sectionTitle: "VERKTYG",
    hint: "Kalkylatorer & hjälpmedel",
  },
  units: {
    percent: "{{value}} %",
    years: "{{value}} år",
    yearPreset: "{{count}} år",
  },
  compound: {
    title: "Ränta-på-ränta-kalkylator",
    hint: "Se hur din investering växer över tid",
    projectedValue: "BERÄKNAT VÄRDE",
    subLump: "{{lump}} nu + {{monthly}}/mån · efter {{years}} år vid {{rate}} %",
    subPlain: "i dagens penningvärde · efter {{years}} år vid {{rate}} %",
    sliders: {
      lumpSum: "Engångsinsättning vid start",
      contribution: "Månadssparande",
      returnRate: "Årlig avkastning",
      years: "Tidshorisont",
    },
    presets: {
      savings: "Sparkonto",
      bonds: "Obligationer",
      sp500: "S&P 500",
      aggressive: "Offensiv",
    },
    comparison: {
      title: "Engångsbelopp vs. månadssparande",
      once: "{{amount}} en gång",
      perMonth: "{{amount}}/mån",
      both: "Båda",
      crossover:
        "Månadssparandet går om engångsbeloppet år {{year}} - men det sätter också in {{putIn}} mot {{lump}}. Att göra båda är den riktiga vinsten.",
      noCrossover:
        "Under {{years}} år ligger engångsbeloppet på egen hand före månadssparandet. Att göra båda är den riktiga vinsten.",
    },
    rule72: "Vid {{rate}} % tar det ungefär ~{{years}} år för dina pengar att dubblas (72-regeln)",
    whyShow: "Varför 7 %?",
    whyHide: "Dölj: Varför 7 %?",
    why: {
      title: "S&P 500 och inflation",
      p1: "S&P 500 är ett index över de 500 största amerikanska bolagen. Det har gett i snitt ~10 % per år sedan 1926.",
      p2: "Men inflationen (att varor blir dyrare) har historiskt legat på ~3 % per år. Det betyder att 100 dollar idag köper mindre i framtiden.",
      p3: "När vi drar bort inflationen (10 % - 3 %) blir den reala avkastningen ungefär 7 %. Den här kalkylatorn använder inflationsjusterad avkastning som standard, så det beräknade värdet visar vad dina pengar faktiskt kan köpa i dagens penningvärde.",
      footer: "Historisk avkastning är ingen garanti för framtida resultat. Den faktiska avkastningen varierar från år till år.",
    },
    chart: {
      title: "Tillväxt över tid",
      totalValue: "Totalt värde",
      contributions: "Insättningar",
      axisYear: "{{count}} år",
    },
    breakdown: {
      title: "Fördelning",
      putIn: "Du sätter in",
      contribute: "Dina insättningar",
      interest: "Intjänad ränta",
      ratio: "Dina pengar gav {{percent}} % mer tack vare ränta på ränta",
    },
  },
  refi: {
    title: "Låneomläggningskalkylator",
    hint: "Se om en omläggning faktiskt sparar pengar",
    breakEven: "BRYTPUNKT",
    pickOne: "Välj minst en skuld nedan för att se jämförelsen.",
    months: "{{count}} mån",
    recoverYears: "~{{years}} år innan {{amount}} i uppläggningskostnader är intjänade",
    recoverUnderYear: "{{amount}} i uppläggningskostnader intjänade på under ett år",
    noBreakEven: "Den nya betalningen är inte lägre än den nuvarande - ingen brytpunkt.",
    currentLoan: "NUVARANDE LÅN",
    pickDebts: "Välj de skulder du vill lägga om",
    noDebts: "Lägg till en skuld i Skuldkoll för att använda den här kalkylatorn.",
    debtMeta: "{{balance}} · {{rate}} % ränta",
    goalSet: " · mål satt",
    summaryTitle: "SAMMANFATTNING NUVARANDE LÅN",
    combinedBalance: "Sammanlagt saldo",
    apr: "Effektiv ränta",
    weightedApr: "Viktad ränta",
    selected: "{{selected}} av {{total}} skulder valda",
    weightedByBalance: " · viktad efter saldo",
    autoFilledHint:
      "Återstående år har fyllts i från varje skulds måldatum. Justera fritt om måldatumen inte är exakta.",
    setGoalHint: "Sätt ett måldatum på varje skuld i Skuldkoll så fylls återstående år i automatiskt.",
    newLoan: "NYTT LÅN",
    sliders: {
      refiCurrentTerm: "Återstående år",
      refiNewRate: "Ny ränta (effektiv)",
      refiNewTerm: "Ny löptid (år)",
      refiClosingCosts: "Uppläggningskostnader",
    },
    monthlyPayment: "Månadsbetalning",
    current: "Nuvarande",
    new: "Ny",
    savesPerMonth: "Sparar {{amount}}/mån",
    costsPerMonth: "Kostar {{amount}}/mån mer",
    samePayment: "Samma månadsbetalning",
    lifetimeInterest: "Total ränta över löptiden",
    keepCurrent: "Behåll nuvarande",
    refinance: "Lägg om",
    savesLifetime: "Sparar {{amount}} över lånets löptid",
    paysMore: "Betalar {{amount}} mer i ränta totalt",
    sameLifetime: "Samma totala ränta",
    netSavings: "Nettobesparing över den nya löptiden på {{years}} år: ",
    extendsWarning:
      "Obs: den nya löptiden är längre än det som återstår på ditt nuvarande lån. Den lägre månadsbetalningen beror delvis på att saldot sprids över fler månader - kolla den totala räntan ovan för att se om bytet är värt det.",
  },
  ef: {
    title: "Buffertkalkylator",
    hint: "Följ hur ditt skyddsnät växer",
    expensesTitle: "Dina månadsutgifter",
    basedOn: "Enligt din budget: i snitt {{amount}}/mån",
    noData: "Inga budgetdata ännu - ange dina månadsutgifter nedan",
    placeholder: "Månadsutgifter",
    threeMonth: "3 månaders buffert",
    sixMonth: "6 månaders buffert",
    saved: "{{amount}} sparat",
    monthsToReach_one: "~{{count}} månad kvar till målet med {{amount}}/mån",
    monthsToReach_other: "~{{count}} månader kvar till målet med {{amount}}/mån",
    threeReached: "3 månaders buffert nådd!",
    sixReached: "6 månaders buffert nådd!",
    monthlySavings: "Månadssparande",
    note: "Ett vanligt mål är 3-6 månaders levnadskostnader i kontanter. Det kan täcka jobbförlust, sjukvård eller oväntade reparationer utan nya skulder. Din situation kan se annorlunda ut.",
  },
  errors: {
    loadFailed: "Kunde inte läsa in dina data. Öppna fliken igen för att försöka på nytt.",
  },
};

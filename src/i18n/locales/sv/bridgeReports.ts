/**
 * BudgetArk - Svenska texter: Bryggan-fliken (reports)
 * File: src/i18n/locales/sv/bridgeReports.ts
 *
 * Swedish counterpart of en/bridgeReports.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { bridgeReports as en } from "../en/bridgeReports";

export const bridgeReports: Localized<typeof en> = {
  annual: {
    title: "Årsrapport",
    subtitle: "Ditt {{year}} i återblick",
    closeA11y: "Stäng årsrapporten",
    empty: {
      title: "Inget loggat för {{year}}",
      body: "Lägg till budgetposter, logga skuldbetalningar eller följ konton så fylls din rapport för {{year}} i automatiskt.",
    },
    tiles: {
      debtPaid: "Skuld avbetalad",
      payments_one: "{{count}} betalning",
      payments_other: "{{count}} betalningar",
      setAside: "Undansatt",
      setAsideHint: "Sparande · Pension · Investering",
      netWorthChange: "Nettoförmögenhet",
      notEnoughHistory: "För lite historik",
      startVsEnd: "Årets början vs. slut",
      savingsRate: "Sparkvot",
      savingsRateHint: "Inkomst som behölls, inte spenderades",
    },
    cashFlow: {
      title: "Kassaflöde",
      income: "Inkomster",
      expenses: "Utgifter",
      netSaved: "Netto sparat",
    },
    underBudget: {
      title: "Månader under budget",
      hint: "Månader där varje kategori med gräns höll sig under den. Ett helt år av gränser sparas, så innevarande år täcks helt; äldre år kan ha gränser som gallrats bort.",
    },
    topCategories: "Största utgiftskategorier",
    trend: "Utgifter per månad",
    share: {
      button: "Dela sammanfattning",
      a11y: "Dela årssammanfattning",
      note: "Delar bara summor och procent - inga namn eller detaljer.",
    },
  },
  history: {
    title: "Nettoförmögenhet",
    subtext: "Tillgångar {{assets}} · Skulder {{debt}}",
    ranges: {
      "7D": "7d",
      "30D": "30d",
      ALL: "Alla",
    },
    change: "Förändring",
    sinceStart: "Sedan start",
    rangeChange: "Förändring {{range}}",
    empty: "Spårningen börjar när första ögonblicksbilden sparas.",
    footer: "Dagliga ögonblicksbilder. Historiken börjar nu. Dra längs linjen för att se en dags värde.",
    chartA11y: "Diagram över nettoförmögenhet. Dra längs det för att läsa av en dags nettoförmögenhet.",
  },
  cashFlowChart: {
    title: "Månatligt kassaflöde",
    subtitle: "Inkomster vs utgifter",
    legendIn: "In",
    legendOut: "Ut",
    scrub: "{{label}} · In {{income}} · Ut {{expense}} · Netto {{net}}",
    chartA11y: "Kassaflödesdiagram. Dra längs det för att läsa av en månads inkomster, utgifter och netto.",
    empty: "Lägg till några månaders inkomster och utgifter för att se kassaflödet.",
  },
  trackingStrip: {
    eyebrow: "DEN HÄR MÅNADEN",
    budgetLink: "Budget ›",
    openBudgetA11y: "Öppna fliken Budget",
    spentOfLimits: "Spenderat {{spent}} av {{limits}} i gränser",
    spentThisMonth: "Spenderat {{spent}} den här månaden",
    empty: "Inget loggat än. Lägg till ditt första köp eller din första lön så visas det här.",
    openEntryA11y: "Öppna {{label}}, {{amount}}",
    addEntry: "+ Ny post",
    addEntryA11y: "Lägg till en budgetpost",
  },
};

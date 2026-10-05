/**
 * BudgetArk - Norske tekster: Broen-fanen (reports)
 * File: src/i18n/locales/nb/bridgeReports.ts
 *
 * Norwegian (Bokmål) counterpart of en/bridgeReports.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { bridgeReports as en } from "../en/bridgeReports";

export const bridgeReports: Localized<typeof en> = {
  annual: {
    title: "Årsrapport",
    subtitle: "Ditt {{year}} i tilbakeblikk",
    closeA11y: "Lukk årsrapporten",
    empty: {
      title: "Ingenting logget for {{year}}",
      body: "Legg til budsjettposter, logg gjeldsbetalinger eller følg kontoer, så fylles rapporten din for {{year}} inn automatisk.",
    },
    tiles: {
      debtPaid: "Gjeld nedbetalt",
      payments_one: "{{count}} betaling",
      payments_other: "{{count}} betalinger",
      setAside: "Satt av",
      setAsideHint: "Sparing · Pensjon · Investering",
      netWorthChange: "Endring i nettoformue",
      notEnoughHistory: "For lite historikk",
      startVsEnd: "Årets start vs. slutt",
      savingsRate: "Sparerate",
      savingsRateHint: "Inntekt beholdt, ikke brukt",
    },
    cashFlow: {
      title: "Kontantstrøm",
      income: "Inntekter",
      expenses: "Utgifter",
      netSaved: "Netto spart",
    },
    underBudget: {
      title: "Måneder under budsjett",
      hint: "Måneder der hver kategori med grense holdt seg under den. Et helt år med grenser beholdes, så inneværende år dekkes fullt; eldre år kan ha grenser som er utløpt.",
    },
    topCategories: "Største utgiftskategorier",
    trend: "Utgifter per måned",
    share: {
      button: "Del sammendrag",
      a11y: "Del årssammendrag",
      note: "Deler bare summer og prosenter - ingen navn eller detaljer.",
    },
  },
  history: {
    title: "Nettoformue",
    subtext: "Eiendeler {{assets}} · Gjeld {{debt}}",
    ranges: {
      "7D": "7d",
      "30D": "30d",
      ALL: "Alle",
    },
    change: "Endring",
    sinceStart: "Siden start",
    rangeChange: "Endring {{range}}",
    empty: "Sporingen starter når det første øyeblikksbildet lagres.",
    footer: "Daglige øyeblikksbilder. Historikken starter nå. Dra langs linjen for å se verdien en gitt dag.",
    chartA11y: "Diagram over nettoformue. Dra langs det for å lese av en dags nettoformue.",
  },
  cashFlowChart: {
    title: "Månedlig kontantstrøm",
    subtitle: "Inntekter vs utgifter",
    legendIn: "Inn",
    legendOut: "Ut",
    scrub: "{{label}} · Inn {{income}} · Ut {{expense}} · Netto {{net}}",
    chartA11y: "Kontantstrømdiagram. Dra langs det for å lese av en måneds inntekter, utgifter og netto.",
    empty: "Legg til noen måneder med inntekter og utgifter for å se kontantstrømmen.",
  },
  trackingStrip: {
    eyebrow: "DENNE MÅNEDEN",
    budgetLink: "Budsjett ›",
    openBudgetA11y: "Åpne Budsjett-fanen",
    spentOfLimits: "Brukt {{spent}} av {{limits}} i grenser",
    spentThisMonth: "Brukt {{spent}} denne måneden",
    empty: "Ingenting logget enda. Legg til det første kjøpet eller den første lønnen din, så vises det her.",
    openEntryA11y: "Åpne {{label}}, {{amount}}",
    addEntry: "+ Ny post",
    addEntryA11y: "Legg til en budsjettpost",
  },
};

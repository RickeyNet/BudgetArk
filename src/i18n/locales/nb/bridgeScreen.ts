/**
 * BudgetArk - Norske tekster: Broen-fanen (screen)
 * File: src/i18n/locales/nb/bridgeScreen.ts
 *
 * Norwegian (Bokmål) counterpart of en/bridgeScreen.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. Asset-category labels are
 * keyed by the `AssetAccountCategory` id and change-period chips by their
 * `AccountChangePeriodKey`; tickers and example symbols (AAPL, BTC/USD, VOO,
 * Fidelity, Spartan 500 Index Pool) stay English.
 */

import type { Localized } from "../types";
import type { bridgeScreen as en } from "../en/bridgeScreen";

export const bridgeScreen: Localized<typeof en> = {
  header: {
    title: "Broen",
    subtitle: "Nettoformue, kontoer og fremgang.",
  },
  accounts: {
    title: "Kontoer",
    add: "+ Legg til",
    empty: "Følg saldoene på brukskonto, sparekonto, pensjonskonto, HSA og andre kontoer her.",
    total: "Totalt",
    across_one: "på {{count}} konto",
    across_other: "på {{count}} kontoer",
    plusEmergencyFund: " + buffer",
    changeLabel: "Endring",
    changeChipA11y: "Vis endring {{period}}",
    periods: {
      "1D": "1d",
      "7D": "7d",
      "30D": "30d",
      "90D": "90d",
    },
    trackingHint: "Sporingen starter i dag - opp/ned vises etter neste besøk.",
    emergencyFund: "Buffer",
    efFromAccounts_one: "Fra {{count}} sparekonto",
    efFromAccounts_other: "Fra {{count}} sparekontoer",
    savingsGoal: "Sparemål",
    categories: {
      checking: "Brukskonto",
      savings: "Sparekonto",
      retirement: "Pensjon",
      hsa: "HSA",
      investment: "Investeringer",
      other: "Annet",
    },
    edit: "Rediger",
    editA11y: "Rediger {{name}}",
    cash: "Kontanter",
    noHoldings: "Ingen beholdning enda - trykk på Rediger for å legge til tickere.",
    fund: "Fond",
    shares_one: "{{count}} andel",
    shares_other: "{{count}} andeler",
    tracks: "Følger {{symbol}}",
    manualValue: "Manuell verdi",
    addHsaAccount: "+ Legg til HSA-konto",
    addBroker: "+ Legg til megler",
  },
  holdingsNudge: {
    a11y: "Slå på Beholdning i sanntid for å se delt beholdning",
    title: "📈 Beholdning delt med deg",
    body_one:
      "{{count}} posisjon synket fra partneren din. Slå på Beholdning i sanntid for å se dem og regne verdien inn i nettoformuen din.",
    body_other:
      "{{count}} posisjoner synket fra partneren din. Slå på Beholdning i sanntid for å se dem og regne verdien inn i nettoformuen din.",
    cta: "Slå på Beholdning i sanntid ›",
  },
  prices: {
    asOf: "Kurser per {{date}}",
    notFetched: "Kurser ikke hentet enda",
    updateA11y: "Oppdater kurser nå",
    updating: "Oppdaterer...",
    update: "Oppdater kurser",
    notices: {
      unavailable:
        "Kunne ikke oppdatere kursene akkurat nå. Sjekk tilkoblingen og prøv igjen om noen minutter.",
      rateLimited: "Kursene er allerede oppdatert i dag.",
      partial_one:
        "De fleste kursene er oppdatert - henter fortsatt {{count}} ticker. Trykk igjen om noen minutter for å fullføre.",
      partial_other:
        "De fleste kursene er oppdatert - henter fortsatt {{count}} tickere. Trykk igjen om noen minutter for å fullføre.",
      partialUnknown: "De fleste kursene er oppdatert - trykk igjen om noen minutter for å fullføre.",
    },
  },
  plans: {
    title: "Kjøpsplaner",
    planA11y: "Planlegg et nytt kjøp på Sjøkart-fanen",
    add: "+ Planlegg",
    hint: "Trykk på en plan for å legge til pengene du har satt av.",
    empty:
      "Sparer du til noe? Trykk på + Planlegg for å lage en målsparing på Sjøkart-fanen - den følges her og telles med i nettoformuen din.",
  },
  shipsLog: {
    a11y: "Åpne Loggbok med prestasjoner",
    title: "Loggbok",
    earned: "{{count}}/{{total}} oppnådd",
  },
  annualReport: {
    a11y: "Åpne årsrapporten din",
    title: "Årsrapport",
    subtitle: "Året ditt {{year}} i tilbakeblikk",
  },
  assetModal: {
    editTitle: "Rediger konto",
    addTitle: "Legg til konto",
    subHsa: "Følg kontantsaldoen på HSA-kontoen og eventuelle aksjer eller ETF-er den har.",
    subHoldings: "Legg til megleren og aksjene eller ETF-ene den har. Verdien kommer fra beholdningen.",
    subBalance: "Følg en saldo som mater nettoformuehistorikken din.",
    namePlaceholderBroker: "Meglernavn (f.eks. Fidelity)",
    namePlaceholderHsa: "HSA-leverandør (f.eks. Fidelity)",
    namePlaceholder: "Kontonavn",
    balancePlaceholderHsa: "Kontantsaldo",
    balancePlaceholder: "Saldo",
    apyPlaceholder: "Årsrente % (valgfritt) - f.eks. 4,5",
    apyA11y: "Effektiv årsrente",
    efToggleA11y: "Denne kontoen er bufferen min",
    efToggleLabel: "🛡️ Buffer",
    efToggleHint:
      "Regn denne saldoen som bufferen din. Med utpekte kontoer følger bufferen den samlede saldoen deres (banksynk holder den oppdatert) i stedet for manuelle innskudd.",
    tickerHint:
      "Legg til aksjer/ETF-er med ticker (AAPL) eller krypto med par (BTC/USD). For et pensjonsfond uten ticker (f.eks. Spartan 500 Index Pool), bruk Legg til pensjonsfond. Symboler sendes til kurstjenesten først når du trykker på Oppdater kurser - legg til alle først, og hent kursene én gang.",
    fundNamePlaceholder: "Fondsnavn (f.eks. Spartan 500 Index Pool)",
    removeFund: "Fjern fond",
    proxyPlaceholder: "Følg indeks (valgfritt, f.eks. VOO)",
    valuePlaceholder: "Nåværende verdi",
    fundHintProxy: "Følger {{symbol}} mellom oppdateringer - skriv inn verdien fra hver kontoutskrift på nytt for å forankre igjen.",
    fundHintManual: "Ingen indeks - beholder verdien du skriver inn til du endrer den.",
    tickerPlaceholder: "AAPL eller BTC/USD",
    sharesPlaceholder: "Andeler",
    costPlaceholder: "Kostpris",
    removeTicker: "Fjern ticker",
    addTicker: "+ Legg til ticker",
    addFund: "+ Legg til pensjonsfond",
  },
  efModal: {
    title: "Buffer",
    currentBalance: "Nåværende saldo: {{amount}}",
    amountPlaceholder: "Beløp å legge til (negativt for uttak)",
    hint: "Skriv inn et positivt tall for å sette inn, eller negativt for å ta ut.",
  },
  disclosure: {
    notNow: "Ikke nå",
    enable: "Slå på",
  },
};

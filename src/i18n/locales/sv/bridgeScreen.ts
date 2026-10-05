/**
 * BudgetArk - Svenska texter: Bryggan-fliken (screen)
 * File: src/i18n/locales/sv/bridgeScreen.ts
 *
 * Swedish counterpart of en/bridgeScreen.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. Asset-category labels are
 * keyed by the `AssetAccountCategory` id and change-period chips by their
 * `AccountChangePeriodKey`; tickers and example symbols (AAPL, BTC/USD, VOO,
 * Fidelity, Spartan 500 Index Pool) stay English.
 */

import type { Localized } from "../types";
import type { bridgeScreen as en } from "../en/bridgeScreen";

export const bridgeScreen: Localized<typeof en> = {
  header: {
    title: "Bryggan",
    subtitle: "Nettoförmögenhet, konton och framsteg.",
  },
  accounts: {
    title: "Konton",
    add: "+ Lägg till",
    empty: "Följ saldon på lönekonto, sparkonto, pensionskonto, HSA och andra konton här.",
    total: "Totalt",
    across_one: "på {{count}} konto",
    across_other: "på {{count}} konton",
    plusEmergencyFund: " + buffert",
    changeLabel: "Förändring",
    changeChipA11y: "Visa förändring {{period}}",
    periods: {
      "1D": "1d",
      "7D": "7d",
      "30D": "30d",
      "90D": "90d",
    },
    trackingHint: "Spårningen börjar idag - upp/ned visas efter nästa besök.",
    emergencyFund: "Buffert",
    efFromAccounts_one: "Från {{count}} sparkonto",
    efFromAccounts_other: "Från {{count}} sparkonton",
    savingsGoal: "Sparmål",
    categories: {
      checking: "Lönekonto",
      savings: "Sparkonto",
      retirement: "Pension",
      hsa: "HSA",
      investment: "Investeringar",
      other: "Övrigt",
    },
    edit: "Redigera",
    editA11y: "Redigera {{name}}",
    cash: "Kontanter",
    noHoldings: "Inga innehav än - tryck på Redigera för att lägga till tickers.",
    fund: "Fond",
    shares_one: "{{count}} andel",
    shares_other: "{{count}} andelar",
    tracks: "Följer {{symbol}}",
    manualValue: "Manuellt värde",
    addHsaAccount: "+ Lägg till HSA-konto",
    addBroker: "+ Lägg till depå",
  },
  holdingsNudge: {
    a11y: "Aktivera Innehav i realtid för att se delade innehav",
    title: "📈 Innehav delade med dig",
    body_one:
      "{{count}} position synkad från din partner. Slå på Innehav i realtid för att se dem och räkna in värdet i din nettoförmögenhet.",
    body_other:
      "{{count}} positioner synkade från din partner. Slå på Innehav i realtid för att se dem och räkna in värdet i din nettoförmögenhet.",
    cta: "Aktivera Innehav i realtid ›",
  },
  prices: {
    asOf: "Kurser per {{date}}",
    notFetched: "Kurser inte hämtade än",
    updateA11y: "Uppdatera kurser nu",
    updating: "Uppdaterar...",
    update: "Uppdatera kurser",
    notices: {
      unavailable:
        "Kunde inte uppdatera kurserna just nu. Kontrollera uppkopplingen och försök igen om några minuter.",
      rateLimited: "Kurserna har redan uppdaterats idag.",
      partial_one:
        "De flesta kurser är uppdaterade - hämtar fortfarande {{count}} ticker. Tryck igen om några minuter för att slutföra.",
      partial_other:
        "De flesta kurser är uppdaterade - hämtar fortfarande {{count}} tickers. Tryck igen om några minuter för att slutföra.",
      partialUnknown: "De flesta kurser är uppdaterade - tryck igen om några minuter för att slutföra.",
    },
  },
  plans: {
    title: "Inköpsplaner",
    planA11y: "Planera ett nytt inköp på fliken Sjökort",
    add: "+ Planera",
    hint: "Tryck på en plan för att lägga till pengarna du satt undan.",
    empty:
      "Sparar du till något? Tryck på + Planera för att skapa ett målsparande på fliken Sjökort - det följs här och räknas in i din nettoförmögenhet.",
  },
  shipsLog: {
    a11y: "Öppna Loggbok med utmärkelser",
    title: "Loggbok",
    earned: "{{count}}/{{total}} intjänade",
  },
  annualReport: {
    a11y: "Öppna din årsrapport",
    title: "Årsrapport",
    subtitle: "Ditt år {{year}} i återblick",
  },
  assetModal: {
    editTitle: "Redigera konto",
    addTitle: "Lägg till konto",
    subHsa: "Följ HSA-kontots kontantsaldo och eventuella aktier eller ETF:er i det.",
    subHoldings: "Lägg till depån och de aktier eller ETF:er den innehåller. Värdet kommer från innehaven.",
    subBalance: "Följ ett saldo som matar din nettoförmögenhetshistorik.",
    namePlaceholderBroker: "Mäklare (t.ex. Fidelity)",
    namePlaceholderHsa: "HSA-leverantör (t.ex. Fidelity)",
    namePlaceholder: "Kontonamn",
    balancePlaceholderHsa: "Kontantsaldo",
    balancePlaceholder: "Saldo",
    apyPlaceholder: "Årsränta % (valfritt) - t.ex. 4,5",
    apyA11y: "Effektiv årsränta",
    efToggleA11y: "Det här kontot är min buffert",
    efToggleLabel: "🛡️ Buffert",
    efToggleHint:
      "Räkna det här saldot som din buffert. Med utsedda konton följer bufferten deras sammanlagda saldo (banksynk håller det aktuellt) i stället för manuella insättningar.",
    tickerHint:
      "Lägg till aktier/ETF:er med ticker (AAPL) eller krypto med par (BTC/USD). För en pensionsfond utan ticker (t.ex. Spartan 500 Index Pool), använd Lägg till pensionsfond. Symboler skickas till kurstjänsten först när du trycker på Uppdatera kurser - lägg till alla först och hämta sedan kurserna en gång.",
    fundNamePlaceholder: "Fondnamn (t.ex. Spartan 500 Index Pool)",
    removeFund: "Ta bort fond",
    proxyPlaceholder: "Följ index (valfritt, t.ex. VOO)",
    valuePlaceholder: "Aktuellt värde",
    fundHintProxy: "Följer {{symbol}} mellan uppdateringar - skriv in värdet från varje kontobesked igen för att förankra på nytt.",
    fundHintManual: "Inget index - behåller värdet du anger tills du ändrar det.",
    tickerPlaceholder: "AAPL eller BTC/USD",
    sharesPlaceholder: "Andelar",
    costPlaceholder: "Inköpspris",
    removeTicker: "Ta bort ticker",
    addTicker: "+ Lägg till ticker",
    addFund: "+ Lägg till pensionsfond",
  },
  efModal: {
    title: "Buffert",
    currentBalance: "Aktuellt saldo: {{amount}}",
    amountPlaceholder: "Belopp att lägga till (negativt för uttag)",
    hint: "Ange ett positivt tal för att sätta in, eller negativt för att ta ut.",
  },
  disclosure: {
    notNow: "Inte nu",
    enable: "Aktivera",
  },
};

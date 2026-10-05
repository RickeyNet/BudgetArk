/**
 * BudgetArk - Deutsche Texte: Brücke-Tab (screen)
 * File: src/i18n/locales/de/bridgeScreen.ts
 *
 * German counterpart of en/bridgeScreen.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { bridgeScreen as en } from "../en/bridgeScreen";

export const bridgeScreen: Localized<typeof en> = {
  header: {
    title: "Die Brücke",
    subtitle: "Nettovermögen, Konten und Fortschritt.",
  },
  accounts: {
    title: "Konten",
    add: "+ Neu",
    empty: "Erfasse hier die Kontostände von Girokonto, Sparkonto, Altersvorsorge, HSA und anderen Konten.",
    total: "Gesamt",
    across_one: "auf {{count}} Konto",
    across_other: "auf {{count}} Konten",
    plusEmergencyFund: " + Notgroschen",
    changeLabel: "Änderung",
    changeChipA11y: "Änderung über {{period}} anzeigen",
    periods: {
      "1D": "1 T",
      "7D": "7 T",
      "30D": "30 T",
      "90D": "90 T",
    },
    trackingHint: "Die Aufzeichnung beginnt heute - Anstieg/Rückgang erscheint ab dem nächsten Besuch.",
    emergencyFund: "Notgroschen",
    efFromAccounts_one: "Aus {{count}} Sparkonto",
    efFromAccounts_other: "Aus {{count}} Sparkonten",
    savingsGoal: "Sparziel",
    categories: {
      checking: "Girokonto",
      savings: "Sparkonto",
      retirement: "Altersvorsorge",
      hsa: "HSA",
      investment: "Depot",
      other: "Sonstiges",
    },
    edit: "Bearbeiten",
    editA11y: "{{name}} bearbeiten",
    cash: "Bargeld",
    noHoldings: "Noch keine Wertpapiere - tippe auf Bearbeiten, um Ticker hinzuzufügen.",
    fund: "Fonds",
    shares_one: "{{count}} Anteil",
    shares_other: "{{count}} Anteile",
    tracks: "Folgt {{symbol}}",
    manualValue: "Manueller Wert",
    addHsaAccount: "+ HSA-Konto hinzufügen",
    addBroker: "+ Depot hinzufügen",
  },
  holdingsNudge: {
    a11y: "Live-Wertpapiere einschalten, um geteilte Positionen zu sehen",
    title: "📈 Mit dir geteilte Wertpapiere",
    body_one:
      "{{count}} Position von deinem Partner synchronisiert. Schalte Live-Wertpapiere ein, um sie zu sehen und ihren Wert in dein Nettovermögen einzurechnen.",
    body_other:
      "{{count}} Positionen von deinem Partner synchronisiert. Schalte Live-Wertpapiere ein, um sie zu sehen und ihren Wert in dein Nettovermögen einzurechnen.",
    cta: "Live-Wertpapiere einschalten ›",
  },
  prices: {
    asOf: "Kurse vom {{date}}",
    notFetched: "Kurse noch nicht abgerufen",
    updateA11y: "Kurse jetzt aktualisieren",
    updating: "Wird aktualisiert...",
    update: "Kurse aktualisieren",
    notices: {
      unavailable:
        "Kurse konnten gerade nicht aktualisiert werden. Prüfe deine Verbindung und versuch es in ein paar Minuten erneut.",
      rateLimited: "Die Kurse wurden heute bereits aktualisiert.",
      partial_one:
        "Die meisten Kurse sind aktualisiert - {{count}} Ticker wird noch geladen. Tippe in ein paar Minuten erneut, um abzuschließen.",
      partial_other:
        "Die meisten Kurse sind aktualisiert - {{count}} Ticker werden noch geladen. Tippe in ein paar Minuten erneut, um abzuschließen.",
      partialUnknown: "Die meisten Kurse sind aktualisiert - tippe in ein paar Minuten erneut, um abzuschließen.",
    },
  },
  plans: {
    title: "Anschaffungspläne",
    planA11y: "Neue Anschaffung im Karten-Tab planen",
    add: "+ Planen",
    hint: "Tippe auf einen Plan, um zurückgelegtes Geld hinzuzufügen.",
    empty:
      "Sparst du auf etwas? Tippe auf + Planen, um im Karten-Tab einen Ansparposten anzulegen - er wird hier verfolgt und zählt zu deinem Nettovermögen.",
  },
  shipsLog: {
    a11y: "Logbuch mit Erfolgen öffnen",
    title: "Logbuch",
    earned: "{{count}}/{{total}} erreicht",
  },
  annualReport: {
    a11y: "Deinen Jahresbericht öffnen",
    title: "Jahresbericht",
    subtitle: "Dein Jahr {{year}} im Rückblick",
  },
  assetModal: {
    editTitle: "Konto bearbeiten",
    addTitle: "Konto hinzufügen",
    subHsa: "Erfasse den Bargeldbestand deines HSA und die Aktien oder ETFs darin.",
    subHoldings: "Füge das Depot und die darin gehaltenen Aktien oder ETFs hinzu. Sein Wert ergibt sich aus den Positionen.",
    subBalance: "Erfasse einen Kontostand, der in deinen Nettovermögens-Verlauf einfließt.",
    namePlaceholderBroker: "Name des Depots (z. B. Fidelity)",
    namePlaceholderHsa: "HSA-Anbieter (z. B. Fidelity)",
    namePlaceholder: "Kontoname",
    balancePlaceholderHsa: "Bargeldbestand",
    balancePlaceholder: "Kontostand",
    apyPlaceholder: "Zins % p. a. (optional) - z. B. 4,5",
    apyA11y: "Jahreszins",
    efToggleA11y: "Dieses Konto ist mein Notgroschen",
    efToggleLabel: "🛡️ Notgroschen",
    efToggleHint:
      "Zähle diesen Kontostand als deinen Notgroschen. Mit zugewiesenen Konten folgt der Notgroschen deren Gesamtstand (Bank-Sync hält ihn aktuell) statt manueller Einzahlungen.",
    tickerHint:
      "Füge Aktien/ETFs per Ticker (AAPL) oder Krypto per Paar (BTC/USD) hinzu. Für einen Altersvorsorge-Fonds ohne Ticker (z. B. Spartan 500 Index Pool) nutze „Fonds hinzufügen“. Symbole gehen erst beim Tippen auf „Kurse aktualisieren“ an den Kursdienst - füge erst alle hinzu und rufe die Kurse dann einmal ab.",
    fundNamePlaceholder: "Fondsname (z. B. Spartan 500 Index Pool)",
    removeFund: "Fonds entfernen",
    proxyPlaceholder: "Index folgen (optional, z. B. VOO)",
    valuePlaceholder: "Aktueller Wert",
    fundHintProxy: "Folgt {{symbol}} zwischen Aktualisierungen - gib den Wert aus jedem Auszug neu ein, um neu zu verankern.",
    fundHintManual: "Kein Index - behält den eingegebenen Wert, bis du ihn änderst.",
    tickerPlaceholder: "AAPL oder BTC/USD",
    sharesPlaceholder: "Anteile",
    costPlaceholder: "Kaufpreis",
    removeTicker: "Ticker entfernen",
    addTicker: "+ Ticker hinzufügen",
    addFund: "+ Fonds hinzufügen",
  },
  efModal: {
    title: "Notgroschen",
    currentBalance: "Aktueller Stand: {{amount}}",
    amountPlaceholder: "Betrag hinzufügen (negativ zum Entnehmen)",
    hint: "Positive Zahl zum Einzahlen, negative zum Entnehmen.",
  },
  disclosure: {
    notNow: "Jetzt nicht",
    enable: "Einschalten",
  },
};

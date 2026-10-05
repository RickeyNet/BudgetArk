/**
 * BudgetArk - Norske tekster: Profil (main)
 * File: src/i18n/locales/nb/profileMain.ts
 *
 * Norwegian (Bokmål) counterpart of en/profileMain.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { profileMain as en } from "../en/profileMain";

export const profileMain: Localized<typeof en> = {
  header: {
    title: "Profil",
    subtitle: "Innstillingene for den anonyme kontoen din.",
  },
  loading: {
    loading: "Laster profil...",
    failedTitle: "Kunne ikke laste profilen din",
    failedBody:
      "BudgetArk kunne ikke lese de lagrede dataene sine på denne enheten. Det kan skje når telefonen har svært lite ledig lagringsplass. Dataene dine er ikke endret.",
    tryAgain: "Prøv igjen",
    tryAgainA11y: "Prøv igjen",
  },
  appVersion: "BudgetArk v{{version}}",
  card: {
    editHint: "{{idPrefix}}... · Trykk på navnet for å endre",
  },
  mission: {
    a11yExpanded: "Oppdragsbeskrivelse, utvidet",
    a11yCollapsed: "Oppdragsbeskrivelse, sammenfoldet",
  },
  progress: {
    sectionTitle: "FREMGANG",
    shipsLog: "Loggbok",
    shipsLogA11y: "Åpne loggboken med prestasjoner",
    earned: "{{unlocked}}/{{total}} prestasjoner oppnådd",
  },
  backupBanner: {
    upgradedTitle: "Du har oppgradert til v{{version}}",
    upgradedBody:
      "Den siste sikkerhetskopien din ble tatt på v{{lastVersion}}. Ta en ny så du alltid kan gjenopprette fra denne versjonen.",
    noBackupTitle: "Ingen sikkerhetskopi enda",
    noBackupBody:
      "Eksporter dataene dine så du har et gjenopprettingspunkt hvis noe skulle skje med enheten din.",
    backUpNow: "Ta sikkerhetskopi nå",
    dismiss: "Avvis",
  },
  sync: {
    pairedTitle: "Sammenkoblet!",
    pairedMessage:
      "Du er nå sammenkoblet med {{partnerName}}. Trykk på «Synk nå» når du vil for å dele data.",
    completeTitle: "Synk fullført",
    completeMessage: "Sendte {{sent}} poster, mottok {{received}} poster.",
    failedTitle: "Synk mislyktes",
    failedFallback: "Kunne ikke koble til partneren.",
    unpairedTitle: "Frakoblet",
    unpairedMessage:
      "Partnersynk er koblet fra. Dataene dine er fortsatt på denne enheten.",
    permissionTitle: "Tillatelse kreves",
    permissionMessage:
      "Posisjonstillatelse trengs for å lese navnet på wifi-nettverket for autosynk. Posisjonen din lagres eller deles aldri.",
    noWifiTitle: "Fant ikke wifi",
    noWifiIos:
      "Kunne ikke lese navnet på wifi-nettverket ditt. Sørg for at du er tilkoblet wifi, og sjekk deretter:\n\n1. Innstillinger > Personvern og sikkerhet > Stedstjenester - slå på for BudgetArk («Når appen er i bruk»)\n2. Innstillinger > Personvern og sikkerhet > Lokalt nettverk - slå på for BudgetArk\n\niOS krever stedstilgang for å lese wifi-navnet. Posisjonen din lagres eller deles aldri.",
    noWifiAndroid: "Koble til hjemme-wifi først, og prøv igjen.",
    saveHomeNetworkFailedTitle: "Kunne ikke lagre hjemmenettverket",
    saveSettingFailedTitle: "Kunne ikke lagre innstillingen",
    saveFailedMessage:
      "BudgetArk kunne ikke lagre sammenkoblingsinnstillingene sikkert på denne enheten. Ingenting ble endret - prøv igjen.",
    homeNetworkSetTitle: "Hjemmenettverk valgt",
    homeNetworkSetMessage:
      "Autosynk starter når begge enhetene er tilkoblet «{{ssid}}».",
  },
  reset: {
    incompleteTitle: "Nullstillingen er ufullstendig",
    incompleteFallback:
      "Noen data kunne ikke slettes. Prøv igjen eller installer appen på nytt for å fullføre nullstillingen.",
    incompleteRetry: "{{message}} Prøv «Nullstill alle data» igjen.",
  },
};

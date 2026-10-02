/**
 * BudgetArk - Norske tekster: Profil (settings)
 * File: src/i18n/locales/nb/profileSettings.ts
 *
 * Norwegian (Bokmål) counterpart of en/profileSettings.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { profileSettings as en } from "../en/profileSettings";

export const profileSettings: Localized<typeof en> = {
  sectionTitle: "INNSTILLINGER",
  language: {
    label: "Språk",
    pickerTitle: "Språk",
    a11yLabel: "Språk, nå {{current}}",
    a11yHint: "Åpner appens språkvalg",
    autoWithResolved: "Automatisk ({{language}})",
    options: {
      auto: {
        name: "Automatisk",
        description:
          "Følger telefonens språk. Faller tilbake på engelsk når telefonens språk ikke er tilgjengelig enda.",
      },
    },
    note: "Noe innhold - leksjoner, de amerikanske skatteverktøyene og versjonsinformasjonen - finnes foreløpig bare på engelsk.",
  },
  notNow: "Ikke nå",
  currency: {
    label: "Valuta",
    pickerTitle: "Valuta & region",
  },
  currencyChange: {
    title: "Bytt valuta",
    pairedMessage:
      "Å bytte til {{to}} endrer valutasymbolet, men beløpene dine beholder de samme tallene. Dataene dine synkes med en sammenkoblet partner, så beløpene kan ikke regnes om automatisk - koble fra først hvis du vil regne dem om.",
    fetchingRate: "Henter dagens valutakurs...",
    convertQuestion:
      "Vil du regne om de eksisterende beløpene dine fra {{from}} til {{to}} med kursen nedenfor, eller bare bytte symbol og beholde de samme tallene?",
    rateToday: "Dagens kurs",
    rateCached: "Kurser fra {{when}} (fikk ikke tak i sanntidskurser)",
    rateOffline: "Frakoblet - bruker et innebygd estimat",
    rateLine: "{{prefix}}: 1 {{from}} = {{rate}} {{to}}",
    convertButton: "Regn om beløpene mine",
    symbolOnlyPaired: "Bytt bare symbol",
    symbolOnly: "Bytt bare symbolet",
  },
  privacy: {
    label: "Personvernmodus",
    enabled: "Skjermbilder & skjermopptak blokkeres",
    disabled: "Skjermbilder & skjermopptak tillates",
    onTitle: "Personvernmodus på",
    offTitle: "Personvernmodus av",
    onMessage: "Skjermbilder og skjermopptak blokkeres nå.",
    offMessage: "Beskyttelsen mot skjermbilder og skjermopptak er slått av.",
  },
  appLock: {
    label: "Applås",
    enabled: "PIN-kode kreves når appen åpnes",
    disabled: "Be om PIN-kode når appen åpnes",
  },
  holdings: {
    label: "Beholdning i sanntid",
    enabled: "Aksjer & ETF-er regnes med i nettoformuen din",
    disabled: "Regn aksjer & ETF-er med i nettoformuen din",
    enabledTitle: "Beholdning i sanntid på",
    enabledMessage:
      "Legg til aksjer og ETF-er fra Broen-fanen. Kursene oppdateres omtrent én gang om dagen.",
    enable: "Aktiver",
  },
  haptics: {
    label: "Haptisk tilbakemelding",
    enabled: "Diskrete vibrasjoner ved viktige handlinger",
    disabled: "Vibrasjoner slått av",
  },
  reminders: {
    label: "Loggpåminnelser",
    off: "Små påminnelser om å logge utgifter & planlegge hver måned",
    afterQuietDays_one: "Etter en stille dag",
    afterQuietDays_other: "Etter {{count}} stille dager",
    afterQuietWeek: "Etter en stille uke",
    checkInsAndMonthStart: "Avstemminger & planlegging ved månedsstart",
    monthStart: "Planlegging ved månedsstart",
    nothingSelected: "Ingenting valgt",
    mornings: "morgener",
    afternoons: "ettermiddager",
    evenings: "kvelder",
    summary: "{{what}} · {{when}}",
  },
  updates: {
    checkLabel: "Se etter oppdateringer",
    lastChecked: "Sist sjekket {{when}}",
    neverChecked: "Aldri sjekket",
    autoLabel: "Automatiske oppdateringer",
    autoOff: "Av - bare manuelle sjekker",
    autoOn: "På - sjekker automatisk",
    unavailableTitle: "Oppdateringer utilgjengelige",
    unavailableMessage:
      "Oppdateringssjekker er ikke tilgjengelige i utviklingsbygg. Installer et EAS-forhåndsvisnings- eller produksjonsbygg for å bruke funksjonen.",
    upToDateTitle: "Alt er oppdatert",
    upToDateMessage: "Ingen oppdatering er tilgjengelig nå. Sist sjekket {{when}}.",
    rejectedTitle: "Oppdatering avvist",
    rejectedMessage:
      "Oppdateringen ble avvist fordi den er rettet mot en eldre runtime-versjon. Det kan tyde på et forsøk på tilbakerulling.",
    failedTitle: "Oppdateringssjekken mislyktes",
    failedNetwork:
      "Fikk ikke kontakt med oppdateringsserveren. Sjekk internettforbindelsen og prøv igjen.",
    failedGeneric: "Kunne ikke se etter oppdateringer nå. Prøv igjen om litt.",
    failedDetails: "{{friendly}}\n\nDetaljer: {{details}}",
    modeSavedTitle: "Oppdateringsmodus lagret",
    modeManualMessage:
      "Manuell modus er på. Appen ser bare etter oppdateringer når du trykker på «Se etter oppdateringer».",
    modeAutoMessage: "Automatiske oppdateringssjekker er på.",
    readyTitle: "Oppdatering klar",
    readyMessage: "En ny oppdatering er klar til å installeres.",
    published: "Publisert {{when}}",
    later: "Senere",
    installNow: "Installer nå",
    installFailedTitle: "Installasjonen mislyktes",
    installFailedMessage:
      "Oppdateringen kunne ikke tas i bruk nå. Prøv igjen.",
  },
};

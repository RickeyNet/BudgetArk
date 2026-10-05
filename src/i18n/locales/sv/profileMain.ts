/**
 * BudgetArk - Svenska texter: Profil (main)
 * File: src/i18n/locales/sv/profileMain.ts
 *
 * Swedish counterpart of en/profileMain.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { profileMain as en } from "../en/profileMain";

export const profileMain: Localized<typeof en> = {
  header: {
    title: "Profil",
    subtitle: "Inställningarna för ditt anonyma konto.",
  },
  loading: {
    loading: "Laddar profil...",
    failedTitle: "Kunde inte ladda din profil",
    failedBody:
      "BudgetArk kunde inte läsa sina sparade data på den här enheten. Det kan hända när telefonen har väldigt lite ledigt lagringsutrymme. Dina data har inte ändrats.",
    tryAgain: "Försök igen",
    tryAgainA11y: "Försök igen",
  },
  appVersion: "BudgetArk v{{version}}",
  card: {
    editHint: "{{idPrefix}}... · Tryck på namnet för att ändra",
  },
  mission: {
    a11yExpanded: "Uppdragsbeskrivning, utfälld",
    a11yCollapsed: "Uppdragsbeskrivning, infälld",
  },
  progress: {
    sectionTitle: "FRAMSTEG",
    shipsLog: "Loggbok",
    shipsLogA11y: "Öppna loggboken med utmärkelser",
    earned: "{{unlocked}}/{{total}} utmärkelser intjänade",
  },
  backupBanner: {
    upgradedTitle: "Du har uppgraderat till v{{version}}",
    upgradedBody:
      "Din senaste säkerhetskopia gjordes på v{{lastVersion}}. Ta en ny så att du alltid kan återställa från den här versionen.",
    noBackupTitle: "Ingen säkerhetskopia än",
    noBackupBody:
      "Exportera dina data så att du har en återställningspunkt om något skulle hända med din enhet.",
    backUpNow: "Säkerhetskopiera nu",
    dismiss: "Avfärda",
  },
  sync: {
    pairedTitle: "Ihopkopplad!",
    pairedMessage:
      "Du är nu ihopkopplad med {{partnerName}}. Tryck på ”Synka nu” när du vill för att dela data.",
    completeTitle: "Synk klar",
    completeMessage: "Skickade {{sent}} poster, tog emot {{received}} poster.",
    failedTitle: "Synk misslyckades",
    failedFallback: "Kunde inte ansluta till partnern.",
    unpairedTitle: "Frånkopplad",
    unpairedMessage:
      "Partnersynken har kopplats från. Dina data finns fortfarande på den här enheten.",
    permissionTitle: "Behörighet krävs",
    permissionMessage:
      "Platsbehörighet behövs för att läsa wifi-nätverkets namn för autosynk. Din plats sparas eller delas aldrig.",
    noWifiTitle: "Inget wifi hittades",
    noWifiIos:
      "Kunde inte läsa namnet på ditt wifi-nätverk. Se till att du är ansluten till wifi och kontrollera sedan:\n\n1. Inställningar > Integritet & säkerhet > Platstjänster - slå på för BudgetArk (”När appen används”)\n2. Inställningar > Integritet & säkerhet > Lokalt nätverk - slå på för BudgetArk\n\niOS kräver platsåtkomst för att läsa wifi-namnet. Din plats sparas eller delas aldrig.",
    noWifiAndroid: "Anslut till ditt hemma-wifi först och försök sedan igen.",
    saveHomeNetworkFailedTitle: "Kunde inte spara hemnätverket",
    saveSettingFailedTitle: "Kunde inte spara inställningen",
    saveFailedMessage:
      "BudgetArk kunde inte spara ihopkopplingsinställningarna säkert på den här enheten. Inget ändrades - försök igen.",
    homeNetworkSetTitle: "Hemnätverk valt",
    homeNetworkSetMessage:
      "Autosynk startar när båda enheterna är anslutna till ”{{ssid}}”.",
  },
  reset: {
    incompleteTitle: "Nollställningen är ofullständig",
    incompleteFallback:
      "Vissa data kunde inte rensas. Försök igen eller installera om appen för att slutföra nollställningen.",
    incompleteRetry: "{{message}} Försök med ”Nollställ all data” igen.",
  },
};

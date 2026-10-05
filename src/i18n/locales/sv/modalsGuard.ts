/**
 * BudgetArk - Svenska texter: gemensamma modaler (guard)
 * File: src/i18n/locales/sv/modalsGuard.ts
 *
 * Swedish counterpart of en/modalsGuard.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { modalsGuard as en } from "../en/modalsGuard";

export const modalsGuard: Localized<typeof en> = {
  pairing: {
    title: "Koppla ihop med partner",
    subtitle: "Båda enheterna måste vara på samma wifi-nätverk.",
    roles: {
      show: {
        title: "Visa kod",
        hint: "Skapa en kod som din partner anger",
      },
      enter: {
        title: "Ange kod",
        hint: "Ange koden från din partners enhet",
      },
    },
    portHint:
      "Port: {{port}} - hitta din IP i wifi-inställningarna\noch dela din IP:{{port}} med din partner",
    waiting: "Väntar på partner... {{seconds}} s",
    connecting: "Ansluter...",
    connect: "Anslut",
    discovery: {
      useAutomatic: "Använd automatisk sökning",
      enterManually: "Hittar du inte enheten? Ange IP manuellt",
    },
    verify: {
      heading: "Bekräfta din partner",
      hint: "Båda enheterna ska visa samma kod nedan. Om inte, avbryt och försök koppla ihop igen.",
      match: "Koderna matchar - slutför ihopkopplingen",
      mismatch: "Koderna matchar inte",
    },
    errors: {
      timedOut: "Ihopkopplingen tog för lång tid. Försök igen.",
      failed: "Ihopkopplingen misslyckades",
      codeLength: "Ange koden med {{length}} tecken från din partners enhet.",
      invalidAddress: "Ange en giltig adress (t.ex. 192.168.1.5:12345)",
      connectFailed: "Kunde inte ansluta",
      keystoreUnavailable:
        "BudgetArk kunde inte lagra kopplingsnyckeln säkert på den här enheten (säker nyckellagring ej tillgänglig). Ingenting sparades - försök igen efter att ha startat om appen.",
      saveFailed: "Kunde inte spara ihopkopplingen",
    },
  },
  backup: {
    title: "Automatiska säkerhetskopior",
    closeA11y: "Stäng automatiska säkerhetskopior",
    intro:
      "BudgetArk kan i tysthet spara en krypterad kopia av din data i sitt eget lagringsutrymme på den här telefonen, så att en dålig import eller en oavsiktlig borttagning aldrig blir slutet på historien.",
    toggleLabel: "Automatiska säkerhetskopior",
    statusOn: "{{cadence}}, de 3 senaste sparas",
    statusOff: "Av - bara manuella säkerhetskopior",
    cadence: {
      weekly: "Varje vecka",
      monthly: "Varje månad",
    },
    cadenceA11y: "Säkerhetskopiera {{cadence}}",
    backUpNow: "Säkerhetskopiera nu",
    backedUpNow: "Säkerhetskopierade nyss.",
    sectionTitle: "SÄKERHETSKOPIOR PÅ DEN HÄR TELEFONEN",
    empty: {
      base: "Inga säkerhetskopior än.",
      enabled: " Den första skrivs automatiskt, eller tryck på Säkerhetskopiera nu.",
      disabled: " Slå på automatiska säkerhetskopior eller tryck på Säkerhetskopiera nu.",
    },
    mostRecent: "Senaste",
    olderBackup: "Äldre säkerhetskopia",
    restore: "Återställ",
    restoreHint:
      "Slå ihop lägger till det som saknas och behåller nyare ändringar. Ersätt raderar det som finns på telefonen nu och återställer exakt den här säkerhetskopian.",
    merge: "Slå ihop",
    replace: "Ersätt",
    restored: {
      title: "Säkerhetskopia återställd",
      summary: "Återställde {{parts}}.",
    },
    errors: {
      loadSettings:
        "Kunde inte läsa in inställningarna för säkerhetskopior. Stäng och öppna igen för att försöka på nytt.",
      saveSetting: "Kunde inte spara inställningen. Försök igen.",
      write:
        "Kunde inte skriva säkerhetskopian. Om det fortsätter hända kan telefonens säkra lagring vara otillgänglig.",
      unreadable:
        "Säkerhetskopian kunde inte läsas. Den kan vara skadad eller ha skapats innan appens krypteringsnyckel ändrades.",
      restoreFailed: "Något gick fel vid återställningen.",
    },
  },
  lock: {
    title: "Applås",
    closeA11y: "Stäng applåsinställningarna",
    menuNote: "Applåset är på - BudgetArk frågar efter din {{digits}}-siffriga PIN-kod när appen öppnas.",
    changePin: "Byt PIN-kod",
    turnOff: "Stäng av applåset",
    steps: {
      verify: "Ange din nuvarande PIN-kod",
      confirm: "Ange din nya PIN-kod igen",
      change: "Välj en ny PIN-kod",
      choose: "Välj en PIN-kod",
    },
    lockedOut: "För många försök - försök igen om {{remaining}}",
    newHint: "{{min}}-{{max}} siffror, tryck sedan på ✓",
    confirmHint: "Samma siffror, en gång till",
    saving: "Sparar...",
    privacyNote:
      "Din PIN-kod stannar på den här telefonen - den säkerhetskopieras, exporteras eller synkas aldrig till din partner. Glömmer du den måste du installera om appen och återställa från en säkerhetskopia.",
    mismatch: "PIN-koderna matchade inte - välj PIN-kod igen",
    digitsRange: "Använd {{min}}-{{max}} siffror",
    results: {
      on: {
        title: "Applås på",
        message:
          "BudgetArk frågar efter din PIN-kod när appen öppnas. PIN-koden stannar bara på den här telefonen - glömmer du den måste du installera om appen och återställa från en säkerhetskopia.",
      },
      changed: {
        title: "PIN-kod ändrad",
        message: "Din nya PIN-kod gäller nästa gång appen låses.",
      },
      off: {
        title: "Applås av",
        message: "BudgetArk öppnas utan att fråga efter PIN-kod.",
      },
    },
    errors: {
      savePin: "Kunde inte spara PIN-koden. Försök igen.",
      disable: "Kunde inte stänga av applåset. Försök igen.",
    },
    gate: {
      title: "BudgetArk är låst",
      enterPin: "Ange din PIN-kod",
      forgot: "Glömt din PIN-kod?",
      forgotA11y: "Hjälp vid glömd PIN-kod",
      forgotMessage:
        "Din PIN-kod lagras bara på den här telefonen och kan inte återskapas eller nollställas härifrån.\n\nFör att använda BudgetArk igen, ta bort appen och installera om den. Det raderar datan på den här telefonen, så återställ sedan från en säkerhetskopia - eller synka från din partners enhet om ni är ihopkopplade.",
    },
  },
  pin: {
    dotsA11y: "{{entered}} av {{total}} PIN-siffror angivna",
    confirmA11y: "Bekräfta PIN-kod",
    deleteA11y: "Ta bort sista siffran",
    digitA11y: "Siffra {{digit}}",
  },
  feedback: {
    title: "Skicka feedback",
    subtitle: "Rapportera en bugg eller föreslå en funktion.",
    types: {
      bug: "Buggrapport",
      feature: "Funktionsidé",
    },
    prompt: {
      bug: "VAD HÄNDE?",
      feature: "VAD SKULLE DU VILJA SE?",
    },
    placeholder: {
      bug: "Beskriv buggen - vad du förväntade dig och vad som hände...",
      feature: "Beskriv funktionen du önskar...",
    },
    autoAttached: "BIFOGAS AUTOMATISKT",
    sendEmail: "Skicka via e-post",
    openGithub: "Öppna GitHub Issues",
    chooseApp: "Välj e-postapp",
    thanks: {
      title: "Tack!",
      message: "Din feedback gör BudgetArk bättre.",
    },
    noEmailApp: {
      title: "Ingen e-postapp",
      message:
        "Ingen e-postapp hittades. Du kan skicka feedback till {{email}} eller öppna ett ärende på GitHub.",
    },
    linkFailed: {
      title: "Kunde inte öppna länken",
      message: "Gå till {{url}} i din webbläsare för att skapa ett ärende.",
    },
    template: {
      bug: {
        whatHappened: "VAD HÄNDE",
        steps: "STEG FÖR ATT ÅTERSKAPA",
        expected: "VAD JAG FÖRVÄNTADE MIG I STÄLLET",
        howOften: "HUR OFTA HÄNDER DET? (varje gång / ibland / en gång)",
        screenshots: "SKÄRMBILDER (bifoga nedan om du har några)",
      },
      feature: {
        idea: "FUNKTIONSIDÉ",
        problem: "VILKET PROBLEM SKULLE DET LÖSA FÖR DIG?",
        howItWorks: "HUR SKA DET FUNGERA?",
      },
    },
  },
};

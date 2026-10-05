/**
 * BudgetArk - Svenska texter: gemensamma modaler (engage)
 * File: src/i18n/locales/sv/modalsEngage.ts
 *
 * Swedish counterpart of en/modalsEngage.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { modalsEngage as en } from "../en/modalsEngage";

export const modalsEngage: Localized<typeof en> = {
  tipJar: {
    title: "Dricksburk",
    intro:
      "Om BudgetArk har hjälpt dig kan du lämna en liten engångsdricks. Det är helt frivilligt och låser inte upp något - alla funktioner förblir gratis för alla.",
    tiers: {
      small: "Liten dricks",
      medium: "Mellanstor dricks",
      large: "Stor dricks",
    },
    store: {
      ios: "App Store",
      android: "Google Play",
    },
    contacting: "Kontaktar {{store}}...",
    unavailable:
      "Dricks är inte tillgänglig just nu. Försök igen senare.",
    pendingApproval:
      "Din dricks väntar på godkännande från {{store}}. Tack!",
    purchaseFailed: "Köpet kunde inte slutföras.",
    privacy:
      "Dricks hanteras helt av {{store}}. BudgetArk ser, samlar in eller lagrar aldrig några betalningsuppgifter.",
    thanks: {
      title: "Tack!",
      body: "Din dricks hjälper BudgetArk att hålla kursen. Ingenting ändrades i appen - den var redan helt din.",
      logged:
        "🎁 Tillagd i din budget under Gåvor. Du kan redigera eller ta bort den där som vilken annan post som helst.",
      logPrompt:
        "Vill du räkna med dricksen i din budget? Den läggs till som en utgift på {{price}} idag under kategorin Gåvor.",
      logButton: "Lägg till i budget · Gåvor 🎁",
      logFailed:
        "Kunde inte spara posten. Försök igen eller lägg till den senare från fliken Budget.",
      noThanks: "Nej tack",
    },
  },
  reminders: {
    title: "Loggpåminnelser",
    intro:
      "Milda knuffar som håller din budget ärlig - en avstämning när du varit tyst ett tag och en påminnelse vid ny månad om att planera framåt.",
    enable: {
      label: "Aktivera påminnelser",
      on: "Schemalagda på den här enheten utifrån din egen aktivitet",
      off: "Inga påminnelser schemalagda",
    },
    permission: {
      title: "Aviseringar är av",
      body: "BudgetArk behöver tillstånd för aviseringar för att skicka avstämningspåminnelser. Du kan slå på det i telefonens inställningar.",
      notNow: "Inte nu",
      openSettings: "Öppna inställningar",
    },
    sections: {
      remindAbout: "PÅMINN MIG OM",
      afterQuietFor: "EFTER ATT INTE HA LOGGAT PÅ",
      timeOfDay: "TID PÅ DAGEN",
    },
    checkIns: {
      label: "Logga utgifter",
      description:
        "När du inte loggat på ett tag - att logga en post nollställer timern",
    },
    monthStart: {
      label: "Planering vid månadsstart",
      description:
        "Den 1:a: sätt månadens mål och gå igenom förra månaden",
    },
    cadence: {
      "1": "Dagligen",
      "3": "Var tredje dag",
      "7": "Varje vecka",
    },
    hour: {
      "9": "Morgon",
      "13": "Eftermiddag",
      "19": "Kväll",
    },
    privacy:
      "Avstämningarna schemaläggs helt på den här enheten och innehåller inga belopp eller kontouppgifter. Ingenting skickas någonstans - BudgetArk har ingen server.",
  },
  spotlight: {
    newIn: "NYTT I {{version}}",
    fullReleaseNotes: "Fullständig versionsinformation",
    fullReleaseNotesA11y: "Öppna fullständig versionsinformation",
    skipA11y: "Hoppa över uppdateringsnyheterna",
    nextA11y: "Nästa funktion",
    browseGuide: "Bläddra bland alla funktioner i guiden",
    browseGuideA11y: "Öppna funktionsguiden",
  },
  /** Funktionsguiden (FeatureGuideModal): den bläddrings- och sökbara katalogen över alla funktioner. */
  featureGuide: {
    title: "Funktionsguide",
    intro:
      "Allt BudgetArk kan göra, per flik. Tryck på en funktion för att se var den finns och hur du använder den.",
    searchPlaceholder: "Sök - prova ”kvitto” eller ”lön”",
    clearSearchA11y: "Rensa sökningen",
    noMatches: {
      title: "Inga träffar",
      body: "Prova ett annat ord - t.ex. ”bank”, ”räkning”, ”mål” eller namnet på en flik.",
    },
    howTo: "Så här använder du den",
    newIn: "Nytt i {{version}}",
    expandA11y: "Visa hur du använder {{title}}",
    collapseA11y: "Dölj stegen för {{title}}",
    areas: {
      debts: "Skulder",
      budget: "Budget",
      bridge: "Bryggan",
      charts: "Sjökort",
      profile: "Profil",
    },
  },
  guide: {
    title: "Introduktion",
    intro:
      "Allt i BudgetArk - bläddra per flik eller sök efter det du vill göra.",
    searchPlaceholder: "Sök - prova ”kvitto” eller ”kreditkort”",
    clearSearchA11y: "Rensa sökningen",
    noMatches: {
      title: "Inga träffar",
      body: "Prova ett annat ord - t.ex. ”säkerhetskopia”, ”avisering”, ”återkommande” eller namnet på en flik.",
    },
    redoOnboarding: "Gör om introduktionen",
  },
  unlock: {
    kicker: "MÄRKE UPPLÅST",
    moreToCelebrate_one: "+{{count}} till att fira",
    moreToCelebrate_other: "+{{count}} till att fira",
    nextBadge: "Nästa märke",
    keepGoing: "Fortsätt",
  },
  newBadge: "NYTT",
  updateReady: {
    title: "Uppdatering klar",
    defaultMessage: "En ny uppdatering är klar att installera.",
    moreInReleaseNotes: "+{{n}} till i versionsinformationen",
    published: "Publicerad {{when}}",
    later: "Senare",
    installNow: "Installera nu",
  },
  whatsNew: {
    title: "Nytt i v{{version}}",
    more: "+{{n}} till",
    seeWhatsNew: "Se nyheterna",
    maybeLater: "Kanske senare",
  },
};

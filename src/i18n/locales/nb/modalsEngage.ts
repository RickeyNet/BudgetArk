/**
 * BudgetArk - Norske tekster: felles modaler (engage)
 * File: src/i18n/locales/nb/modalsEngage.ts
 *
 * Norwegian (Bokmål) counterpart of en/modalsEngage.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { modalsEngage as en } from "../en/modalsEngage";

export const modalsEngage: Localized<typeof en> = {
  tipJar: {
    title: "Tipsboks",
    intro:
      "Hvis BudgetArk har hjulpet deg, kan du legge igjen et lite engangstips. Det er helt frivillig og låser ikke opp noe - alle funksjoner forblir gratis for alle.",
    tiers: {
      small: "Lite tips",
      medium: "Middels tips",
      large: "Stort tips",
    },
    store: {
      ios: "App Store",
      android: "Google Play",
    },
    contacting: "Kontakter {{store}}...",
    unavailable:
      "Tips er ikke tilgjengelig akkurat nå. Prøv igjen senere.",
    pendingApproval:
      "Tipset ditt venter på godkjenning fra {{store}}. Takk!",
    purchaseFailed: "Kjøpet kunne ikke fullføres.",
    privacy:
      "Tips behandles i sin helhet av {{store}}. BudgetArk ser, samler inn eller lagrer aldri noen betalingsopplysninger.",
    thanks: {
      title: "Tusen takk!",
      body: "Tipset ditt hjelper BudgetArk å holde kursen. Ingenting ble endret i appen - den var allerede helt din.",
      logged:
        "🎁 Lagt til i budsjettet ditt under Gaver. Du kan redigere eller fjerne det der som enhver annen post.",
      logPrompt:
        "Vil du telle dette tipset i budsjettet? Det legges til som en utgift på {{price}} i dag under kategorien Gaver.",
      logButton: "Legg til i budsjett · Gaver 🎁",
      logFailed:
        "Kunne ikke lagre posten. Du kan prøve igjen, eller legge den til senere fra Budsjett-fanen.",
      noThanks: "Nei takk",
    },
  },
  reminders: {
    title: "Loggpåminnelser",
    intro:
      "Milde dult som holder budsjettet ærlig - en avstemming når du har vært stille en stund, og en påminnelse ved ny måned om å planlegge fremover.",
    enable: {
      label: "Slå på påminnelser",
      on: "Planlagt på denne enheten ut fra din egen aktivitet",
      off: "Ingen påminnelser planlagt",
    },
    permission: {
      title: "Varsler er av",
      body: "BudgetArk trenger tillatelse til varsler for å sende avstemmingspåminnelser. Du kan slå det på i telefonens innstillinger.",
      notNow: "Ikke nå",
      openSettings: "Åpne innstillinger",
    },
    sections: {
      remindAbout: "MINN MEG PÅ",
      afterQuietFor: "ETTER IKKE Å HA LOGGET I",
      timeOfDay: "TID PÅ DAGEN",
    },
    checkIns: {
      label: "Logge utgifter",
      description:
        "Når du ikke har logget en stund - å logge en post nullstiller tidtakeren",
    },
    monthStart: {
      label: "Planlegging ved månedsstart",
      description:
        "Den 1. i måneden: sett månedens mål og gå gjennom forrige måned",
    },
    cadence: {
      "1": "Daglig",
      "3": "Hver 3. dag",
      "7": "Ukentlig",
    },
    hour: {
      "9": "Morgen",
      "13": "Ettermiddag",
      "19": "Kveld",
    },
    privacy:
      "Avstemmingene planlegges helt på denne enheten og inneholder ingen beløp eller kontoopplysninger. Ingenting sendes noe sted - BudgetArk har ingen server.",
  },
  spotlight: {
    newIn: "NYTT I {{version}}",
    fullReleaseNotes: "Full versjonsinformasjon",
    fullReleaseNotesA11y: "Åpne full versjonsinformasjon",
    skipA11y: "Hopp over funksjonsomvisningen",
    nextA11y: "Neste funksjon",
  },
  guide: {
    title: "Introduksjon",
    intro:
      "Alt i BudgetArk - bla per fane, eller søk etter det du vil gjøre.",
    searchPlaceholder: "Søk - prøv «kvittering» eller «kredittkort»",
    clearSearchA11y: "Tøm søket",
    noMatches: {
      title: "Ingen treff",
      body: "Prøv et annet ord - f.eks. «sikkerhetskopi», «varsel», «gjentakende» eller navnet på en fane.",
    },
    redoOnboarding: "Ta introduksjonen på nytt",
  },
  unlock: {
    kicker: "MERKE LÅST OPP",
    moreToCelebrate_one: "+{{count}} til å feire",
    moreToCelebrate_other: "+{{count}} til å feire",
    nextBadge: "Neste merke",
    keepGoing: "Fortsett",
  },
  newBadge: "NYTT",
  updateReady: {
    title: "Oppdatering klar",
    defaultMessage: "En ny oppdatering er klar til å installeres.",
    moreInReleaseNotes: "+{{n}} til i versjonsinformasjonen",
    published: "Publisert {{when}}",
    later: "Senere",
    installNow: "Installer nå",
  },
  whatsNew: {
    title: "Nytt i v{{version}}",
    more: "+{{n}} til",
    seeWhatsNew: "Se hva som er nytt",
    maybeLater: "Kanskje senere",
  },
};

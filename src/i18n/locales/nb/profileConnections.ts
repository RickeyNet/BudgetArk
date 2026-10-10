/**
 * BudgetArk - Norske tekster: Profil (connections)
 * File: src/i18n/locales/nb/profileConnections.ts
 *
 * Norwegian (Bokmål) counterpart of en/profileConnections.ts. Informal "du"
 * throughout; see src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { profileConnections as en } from "../en/profileConnections";

export const profileConnections: Localized<typeof en> = {
  banks: {
    sectionTitle: "TILKOBLINGER",
    bankConnections: "Banktilkoblinger",
    needsAttention: "Trenger oppfølging",
    importPrompt: "Importer transaksjoner fra banken din",
    connectedCount_one: "{{count}} tilkoblet",
    connectedCount_other: "{{count}} tilkoblet",
    reviewInbox: "Gjennomgangsinnboks",
    waiting_one: "{{count}} transaksjon venter",
    waiting_other: "{{count}} transaksjoner venter",
    nothingToReview: "Ingenting å gjennomgå",
    disclosure: {
      notNow: "Ikke nå",
      continue: "Fortsett",
    },
  },
  /** Bridge/Budget banner when a bank connection needs the user. */
  banner: {
    title: "En banktilkobling trenger oppfølging",
    body: "En bank trenger ny innlogging, eller siste synk mislyktes. Åpne Banktilkoblinger for å fikse det.",
    open: "Åpne",
    later: "Senere",
  },
  partnerSync: {
    sectionTitle: "PARTNERSYNK",
    pair: "Koble sammen med partner",
    pairSubtext: "Synk budsjetter over wifi - ingen konto nødvendig",
    autoSyncStatus: "Autosynk {{state}} · «{{ssid}}»",
    setHomeWifi: "Trykk for å velge hjemme-wifi for autosynk",
    disable: "Deaktiver",
    enable: "Aktiver",
    syncNow: "Synk nå",
    discovering: "Ser etter partner...",
    connecting: "Kobler til...",
    syncing: "Synker data...",
    lastSynced: "Sist synket {{when}}",
    neverSynced: "Aldri synket",
    recentActivity: "Siste aktivitet",
    activityRow: "{{when}} · {{received}} fra {{partner}}",
    activitySent: " · sendte {{count}}",
    unpair: "Koble fra",
    unpairConfirm: {
      title: "Koble fra enhet",
      message:
        "Dette kobler fra partnersynken. Dataene dine blir på denne enheten, men du må koble sammen igjen for å synke.",
    },
  },
  people: {
    sectionTitle: "PERSONER",
    manageA11y: "Administrer personer",
    people: "Personer 👤",
    peopleSubtext: "Tilordne forbruk til medlemmer av husholdningen",
    reportA11y: "Åpne rapporten over forbruk per person",
    report: "Forbruksrapport per person",
    reportSubtext: "Summer per person og år, med CSV-eksport",
    owedA11y: "Åpne Til gode",
    owed: "Til gode 🤝",
    owedSubtext: "Penger du har lånt ut, og hva som er betalt tilbake",
  },
};

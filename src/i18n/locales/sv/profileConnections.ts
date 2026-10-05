/**
 * BudgetArk - Svenska texter: Profil (connections)
 * File: src/i18n/locales/sv/profileConnections.ts
 *
 * Swedish counterpart of en/profileConnections.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { profileConnections as en } from "../en/profileConnections";

export const profileConnections: Localized<typeof en> = {
  banks: {
    sectionTitle: "KOPPLINGAR",
    bankConnections: "Bankkopplingar",
    needsAttention: "Behöver åtgärdas",
    importPrompt: "Importera transaktioner från din bank",
    connectedCount_one: "{{count}} kopplad",
    connectedCount_other: "{{count}} kopplade",
    reviewInbox: "Granskningsinkorg",
    waiting_one: "{{count}} transaktion väntar",
    waiting_other: "{{count}} transaktioner väntar",
    nothingToReview: "Inget att granska",
    disclosure: {
      notNow: "Inte nu",
      continue: "Fortsätt",
    },
  },
  partnerSync: {
    sectionTitle: "PARTNERSYNK",
    pair: "Koppla ihop med partner",
    pairSubtext: "Synka budgetar över wifi - inget konto krävs",
    autoSyncStatus: "Autosynk {{state}} · ”{{ssid}}”",
    setHomeWifi: "Tryck för att välja hemma-wifi för autosynk",
    disable: "Inaktivera",
    enable: "Aktivera",
    syncNow: "Synka nu",
    discovering: "Letar efter partner...",
    connecting: "Ansluter...",
    syncing: "Synkar data...",
    lastSynced: "Senast synkad {{when}}",
    neverSynced: "Aldrig synkad",
    recentActivity: "Senaste aktivitet",
    activityRow: "{{when}} · {{received}} från {{partner}}",
    activitySent: " · skickade {{count}}",
    unpair: "Koppla från",
    unpairConfirm: {
      title: "Koppla från enhet",
      message:
        "Det här kopplar från partnersynken. Din data blir kvar på den här enheten, men du måste koppla ihop igen för att synka.",
    },
  },
  people: {
    sectionTitle: "PERSONER",
    manageA11y: "Hantera personer",
    people: "Personer 👤",
    peopleSubtext: "Tilldela utgifter till hushållets medlemmar",
    reportA11y: "Öppna rapporten över utgifter per person",
    report: "Utgiftsrapport per person",
    reportSubtext: "Summor per person och år, med CSV-export",
    owedA11y: "Öppna Att få tillbaka",
    owed: "Att få tillbaka 🤝",
    owedSubtext: "Pengar du lånat ut och vad som betalats tillbaka",
  },
};

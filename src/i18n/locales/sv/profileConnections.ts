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
    waiting_one: "{{count}} transaktion väntar",
    waiting_other: "{{count}} transaktioner väntar",
    disclosure: {
      notNow: "Inte nu",
      continue: "Fortsätt",
    },
  },
  /** Bridge/Budget banner when a bank connection needs the user. */
  banner: {
    title: "En bankkoppling behöver åtgärdas",
    body: "En bank behöver en ny inloggning eller så misslyckades senaste synken. Öppna Bankkopplingar för att fixa det.",
    open: "Öppna",
    later: "Senare",
  },
  partnerSync: {
    sectionTitle: "PARTNERSYNK",
    pair: "Koppla ihop med partner",
    pairSubtext: "Synka budgetar över wifi - inget konto krävs",
    autoSyncStatus: "Autosynk {{state}} · ”{{ssid}}”",
    /** Sync Now row subtext: partner name + the sync status / last-synced line. */
    statusWithPartner: "{{partner}} · {{status}}",
    /** Overflow (⋯) button + its sheet: home Wi-Fi and unpair. */
    options: "Synkalternativ",
    homeWifi: "Hemma-wifi",
    homeWifiUnset: "Inte valt · tryck för att använda nätverket du är på",
    /** Auto-sync pill on the Sync Now row (shown once a home Wi-Fi is set). */
    autoOn: "Auto på",
    autoOff: "Auto av",
    autoA11y: "Autosynk på hemma-wifi",
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
    manageA11y: "Hantera personer",
    people: "Personer 👤",
    peopleSubtext: "Hushållets medlemmar, vem som spenderat vad och pengar du ska få tillbaka",
  },
};

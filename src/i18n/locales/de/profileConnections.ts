/**
 * BudgetArk - Deutsche Texte: Profil (connections)
 * File: src/i18n/locales/de/profileConnections.ts
 *
 * German counterpart of en/profileConnections.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { profileConnections as en } from "../en/profileConnections";

export const profileConnections: Localized<typeof en> = {
  banks: {
    sectionTitle: "VERBINDUNGEN",
    bankConnections: "Bankverbindungen",
    needsAttention: "Braucht Aufmerksamkeit",
    importPrompt: "Umsätze von deiner Bank importieren",
    connectedCount_one: "{{count}} verbunden",
    connectedCount_other: "{{count}} verbunden",
    waiting_one: "{{count}} Umsatz wartet",
    waiting_other: "{{count}} Umsätze warten",
    disclosure: {
      notNow: "Jetzt nicht",
      continue: "Fortfahren",
    },
  },
  /** Bridge/Budget banner when a bank connection needs the user. */
  banner: {
    title: "Eine Bankverbindung braucht Aufmerksamkeit",
    body: "Eine Bank braucht eine neue Anmeldung oder der letzte Sync ist fehlgeschlagen. Öffne die Bankverbindungen, um das zu beheben.",
    open: "Öffnen",
    later: "Später",
  },
  partnerSync: {
    sectionTitle: "PARTNER-SYNC",
    pair: "Mit Partner koppeln",
    pairSubtext: "Budgets über WLAN synchronisieren - kein Konto nötig",
    autoSyncStatus: "Auto-Sync {{state}} · \"{{ssid}}\"",
    /** Sync Now row subtext: partner name + the sync status / last-synced line. */
    statusWithPartner: "{{partner}} · {{status}}",
    /** Overflow (⋯) button + its sheet: home Wi-Fi and unpair. */
    options: "Sync-Optionen",
    homeWifi: "Heim-WLAN",
    homeWifiUnset: "Nicht festgelegt · tippen, um das aktuelle Netzwerk zu nehmen",
    /** Auto-sync pill on the Sync Now row (shown once a home Wi-Fi is set). */
    autoOn: "Auto ein",
    autoOff: "Auto aus",
    autoA11y: "Auto-Sync im Heim-WLAN",
    syncNow: "Jetzt synchronisieren",
    discovering: "Suche Partner...",
    connecting: "Verbinde...",
    syncing: "Synchronisiere Daten...",
    lastSynced: "Zuletzt synchronisiert {{when}}",
    neverSynced: "Noch nie synchronisiert",
    recentActivity: "Letzte Aktivität",
    activityRow: "{{when}} · {{received}} von {{partner}}",
    activitySent: " · {{count}} gesendet",
    unpair: "Entkoppeln",
    unpairConfirm: {
      title: "Gerät entkoppeln",
      message:
        "Der Partner-Sync wird getrennt. Deine Daten bleiben auf diesem Gerät, aber zum Synchronisieren musst du erneut koppeln.",
    },
  },
  people: {
    manageA11y: "Personen verwalten",
    people: "Personen 👤",
    peopleSubtext: "Haushaltsmitglieder, wer was ausgegeben hat und was dir geschuldet wird",
  },
};

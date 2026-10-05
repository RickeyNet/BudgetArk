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
    reviewInbox: "Prüfposteingang",
    waiting_one: "{{count}} Umsatz wartet",
    waiting_other: "{{count}} Umsätze warten",
    nothingToReview: "Nichts zu prüfen",
    disclosure: {
      notNow: "Jetzt nicht",
      continue: "Fortfahren",
    },
  },
  partnerSync: {
    sectionTitle: "PARTNER-SYNC",
    pair: "Mit Partner koppeln",
    pairSubtext: "Budgets über WLAN synchronisieren - kein Konto nötig",
    autoSyncStatus: "Auto-Sync {{state}} · \"{{ssid}}\"",
    setHomeWifi: "Tippen, um das Heim-WLAN für Auto-Sync festzulegen",
    disable: "Deaktivieren",
    enable: "Aktivieren",
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
    sectionTitle: "PERSONEN",
    manageA11y: "Personen verwalten",
    people: "Personen 👤",
    peopleSubtext: "Ausgaben Haushaltsmitgliedern zuordnen",
    reportA11y: "Ausgabenbericht pro Person öffnen",
    report: "Ausgabenbericht pro Person",
    reportSubtext: "Summen pro Person und Jahr, mit CSV-Export",
    owedA11y: "Ausstehende Rückzahlungen öffnen",
    owed: "Dir geschuldet 🤝",
    owedSubtext: "Verliehenes Geld und was schon zurückgezahlt wurde",
  },
};

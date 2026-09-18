/**
 * BudgetArk - Deutsche Texte: Profil (main)
 * File: src/i18n/locales/de/profileMain.ts
 *
 * German counterpart of en/profileMain.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { profileMain as en } from "../en/profileMain";

export const profileMain: Localized<typeof en> = {
  header: {
    title: "Profil",
    subtitle: "Die Einstellungen deines anonymen Kontos.",
  },
  loading: {
    loading: "Profil wird geladen...",
    failedTitle: "Profil konnte nicht geladen werden",
    failedBody:
      "BudgetArk konnte die gespeicherten Daten auf diesem Gerät nicht lesen. Das kann passieren, wenn der Speicher des Telefons fast voll ist. Deine Daten wurden nicht verändert.",
    tryAgain: "Erneut versuchen",
    tryAgainA11y: "Erneut versuchen",
  },
  appVersion: "BudgetArk v{{version}}",
  card: {
    editHint: "{{idPrefix}}... · Zum Bearbeiten auf den Namen tippen",
  },
  mission: {
    a11yExpanded: "Leitbild, ausgeklappt",
    a11yCollapsed: "Leitbild, eingeklappt",
  },
  progress: {
    sectionTitle: "FORTSCHRITT",
    shipsLog: "Logbuch",
    shipsLogA11y: "Logbuch mit Erfolgen öffnen",
    earned: "{{unlocked}}/{{total}} Erfolge freigeschaltet",
  },
  backupBanner: {
    upgradedTitle: "Du hast auf v{{version}} aktualisiert",
    upgradedBody:
      "Deine letzte Sicherung stammt aus v{{lastVersion}}. Erstelle eine neue, damit du jederzeit aus dieser Version wiederherstellen kannst.",
    noBackupTitle: "Noch keine Sicherung",
    noBackupBody:
      "Exportiere deine Daten, damit du einen Wiederherstellungspunkt hast, falls deinem Gerät je etwas passiert.",
    backUpNow: "Jetzt sichern",
    dismiss: "Ausblenden",
  },
  sync: {
    pairedTitle: "Gekoppelt!",
    pairedMessage:
      "Du bist jetzt mit {{partnerName}} gekoppelt. Tippe jederzeit auf „Jetzt synchronisieren“, um Daten zu teilen.",
    completeTitle: "Sync abgeschlossen",
    completeMessage: "{{sent}} Datensätze gesendet, {{received}} Datensätze empfangen.",
    failedTitle: "Sync fehlgeschlagen",
    failedFallback: "Verbindung zum Partner nicht möglich.",
    unpairedTitle: "Entkoppelt",
    unpairedMessage:
      "Partner-Sync wurde getrennt. Deine Daten sind weiterhin auf diesem Gerät.",
    permissionTitle: "Berechtigung erforderlich",
    permissionMessage:
      "Die Standortberechtigung wird benötigt, um den WLAN-Namen für den Auto-Sync zu lesen. Dein Standort wird nie gespeichert oder geteilt.",
    noWifiTitle: "Kein WLAN erkannt",
    noWifiIos:
      "Der WLAN-Name konnte nicht gelesen werden. Stelle sicher, dass du mit dem WLAN verbunden bist, und prüfe dann:\n\n1. Einstellungen > Datenschutz & Sicherheit > Ortungsdienste - für BudgetArk einschalten („Beim Verwenden“)\n2. Einstellungen > Datenschutz & Sicherheit > Lokales Netzwerk - für BudgetArk einschalten\n\niOS braucht den Standortzugriff, um den WLAN-Namen zu lesen. Dein Standort wird nie gespeichert oder geteilt.",
    noWifiAndroid: "Verbinde dich zuerst mit deinem Heim-WLAN und versuche es dann erneut.",
    saveHomeNetworkFailedTitle: "Heimnetzwerk konnte nicht gespeichert werden",
    saveSettingFailedTitle: "Einstellung konnte nicht gespeichert werden",
    saveFailedMessage:
      "BudgetArk konnte die Kopplungseinstellungen auf diesem Gerät nicht sicher speichern. Es wurde nichts geändert - bitte versuche es erneut.",
    homeNetworkSetTitle: "Heimnetzwerk festgelegt",
    homeNetworkSetMessage:
      "Der Auto-Sync startet, wenn beide Geräte mit „{{ssid}}“ verbunden sind.",
  },
  reset: {
    incompleteTitle: "Zurücksetzen unvollständig",
    incompleteFallback:
      "Einige Daten konnten nicht gelöscht werden. Versuche es erneut oder installiere die App neu, um das Zurücksetzen abzuschließen.",
    incompleteRetry: "{{message}} Bitte versuche „Alle Daten zurücksetzen“ erneut.",
  },
};

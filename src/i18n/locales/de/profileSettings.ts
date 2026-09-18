/**
 * BudgetArk - Deutsche Texte: Profil (settings)
 * File: src/i18n/locales/de/profileSettings.ts
 *
 * German counterpart of en/profileSettings.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { profileSettings as en } from "../en/profileSettings";

export const profileSettings: Localized<typeof en> = {
  sectionTitle: "EINSTELLUNGEN",
  notNow: "Jetzt nicht",
  currency: {
    label: "Währung",
    pickerTitle: "Währung & Region",
  },
  currencyChange: {
    title: "Währung ändern",
    pairedMessage:
      "Der Wechsel zu {{to}} ändert das Währungssymbol, deine Beträge bleiben aber dieselben Zahlen. Deine Daten sind mit einem gekoppelten Partner synchronisiert, deshalb können Beträge nicht automatisch umgerechnet werden - entkopple zuerst, wenn du sie umrechnen möchtest.",
    fetchingRate: "Aktueller Wechselkurs wird geladen...",
    convertQuestion:
      "Deine bestehenden Beträge von {{from}} in {{to}} zum unten stehenden Kurs umrechnen, oder nur das Symbol ändern und die Zahlen behalten?",
    rateToday: "Kurs von heute",
    rateCached: "Kurse vom {{when}} (aktuelle Kurse nicht erreichbar)",
    rateOffline: "Offline - eingebaute Schätzung wird verwendet",
    rateLine: "{{prefix}}: 1 {{from}} = {{rate}} {{to}}",
    convertButton: "Meine Beträge umrechnen",
    symbolOnlyPaired: "Nur Symbol ändern",
    symbolOnly: "Nur das Symbol ändern",
  },
  privacy: {
    label: "Privatsphäre-Modus",
    enabled: "Screenshots & Bildschirmaufnahmen blockiert",
    disabled: "Screenshots & Bildschirmaufnahmen erlaubt",
    onTitle: "Privatsphäre-Modus ein",
    offTitle: "Privatsphäre-Modus aus",
    onMessage: "Screenshots und Bildschirmaufnahmen sind jetzt blockiert.",
    offMessage: "Der Schutz vor Screenshots und Bildschirmaufnahmen ist deaktiviert.",
  },
  appLock: {
    label: "App-Sperre",
    enabled: "PIN beim Öffnen der App erforderlich",
    disabled: "Beim Öffnen der App nach einer PIN fragen",
  },
  holdings: {
    label: "Live-Wertpapiere",
    enabled: "Aktien & ETFs werden im Nettovermögen erfasst",
    disabled: "Aktien & ETFs im Nettovermögen erfassen",
    enabledTitle: "Live-Wertpapiere ein",
    enabledMessage:
      "Füge Aktien und ETFs über den Tab „Brücke“ hinzu. Kurse werden etwa einmal täglich aktualisiert.",
    enable: "Aktivieren",
  },
  haptics: {
    label: "Haptisches Feedback",
    enabled: "Leichte Vibrationen bei wichtigen Aktionen",
    disabled: "Vibrationen deaktiviert",
  },
  reminders: {
    label: "Erinnerungen",
    off: "Anstöße, Ausgaben zu erfassen & jeden Monat zu planen",
    afterQuietDays_one: "Nach einem ruhigen Tag",
    afterQuietDays_other: "Nach {{count}} ruhigen Tagen",
    afterQuietWeek: "Nach einer ruhigen Woche",
    checkInsAndMonthStart: "Check-ins & Planung zum Monatsanfang",
    monthStart: "Planung zum Monatsanfang",
    nothingSelected: "Nichts ausgewählt",
    mornings: "morgens",
    afternoons: "nachmittags",
    evenings: "abends",
    summary: "{{what}} · {{when}}",
  },
  updates: {
    checkLabel: "Nach Updates suchen",
    lastChecked: "Zuletzt geprüft {{when}}",
    neverChecked: "Noch nie geprüft",
    autoLabel: "Automatische Updates",
    autoOff: "Aus - nur manuelle Prüfung",
    autoOn: "Ein - prüft automatisch",
    unavailableTitle: "Updates nicht verfügbar",
    unavailableMessage:
      "In Entwicklungs-Builds ist die Update-Prüfung nicht verfügbar. Installiere einen EAS-Preview- oder Produktions-Build, um diese Funktion zu nutzen.",
    upToDateTitle: "Auf dem neuesten Stand",
    upToDateMessage: "Derzeit ist kein Update verfügbar. Zuletzt geprüft {{when}}.",
    rejectedTitle: "Update abgelehnt",
    rejectedMessage:
      "Dieses Update wurde abgelehnt, weil es auf eine ältere Laufzeitversion zielt. Das kann auf einen Rollback-Versuch hindeuten.",
    failedTitle: "Update-Prüfung fehlgeschlagen",
    failedNetwork:
      "Der Update-Server ist nicht erreichbar. Prüfe deine Internetverbindung und versuche es erneut.",
    failedGeneric: "Updates können gerade nicht geprüft werden. Bitte versuche es in Kürze erneut.",
    failedDetails: "{{friendly}}\n\nDetails: {{details}}",
    modeSavedTitle: "Update-Modus gespeichert",
    modeManualMessage:
      "Manueller Modus ist ein. Die App sucht nur nach Updates, wenn du auf „Nach Updates suchen“ tippst.",
    modeAutoMessage: "Automatische Update-Prüfung ist aktiviert.",
    readyTitle: "Update bereit",
    readyMessage: "Ein neues Update ist bereit zur Installation.",
    published: "Veröffentlicht {{when}}",
    later: "Später",
    installNow: "Jetzt installieren",
    installFailedTitle: "Installation fehlgeschlagen",
    installFailedMessage:
      "Das Update konnte gerade nicht angewendet werden. Bitte versuche es erneut.",
  },
};

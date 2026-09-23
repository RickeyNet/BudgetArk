/**
 * BudgetArk - Deutsche Texte: gemeinsame Modals (engage)
 * File: src/i18n/locales/de/modalsEngage.ts
 *
 * German counterpart of en/modalsEngage.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { modalsEngage as en } from "../en/modalsEngage";

export const modalsEngage: Localized<typeof en> = {
  tipJar: {
    title: "Trinkgeldkasse",
    intro:
      "Wenn dir BudgetArk geholfen hat, kannst du ein kleines einmaliges Trinkgeld dalassen. Das ist völlig freiwillig und schaltet nichts frei - alle Funktionen bleiben für alle kostenlos.",
    tiers: {
      small: "Kleines Trinkgeld",
      medium: "Mittleres Trinkgeld",
      large: "Großes Trinkgeld",
    },
    store: {
      ios: "den App Store",
      android: "Google Play",
    },
    contacting: "Verbinde mit {{store}}...",
    unavailable:
      "Trinkgelder sind gerade nicht verfügbar. Bitte versuch es später noch einmal.",
    pendingApproval:
      "Dein Trinkgeld wartet auf die Freigabe durch {{store}}. Danke!",
    purchaseFailed: "Der Kauf konnte nicht abgeschlossen werden.",
    privacy:
      "Trinkgelder werden vollständig über {{store}} abgewickelt. BudgetArk sieht, sammelt oder speichert keine Zahlungsdaten.",
    thanks: {
      title: "Danke!",
      body: "Dein Trinkgeld hält BudgetArk auf Kurs. In der App hat sich nichts geändert - sie gehörte dir schon vorher ganz.",
      logged:
        "🎁 Als Buchung unter Spenden in deinem Budget hinzugefügt. Dort kannst du sie wie jede andere Buchung bearbeiten oder löschen.",
      logPrompt:
        "Möchtest du dieses Trinkgeld in deinem Budget mitzählen? Es wird heute als Ausgabe über {{price}} in der Kategorie Spenden eingetragen.",
      logButton: "Zum Budget · Spenden 🎁",
      logFailed:
        "Die Buchung konnte nicht gespeichert werden. Versuch es noch einmal oder trag sie später im Budget-Tab ein.",
      noThanks: "Nein danke",
    },
  },
  reminders: {
    title: "Erinnerungen",
    intro:
      "Sanfte Anstöße, die dein Budget ehrlich halten - ein Check-in, wenn du länger nichts erfasst hast, und eine Erinnerung zum Monatsstart, um vorauszuplanen.",
    enable: {
      label: "Erinnerungen aktivieren",
      on: "Auf diesem Gerät anhand deiner eigenen Aktivität geplant",
      off: "Keine Erinnerungen geplant",
    },
    permission: {
      title: "Benachrichtigungen sind aus",
      body: "BudgetArk braucht die Berechtigung für Benachrichtigungen, um Check-in-Erinnerungen zu senden. Du kannst sie in den Einstellungen deines Telefons aktivieren.",
      notNow: "Jetzt nicht",
      openSettings: "Einstellungen öffnen",
    },
    sections: {
      remindAbout: "ERINNERE MICH AN",
      afterQuietFor: "WENN NICHTS ERFASST SEIT",
      timeOfDay: "TAGESZEIT",
    },
    checkIns: {
      label: "Ausgaben erfassen",
      description:
        "Wenn du eine Weile nichts erfasst hast - jede neue Buchung setzt den Zähler zurück",
    },
    monthStart: {
      label: "Planung zum Monatsstart",
      description:
        "Am 1.: Ziele für diesen Monat setzen und den letzten Monat prüfen",
    },
    cadence: {
      "1": "Täglich",
      "3": "Alle 3 Tage",
      "7": "Wöchentlich",
    },
    hour: {
      "9": "Morgens",
      "13": "Nachmittags",
      "19": "Abends",
    },
    privacy:
      "Check-ins werden vollständig auf diesem Gerät geplant und enthalten keine Beträge oder Kontodaten. Nichts wird irgendwohin gesendet - BudgetArk hat keinen Server.",
  },
  spotlight: {
    newIn: "NEU IN {{version}}",
    fullReleaseNotes: "Alle Versionshinweise",
    fullReleaseNotesA11y: "Alle Versionshinweise öffnen",
    skipA11y: "Funktionstour überspringen",
    nextA11y: "Nächste Funktion",
  },
  guide: {
    title: "Einführung",
    intro:
      "Alles in BudgetArk - nach Tab stöbern oder suchen, was du tun möchtest.",
    searchPlaceholder: 'Suchen - z. B. "Beleg" oder "Kreditkarte"',
    clearSearchA11y: "Suche löschen",
    noMatches: {
      title: "Keine Treffer",
      body: 'Versuch ein anderes Wort - z. B. "Sicherung", "Benachrichtigung", "wiederkehrend" oder den Namen eines Tabs.',
    },
    redoOnboarding: "Einführung wiederholen",
  },
  unlock: {
    kicker: "ABZEICHEN FREIGESCHALTET",
    moreToCelebrate_one: "+{{count}} weiteres zum Feiern",
    moreToCelebrate_other: "+{{count}} weitere zum Feiern",
    nextBadge: "Nächstes Abzeichen",
    keepGoing: "Weiter so",
  },
  newBadge: "NEU",
};

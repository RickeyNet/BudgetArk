/**
 * BudgetArk - Deutsche Texte: gemeinsame Modals (guard)
 * File: src/i18n/locales/de/modalsGuard.ts
 *
 * German counterpart of en/modalsGuard.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { modalsGuard as en } from "../en/modalsGuard";

export const modalsGuard: Localized<typeof en> = {
  pairing: {
    title: "Mit Partner koppeln",
    subtitle: "Beide Geräte müssen im selben WLAN sein.",
    roles: {
      show: {
        title: "Code anzeigen",
        hint: "Erzeugt einen Code, den dein Partner eingibt",
      },
      enter: {
        title: "Code eingeben",
        hint: "Gib den Code vom Gerät deines Partners ein",
      },
    },
    portHint:
      "Port: {{port}} - deine IP findest du in den WLAN-Einstellungen.\nTeile deine IP:{{port}} mit deinem Partner",
    waiting: "Warte auf Partner... {{seconds}} s",
    connecting: "Verbinde...",
    connect: "Verbinden",
    discovery: {
      useAutomatic: "Automatische Suche verwenden",
      enterManually: "Gerät nicht gefunden? IP manuell eingeben",
    },
    verify: {
      heading: "Partner bestätigen",
      hint: "Beide Geräte sollten unten denselben Code anzeigen. Falls nicht, abbrechen und die Kopplung neu starten.",
      match: "Codes stimmen überein - Kopplung abschließen",
      mismatch: "Codes stimmen nicht überein",
    },
    errors: {
      timedOut: "Zeit für die Kopplung abgelaufen. Versuch es noch einmal.",
      failed: "Kopplung fehlgeschlagen",
      codeLength: "Bitte gib den {{length}}-stelligen Code vom Gerät deines Partners ein.",
      invalidAddress: "Gib eine gültige Adresse ein (z. B. 192.168.1.5:12345)",
      connectFailed: "Verbindung fehlgeschlagen",
      keystoreUnavailable:
        "BudgetArk konnte den Kopplungsschlüssel auf diesem Gerät nicht sicher speichern (sicherer Schlüsselspeicher nicht verfügbar). Es wurde nichts gespeichert - versuch es nach einem Neustart der App erneut.",
      saveFailed: "Kopplung konnte nicht gespeichert werden",
    },
  },
  backup: {
    title: "Automatische Sicherungen",
    closeA11y: "Automatische Sicherungen schließen",
    intro:
      "BudgetArk kann still eine verschlüsselte Kopie deiner Daten im eigenen Speicher auf diesem Telefon ablegen. So ist ein fehlerhafter Import oder ein versehentliches Löschen nie das Ende der Geschichte.",
    toggleLabel: "Automatische Sicherungen",
    statusOn: "{{cadence}}, die letzten 3 werden behalten",
    statusOff: "Aus - nur manuelle Sicherungen",
    cadence: {
      weekly: "Wöchentlich",
      monthly: "Monatlich",
    },
    cadenceA11y: "{{cadence}} sichern",
    backUpNow: "Jetzt sichern",
    backedUpNow: "Gerade eben gesichert.",
    sectionTitle: "SICHERUNGEN AUF DIESEM TELEFON",
    empty: {
      base: "Noch keine Sicherungen.",
      enabled: " Die erste wird automatisch geschrieben, oder tippe auf „Jetzt sichern“.",
      disabled: " Schalte automatische Sicherungen ein oder tippe auf „Jetzt sichern“.",
    },
    mostRecent: "Neueste",
    olderBackup: "Ältere Sicherung",
    restore: "Wiederherstellen",
    restoreHint:
      "Zusammenführen ergänzt Fehlendes und behält neuere Änderungen. Ersetzen löscht, was jetzt auf dem Telefon ist, und stellt genau diese Sicherung wieder her.",
    merge: "Zusammenführen",
    replace: "Ersetzen",
    restored: {
      title: "Sicherung wiederhergestellt",
      summary: "Wiederhergestellt: {{parts}}.",
    },
    errors: {
      loadSettings:
        "Sicherungseinstellungen konnten nicht geladen werden. Schließe das Fenster und öffne es erneut.",
      saveSetting: "Einstellung konnte nicht gespeichert werden. Bitte versuch es erneut.",
      write:
        "Sicherung konnte nicht geschrieben werden. Wenn das öfter passiert, ist der sichere Speicher deines Telefons womöglich nicht verfügbar.",
      unreadable:
        "Diese Sicherung konnte nicht gelesen werden. Sie ist vielleicht beschädigt oder wurde erstellt, bevor sich der Verschlüsselungsschlüssel der App geändert hat.",
      restoreFailed: "Beim Wiederherstellen ist etwas schiefgelaufen.",
    },
  },
  lock: {
    title: "App-Sperre",
    closeA11y: "Einstellungen der App-Sperre schließen",
    menuNote: "App-Sperre ist ein - BudgetArk fragt beim Öffnen nach deiner {{digits}}-stelligen PIN.",
    changePin: "PIN ändern",
    turnOff: "App-Sperre ausschalten",
    steps: {
      verify: "Aktuelle PIN eingeben",
      confirm: "Neue PIN wiederholen",
      change: "Neue PIN wählen",
      choose: "PIN wählen",
    },
    lockedOut: "Zu viele Versuche - versuch es in {{remaining}} erneut",
    newHint: "{{min}}-{{max}} Ziffern, dann auf ✓ tippen",
    confirmHint: "Dieselben Ziffern, noch einmal",
    saving: "Wird gespeichert...",
    privacyNote:
      "Deine PIN bleibt auf diesem Telefon - sie wird nie gesichert, exportiert oder mit deinem Partner synchronisiert. Wenn du sie vergisst, musst du die App neu installieren und aus einer Sicherung wiederherstellen.",
    mismatch: "PINs stimmen nicht überein - wähle die PIN noch einmal",
    digitsRange: "Verwende {{min}}-{{max}} Ziffern",
    results: {
      on: {
        title: "App-Sperre ein",
        message:
          "BudgetArk fragt beim Öffnen nach deiner PIN. Deine PIN bleibt nur auf diesem Telefon - wenn du sie vergisst, musst du die App neu installieren und aus einer Sicherung wiederherstellen.",
      },
      changed: {
        title: "PIN geändert",
        message: "Deine neue PIN gilt ab dem nächsten Sperren der App.",
      },
      off: {
        title: "App-Sperre aus",
        message: "BudgetArk öffnet sich ohne PIN-Abfrage.",
      },
    },
    errors: {
      savePin: "PIN konnte nicht gespeichert werden. Bitte versuch es erneut.",
      disable: "App-Sperre konnte nicht ausgeschaltet werden. Bitte versuch es erneut.",
    },
    gate: {
      title: "BudgetArk ist gesperrt",
      enterPin: "Gib deine PIN ein",
      forgot: "PIN vergessen?",
      forgotA11y: "Hilfe bei vergessener PIN",
      forgotMessage:
        "Deine PIN ist nur auf diesem Telefon gespeichert und kann von hier aus weder wiederhergestellt noch zurückgesetzt werden.\n\nUm BudgetArk wieder zu nutzen, lösche die App und installiere sie neu. Das löscht die Daten auf diesem Telefon - stelle danach aus einer Sicherungsdatei wieder her oder synchronisiere vom Gerät deines Partners, falls ihr gekoppelt seid.",
    },
  },
  pin: {
    dotsA11y: "{{entered}} von {{total}} PIN-Ziffern eingegeben",
    confirmA11y: "PIN bestätigen",
    deleteA11y: "Letzte Ziffer löschen",
    digitA11y: "Ziffer {{digit}}",
  },
  feedback: {
    title: "Feedback senden",
    subtitle: "Melde einen Fehler oder schlage eine Funktion vor.",
    types: {
      bug: "Fehlerbericht",
      feature: "Funktionsidee",
    },
    prompt: {
      bug: "WAS IST PASSIERT?",
      feature: "WAS WÜNSCHST DU DIR?",
    },
    placeholder: {
      bug: "Beschreibe den Fehler - was du erwartet hast und was passiert ist...",
      feature: "Beschreibe die gewünschte Funktion...",
    },
    autoAttached: "AUTOMATISCH ANGEHÄNGT",
    sendEmail: "Per E-Mail senden",
    openGithub: "GitHub Issues öffnen",
    chooseApp: "E-Mail-App wählen",
    thanks: {
      title: "Danke!",
      message: "Dein Feedback macht BudgetArk besser.",
    },
    noEmailApp: {
      title: "Keine E-Mail-App",
      message:
        "Keine E-Mail-App gefunden. Du kannst dein Feedback an {{email}} senden oder ein Issue auf GitHub eröffnen.",
    },
    linkFailed: {
      title: "Link konnte nicht geöffnet werden",
      message: "Öffne {{url}} in deinem Browser, um ein Issue zu erstellen.",
    },
    template: {
      bug: {
        whatHappened: "WAS IST PASSIERT",
        steps: "SCHRITTE ZUM NACHSTELLEN",
        expected: "WAS ICH STATTDESSEN ERWARTET HABE",
        howOften: "WIE OFT PASSIERT ES? (jedes Mal / manchmal / einmal)",
        screenshots: "SCREENSHOTS (unten anhängen, falls vorhanden)",
      },
      feature: {
        idea: "FUNKTIONSIDEE",
        problem: "WELCHES PROBLEM WÜRDE DAS FÜR DICH LÖSEN?",
        howItWorks: "WIE SOLLTE ES FUNKTIONIEREN?",
      },
    },
  },
};

/**
 * BudgetArk - Deutsche Texte: reine Helfer (notifications)
 * File: src/i18n/locales/de/helpersNotifications.ts
 *
 * German counterpart of en/helpersNotifications.ts. Informal "du"
 * throughout; see src/i18n/GLOSSARY.md for the fixed vocabulary.
 *
 * Security rule 11 applies here exactly as in English: lock-screen copy
 * stays free of amounts, account or card names, balances and counts.
 */

import type { Localized } from "../types";
import type { helpersNotifications as en } from "../en/helpersNotifications";

export const helpersNotifications: Localized<typeof en> = {
  tracking: {
    channel: {
      name: "Ausgaben-Check-ins",
      description: "Sanfte Erinnerungen, deine Ausgaben weiter zu erfassen",
    },
    checkIn: {
      quick: {
        title: "Zeit für einen kurzen Check-in",
        body: "Hast du eine Minute? Trag deine letzten Ausgaben ein, solange sie frisch sind.",
      },
      onCourse: {
        title: "Halte deine Arche auf Kurs",
        body: "Notier dir die Ausgaben der letzten Tage.",
      },
      expense: {
        title: "Kurzer Ausgaben-Check-in",
        body: "Gibt es Ausgaben zu erfassen? Das dauert nur einen Moment.",
      },
      tidyLedger: {
        title: "Ein sauberes Logbuch trägt eine stabile Arche",
        body: "Trag deine letzten Ausgaben ein, damit dein Budget ehrlich bleibt.",
      },
      drift: {
        title: "Lass keine Ausgaben durchrutschen",
        body: "Nimm dir 30 Sekunden und trag ein, was du ausgegeben hast.",
      },
    },
    monthStart: {
      newMonth: {
        title: "Ein neuer Monat beginnt",
        body: "Setz dir Budgetziele für diesen Monat und schau, wie der letzte gelaufen ist.",
      },
      chartCourse: {
        title: "Setz den Kurs für diesen Monat",
        body: "Wirf einen Blick auf die Ausgaben vom letzten Monat und leg deine Ziele für den nächsten fest.",
      },
      freshStart: {
        title: "Neuer Monat, neuer Start",
        body: "Nimm dir ein paar Minuten, um dein Budget zu planen und den Rückblick auf den letzten Monat anzusehen.",
      },
    },
  },
  keepAlive: {
    channel: {
      name: "Kartenaktivitäts-Erinnerungen",
      description:
        "Sanfte Erinnerungen, eine beobachtete Kreditkarte zu nutzen, bevor die Bank sie wegen Inaktivität schließt",
    },
    messages: {
      activity: {
        title: "Eine Karte könnte etwas Bewegung vertragen",
        body: "Eine deiner Kreditkarten wurde länger nicht benutzt. Ein kleiner Einkauf hält sie aktiv.",
      },
      afloat: {
        title: "Halte deinen Kreditrahmen über Wasser",
        body: "Eine ungenutzte Karte kann von der Bank gekündigt werden. Öffne BudgetArk und sieh nach, welche einen kurzen Einkauf braucht.",
      },
      quickCheck: {
        title: "Kurzer Karten-Check",
        body: "Eine Karte, die du beobachtest, nähert sich ihrer Inaktivitätsfrist. Ein Einkauf in Kaffeegröße setzt die Uhr zurück.",
      },
    },
  },
};

/**
 * BudgetArk - Deutsche Texte: Karten-Tab (lessons)
 * File: src/i18n/locales/de/lessonsShell.ts
 *
 * German counterpart of en/lessonsShell.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. Lesson prose itself is
 * English only - the reader shows `reader.englishOnly` under the title.
 */

import type { Localized } from "../types";
import type { lessonsShell as en } from "../en/lessonsShell";

export const lessonsShell: Localized<typeof en> = {
  reader: {
    crumb: "Kap. {{chapter}} · Lektion {{lesson}}",
    backA11y: "Zurück",
    readMin_one: "{{count}} Min. Lesezeit",
    readMin_other: "{{count}} Min. Lesezeit",
    comingSoonMeta: "Demnächst",
    topics: {
      budgeting: "Budgetieren",
      debt: "Schulden",
      saving: "Sparen",
      investing: "Investieren",
      taxes: "Steuern",
      insurance: "Versicherung",
      real_estate: "Immobilien",
      retirement: "Altersvorsorge",
      mindset: "Mindset",
    },
    englishOnly: "Diese Lektion gibt es bisher nur auf Englisch.",
    whyEyebrow: "WARUM DAS WICHTIG IST",
    takeawayEyebrow: "DAS WICHTIGSTE",
    completed: "✓ Abgeschlossen",
    markComplete: "Als abgeschlossen markieren",
    tryIt: "AUSPROBIEREN",
    goDeeper: "TIEFER EINSTEIGEN",
    comingSoon: {
      title: "Lektion in Arbeit",
      body: "{{chapter}} erscheint in einem späteren Update. Die Kapitelübersicht zeigt dir schon jetzt den ganzen Kursverlauf. Schau bald wieder vorbei.",
    },
    previous: "Zurück",
    next: "Weiter",
  },
  renderer: {
    tryIt: "AUSPROBIEREN",
    calcHint: "Öffne das passende Tool unter WERKZEUGE im Karten-Tab.",
    calculators: {
      "loan-amortization": "Kredit-/Hypothekenrechner",
      "compound-interest": "Zinseszinsrechner",
      "refinance-break-even": "Umschuldungs-Break-even-Rechner",
      "emergency-fund": "Notgroschen-Rechner",
      "payoff-comparison": "Tilgungsstrategie",
      fallback: "Rechner",
    },
  },
  celebration: {
    kicker: {
      course: "KAPITÄNSKURS ABGESCHLOSSEN",
      chapter: "KAPITEL {{number}} ABGESCHLOSSEN",
      first: "ERSTE LEKTION ABGESCHLOSSEN",
      lesson: "LEKTION ABGESCHLOSSEN",
    },
    title: {
      course: "Du hast jede Lektion an Bord abgeschlossen.",
      chapter: "{{chapter}}: Kapitel geschafft",
    },
    subtitle: {
      course: "{{completed}} von {{total}} Lektionen gelesen. Willkommen im Ruderhaus.",
      chapter: "Kap. {{number}} geschafft. {{completed}} von {{total}} Lektionen im ganzen Kurs.",
      first: "Eine geschafft. Ab hier bestimmst du das Tempo.",
      lesson: "Kap. {{number}} · {{completed}} von {{total}} Lektionen gelesen",
    },
    progress: "{{completed}} / {{total}} Kurslektionen gelesen",
    nextLesson: "Nächste Lektion",
  },
  resource: {
    openInApp: "In dieser App öffnen",
    linkFailed: {
      title: "Link konnte nicht geöffnet werden",
      message: "Auf deinem Gerät gibt es keine App, die diesen Link öffnen kann.",
    },
  },
};

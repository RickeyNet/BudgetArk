/**
 * BudgetArk - Svenska texter: Sjökort-fliken (lessons)
 * File: src/i18n/locales/sv/lessonsShell.ts
 *
 * Swedish counterpart of en/lessonsShell.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. Lesson prose itself is
 * English only - the reader shows `reader.englishOnly` under the title.
 */

import type { Localized } from "../types";
import type { lessonsShell as en } from "../en/lessonsShell";

export const lessonsShell: Localized<typeof en> = {
  reader: {
    crumb: "Kap. {{chapter}} · Lektion {{lesson}}",
    backA11y: "Tillbaka",
    readMin_one: "{{count}} min läsning",
    readMin_other: "{{count}} min läsning",
    comingSoonMeta: "Kommer snart",
    topics: {
      budgeting: "Budgetering",
      debt: "Skulder",
      saving: "Sparande",
      investing: "Investering",
      taxes: "Skatt",
      insurance: "Försäkring",
      real_estate: "Fastigheter",
      retirement: "Pension",
      mindset: "Tankesätt",
    },
    englishOnly: "Den här lektionen finns bara på engelska.",
    whyEyebrow: "VARFÖR DET SPELAR ROLL",
    takeawayEyebrow: "DET VIKTIGASTE",
    completed: "✓ Klar",
    markComplete: "Markera som klar",
    tryIt: "PROVA",
    goDeeper: "GÅ DJUPARE",
    comingSoon: {
      title: "Lektionen är på väg",
      body: "{{chapter}} kommer i en framtida uppdatering. Kapitelöversikten finns här så att du kan se hela kursens väg. Titta in igen snart.",
    },
    previous: "Föregående",
    next: "Nästa",
  },
  renderer: {
    tryIt: "PROVA",
    calcHint: "Öppna motsvarande verktyg under VERKTYG på fliken Sjökort.",
    calculators: {
      "loan-amortization": "Låne-/bolånekalkylator",
      "compound-interest": "Ränta-på-ränta-kalkylator",
      "refinance-break-even": "Låneomläggningskalkylator",
      "emergency-fund": "Buffertkalkylator",
      "payoff-comparison": "Återbetalningsstrategi",
      fallback: "Kalkylator",
    },
  },
  celebration: {
    kicker: {
      course: "KAPTENSKURSEN AVKLARAD",
      chapter: "KAPITEL {{number}} AVKLARAT",
      first: "FÖRSTA LEKTIONEN AVKLARAD",
      lesson: "LEKTIONEN AVKLARAD",
    },
    title: {
      course: "Du har läst varenda lektion ombord.",
      chapter: "{{chapter}}: kapitlet avklarat",
    },
    subtitle: {
      course: "{{completed}} av {{total}} lektioner lästa. Välkommen till styrhytten.",
      chapter: "Kap. {{number}} klart. {{completed}} av {{total}} lektioner i hela kursen.",
      first: "En avklarad. Härifrån bestämmer du takten.",
      lesson: "Kap. {{number}} · {{completed}} av {{total}} lektioner lästa",
    },
    progress: "{{completed}} / {{total}} kurslektioner lästa",
    nextLesson: "Nästa lektion",
  },
  resource: {
    openInApp: "Öppna i den här appen",
    linkFailed: {
      title: "Kunde inte öppna länken",
      message: "Din enhet har ingen app som kan öppna den länken.",
    },
  },
};

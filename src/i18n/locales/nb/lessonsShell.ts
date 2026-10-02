/**
 * BudgetArk - Norske tekster: Sjøkart-fanen (lessons)
 * File: src/i18n/locales/nb/lessonsShell.ts
 *
 * Norwegian (Bokmål) counterpart of en/lessonsShell.ts. Informal "du"
 * throughout; see src/i18n/GLOSSARY.md for the fixed vocabulary. Lesson
 * prose itself is English only - the reader shows `reader.englishOnly`
 * under the title.
 */

import type { Localized } from "../types";
import type { lessonsShell as en } from "../en/lessonsShell";

export const lessonsShell: Localized<typeof en> = {
  reader: {
    crumb: "Kap. {{chapter}} · Leksjon {{lesson}}",
    backA11y: "Tilbake",
    readMin_one: "{{count}} min lesing",
    readMin_other: "{{count}} min lesing",
    comingSoonMeta: "Kommer snart",
    topics: {
      budgeting: "Budsjettering",
      debt: "Gjeld",
      saving: "Sparing",
      investing: "Investering",
      taxes: "Skatt",
      insurance: "Forsikring",
      real_estate: "Eiendom",
      retirement: "Pensjon",
      mindset: "Tankesett",
    },
    englishOnly: "Denne leksjonen finnes bare på engelsk.",
    whyEyebrow: "HVORFOR DET BETYR NOE",
    takeawayEyebrow: "DET VIKTIGSTE",
    completed: "✓ Fullført",
    markComplete: "Merk som fullført",
    tryIt: "PRØV DET",
    goDeeper: "GÅ DYPERE",
    comingSoon: {
      title: "Leksjonen er underveis",
      body: "{{chapter}} kommer i en fremtidig oppdatering. Kapitteloversikten ligger her så du kan se hele kursløpet. Kom tilbake snart.",
    },
    previous: "Forrige",
    next: "Neste",
  },
  renderer: {
    tryIt: "PRØV DET",
    calcHint: "Åpne det tilsvarende verktøyet under VERKTØY på Sjøkart-fanen.",
    calculators: {
      "loan-amortization": "Låne-/boliglånskalkulator",
      "compound-interest": "Rentes rente-kalkulator",
      "refinance-break-even": "Refinansieringskalkulator",
      "emergency-fund": "Bufferkalkulator",
      "payoff-comparison": "Nedbetalingsstrategi",
      fallback: "Kalkulator",
    },
  },
  celebration: {
    kicker: {
      course: "KAPTEINSKURSET FULLFØRT",
      chapter: "KAPITTEL {{number}} FULLFØRT",
      first: "FØRSTE LEKSJON FULLFØRT",
      lesson: "LEKSJON FULLFØRT",
    },
    title: {
      course: "Du har fullført hver eneste leksjon om bord.",
      chapter: "{{chapter}}: kapittelet fullført",
    },
    subtitle: {
      course: "{{completed}} av {{total}} leksjoner lest. Velkommen til styrhuset.",
      chapter: "Kap. {{number}} ferdig. {{completed}} av {{total}} leksjoner i hele kurset.",
      first: "Én fullført. Herfra bestemmer du tempoet.",
      lesson: "Kap. {{number}} · {{completed}} av {{total}} leksjoner lest",
    },
    progress: "{{completed}} / {{total}} kursleksjoner lest",
    nextLesson: "Neste leksjon",
  },
  resource: {
    openInApp: "Åpne i denne appen",
    linkFailed: {
      title: "Kunne ikke åpne lenken",
      message: "Enheten din har ingen app som kan åpne den lenken.",
    },
  },
};

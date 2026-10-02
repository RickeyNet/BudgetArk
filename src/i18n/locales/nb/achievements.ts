/**
 * BudgetArk - Norske tekster: prestasjoner
 * File: src/i18n/locales/nb/achievements.ts
 *
 * Norwegian (Bokmål) counterpart of en/achievements.ts. Informal "du"
 * throughout; see src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { achievements as en } from "../en/achievements";

export const achievements: Localized<typeof en> = {
  title: "Loggbok",
  earnedCount: "{{earned}}/{{total}} oppnådd",
  tallying: "Teller opp...",
  closeA11y: "Lukk prestasjoner",
  filters: {
    all: "Alle",
    earned: "Oppnådd",
    locked: "Låst",
  },
  cell: {
    earnedA11y: "{{title}}, oppnådd",
    progressA11y: "{{title}}, {{progress}}",
    lockedA11y: "{{title}}, låst",
  },
  empty: {
    earned: "Ingen merker ennå - begynn å logge gjeld eller sparing for å fylle loggboken.",
    generic: "Ingenting her.",
  },
  tiers: {
    bronze: "Bronse",
    silver: "Sølv",
    gold: "Gull",
    legendary: "Legendarisk",
  },
  detail: {
    earnedOn: "Oppnådd {{date}}",
  },
};

/**
 * BudgetArk - Svenska texter: utmärkelser
 * File: src/i18n/locales/sv/achievements.ts
 *
 * Swedish counterpart of en/achievements.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { achievements as en } from "../en/achievements";

export const achievements: Localized<typeof en> = {
  title: "Loggbok",
  earnedCount: "{{earned}}/{{total}} uppnådda",
  tallying: "Räknar...",
  closeA11y: "Stäng utmärkelser",
  filters: {
    all: "Alla",
    earned: "Uppnådda",
    locked: "Låsta",
  },
  cell: {
    earnedA11y: "{{title}}, uppnådd",
    progressA11y: "{{title}}, {{progress}}",
    lockedA11y: "{{title}}, låst",
  },
  empty: {
    earned: "Inga märken ännu - börja logga skulder eller sparande för att fylla loggboken.",
    generic: "Inget här.",
  },
  tiers: {
    bronze: "Brons",
    silver: "Silver",
    gold: "Guld",
    legendary: "Legendarisk",
  },
  detail: {
    earnedOn: "Uppnådd {{date}}",
  },
};

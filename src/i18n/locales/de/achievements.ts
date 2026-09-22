/**
 * BudgetArk - Deutsche Texte: Erfolge
 * File: src/i18n/locales/de/achievements.ts
 *
 * German counterpart of en/achievements.ts.
 */

import type { Localized } from "../types";
import type { achievements as en } from "../en/achievements";

export const achievements: Localized<typeof en> = {
  title: "Logbuch",
  earnedCount: "{{earned}}/{{total}} erreicht",
  tallying: "Zähle...",
  closeA11y: "Erfolge schließen",
  filters: {
    all: "Alle",
    earned: "Erreicht",
    locked: "Gesperrt",
  },
  cell: {
    earnedA11y: "{{title}}, erreicht",
    progressA11y: "{{title}}, {{progress}}",
    lockedA11y: "{{title}}, gesperrt",
  },
  empty: {
    earned: "Noch keine Abzeichen - erfasse Schulden oder Ersparnisse, um das Logbuch zu füllen.",
    generic: "Hier ist nichts.",
  },
  tiers: {
    bronze: "Bronze",
    silver: "Silber",
    gold: "Gold",
    legendary: "Legendär",
  },
  detail: {
    earnedOn: "Erreicht am {{date}}",
  },
};

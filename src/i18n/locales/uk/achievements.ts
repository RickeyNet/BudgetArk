/**
 * BudgetArk - Українські тексти: досягнення
 * File: src/i18n/locales/uk/achievements.ts
 *
 * Ukrainian counterpart of en/achievements.ts (the Ship's Log screen
 * chrome; badge copy lives in dataAchievements.ts).
 */

import type { LocalizedPlural } from "../types";
import type { achievements as en } from "../en/achievements";

export const achievements: LocalizedPlural<typeof en> = {
  title: "Судновий журнал",
  earnedCount: "Здобуто {{earned}}/{{total}}",
  tallying: "Підраховуємо...",
  closeA11y: "Закрити досягнення",
  filters: {
    all: "Усі",
    earned: "Здобуті",
    locked: "Закриті",
  },
  cell: {
    earnedA11y: "{{title}}, здобуто",
    progressA11y: "{{title}}, {{progress}}",
    lockedA11y: "{{title}}, закрито",
  },
  empty: {
    earned: "Значків поки немає - почни вести борги чи заощадження, щоб заповнити журнал.",
    generic: "Тут порожньо.",
  },
  tiers: {
    bronze: "Бронза",
    silver: "Срібло",
    gold: "Золото",
    legendary: "Легенда",
  },
  detail: {
    earnedOn: "Здобуто {{date}}",
  },
};

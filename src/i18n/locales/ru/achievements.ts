/**
 * BudgetArk - Русские тексты: достижения
 * File: src/i18n/locales/ru/achievements.ts
 *
 * Russian counterpart of en/achievements.ts (the Ship's Log screen chrome;
 * badge copy lives in dataAchievements.ts).
 */

import type { LocalizedPlural } from "../types";
import type { achievements as en } from "../en/achievements";

export const achievements: LocalizedPlural<typeof en> = {
  title: "Судовой журнал",
  earnedCount: "Получено {{earned}}/{{total}}",
  tallying: "Подсчитываем...",
  closeA11y: "Закрыть достижения",
  filters: {
    all: "Все",
    earned: "Получены",
    locked: "Закрыты",
  },
  cell: {
    earnedA11y: "{{title}}, получено",
    progressA11y: "{{title}}, {{progress}}",
    lockedA11y: "{{title}}, закрыто",
  },
  empty: {
    earned: "Значков пока нет - начни вести долги или сбережения, чтобы заполнить журнал.",
    generic: "Здесь пусто.",
  },
  tiers: {
    bronze: "Бронза",
    silver: "Серебро",
    gold: "Золото",
    legendary: "Легенда",
  },
  detail: {
    earnedOn: "Получено {{date}}",
  },
};

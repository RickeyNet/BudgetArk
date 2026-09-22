/**
 * BudgetArk - English strings: Achievements screen
 * File: src/i18n/locales/en/achievements.ts
 *
 * Covers: AchievementsScreen.tsx chrome. Badge names/descriptions come
 * from src/data/achievementDefs.ts and are keyed separately when that data
 * pass happens. Tier labels are keyed by the AchievementTier id.
 */

export const achievements = {
  title: "Ship's Log",
  earnedCount: "{{earned}}/{{total}} earned",
  tallying: "Tallying...",
  closeA11y: "Close achievements",
  filters: {
    all: "All",
    earned: "Earned",
    locked: "Locked",
  },
  cell: {
    earnedA11y: "{{title}}, earned",
    progressA11y: "{{title}}, {{progress}}",
    lockedA11y: "{{title}}, locked",
  },
  empty: {
    earned: "No badges earned yet - start tracking debts or savings to fill the log.",
    generic: "Nothing here.",
  },
  tiers: {
    bronze: "Bronze",
    silver: "Silver",
    gold: "Gold",
    legendary: "Legendary",
  },
  detail: {
    earnedOn: "Earned {{date}}",
  },
} as const;

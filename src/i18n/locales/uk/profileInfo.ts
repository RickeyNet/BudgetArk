/**
 * BudgetArk - Українські тексти: Профіль (info)
 * File: src/i18n/locales/uk/profileInfo.ts
 *
 * Ukrainian counterpart of en/profileInfo.ts. Informal "ти" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { LocalizedPlural } from "../types";
import type { profileInfo as en } from "../en/profileInfo";

export const profileInfo: LocalizedPlural<typeof en> = {
  about: {
    sectionTitle: "ПРО ЗАСТОСУНОК",
    versionRow: "v{{version}} - {{title}}",
    tapForReleaseNotes: "Торкнись, щоб відкрити «Що нового»",
    websiteLabel: "Сайт",
    websiteA11y: "Відкрити сайт BudgetArk",
    githubLabel: "GitHub",
    releaseNotes: {
      title: "Що нового",
      subtitle: "Поточна та попередні версії.",
      releasedOn: "Випущено {{date}}",
    },
  },
  help: {
    sectionTitle: "ДОПОМОГА",
    onboarding: {
      label: "Знайомство",
      description: "Посібник із пошуком по всьому або повтор першого налаштування",
    },
    featureTour: {
      label: "Тур функціями",
      description: "Переглянути тур новими функціями ще раз",
      a11yLabel: "Повторити тур функціями",
    },
  },
  support: {
    feedback: {
      label: "Надіслати відгук",
      description: "Повідомлення про помилки та ідеї функцій",
    },
    tipJar: {
      label: "Скарбничка 💛",
      description: "Підтримка за бажанням - нічого не відкриває",
    },
  },
  business: {
    sectionTitle: "БІЗНЕС-ВИТРАТИ",
    businesses: {
      label: "Бізнеси 💼",
      description: "Позначай витрати компанії або підробітку",
      a11yLabel: "Керування бізнесами",
    },
    report: {
      label: "Звіт про бізнес-витрати",
      description: "Підсумки за кожним бізнесом за рік, з експортом у CSV",
      a11yLabel: "Відкрити звіт про бізнес-витрати",
    },
  },
  categories: {
    sectionTitle: "КАТЕГОРІЇ",
    custom: {
      label: "Власні категорії",
      a11yLabel: "Керування власними категоріями",
      empty: "Додай власні категорії бюджету",
      count_one: "{{count}} власна",
      count_few: "{{count}} власні",
      count_many: "{{count}} власних",
      count_other: "{{count}} власних",
    },
  },
};

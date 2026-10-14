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
    featureGuide: {
      label: "Довідник функцій",
      description: "Довідник із пошуком за всіма функціями, огляд за вкладками, що нового та повтор знайомства",
      a11yLabel: "Відкрити довідник функцій",
    },
    /** Formerly in the SUPPORT card - feedback is help-adjacent; the Tip Jar stays near the top (profile.info.tipJar). */
    feedback: {
      label: "Надіслати відгук",
      description: "Повідомлення про помилки та ідеї функцій",
    },
  },
  /** One-row card right under the name card - the Tip Jar deliberately stays at the top of the tab (user request). */
  tipJar: {
    label: "Скарбничка 💛",
    description: "Підтримка за бажанням - нічого не відкриває",
  },
  /** One card for the three "how do I tag entries?" rows: categories, people, businesses. */
  organize: {
    sectionTitle: "ОРГАНІЗАЦІЯ",
  },
  business: {
    businesses: {
      label: "Бізнеси 💼",
      description: "Позначай витрати компанії або підробітку, плюс звіт для податкової",
      a11yLabel: "Керування бізнесами",
    },
  },
  categories: {
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

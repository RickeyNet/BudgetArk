/**
 * BudgetArk - Русские тексты: Профиль (info)
 * File: src/i18n/locales/ru/profileInfo.ts
 *
 * Russian counterpart of en/profileInfo.ts. Informal "ты" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { LocalizedPlural } from "../types";
import type { profileInfo as en } from "../en/profileInfo";

export const profileInfo: LocalizedPlural<typeof en> = {
  about: {
    sectionTitle: "О ПРИЛОЖЕНИИ",
    versionRow: "v{{version}} - {{title}}",
    tapForReleaseNotes: "Нажми, чтобы открыть «Что нового»",
    websiteLabel: "Сайт",
    websiteA11y: "Открыть сайт BudgetArk",
    githubLabel: "GitHub",
    releaseNotes: {
      title: "Что нового",
      subtitle: "Текущая и прошлые версии.",
      releasedOn: "Выпущено {{date}}",
    },
  },
  help: {
    sectionTitle: "ПОМОЩЬ",
    featureGuide: {
      label: "Справочник функций",
      description: "Справочник с поиском по всем функциям, обзор по вкладкам, что нового и повтор знакомства",
      a11yLabel: "Открыть справочник функций",
    },
    /** Formerly in the SUPPORT card - feedback is help-adjacent; the Tip Jar stays near the top (profile.info.tipJar). */
    feedback: {
      label: "Отправить отзыв",
      description: "Сообщения об ошибках и идеи функций",
    },
  },
  /** One-row card right under the name card - the Tip Jar deliberately stays at the top of the tab (user request). */
  tipJar: {
    label: "Копилка 💛",
    description: "Поддержка по желанию - ничего не открывает",
  },
  /** One card for the three "how do I tag entries?" rows: categories, people, businesses. */
  organize: {
    sectionTitle: "ОРГАНИЗАЦИЯ",
  },
  business: {
    businesses: {
      label: "Бизнесы 💼",
      description: "Отмечай расходы компании или подработки, плюс отчёт для налоговой",
      a11yLabel: "Управление бизнесами",
    },
  },
  categories: {
    custom: {
      label: "Свои категории",
      a11yLabel: "Управление своими категориями",
      empty: "Добавь собственные категории бюджета",
      count_one: "{{count}} своя",
      count_few: "{{count}} свои",
      count_many: "{{count}} своих",
      count_other: "{{count}} своих",
    },
  },
};

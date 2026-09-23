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
    onboarding: {
      label: "Знакомство",
      description: "Руководство с поиском по всему или повтор первой настройки",
    },
    featureTour: {
      label: "Тур по функциям",
      description: "Пересмотреть тур по новым функциям",
      a11yLabel: "Повторить тур по функциям",
    },
  },
  support: {
    feedback: {
      label: "Отправить отзыв",
      description: "Сообщения об ошибках и идеи функций",
    },
    tipJar: {
      label: "Копилка 💛",
      description: "Поддержка по желанию - ничего не открывает",
    },
  },
  business: {
    sectionTitle: "ДЕЛОВЫЕ РАСХОДЫ",
    businesses: {
      label: "Бизнесы 💼",
      description: "Отмечай расходы компании или подработки",
      a11yLabel: "Управление бизнесами",
    },
    report: {
      label: "Отчёт по деловым расходам",
      description: "Итоги по каждому бизнесу за год, с экспортом в CSV",
      a11yLabel: "Открыть отчёт по деловым расходам",
    },
  },
  categories: {
    sectionTitle: "КАТЕГОРИИ",
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

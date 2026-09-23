/**
 * BudgetArk - Русские тексты: вкладка «Карты» (lessons)
 * File: src/i18n/locales/ru/lessonsShell.ts
 *
 * Russian counterpart of en/lessonsShell.ts: the lesson READER chrome only.
 * Lesson prose stays English (src/data), and `reader.englishOnly` says so.
 * Informal "ты" throughout.
 */

import type { LocalizedPlural } from "../types";
import type { lessonsShell as en } from "../en/lessonsShell";

export const lessonsShell: LocalizedPlural<typeof en> = {
  reader: {
    crumb: "Гл. {{chapter}} · Урок {{lesson}}",
    backA11y: "Назад",
    readMin_one: "{{count}} мин чтения",
    readMin_few: "{{count}} мин чтения",
    readMin_many: "{{count}} мин чтения",
    readMin_other: "{{count}} мин чтения",
    comingSoonMeta: "Скоро",
    topics: {
      budgeting: "Бюджет",
      debt: "Долги",
      saving: "Сбережения",
      investing: "Инвестиции",
      taxes: "Налоги",
      insurance: "Страхование",
      real_estate: "Недвижимость",
      retirement: "Пенсия",
      mindset: "Мышление",
    },
    englishOnly: "Этот урок доступен только на английском.",
    whyEyebrow: "ПОЧЕМУ ЭТО ВАЖНО",
    takeawayEyebrow: "ГЛАВНАЯ МЫСЛЬ",
    completed: "✓ Пройдено",
    markComplete: "Отметить пройденным",
    tryIt: "ПОПРОБУЙ",
    goDeeper: "ГЛУБЖЕ",
    comingSoon: {
      title: "Урок в работе",
      body: "{{chapter}} выйдет в одном из следующих обновлений. План главы уже здесь, чтобы ты видел(а) весь путь курса. Загляни позже.",
    },
    previous: "Назад",
    next: "Дальше",
  },
  renderer: {
    tryIt: "ПОПРОБУЙ",
    calcHint: "Открой соответствующий инструмент в разделе ИНСТРУМЕНТЫ на вкладке «Карты».",
    calculators: {
      "loan-amortization": "Кредитный / ипотечный калькулятор",
      "compound-interest": "Калькулятор сложного процента",
      "refinance-break-even": "Калькулятор окупаемости рефинансирования",
      "emergency-fund": "Калькулятор резервного фонда",
      "payoff-comparison": "Стратегия погашения долгов",
      fallback: "Калькулятор",
    },
  },
  celebration: {
    kicker: {
      course: "КУРС КАПИТАНА ПРОЙДЕН",
      chapter: "ГЛАВА {{number}} ПРОЙДЕНА",
      first: "ПЕРВЫЙ УРОК ПРОЙДЕН",
      lesson: "УРОК ПРОЙДЕН",
    },
    title: {
      course: "Ты прошёл(шла) все уроки на борту.",
      chapter: "{{chapter}}: глава пройдена",
    },
    subtitle: {
      course: "Прочитано уроков: {{completed}} из {{total}}. Добро пожаловать в рубку.",
      chapter: "Гл. {{number}} готова. Уроков по курсу: {{completed}} из {{total}}.",
      first: "Первый есть. Дальше темп курса задаёшь ты.",
      lesson: "Гл. {{number}} · прочитано уроков: {{completed}} из {{total}}",
    },
    progress: "Прочитано уроков курса: {{completed}} / {{total}}",
    nextLesson: "Следующий урок",
  },
  resource: {
    openInApp: "Открыть в этом приложении",
    linkFailed: {
      title: "Не удалось открыть ссылку",
      message: "На твоём устройстве нет приложения, которое может открыть эту ссылку.",
    },
  },
};

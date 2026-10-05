/**
 * BudgetArk - Українські тексти: вкладка «Карти» (lessons)
 * File: src/i18n/locales/uk/lessonsShell.ts
 *
 * Ukrainian counterpart of en/lessonsShell.ts: the lesson READER chrome
 * only. Lesson prose stays English (src/data), and `reader.englishOnly`
 * says so. Informal "ти" throughout.
 */

import type { LocalizedPlural } from "../types";
import type { lessonsShell as en } from "../en/lessonsShell";

export const lessonsShell: LocalizedPlural<typeof en> = {
  reader: {
    crumb: "Розд. {{chapter}} · Урок {{lesson}}",
    backA11y: "Назад",
    readMin_one: "{{count}} хв читання",
    readMin_few: "{{count}} хв читання",
    readMin_many: "{{count}} хв читання",
    readMin_other: "{{count}} хв читання",
    comingSoonMeta: "Незабаром",
    topics: {
      budgeting: "Бюджет",
      debt: "Борги",
      saving: "Заощадження",
      investing: "Інвестиції",
      taxes: "Податки",
      insurance: "Страхування",
      real_estate: "Нерухомість",
      retirement: "Пенсія",
      mindset: "Мислення",
    },
    englishOnly: "Цей урок доступний лише англійською.",
    whyEyebrow: "ЧОМУ ЦЕ ВАЖЛИВО",
    takeawayEyebrow: "ГОЛОВНА ДУМКА",
    completed: "✓ Пройдено",
    markComplete: "Позначити пройденим",
    tryIt: "СПРОБУЙ",
    goDeeper: "ГЛИБШЕ",
    comingSoon: {
      title: "Урок у роботі",
      body: "{{chapter}} вийде в одному з наступних оновлень. План розділу вже тут, щоб ти бачив(ла) весь шлях курсу. Заглянь пізніше.",
    },
    previous: "Назад",
    next: "Далі",
  },
  renderer: {
    tryIt: "СПРОБУЙ",
    calcHint: "Відкрий відповідний інструмент у розділі ІНСТРУМЕНТИ на вкладці «Карти».",
    calculators: {
      "loan-amortization": "Кредитний / іпотечний калькулятор",
      "compound-interest": "Калькулятор складних відсотків",
      "refinance-break-even": "Калькулятор окупності рефінансування",
      "emergency-fund": "Калькулятор резервного фонду",
      "payoff-comparison": "Стратегія погашення боргів",
      fallback: "Калькулятор",
    },
  },
  celebration: {
    kicker: {
      course: "КУРС КАПІТАНА ПРОЙДЕНО",
      chapter: "РОЗДІЛ {{number}} ПРОЙДЕНО",
      first: "ПЕРШИЙ УРОК ПРОЙДЕНО",
      lesson: "УРОК ПРОЙДЕНО",
    },
    title: {
      course: "Ти пройшов(ла) всі уроки на борту.",
      chapter: "{{chapter}}: розділ пройдено",
    },
    subtitle: {
      course: "Прочитано уроків: {{completed}} з {{total}}. Ласкаво просимо до рубки.",
      chapter: "Розд. {{number}} готово. Уроків по курсу: {{completed}} з {{total}}.",
      first: "Перший є. Далі темп курсу задаєш ти.",
      lesson: "Розд. {{number}} · прочитано уроків: {{completed}} з {{total}}",
    },
    progress: "Прочитано уроків курсу: {{completed}} / {{total}}",
    nextLesson: "Наступний урок",
  },
  resource: {
    openInApp: "Відкрити в цьому застосунку",
    linkFailed: {
      title: "Не вдалося відкрити посилання",
      message: "На твоєму пристрої немає застосунку, який може відкрити це посилання.",
    },
  },
};

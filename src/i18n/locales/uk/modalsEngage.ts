/**
 * BudgetArk - Українські тексти: спільні модальні вікна (engage)
 * File: src/i18n/locales/uk/modalsEngage.ts
 *
 * Ukrainian counterpart of en/modalsEngage.ts. Informal "ти" throughout;
 * see src/i18n/GLOSSARY.md for the fixed vocabulary. Plurals: one / few /
 * many / other.
 */

import type { LocalizedPlural } from "../types";
import type { modalsEngage as en } from "../en/modalsEngage";

export const modalsEngage: LocalizedPlural<typeof en> = {
  tipJar: {
    title: "Скарбничка на чайові",
    intro:
      "Якщо BudgetArk тобі допоміг, можеш залишити невеликі разові чайові. Це цілком необов'язково і нічого не відкриває - усі функції залишаються безкоштовними для всіх.",
    tiers: {
      small: "Невеликі чайові",
      medium: "Середні чайові",
      large: "Щедрі чайові",
    },
    store: {
      ios: "App Store",
      android: "Google Play",
    },
    contacting: "Зв'язок із {{store}}...",
    unavailable: "Чайові зараз недоступні. Спробуй пізніше.",
    pendingApproval: "Твої чайові очікують підтвердження від {{store}}. Дякуємо!",
    purchaseFailed: "Покупку не вдалося завершити.",
    privacy:
      "Чайові повністю обробляє {{store}}. BudgetArk ніколи не бачить, не збирає і не зберігає платіжні дані.",
    thanks: {
      title: "Дякуємо!",
      body: "Твої чайові допомагають BudgetArk триматися на плаву. У застосунку нічого не змінилося - він і так був повністю твоїм.",
      logged:
        "🎁 Додано до бюджету в категорію «Пожертви». Там це можна змінити або видалити, як будь-який інший запис.",
      logPrompt:
        "Урахувати ці чайові в бюджеті? Їх буде додано як витрату {{price}} сьогоднішнім числом у категорію «Пожертви».",
      logButton: "Додати до бюджету · Пожертви 🎁",
      logFailed:
        "Не вдалося зберегти запис. Спробуй ще раз або додай його пізніше на вкладці «Бюджет».",
      noThanks: "Ні, дякую",
    },
  },
  reminders: {
    title: "Нагадування про записи",
    intro:
      "М'які підказки, які тримають бюджет чесним: нагадування, коли ти давно нічого не записував, і нагадування на початку місяця - спланувати його заздалегідь.",
    enable: {
      label: "Увімкнути нагадування",
      on: "Заплановано на цьому пристрої за твоєю активністю",
      off: "Нагадування не заплановано",
    },
    permission: {
      title: "Сповіщення вимкнено",
      body: "Щоб надсилати нагадування, BudgetArk потрібен дозвіл на сповіщення. Увімкнути його можна в налаштуваннях телефона.",
      notNow: "Не зараз",
      openSettings: "Відкрити налаштування",
    },
    sections: {
      remindAbout: "НАГАДУВАТИ ПРО",
      afterQuietFor: "ЯКЩО НЕМАЄ ЗАПИСІВ",
      timeOfDay: "ЧАС ДНЯ",
    },
    checkIns: {
      label: "Запис витрат",
      description:
        "Коли ти давно нічого не записував - новий запис скидає таймер",
    },
    monthStart: {
      label: "Планування на початку місяця",
      description: "1-го числа: постав цілі на місяць і підбий підсумки минулого",
    },
    cadence: {
      "1": "Щодня",
      "3": "Кожні 3 дні",
      "7": "Щотижня",
    },
    hour: {
      "9": "Зранку",
      "13": "Удень",
      "19": "Увечері",
    },
    privacy:
      "Нагадування плануються лише на цьому пристрої і не містять сум чи даних рахунків. Нічого нікуди не надсилається - у BudgetArk немає сервера.",
  },
  spotlight: {
    newIn: "НОВЕ В {{version}}",
    fullReleaseNotes: "Повний список змін",
    fullReleaseNotesA11y: "Відкрити повний список змін",
    skipA11y: "Пропустити огляд функцій",
    nextA11y: "Наступна функція",
  },
  guide: {
    title: "Знайомство із застосунком",
    intro:
      "Усе, що є в BudgetArk - переглядай за вкладками або шукай те, що хочеш зробити.",
    searchPlaceholder: "Пошук - спробуй «чек» або «кредитна картка»",
    clearSearchA11y: "Очистити пошук",
    noMatches: {
      title: "Нічого не знайдено",
      body: "Спробуй інше слово - наприклад «копія», «сповіщення», «регулярний» або назву вкладки.",
    },
    redoOnboarding: "Пройти знайомство знову",
  },
  unlock: {
    kicker: "ЗНАЧОК ОТРИМАНО",
    moreToCelebrate_one: "+ще {{count}} досягнення",
    moreToCelebrate_few: "+ще {{count}} досягнення",
    moreToCelebrate_many: "+ще {{count}} досягнень",
    moreToCelebrate_other: "+ще {{count}} досягнення",
    nextBadge: "Наступний значок",
    keepGoing: "Продовжити",
  },
  newBadge: "НОВЕ",
  updateReady: {
    title: "Оновлення готове",
    defaultMessage: "Нове оновлення готове до встановлення.",
    moreInReleaseNotes: "+ще {{n}} у розділі «Що нового»",
    published: "Опубліковано {{when}}",
    later: "Пізніше",
    installNow: "Встановити зараз",
  },
  whatsNew: {
    title: "Нове у v{{version}}",
    more: "+ще {{n}}",
    seeWhatsNew: "Переглянути, що нового",
    maybeLater: "Може, пізніше",
  },
};

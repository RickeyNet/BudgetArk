/**
 * BudgetArk - Українські тексти: Профіль (settings)
 * File: src/i18n/locales/uk/profileSettings.ts
 *
 * Ukrainian counterpart of en/profileSettings.ts. Informal "ти" throughout;
 * see src/i18n/GLOSSARY.md for the fixed vocabulary. Language names are
 * shown in their own language and never translated.
 */

import type { LocalizedPlural } from "../types";
import type { profileSettings as en } from "../en/profileSettings";

export const profileSettings: LocalizedPlural<typeof en> = {
  sectionTitle: "НАЛАШТУВАННЯ",
  language: {
    label: "Мова",
    pickerTitle: "Мова",
    a11yLabel: "Мова, зараз {{current}}",
    a11yHint: "Відкриває вибір мови застосунку",
    autoWithResolved: "Автоматично ({{language}})",
    options: {
      auto: {
        name: "Автоматично",
        description: "Використовувати мову телефона. Якщо мови телефона поки немає, вмикається англійська.",
      },
    },
    note: "Частина вмісту - уроки, податкові інструменти для США та «Що нового» - поки лише англійською.",
  },
  notNow: "Не зараз",
  currency: {
    label: "Валюта",
    pickerTitle: "Валюта та формат",
  },
  currencyChange: {
    title: "Змінити валюту",
    pairedMessage:
      "Перехід на {{to}} змінює символ валюти, але суми залишаються тими самими числами. Твої дані синхронізуються з партнером, тому суми не можна перерахувати автоматично - спершу від'єднай пристрій, якщо хочеш їх перерахувати.",
    fetchingRate: "Отримуємо сьогоднішній курс...",
    convertQuestion:
      "Перерахувати наявні суми з {{from}} у {{to}} за курсом нижче чи просто змінити символ і залишити ті самі числа?",
    rateToday: "Курс на сьогодні",
    rateCached: "Курс від {{when}} (актуальний недоступний)",
    rateOffline: "Офлайн - використовується вбудована оцінка",
    rateLine: "{{prefix}}: 1 {{from}} = {{rate}} {{to}}",
    convertButton: "Перерахувати суми",
    symbolOnlyPaired: "Лише змінити символ",
    symbolOnly: "Просто змінити символ",
  },
  privacy: {
    label: "Режим приватності",
    enabled: "Знімки та запис екрана заблоковано",
    disabled: "Знімки та запис екрана дозволено",
    onTitle: "Режим приватності ввімкнено",
    offTitle: "Режим приватності вимкнено",
    onMessage: "Знімки та запис екрана тепер заблоковано.",
    offMessage: "Захист від знімків і запису екрана вимкнено.",
  },
  appLock: {
    label: "Блокування застосунку",
    enabled: "PIN запитується під час відкриття застосунку",
    disabled: "Запитувати PIN під час відкриття застосунку",
  },
  holdings: {
    label: "Живі котирування",
    enabled: "Акції та ETF враховуються в чистих активах",
    disabled: "Враховувати акції та ETF у чистих активах",
    enabledTitle: "Живі котирування ввімкнено",
    enabledMessage: "Додавай акції та ETF на вкладці «Місток». Ціни оновлюються приблизно раз на день.",
    enable: "Увімкнути",
  },
  haptics: {
    label: "Тактильний відгук",
    enabled: "Легка вібрація на ключових діях",
    disabled: "Вібрацію вимкнено",
  },
  reminders: {
    label: "Нагадування про облік",
    off: "Нагадування записувати витрати й планувати місяць",
    afterQuietDays_one: "Після тихого дня",
    afterQuietDays_few: "Після {{count}} тихих дні",
    afterQuietDays_many: "Після {{count}} тихих днів",
    afterQuietDays_other: "Після {{count}} тихих днів",
    afterQuietWeek: "Після тихого тижня",
    checkInsAndMonthStart: "Нагадування та планування місяця",
    monthStart: "Планування місяця",
    nothingSelected: "Нічого не вибрано",
    mornings: "зранку",
    afternoons: "удень",
    evenings: "увечері",
    summary: "{{what}} · {{when}}",
  },
  updates: {
    checkLabel: "Перевірити оновлення",
    lastChecked: "Остання перевірка {{when}}",
    neverChecked: "Ще не перевірялося",
    autoLabel: "Автооновлення",
    autoOff: "Вимк. - лише вручну",
    autoOn: "Увімк. - перевіряються автоматично",
    unavailableTitle: "Оновлення недоступні",
    unavailableMessage:
      "Перевірка оновлень недоступна в збірках для розробки. Установи preview- або production-збірку EAS, щоб користуватися цією функцією.",
    upToDateTitle: "Усе актуально",
    upToDateMessage: "Оновлень зараз немає. Остання перевірка {{when}}.",
    rejectedTitle: "Оновлення відхилено",
    rejectedMessage:
      "Це оновлення відхилено, бо воно розраховане на старішу версію середовища виконання. Можливо, це спроба відкату.",
    failedTitle: "Помилка перевірки оновлень",
    failedNetwork: "Не вдалося зв'язатися із сервером оновлень. Перевір з'єднання з інтернетом і спробуй знову.",
    failedGeneric: "Зараз не вдається перевірити оновлення. Спробуй трохи пізніше.",
    failedDetails: "{{friendly}}\n\nДеталі: {{details}}",
    modeSavedTitle: "Режим оновлень збережено",
    modeManualMessage:
      "Увімкнено ручний режим. Застосунок перевірятиме оновлення, лише коли ти натиснеш «Перевірити оновлення».",
    modeAutoMessage: "Автоматичну перевірку оновлень увімкнено.",
    readyTitle: "Оновлення готове",
    readyMessage: "Нове оновлення готове до встановлення.",
    published: "Опубліковано {{when}}",
    later: "Пізніше",
    installNow: "Установити зараз",
    installFailedTitle: "Помилка встановлення",
    installFailedMessage: "Зараз не вдалося застосувати оновлення. Спробуй ще раз.",
  },
};

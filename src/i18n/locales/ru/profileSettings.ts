/**
 * BudgetArk - Русские тексты: Профиль (settings)
 * File: src/i18n/locales/ru/profileSettings.ts
 *
 * Russian counterpart of en/profileSettings.ts. Informal "ты" throughout;
 * see src/i18n/GLOSSARY.md for the fixed vocabulary. Language names are
 * shown in their own language and never translated.
 */

import type { LocalizedPlural } from "../types";
import type { profileSettings as en } from "../en/profileSettings";

export const profileSettings: LocalizedPlural<typeof en> = {
  sectionTitle: "НАСТРОЙКИ",
  language: {
    label: "Язык",
    pickerTitle: "Язык",
    a11yLabel: "Язык, сейчас {{current}}",
    a11yHint: "Открывает выбор языка приложения",
    autoWithResolved: "Автоматически ({{language}})",
    options: {
      auto: {
        name: "Автоматически",
        description: "Следовать языку телефона. Если языка телефона пока нет, используется английский.",
      },
    },
    note: "Часть контента - уроки, налоговые инструменты для США и «Что нового» - пока только на английском.",
  },
  notNow: "Не сейчас",
  currency: {
    label: "Валюта",
    pickerTitle: "Валюта и формат",
  },
  currencyChange: {
    title: "Сменить валюту",
    pairedMessage:
      "Переход на {{to}} меняет символ валюты, но суммы остаются теми же числами. Твои данные синхронизируются с партнёром, поэтому суммы нельзя пересчитать автоматически - сначала отвяжи устройство, если хочешь их пересчитать.",
    fetchingRate: "Получаем сегодняшний курс...",
    convertQuestion:
      "Пересчитать существующие суммы из {{from}} в {{to}} по курсу ниже или просто сменить символ и оставить те же числа?",
    rateToday: "Курс на сегодня",
    rateCached: "Курс от {{when}} (актуальный недоступен)",
    rateOffline: "Офлайн - используется встроенная оценка",
    rateLine: "{{prefix}}: 1 {{from}} = {{rate}} {{to}}",
    convertButton: "Пересчитать суммы",
    symbolOnlyPaired: "Только сменить символ",
    symbolOnly: "Просто сменить символ",
  },
  privacy: {
    label: "Режим приватности",
    enabled: "Скриншоты и запись экрана заблокированы",
    disabled: "Скриншоты и запись экрана разрешены",
    onTitle: "Режим приватности включён",
    offTitle: "Режим приватности выключен",
    onMessage: "Скриншоты и запись экрана теперь заблокированы.",
    offMessage: "Защита от скриншотов и записи экрана отключена.",
  },
  appLock: {
    label: "Блокировка приложения",
    enabled: "PIN запрашивается при открытии приложения",
    disabled: "Запрашивать PIN при открытии приложения",
  },
  holdings: {
    label: "Живые котировки",
    enabled: "Акции и ETF учитываются в чистых активах",
    disabled: "Учитывать акции и ETF в чистых активах",
    enabledTitle: "Живые котировки включены",
    enabledMessage: "Добавляй акции и ETF на вкладке «Мостик». Цены обновляются примерно раз в день.",
    enable: "Включить",
  },
  haptics: {
    label: "Тактильный отклик",
    enabled: "Лёгкая вибрация на ключевых действиях",
    disabled: "Вибрация отключена",
  },
  reminders: {
    label: "Напоминания об учёте",
    off: "Напоминания записывать траты и планировать месяц",
    afterQuietDays_one: "После тихого дня",
    afterQuietDays_few: "После {{count}} тихих дня",
    afterQuietDays_many: "После {{count}} тихих дней",
    afterQuietDays_other: "После {{count}} тихих дней",
    afterQuietWeek: "После тихой недели",
    checkInsAndMonthStart: "Напоминания и планирование месяца",
    monthStart: "Планирование месяца",
    nothingSelected: "Ничего не выбрано",
    mornings: "утром",
    afternoons: "днём",
    evenings: "вечером",
    summary: "{{what}} · {{when}}",
  },
  updates: {
    checkLabel: "Проверить обновления",
    lastChecked: "Последняя проверка {{when}}",
    neverChecked: "Ещё не проверялось",
    autoLabel: "Автообновления",
    autoOff: "Выкл. - только вручную",
    autoOn: "Вкл. - проверяются автоматически",
    unavailableTitle: "Обновления недоступны",
    unavailableMessage:
      "Проверка обновлений недоступна в сборках для разработки. Установи preview- или production-сборку EAS, чтобы пользоваться этой функцией.",
    upToDateTitle: "Всё актуально",
    upToDateMessage: "Обновлений сейчас нет. Последняя проверка {{when}}.",
    rejectedTitle: "Обновление отклонено",
    rejectedMessage:
      "Это обновление отклонено, потому что рассчитано на более старую версию среды выполнения. Возможно, это попытка отката.",
    failedTitle: "Ошибка проверки обновлений",
    failedNetwork: "Не удалось связаться с сервером обновлений. Проверь подключение к интернету и попробуй снова.",
    failedGeneric: "Сейчас не удаётся проверить обновления. Попробуй чуть позже.",
    failedDetails: "{{friendly}}\n\nПодробности: {{details}}",
    modeSavedTitle: "Режим обновлений сохранён",
    modeManualMessage:
      "Включён ручной режим. Приложение будет проверять обновления, только когда ты нажмёшь «Проверить обновления».",
    modeAutoMessage: "Автоматическая проверка обновлений включена.",
    readyTitle: "Обновление готово",
    readyMessage: "Новое обновление готово к установке.",
    published: "Опубликовано {{when}}",
    later: "Позже",
    installNow: "Установить сейчас",
    installFailedTitle: "Ошибка установки",
    installFailedMessage: "Сейчас не удалось применить обновление. Попробуй ещё раз.",
  },
};

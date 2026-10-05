/**
 * BudgetArk - Українські тексти: Профіль (main)
 * File: src/i18n/locales/uk/profileMain.ts
 *
 * Ukrainian counterpart of en/profileMain.ts. Informal "ти" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { LocalizedPlural } from "../types";
import type { profileMain as en } from "../en/profileMain";

export const profileMain: LocalizedPlural<typeof en> = {
  header: {
    title: "Профіль",
    subtitle: "Налаштування твого анонімного облікового запису.",
  },
  loading: {
    loading: "Завантаження профілю...",
    failedTitle: "Не вдалося завантажити профіль",
    failedBody:
      "BudgetArk не зміг прочитати збережені дані на цьому пристрої. Таке буває, коли на телефоні майже не лишилося вільного місця. Твої дані не змінено.",
    tryAgain: "Повторити",
    tryAgainA11y: "Спробувати ще раз",
  },
  appVersion: "BudgetArk v{{version}}",
  card: {
    editHint: "{{idPrefix}}... · Торкнись імені, щоб змінити",
  },
  mission: {
    a11yExpanded: "Місія, розгорнуто",
    a11yCollapsed: "Місія, згорнуто",
  },
  progress: {
    sectionTitle: "ПРОГРЕС",
    shipsLog: "Судновий журнал",
    shipsLogA11y: "Відкрити досягнення в Судновому журналі",
    earned: "Досягнень здобуто: {{unlocked}}/{{total}}",
  },
  backupBanner: {
    upgradedTitle: "Ти оновився до v{{version}}",
    upgradedBody:
      "Останню резервну копію зроблено на v{{lastVersion}}. Створи нову, щоб завжди можна було відновитися з цієї версії.",
    noBackupTitle: "Резервної копії ще немає",
    noBackupBody:
      "Експортуй дані, щоб мати точку відновлення, якщо щось станеться з пристроєм.",
    backUpNow: "Створити копію",
    dismiss: "Сховати",
  },
  sync: {
    pairedTitle: "Зв'язано!",
    pairedMessage:
      "Тепер ти зв'язаний з {{partnerName}}. Натисни «Синхронізувати» будь-коли, щоб обмінятися даними.",
    completeTitle: "Синхронізацію завершено",
    completeMessage: "Надіслано записів: {{sent}}, отримано: {{received}}.",
    failedTitle: "Помилка синхронізації",
    failedFallback: "Не вдалося під'єднатися до партнера.",
    unpairedTitle: "Від'єднано",
    unpairedMessage:
      "Синхронізацію з партнером вимкнено. Твої дані залишаються на цьому пристрої.",
    permissionTitle: "Потрібен дозвіл",
    permissionMessage:
      "Дозвіл на геолокацію потрібен, щоб прочитати назву мережі Wi-Fi для автосинхронізації. Твоє місцезнаходження ніколи не зберігається й не передається.",
    noWifiTitle: "Wi-Fi не виявлено",
    noWifiIos:
      "Не вдалося прочитати назву мережі Wi-Fi. Переконайся, що ти під'єднаний до Wi-Fi, а тоді перевір:\n\n1. Параметри > Приватність і безпека > Служби геолокації - увімкни для BudgetArk («Під час використання»)\n2. Параметри > Приватність і безпека > Локальна мережа - увімкни для BudgetArk\n\niOS вимагає доступ до геолокації, щоб прочитати назву Wi-Fi. Твоє місцезнаходження ніколи не зберігається й не передається.",
    noWifiAndroid: "Спочатку під'єднайся до домашнього Wi-Fi, а тоді спробуй знову.",
    saveHomeNetworkFailedTitle: "Не вдалося зберегти домашню мережу",
    saveSettingFailedTitle: "Не вдалося зберегти налаштування",
    saveFailedMessage:
      "BudgetArk не зміг безпечно записати налаштування зв'язку на цьому пристрої. Нічого не змінено - спробуй ще раз.",
    homeNetworkSetTitle: "Домашню мережу задано",
    homeNetworkSetMessage: "Автосинхронізація запуститься, коли обидва пристрої будуть у мережі «{{ssid}}».",
  },
  reset: {
    incompleteTitle: "Скидання не завершено",
    incompleteFallback:
      "Частину даних не вдалося очистити. Спробуй ще раз або перевстанови застосунок, щоб завершити скидання.",
    incompleteRetry: "{{message}} Спробуй ще раз виконати «Скинути всі дані».",
  },
};

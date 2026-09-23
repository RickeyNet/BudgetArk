/**
 * BudgetArk - Русские тексты: Профиль (main)
 * File: src/i18n/locales/ru/profileMain.ts
 *
 * Russian counterpart of en/profileMain.ts. Informal "ты" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { LocalizedPlural } from "../types";
import type { profileMain as en } from "../en/profileMain";

export const profileMain: LocalizedPlural<typeof en> = {
  header: {
    title: "Профиль",
    subtitle: "Настройки твоего анонимного аккаунта.",
  },
  loading: {
    loading: "Загрузка профиля...",
    failedTitle: "Не удалось загрузить профиль",
    failedBody:
      "BudgetArk не смог прочитать сохранённые данные на этом устройстве. Такое бывает, когда на телефоне почти не осталось свободного места. Твои данные не изменены.",
    tryAgain: "Повторить",
    tryAgainA11y: "Повторить попытку",
  },
  appVersion: "BudgetArk v{{version}}",
  card: {
    editHint: "{{idPrefix}}... · Нажми на имя, чтобы изменить",
  },
  mission: {
    a11yExpanded: "Миссия, развёрнуто",
    a11yCollapsed: "Миссия, свёрнуто",
  },
  progress: {
    sectionTitle: "ПРОГРЕСС",
    shipsLog: "Судовой журнал",
    shipsLogA11y: "Открыть достижения в Судовом журнале",
    earned: "Достижений получено: {{unlocked}}/{{total}}",
  },
  backupBanner: {
    upgradedTitle: "Ты обновился до v{{version}}",
    upgradedBody:
      "Последняя резервная копия сделана на v{{lastVersion}}. Создай новую, чтобы всегда можно было восстановиться из этой версии.",
    noBackupTitle: "Резервной копии ещё нет",
    noBackupBody:
      "Экспортируй данные, чтобы у тебя была точка восстановления, если что-то случится с устройством.",
    backUpNow: "Создать копию",
    dismiss: "Скрыть",
  },
  sync: {
    pairedTitle: "Связано!",
    pairedMessage:
      "Теперь ты связан с {{partnerName}}. Нажми «Синхронизировать» в любой момент, чтобы обменяться данными.",
    completeTitle: "Синхронизация завершена",
    completeMessage: "Отправлено записей: {{sent}}, получено: {{received}}.",
    failedTitle: "Ошибка синхронизации",
    failedFallback: "Не удалось подключиться к партнёру.",
    unpairedTitle: "Отвязано",
    unpairedMessage:
      "Синхронизация с партнёром отключена. Твои данные остаются на этом устройстве.",
    permissionTitle: "Нужно разрешение",
    permissionMessage:
      "Разрешение на геолокацию нужно, чтобы прочитать имя сети Wi-Fi для автосинхронизации. Твоё местоположение никогда не сохраняется и не передаётся.",
    noWifiTitle: "Wi-Fi не обнаружен",
    noWifiIos:
      "Не удалось прочитать имя сети Wi-Fi. Убедись, что ты подключён к Wi-Fi, затем проверь:\n\n1. Настройки > Конфиденциальность и безопасность > Службы геолокации - включи для BudgetArk («При использовании»)\n2. Настройки > Конфиденциальность и безопасность > Локальная сеть - включи для BudgetArk\n\niOS требует доступ к геолокации, чтобы прочитать имя Wi-Fi. Твоё местоположение никогда не сохраняется и не передаётся.",
    noWifiAndroid: "Сначала подключись к домашнему Wi-Fi, затем попробуй снова.",
    saveHomeNetworkFailedTitle: "Не удалось сохранить домашнюю сеть",
    saveSettingFailedTitle: "Не удалось сохранить настройку",
    saveFailedMessage:
      "BudgetArk не смог безопасно записать настройки связи на этом устройстве. Ничего не изменено - попробуй ещё раз.",
    homeNetworkSetTitle: "Домашняя сеть задана",
    homeNetworkSetMessage: "Автосинхронизация запустится, когда оба устройства будут в сети «{{ssid}}».",
  },
  reset: {
    incompleteTitle: "Сброс не завершён",
    incompleteFallback:
      "Часть данных не удалось очистить. Попробуй ещё раз или переустанови приложение, чтобы завершить сброс.",
    incompleteRetry: "{{message}} Попробуй ещё раз выполнить «Сбросить все данные».",
  },
};

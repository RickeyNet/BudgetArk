/**
 * BudgetArk - Русские тексты: Профиль (connections)
 * File: src/i18n/locales/ru/profileConnections.ts
 *
 * Russian counterpart of en/profileConnections.ts. Informal "ты"
 * throughout; see src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { LocalizedPlural } from "../types";
import type { profileConnections as en } from "../en/profileConnections";

export const profileConnections: LocalizedPlural<typeof en> = {
  banks: {
    sectionTitle: "ПОДКЛЮЧЕНИЯ",
    bankConnections: "Подключения банков",
    needsAttention: "Требует внимания",
    importPrompt: "Импортируй операции из своего банка",
    connectedCount_one: "{{count}} подключение",
    connectedCount_few: "{{count}} подключения",
    connectedCount_many: "{{count}} подключений",
    connectedCount_other: "{{count}} подключений",
    reviewInbox: "Входящие на проверку",
    waiting_one: "{{count}} операция ждёт",
    waiting_few: "{{count}} операции ждут",
    waiting_many: "{{count}} операций ждут",
    waiting_other: "{{count}} операций ждут",
    nothingToReview: "Проверять нечего",
    disclosure: {
      notNow: "Не сейчас",
      continue: "Продолжить",
    },
  },
  partnerSync: {
    sectionTitle: "СИНХРОНИЗАЦИЯ С ПАРТНЁРОМ",
    pair: "Связать с партнёром",
    pairSubtext: "Синхронизация бюджетов по Wi-Fi - без аккаунта",
    autoSyncStatus: "Автосинхронизация {{state}} · «{{ssid}}»",
    setHomeWifi: "Нажми, чтобы задать домашний Wi-Fi для автосинхронизации",
    disable: "Отключить",
    enable: "Включить",
    syncNow: "Синхронизировать",
    discovering: "Поиск партнёра...",
    connecting: "Подключение...",
    syncing: "Синхронизация данных...",
    lastSynced: "Последняя синхронизация {{when}}",
    neverSynced: "Ещё не синхронизировано",
    recentActivity: "Недавняя активность",
    activityRow: "{{when}} · {{received}} от {{partner}}",
    activitySent: " · отправлено {{count}}",
    unpair: "Отвязать",
    unpairConfirm: {
      title: "Отвязать устройство",
      message:
        "Синхронизация с партнёром будет отключена. Твои данные останутся на этом устройстве, но для синхронизации придётся связаться заново.",
    },
  },
  people: {
    sectionTitle: "ЛЮДИ",
    manageA11y: "Управление людьми",
    people: "Люди 👤",
    peopleSubtext: "Распределяй траты между членами семьи",
    reportA11y: "Открыть отчёт по тратам людей",
    report: "Отчёт по тратам людей",
    reportSubtext: "Итоги по каждому человеку за год, с экспортом в CSV",
    owedA11y: "Открыть «Тебе должны»",
    owed: "Тебе должны 🤝",
    owedSubtext: "Деньги, которые ты одолжил, и что уже вернули",
  },
};

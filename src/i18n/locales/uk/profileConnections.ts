/**
 * BudgetArk - Українські тексти: Профіль (connections)
 * File: src/i18n/locales/uk/profileConnections.ts
 *
 * Ukrainian counterpart of en/profileConnections.ts. Informal "ти"
 * throughout; see src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { LocalizedPlural } from "../types";
import type { profileConnections as en } from "../en/profileConnections";

export const profileConnections: LocalizedPlural<typeof en> = {
  banks: {
    sectionTitle: "ПІДКЛЮЧЕННЯ",
    bankConnections: "Підключення банків",
    needsAttention: "Потребує уваги",
    importPrompt: "Імпортуй операції зі свого банку",
    connectedCount_one: "{{count}} підключення",
    connectedCount_few: "{{count}} підключення",
    connectedCount_many: "{{count}} підключень",
    connectedCount_other: "{{count}} підключень",
    reviewInbox: "Вхідні на перевірку",
    waiting_one: "{{count}} операція чекає",
    waiting_few: "{{count}} операції чекають",
    waiting_many: "{{count}} операцій чекають",
    waiting_other: "{{count}} операцій чекають",
    nothingToReview: "Перевіряти нічого",
    disclosure: {
      notNow: "Не зараз",
      continue: "Продовжити",
    },
  },
  partnerSync: {
    sectionTitle: "СИНХРОНІЗАЦІЯ З ПАРТНЕРОМ",
    pair: "Зв'язати з партнером",
    pairSubtext: "Синхронізація бюджетів через Wi-Fi - без облікового запису",
    autoSyncStatus: "Автосинхронізація {{state}} · «{{ssid}}»",
    setHomeWifi: "Торкнись, щоб задати домашній Wi-Fi для автосинхронізації",
    disable: "Вимкнути",
    enable: "Увімкнути",
    syncNow: "Синхронізувати",
    discovering: "Пошук партнера...",
    connecting: "Під'єднання...",
    syncing: "Синхронізація даних...",
    lastSynced: "Остання синхронізація {{when}}",
    neverSynced: "Ще не синхронізовано",
    recentActivity: "Нещодавня активність",
    activityRow: "{{when}} · {{received}} від {{partner}}",
    activitySent: " · надіслано {{count}}",
    unpair: "Від'єднати",
    unpairConfirm: {
      title: "Від'єднати пристрій",
      message:
        "Синхронізацію з партнером буде вимкнено. Твої дані залишаться на цьому пристрої, але для синхронізації доведеться зв'язатися знову.",
    },
  },
  people: {
    sectionTitle: "ЛЮДИ",
    manageA11y: "Керування людьми",
    people: "Люди 👤",
    peopleSubtext: "Розподіляй витрати між членами родини",
    reportA11y: "Відкрити звіт про витрати людей",
    report: "Звіт про витрати людей",
    reportSubtext: "Підсумки за кожною людиною за рік, з експортом у CSV",
    owedA11y: "Відкрити «Тобі винні»",
    owed: "Тобі винні 🤝",
    owedSubtext: "Гроші, які ти позичив, і що вже повернули",
  },
};

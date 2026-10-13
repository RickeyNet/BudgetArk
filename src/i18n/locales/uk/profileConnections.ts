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
    waiting_one: "{{count}} операція чекає",
    waiting_few: "{{count}} операції чекають",
    waiting_many: "{{count}} операцій чекають",
    waiting_other: "{{count}} операцій чекають",
    disclosure: {
      notNow: "Не зараз",
      continue: "Продовжити",
    },
  },
  /** Bridge/Budget banner when a bank connection needs the user. */
  banner: {
    title: "Підключення банку потребує уваги",
    body: "Банку потрібен повторний вхід, або остання синхронізація не вдалася. Відкрий «Підключення банків», щоб це виправити.",
    open: "Відкрити",
    later: "Пізніше",
  },
  partnerSync: {
    sectionTitle: "СИНХРОНІЗАЦІЯ З ПАРТНЕРОМ",
    pair: "Зв'язати з партнером",
    pairSubtext: "Синхронізація бюджетів через Wi-Fi - без облікового запису",
    autoSyncStatus: "Автосинхронізація {{state}} · «{{ssid}}»",
    /** Sync Now row subtext: partner name + the sync status / last-synced line. */
    statusWithPartner: "{{partner}} · {{status}}",
    /** Overflow (⋯) button + its sheet: home Wi-Fi and unpair. */
    options: "Параметри синхронізації",
    homeWifi: "Домашній Wi-Fi",
    homeWifiUnset: "Не задано · торкнись, щоб вибрати поточну мережу",
    /** Auto-sync pill on the Sync Now row (shown once a home Wi-Fi is set). */
    autoOn: "Авто увімк.",
    autoOff: "Авто вимк.",
    autoA11y: "Автосинхронізація в домашньому Wi-Fi",
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
    manageA11y: "Керування людьми",
    people: "Люди 👤",
    peopleSubtext: "Члени родини, хто скільки витратив і хто тобі винен",
  },
};

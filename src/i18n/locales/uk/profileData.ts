/**
 * BudgetArk - Українські тексти: Профіль (data)
 * File: src/i18n/locales/uk/profileData.ts
 *
 * Ukrainian counterpart of en/profileData.ts. Informal "ти" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. Spreadsheet column names
 * (Date, Type, Category, Amount) and sheet names are literal file headers
 * and stay English.
 */

import type { LocalizedPlural } from "../types";
import type { profileData as en } from "../en/profileData";

export const profileData: LocalizedPlural<typeof en> = {
  sectionTitle: "ДАНІ",
  rows: {
    export: {
      title: "Експорт",
      subtitle: "Зашифрована копія або таблиця",
    },
    import: {
      title: "Імпорт",
      subtitle: "Копія, таблиця або банківська виписка",
    },
    autoBackup: { title: "Автоматичні копії" },
    reset: { title: "Скинути всі дані" },
  },
  exportMenu: {
    title: "Експорт",
    backup: {
      title: "Зашифрована копія",
      subtitle: "Усе, у файлі з паролем",
    },
    spreadsheet: {
      title: "Таблиця",
      subtitle: "CSV або Excel для Google Таблиць / Excel",
    },
  },
  importMenu: {
    title: "Імпорт",
    backupFile: {
      title: "Копія з файлу",
      subtitle: "Відновити експорт BudgetArk",
    },
    backupPaste: {
      title: "Вставити текст копії",
      subtitle: "JSON, скопійований з експорту",
    },
    spreadsheet: {
      title: "Таблиця",
      subtitle: "З файлу CSV або Excel",
    },
    bankStatement: {
      title: "Банківська виписка",
      subtitle: "CSV з банку → Вхідні на перевірку",
    },
  },
  autoBackup: {
    loading: "Завантаження...",
    unavailable: "Недоступно",
    lastOn: "остання {{date}}",
    noneYet: "поки немає",
    summaryEnabled: "{{cadence}} · {{last}}",
    summaryOff: "Вимк. · {{last}}",
    cadence: { weekly: "Щотижня", monthly: "Щомісяця" },
  },
  export: {
    passwordTooShort: {
      title: "Закороткий пароль",
      message: "Введи пароль щонайменше з 4 символів або вимкни шифрування.",
    },
    failed: {
      title: "Помилка експорту",
      message: "Під час експорту даних щось пішло не так.",
    },
    spinner: {
      title: "Готуємо експорт…",
      subtitle: "Шифрування може тривати кілька секунд. Не закривай застосунок.",
    },
    dialog: {
      title: "Експорт моїх даних",
      encryptedNote: "Перед надсиланням дані буде зашифровано паролем.",
      plaintextNote:
        "Дані буде експортовано як незашифрований JSON. Будь-хто з доступом до файлу зможе прочитати твої фінансові дані.",
      encryptToggle: "Зашифрувати паролем",
      passwordPlaceholder: "Введи пароль експорту",
      encryptAndShare: "Зашифрувати й поділитися",
      sharePlaintext: "Поділитися без шифрування",
    },
  },
  import: {
    complete: { title: "Імпорт завершено" },
    failed: {
      title: "Помилка імпорту",
      message: "Під час імпорту даних щось пішло не так.",
    },
    labelMerged: "Об'єднано:",
    labelImported: "Імпортовано:",
    summary: "{{label}} {{parts}}.",
    listSeparator: ", ",
    counts: {
      debts_one: "{{count}} борг",
      debts_few: "{{count}} борги",
      debts_many: "{{count}} боргів",
      debts_other: "{{count}} боргів",
      payments_one: "{{count}} платіж",
      payments_few: "{{count}} платежі",
      payments_many: "{{count}} платежів",
      payments_other: "{{count}} платежів",
      budgetEntries_one: "{{count}} запис бюджету",
      budgetEntries_few: "{{count}} записи бюджету",
      budgetEntries_many: "{{count}} записів бюджету",
      budgetEntries_other: "{{count}} записів бюджету",
      budgetLimits_one: "{{count}} ліміт бюджету",
      budgetLimits_few: "{{count}} ліміти бюджету",
      budgetLimits_many: "{{count}} лімітів бюджету",
      budgetLimits_other: "{{count}} лімітів бюджету",
      limits_one: "{{count}} ліміт",
      limits_few: "{{count}} ліміти",
      limits_many: "{{count}} лімітів",
      limits_other: "{{count}} лімітів",
      savingsGoals_one: "{{count}} ціль заощаджень",
      savingsGoals_few: "{{count}} цілі заощаджень",
      savingsGoals_many: "{{count}} цілей заощаджень",
      savingsGoals_other: "{{count}} цілей заощаджень",
      assetAccounts_one: "{{count}} рахунок активів",
      assetAccounts_few: "{{count}} рахунки активів",
      assetAccounts_many: "{{count}} рахунків активів",
      assetAccounts_other: "{{count}} рахунків активів",
      holdings_one: "{{count}} цінний папір",
      holdings_few: "{{count}} цінні папери",
      holdings_many: "{{count}} цінних паперів",
      holdings_other: "{{count}} цінних паперів",
      netWorthSnapshots_one: "{{count}} знімок чистих активів",
      netWorthSnapshots_few: "{{count}} знімки чистих активів",
      netWorthSnapshots_many: "{{count}} знімків чистих активів",
      netWorthSnapshots_other: "{{count}} знімків чистих активів",
      customCategories_one: "{{count}} власна категорія",
      customCategories_few: "{{count}} власні категорії",
      customCategories_many: "{{count}} власних категорій",
      customCategories_other: "{{count}} власних категорій",
      businesses_one: "{{count}} бізнес",
      businesses_few: "{{count}} бізнеси",
      businesses_many: "{{count}} бізнесів",
      businesses_other: "{{count}} бізнесів",
      people_one: "{{count}} людина",
      people_few: "{{count}} людини",
      people_many: "{{count}} людей",
      people_other: "{{count}} людей",
    },
    extras: {
      milestonePlan: "план етапів",
      payoffStrategy: "стратегія погашення",
    },
    alsoRestored: "\nТакож відновлено: {{extras}}.",
    staleNote: "\n\nПримітка: цьому експорту {{days}} дн. Частина даних може бути застарілою.",
    password: {
      title: "Зашифрований експорт",
      message: "Цей експорт зашифровано паролем. Введи пароль, щоб розшифрувати його.",
      placeholder: "Введи пароль",
      confirm: "Розшифрувати й імпортувати",
    },
    mode: {
      title: "Імпорт із файлу",
      message:
        "«Об'єднати» зберігає наявні дані й додає імпортовані. «Замінити» спершу стирає поточні дані.",
      merge: "Об'єднати",
      replace: "Замінити",
    },
    paste: {
      title: "Вставити дані експорту",
      hint: "Встав JSON-текст, скопійований з «Експорт моїх даних».",
      placeholder: "Встав JSON сюди...",
      empty: {
        title: "Порожньо",
        message: "Спершу встав експортовані дані JSON.",
      },
    },
  },
  spreadsheet: {
    formatReference: "Довідка з формату →",
    export: {
      dialog: {
        title: "Експорт таблиці",
        message:
          "CSV експортує лише записи бюджету - найзручніше для Google Таблиць і швидких правок. Excel експортує повну книгу з кількома аркушами (Budget Entries, Budget Limits, Debts, Payments, Savings Goals, Asset Accounts) для повної резервної копії.",
        csv: "CSV",
        excel: "Excel",
      },
      readyTitle: "Експорт {{format}} готовий",
      csvNote: "CSV містить лише записи бюджету. Для повної копії використовуй формат Excel.",
      excelNote_one:
        "Книгу збережено: {{count}} запис бюджету плюс борги, платежі, цілі заощаджень і рахунки активів.",
      excelNote_few:
        "Книгу збережено: {{count}} записи бюджету плюс борги, платежі, цілі заощаджень і рахунки активів.",
      excelNote_many:
        "Книгу збережено: {{count}} записів бюджету плюс борги, платежі, цілі заощаджень і рахунки активів.",
      excelNote_other:
        "Книгу збережено: {{count}} записів бюджету плюс борги, платежі, цілі заощаджень і рахунки активів.",
      partialNote:
        "\n\nЧастковий експорт: деякі розділи не вдалося прочитати, їх пропущено ({{sections}}).",
      failedMessage: "Під час експорту таблиці щось пішло не так.",
    },
    import: {
      dialog: {
        title: "Імпорт таблиці",
        message:
          "Обери файл .csv або .xlsx. Обов'язкові заголовки: Date, Type (income/expense), Category, Amount. «Об'єднати» зберігає наявні дані; «Замінити» спершу стирає їх.",
        tip: "Порада: спершу натисни «Експорт таблиці», щоб побачити точний формат, потім відредагуй та імпортуй назад. ID зберігаються, тож наявні рядки оновляться на місці.",
      },
      recognizedPreset: "Розпізнано експорт {{preset}}. {{label}} {{parts}}.",
      fromSpreadsheet: "{{label}} {{parts}} з таблиці.",
      droppedRows_one:
        "\n\n{{count}} рядок переказу / з нульовою сумою пропущено - перекази між власними рахунками не є доходом чи витратою.",
      droppedRows_few:
        "\n\n{{count}} рядки переказів / з нульовою сумою пропущено - перекази між власними рахунками не є доходом чи витратою.",
      droppedRows_many:
        "\n\n{{count}} рядків переказів / з нульовою сумою пропущено - перекази між власними рахунками не є доходом чи витратою.",
      droppedRows_other:
        "\n\n{{count}} рядків переказів / з нульовою сумою пропущено - перекази між власними рахунками не є доходом чи витратою.",
      skippedRows_one: "\n\n{{count}} рядок пропущено (обов'язкові поля відсутні або хибні):",
      skippedRows_few: "\n\n{{count}} рядки пропущено (обов'язкові поля відсутні або хибні):",
      skippedRows_many: "\n\n{{count}} рядків пропущено (обов'язкові поля відсутні або хибні):",
      skippedRows_other: "\n\n{{count}} рядків пропущено (обов'язкові поля відсутні або хибні):",
      skippedRowLine: "\n• {{sheet}} - {{descriptor}}: {{reason}}",
      andMore: "\n• …і ще {{count}}",
      staleNote: "\n\nПримітка: цьому файлу {{days}} дн. Частина даних може бути застарілою.",
      failedMessage: "Під час імпорту таблиці щось пішло не так.",
    },
  },
  bankStatement: {
    readFailed: {
      title: "Не вдалося прочитати файл",
      message: "Це не схоже на банківський CSV. Експортуй операції в CSV і спробуй знову.",
    },
    noFile: "Файл не вибрано.",
    tooLarge: "Файл завеликий ({{size}} МБ). Максимум 5 МБ - експортуй коротший період.",
    importedTitle: "Виписку імпортовано",
  },
  reset: {
    dialog: {
      title: "Скинути всі дані",
      message:
        "Усі твої борги, платежі та дані рахунків буде видалено безповоротно. Скасувати це неможливо.",
      confirm: "Скинути все",
    },
  },
};

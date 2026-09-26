/**
 * BudgetArk - Русские тексты: Профиль (data)
 * File: src/i18n/locales/ru/profileData.ts
 *
 * Russian counterpart of en/profileData.ts. Informal "ты" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. Spreadsheet column names
 * (Date, Type, Category, Amount) and sheet names are literal file headers
 * and stay English.
 */

import type { LocalizedPlural } from "../types";
import type { profileData as en } from "../en/profileData";

export const profileData: LocalizedPlural<typeof en> = {
  sectionTitle: "ДАННЫЕ",
  rows: {
    export: {
      title: "Экспорт",
      subtitle: "Зашифрованная копия или таблица",
    },
    import: {
      title: "Импорт",
      subtitle: "Копия, таблица или банковская выписка",
    },
    autoBackup: { title: "Автоматические копии" },
    reset: { title: "Сбросить все данные" },
  },
  exportMenu: {
    title: "Экспорт",
    backup: {
      title: "Зашифрованная копия",
      subtitle: "Всё, в файле с паролем",
    },
    spreadsheet: {
      title: "Таблица",
      subtitle: "CSV или Excel для Google Таблиц / Excel",
    },
  },
  importMenu: {
    title: "Импорт",
    backupFile: {
      title: "Копия из файла",
      subtitle: "Восстановить экспорт BudgetArk",
    },
    backupPaste: {
      title: "Вставить текст копии",
      subtitle: "JSON, скопированный из экспорта",
    },
    spreadsheet: {
      title: "Таблица",
      subtitle: "Из файла CSV или Excel",
    },
    bankStatement: {
      title: "Банковская выписка",
      subtitle: "CSV из банка → Входящие на проверку",
    },
  },
  autoBackup: {
    loading: "Загрузка...",
    unavailable: "Недоступно",
    lastOn: "последняя {{date}}",
    noneYet: "пока нет",
    summaryEnabled: "{{cadence}} · {{last}}",
    summaryOff: "Выкл. · {{last}}",
    cadence: { weekly: "Еженедельно", monthly: "Ежемесячно" },
  },
  export: {
    passwordTooShort: {
      title: "Слишком короткий пароль",
      message: "Введи пароль минимум из 4 символов или отключи шифрование.",
    },
    failed: {
      title: "Ошибка экспорта",
      message: "При экспорте данных что-то пошло не так.",
    },
    spinner: {
      title: "Готовим экспорт…",
      subtitle: "Шифрование может занять несколько секунд. Не закрывай приложение.",
    },
    dialog: {
      title: "Экспорт моих данных",
      encryptedNote: "Перед отправкой данные будут зашифрованы паролем.",
      plaintextNote:
        "Данные будут экспортированы как незашифрованный JSON. Любой, у кого есть доступ к файлу, сможет прочитать твои финансовые данные.",
      encryptToggle: "Зашифровать паролем",
      passwordPlaceholder: "Введи пароль экспорта",
      encryptAndShare: "Зашифровать и поделиться",
      sharePlaintext: "Поделиться без шифрования",
    },
  },
  import: {
    complete: { title: "Импорт завершён" },
    failed: {
      title: "Ошибка импорта",
      message: "При импорте данных что-то пошло не так.",
    },
    labelMerged: "Объединено:",
    labelImported: "Импортировано:",
    summary: "{{label}} {{parts}}.",
    listSeparator: ", ",
    counts: {
      debts_one: "{{count}} долг",
      debts_few: "{{count}} долга",
      debts_many: "{{count}} долгов",
      debts_other: "{{count}} долгов",
      payments_one: "{{count}} платёж",
      payments_few: "{{count}} платежа",
      payments_many: "{{count}} платежей",
      payments_other: "{{count}} платежей",
      budgetEntries_one: "{{count}} запись бюджета",
      budgetEntries_few: "{{count}} записи бюджета",
      budgetEntries_many: "{{count}} записей бюджета",
      budgetEntries_other: "{{count}} записей бюджета",
      budgetLimits_one: "{{count}} лимит бюджета",
      budgetLimits_few: "{{count}} лимита бюджета",
      budgetLimits_many: "{{count}} лимитов бюджета",
      budgetLimits_other: "{{count}} лимитов бюджета",
      limits_one: "{{count}} лимит",
      limits_few: "{{count}} лимита",
      limits_many: "{{count}} лимитов",
      limits_other: "{{count}} лимитов",
      savingsGoals_one: "{{count}} цель накоплений",
      savingsGoals_few: "{{count}} цели накоплений",
      savingsGoals_many: "{{count}} целей накоплений",
      savingsGoals_other: "{{count}} целей накоплений",
      assetAccounts_one: "{{count}} счёт активов",
      assetAccounts_few: "{{count}} счёта активов",
      assetAccounts_many: "{{count}} счетов активов",
      assetAccounts_other: "{{count}} счетов активов",
      holdings_one: "{{count}} ценная бумага",
      holdings_few: "{{count}} ценные бумаги",
      holdings_many: "{{count}} ценных бумаг",
      holdings_other: "{{count}} ценных бумаг",
      netWorthSnapshots_one: "{{count}} снимок чистых активов",
      netWorthSnapshots_few: "{{count}} снимка чистых активов",
      netWorthSnapshots_many: "{{count}} снимков чистых активов",
      netWorthSnapshots_other: "{{count}} снимков чистых активов",
      customCategories_one: "{{count}} своя категория",
      customCategories_few: "{{count}} свои категории",
      customCategories_many: "{{count}} своих категорий",
      customCategories_other: "{{count}} своих категорий",
      businesses_one: "{{count}} бизнес",
      businesses_few: "{{count}} бизнеса",
      businesses_many: "{{count}} бизнесов",
      businesses_other: "{{count}} бизнесов",
      people_one: "{{count}} человек",
      people_few: "{{count}} человека",
      people_many: "{{count}} человек",
      people_other: "{{count}} человек",
    },
    extras: {
      milestonePlan: "план этапов",
      payoffStrategy: "стратегия погашения",
    },
    alsoRestored: "\nТакже восстановлено: {{extras}}.",
    staleNote: "\n\nПримечание: этому экспорту {{days}} дн. Часть данных может быть устаревшей.",
    password: {
      title: "Зашифрованный экспорт",
      message: "Этот экспорт зашифрован паролем. Введи пароль, чтобы расшифровать его.",
      placeholder: "Введи пароль",
      confirm: "Расшифровать и импортировать",
    },
    mode: {
      title: "Импорт из файла",
      message:
        "«Объединить» сохраняет существующие данные и добавляет импортированные. «Заменить» сначала стирает текущие данные.",
      merge: "Объединить",
      replace: "Заменить",
    },
    paste: {
      title: "Вставить данные экспорта",
      hint: "Вставь JSON-текст, скопированный из «Экспорт моих данных».",
      placeholder: "Вставь JSON сюда...",
      empty: {
        title: "Пусто",
        message: "Сначала вставь экспортированные данные JSON.",
      },
    },
  },
  spreadsheet: {
    formatReference: "Справка по формату →",
    export: {
      dialog: {
        title: "Экспорт таблицы",
        message:
          "CSV экспортирует только записи бюджета - удобнее всего для Google Таблиц и быстрых правок. Excel экспортирует полную книгу с несколькими листами (Budget Entries, Budget Limits, Debts, Payments, Savings Goals, Asset Accounts) для полной резервной копии.",
        csv: "CSV",
        excel: "Excel",
      },
      readyTitle: "Экспорт {{format}} готов",
      csvNote: "CSV содержит только записи бюджета. Для полной копии используй формат Excel.",
      excelNote_one:
        "Книга сохранена: {{count}} запись бюджета плюс долги, платежи, цели накоплений и счета активов.",
      excelNote_few:
        "Книга сохранена: {{count}} записи бюджета плюс долги, платежи, цели накоплений и счета активов.",
      excelNote_many:
        "Книга сохранена: {{count}} записей бюджета плюс долги, платежи, цели накоплений и счета активов.",
      excelNote_other:
        "Книга сохранена: {{count}} записей бюджета плюс долги, платежи, цели накоплений и счета активов.",
      partialNote:
        "\n\nЧастичный экспорт: некоторые разделы не удалось прочитать, они пропущены ({{sections}}).",
      failedMessage: "При экспорте таблицы что-то пошло не так.",
    },
    import: {
      dialog: {
        title: "Импорт таблицы",
        message:
          "Выбери файл .csv или .xlsx. Обязательные заголовки: Date, Type (income/expense), Category, Amount. «Объединить» сохраняет существующие данные; «Заменить» сначала стирает их.",
        tip: "Совет: сначала нажми «Экспорт таблицы», чтобы увидеть точный формат, затем отредактируй и импортируй обратно. ID сохраняются, поэтому существующие строки обновятся на месте.",
      },
      recognizedPreset: "Распознан экспорт {{preset}}. {{label}} {{parts}}.",
      fromSpreadsheet: "{{label}} {{parts}} из таблицы.",
      droppedRows_one:
        "\n\n{{count}} строка перевода / с нулевой суммой пропущена - переводы между своими счетами не являются доходом или расходом.",
      droppedRows_few:
        "\n\n{{count}} строки переводов / с нулевой суммой пропущены - переводы между своими счетами не являются доходом или расходом.",
      droppedRows_many:
        "\n\n{{count}} строк переводов / с нулевой суммой пропущено - переводы между своими счетами не являются доходом или расходом.",
      droppedRows_other:
        "\n\n{{count}} строк переводов / с нулевой суммой пропущено - переводы между своими счетами не являются доходом или расходом.",
      skippedRows_one: "\n\n{{count}} строка пропущена (обязательные поля отсутствуют или неверны):",
      skippedRows_few: "\n\n{{count}} строки пропущены (обязательные поля отсутствуют или неверны):",
      skippedRows_many: "\n\n{{count}} строк пропущено (обязательные поля отсутствуют или неверны):",
      skippedRows_other: "\n\n{{count}} строк пропущено (обязательные поля отсутствуют или неверны):",
      skippedRowLine: "\n• {{sheet}} - {{descriptor}}: {{reason}}",
      andMore: "\n• …и ещё {{count}}",
      staleNote: "\n\nПримечание: этому файлу {{days}} дн. Часть данных может быть устаревшей.",
      failedMessage: "При импорте таблицы что-то пошло не так.",
    },
  },
  bankStatement: {
    readFailed: {
      title: "Не удалось прочитать файл",
      message: "Это не похоже на банковский CSV. Экспортируй операции в CSV и попробуй снова.",
    },
    noFile: "Файл не выбран.",
    tooLarge: "Файл слишком большой ({{size}} МБ). Максимум 5 МБ - экспортируй более короткий период.",
    importedTitle: "Выписка импортирована",
  },
  reset: {
    dialog: {
      title: "Сбросить все данные",
      message:
        "Все твои долги, платежи и данные счетов будут удалены безвозвратно. Отменить это нельзя.",
      confirm: "Сбросить всё",
    },
  },
};

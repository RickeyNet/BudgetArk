/**
 * BudgetArk - Русские тексты: чистые помощники (import)
 * File: src/i18n/locales/ru/helpersImport.ts
 *
 * Russian counterpart of en/helpersImport.ts. Informal "ты" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. Sheet titles, column and
 * CSV header names quoted inside sentences stay English: they are file
 * contracts the importer matches verbatim.
 */

import type { LocalizedPlural } from "../types";
import type { helpersImport as en } from "../en/helpersImport";

export const helpersImport: LocalizedPlural<typeof en> = {
  file: {
    noFileSelected: "Файл не выбран.",
  },
  spreadsheet: {
    tooManyRows: "В таблице слишком много строк ({{rows}}). Максимум - {{max}}.",
    tooLarge: "Файл слишком большой ({{mb}} МБ). Максимум - 5 МБ.",
    unreadable:
      "Не удалось прочитать таблицу. Возможно, файл повреждён или в неподдерживаемом формате.",
    empty: "Таблица пуста.",
    noSheets:
      'Не найдено ни одного распознанного листа. Ожидался лист "Budget Entries" (или один из: Budget Limits, Debts, Payments, Savings Goals, Asset Accounts, Holdings).',
    noValidRows:
      "Не найдено ни одной подходящей строки. Проверь, что заголовки соответствуют описанной схеме и заполнены Date / Amount / Type / Category.",
    row: {
      typeInvalid: 'Type должен быть "income" или "expense"',
      categoryUnknown: 'Категория "{{category}}" не распознана',
      categoryMissing: "Не указана категория",
      categoryOneOf: "Категория должна быть одной из: {{list}}",
      amountOutOfRange: "Сумма не указана или вне допустимого диапазона",
      amountPositive: "Сумма должна быть положительным числом не меньше 0.01",
      dateMissing: "Дата не указана или не читается",
      repaymentsFormat: 'Repayments должны быть парами "YYYY-MM-DD:amount", разделёнными ";"',
      monthlyLimitPositive: "Месячный лимит должен быть положительным числом не меньше 0.01",
      nameMissing: "Не указано название",
      balanceNonNegative: "Баланс должен быть числом 0 или больше",
      originalBalancePositive: "Исходный баланс должен быть положительным числом не меньше 0.01",
      rateRange: "Ставка / APR должна быть от 0 до {{max}}",
      minPaymentNonNegative: "Минимальный платёж должен быть числом 0 или больше",
      debtIdMissing: "Не указан Debt ID (платёж не привязан к долгу)",
      targetAmountPositive: "Целевая сумма должна быть положительным числом не меньше 0.01",
      currentAmountNonNegative: "Текущая сумма должна быть числом 0 или больше",
      costBasisNonNegative: "Стоимость покупки должна быть числом 0 или больше",
      symbolInvalid: 'Symbol "{{symbol}}" не является допустимым тикером',
      symbolMissing: "Не указан Symbol",
      sharesPositive: "Shares должно быть положительным числом",
      proxyNeedsSymbol: "Для прокси-позиции нужен Symbol (тикер-заменитель)",
      proxyNeedsName: "Для прокси-позиции нужен Name",
      proxyNeedsAnchorPrice: "Для прокси-позиции нужен положительный AnchorPrice",
      anchorValueNonNegative: "Опорная стоимость должна быть числом 0 или больше",
      manualNeedsName: "Для позиции с ручной стоимостью нужен Name",
      manualValueNonNegative: "Ручная стоимость должна быть числом 0 или больше",
    },
  },
  statement: {
    unreadable: "Не удалось прочитать файл. Убедись, что это CSV-выгрузка из твоего банка.",
    empty: "Файл пуст.",
    tooManyRows:
      "В файле слишком много строк ({{rows}}). Максимум - {{max}}: выгрузи более короткий период.",
    noDateColumn: "Строки с операциями не найдены: в файле нет столбца с датами.",
    unreadableDate: 'Нечитаемая дата "{{value}}"',
    unreadableAmount: "Нечитаемая сумма",
    unreadableAmountValue: 'Нечитаемая сумма "{{value}}"',
  },
  export: {
    dialogTitle: "Экспорт таблицы BudgetArk",
    shareTimeout: "Истекло время подготовки окна «Поделиться».",
    loadTimeout: {
      budgetEntries: "Истекло время загрузки записей бюджета для экспорта.",
      budgetLimits: "Истекло время загрузки лимитов бюджета для экспорта.",
      debts: "Истекло время загрузки долгов для экспорта.",
      payments: "Истекло время загрузки платежей для экспорта.",
      savingsGoals: "Истекло время загрузки целей накоплений для экспорта.",
      assetAccounts: "Истекло время загрузки счетов активов для экспорта.",
      holdings: "Истекло время загрузки ценных бумаг для экспорта.",
      milestonePlan: "Истекло время загрузки плана этапов для экспорта.",
      businesses: "Истекло время загрузки бизнесов для экспорта.",
      people: "Истекло время загрузки людей для экспорта.",
    },
  },
  backup: {
    collections: {
      debts: "долги",
      payments: "платежи",
      budgetEntries: "записи бюджета",
      budgetLimits: "лимиты бюджета",
      savingsGoals: "цели накоплений",
      assetAccounts: "счета активов",
      holdings: "ценные бумаги",
      netWorthSnapshots: "снимки чистых активов",
      customCategories: "свои категории",
      businesses: "бизнесы",
      people: "люди",
    },
    tooManyLimits: "Слишком много лимитов бюджета за месяц {{month}}. Максимум - {{max}}.",
    invalidLimits:
      'Импорт отклонён: лимиты бюджета за {{month}} содержат некорректные записи (первая - элемент {{index}} из {{total}}). Каждому лимиту нужны корректная "category" и числовой "monthlyLimit".',
    invalidFormat: "Неверный формат «{{label}}». Ожидался массив.",
    tooManyItems: "Слишком много элементов «{{label}}». Максимум - {{max}}.",
    invalidRecords_one:
      "Импорт отклонён: «{{label}}» содержит {{count}} некорректную запись (первая - элемент {{index}} из {{total}}).",
    invalidRecords_few:
      "Импорт отклонён: «{{label}}» содержит {{count}} некорректные записи (первая - элемент {{index}} из {{total}}).",
    invalidRecords_many:
      "Импорт отклонён: «{{label}}» содержит {{count}} некорректных записей (первая - элемент {{index}} из {{total}}).",
    invalidRecords_other:
      "Импорт отклонён: «{{label}}» содержит {{count}} некорректных записей (первая - элемент {{index}} из {{total}}).",
    problem: "Проблема: {{detail}}",
    userInvalid: "Импорт отклонён: неверный формат профиля пользователя.",
    userMissingId: "Импорт отклонён: у профиля пользователя нет корректного id.",
    payloadTooLarge: "Импорт отклонён: данные слишком большие. Максимум записей всего - {{max}}.",
    fileTooLarge: "Файл слишком большой, чтобы быть экспортом BudgetArk.",
    passwordRequired:
      "Этот экспорт зашифрован паролем. Введи пароль, чтобы расшифровать его.",
    wrongPassword: "Не удалось расшифровать. Возможно, пароль неверный.",
    malformedEnvelope: "Не удалось расшифровать. Зашифрованный экспорт повреждён.",
    notJson: "Текст не является корректным JSON. Вставь экспорт BudgetArk.",
    notExport:
      "Данные не похожи на экспорт BudgetArk. Ожидались долги, платежи или данные бюджета.",
    rollbackFailed:
      "Импорт прервался во время записи, и откат не смог восстановить все данные (не удалось: {{failed}}). Часть записей может быть в несогласованном состоянии - переустанови приложение и заново импортируй последнюю резервную копию, прежде чем добавлять новые данные.",
    writeFailed: "Импорт прервался во время записи. Твои прежние данные восстановлены.",
    pickerStuck:
      "Окно выбора файла зависло после прошлой попытки. Полностью закрой и снова открой приложение, затем повтори.",
  },
};

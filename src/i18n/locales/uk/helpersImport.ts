/**
 * BudgetArk - Українські тексти: чисті помічники (import)
 * File: src/i18n/locales/uk/helpersImport.ts
 *
 * Ukrainian counterpart of en/helpersImport.ts. Informal "ти" throughout;
 * see src/i18n/GLOSSARY.md for the fixed vocabulary. Sheet titles, column
 * and CSV header names quoted inside sentences stay English: they are file
 * contracts the importer matches verbatim.
 */

import type { LocalizedPlural } from "../types";
import type { helpersImport as en } from "../en/helpersImport";

export const helpersImport: LocalizedPlural<typeof en> = {
  file: {
    noFileSelected: "Файл не вибрано.",
  },
  spreadsheet: {
    tooManyRows: "У таблиці забагато рядків ({{rows}}). Максимум - {{max}}.",
    tooLarge: "Файл завеликий ({{mb}} МБ). Максимум - 5 МБ.",
    unreadable:
      "Не вдалося прочитати таблицю. Можливо, файл пошкоджений або в непідтримуваному форматі.",
    empty: "Таблиця порожня.",
    noSheets:
      'Не знайдено жодного розпізнаного аркуша. Очікувався аркуш "Budget Entries" (або один із: Budget Limits, Debts, Payments, Savings Goals, Asset Accounts, Holdings).',
    noValidRows:
      "Не знайдено жодного придатного рядка. Перевір, що заголовки відповідають описаній схемі й заповнені Date / Amount / Type / Category.",
    row: {
      typeInvalid: 'Type має бути "income" або "expense"',
      categoryUnknown: 'Категорію "{{category}}" не розпізнано',
      categoryMissing: "Не вказано категорію",
      categoryOneOf: "Категорія має бути однією з: {{list}}",
      amountOutOfRange: "Суму не вказано або вона поза допустимим діапазоном",
      amountPositive: "Сума має бути додатним числом не менше 0.01",
      dateMissing: "Дату не вказано або її не вдалося прочитати",
      repaymentsFormat: 'Repayments мають бути парами "YYYY-MM-DD:amount", розділеними ";"',
      monthlyLimitPositive: "Місячний ліміт має бути додатним числом не менше 0.01",
      nameMissing: "Не вказано назву",
      balanceNonNegative: "Баланс має бути числом 0 або більше",
      originalBalancePositive: "Початковий баланс має бути додатним числом не менше 0.01",
      rateRange: "Ставка / APR має бути від 0 до {{max}}",
      minPaymentNonNegative: "Мінімальний платіж має бути числом 0 або більше",
      debtIdMissing: "Не вказано Debt ID (платіж не прив'язаний до боргу)",
      targetAmountPositive: "Цільова сума має бути додатним числом не менше 0.01",
      currentAmountNonNegative: "Поточна сума має бути числом 0 або більше",
      costBasisNonNegative: "Вартість придбання має бути числом 0 або більше",
      symbolInvalid: 'Symbol "{{symbol}}" не є припустимим тікером',
      symbolMissing: "Не вказано Symbol",
      sharesPositive: "Shares має бути додатним числом",
      proxyNeedsSymbol: "Для проксі-позиції потрібен Symbol (тікер-замінник)",
      proxyNeedsName: "Для проксі-позиції потрібен Name",
      proxyNeedsAnchorPrice: "Для проксі-позиції потрібен додатний AnchorPrice",
      anchorValueNonNegative: "Опорна вартість має бути числом 0 або більше",
      manualNeedsName: "Для позиції з ручною вартістю потрібен Name",
      manualValueNonNegative: "Ручна вартість має бути числом 0 або більше",
    },
  },
  statement: {
    unreadable: "Не вдалося прочитати файл. Переконайся, що це CSV-вивантаження з твого банку.",
    empty: "Файл порожній.",
    tooManyRows:
      "У файлі забагато рядків ({{rows}}). Максимум - {{max}}: вивантаж коротший період.",
    noDateColumn: "Рядків з операціями не знайдено: у файлі немає стовпця з датами.",
    unreadableDate: 'Нечитабельна дата "{{value}}"',
    unreadableAmount: "Нечитабельна сума",
    unreadableAmountValue: 'Нечитабельна сума "{{value}}"',
  },
  export: {
    dialogTitle: "Експорт таблиці BudgetArk",
    shareTimeout: "Вичерпано час підготовки вікна «Поділитися».",
    loadTimeout: {
      budgetEntries: "Вичерпано час завантаження записів бюджету для експорту.",
      budgetLimits: "Вичерпано час завантаження лімітів бюджету для експорту.",
      debts: "Вичерпано час завантаження боргів для експорту.",
      payments: "Вичерпано час завантаження платежів для експорту.",
      savingsGoals: "Вичерпано час завантаження цілей заощаджень для експорту.",
      assetAccounts: "Вичерпано час завантаження рахунків активів для експорту.",
      holdings: "Вичерпано час завантаження цінних паперів для експорту.",
      milestonePlan: "Вичерпано час завантаження плану етапів для експорту.",
      businesses: "Вичерпано час завантаження бізнесів для експорту.",
      people: "Вичерпано час завантаження людей для експорту.",
    },
  },
  backup: {
    collections: {
      debts: "борги",
      payments: "платежі",
      budgetEntries: "записи бюджету",
      budgetLimits: "ліміти бюджету",
      savingsGoals: "цілі заощаджень",
      assetAccounts: "рахунки активів",
      holdings: "цінні папери",
      netWorthSnapshots: "знімки чистих активів",
      customCategories: "власні категорії",
      businesses: "бізнеси",
      people: "люди",
    },
    tooManyLimits: "Забагато лімітів бюджету за місяць {{month}}. Максимум - {{max}}.",
    invalidLimits:
      'Імпорт відхилено: ліміти бюджету за {{month}} містять некоректні записи (перший - елемент {{index}} з {{total}}). Кожному ліміту потрібні коректна "category" і числовий "monthlyLimit".',
    invalidFormat: "Неправильний формат «{{label}}». Очікувався масив.",
    tooManyItems: "Забагато елементів «{{label}}». Максимум - {{max}}.",
    invalidRecords_one:
      "Імпорт відхилено: «{{label}}» містить {{count}} некоректний запис (перший - елемент {{index}} з {{total}}).",
    invalidRecords_few:
      "Імпорт відхилено: «{{label}}» містить {{count}} некоректні записи (перший - елемент {{index}} з {{total}}).",
    invalidRecords_many:
      "Імпорт відхилено: «{{label}}» містить {{count}} некоректних записів (перший - елемент {{index}} з {{total}}).",
    invalidRecords_other:
      "Імпорт відхилено: «{{label}}» містить {{count}} некоректних записів (перший - елемент {{index}} з {{total}}).",
    problem: "Проблема: {{detail}}",
    userInvalid: "Імпорт відхилено: неправильний формат профілю користувача.",
    userMissingId: "Імпорт відхилено: у профілю користувача немає коректного id.",
    payloadTooLarge: "Імпорт відхилено: дані завеликі. Максимум записів загалом - {{max}}.",
    fileTooLarge: "Файл завеликий, щоб бути експортом BudgetArk.",
    passwordRequired:
      "Цей експорт зашифровано паролем. Введи пароль, щоб розшифрувати його.",
    wrongPassword: "Не вдалося розшифрувати. Можливо, пароль неправильний.",
    malformedEnvelope: "Не вдалося розшифрувати. Зашифрований експорт пошкоджено.",
    notJson: "Текст не є коректним JSON. Встав експорт BudgetArk.",
    notExport:
      "Дані не схожі на експорт BudgetArk. Очікувалися борги, платежі або дані бюджету.",
    rollbackFailed:
      "Імпорт перервався під час запису, і відкат не зміг відновити всі дані (не вдалося: {{failed}}). Частина записів може бути в неузгодженому стані - перевстанови застосунок і заново імпортуй останню резервну копію, перш ніж додавати нові дані.",
    writeFailed: "Імпорт перервався під час запису. Твої попередні дані відновлено.",
    pickerStuck:
      "Вікно вибору файлу зависло після попередньої спроби. Повністю закрий і знову відкрий застосунок, потім повтори.",
  },
};

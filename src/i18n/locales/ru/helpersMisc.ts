/**
 * BudgetArk - Русские тексты: чистые помощники (misc)
 * File: src/i18n/locales/ru/helpersMisc.ts
 *
 * Russian counterpart of en/helpersMisc.ts. Informal "ты" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. Product names (SimpleFIN,
 * Teller), file names (teller.zip, certificate.pem) and URLs stay as-is.
 */

import type { LocalizedPlural } from "../types";
import type { helpersMisc as en } from "../en/helpersMisc";

export const helpersMisc: LocalizedPlural<typeof en> = {
  dates: {
    unknownDate: "Неизвестная дата",
  },
  syncActivity: {
    nothingNew: "ничего нового",
    removed: "({{n}} удалено)",
    collections: {
      budgetEntries_one: "{{count}} запись",
      budgetEntries_few: "{{count}} записи",
      budgetEntries_many: "{{count}} записей",
      budgetEntries_other: "{{count}} записи",
      payments_one: "{{count}} платёж",
      payments_few: "{{count}} платежа",
      payments_many: "{{count}} платежей",
      payments_other: "{{count}} платежа",
      debts_one: "{{count}} долг",
      debts_few: "{{count}} долга",
      debts_many: "{{count}} долгов",
      debts_other: "{{count}} долга",
      savingsGoals_one: "{{count}} цель накоплений",
      savingsGoals_few: "{{count}} цели накоплений",
      savingsGoals_many: "{{count}} целей накоплений",
      savingsGoals_other: "{{count}} цели накоплений",
      assetAccounts_one: "{{count}} счёт",
      assetAccounts_few: "{{count}} счёта",
      assetAccounts_many: "{{count}} счетов",
      assetAccounts_other: "{{count}} счёта",
      holdings_one: "{{count}} ценная бумага",
      holdings_few: "{{count}} ценные бумаги",
      holdings_many: "{{count}} ценных бумаг",
      holdings_other: "{{count}} ценной бумаги",
      budgetLimits_one: "{{count}} лимит",
      budgetLimits_few: "{{count}} лимита",
      budgetLimits_many: "{{count}} лимитов",
      budgetLimits_other: "{{count}} лимита",
      monthStartBalances_one: "{{count}} начальный баланс",
      monthStartBalances_few: "{{count}} начальных баланса",
      monthStartBalances_many: "{{count}} начальных балансов",
      monthStartBalances_other: "{{count}} начального баланса",
      customCategories_one: "{{count}} категория",
      customCategories_few: "{{count}} категории",
      customCategories_many: "{{count}} категорий",
      customCategories_other: "{{count}} категории",
      businesses_one: "{{count}} бизнес",
      businesses_few: "{{count}} бизнеса",
      businesses_many: "{{count}} бизнесов",
      businesses_other: "{{count}} бизнеса",
      people_one: "{{count}} человек",
      people_few: "{{count}} человека",
      people_many: "{{count}} человек",
      people_other: "{{count}} человека",
      dismissedTransactions_one: "{{count}} пропущенная операция",
      dismissedTransactions_few: "{{count}} пропущенные операции",
      dismissedTransactions_many: "{{count}} пропущенных операций",
      dismissedTransactions_other: "{{count}} пропущенной операции",
      netWorthSnapshots_one: "{{count}} снимок чистых активов",
      netWorthSnapshots_few: "{{count}} снимка чистых активов",
      netWorthSnapshots_many: "{{count}} снимков чистых активов",
      netWorthSnapshots_other: "{{count}} снимка чистых активов",
    },
  },
  validation: {
    tooLong: "Не больше {{max}} символов.",
    alreadyExists: "«{{name}}» уже существует.",
  },
  categories: {
    nameRequired: "Введи название категории.",
    builtIn: "«{{name}}» уже есть среди встроенных категорий.",
    limit: "Можно создать до {{max}} своих категорий.",
    notFound: "Категория не найдена.",
  },
  people: {
    nameRequired: "Введи имя.",
    limit: "Можно добавить до {{max}} человек.",
    notFound: "Человек не найден.",
  },
  businesses: {
    nameRequired: "Введи название бизнеса.",
    limit: "Можно добавить до {{max}} бизнесов.",
    notFound: "Бизнес не найден.",
  },
  pin: {
    incorrect: "Неверный PIN - попробуй ещё раз",
  },
  connections: {
    keystoreUnavailable:
      "Это устройство не может безопасно хранить банковские учётные данные (защищённое хранилище недоступно), поэтому подключение не сохранено. Так бывает на устройствах с root или при установке в обход магазина.",
    credentialsMissing: "Сохранённые учётные данные этого подключения отсутствуют. Удали его и добавь заново.",
    syncFailed: "Что-то пошло не так при синхронизации этого подключения.",
    teller: {
      appIdRequired: "Сначала введи идентификатор приложения Teller.",
      badPemFiles:
        "Эти файлы не похожи на certificate.pem и private_key.pem из твоего teller.zip.",
      listAccountsFailed: "Teller подключён, но получить список счетов не удалось.",
      authRejected: "Teller отклонил учётные данные этого подключения. Заново подключи банк, чтобы синхронизация продолжилась.",
      rateLimited: "Достигнут лимит запросов Teller. Попробуй позже.",
      unexpectedResponse: "Teller вернул неожиданный ответ (HTTP {{status}}).",
      certificateRefused:
        "Teller отклонил клиентский сертификат. Заново импортируй сертификат и ключ из своего teller.zip.",
      unreachable: "Не удалось связаться с Teller. Проверь подключение и попробуй снова.",
      unparsable: "Не удалось разобрать ответ Teller.",
      noEnrollments: "В Teller ещё нет подключений. Сначала подключи банк через Teller.",
    },
    simplefin: {
      tokenRequired: "Сначала вставь свой токен настройки SimpleFIN.",
      tokenInvalid:
        "Это не похоже на токен настройки SimpleFIN. Скопируй весь токен со страницы приложения в SimpleFIN Bridge и попробуй снова.",
      tokenUsed:
        "Этот токен не сработал - токены SimpleFIN одноразовые, так что создай новый в SimpleFIN Bridge и вставь его сюда.",
      paymentRequired:
        "SimpleFIN Bridge сообщает, что требуется оплата. Проверь подписку на bridge.simplefin.org и попробуй снова.",
      unexpectedResponse: "SimpleFIN вернул неожиданный ответ (HTTP {{status}}).",
      accessUrlUnreadable: "SimpleFIN вернул URL доступа, который BudgetArk не смог прочитать.",
      accessUrlMalformed:
        "Сохранённый URL доступа SimpleFIN повреждён. Удали это подключение и добавь заново.",
      authRejected: "SimpleFIN отклонил учётные данные этого подключения.",
      rateLimited: "Достигнут дневной лимит запросов SimpleFIN. Попробуй позже.",
      unreachable: "Не удалось связаться с SimpleFIN. Проверь подключение и попробуй снова.",
    },
  },
};

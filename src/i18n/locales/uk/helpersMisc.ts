/**
 * BudgetArk - Українські тексти: чисті помічники (misc)
 * File: src/i18n/locales/uk/helpersMisc.ts
 *
 * Ukrainian counterpart of en/helpersMisc.ts. Informal "ти" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. Product names (SimpleFIN,
 * Teller), file names (teller.zip, certificate.pem) and URLs stay as-is.
 */

import type { LocalizedPlural } from "../types";
import type { helpersMisc as en } from "../en/helpersMisc";

export const helpersMisc: LocalizedPlural<typeof en> = {
  dates: {
    unknownDate: "Невідома дата",
  },
  syncActivity: {
    nothingNew: "нічого нового",
    removed: "({{n}} видалено)",
    collections: {
      budgetEntries_one: "{{count}} запис",
      budgetEntries_few: "{{count}} записи",
      budgetEntries_many: "{{count}} записів",
      budgetEntries_other: "{{count}} запису",
      payments_one: "{{count}} платіж",
      payments_few: "{{count}} платежі",
      payments_many: "{{count}} платежів",
      payments_other: "{{count}} платежу",
      debts_one: "{{count}} борг",
      debts_few: "{{count}} борги",
      debts_many: "{{count}} боргів",
      debts_other: "{{count}} боргу",
      savingsGoals_one: "{{count}} ціль заощаджень",
      savingsGoals_few: "{{count}} цілі заощаджень",
      savingsGoals_many: "{{count}} цілей заощаджень",
      savingsGoals_other: "{{count}} цілі заощаджень",
      assetAccounts_one: "{{count}} рахунок",
      assetAccounts_few: "{{count}} рахунки",
      assetAccounts_many: "{{count}} рахунків",
      assetAccounts_other: "{{count}} рахунку",
      holdings_one: "{{count}} цінний папір",
      holdings_few: "{{count}} цінні папери",
      holdings_many: "{{count}} цінних паперів",
      holdings_other: "{{count}} цінного папера",
      budgetLimits_one: "{{count}} ліміт",
      budgetLimits_few: "{{count}} ліміти",
      budgetLimits_many: "{{count}} лімітів",
      budgetLimits_other: "{{count}} ліміту",
      monthStartBalances_one: "{{count}} початковий баланс",
      monthStartBalances_few: "{{count}} початкові баланси",
      monthStartBalances_many: "{{count}} початкових балансів",
      monthStartBalances_other: "{{count}} початкового балансу",
      customCategories_one: "{{count}} категорія",
      customCategories_few: "{{count}} категорії",
      customCategories_many: "{{count}} категорій",
      customCategories_other: "{{count}} категорії",
      businesses_one: "{{count}} бізнес",
      businesses_few: "{{count}} бізнеси",
      businesses_many: "{{count}} бізнесів",
      businesses_other: "{{count}} бізнесу",
      people_one: "{{count}} людина",
      people_few: "{{count}} людини",
      people_many: "{{count}} людей",
      people_other: "{{count}} людини",
      dismissedTransactions_one: "{{count}} пропущена операція",
      dismissedTransactions_few: "{{count}} пропущені операції",
      dismissedTransactions_many: "{{count}} пропущених операцій",
      dismissedTransactions_other: "{{count}} пропущеної операції",
      netWorthSnapshots_one: "{{count}} знімок чистих активів",
      netWorthSnapshots_few: "{{count}} знімки чистих активів",
      netWorthSnapshots_many: "{{count}} знімків чистих активів",
      netWorthSnapshots_other: "{{count}} знімка чистих активів",
    },
  },
  validation: {
    tooLong: "Не більше {{max}} символів.",
    alreadyExists: "«{{name}}» уже існує.",
  },
  categories: {
    nameRequired: "Введи назву категорії.",
    builtIn: "«{{name}}» уже є серед вбудованих категорій.",
    limit: "Можна створити до {{max}} власних категорій.",
    notFound: "Категорію не знайдено.",
  },
  people: {
    nameRequired: "Введи ім'я.",
    limit: "Можна додати до {{max}} людей.",
    notFound: "Людину не знайдено.",
  },
  businesses: {
    nameRequired: "Введи назву бізнесу.",
    limit: "Можна додати до {{max}} бізнесів.",
    notFound: "Бізнес не знайдено.",
  },
  pin: {
    incorrect: "Неправильний PIN - спробуй ще раз",
  },
  connections: {
    keystoreUnavailable:
      "Цей пристрій не може безпечно зберігати банківські облікові дані (захищене сховище недоступне), тому підключення не збережено. Так буває на пристроях із root або при встановленні в обхід магазину.",
    credentialsMissing: "Збережені облікові дані цього підключення відсутні. Видали його й додай заново.",
    syncFailed: "Щось пішло не так під час синхронізації цього підключення.",
    teller: {
      appIdRequired: "Спершу введи ідентифікатор застосунку Teller.",
      badPemFiles:
        "Ці файли не схожі на certificate.pem і private_key.pem із твого teller.zip.",
      listAccountsFailed: "Teller підключено, але отримати список рахунків не вдалося.",
      authRejected: "Teller відхилив облікові дані цього підключення. Заново підключи банк, щоб синхронізація тривала.",
      rateLimited: "Досягнуто ліміт запитів Teller. Спробуй пізніше.",
      unexpectedResponse: "Teller повернув неочікувану відповідь (HTTP {{status}}).",
      certificateRefused:
        "Teller відхилив клієнтський сертифікат. Заново імпортуй сертифікат і ключ зі свого teller.zip.",
      unreachable: "Не вдалося зв'язатися з Teller. Перевір з'єднання й спробуй знову.",
      unparsable: "Не вдалося розібрати відповідь Teller.",
      noEnrollments: "У Teller ще немає підключень. Спершу підключи банк через Teller.",
    },
    simplefin: {
      tokenRequired: "Спершу встав свій токен налаштування SimpleFIN.",
      tokenInvalid:
        "Це не схоже на токен налаштування SimpleFIN. Скопіюй увесь токен зі сторінки застосунку в SimpleFIN Bridge і спробуй знову.",
      tokenUsed:
        "Цей токен не спрацював - токени SimpleFIN одноразові, тож створи новий у SimpleFIN Bridge і встав його сюди.",
      paymentRequired:
        "SimpleFIN Bridge повідомляє, що потрібна оплата. Перевір підписку на bridge.simplefin.org і спробуй знову.",
      unexpectedResponse: "SimpleFIN повернув неочікувану відповідь (HTTP {{status}}).",
      accessUrlUnreadable: "SimpleFIN повернув URL доступу, який BudgetArk не зміг прочитати.",
      accessUrlMalformed:
        "Збережений URL доступу SimpleFIN пошкоджено. Видали це підключення й додай заново.",
      authRejected: "SimpleFIN відхилив облікові дані цього підключення.",
      rateLimited: "Досягнуто денний ліміт запитів SimpleFIN. Спробуй пізніше.",
      unreachable: "Не вдалося зв'язатися з SimpleFIN. Перевір з'єднання й спробуй знову.",
    },
  },
  sync: {
    notPaired: "Не зв'язано з партнером",
  },
};

/**
 * BudgetArk - Українські тексти: вкладка «Місток» (екран)
 * File: src/i18n/locales/uk/bridgeScreen.ts
 *
 * Ukrainian counterpart of en/bridgeScreen.ts. Informal "ти" throughout;
 * see src/i18n/GLOSSARY.md for the fixed vocabulary. Asset-category labels
 * are display names; ids stay untouched.
 */

import type { LocalizedPlural } from "../types";
import type { bridgeScreen as en } from "../en/bridgeScreen";

export const bridgeScreen: LocalizedPlural<typeof en> = {
  header: {
    title: "Місток",
    subtitle: "Чисті активи, рахунки та прогрес.",
  },
  accounts: {
    title: "Рахунки",
    add: "+ Додати",
    empty: "Відстежуй тут баланси поточних і ощадних рахунків, 401k, HSA та інших рахунків.",
    total: "Разом",
    across_one: "на {{count}} рахунку",
    across_few: "на {{count}} рахунках",
    across_many: "на {{count}} рахунках",
    across_other: "на {{count}} рахунках",
    plusEmergencyFund: " + Резервний фонд",
    changeLabel: "Зміна",
    changeChipA11y: "Показати зміну за {{period}}",
    periods: {
      "1D": "1 д.",
      "7D": "7 д.",
      "30D": "30 д.",
      "90D": "90 д.",
    },
    trackingHint: "Облік починається сьогодні - зростання/падіння з'явиться після наступного візиту.",
    emergencyFund: "Резервний фонд",
    efFromAccounts_one: "З {{count}} ощадного рахунку",
    efFromAccounts_few: "З {{count}} ощадних рахунків",
    efFromAccounts_many: "З {{count}} ощадних рахунків",
    efFromAccounts_other: "З {{count}} ощадних рахунків",
    savingsGoal: "Ціль заощаджень",
    categories: {
      checking: "Поточний",
      savings: "Ощадний",
      retirement: "401k / пенсія",
      hsa: "HSA",
      investment: "Інвестиції",
      other: "Інше",
    },
    edit: "Змінити",
    editA11y: "Змінити {{name}}",
    cash: "Гроші",
    noHoldings: "Паперів ще немає - натисни «Змінити», щоб додати тікери.",
    fund: "Фонд",
    shares_one: "{{count}} акція",
    shares_few: "{{count}} акції",
    shares_many: "{{count}} акцій",
    shares_other: "{{count}} акції",
    tracks: "Стежить за {{symbol}}",
    manualValue: "Ручне значення",
    addHsaAccount: "+ Додати рахунок HSA",
    addBroker: "+ Додати брокера",
  },
  holdingsNudge: {
    a11y: "Увімкни «Живі котирування», щоб побачити спільні папери",
    title: "📈 Папери, якими з тобою поділилися",
    body_one:
      "{{count}} позиція синхронізована від партнера. Увімкни «Живі котирування», щоб бачити їх і враховувати їхню вартість у чистих активах.",
    body_few:
      "{{count}} позиції синхронізовано від партнера. Увімкни «Живі котирування», щоб бачити їх і враховувати їхню вартість у чистих активах.",
    body_many:
      "{{count}} позицій синхронізовано від партнера. Увімкни «Живі котирування», щоб бачити їх і враховувати їхню вартість у чистих активах.",
    body_other:
      "{{count}} позиції синхронізовано від партнера. Увімкни «Живі котирування», щоб бачити їх і враховувати їхню вартість у чистих активах.",
    cta: "Увімкнути «Живі котирування» ›",
  },
  prices: {
    asOf: "Ціни станом на {{date}}",
    notFetched: "Ціни ще не завантажено",
    updateA11y: "Оновити ціни зараз",
    updating: "Оновлення...",
    update: "Оновити ціни",
    notices: {
      unavailable:
        "Зараз не вдалося оновити ціни. Перевір з'єднання і спробуй за кілька хвилин.",
      rateLimited: "Ціни сьогодні вже оновлювалися.",
      partial_one:
        "Більшість цін оновлено - ще завантажується {{count}} тікер. Натисни знову за кілька хвилин.",
      partial_few:
        "Більшість цін оновлено - ще завантажуються {{count}} тікери. Натисни знову за кілька хвилин.",
      partial_many:
        "Більшість цін оновлено - ще завантажується {{count}} тікерів. Натисни знову за кілька хвилин.",
      partial_other:
        "Більшість цін оновлено - ще завантажується {{count}} тікера. Натисни знову за кілька хвилин.",
      partialUnknown: "Більшість цін оновлено - натисни знову за кілька хвилин, щоб завершити.",
    },
  },
  plans: {
    title: "Плани покупок",
    planA11y: "Спланувати нову покупку на вкладці «Карти»",
    add: "+ План",
    hint: "Натисни на план, щоб додати відкладені гроші.",
    empty:
      "Збираєш на щось? Натисни «+ План», щоб створити накопичення на вкладці «Карти» - воно відстежуватиметься тут і враховуватиметься в чистих активах.",
  },
  shipsLog: {
    a11y: "Відкрити досягнення «Судновий журнал»",
    title: "Судновий журнал",
    earned: "{{count}}/{{total}} здобуто",
  },
  annualReport: {
    a11y: "Відкрити річний фінансовий звіт",
    title: "Річний звіт",
    subtitle: "Твій {{year}} рік у цифрах",
  },
  assetModal: {
    editTitle: "Змінити рахунок",
    addTitle: "Додати рахунок",
    subHsa: "Відстежуй грошовий залишок HSA та акції або ETF на ньому.",
    subHoldings: "Додай брокера та акції або ETF на рахунку. Його вартість рахується за паперами.",
    subBalance: "Відстежуй баланс, який потрапить в історію чистих активів.",
    namePlaceholderBroker: "Назва брокера (напр. Fidelity)",
    namePlaceholderHsa: "Провайдер HSA (напр. Fidelity)",
    namePlaceholder: "Назва рахунку",
    balancePlaceholderHsa: "Грошовий залишок",
    balancePlaceholder: "Баланс",
    apyPlaceholder: "Річна дохідність % (необов'язково) - напр. 4,5",
    apyA11y: "Річна відсоткова дохідність",
    efToggleA11y: "Цей рахунок - мій резервний фонд",
    efToggleLabel: "🛡️ Резервний фонд",
    efToggleHint:
      "Вважати цей баланс резервним фондом. Якщо рахунки призначено, фонд дорівнює їхньому спільному балансу (синхронізація з банком тримає його актуальним) замість ручних внесків.",
    tickerHint:
      "Додавай акції/ETF за тікером (AAPL) або крипту за парою (BTC/USD). Для фонду 401k без тікера (напр. Spartan 500 Index Pool) використовуй «Додати фонд 401k». Символи надсилаються сервісу котирувань лише при натисканні «Оновити ціни» - спершу додай усі, потім запроси ціни один раз.",
    fundNamePlaceholder: "Назва фонду (напр. Spartan 500 Index Pool)",
    removeFund: "Видалити фонд",
    proxyPlaceholder: "Індекс для відстеження (необов'язково, напр. VOO)",
    valuePlaceholder: "Поточна вартість",
    fundHintProxy: "Між оновленнями стежить за {{symbol}} - вводь значення з кожної виписки, щоб звірити.",
    fundHintManual: "Без індексу - зберігає введене значення, поки ти його не зміниш.",
    tickerPlaceholder: "AAPL або BTC/USD",
    sharesPlaceholder: "Акції",
    costPlaceholder: "Ціна купівлі",
    removeTicker: "Видалити тікер",
    addTicker: "+ Додати тікер",
    addFund: "+ Додати фонд 401k",
  },
  efModal: {
    title: "Резервний фонд",
    currentBalance: "Поточний баланс: {{amount}}",
    amountPlaceholder: "Сума поповнення (або від'ємна для зняття)",
    hint: "Введи додатне число, щоб поповнити, або від'ємне, щоб зняти.",
  },
  disclosure: {
    notNow: "Не зараз",
    enable: "Увімкнути",
  },
};

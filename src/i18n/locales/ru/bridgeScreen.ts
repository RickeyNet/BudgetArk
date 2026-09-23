/**
 * BudgetArk - Русские тексты: вкладка «Мостик» (экран)
 * File: src/i18n/locales/ru/bridgeScreen.ts
 *
 * Russian counterpart of en/bridgeScreen.ts. Informal "ты" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. Asset-category labels are
 * display names; ids stay untouched.
 */

import type { LocalizedPlural } from "../types";
import type { bridgeScreen as en } from "../en/bridgeScreen";

export const bridgeScreen: LocalizedPlural<typeof en> = {
  header: {
    title: "Мостик",
    subtitle: "Чистые активы, счета и прогресс.",
  },
  accounts: {
    title: "Счета",
    add: "+ Добавить",
    empty: "Отслеживай здесь балансы текущих и сберегательных счетов, 401k, HSA и других счетов.",
    total: "Итого",
    across_one: "на {{count}} счёте",
    across_few: "на {{count}} счетах",
    across_many: "на {{count}} счетах",
    across_other: "на {{count}} счетах",
    plusEmergencyFund: " + Резервный фонд",
    changeLabel: "Изменение",
    changeChipA11y: "Показать изменение за {{period}}",
    periods: {
      "1D": "1 д.",
      "7D": "7 д.",
      "30D": "30 д.",
      "90D": "90 д.",
    },
    trackingHint: "Учёт начинается сегодня - рост/падение появится после следующего визита.",
    emergencyFund: "Резервный фонд",
    efFromAccounts_one: "С {{count}} сберегательного счёта",
    efFromAccounts_few: "С {{count}} сберегательных счетов",
    efFromAccounts_many: "С {{count}} сберегательных счетов",
    efFromAccounts_other: "С {{count}} сберегательных счетов",
    savingsGoal: "Цель накоплений",
    categories: {
      checking: "Текущий",
      savings: "Сберегательный",
      retirement: "401k / пенсия",
      hsa: "HSA",
      investment: "Инвестиции",
      other: "Другое",
    },
    edit: "Изменить",
    editA11y: "Изменить {{name}}",
    cash: "Деньги",
    noHoldings: "Бумаг пока нет - нажми «Изменить», чтобы добавить тикеры.",
    fund: "Фонд",
    shares_one: "{{count}} акция",
    shares_few: "{{count}} акции",
    shares_many: "{{count}} акций",
    shares_other: "{{count}} акции",
    tracks: "Следует за {{symbol}}",
    manualValue: "Ручное значение",
    addHsaAccount: "+ Добавить счёт HSA",
    addBroker: "+ Добавить брокера",
  },
  holdingsNudge: {
    a11y: "Включи «Живые котировки», чтобы увидеть общие бумаги",
    title: "📈 Бумаги, которыми с тобой поделились",
    body_one:
      "{{count}} позиция синхронизирована от партнёра. Включи «Живые котировки», чтобы видеть их и учитывать их стоимость в чистых активах.",
    body_few:
      "{{count}} позиции синхронизированы от партнёра. Включи «Живые котировки», чтобы видеть их и учитывать их стоимость в чистых активах.",
    body_many:
      "{{count}} позиций синхронизировано от партнёра. Включи «Живые котировки», чтобы видеть их и учитывать их стоимость в чистых активах.",
    body_other:
      "{{count}} позиции синхронизировано от партнёра. Включи «Живые котировки», чтобы видеть их и учитывать их стоимость в чистых активах.",
    cta: "Включить «Живые котировки» ›",
  },
  prices: {
    asOf: "Цены на {{date}}",
    notFetched: "Цены ещё не загружены",
    updateA11y: "Обновить цены сейчас",
    updating: "Обновление...",
    update: "Обновить цены",
    notices: {
      unavailable:
        "Сейчас не удалось обновить цены. Проверь соединение и попробуй через несколько минут.",
      rateLimited: "Цены сегодня уже обновлялись.",
      partial_one:
        "Большинство цен обновлено - ещё загружается {{count}} тикер. Нажми снова через несколько минут.",
      partial_few:
        "Большинство цен обновлено - ещё загружаются {{count}} тикера. Нажми снова через несколько минут.",
      partial_many:
        "Большинство цен обновлено - ещё загружается {{count}} тикеров. Нажми снова через несколько минут.",
      partial_other:
        "Большинство цен обновлено - ещё загружается {{count}} тикера. Нажми снова через несколько минут.",
      partialUnknown: "Большинство цен обновлено - нажми снова через несколько минут, чтобы закончить.",
    },
  },
  plans: {
    title: "Планы покупок",
    planA11y: "Спланировать новую покупку на вкладке «Карты»",
    add: "+ План",
    hint: "Нажми на план, чтобы добавить отложенные деньги.",
    empty:
      "Копишь на что-то? Нажми «+ План», чтобы создать накопление на вкладке «Карты» - оно будет отслеживаться здесь и учитываться в чистых активах.",
  },
  shipsLog: {
    a11y: "Открыть достижения «Судовой журнал»",
    title: "Судовой журнал",
    earned: "{{count}}/{{total}} получено",
  },
  annualReport: {
    a11y: "Открыть годовой финансовый отчёт",
    title: "Годовой отчёт",
    subtitle: "Твой {{year}} год в цифрах",
  },
  assetModal: {
    editTitle: "Изменить счёт",
    addTitle: "Добавить счёт",
    subHsa: "Отслеживай денежный остаток HSA и акции или ETF на нём.",
    subHoldings: "Добавь брокера и акции или ETF на счёте. Его стоимость считается по бумагам.",
    subBalance: "Отслеживай баланс, который попадёт в историю чистых активов.",
    namePlaceholderBroker: "Название брокера (напр. Fidelity)",
    namePlaceholderHsa: "Провайдер HSA (напр. Fidelity)",
    namePlaceholder: "Название счёта",
    balancePlaceholderHsa: "Денежный остаток",
    balancePlaceholder: "Баланс",
    apyPlaceholder: "Годовая доходность % (необязательно) - напр. 4,5",
    apyA11y: "Годовая процентная доходность",
    efToggleA11y: "Этот счёт - мой резервный фонд",
    efToggleLabel: "🛡️ Резервный фонд",
    efToggleHint:
      "Считать этот баланс резервным фондом. Если счета назначены, фонд равен их общему балансу (синхронизация с банком держит его актуальным) вместо ручных взносов.",
    tickerHint:
      "Добавляй акции/ETF по тикеру (AAPL) или крипту по паре (BTC/USD). Для фонда 401k без тикера (напр. Spartan 500 Index Pool) используй «Добавить фонд 401k». Символы отправляются сервису котировок только при нажатии «Обновить цены» - сначала добавь все, потом запроси цены один раз.",
    fundNamePlaceholder: "Название фонда (напр. Spartan 500 Index Pool)",
    removeFund: "Удалить фонд",
    proxyPlaceholder: "Индекс для отслеживания (необязательно, напр. VOO)",
    valuePlaceholder: "Текущая стоимость",
    fundHintProxy: "Между обновлениями следует за {{symbol}} - вводи значение из каждой выписки, чтобы сверить.",
    fundHintManual: "Без индекса - хранит введённое значение, пока ты его не изменишь.",
    tickerPlaceholder: "AAPL или BTC/USD",
    sharesPlaceholder: "Акции",
    costPlaceholder: "Цена покупки",
    removeTicker: "Удалить тикер",
    addTicker: "+ Добавить тикер",
    addFund: "+ Добавить фонд 401k",
  },
  efModal: {
    title: "Резервный фонд",
    currentBalance: "Текущий баланс: {{amount}}",
    amountPlaceholder: "Сумма пополнения (или отрицательная для снятия)",
    hint: "Введи положительное число, чтобы пополнить, или отрицательное, чтобы снять.",
  },
  disclosure: {
    notNow: "Не сейчас",
    enable: "Включить",
  },
};

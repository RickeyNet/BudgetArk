/**
 * BudgetArk - Русские тексты: вкладка «Мостик» (планировщик)
 * File: src/i18n/locales/ru/bridgePlanner.ts
 *
 * Russian counterpart of en/bridgePlanner.ts. Informal "ты" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { LocalizedPlural } from "../types";
import type { bridgePlanner as en } from "../en/bridgePlanner";

export const bridgePlanner: LocalizedPlural<typeof en> = {
  summary: {
    saved: "НАКОПЛЕНО",
    stillToGo: "ОСТАЛОСЬ",
    total: "ИТОГО",
    plans_one: "{{count}} план",
    plans_few: "{{count}} плана",
    plans_many: "{{count}} планов",
    plans_other: "{{count}} плана",
    funded: " · {{count}} собрано",
    allFundedNow: " · все собраны",
    allFundedBy: " · все собраны к {{date}}",
    notFundedInHorizon: " · при этом темпе не все соберутся за 20 лет",
    setAmountToSee: " · укажи сумму в месяц ниже, чтобы узнать когда",
    late_one: "{{count}} план при этом темпе не успеет к нужной дате.",
    late_few: "{{count}} плана при этом темпе не успеют к нужной дате.",
    late_many: "{{count}} планов при этом темпе не успеют к нужной дате.",
    late_other: "{{count}} плана при этом темпе не успеют к нужной дате.",
  },
  order: {
    label: "ПОРЯДОК",
    methods: {
      snowball: "Сначала самые дешёвые",
      soonest: "Сначала самые срочные",
      custom: "Мой порядок",
    },
    hints: {
      snowball: "Сначала закрывай самые дешёвые планы ради быстрых побед - снежный ком.",
      soonest: "Планы с ближайшей нужной датой идут первыми; без даты - после.",
      custom: "Расставь их сам стрелками на каждом плане.",
    },
  },
  setAside: {
    label: "Откладывать на все планы",
    perMonth: "{{amount}}/мес",
    chartNow: "Сейчас",
  },
  fit: {
    trackFirst: "Запиши полный месяц доходов и расходов, и здесь появится, вписывается ли сумма.",
    fits: "Вписывается: после средних расходов свободно около {{amount}}/мес.",
    tight: "Впритык: это забирает большую часть из ~{{amount}}/мес, свободных после средних расходов.",
    over: "Слишком много: больше, чем ~{{amount}}/мес, свободных после средних расходов.",
    overNoFreeCash: "Слишком много: твои средние расходы уже превышают доход, так что откладывать придётся из других источников.",
  },
  allocation: {
    modes: {
      rollover: "По одному",
      parallel: "Поровну",
    },
    hints: {
      rollover: "Вся сумма идёт в первый план; когда он собран, деньги переходят в следующий - как снежный ком по долгам.",
      parallel: "Сумма делится поровну между всеми несобранными планами, а доля завершённого плана переходит остальным.",
    },
  },
  row: {
    a11yAddFunds: "Пополнить {{name}}",
    fundedMeta: "Собрано - можно покупать 🎉",
    progressMeta: "{{current}} из {{target}}",
    requiredSuffix: " · {{amount}}/мес, чтобы успеть к {{date}}",
    ready: "Готово {{date}}",
    monthlyNow: " · {{amount}}/мес сейчас",
    waitsTurn: " · ждёт своей очереди",
    misses: " · не успеет к {{date}}",
    lateFor_one: " · опоздание на {{count}} мес к {{date}}",
    lateFor_few: " · опоздание на {{count}} мес к {{date}}",
    lateFor_many: " · опоздание на {{count}} мес к {{date}}",
    lateFor_other: " · опоздание на {{count}} мес к {{date}}",
    itsDate: "своей дате",
    notFundedInHorizon: "При этом темпе не соберётся за 20 лет",
    moveUp: "Переместить {{name}} выше",
    moveDown: "Переместить {{name}} ниже",
  },
  nudges: {
    makesItHappen: "решает дело",
    sooner_one: "на {{count}} мес раньше",
    sooner_few: "на {{count}} мес раньше",
    sooner_many: "на {{count}} мес раньше",
    sooner_other: "на {{count}} мес раньше",
    extraMonthlyA11y: "Добавить {{amount}} в месяц ко всем планам",
    extraMonthly: "+{{amount}}/мес · {{sooner}}",
    lumpSumA11y: "Добавить {{amount}} в {{name}} сейчас",
    finishIt: "Закрыть: {{amount}} сейчас",
    lumpSumNow: "+{{amount}} сейчас · {{sooner}}",
  },
  contribute: {
    savedOf: "Накоплено {{current}} из {{target}}.",
    amountPlaceholder: "Сумма пополнения",
    negativeHint: "Отрицательная сумма исправляет ошибку.",
    costPerUseLabel: "СТОИМОСТЬ ОДНОГО ИСПОЛЬЗОВАНИЯ (НЕОБЯЗАТЕЛЬНО)",
    usesPlaceholder: "Использований в месяц",
    yearsPlaceholder: "Сколько лет будешь пользоваться",
    costPerUseHint: "Как часто и как долго ты будешь этим пользоваться, превращает цену в стоимость одного использования.",
    deleteLink: "Удалить этот план",
  },
  errors: {
    reorder: "Не удалось сохранить новый порядок.",
    save: "Не удалось сохранить этот план.",
    delete: "Не удалось удалить этот план.",
  },
  deleteDialog: {
    title: "Удалить план?",
    message: "«{{name}}» и запись о накопленных {{amount}} будут удалены. Сами деньги остаются там, где ты их хранишь.",
    keep: "Оставить",
  },
};

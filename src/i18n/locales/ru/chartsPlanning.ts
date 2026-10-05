/**
 * BudgetArk - Русские тексты: вкладка «Карты» (planning)
 * File: src/i18n/locales/ru/chartsPlanning.ts
 *
 * Russian counterpart of en/chartsPlanning.ts. Informal "ты" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { LocalizedPlural } from "../types";
import type { chartsPlanning as en } from "../en/chartsPlanning";

export const chartsPlanning: LocalizedPlural<typeof en> = {
  plannerCard: {
    title: "Спланировать покупку",
    hint: "Накопления на цель, встроенные в этапы твоего Ковчега",
    yourPlans: "Твои планы",
    yourPlansHint: "Нажми на план, чтобы пополнить. Планы живут на Мостике и входят в чистые активы.",
    newPlan: "+ Спланировать новую покупку",
    form: {
      what: "На что копишь?",
      namePlaceholder: "напр. Новый ноутбук",
      price: "Цена",
      alreadySaved: "Уже накоплено",
      zeroPlaceholder: "0",
    },
    categories: {
      car: "Машина",
      home: "Дом",
      travel: "Путешествия",
      education: "Образование",
      other: "Другое",
      emergency_fund: "Резервный фонд",
    },
    setAside: {
      label: "Откладывать каждый месяц",
    },
    needBy: {
      label: "Нужно к",
      none: "Без даты - когда накопится",
      pickerTitle: "Нужно к",
      required: "Для этой даты нужно {{required}}/мес.",
      requiredShort: "Для этой даты нужно {{required}}/мес - с текущими {{monthly}}/мес не успеть.",
    },
    timeline: {
      today: "Можешь купить уже сегодня",
      ready: "Готово {{date}} ({{duration}})",
      pickAmount: "Выбери сумму в месяц, чтобы увидеть дату",
    },
    fit: {
      fits: "Легко вписывается: после средних расходов остаётся около {{amount}}/мес, а это берёт половину или меньше.",
      tight: "Впритык: это забирает большую часть из ~{{amount}}/мес, что остаётся после средних расходов. Возможно, но запаса на сюрпризы почти нет.",
      over: "Сверх бюджета: это больше, чем ~{{amount}}/мес, что остаётся после средних расходов, - ОБЯЗАТЕЛЬНО урежет другие траты или цели. Попробуй сумму меньше или дату позже.",
      overNoFreeCash:
        "Твои средние расходы уже равны доходу или выше, так что любое откладывание урежет текущие траты или цели. Сначала попробуй сократить какую-то категорию (поможет инструмент «А что, если» выше).",
      trackFirst:
        "Запиши несколько месяцев доходов и расходов во вкладке «Бюджет» - тогда инструмент сверит темп с твоим реальным денежным потоком.",
    },
    cost: {
      title: "Сколько это стоит на самом деле",
      perUse: "Это {{description}}.",
      perUseHint: "Как часто будешь этим пользоваться? Сдвинь ползунок от нуля, чтобы увидеть цену за раз - хороший тест для колонки желаний.",
      usesLabel: "Сколько раз в месяц будешь пользоваться",
      notTracked: "не учитывается",
      usesValue: "{{count}}×",
      years_one: "{{count}} г.",
      years_few: "{{count}} г.",
      years_many: "{{count}} л.",
      years_other: "{{count}} г.",
    },
    hours: {
      title: "Часы работы",
      line: "{{price}} - это {{hours}} при {{rate}}/ч на руки.",
      lineFromIncome: "{{price}} - это {{hours}} при {{rate}}/ч на руки (по твоему среднему доходу {{income}}/мес).",
      hint: "Запиши доход во вкладке «Бюджет» или введи ниже свой заработок в час на руки, чтобы увидеть цену в часах работы.",
      perWeekLabel: "Часов работы в неделю",
      perWeekValue: "{{count}} ч",
      overrideLabelWithIncome: "Или введи заработок в час на руки (оставь пустым, чтобы взять из дохода)",
      overrideLabel: "Твой заработок в час на руки",
      overridePlaceholder: "напр. 28.50",
    },
    finance: {
      title: "В кредит или накопить",
      aprLabel: "Ставка, если брать в кредит",
      aprValue: "{{rate}} %",
      termChip: "{{count}} мес",
      summary:
        "Кредит {{amount}} под {{rate}} % на {{months}} мес: {{payment}}/мес, {{interest}} процентов ({{total}} всего).",
      alreadyHave: "Деньги у тебя уже есть - накопление побеждает без вариантов.",
      savingWins: "Накопив, получишь это {{date}}, на {{later}} позже, и сохранишь {{interest}}{{perMonthClause}}.",
      perMonthClause: " - около {{amount}} за каждый месяц ожидания, который кредит бы пропустил",
      extraClause: " Платёж по кредиту к тому же на {{amount}}/мес больше твоего откладывания, и так {{months}} мес.",
      pickAmount: "Выбери сумму в месяц выше, чтобы сравнить ожидание с процентами.",
      arkWarning: "Новый кредит на этапе «{{step}}» отбрасывает твой Ковчег назад - эти проценты нужны самому этапу.",
      nothingToFinance: "Нечего брать в кредит - накопленного уже хватает.",
    },
    ark: {
      title: "Твой Ковчег: этап «{{step}}»",
      sinkingFund: "Мышление накопления на цель",
      tradeoff: "Компромисс: {{amount}}/мес в долги вместо этого освободили бы тебя от долгов на {{sooner}} раньше{{interestClause}}.",
      interestClause: " и сэкономили бы {{amount}} на процентах",
    },
    errors: {
      start: "Не удалось создать накопление. Попробуй ещё раз.",
    },
    buttons: {
      start: "Начать копить",
    },
  },
  loan: {
    title: "Кредитный / ипотечный калькулятор",
    hint: "Посмотри ежемесячный платёж и общие проценты",
    sliders: {
      loanAmount: "Сумма кредита",
      loanRate: "Процентная ставка (годовых)",
      loanTerm: "Срок кредита",
      rateValue: "{{value}} %",
      termValue: "{{value}} г.",
      preset: "{{count}} г.",
    },
    result: {
      label: "ЕЖЕМЕСЯЧНЫЙ ПЛАТЁЖ",
      sub_one: "кредит {{amount}} · {{rate}} % годовых · {{count}} год",
      sub_few: "кредит {{amount}} · {{rate}} % годовых · {{count}} года",
      sub_many: "кредит {{amount}} · {{rate}} % годовых · {{count}} лет",
      sub_other: "кредит {{amount}} · {{rate}} % годовых · {{count}} года",
    },
    breakdown: {
      title: "Структура стоимости",
      principal: "Основной долг",
      totalInterest: "Проценты всего",
      totalPaid_one: "Всего ты заплатишь {{total}} за {{count}} год",
      totalPaid_few: "Всего ты заплатишь {{total}} за {{count}} года",
      totalPaid_many: "Всего ты заплатишь {{total}} за {{count}} лет",
      totalPaid_other: "Всего ты заплатишь {{total}} за {{count}} года",
    },
    firstFive: {
      label: "ПРОЦЕНТЫ ЗА ПЕРВЫЕ 5 ЛЕТ",
      share: "{{percent}} % всех процентов выплачивается в первые 60 месяцев.",
      shortLoan: "Кредит заканчивается раньше 5 лет, так что здесь показаны проценты за весь срок.",
      principal: "Основной долг за этот период: {{amount}}",
    },
    yearly: {
      title: "Сводка по годам",
      hint: "Группирует каждые 12 платежей от начала кредита. Последний год может быть короче.",
      meta: "{{count}} г.",
      columns: {
        year: "Год",
        payments: "Платежи",
        principal: "Осн. долг",
        interest: "Проценты",
        endBalance: "Остаток",
      },
    },
    schedule: {
      title: "График погашения",
      hint: "Платёж, основной долг, проценты и остаток по месяцам.",
      meta: "{{count}} мес",
      columns: {
        month: "Месяц",
        payment: "Платёж",
        principal: "Осн. долг",
        interest: "Проценты",
        balance: "Остаток",
      },
      showing: "Показано {{visible}} из {{total}} мес",
      exportCsv: "Экспорт CSV",
      preparing: "Готовим CSV...",
      showMore: "Показать ещё {{count}}",
      showLess: "Свернуть",
      exportDialogTitle: "Экспорт графика погашения",
      exportSuccess: "CSV-экспорт открыт. Сохрани или отправь его из меню.",
      exportFailed: "Не удалось экспортировать график кредита.",
    },
  },
};

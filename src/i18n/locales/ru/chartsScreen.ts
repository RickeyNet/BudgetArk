/**
 * BudgetArk - Русские тексты: вкладка «Карты» (screen)
 * File: src/i18n/locales/ru/chartsScreen.ts
 *
 * Russian counterpart of en/chartsScreen.ts. Informal "ты" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. The "Why 7%?" card keeps
 * its US-market framing (S&P 500, dollars) because that is what the
 * calculator's default rate is based on.
 */

import type { LocalizedPlural } from "../types";
import type { chartsScreen as en } from "../en/chartsScreen";

export const chartsScreen: LocalizedPlural<typeof en> = {
  header: {
    title: "Карты",
    subtitle: "Изучай моря. Прокладывай курс.",
  },
  course: {
    eyebrow: "⭐ КУРС КАПИТАНА",
    startHere: "НАЧНИ ЗДЕСЬ",
    resume: "ПРОДОЛЖИТЬ",
    chapterRef: "Гл. {{number}} · {{title}}",
    readMin: " · {{count}} мин",
    lessonReadMin: "{{count}} мин",
    filterOnly: "{{glyph}} Только уроки: {{topic}}",
    showAll: "Показать все ✕",
    comingSoon: "Скоро",
  },
  topics: {
    sectionTitle: "ТЕМЫ",
    hint: "Нажми, чтобы отфильтровать курс по теме",
    labels: {
      budgeting: "Бюджет",
      debt: "Долги",
      saving: "Сбережения",
      investing: "Инвестиции",
      taxes: "Налоги",
      insurance: "Страхование",
      real_estate: "Недвижимость",
      retirement: "Пенсия",
      mindset: "Мышление",
    },
  },
  tools: {
    sectionTitle: "ИНСТРУМЕНТЫ",
    hint: "Калькуляторы и утилиты",
  },
  units: {
    percent: "{{value}} %",
    years: "{{value}} г.",
    yearPreset: "{{count}} г.",
  },
  compound: {
    title: "Калькулятор сложного процента",
    hint: "Спрогнозируй рост своих инвестиций",
    projectedValue: "ПРОГНОЗ",
    subLump: "{{lump}} сейчас + {{monthly}}/мес · через {{years}} лет под {{rate}} %",
    subPlain: "в сегодняшних деньгах · через {{years}} лет под {{rate}} %",
    sliders: {
      lumpSum: "Начальная сумма",
      contribution: "Ежемесячный взнос",
      returnRate: "Годовая доходность",
      years: "Срок",
    },
    presets: {
      savings: "Вклад",
      bonds: "Облигации",
      sp500: "S&P 500",
      aggressive: "Агрессивно",
    },
    comparison: {
      title: "Разово или ежемесячно",
      once: "{{amount}} разово",
      perMonth: "{{amount}}/мес",
      both: "И то, и другое",
      crossover:
        "Ежемесячный план обгоняет разовую сумму на {{year}}-м году, но и вкладывает {{putIn}} против {{lump}}. Настоящий выигрыш - делать и то, и другое.",
      noCrossover:
        "За {{years}} лет разовая сумма сама по себе остаётся впереди ежемесячного плана. Настоящий выигрыш - делать и то, и другое.",
    },
    rule72: "Под {{rate}} % твои деньги удваиваются примерно каждые ~{{years}} лет (правило 72)",
    whyShow: "Почему 7 %?",
    whyHide: "Скрыть: Почему 7 %?",
    why: {
      title: "S&P 500 и инфляция",
      p1: "S&P 500 - это индекс 500 крупнейших компаний США. С 1926 года он приносил в среднем ~10 % в год.",
      p2: "Но инфляция (рост цен) исторически составляет в среднем ~3 % в год. То есть на $100 сегодня в будущем купишь меньше.",
      p3: "Если вычесть инфляцию (10 % - 3 %), реальная доходность около 7 %. По умолчанию калькулятор использует доходность с поправкой на инфляцию, поэтому прогноз показывает, что твои деньги реально смогут купить в сегодняшних ценах.",
      footer: "Прошлые результаты не гарантируют будущих. Реальная доходность меняется год от года.",
    },
    chart: {
      title: "Рост со временем",
      totalValue: "Итоговая стоимость",
      contributions: "Взносы",
      axisYear: "{{count}} г.",
    },
    breakdown: {
      title: "Структура",
      putIn: "Ты вложил(а)",
      contribute: "Ты вносишь",
      interest: "Заработано на процентах",
      ratio: "Сложный процент принёс на {{percent}} % больше",
    },
  },
  refi: {
    title: "Калькулятор окупаемости рефинансирования",
    hint: "Проверь, действительно ли рефинансирование экономит деньги",
    breakEven: "ТОЧКА ОКУПАЕМОСТИ",
    pickOne: "Выбери хотя бы один долг ниже, чтобы увидеть сравнение.",
    months: "{{count}} мес",
    recoverYears: "~{{years}} лет, чтобы отбить {{amount}} расходов на оформление",
    recoverUnderYear: "{{amount}} расходов на оформление окупятся меньше чем за год",
    noBreakEven: "Новый платёж не ниже текущего - окупаемости нет.",
    currentLoan: "ТЕКУЩИЙ КРЕДИТ",
    pickDebts: "Выбери долги, которые хочешь рефинансировать",
    noDebts: "Добавь долг во вкладке «Долги», чтобы пользоваться калькулятором.",
    debtMeta: "{{balance}} · {{rate}} % годовых",
    goalSet: " · цель задана",
    summaryTitle: "СВОДКА ПО ТЕКУЩЕМУ КРЕДИТУ",
    combinedBalance: "Общий баланс",
    apr: "Годовая ставка",
    weightedApr: "Взвешенная ставка",
    selected: "Выбрано долгов: {{selected}} из {{total}}",
    weightedByBalance: " · взвешено по балансу",
    autoFilledHint:
      "Оставшиеся годы подставлены из целевых дат долгов. Меняй свободно, если даты неточные.",
    setGoalHint: "Задай целевую дату для каждого долга во вкладке «Долги», чтобы годы подставлялись автоматически.",
    newLoan: "НОВЫЙ КРЕДИТ",
    sliders: {
      refiCurrentTerm: "Осталось лет",
      refiNewRate: "Новая ставка (годовых)",
      refiNewTerm: "Новый срок (лет)",
      refiClosingCosts: "Расходы на оформление",
    },
    monthlyPayment: "Ежемесячный платёж",
    current: "Сейчас",
    new: "Новый",
    savesPerMonth: "Экономия {{amount}}/мес",
    costsPerMonth: "Дороже на {{amount}}/мес",
    samePayment: "Тот же ежемесячный платёж",
    lifetimeInterest: "Проценты за весь срок",
    keepCurrent: "Оставить как есть",
    refinance: "Рефинансировать",
    savesLifetime: "Экономия {{amount}} за весь срок кредита",
    paysMore: "На {{amount}} больше процентов в сумме",
    sameLifetime: "Те же проценты за весь срок",
    netSavings: "Чистая экономия за новый срок {{years}} лет: ",
    extendsWarning:
      "Внимание: новый срок длиннее того, что осталось по текущему кредиту. Платёж ниже отчасти потому, что баланс растянут на больше месяцев - проверь проценты за весь срок выше, стоит ли оно того.",
  },
  ef: {
    title: "Калькулятор резервного фонда",
    hint: "Следи за своей подушкой безопасности",
    expensesTitle: "Твои расходы в месяц",
    basedOn: "По твоему бюджету: в среднем {{amount}}/мес",
    noData: "Данных бюджета пока нет - введи месячные расходы ниже",
    placeholder: "Расходы в месяц",
    threeMonth: "Фонд на 3 месяца",
    sixMonth: "Фонд на 6 месяцев",
    saved: "Накоплено {{amount}}",
    monthsToReach_one: "~{{count}} месяц до цели при {{amount}}/мес",
    monthsToReach_few: "~{{count}} месяца до цели при {{amount}}/мес",
    monthsToReach_many: "~{{count}} месяцев до цели при {{amount}}/мес",
    monthsToReach_other: "~{{count}} месяца до цели при {{amount}}/мес",
    threeReached: "Фонд на 3 месяца собран!",
    sixReached: "Фонд на 6 месяцев собран!",
    monthlySavings: "Сбережения в месяц",
    note: "Обычная цель - 3-6 месяцев расходов на жизнь наличными. Это покрывает потерю работы, медицинские расходы или внезапный ремонт без новых долгов. Твоя ситуация может отличаться.",
  },
  errors: {
    loadFailed: "Не удалось загрузить данные. Открой вкладку заново.",
  },
};

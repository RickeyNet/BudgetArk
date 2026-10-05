/**
 * BudgetArk - Українські тексти: вкладка «Карти» (planning)
 * File: src/i18n/locales/uk/chartsPlanning.ts
 *
 * Ukrainian counterpart of en/chartsPlanning.ts. Informal "ти" throughout;
 * see src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { LocalizedPlural } from "../types";
import type { chartsPlanning as en } from "../en/chartsPlanning";

export const chartsPlanning: LocalizedPlural<typeof en> = {
  plannerCard: {
    title: "Спланувати покупку",
    hint: "Накопичення на ціль, вбудовані в етапи твого Ковчега",
    yourPlans: "Твої плани",
    yourPlansHint: "Торкнись плану, щоб поповнити. Плани живуть на Містку і входять до чистих активів.",
    newPlan: "+ Спланувати нову покупку",
    form: {
      what: "На що збираєш?",
      namePlaceholder: "напр. Новий ноутбук",
      price: "Ціна",
      alreadySaved: "Уже накопичено",
      zeroPlaceholder: "0",
    },
    categories: {
      car: "Авто",
      home: "Дім",
      travel: "Подорожі",
      education: "Освіта",
      other: "Інше",
      emergency_fund: "Резервний фонд",
    },
    setAside: {
      label: "Відкладати щомісяця",
    },
    needBy: {
      label: "Потрібно до",
      none: "Без дати - коли назбирається",
      pickerTitle: "Потрібно до",
      required: "Для цієї дати потрібно {{required}}/міс.",
      requiredShort: "Для цієї дати потрібно {{required}}/міс - з поточними {{monthly}}/міс не встигнеш.",
    },
    timeline: {
      today: "Можеш купити вже сьогодні",
      ready: "Готово {{date}} ({{duration}})",
      pickAmount: "Вибери суму на місяць, щоб побачити дату",
    },
    fit: {
      fits: "Легко вписується: після середніх витрат лишається близько {{amount}}/міс, а це бере половину або менше.",
      tight: "Впритул: це забирає більшу частину з ~{{amount}}/міс, що лишається після середніх витрат. Можливо, але запасу на сюрпризи майже немає.",
      over: "Понад бюджет: це більше, ніж ~{{amount}}/міс, що лишається після середніх витрат, - ОБОВ'ЯЗКОВО вріже інші витрати чи цілі. Спробуй меншу суму або пізнішу дату.",
      overNoFreeCash:
        "Твої середні витрати вже дорівнюють доходу або перевищують його, тож будь-яке відкладання вріже поточні витрати чи цілі. Спершу спробуй скоротити якусь категорію (допоможе інструмент «А що, якби» вище).",
      trackFirst:
        "Запиши кілька місяців доходів і витрат у вкладці «Бюджет» - тоді інструмент звірить темп із твоїм реальним грошовим потоком.",
    },
    cost: {
      title: "Скільки це коштує насправді",
      perUse: "Це {{description}}.",
      perUseHint: "Як часто ти цим користуватимешся? Зсунь повзунок від нуля, щоб побачити ціну за раз - добрий тест для колонки бажань.",
      usesLabel: "Скільки разів на місяць користуватимешся",
      notTracked: "не враховується",
      usesValue: "{{count}}×",
      years_one: "{{count}} р.",
      years_few: "{{count}} р.",
      years_many: "{{count}} р.",
      years_other: "{{count}} р.",
    },
    hours: {
      title: "Години роботи",
      line: "{{price}} - це {{hours}} при {{rate}}/год на руки.",
      lineFromIncome: "{{price}} - це {{hours}} при {{rate}}/год на руки (за твоїм середнім доходом {{income}}/міс).",
      hint: "Запиши дохід у вкладці «Бюджет» або введи нижче свій заробіток за годину на руки, щоб побачити ціну в годинах роботи.",
      perWeekLabel: "Годин роботи на тиждень",
      perWeekValue: "{{count}} год",
      overrideLabelWithIncome: "Або введи заробіток за годину на руки (залиш порожнім, щоб узяти з доходу)",
      overrideLabel: "Твій заробіток за годину на руки",
      overridePlaceholder: "напр. 28.50",
    },
    finance: {
      title: "У кредит чи накопичити",
      aprLabel: "Ставка, якщо брати в кредит",
      aprValue: "{{rate}} %",
      termChip: "{{count}} міс",
      summary:
        "Кредит {{amount}} під {{rate}} % на {{months}} міс: {{payment}}/міс, {{interest}} відсотків ({{total}} загалом).",
      alreadyHave: "Гроші в тебе вже є - накопичення перемагає без варіантів.",
      savingWins: "Накопичивши, отримаєш це {{date}}, на {{later}} пізніше, і збережеш {{interest}}{{perMonthClause}}.",
      perMonthClause: " - близько {{amount}} за кожен місяць очікування, який кредит би пропустив",
      extraClause: " Платіж за кредитом до того ж на {{amount}}/міс більший за твоє відкладання, і так {{months}} міс.",
      pickAmount: "Вибери суму на місяць вище, щоб порівняти очікування з відсотками.",
      arkWarning: "Новий кредит на етапі «{{step}}» відкидає твій Ковчег назад - ці відсотки потрібні самому етапу.",
      nothingToFinance: "Нема чого брати в кредит - накопиченого вже вистачає.",
    },
    ark: {
      title: "Твій Ковчег: етап «{{step}}»",
      sinkingFund: "Мислення накопичення на ціль",
      tradeoff: "Компроміс: {{amount}}/міс у борги натомість звільнили б тебе від боргів на {{sooner}} раніше{{interestClause}}.",
      interestClause: " і зекономили б {{amount}} на відсотках",
    },
    errors: {
      start: "Не вдалося створити накопичення. Спробуй ще раз.",
    },
    buttons: {
      start: "Почати збирати",
    },
  },
  loan: {
    title: "Кредитний / іпотечний калькулятор",
    hint: "Подивись щомісячний платіж і загальні відсотки",
    sliders: {
      loanAmount: "Сума кредиту",
      loanRate: "Відсоткова ставка (річних)",
      loanTerm: "Термін кредиту",
      rateValue: "{{value}} %",
      termValue: "{{value}} р.",
      preset: "{{count}} р.",
    },
    result: {
      label: "ЩОМІСЯЧНИЙ ПЛАТІЖ",
      sub_one: "кредит {{amount}} · {{rate}} % річних · {{count}} рік",
      sub_few: "кредит {{amount}} · {{rate}} % річних · {{count}} роки",
      sub_many: "кредит {{amount}} · {{rate}} % річних · {{count}} років",
      sub_other: "кредит {{amount}} · {{rate}} % річних · {{count}} року",
    },
    breakdown: {
      title: "Структура вартості",
      principal: "Основний борг",
      totalInterest: "Відсотки загалом",
      totalPaid_one: "Загалом ти заплатиш {{total}} за {{count}} рік",
      totalPaid_few: "Загалом ти заплатиш {{total}} за {{count}} роки",
      totalPaid_many: "Загалом ти заплатиш {{total}} за {{count}} років",
      totalPaid_other: "Загалом ти заплатиш {{total}} за {{count}} року",
    },
    firstFive: {
      label: "ВІДСОТКИ ЗА ПЕРШІ 5 РОКІВ",
      share: "{{percent}} % усіх відсотків виплачується в перші 60 місяців.",
      shortLoan: "Кредит закінчується раніше ніж за 5 років, тож тут показано відсотки за весь термін.",
      principal: "Основний борг за цей період: {{amount}}",
    },
    yearly: {
      title: "Зведення за роками",
      hint: "Групує кожні 12 платежів від початку кредиту. Останній рік може бути коротшим.",
      meta: "{{count}} р.",
      columns: {
        year: "Рік",
        payments: "Платежі",
        principal: "Осн. борг",
        interest: "Відсотки",
        endBalance: "Залишок",
      },
    },
    schedule: {
      title: "Графік погашення",
      hint: "Платіж, основний борг, відсотки та залишок по місяцях.",
      meta: "{{count}} міс",
      columns: {
        month: "Місяць",
        payment: "Платіж",
        principal: "Осн. борг",
        interest: "Відсотки",
        balance: "Залишок",
      },
      showing: "Показано {{visible}} з {{total}} міс",
      exportCsv: "Експорт CSV",
      preparing: "Готуємо CSV...",
      showMore: "Показати ще {{count}}",
      showLess: "Згорнути",
      exportDialogTitle: "Експорт графіка погашення",
      exportSuccess: "CSV-експорт відкрито. Збережи або надішли його з меню.",
      exportFailed: "Не вдалося експортувати графік кредиту.",
    },
  },
};

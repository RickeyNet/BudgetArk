/**
 * BudgetArk - Українські тексти: вкладка «Карти» (screen)
 * File: src/i18n/locales/uk/chartsScreen.ts
 *
 * Ukrainian counterpart of en/chartsScreen.ts. Informal "ти" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. The "Why 7%?" card keeps
 * its US-market framing (S&P 500, dollars) because that is what the
 * calculator's default rate is based on.
 */

import type { LocalizedPlural } from "../types";
import type { chartsScreen as en } from "../en/chartsScreen";

export const chartsScreen: LocalizedPlural<typeof en> = {
  header: {
    title: "Карти",
    subtitle: "Вивчай моря. Прокладай курс.",
  },
  course: {
    eyebrow: "⭐ КУРС КАПІТАНА",
    startHere: "ПОЧНИ ТУТ",
    resume: "ПРОДОВЖИТИ",
    chapterRef: "Розд. {{number}} · {{title}}",
    readMin: " · {{count}} хв",
    lessonReadMin: "{{count}} хв",
    filterOnly: "{{glyph}} Лише уроки: {{topic}}",
    showAll: "Показати всі ✕",
    comingSoon: "Незабаром",
  },
  topics: {
    sectionTitle: "ТЕМИ",
    hint: "Торкнись, щоб відфільтрувати курс за темою",
    labels: {
      budgeting: "Бюджет",
      debt: "Борги",
      saving: "Заощадження",
      investing: "Інвестиції",
      taxes: "Податки",
      insurance: "Страхування",
      real_estate: "Нерухомість",
      retirement: "Пенсія",
      mindset: "Мислення",
    },
  },
  tools: {
    sectionTitle: "ІНСТРУМЕНТИ",
    hint: "Калькулятори та утиліти",
  },
  units: {
    percent: "{{value}} %",
    years: "{{value}} р.",
    yearPreset: "{{count}} р.",
  },
  compound: {
    title: "Калькулятор складних відсотків",
    hint: "Спрогнозуй зростання своїх інвестицій",
    projectedValue: "ПРОГНОЗ",
    subLump: "{{lump}} зараз + {{monthly}}/міс · через {{years}} р. під {{rate}} %",
    subPlain: "у сьогоднішніх грошах · через {{years}} р. під {{rate}} %",
    sliders: {
      lumpSum: "Початкова сума",
      contribution: "Щомісячний внесок",
      returnRate: "Річна дохідність",
      years: "Термін",
    },
    presets: {
      savings: "Депозит",
      bonds: "Облігації",
      sp500: "S&P 500",
      aggressive: "Агресивно",
    },
    comparison: {
      title: "Разово чи щомісяця",
      once: "{{amount}} разово",
      perMonth: "{{amount}}/міс",
      both: "І те, й інше",
      crossover:
        "Щомісячний план обганяє разову суму на {{year}}-му році, але й вкладає {{putIn}} проти {{lump}}. Справжній виграш - робити і те, й інше.",
      noCrossover:
        "За {{years}} р. разова сума сама по собі лишається попереду щомісячного плану. Справжній виграш - робити і те, й інше.",
    },
    rule72: "Під {{rate}} % твої гроші подвоюються приблизно кожні ~{{years}} р. (правило 72)",
    whyShow: "Чому 7 %?",
    whyHide: "Сховати: Чому 7 %?",
    why: {
      title: "S&P 500 та інфляція",
      p1: "S&P 500 - це індекс 500 найбільших компаній США. З 1926 року він приносив у середньому ~10 % на рік.",
      p2: "Але інфляція (зростання цін) історично становить у середньому ~3 % на рік. Тобто за $100 сьогодні в майбутньому купиш менше.",
      p3: "Якщо відняти інфляцію (10 % - 3 %), реальна дохідність близько 7 %. За замовчуванням калькулятор використовує дохідність з поправкою на інфляцію, тож прогноз показує, що твої гроші реально зможуть купити в сьогоднішніх цінах.",
      footer: "Минулі результати не гарантують майбутніх. Реальна дохідність змінюється з року в рік.",
    },
    chart: {
      title: "Зростання з часом",
      totalValue: "Підсумкова вартість",
      contributions: "Внески",
      axisYear: "{{count}} р.",
    },
    breakdown: {
      title: "Структура",
      putIn: "Ти вклав(ла)",
      contribute: "Ти вносиш",
      interest: "Зароблено на відсотках",
      ratio: "Складні відсотки принесли на {{percent}} % більше",
    },
  },
  refi: {
    title: "Калькулятор окупності рефінансування",
    hint: "Перевір, чи справді рефінансування економить гроші",
    breakEven: "ТОЧКА ОКУПНОСТІ",
    pickOne: "Вибери хоча б один борг нижче, щоб побачити порівняння.",
    months: "{{count}} міс",
    recoverYears: "~{{years}} р., щоб відбити {{amount}} витрат на оформлення",
    recoverUnderYear: "{{amount}} витрат на оформлення окупляться менш ніж за рік",
    noBreakEven: "Новий платіж не нижчий за поточний - окупності немає.",
    currentLoan: "ПОТОЧНИЙ КРЕДИТ",
    pickDebts: "Вибери борги, які хочеш рефінансувати",
    noDebts: "Додай борг у вкладці «Борги», щоб користуватися калькулятором.",
    debtMeta: "{{balance}} · {{rate}} % річних",
    goalSet: " · ціль задано",
    summaryTitle: "ЗВЕДЕННЯ ПО ПОТОЧНОМУ КРЕДИТУ",
    combinedBalance: "Загальний баланс",
    apr: "Річна ставка",
    weightedApr: "Зважена ставка",
    selected: "Вибрано боргів: {{selected}} з {{total}}",
    weightedByBalance: " · зважено за балансом",
    autoFilledHint:
      "Роки, що лишилися, підставлено з цільових дат боргів. Змінюй вільно, якщо дати неточні.",
    setGoalHint: "Задай цільову дату для кожного боргу у вкладці «Борги», щоб роки підставлялися автоматично.",
    newLoan: "НОВИЙ КРЕДИТ",
    sliders: {
      refiCurrentTerm: "Лишилося років",
      refiNewRate: "Нова ставка (річних)",
      refiNewTerm: "Новий термін (років)",
      refiClosingCosts: "Витрати на оформлення",
    },
    monthlyPayment: "Щомісячний платіж",
    current: "Зараз",
    new: "Новий",
    savesPerMonth: "Економія {{amount}}/міс",
    costsPerMonth: "Дорожче на {{amount}}/міс",
    samePayment: "Той самий щомісячний платіж",
    lifetimeInterest: "Відсотки за весь термін",
    keepCurrent: "Лишити як є",
    refinance: "Рефінансувати",
    savesLifetime: "Економія {{amount}} за весь термін кредиту",
    paysMore: "На {{amount}} більше відсотків загалом",
    sameLifetime: "Ті самі відсотки за весь термін",
    netSavings: "Чиста економія за новий термін {{years}} р.: ",
    extendsWarning:
      "Увага: новий термін довший за той, що лишився по поточному кредиту. Платіж нижчий почасти тому, що баланс розтягнуто на більше місяців - перевір відсотки за весь термін вище, чи варте воно того.",
  },
  ef: {
    title: "Калькулятор резервного фонду",
    hint: "Стеж за своєю подушкою безпеки",
    expensesTitle: "Твої витрати на місяць",
    basedOn: "За твоїм бюджетом: у середньому {{amount}}/міс",
    noData: "Даних бюджету ще немає - введи місячні витрати нижче",
    placeholder: "Витрати на місяць",
    threeMonth: "Фонд на 3 місяці",
    sixMonth: "Фонд на 6 місяців",
    saved: "Накопичено {{amount}}",
    monthsToReach_one: "~{{count}} місяць до цілі при {{amount}}/міс",
    monthsToReach_few: "~{{count}} місяці до цілі при {{amount}}/міс",
    monthsToReach_many: "~{{count}} місяців до цілі при {{amount}}/міс",
    monthsToReach_other: "~{{count}} місяця до цілі при {{amount}}/міс",
    threeReached: "Фонд на 3 місяці зібрано!",
    sixReached: "Фонд на 6 місяців зібрано!",
    monthlySavings: "Заощадження на місяць",
    note: "Звична ціль - 3-6 місяців витрат на життя готівкою. Це покриває втрату роботи, медичні витрати чи раптовий ремонт без нових боргів. Твоя ситуація може відрізнятися.",
  },
  errors: {
    loadFailed: "Не вдалося завантажити дані. Відкрий вкладку знову.",
  },
};

/**
 * BudgetArk - Українські тексти: вкладка «Місток» (планувальник)
 * File: src/i18n/locales/uk/bridgePlanner.ts
 *
 * Ukrainian counterpart of en/bridgePlanner.ts. Informal "ти" throughout;
 * see src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { LocalizedPlural } from "../types";
import type { bridgePlanner as en } from "../en/bridgePlanner";

export const bridgePlanner: LocalizedPlural<typeof en> = {
  summary: {
    saved: "НАКОПИЧЕНО",
    stillToGo: "ЗАЛИШИЛОСЯ",
    total: "РАЗОМ",
    plans_one: "{{count}} план",
    plans_few: "{{count}} плани",
    plans_many: "{{count}} планів",
    plans_other: "{{count}} плану",
    funded: " · {{count}} зібрано",
    allFundedNow: " · усі зібрано",
    allFundedBy: " · усі зібрано до {{date}}",
    notFundedInHorizon: " · за цього темпу не всі зберуться за 20 років",
    setAmountToSee: " · вкажи суму на місяць нижче, щоб дізнатися коли",
    late_one: "{{count}} план за цього темпу не встигне до потрібної дати.",
    late_few: "{{count}} плани за цього темпу не встигнуть до потрібної дати.",
    late_many: "{{count}} планів за цього темпу не встигнуть до потрібної дати.",
    late_other: "{{count}} плану за цього темпу не встигнуть до потрібної дати.",
  },
  order: {
    label: "ПОРЯДОК",
    methods: {
      snowball: "Спершу найдешевші",
      soonest: "Спершу найтерміновіші",
      custom: "Мій порядок",
    },
    hints: {
      snowball: "Спершу закривай найдешевші плани заради швидких перемог - снігова куля.",
      soonest: "Плани з найближчою потрібною датою йдуть першими; без дати - після.",
      custom: "Розстав їх сам стрілками на кожному плані.",
    },
  },
  setAside: {
    label: "Відкладати на всі плани",
    perMonth: "{{amount}}/міс",
    chartNow: "Зараз",
  },
  fit: {
    trackFirst: "Запиши повний місяць доходів і витрат, і тут з'явиться, чи вписується сума.",
    fits: "Вписується: після середніх витрат вільно близько {{amount}}/міс.",
    tight: "Впритул: це забирає більшу частину з ~{{amount}}/міс, вільних після середніх витрат.",
    over: "Забагато: більше, ніж ~{{amount}}/міс, вільних після середніх витрат.",
    overNoFreeCash: "Забагато: твої середні витрати вже перевищують дохід, тож відкладати доведеться з інших джерел.",
  },
  allocation: {
    modes: {
      rollover: "По одному",
      parallel: "Порівну",
    },
    hints: {
      rollover: "Уся сума йде в перший план; коли його зібрано, гроші переходять у наступний - як снігова куля за боргами.",
      parallel: "Сума ділиться порівну між усіма незібраними планами, а частка завершеного плану переходить решті.",
    },
  },
  row: {
    a11yAddFunds: "Поповнити {{name}}",
    fundedMeta: "Зібрано - можна купувати 🎉",
    progressMeta: "{{current}} із {{target}}",
    requiredSuffix: " · {{amount}}/міс, щоб встигнути до {{date}}",
    ready: "Готово {{date}}",
    monthlyNow: " · {{amount}}/міс зараз",
    waitsTurn: " · чекає своєї черги",
    misses: " · не встигне до {{date}}",
    lateFor_one: " · запізнення на {{count}} міс до {{date}}",
    lateFor_few: " · запізнення на {{count}} міс до {{date}}",
    lateFor_many: " · запізнення на {{count}} міс до {{date}}",
    lateFor_other: " · запізнення на {{count}} міс до {{date}}",
    itsDate: "своєї дати",
    notFundedInHorizon: "За цього темпу не збереться за 20 років",
    moveUp: "Перемістити {{name}} вище",
    moveDown: "Перемістити {{name}} нижче",
  },
  nudges: {
    makesItHappen: "вирішує справу",
    sooner_one: "на {{count}} міс раніше",
    sooner_few: "на {{count}} міс раніше",
    sooner_many: "на {{count}} міс раніше",
    sooner_other: "на {{count}} міс раніше",
    extraMonthlyA11y: "Додати {{amount}} на місяць до всіх планів",
    extraMonthly: "+{{amount}}/міс · {{sooner}}",
    lumpSumA11y: "Додати {{amount}} у {{name}} зараз",
    finishIt: "Закрити: {{amount}} зараз",
    lumpSumNow: "+{{amount}} зараз · {{sooner}}",
  },
  contribute: {
    savedOf: "Накопичено {{current}} із {{target}}.",
    amountPlaceholder: "Сума поповнення",
    negativeHint: "Від'ємна сума виправляє помилку.",
    costPerUseLabel: "ВАРТІСТЬ ОДНОГО ВИКОРИСТАННЯ (НЕОБОВ'ЯЗКОВО)",
    usesPlaceholder: "Використань на місяць",
    yearsPlaceholder: "Скільки років користуватимешся",
    costPerUseHint: "Як часто і як довго ти цим користуватимешся, перетворює ціну на вартість одного використання.",
    deleteLink: "Видалити цей план",
  },
  errors: {
    reorder: "Не вдалося зберегти новий порядок.",
    save: "Не вдалося зберегти цей план.",
    delete: "Не вдалося видалити цей план.",
  },
  deleteDialog: {
    title: "Видалити план?",
    message: "«{{name}}» і запис про накопичені {{amount}} буде видалено. Самі гроші залишаються там, де ти їх зберігаєш.",
    keep: "Залишити",
  },
};

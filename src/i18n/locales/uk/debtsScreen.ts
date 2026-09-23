/**
 * BudgetArk - Українські тексти: вкладка «Борги» (екран)
 * File: src/i18n/locales/uk/debtsScreen.ts
 *
 * Ukrainian counterpart of en/debtsScreen.ts. Informal "ти" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary (milestones: Кіль, Корпус,
 * Палуба, Припаси, Зібрати тварин, Якір, Вітрило).
 */

import type { LocalizedPlural } from "../types";
import type { debtsScreen as en } from "../en/debtsScreen";

export const debtsScreen: LocalizedPlural<typeof en> = {
  header: {
    title: "Облік боргів",
    subtitle: "Стеж за прогресом. Перемагай борги.",
    searchA11y: "Пошук за боргами, платежами та записами бюджету",
  },
  summary: {
    totalRemaining: "УСЬОГО ЗАЛИШИЛОСЯ",
    paidOff: "виплачено {{amount}}",
    ringA11y: "Погашено {{percent}} відсотків. Натисни, щоб відкрити історію платежів.",
    viewHistory: "🕐 Історія",
  },
  owner: {
    all: "Усі",
    mine: "Мої",
    partner: "Партнера",
    joint: "Спільні",
  },
  milestoneBar: {
    step: "Етап {{step}}/{{total}} • {{title}}",
    runway: " • запас {{months}} міс",
    goal: " • {{name}} {{percent}}%",
    tapToPlan: "{{strategy}} • Натисни, щоб спланувати",
    ark: "Побудуй свій Ковчег →",
  },
  strategy: {
    labels: {
      avalanche: "Лавина",
      snowball: "Снігова куля",
      custom: "Свій порядок",
    },
    order: {
      avalanche: "Порядок «Лавина»",
      snowball: "Порядок «Снігова куля»",
      custom: "Свій порядок",
    },
  },
  sections: {
    debts: "Борги",
  },
  empty: {
    title: "Побудуй свій Ковчег",
    sub: "Додай борги, коли будеш готовий, або спершу задай цілі за етапами.",
    setUp: "Налаштувати етапи",
  },
  payoff: {
    notSolvable: "Не розв'язується",
    zeroMonths: "0 місяців",
    months: "{{count}} міс",
    years: "{{count}} р.",
    yearsMonths: "{{years}} р. {{months}} міс",
    interest: "{{amount}} відс.",
    interestDash: "— відс.",
    makesPossible: "Робить погашення можливим",
    stillNotEnough: "Усе ще недостатньо для погашення",
    savings: "Економія {{amount}} • на {{months}} міс швидше",
    rec: {
      increase: "Збільшуй платежі, поки обидва плани не стануть розв'язними.",
      avalanche: "Найменше відсотків: Лавина.",
      snowball: "Найменше відсотків: Снігова куля.",
      tie: "Нічия - обидва методи коштують однаково.",
    },
  },
  milestones: {
    title: "Етапи «Побудуй свій Ковчег»",
    message: "Кіль, Корпус, Палуба, Припаси, Вітрило. Проходь кожен етап у своєму темпі.",
    complete: "Завершити",
    completed: "Завершено",
    rebuild: "Перебудувати",
    current: "Поточний",
    targetPlaceholder: "Ціль",
    saveTarget: "Зберегти ціль",
    compareTitle: "Порівняти стратегії погашення",
    extraLabel: "ДОДАТКОВИЙ ЩОМІСЯЧНИЙ ПЛАТІЖ",
    avalancheHint: "Спершу найвища ставка",
    snowballHint: "Спершу найменший баланс",
    currentColumn: "Зараз",
    perMonth: "+{{amount}}/міс",
    currentMethod: "Поточний метод",
    useAvalanche: "Обрати Лавину",
    useSnowball: "Обрати Снігову кулю",
    trackedLinked_one:
      "🛡️ Рахується за призначеним ощадним рахунком резервного фонду ({{amount}}). Оновлюй його баланс на Містку - синхронізація з банком робить це автоматично.",
    trackedLinked_few:
      "🛡️ Рахується за {{count}} призначеними ощадними рахунками резервного фонду ({{amount}}). Оновлюй їхні баланси на Містку - синхронізація з банком робить це автоматично.",
    trackedLinked_many:
      "🛡️ Рахується за {{count}} призначеними ощадними рахунками резервного фонду ({{amount}}). Оновлюй їхні баланси на Містку - синхронізація з банком робить це автоматично.",
    trackedLinked_other:
      "🛡️ Рахується за {{count}} призначеними ощадними рахунками резервного фонду ({{amount}}). Оновлюй їхні баланси на Містку - синхронізація з банком робить це автоматично.",
    setSavings: "Вказати заощадження",
    currentAmount: "Зараз: {{amount}}",
    set: "Вказати",
    collapse: "Згорнути",
    markInProgress: "Позначити як поточний",
    markComplete: "Позначити завершеним",
    arkComplete: "Ковчег побудовано",
    arkCompleteMessage: "Ти добудував свій Ковчег. Тепер піднімай вітрила й відкривай нові землі.",
    congrats: {
      keel: "Чудовий початок. Фундамент закладено.",
      hull: "Сильна робота. Усі борги, крім іпотеки, закрито.",
      deck: "Чудова дисципліна. Резервний фонд повністю зібрано.",
      supplies: "Гарна стабільність. Пенсійні інвестиції йдуть за планом.",
      gather_animals: "Молодець. Майбутнє твоїх дітей будується.",
      moorings: "Неймовірно. Твій дім виплачено.",
      sail: "Ти зробив це. Твій Ковчег побудовано. Створюй капітал і ділися щедро.",
      default: "Вітаємо! Ще один етап завершено. Так тримати.",
    },
    action: {
      supplies: "Інвестувати",
      gather_animals: "Зібрати",
      moorings: "Закріпити",
      sail: "Відпливти",
      default: "Будувати",
    },
  },
  savingsEntry: {
    logged: "Записано з «Побудуй свій Ковчег»",
    correction: "Коригування з «Побудуй свій Ковчег»",
  },
  alerts: {
    couldntSave: "Не вдалося зберегти",
    keepAliveUse: "Дата останнього використання картки не оновилася. Спробуй ще раз.",
    keepAliveMute: "Нагадування не вимкнулося. Спробуй ще раз.",
  },
  undo: {
    edited: "Змінено «{{name}}»",
    deleted: "Видалено «{{name}}»",
  },
  deleteDialog: {
    title: "Видалити борг",
    message: "Видалити {{name}}? Це не можна скасувати.",
  },
};

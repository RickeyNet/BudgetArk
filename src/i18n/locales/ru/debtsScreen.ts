/**
 * BudgetArk - Русские тексты: вкладка «Долги» (экран)
 * File: src/i18n/locales/ru/debtsScreen.ts
 *
 * Russian counterpart of en/debtsScreen.ts. Informal "ты" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary (milestones: Киль, Корпус,
 * Палуба, Припасы, Собрать животных, Якорь, Парус).
 */

import type { LocalizedPlural } from "../types";
import type { debtsScreen as en } from "../en/debtsScreen";

export const debtsScreen: LocalizedPlural<typeof en> = {
  header: {
    title: "Учёт долгов",
    subtitle: "Следи за прогрессом. Побеждай долги.",
    searchA11y: "Поиск по долгам, платежам и записям бюджета",
  },
  summary: {
    totalRemaining: "ВСЕГО ОСТАЛОСЬ",
    paidOff: "выплачено {{amount}}",
    ringA11y: "Погашено {{percent}} процентов. Нажми, чтобы открыть историю платежей.",
    viewHistory: "🕐 История",
  },
  owner: {
    all: "Все",
    mine: "Мои",
    partner: "Партнёра",
    joint: "Общие",
  },
  milestoneBar: {
    step: "Этап {{step}}/{{total}} • {{title}}",
    runway: " • запас {{months}} мес",
    goal: " • {{name}} {{percent}}%",
    tapToPlan: "{{strategy}} • Нажми, чтобы спланировать",
    ark: "Построй свой Ковчег →",
  },
  strategy: {
    labels: {
      avalanche: "Лавина",
      snowball: "Снежный ком",
      custom: "Свой порядок",
    },
    order: {
      avalanche: "Порядок «Лавина»",
      snowball: "Порядок «Снежный ком»",
      custom: "Свой порядок",
    },
  },
  sections: {
    debts: "Долги",
  },
  empty: {
    title: "Построй свой Ковчег",
    sub: "Добавь долги, когда будешь готов, или сначала задай цели по этапам.",
    setUp: "Настроить этапы",
  },
  payoff: {
    notSolvable: "Не решается",
    zeroMonths: "0 месяцев",
    months: "{{count}} мес",
    years: "{{count}} г.",
    yearsMonths: "{{years}} г. {{months}} мес",
    interest: "{{amount}} проц.",
    interestDash: "— проц.",
    makesPossible: "Делает погашение возможным",
    stillNotEnough: "Всё ещё недостаточно для погашения",
    savings: "Экономия {{amount}} • на {{months}} мес быстрее",
    rec: {
      increase: "Увеличивай платежи, пока оба плана не станут решаемыми.",
      avalanche: "Меньше всего процентов: Лавина.",
      snowball: "Меньше всего процентов: Снежный ком.",
      tie: "Ничья - оба метода стоят одинаково.",
    },
  },
  milestones: {
    title: "Этапы «Построй свой Ковчег»",
    message: "Киль, Корпус, Палуба, Припасы, Парус. Проходи каждый этап в своём темпе.",
    complete: "Завершить",
    completed: "Завершено",
    rebuild: "Перестроить",
    current: "Текущий",
    targetPlaceholder: "Цель",
    saveTarget: "Сохранить цель",
    compareTitle: "Сравнить стратегии погашения",
    extraLabel: "ДОПОЛНИТЕЛЬНЫЙ ЕЖЕМЕСЯЧНЫЙ ПЛАТЁЖ",
    avalancheHint: "Сначала самая высокая ставка",
    snowballHint: "Сначала самый маленький баланс",
    currentColumn: "Сейчас",
    perMonth: "+{{amount}}/мес",
    currentMethod: "Текущий метод",
    useAvalanche: "Выбрать Лавину",
    useSnowball: "Выбрать Снежный ком",
    trackedLinked_one:
      "🛡️ Считается по назначенному сберегательному счёту резервного фонда ({{amount}}). Обновляй его баланс на Мостике - синхронизация с банком делает это автоматически.",
    trackedLinked_few:
      "🛡️ Считается по {{count}} назначенным сберегательным счетам резервного фонда ({{amount}}). Обновляй их балансы на Мостике - синхронизация с банком делает это автоматически.",
    trackedLinked_many:
      "🛡️ Считается по {{count}} назначенным сберегательным счетам резервного фонда ({{amount}}). Обновляй их балансы на Мостике - синхронизация с банком делает это автоматически.",
    trackedLinked_other:
      "🛡️ Считается по {{count}} назначенным сберегательным счетам резервного фонда ({{amount}}). Обновляй их балансы на Мостике - синхронизация с банком делает это автоматически.",
    setSavings: "Указать накопления",
    currentAmount: "Сейчас: {{amount}}",
    set: "Указать",
    collapse: "Свернуть",
    markInProgress: "Отметить как текущий",
    markComplete: "Отметить завершённым",
    arkComplete: "Ковчег построен",
    arkCompleteMessage: "Ты достроил свой Ковчег. Теперь поднимай паруса и открывай новые земли.",
    congrats: {
      keel: "Отличное начало. Фундамент заложен.",
      hull: "Сильная работа. Все долги, кроме ипотеки, закрыты.",
      deck: "Отличная дисциплина. Резервный фонд полностью собран.",
      supplies: "Хорошая стабильность. Пенсионные инвестиции идут по плану.",
      gather_animals: "Молодец. Будущее твоих детей строится.",
      moorings: "Невероятно. Твой дом выплачен.",
      sail: "Ты сделал это. Твой Ковчег построен. Создавай капитал и делись щедро.",
      default: "Поздравляем! Ещё один этап завершён. Так держать.",
    },
    action: {
      supplies: "Инвестировать",
      gather_animals: "Собрать",
      moorings: "Закрепить",
      sail: "Отплыть",
      default: "Строить",
    },
  },
  savingsEntry: {
    logged: "Записано из «Построй свой Ковчег»",
    correction: "Корректировка из «Построй свой Ковчег»",
  },
  alerts: {
    couldntSave: "Не удалось сохранить",
    keepAliveUse: "Дата последнего использования карты не обновилась. Попробуй ещё раз.",
    keepAliveMute: "Напоминание не отключилось. Попробуй ещё раз.",
  },
  undo: {
    edited: "Изменено «{{name}}»",
    deleted: "Удалено «{{name}}»",
  },
  deleteDialog: {
    title: "Удалить долг",
    message: "Удалить {{name}}? Это нельзя отменить.",
  },
};

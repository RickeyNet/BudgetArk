/**
 * BudgetArk - Русские тексты: вкладка «Долги» (моменты)
 * File: src/i18n/locales/ru/debtsMoments.ts
 *
 * Russian counterpart of en/debtsMoments.ts. Informal "ты" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { LocalizedPlural } from "../types";
import type { debtsMoments as en } from "../en/debtsMoments";

export const debtsMoments: LocalizedPlural<typeof en> = {
  payoff: {
    kicker: {
      own: "Долг закрыт",
      partner: "Долг партнёра закрыт",
      joint: "Общий долг закрыт",
    },
    title: "Ты выплатил {{name}}",
    subtitle: "Ещё один баланс на {{zero}}. Направляй освободившиеся деньги на следующую цель.",
    totalCleared: "ВСЕГО ЗАКРЫТО",
    paymentFreed: "ОСВОБОДИЛОСЬ",
    perMonth: "{{amount}}/мес",
    tipTitle: "Совет для разгона",
    tipBody: "Направляй минимум {{amount}} в месяц на следующий долг - эффект снежного кома.",
    viewHistory: "История",
    keepGoing: "Продолжить",
  },
  payment: {
    kicker: "ПЛАТЁЖ ЗАПИСАН",
    title: "Отлично",
    subtitle: "{{amount}} записано в счёт {{name}}.",
    balanceNow: "БАЛАНС СЕЙЧАС",
    keepGoing: "Продолжить",
  },
  countdown: {
    eyebrow: "ОБРАТНЫЙ ОТСЧЁТ ДО СВОБОДЫ ОТ ДОЛГОВ",
    debtFree: "🎉 Ты свободен от долгов! Все балансы на нуле.",
    notSolvableTitle: "При текущем темпе даты погашения нет",
    notSolvableBody:
      "Проценты за месяц растут быстрее платежей, поэтому балансы никогда не дойдут до нуля. Даже небольшой дополнительный платёж это меняет - открой «Построй свой Ковчег» выше и сравни стратегии погашения.",
    units: {
      year_one: "ГОД",
      year_few: "ГОДА",
      year_many: "ЛЕТ",
      year_other: "ГОДА",
      month_one: "МЕСЯЦ",
      month_few: "МЕСЯЦА",
      month_many: "МЕСЯЦЕВ",
      month_other: "МЕСЯЦА",
      day_one: "ДЕНЬ",
      day_few: "ДНЯ",
      day_many: "ДНЕЙ",
      day_other: "ДНЯ",
    },
    target: "Прогноз: без долгов в {{month}}",
    pace: {
      perMonth: "{{amount}}/мес",
      history_one: "При твоём темпе {{pace}} · по платежам за последний месяц",
      history_few: "При твоём темпе {{pace}} · по платежам за последние {{count}} месяца",
      history_many: "При твоём темпе {{pace}} · по платежам за последние {{count}} месяцев",
      history_other: "При твоём темпе {{pace}} · по платежам за последние {{count}} месяца",
      currentMonth: "При твоём темпе {{pace}} · по платежам этого месяца",
      minimums: "Исходя из минимальных платежей {{pace}} · записывай платежи, чтобы уточнить",
    },
    belowMinimums:
      "Твой недавний темп {{pace}} ниже суммы минимальных платежей - прогноз считает, что минимумы внесены.",
  },
  duePrompt: {
    eyebrow: "МИНИМУМ К ОПЛАТЕ СЕГОДНЯ",
    body: "Ты внёс минимальный платёж {{amount}} за этот месяц? (Срок - {{day}}-е число каждого месяца.)",
    hint: "Запись здесь обновит баланс долга и учтётся в Бюджете в разделе «Платежи по долгам».",
    confirm: "Да, я заплатил {{amount}}",
    notYet: "В этом месяце ещё нет",
    later: "Напомнить позже",
  },
  keepAlive: {
    eyebrow: "КОНТРОЛЬ АКТИВНОСТИ КАРТ",
    summary_one: "{{count}} карте скоро нужна небольшая покупка",
    summary_few: "{{count}} картам скоро нужна небольшая покупка",
    summary_many: "{{count}} картам скоро нужна небольшая покупка",
    summary_other: "{{count}} картам скоро нужна небольшая покупка",
    overdue: "{{name}} · срок прошёл ({{when}}) - воспользуйся скорее",
    useBy: "{{name}} · использовать до {{when}} · {{days}}",
    today: "сегодня",
    tomorrow: "завтра",
    inDays_one: "через {{count}} день",
    inDays_few: "через {{count}} дня",
    inDays_many: "через {{count}} дней",
    inDays_other: "через {{count}} дня",
    hint: "Банк может закрыть неиспользуемую карту",
    later: "Позже",
  },
  tipNudge: {
    eyebrow: "КОПИЛКА ДЛЯ ЧАЕВЫХ 💛",
    a11yCard: "Копилка для чаевых. {{title}}. {{body}}",
    a11yOpen: "Открыть копилку для чаевых",
    leaveTip: "Оставить чаевые ›",
    a11yDismiss: "Скрыть",
    notNow: "Не сейчас",
  },
};

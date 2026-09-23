/**
 * BudgetArk - Русские тексты: чистые помощники (notifications)
 * File: src/i18n/locales/ru/helpersNotifications.ts
 *
 * Russian counterpart of en/helpersNotifications.ts. Security rule 11: this
 * copy lands on the lock screen and must stay content-free - no amounts,
 * account or card names, balances, counts. Translate faithfully, add nothing.
 */

import type { LocalizedPlural } from "../types";
import type { helpersNotifications as en } from "../en/helpersNotifications";

export const helpersNotifications: LocalizedPlural<typeof en> = {
  tracking: {
    channel: {
      name: "Напоминания о расходах",
      description: "Мягкие напоминания продолжать записывать траты",
    },
    checkIn: {
      quick: {
        title: "Время быстрой сверки",
        body: "Есть минутка? Запиши последние траты, пока они свежи в памяти.",
      },
      onCourse: {
        title: "Держи Ковчег на курсе",
        body: "Запиши расходы за последние несколько дней.",
      },
      expense: {
        title: "Быстрая сверка расходов",
        body: "Есть что записать? Это займёт всего мгновение.",
      },
      tidyLedger: {
        title: "Аккуратный журнал - крепкий Ковчег",
        body: "Добавь недавние расходы, чтобы бюджет оставался честным.",
      },
      drift: {
        title: "Не дай тратам уплыть незамеченными",
        body: "Удели 30 секунд и запиши всё, что потратил.",
      },
    },
    monthStart: {
      newMonth: {
        title: "Начинается новый месяц",
        body: "Поставь цели бюджета на этот месяц и посмотри, как прошёл прошлый.",
      },
      chartCourse: {
        title: "Проложи курс на этот месяц",
        body: "Оглянись на траты прошлого месяца и поставь цели на месяц вперёд.",
      },
      freshStart: {
        title: "Новый месяц - новый старт",
        body: "Удели пару минут плану бюджета на этот месяц и итогам прошлого.",
      },
    },
  },
  keepAlive: {
    channel: {
      name: "Напоминания об активности карт",
      description:
        "Мягкие напоминания воспользоваться отслеживаемой кредитной картой, пока банк не закрыл её за неактивность",
    },
    messages: {
      activity: {
        title: "Одной карте не помешала бы активность",
        body: "Одной из твоих кредитных карт давно не пользовались. Небольшая покупка сохранит её активной.",
      },
      afloat: {
        title: "Держи кредитную линию на плаву",
        body: "Банк может закрыть неиспользуемую карту. Открой BudgetArk, чтобы узнать, какой нужна небольшая покупка.",
      },
      quickCheck: {
        title: "Быстрая проверка карты",
        body: "Одна из отслеживаемых карт приближается к сроку неактивности. Покупка размером с чашку кофе сбросит отсчёт.",
      },
    },
  },
};

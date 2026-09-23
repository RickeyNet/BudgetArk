/**
 * BudgetArk - Українські тексти: вкладка «Борги» (моменти)
 * File: src/i18n/locales/uk/debtsMoments.ts
 *
 * Ukrainian counterpart of en/debtsMoments.ts. Informal "ти" throughout;
 * see src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { LocalizedPlural } from "../types";
import type { debtsMoments as en } from "../en/debtsMoments";

export const debtsMoments: LocalizedPlural<typeof en> = {
  payoff: {
    kicker: {
      own: "Борг закрито",
      partner: "Борг партнера закрито",
      joint: "Спільний борг закрито",
    },
    title: "Ти виплатив {{name}}",
    subtitle: "Ще один баланс на {{zero}}. Спрямовуй вивільнені гроші на наступну ціль.",
    totalCleared: "УСЬОГО ЗАКРИТО",
    paymentFreed: "ВИВІЛЬНЕНО",
    perMonth: "{{amount}}/міс",
    tipTitle: "Порада для розгону",
    tipBody: "Спрямовуй щонайменше {{amount}} на місяць на наступний борг - ефект снігової кулі.",
    viewHistory: "Історія",
    keepGoing: "Продовжити",
  },
  payment: {
    kicker: "ПЛАТІЖ ЗАПИСАНО",
    title: "Чудово",
    subtitle: "{{amount}} записано в рахунок {{name}}.",
    balanceNow: "БАЛАНС ЗАРАЗ",
    keepGoing: "Продовжити",
  },
  countdown: {
    eyebrow: "ЗВОРОТНИЙ ВІДЛІК ДО СВОБОДИ ВІД БОРГІВ",
    debtFree: "🎉 Ти вільний від боргів! Усі баланси на нулі.",
    notSolvableTitle: "За поточного темпу дати погашення немає",
    notSolvableBody:
      "Відсотки за місяць зростають швидше за платежі, тому баланси ніколи не дійдуть до нуля. Навіть невеликий додатковий платіж це змінює - відкрий «Побудуй свій Ковчег» вище і порівняй стратегії погашення.",
    units: {
      year_one: "РІК",
      year_few: "РОКИ",
      year_many: "РОКІВ",
      year_other: "РОКУ",
      month_one: "МІСЯЦЬ",
      month_few: "МІСЯЦІ",
      month_many: "МІСЯЦІВ",
      month_other: "МІСЯЦЯ",
      day_one: "ДЕНЬ",
      day_few: "ДНІ",
      day_many: "ДНІВ",
      day_other: "ДНЯ",
    },
    target: "Прогноз: без боргів у {{month}}",
    pace: {
      perMonth: "{{amount}}/міс",
      history_one: "За твого темпу {{pace}} · за платежами останнього місяця",
      history_few: "За твого темпу {{pace}} · за платежами за останні {{count}} місяці",
      history_many: "За твого темпу {{pace}} · за платежами за останні {{count}} місяців",
      history_other: "За твого темпу {{pace}} · за платежами останніх {{count}} місяця",
      currentMonth: "За твого темпу {{pace}} · за платежами цього місяця",
      minimums: "Виходячи з мінімальних платежів {{pace}} · записуй платежі, щоб уточнити",
    },
    belowMinimums:
      "Твій недавній темп {{pace}} нижчий за суму мінімальних платежів - прогноз вважає, що мінімуми внесено.",
  },
  duePrompt: {
    eyebrow: "МІНІМУМ ДО СПЛАТИ СЬОГОДНІ",
    body: "Ти вніс мінімальний платіж {{amount}} за цей місяць? (Термін - {{day}}-е число кожного місяця.)",
    hint: "Запис тут оновить баланс боргу і врахується в Бюджеті в розділі «Платежі за боргами».",
    confirm: "Так, я сплатив {{amount}}",
    notYet: "Цього місяця ще ні",
    later: "Нагадати пізніше",
  },
  keepAlive: {
    eyebrow: "КОНТРОЛЬ АКТИВНОСТІ КАРТОК",
    summary_one: "{{count}} картці незабаром потрібна невелика покупка",
    summary_few: "{{count}} карткам незабаром потрібна невелика покупка",
    summary_many: "{{count}} карткам незабаром потрібна невелика покупка",
    summary_other: "{{count}} карткам незабаром потрібна невелика покупка",
    overdue: "{{name}} · термін минув ({{when}}) - скористайся якнайшвидше",
    useBy: "{{name}} · використати до {{when}} · {{days}}",
    today: "сьогодні",
    tomorrow: "завтра",
    inDays_one: "через {{count}} день",
    inDays_few: "через {{count}} дні",
    inDays_many: "через {{count}} днів",
    inDays_other: "через {{count}} дня",
    hint: "Банк може закрити картку, якою не користуються",
    later: "Пізніше",
  },
  tipNudge: {
    eyebrow: "СКАРБНИЧКА НА ЧАЙОВІ 💛",
    a11yCard: "Скарбничка на чайові. {{title}}. {{body}}",
    a11yOpen: "Відкрити скарбничку на чайові",
    leaveTip: "Залишити чайові ›",
    a11yDismiss: "Приховати",
    notNow: "Не зараз",
  },
};

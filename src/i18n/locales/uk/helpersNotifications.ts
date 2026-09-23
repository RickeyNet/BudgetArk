/**
 * BudgetArk - Українські тексти: чисті помічники (notifications)
 * File: src/i18n/locales/uk/helpersNotifications.ts
 *
 * Ukrainian counterpart of en/helpersNotifications.ts. Security rule 11:
 * this copy lands on the lock screen and must stay content-free - no
 * amounts, account or card names, balances, counts. Translate faithfully,
 * add nothing.
 */

import type { LocalizedPlural } from "../types";
import type { helpersNotifications as en } from "../en/helpersNotifications";

export const helpersNotifications: LocalizedPlural<typeof en> = {
  tracking: {
    channel: {
      name: "Нагадування про витрати",
      description: "М'які нагадування далі записувати витрати",
    },
    checkIn: {
      quick: {
        title: "Час швидкої звірки",
        body: "Є хвилинка? Запиши останні витрати, поки вони свіжі в пам'яті.",
      },
      onCourse: {
        title: "Тримай Ковчег на курсі",
        body: "Запиши витрати за останні кілька днів.",
      },
      expense: {
        title: "Швидка звірка витрат",
        body: "Є що записати? Це займе лише мить.",
      },
      tidyLedger: {
        title: "Охайний журнал - міцний Ковчег",
        body: "Додай нещодавні витрати, щоб бюджет лишався чесним.",
      },
      drift: {
        title: "Не дай витратам пропливти непоміченими",
        body: "Приділи 30 секунд і запиши все, що витратив.",
      },
    },
    monthStart: {
      newMonth: {
        title: "Починається новий місяць",
        body: "Постав цілі бюджету на цей місяць і поглянь, як минув попередній.",
      },
      chartCourse: {
        title: "Проклади курс на цей місяць",
        body: "Озирнись на витрати минулого місяця й постав цілі на місяць уперед.",
      },
      freshStart: {
        title: "Новий місяць - новий старт",
        body: "Приділи кілька хвилин плану бюджету на цей місяць і підсумкам минулого.",
      },
    },
  },
  keepAlive: {
    channel: {
      name: "Нагадування про активність карток",
      description:
        "М'які нагадування скористатися відстежуваною кредитною карткою, поки банк не закрив її за неактивність",
    },
    messages: {
      activity: {
        title: "Одній картці не завадила б активність",
        body: "Однією з твоїх кредитних карток давно не користувалися. Невелика покупка збереже її активною.",
      },
      afloat: {
        title: "Тримай кредитну лінію на плаву",
        body: "Банк може закрити невикористовувану картку. Відкрий BudgetArk, щоб дізнатися, якій потрібна невелика покупка.",
      },
      quickCheck: {
        title: "Швидка перевірка картки",
        body: "Одна з відстежуваних карток наближається до строку неактивності. Покупка завбільшки з чашку кави скине відлік.",
      },
    },
  },
};

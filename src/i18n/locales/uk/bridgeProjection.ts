/**
 * BudgetArk - Українські тексти: вкладка «Місток» (прогноз)
 * File: src/i18n/locales/uk/bridgeProjection.ts
 *
 * Ukrainian counterpart of en/bridgeProjection.ts. Informal "ти"
 * throughout; see src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { LocalizedPlural } from "../types";
import type { bridgeProjection as en } from "../en/bridgeProjection";

export const bridgeProjection: LocalizedPlural<typeof en> = {
  title: "Куди все йде",
  horizon: "{{amount}} до {{month}}",
  onTrack: "За планом",
  offTrack: "Не за планом",
  chart: {
    now: "Зараз",
  },
  pace: {
    noHistory:
      "Історії бюджету ще немає, тому лінія вважає, що з місяця в місяць нічого не додається - запиши кілька місяців, і вона вивчить твій темп.",
    tracked_one:
      "За твого темпу {{signedAmount}}/міс після витрат і мінімальних платежів (останній {{count}} врахований місяць), борги гасяться мінімальними платежами.",
    tracked_few:
      "За твого темпу {{signedAmount}}/міс після витрат і мінімальних платежів (останні {{count}} враховані місяці), борги гасяться мінімальними платежами.",
    tracked_many:
      "За твого темпу {{signedAmount}}/міс після витрат і мінімальних платежів (останні {{count}} врахованих місяців), борги гасяться мінімальними платежами.",
    tracked_other:
      "За твого темпу {{signedAmount}}/міс після витрат і мінімальних платежів (останні {{count}} врахованого місяця), борги гасяться мінімальними платежами.",
  },
  form: {
    targetLabel: "Цільові чисті активи",
    targetPlaceholder: "напр. 100000",
    byEndOf: "До кінця",
    save: "Зберегти ціль",
    pickerTitle: "Досягти до кінця",
  },
  errors: {
    missingAmount: "Введи цільову суму.",
    monthPassed: "Вибери місяць, який ще не минув.",
    notSaved: "Цю ціль не вдалося зберегти.",
    saveFailed: "Не вдалося зберегти ціль.",
    removeFailed: "Не вдалося видалити ціль.",
  },
  goal: {
    title: "Ціль: {{amount}} до {{month}}",
    projected: "Прогноз на той момент: {{amount}} ({{signedGap}})",
    early: "За цього темпу ти дійдеш приблизно до {{month}} - раніше строку.",
    onPace: "Точно за планом.",
    needsMonthly: "Потрібно близько {{amount}}/міс, щоб встигнути вчасно",
    arrivesAround: "; за сьогоднішнього темпу ціль буде приблизно до {{month}}.",
    neverReaches: "; за сьогоднішнього темпу ціль недосяжна.",
    set: "Задати ціль за чистими активами",
  },
  footer:
    "Суцільна лінія - історія за місяцями. Пунктир - прогноз. Це оцінки, а не обіцянки: ринки, підвищення і сюрпризи зсувають лінію.",
};

/**
 * BudgetArk - Русские тексты: вкладка «Мостик» (прогноз)
 * File: src/i18n/locales/ru/bridgeProjection.ts
 *
 * Russian counterpart of en/bridgeProjection.ts. Informal "ты" throughout;
 * see src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { LocalizedPlural } from "../types";
import type { bridgeProjection as en } from "../en/bridgeProjection";

export const bridgeProjection: LocalizedPlural<typeof en> = {
  title: "Куда всё идёт",
  horizon: "{{amount}} к {{month}}",
  onTrack: "По плану",
  offTrack: "Не по плану",
  chart: {
    now: "Сейчас",
  },
  pace: {
    noHistory:
      "Истории бюджета пока нет, поэтому линия считает, что из месяца в месяц ничего не добавляется - запиши несколько месяцев, и она выучит твой темп.",
    tracked_one:
      "При твоём темпе {{signedAmount}}/мес после расходов и минимальных платежей (последний {{count}} учтённый месяц), долги гасятся минимальными платежами.",
    tracked_few:
      "При твоём темпе {{signedAmount}}/мес после расходов и минимальных платежей (последние {{count}} учтённых месяца), долги гасятся минимальными платежами.",
    tracked_many:
      "При твоём темпе {{signedAmount}}/мес после расходов и минимальных платежей (последние {{count}} учтённых месяцев), долги гасятся минимальными платежами.",
    tracked_other:
      "При твоём темпе {{signedAmount}}/мес после расходов и минимальных платежей (последние {{count}} учтённых месяца), долги гасятся минимальными платежами.",
  },
  form: {
    targetLabel: "Целевые чистые активы",
    targetPlaceholder: "напр. 100000",
    byEndOf: "К концу",
    save: "Сохранить цель",
    pickerTitle: "Достичь к концу",
  },
  errors: {
    missingAmount: "Введи целевую сумму.",
    monthPassed: "Выбери месяц, который ещё не прошёл.",
    notSaved: "Эту цель не удалось сохранить.",
    saveFailed: "Не удалось сохранить цель.",
    removeFailed: "Не удалось удалить цель.",
  },
  goal: {
    title: "Цель: {{amount}} к {{month}}",
    projected: "Прогноз на тот момент: {{amount}} ({{signedGap}})",
    early: "При этом темпе ты дойдёшь примерно к {{month}} - раньше срока.",
    onPace: "Точно по плану.",
    needsMonthly: "Нужно около {{amount}}/мес, чтобы успеть в срок",
    arrivesAround: "; при сегодняшнем темпе цель будет примерно к {{month}}.",
    neverReaches: "; при сегодняшнем темпе цель недостижима.",
    set: "Задать цель по чистым активам",
  },
  footer:
    "Сплошная линия - история по месяцам. Пунктир - прогноз. Это оценки, а не обещания: рынки, прибавки и сюрпризы сдвигают линию.",
};

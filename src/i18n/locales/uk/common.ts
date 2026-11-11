/**
 * BudgetArk - Українські тексти: спільний словник
 * File: src/i18n/locales/uk/common.ts
 *
 * Ukrainian counterpart of en/common.ts. Tone: informal "ти" throughout the
 * Ukrainian locale; imperatives on buttons. See src/i18n/GLOSSARY.md.
 */

import type { LocalizedPlural } from "../types";
import type { common as en } from "../en/common";

export const common: LocalizedPlural<typeof en> = {
  done: "Готово",
  cancel: "Скасувати",
  save: "Зберегти",
  delete: "Видалити",
  ok: "ОК",
  close: "Закрити",
  on: "Увімк.",
  off: "Вимк.",
  yes: "Так",
  no: "Ні",
  back: "Назад",
  next: "Далі",
  skip: "Пропустити",
  edit: "Змінити",
  add: "Додати",
  remove: "Прибрати",
  continue: "Продовжити",
  confirm: "Підтвердити",
  learnMore: "Докладніше",
  gotIt: "Зрозуміло",
  opens: "Відкриває",
  unknown: "Невідомо",
  undo: "СКАСУВАТИ",
  undoLastAction: "Скасувати останню дію",
  /** components/LoadErrorBanner - a tab whose storage read failed. */
  loadError: {
    message:
      "Не вдалося прочитати дані з цього телефона. Нічого не видалено, але показане тут може бути неповним або застарілим.",
    retry: "Повторити",
  },
  weekdays: {
    sun: "Нд",
    mon: "Пн",
    tue: "Вт",
    wed: "Ср",
    thu: "Чт",
    fri: "Пт",
    sat: "Сб",
  },
};

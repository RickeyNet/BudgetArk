/**
 * BudgetArk - Українські тексти: вибір місяця й року
 * File: src/i18n/locales/uk/datePicker.ts
 *
 * Ukrainian counterpart of en/datePicker.ts (MonthYearPicker).
 */

import type { LocalizedPlural } from "../types";
import type { datePicker as en } from "../en/datePicker";

export const datePicker: LocalizedPlural<typeof en> = {
  closeA11y: "Закрити вибір місяця",
  yearCaption: "РІК",
  months: {
    jan: "Січ",
    feb: "Лют",
    mar: "Бер",
    apr: "Кві",
    may: "Тра",
    jun: "Чер",
    jul: "Лип",
    aug: "Сер",
    sep: "Вер",
    oct: "Жов",
    nov: "Лис",
    dec: "Гру",
  },
  selected: "Вибрано: {{month}} {{year}}",
  tapToSet: "Торкнись місяця, щоб задати ціль",
};

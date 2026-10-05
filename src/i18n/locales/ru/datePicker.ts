/**
 * BudgetArk - Русские тексты: выбор месяца и года
 * File: src/i18n/locales/ru/datePicker.ts
 *
 * Russian counterpart of en/datePicker.ts (MonthYearPicker).
 */

import type { LocalizedPlural } from "../types";
import type { datePicker as en } from "../en/datePicker";

export const datePicker: LocalizedPlural<typeof en> = {
  closeA11y: "Закрыть выбор месяца",
  yearCaption: "ГОД",
  months: {
    jan: "Янв",
    feb: "Фев",
    mar: "Мар",
    apr: "Апр",
    may: "Май",
    jun: "Июн",
    jul: "Июл",
    aug: "Авг",
    sep: "Сен",
    oct: "Окт",
    nov: "Ноя",
    dec: "Дек",
  },
  selected: "Выбрано: {{month}} {{year}}",
  tapToSet: "Нажми на месяц, чтобы задать цель",
};

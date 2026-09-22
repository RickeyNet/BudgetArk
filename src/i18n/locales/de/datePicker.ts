/**
 * BudgetArk - Deutsche Texte: gemeinsame Datumsauswahl
 * File: src/i18n/locales/de/datePicker.ts
 *
 * German counterpart of en/datePicker.ts.
 */

import type { Localized } from "../types";
import type { datePicker as en } from "../en/datePicker";

export const datePicker: Localized<typeof en> = {
  closeA11y: "Monatsauswahl schließen",
  yearCaption: "JAHR",
  months: {
    jan: "Jan",
    feb: "Feb",
    mar: "Mär",
    apr: "Apr",
    may: "Mai",
    jun: "Jun",
    jul: "Jul",
    aug: "Aug",
    sep: "Sep",
    oct: "Okt",
    nov: "Nov",
    dec: "Dez",
  },
  selected: "Ausgewählt: {{month}} {{year}}",
  tapToSet: "Tippe auf einen Monat, um dein Ziel zu setzen",
};

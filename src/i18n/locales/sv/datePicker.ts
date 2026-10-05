/**
 * BudgetArk - Svenska texter: gemensamma datumväljare
 * File: src/i18n/locales/sv/datePicker.ts
 *
 * Swedish counterpart of en/datePicker.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { datePicker as en } from "../en/datePicker";

export const datePicker: Localized<typeof en> = {
  closeA11y: "Stäng månadsväljaren",
  yearCaption: "ÅR",
  months: {
    jan: "Jan",
    feb: "Feb",
    mar: "Mar",
    apr: "Apr",
    may: "Maj",
    jun: "Jun",
    jul: "Jul",
    aug: "Aug",
    sep: "Sep",
    oct: "Okt",
    nov: "Nov",
    dec: "Dec",
  },
  selected: "Valt: {{month}} {{year}}",
  tapToSet: "Tryck på en månad för att sätta ditt mål",
};

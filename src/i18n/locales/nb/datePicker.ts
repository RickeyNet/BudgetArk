/**
 * BudgetArk - Norske tekster: felles datovelgere
 * File: src/i18n/locales/nb/datePicker.ts
 *
 * Norwegian (Bokmål) counterpart of en/datePicker.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { datePicker as en } from "../en/datePicker";

export const datePicker: Localized<typeof en> = {
  closeA11y: "Lukk månedsvelgeren",
  yearCaption: "ÅR",
  months: {
    jan: "Jan",
    feb: "Feb",
    mar: "Mar",
    apr: "Apr",
    may: "Mai",
    jun: "Jun",
    jul: "Jul",
    aug: "Aug",
    sep: "Sep",
    oct: "Okt",
    nov: "Nov",
    dec: "Des",
  },
  selected: "Valgt: {{month}} {{year}}",
  tapToSet: "Trykk på en måned for å sette målet ditt",
};

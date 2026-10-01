/**
 * BudgetArk - Svenska texter: gemensamt ordförråd
 * File: src/i18n/locales/sv/common.ts
 *
 * Swedish counterpart of en/common.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. "common" is for strings
 * whose translation must stay identical everywhere - keep them short.
 */

import type { Localized } from "../types";
import type { common as en } from "../en/common";

export const common: Localized<typeof en> = {
  done: "Klar",
  cancel: "Avbryt",
  save: "Spara",
  delete: "Ta bort",
  ok: "OK",
  close: "Stäng",
  on: "På",
  off: "Av",
  yes: "Ja",
  no: "Nej",
  back: "Tillbaka",
  next: "Nästa",
  skip: "Hoppa över",
  edit: "Redigera",
  add: "Lägg till",
  remove: "Ta bort",
  continue: "Fortsätt",
  confirm: "Bekräfta",
  learnMore: "Läs mer",
  gotIt: "Uppfattat",
  opens: "Öppnar",
  unknown: "Okänd",
  undo: "ÅNGRA",
  undoLastAction: "Ångra senaste åtgärden",
};

/**
 * BudgetArk - Norske tekster: felles ordforråd
 * File: src/i18n/locales/nb/common.ts
 *
 * Norwegian (Bokmål) counterpart of en/common.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. "common" is for strings
 * whose translation must stay identical everywhere - keep them short.
 */

import type { Localized } from "../types";
import type { common as en } from "../en/common";

export const common: Localized<typeof en> = {
  done: "Ferdig",
  cancel: "Avbryt",
  save: "Lagre",
  delete: "Slett",
  ok: "OK",
  close: "Lukk",
  on: "På",
  off: "Av",
  yes: "Ja",
  no: "Nei",
  back: "Tilbake",
  next: "Neste",
  skip: "Hopp over",
  edit: "Rediger",
  add: "Legg til",
  remove: "Fjern",
  continue: "Fortsett",
  confirm: "Bekreft",
  learnMore: "Les mer",
  gotIt: "Skjønner",
  opens: "Åpner",
  unknown: "Ukjent",
  undo: "ANGRE",
  undoLastAction: "Angre siste handling",
};

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
  /** Undo toast's ✕ (UndoProvider), read out by screen readers. */
  dismiss: "Lukk",
  /** App.tsx - the saved user record couldn't be read at launch. */
  startupError: {
    title: "Kunne ikke laste inn dataene dine",
    body:
      "BudgetArk kunne ikke lese de lagrede dataene sine på denne enheten. Dette kan skje når telefonen har veldig lite ledig lagringsplass. Dataene dine er ikke endret - å frigjøre plass løser det som regel.",
    retry: "Prøv igjen",
  },
  /** components/LoadErrorBanner - a tab whose storage read failed. */
  loadError: {
    message:
      "Kunne ikke lese dataene dine fra denne telefonen. Ingenting er slettet, men det som vises her kan være ufullstendig eller utdatert.",
    retry: "Prøv igjen",
  },
  weekdays: {
    sun: "Søn",
    mon: "Man",
    tue: "Tir",
    wed: "Ons",
    thu: "Tor",
    fri: "Fre",
    sat: "Lør",
  },
};

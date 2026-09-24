/**
 * BudgetArk - Deutsche Texte: gemeinsames Vokabular
 * File: src/i18n/locales/de/common.ts
 *
 * German counterpart of en/common.ts. Tone: informal "du" throughout the
 * German locale (the norm for consumer finance apps in DACH); keep that
 * consistent - never mix in "Sie".
 */

import type { Localized } from "../types";
import type { common as en } from "../en/common";

export const common: Localized<typeof en> = {
  done: "Fertig",
  cancel: "Abbrechen",
  save: "Speichern",
  delete: "Löschen",
  ok: "OK",
  close: "Schließen",
  on: "Ein",
  off: "Aus",
  yes: "Ja",
  no: "Nein",
  back: "Zurück",
  next: "Weiter",
  skip: "Überspringen",
  edit: "Bearbeiten",
  add: "Hinzufügen",
  remove: "Entfernen",
  continue: "Fortfahren",
  confirm: "Bestätigen",
  learnMore: "Mehr erfahren",
  gotIt: "Verstanden",
  opens: "Öffnet",
  unknown: "Unbekannt",
  undo: "RÜCKGÄNGIG",
  undoLastAction: "Letzte Aktion rückgängig machen",
};

/**
 * BudgetArk - Norske tekster: Budsjett-fanen (screen)
 * File: src/i18n/locales/nb/budgetScreen.ts
 *
 * Norwegian (Bokmål) counterpart of en/budgetScreen.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { budgetScreen as en } from "../en/budgetScreen";

export const budgetScreen: Localized<typeof en> = {
  header: {
    title: "Budsjett",
    subtitle: "Følg inntekter, utgifter og kategorigrenser.",
    billCalendarA11y: "Regningskalender",
    searchA11y: "Søk i gjeld, betalinger og budsjettposter",
    inboxA11y: "Gjennomgangsinnboks, {{count}} venter",
  },
  monthNav: {
    previousA11y: "Forrige måned",
    nextA11y: "Neste måned",
  },
  insights: {
    title: "Innsikt",
    hint: "Trender, endringer, rekker, sammenligninger",
  },
  summary: {
    income: "Inntekt",
    spent: "Brukt",
    net: "Netto",
    plannedMinimums: "Inkluderer {{amount}} planlagte minstebetalinger fra Gjeld-fanen",
    retirement: "Pluss {{amount}} til 401(k) denne måneden (telles ikke som inntekt)",
    taxSetAside: "Sett av {{amount}} av månedens 1099-inntekt til skatt",
  },
  selection: {
    cancelA11y: "Avbryt markering",
    selected_one: "{{count}} valgt",
    selected_other: "{{count}} valgt",
    recategorize: "Bytt kategori",
    recategorizeA11y: "Bytt kategori på valgte poster",
    deleteA11y: "Slett valgte poster",
    moveTitle_one: "Flytt {{count}} post til…",
    moveTitle_other: "Flytt {{count}} poster til…",
  },
  bucket: {
    title: "Bytt bøtte",
    currently: " - nå {{bucket}}",
    useDefault: "Bruk standard ({{bucket}})",
  },
  limit: {
    title: "Sett månedsgrense",
    placeholder: "0,00",
    hint: "La stå tomt for å fjerne grensen.",
  },
  emergencyFund: {
    title: "Buffer",
    currentBalance: "Nåværende saldo: {{amount}}",
    target: " / {{amount}}",
    tracked_one: " • hentes fra {{count}} utpekt sparekonto",
    tracked_other: " • hentes fra {{count}} utpekte sparekontoer",
    placeholder: "Beløp å legge til (eller negativt for uttak)",
    hint: "Angi et positivt tall for å sette inn, eller negativt for å ta ut.",
  },
  undo: {
    edited: "Redigerte «{{label}}»",
    deleted: "Slettet «{{label}}»",
    deletedEntry: "Slettet post",
    deletedCount_one: "Slettet {{count}} post",
    deletedCount_other: "Slettet {{count}} poster",
    moved_one: "Flyttet {{count}} post til {{category}}",
    moved_other: "Flyttet {{count}} poster til {{category}}",
  },
};

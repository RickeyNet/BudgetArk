/**
 * BudgetArk - Svenska texter: Budget-fliken (screen)
 * File: src/i18n/locales/sv/budgetScreen.ts
 *
 * Swedish counterpart of en/budgetScreen.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { budgetScreen as en } from "../en/budgetScreen";

export const budgetScreen: Localized<typeof en> = {
  header: {
    title: "Budget",
    subtitle: "Följ inkomster, utgifter och kategorigränser.",
    billCalendarA11y: "Räkningskalender",
    searchA11y: "Sök skulder, betalningar och budgetposter",
    inboxA11y: "Granskningsinkorg, {{count}} väntar",
  },
  monthNav: {
    previousA11y: "Föregående månad",
    nextA11y: "Nästa månad",
  },
  insights: {
    title: "Insikter",
    hint: "Trender, förändringar, sviter, jämförelser",
  },
  summary: {
    income: "Inkomst",
    spent: "Spenderat",
    net: "Netto",
    plannedMinimums: "Inkluderar {{amount}} planerade minimibetalningar från fliken Skulder",
    retirement: "Plus {{amount}} till din 401(k) den här månaden (räknas inte som inkomst)",
    taxSetAside: "Sätt undan {{amount}} av månadens 1099-inkomst till skatt",
  },
  selection: {
    cancelA11y: "Avbryt markering",
    selected_one: "{{count}} markerad",
    selected_other: "{{count}} markerade",
    recategorize: "Byt kategori",
    recategorizeA11y: "Byt kategori på markerade poster",
    deleteA11y: "Ta bort markerade poster",
    moveTitle_one: "Flytta {{count}} post till…",
    moveTitle_other: "Flytta {{count}} poster till…",
  },
  bucket: {
    title: "Byt hink",
    currently: " - just nu {{bucket}}",
    useDefault: "Använd standard ({{bucket}})",
  },
  limit: {
    title: "Sätt månadsgräns",
    placeholder: "0,00",
    hint: "Lämna tomt för att ta bort gränsen.",
  },
  emergencyFund: {
    title: "Buffert",
    currentBalance: "Nuvarande saldo: {{amount}}",
    target: " / {{amount}}",
    tracked_one: " • hämtas från {{count}} utsett sparkonto",
    tracked_other: " • hämtas från {{count}} utsedda sparkonton",
    placeholder: "Belopp att lägga till (eller negativt för uttag)",
    hint: "Ange ett positivt tal för att sätta in, eller negativt för att ta ut.",
  },
  undo: {
    edited: "Redigerade ”{{label}}”",
    deleted: "Tog bort ”{{label}}”",
    deletedEntry: "Tog bort post",
    deletedCount_one: "Tog bort {{count}} post",
    deletedCount_other: "Tog bort {{count}} poster",
    moved_one: "Flyttade {{count}} post till {{category}}",
    moved_other: "Flyttade {{count}} poster till {{category}}",
  },
};

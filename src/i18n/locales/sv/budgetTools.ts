/**
 * BudgetArk - Svenska texter: Budget-fliken (tools)
 * File: src/i18n/locales/sv/budgetTools.ts
 *
 * Swedish counterpart of en/budgetTools.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { budgetTools as en } from "../en/budgetTools";

export const budgetTools: Localized<typeof en> = {
  search: {
    title: "Sök",
    subtitle: "Hitta allt du har registrerat - skulder, betalningar och budgetposter.",
    closeA11y: "Stäng sökningen",
    placeholder: "Prova ”Swedbank”, ”matvaror” eller ett belopp",
    inputA11y: "Sök i allt",
    clearA11y: "Rensa sökningen",
    filtersToggle: "Filter",
    filtersToggleCount: "Filter ({{count}})",
    filtersA11y: "Filter, {{count}} aktiva",
    reset: "Återställ",
    resetA11y: "Återställ filter",
    scopeLabel: "Sök i",
    scope: {
      all: "Allt",
      debts: "Skulder",
      payments: "Betalningar",
      entries: "Budget",
    },
    dateLabel: "Datum",
    datePreset: {
      any: "När som helst",
      "30d": "Senaste 30 dagarna",
      "90d": "Senaste 90 dagarna",
      year: "I år",
    },
    entryTypeLabel: "Typ av budgetpost",
    entryType: {
      all: "Inkomster + utgifter",
      income: "Inkomster",
      expense: "Utgifter",
    },
    categoriesLabel: "Kategorier",
    amountLabel: "Belopp",
    minPlaceholder: "Min",
    minA11y: "Minsta belopp",
    maxPlaceholder: "Max",
    maxA11y: "Största belopp",
    promptTitle: "Sök i dina uppgifter",
    promptBody:
      "Skriv ett skuldnamn, en anteckning, en handlare, en kategori eller ett belopp - eller öppna Filter för att bläddra efter datum, typ eller kategori.",
    noMatchesTitle: "Inga träffar",
    noMatchesBody: "Prova färre ord eller lösare filter.",
    debtsHidden: "Skulder visas inte medan ett datum-, posttyps- eller kategorifilter är på.",
    sectionDebts: "SKULDER · {{count}}",
    sectionPayments: "SKULDBETALNINGAR · {{count}}",
    sectionEntries: "BUDGETPOSTER · {{count}}",
    debtA11y: "Skuld {{name}}",
    paymentA11y: "Betalning till {{name}}",
    entryA11y: "Budgetpost {{name}}",
    apr: "{{rate}} % ränta",
    paidOff: "Avbetald 🎉",
    truncation: "Visar de första {{shown}} av {{total}} - avgränsa sökningen för att se resten.",
  },
  billCalendar: {
    title: "Räkningskalender",
    stats: {
      bills: "Räkningar",
      paid: "Betalda",
      remaining: "Kvar",
    },
    nextLabel: "NÄSTA",
    nextRow: "{{name}} · {{amount}} · {{when}}",
    when: {
      today: "idag",
      tomorrow: "imorgon",
      daysAgo: "{{count}} d sedan",
      inDays: "om {{count}} d",
    },
    showOneOff: "Visa även engångsutgifter",
    emptyHint:
      "Inga återkommande räkningar landar den här månaden. Lägg till en återkommande utgift från formuläret Lägg till post och ange dess dag i månaden för att se den här.",
    paidActual: "✓ Betald (faktisk)",
    payButton: "Betala ↗",
    payA11y: "Öppna betalsidan för {{name}}",
    linkError: {
      title: "Kan inte öppna länken",
      invalid: "Den sparade URL:en är inte en giltig http(s)-adress. Redigera räkningen för att rätta den.",
      noBrowser: "Ingen webbläsare finns för att öppna URL:en.",
      failed: "Något gick fel när URL:en skulle öppnas.",
    },
  },
  monthlyReview: {
    title: "Månadsöversikt",
    emptyTitle: "Inte tillräckligt med data än",
    emptyBody: "Lägg till budgetposter för minst 2 månader för att se trender, kategoriförändringar och sviter.",
    vsAverage: {
      title: "Den här månaden vs snitt",
      thisMonth: "Den här månaden",
      avgPerMonth: "Snitt / månad",
      change: "Förändring",
    },
    byPerson: {
      title: "Utgifter per person",
      hint: "Tilldelade utgifter den här månaden",
    },
    comparison: {
      title: "Jämförelse av kategoriutgifter",
      hint: "vs snittet för de senaste 3 månaderna",
      row: "{{current}} den här månaden · snitt {{average}}",
      new: "Ny",
      stopped: "Upphört",
      flat: "Oförändrat",
    },
    spendingTrend: "Utgiftstrend",
    netIncomeTrend: "Nettoinkomsttrend",
    streaks: {
      title: "Sviter",
      months: "{{count}} mån",
    },
    changes: {
      title: "Kategoriförändringar",
      hint: "vs föregående månad",
    },
  },
};

/**
 * BudgetArk - Norske tekster: Budsjett-fanen (tools)
 * File: src/i18n/locales/nb/budgetTools.ts
 *
 * Norwegian (Bokmål) counterpart of en/budgetTools.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { budgetTools as en } from "../en/budgetTools";

export const budgetTools: Localized<typeof en> = {
  search: {
    title: "Søk",
    subtitle: "Finn alt du har registrert - gjeld, betalinger og budsjettposter.",
    closeA11y: "Lukk søket",
    placeholder: "Prøv «DNB», «dagligvarer» eller et beløp",
    inputA11y: "Søk i alt",
    clearA11y: "Tøm søket",
    filtersToggle: "Filtre",
    filtersToggleCount: "Filtre ({{count}})",
    filtersA11y: "Filtre, {{count}} aktive",
    reset: "Nullstill",
    resetA11y: "Nullstill filtre",
    scopeLabel: "Søk i",
    scope: {
      all: "Alt",
      debts: "Gjeld",
      payments: "Betalinger",
      entries: "Budsjett",
    },
    dateLabel: "Dato",
    datePreset: {
      any: "Når som helst",
      "30d": "Siste 30 dager",
      "90d": "Siste 90 dager",
      year: "I år",
    },
    entryTypeLabel: "Budsjettposttype",
    entryType: {
      all: "Inntekter + utgifter",
      income: "Inntekter",
      expense: "Utgifter",
    },
    categoriesLabel: "Kategorier",
    amountLabel: "Beløp",
    minPlaceholder: "Min",
    minA11y: "Minste beløp",
    maxPlaceholder: "Maks",
    maxA11y: "Største beløp",
    promptTitle: "Søk i oppføringene dine",
    promptBody:
      "Skriv et gjeldsnavn, et notat, en forhandler, en kategori eller et beløp - eller åpne Filtre for å bla etter dato, type eller kategori.",
    noMatchesTitle: "Ingen treff",
    noMatchesBody: "Prøv færre ord eller løsere filtre.",
    debtsHidden: "Gjeld vises ikke mens et dato-, posttype- eller kategorifilter er på.",
    sectionDebts: "GJELD · {{count}}",
    sectionPayments: "GJELDSBETALINGER · {{count}}",
    sectionEntries: "BUDSJETTPOSTER · {{count}}",
    debtA11y: "Gjeldspost {{name}}",
    paymentA11y: "Betaling til {{name}}",
    entryA11y: "Budsjettpost {{name}}",
    apr: "{{rate}} % rente",
    paidOff: "Nedbetalt 🎉",
    truncation: "Viser de første {{shown}} av {{total}} - snevre inn søket for å se resten.",
  },
  billCalendar: {
    title: "Regningskalender",
    stats: {
      bills: "Regninger",
      paid: "Betalt",
      remaining: "Gjenstår",
    },
    nextLabel: "NESTE",
    nextRow: "{{name}} · {{amount}} · {{when}}",
    when: {
      today: "i dag",
      tomorrow: "i morgen",
      daysAgo: "{{count}} d siden",
      inDays: "om {{count}} d",
    },
    weekdays: {
      sun: "S",
      mon: "M",
      tue: "T",
      wed: "O",
      thu: "T",
      fri: "F",
      sat: "L",
    },
    showOneOff: "Vis engangsutgifter også",
    emptyHint:
      "Ingen gjentakende regninger lander denne måneden. Legg til en gjentakende utgift fra skjemaet Legg til post og angi dag i måneden for å se den her.",
    paidActual: "✓ Betalt (faktisk)",
    payButton: "Betal ↗",
    payA11y: "Åpne betalingssiden for {{name}}",
    linkError: {
      title: "Kan ikke åpne lenken",
      invalid: "Den lagrede URL-en er ikke en gyldig http(s)-adresse. Rediger regningen for å rette den.",
      noBrowser: "Ingen nettleser er tilgjengelig for å åpne URL-en.",
      failed: "Noe gikk galt da URL-en skulle åpnes.",
    },
  },
  monthlyReview: {
    title: "Månedsoversikt",
    emptyTitle: "Ikke nok data enda",
    emptyBody: "Legg til budsjettposter for minst 2 måneder for å se trender, kategoriendringer og rekker.",
    vsAverage: {
      title: "Denne måneden vs snitt",
      thisMonth: "Denne måneden",
      avgPerMonth: "Snitt / måned",
      change: "Endring",
    },
    byPerson: {
      title: "Forbruk per person",
      hint: "Tilordnede utgifter denne måneden",
    },
    comparison: {
      title: "Sammenligning av kategoriforbruk",
      hint: "vs snittet for de siste 3 månedene",
      row: "{{current}} denne måneden · snitt {{average}}",
      new: "Ny",
      stopped: "Opphørt",
      flat: "Uendret",
    },
    spendingTrend: "Forbrukstrend",
    netIncomeTrend: "Nettoinntektstrend",
    streaks: {
      title: "Rekker",
      months: "{{count}} mnd",
    },
    changes: {
      title: "Kategoriendringer",
      hint: "vs forrige måned",
    },
  },
};

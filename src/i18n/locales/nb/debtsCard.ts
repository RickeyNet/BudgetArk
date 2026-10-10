/**
 * BudgetArk - Norske tekster: Gjeld-fanen (card)
 * File: src/i18n/locales/nb/debtsCard.ts
 *
 * Norwegian (Bokmål) counterpart of en/debtsCard.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. Owner / debt-class labels
 * are keyed by the DebtOwner / DebtClass ids from src/types.
 */

import type { Localized } from "../types";
import type { debtsCard as en } from "../en/debtsCard";

export const debtsCard: Localized<typeof en> = {
  card: {
    status: {
      almost: "Nesten der!",
      progress: "Gjør fremskritt",
      keepGoing: "Fortsett",
    },
    collapsedDetail: "{{balance}} · {{rate}} % rente",
    rateLine: "{{rate}} % rente · {{minimum}}/mnd minimum",
    meta: "Eier: {{owner}} · Type: {{type}}",
    reviewType: "Sjekk type",
    remaining: "IGJEN",
    paidOff: "NEDBETALT",
    bankSync: "Saldo fra {{account}}",
    bankSyncAsOf: "Saldo fra {{account}} · per {{date}}",
    bankLinkedNoMirror: "Koblet til {{account}} · saldoen speiles ikke",
    goal: {
      passed: "Måldatoen har passert",
      line: "Mål: {{date}} ({{monthsLeft}})",
      monthsLeft_one: "{{count}} mnd igjen",
      monthsLeft_other: "{{count}} mnd igjen",
      onTrack: "I rute",
      need: "Trenger {{amount}}/mnd",
    },
    keepAlive: {
      active: "Kortet er aktivt · bruk igjen senest {{date}}",
      overdue: "Inaktivitetsfristen er passert ({{date}}) · bruk det snart",
      useBy: "Bruk senest {{date}} ({{when}})",
      today: "i dag",
      tomorrow: "i morgen",
      days_one: "{{count}} dag",
      days_other: "{{count}} dager",
      usedIt: "Jeg brukte det",
      lastUsed: "Sist brukt {{date}}",
      trackedByBank: "Stemples automatisk fra {{account}}",
      trackedManually: "Trykk på «Jeg brukte det» etter et kjøp",
      a11y: {
        ok: "Aktivitetsovervåking på · neste bruk innen {{date}}",
        upcoming: "Aktivitetsovervåking · bruk innen {{date}}",
        urgent: "Aktivitetsovervåking · bruk snart, innen {{date}}",
        overdue: "Aktivitetsovervåking · inaktivitetsfristen har passert ({{date}})",
      },
    },
    timeline: {
      adjust: "Juster betalingsplanen",
      months_one: "{{count}} måned til nedbetalt",
      months_other: "{{count}} måneder til nedbetalt",
    },
    pay: "Betal",
    deleteA11y: "Slett {{name}}",
    confirmPaymentA11y: "Bekreft betaling",
    paymentPlaceholder: "Betalingsbeløp",
  },
  history: {
    title: "Betalingshistorikk",
    totalPaid: "Totalt betalt: {{amount}}",
    deletedDebt: "Slettet gjeldspost",
    empty: {
      title: "Ingen betalinger enda",
      subtitle: "Betalinger du gjør vises her.",
    },
    selected_one: "{{count}} valgt",
    selected_other: "{{count}} valgt",
    deleteSelectedA11y: "Slett valgte betalinger",
    deleted_one: "Slettet {{count}} betaling",
    deleted_other: "Slettet {{count}} betalinger",
    undoA11y: "Angre sletting av betalinger",
    undo: "ANGRE",
  },
};

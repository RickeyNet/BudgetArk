/**
 * BudgetArk - Svenska texter: Skulder-fliken (card)
 * File: src/i18n/locales/sv/debtsCard.ts
 *
 * Swedish counterpart of en/debtsCard.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. Owner / debt-class labels
 * are keyed by the DebtOwner / DebtClass ids from src/types.
 */

import type { Localized } from "../types";
import type { debtsCard as en } from "../en/debtsCard";

export const debtsCard: Localized<typeof en> = {
  card: {
    status: {
      almost: "Nästan där!",
      progress: "På god väg",
      keepGoing: "Fortsätt",
    },
    collapsedDetail: "{{balance}} · {{rate}} % ränta",
    rateLine: "{{rate}} % ränta · {{minimum}}/mån minimum",
    meta: "Ägare: {{owner}} · Typ: {{type}}",
    reviewType: "Granska typ",
    remaining: "KVAR",
    paidOff: "AVBETALAT",
    bankSync: "Saldo från {{account}}",
    bankSyncAsOf: "Saldo från {{account}} · per {{date}}",
    bankLinkedNoMirror: "Kopplat till {{account}} · saldot speglas inte",
    goal: {
      passed: "Måldatumet har passerat",
      line: "Mål: {{date}} ({{monthsLeft}})",
      monthsLeft_one: "{{count}} mån kvar",
      monthsLeft_other: "{{count}} mån kvar",
      onTrack: "I fas",
      need: "Kräver {{amount}}/mån",
    },
    keepAlive: {
      active: "Kortet aktivt · använd igen senast {{date}}",
      overdue: "Inaktivitetsfristen passerad ({{date}}) · använd det snart",
      useBy: "Använd senast {{date}} ({{when}})",
      today: "idag",
      tomorrow: "imorgon",
      days_one: "{{count}} dag",
      days_other: "{{count}} dagar",
      usedIt: "Jag använde det",
      lastUsed: "Senast använt {{date}}",
      trackedByBank: "Stämplas automatiskt från {{account}}",
      trackedManually: "Tryck på ”Jag använde det” efter ett köp",
      a11y: {
        ok: "Aktivitetsbevakning på · nästa användning senast {{date}}",
        upcoming: "Aktivitetsbevakning · använd senast {{date}}",
        urgent: "Aktivitetsbevakning · använd snart, senast {{date}}",
        overdue: "Aktivitetsbevakning · inaktivitetsfristen har passerat ({{date}})",
      },
    },
    timeline: {
      adjust: "Justera betalningsplanen",
      months_one: "{{count}} månad till avbetalat",
      months_other: "{{count}} månader till avbetalat",
    },
    pay: "Betala",
    deleteA11y: "Ta bort {{name}}",
    confirmPaymentA11y: "Bekräfta betalning",
    paymentPlaceholder: "Betalningsbelopp",
  },
  history: {
    title: "Betalningshistorik",
    totalPaid: "Totalt betalat: {{amount}}",
    deletedDebt: "Borttagen skuld",
    empty: {
      title: "Inga betalningar än",
      subtitle: "Betalningar du gör visas här.",
    },
    selected_one: "{{count}} vald",
    selected_other: "{{count}} valda",
    deleteSelectedA11y: "Ta bort valda betalningar",
    deleted_one: "Tog bort {{count}} betalning",
    deleted_other: "Tog bort {{count}} betalningar",
    undoA11y: "Ångra borttagning av betalningar",
    undo: "ÅNGRA",
  },
};

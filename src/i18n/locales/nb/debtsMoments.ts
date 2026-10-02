/**
 * BudgetArk - Norske tekster: Gjeld-fanen (moments)
 * File: src/i18n/locales/nb/debtsMoments.ts
 *
 * Norwegian (Bokmål) counterpart of en/debtsMoments.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { debtsMoments as en } from "../en/debtsMoments";

export const debtsMoments: Localized<typeof en> = {
  payoff: {
    kicker: {
      own: "Gjeld nedbetalt",
      partner: "Partnerens gjeld nedbetalt",
      joint: "Felles gjeld nedbetalt",
    },
    title: "Du har betalt ned {{name}}",
    subtitle: "Enda en saldo på {{zero}}. Rull de frigjorte pengene videre til neste mål.",
    totalCleared: "TOTALT NEDBETALT",
    paymentFreed: "FRIGJORT BETALING",
    perMonth: "{{amount}}/mnd",
    tipTitle: "Fremdriftstips",
    tipBody: "Styr minst {{amount}} hver måned over til neste gjeldspost for snøballeffekten.",
    viewHistory: "Vis historikk",
    keepGoing: "Fortsett",
  },
  payment: {
    kicker: "BETALING LOGGET",
    title: "Bra jobbet",
    subtitle: "{{amount}} logget på {{name}}.",
    balanceNow: "SALDO NÅ",
    keepGoing: "Fortsett",
  },
  countdown: {
    eyebrow: "NEDTELLING TIL GJELDFRI",
    debtFree: "🎉 Du er gjeldfri! Alle saldoer er på null.",
    notSolvableTitle: "Ingen nedbetalingsdato i dagens tempo",
    notSolvableBody:
      "Månedsrenten vokser raskere enn betalingene, så saldoene når aldri null. Selv en liten ekstra betaling endrer det - åpne Bygg arken din ovenfor for å sammenligne nedbetalingsstrategier.",
    units: {
      year_one: "ÅR",
      year_other: "ÅR",
      month_one: "MÅNED",
      month_other: "MÅNEDER",
      day_one: "DAG",
      day_other: "DAGER",
    },
    target: "Forventet gjeldfri i {{month}}",
    pace: {
      perMonth: "{{amount}}/mnd",
      history_one: "I ditt tempo på {{pace}} · fra betalingene dine siste måned",
      history_other: "I ditt tempo på {{pace}} · fra betalingene dine de siste {{count}} månedene",
      currentMonth: "I ditt tempo på {{pace}} · fra denne månedens betalinger",
      minimums: "Forutsetter minstebetalinger på {{pace}} · logg betalinger for å finjustere",
    },
    belowMinimums:
      "Tempoet ditt i det siste på {{pace}} ligger under de samlede minstebetalingene dine - prognosen forutsetter at minimum betales.",
  },
  duePrompt: {
    eyebrow: "MINSTEBETALING FORFALLER I DAG",
    body: "Gjorde du denne månedens minstebetaling på {{amount}}? (Forfaller dag {{day}} hver måned.)",
    hint: "Logger du her, oppdateres saldoen på gjelden, og det telles i Budsjett under Gjeldsbetalinger.",
    confirm: "Ja, jeg betalte {{amount}}",
    notYet: "Ikke enda denne måneden",
    later: "Minn meg på det senere",
  },
  keepAlive: {
    eyebrow: "HOLD KORTET AKTIVT",
    summary_one: "{{count}} kort trenger et lite kjøp snart",
    summary_other: "{{count}} kort trenger et lite kjøp snart",
    overdue: "{{name}} · fristen er passert ({{when}}) - bruk det snart",
    useBy: "{{name}} · bruk senest {{when}} · {{days}}",
    today: "i dag",
    tomorrow: "i morgen",
    inDays_one: "om {{count}} dag",
    inDays_other: "om {{count}} dager",
    hint: "Ubrukte kort kan avsluttes av utstederen",
    later: "Senere",
  },
  tipNudge: {
    eyebrow: "TIPSBOKS 💛",
    a11yCard: "Tipsboks. {{title}}. {{body}}",
    a11yOpen: "Åpne tipsboksen",
    leaveTip: "Gi et tips ›",
    a11yDismiss: "Avvis",
    notNow: "Ikke nå",
  },
};

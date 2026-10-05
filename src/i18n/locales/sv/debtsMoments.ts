/**
 * BudgetArk - Svenska texter: Skulder-fliken (moments)
 * File: src/i18n/locales/sv/debtsMoments.ts
 *
 * Swedish counterpart of en/debtsMoments.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { debtsMoments as en } from "../en/debtsMoments";

export const debtsMoments: Localized<typeof en> = {
  payoff: {
    kicker: {
      own: "Skuld avbetalad",
      partner: "Partnerns skuld avbetalad",
      joint: "Gemensam skuld avbetalad",
    },
    title: "Du har betalat av {{name}}",
    subtitle: "Ett saldo till på {{zero}}. Rulla de frigjorda pengarna vidare till nästa mål.",
    totalCleared: "TOTALT AVBETALAT",
    paymentFreed: "FRIGJORD BETALNING",
    perMonth: "{{amount}}/mån",
    tipTitle: "Farttips",
    tipBody: "Styr om minst {{amount}} varje månad till nästa skuld för snöbollseffekten.",
    viewHistory: "Visa historik",
    keepGoing: "Fortsätt",
  },
  payment: {
    kicker: "BETALNING LOGGAD",
    title: "Snyggt jobbat",
    subtitle: "{{amount}} loggat på {{name}}.",
    balanceNow: "SALDO NU",
    keepGoing: "Fortsätt",
  },
  countdown: {
    eyebrow: "NEDRÄKNING TILL SKULDFRI",
    debtFree: "🎉 Du är skuldfri! Alla saldon är på noll.",
    notSolvableTitle: "Inget avbetalningsdatum i nuvarande takt",
    notSolvableBody:
      "Månadsräntan växer snabbare än betalningarna, så saldona når aldrig noll. Även en liten extra betalning ändrar det - öppna Bygg din ark ovan för att jämföra återbetalningsstrategier.",
    units: {
      year_one: "ÅR",
      year_other: "ÅR",
      month_one: "MÅNAD",
      month_other: "MÅNADER",
      day_one: "DAG",
      day_other: "DAGAR",
    },
    target: "Beräknat skuldfri i {{month}}",
    pace: {
      perMonth: "{{amount}}/mån",
      history_one: "I din takt på {{pace}} · från din senaste månads betalningar",
      history_other: "I din takt på {{pace}} · från dina senaste {{count}} månaders betalningar",
      currentMonth: "I din takt på {{pace}} · från den här månadens betalningar",
      minimums: "Antar minimibetalningar på {{pace}} · logga betalningar för att finjustera",
    },
    belowMinimums:
      "Din senaste takt på {{pace}} ligger under dina sammanlagda minimibetalningar - prognosen antar att minimum betalas.",
  },
  duePrompt: {
    eyebrow: "MINIMIBETALNING FÖRFALLER IDAG",
    body: "Gjorde du månadens minimibetalning på {{amount}}? (Förfaller dag {{day}} varje månad.)",
    hint: "Loggar du här uppdateras skuldens saldo och det räknas i Budget under Skuldbetalningar.",
    confirm: "Ja, jag betalade {{amount}}",
    notYet: "Inte än den här månaden",
    later: "Påminn mig senare",
  },
  keepAlive: {
    eyebrow: "HÅLL KORTET AKTIVT",
    summary_one: "{{count}} kort behöver ett litet köp snart",
    summary_other: "{{count}} kort behöver ett litet köp snart",
    overdue: "{{name}} · fristen passerad ({{when}}) - använd det snart",
    useBy: "{{name}} · använd senast {{when}} · {{days}}",
    today: "idag",
    tomorrow: "imorgon",
    inDays_one: "om {{count}} dag",
    inDays_other: "om {{count}} dagar",
    hint: "Oanvända kort kan stängas av utgivaren",
    later: "Senare",
  },
  tipNudge: {
    eyebrow: "DRICKSBURK 💛",
    a11yCard: "Dricksburk. {{title}}. {{body}}",
    a11yOpen: "Öppna dricksburken",
    leaveTip: "Ge dricks ›",
    a11yDismiss: "Avfärda",
    notNow: "Inte nu",
  },
};

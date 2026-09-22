/**
 * BudgetArk - Deutsche Texte: Schulden-Tab (moments)
 * File: src/i18n/locales/de/debtsMoments.ts
 *
 * German counterpart of en/debtsMoments.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { debtsMoments as en } from "../en/debtsMoments";

export const debtsMoments: Localized<typeof en> = {
  payoff: {
    kicker: {
      own: "Schuld getilgt",
      partner: "Partnerschuld getilgt",
      joint: "Gemeinsame Schuld getilgt",
    },
    title: "Du hast {{name}} abbezahlt",
    subtitle: "Ein Saldo mehr bei {{zero}}. Leite das freigewordene Geld weiter aufs nächste Ziel.",
    totalCleared: "INSGESAMT GETILGT",
    paymentFreed: "FREIGEWORDENE RATE",
    perMonth: "{{amount}}/Mon.",
    tipTitle: "Schwung-Tipp",
    tipBody: "Lenke jeden Monat mindestens {{amount}} auf die nächste Schuld um - der Schneeballeffekt.",
    viewHistory: "Verlauf ansehen",
    keepGoing: "Weiter so",
  },
  payment: {
    kicker: "ZAHLUNG ERFASST",
    title: "Gut gemacht",
    subtitle: "{{amount}} für {{name}} erfasst.",
    balanceNow: "AKTUELLER SALDO",
    keepGoing: "Weiter so",
  },
  countdown: {
    eyebrow: "COUNTDOWN BIS SCHULDENFREI",
    debtFree: "🎉 Du bist schuldenfrei! Alle Salden stehen auf null.",
    notSolvableTitle: "Kein Tilgungsdatum bei diesem Tempo",
    notSolvableBody:
      "Die monatlichen Zinsen übersteigen diese Zahlungen, darum erreichen die Salden nie null. Schon eine kleine Extrazahlung ändert das - öffne oben „Baue deine Arche“ und vergleiche Tilgungsstrategien.",
    units: {
      year_one: "JAHR",
      year_other: "JAHRE",
      month_one: "MONAT",
      month_other: "MONATE",
      day_one: "TAG",
      day_other: "TAGE",
    },
    target: "Voraussichtlich schuldenfrei im {{month}}",
    pace: {
      perMonth: "{{amount}}/Mon.",
      history_one: "Bei deinem Tempo von {{pace}} · aus deinen Zahlungen des letzten Monats",
      history_other: "Bei deinem Tempo von {{pace}} · aus deinen Zahlungen der letzten {{count}} Monate",
      currentMonth: "Bei deinem Tempo von {{pace}} · aus den Zahlungen dieses Monats",
      minimums: "Angenommen Mindestraten von {{pace}} · erfasse Zahlungen, um das zu verfeinern",
    },
    belowMinimums:
      "Dein aktuelles Tempo von {{pace}} liegt unter deinen Mindestraten zusammen - die Prognose geht davon aus, dass die Mindestraten gezahlt werden.",
  },
  duePrompt: {
    eyebrow: "MINDESTRATE HEUTE FÄLLIG",
    body: "Hast du die Mindestrate von {{amount}} für diesen Monat gezahlt? (Fällig am {{day}}. jedes Monats.)",
    hint: "Eine Buchung hier aktualisiert deinen Saldo und zählt im Budget unter Schuldentilgung.",
    confirm: "Ja, {{amount}} gezahlt",
    notYet: "Diesen Monat noch nicht",
    later: "Später erinnern",
  },
  keepAlive: {
    eyebrow: "KARTE AKTIV HALTEN",
    summary_one: "{{count}} Karte braucht bald einen kleinen Einkauf",
    summary_other: "{{count}} Karten brauchen bald einen kleinen Einkauf",
    overdue: "{{name}} · Frist verstrichen ({{when}}) - bald nutzen",
    useBy: "{{name}} · nutzen bis {{when}} · {{days}}",
    today: "heute",
    tomorrow: "morgen",
    inDays_one: "in {{count}} Tag",
    inDays_other: "in {{count}} Tagen",
    hint: "Ungenutzte Karten kann die Bank kündigen",
    later: "Später",
  },
  tipNudge: {
    eyebrow: "TRINKGELDKASSE 💛",
    a11yCard: "Trinkgeldkasse. {{title}}. {{body}}",
    a11yOpen: "Trinkgeldkasse öffnen",
    leaveTip: "Trinkgeld geben ›",
    a11yDismiss: "Ausblenden",
    notNow: "Jetzt nicht",
  },
};

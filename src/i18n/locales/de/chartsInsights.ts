/**
 * BudgetArk - Deutsche Texte: Karten-Tab (insights)
 * File: src/i18n/locales/de/chartsInsights.ts
 *
 * German counterpart of en/chartsInsights.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { chartsInsights as en } from "../en/chartsInsights";

export const chartsInsights: Localized<typeof en> = {
  whatIf: {
    title: "Was wäre, wenn ich nichts mehr ausgebe für…",
    hint: "Lenke eine Kategorie in Schulden oder Sparen um",
    empty:
      "Erfasse ein paar Monate Ausgaben im Budget-Tab und komm dann zurück, um zu sehen, was das Umlenken einer Kategorie bewirken könnte.",
    pickCategory: "Kategorie wählen",
    averagesHint: "Monatsdurchschnitte aus deinen Buchungen der letzten {{months}} Monate",
    perMonth: "{{amount}}/Mon.",
    sliderLabel: "Monatlich umzulenkender Betrag",
    youAverage: "Du gibst im Schnitt {{amount}}/Mon. für {{category}} aus",
    towardDebt: "In die Schulden stecken",
    methods: {
      avalanche: "Lawine",
      snowball: "Schneeball",
    },
    currentPlan: "Aktueller Plan",
    redirecting: "Mit Umlenkung",
    months: {
      notSolvable: "Nicht lösbar",
      zero: "0 Monate",
      mo: "{{count}} Mon.",
      yr: "{{count}} J.",
      yrMo: "{{years}} J. {{months}} Mon.",
    },
    unpayableFixed: "Diese Extrazahlung macht aus einem unbezahlbaren Plan ein echtes Tilgungsdatum.",
    stillUnpayable: "Mindestraten plus dieser Betrag decken die Zinsen noch immer nicht - probier einen höheren Betrag.",
    sooner: "{{duration}} früher schuldenfrei",
    savesInterest: " · spart {{amount}} Zinsen",
    growSavingsOr: "…oder im Sparen wachsen lassen",
    growSavings: "Im Sparen wachsen lassen",
    noDebts: "Keine aktiven Schulden zum Tilgen - es wird nur das Sparwachstum gezeigt.",
    inYears_one: "In {{count}} Jahr",
    inYears_other: "In {{count}} Jahren",
    fromReturns: "+{{amount}} aus Rendite",
    assumesReturn: "Angenommen: {{rate}} % durchschnittliche Jahresrendite, monatlich verzinst.",
    note: "Das sind Schätzungen, keine Garantien - Ausgaben fallen selten auf null, und Marktrenditen schwanken. Schon die Hälfte einer Kategorie umzulenken kann deinen Zeitplan spürbar verschieben.",
  },
  subscriptions: {
    title: "Abo-Detektiv",
    hintCount: "{{count}} ohne hinterlegte Rechnung · ~{{amount}}/Jahr",
    hintIdle: "Finde wiederkehrende Abbuchungen ohne hinterlegte Rechnung",
    noBankHistory:
      "Abos werden in bankimportierten Ausgaben gefunden. Verbinde eine Bank unter Profil → Bankverbindungen, gib ein paar Monate Umsätze frei und komm dann zurück.",
    nothingHiding:
      "Gerade versteckt sich nichts: Jede wiederkehrende Abbuchung hat schon eine Rechnung, oder du hast sie als kein Abo markiert.",
    resultLabel: "OHNE HINTERLEGTE RECHNUNG",
    perYear: "{{amount}}/Jahr",
    summary_one:
      "etwa {{monthly}} im Monat für {{count}} Abo. Mach daraus eine Rechnung, und das Budget rechnet jeden {{cadence}} damit - oder blende aus, was kein Abo ist.",
    summary_other:
      "etwa {{monthly}} im Monat für {{count}} Abos. Mach aus jedem eine Rechnung, und das Budget rechnet jeden {{cadence}} damit - oder blende aus, was kein Abo ist.",
    cadenceWord: {
      month: "Monat",
      year: "Jahr",
      mixed: "Monat bzw. jedes Jahr",
    },
    cadence: {
      monthly: "monatlich",
      yearly: "jährlich",
    },
    rowMeta: "{{amount}} {{cadence}} · {{charges}} · {{category}}",
    charges_one: "{{count}} Abbuchung",
    charges_other: "{{count}} Abbuchungen",
    makeBill: "Zur Rechnung machen",
    saving: "Wird gespeichert...",
    notSubscription: "Kein Abo",
    a11yMakeBill: "{{merchant}} zur wiederkehrenden Rechnung machen",
    a11yNotSubscription: "{{merchant}} ist kein Abo",
    errors: {
      createBill: "Die wiederkehrende Rechnung konnte nicht angelegt werden.",
      hideMerchant: "Der Händler konnte nicht ausgeblendet werden.",
    },
  },
  exchange: {
    title: "Währungsrechner",
    hint: "Rechne einen Betrag zwischen Währungen um",
    resultLabel: "UMGERECHNETER WERT",
    amount: "Betrag",
    amountPlaceholder: "Betrag zum Umrechnen",
    from: "Von",
    to: "Nach",
    swap: "⇅ Tauschen",
    refresh: "↻ Kurse aktualisieren",
    refreshing: "Wird aktualisiert…",
    loadFailed: "Kurse konnten nicht geladen werden - tippe auf Aktualisieren, um es erneut zu versuchen.",
    refreshFailed: "Kurse konnten nicht aktualisiert werden - es werden die zuletzt gespeicherten Kurse gezeigt.",
    privacyNote:
      "Die Kurse stammen von einem kostenlosen öffentlichen Wechselkursdienst und werden meist einmal täglich aktualisiert. Nur die Anfrage nach der Kurstabelle des Tages verlässt dein Telefon - nie deine Beträge.",
  },
  inflation: {
    title: "Persönliche Inflationsrate",
    hintRates: "Deine Preise {{rate}} vs. {{headline}} offiziell",
    hintIdle: "Deine eigenen Preise im Jahresvergleich vs. die offizielle Inflation",
    insufficient_one:
      "Dafür braucht es mindestens {{min}} erfasste Monate in jedem der letzten zwei Jahre, in Kategorien, für die du in beiden ausgegeben hast. Bisher: {{count}} Monat in den letzten {{window}}, {{prior}} in den {{window}} davor. Erfasse weiter, dann füllt es sich.",
    insufficient_other:
      "Dafür braucht es mindestens {{min}} erfasste Monate in jedem der letzten zwei Jahre, in Kategorien, für die du in beiden ausgegeben hast. Bisher: {{count}} Monate in den letzten {{window}}, {{prior}} in den {{window}} davor. Erfasse weiter, dann füllt es sich.",
    resultLabel: "DEINE INFLATIONSRATE",
    above: "Liegt über der offiziellen Rate von {{headline}}",
    below: "Liegt unter der offiziellen Rate von {{headline}}",
    inLine: "Entspricht der offiziellen Rate von {{headline}}",
    basket_one: "{{prior}}/Mon. → {{current}}/Mon. in derselben {{count}} Kategorie",
    basket_other: "{{prior}}/Mon. → {{current}}/Mon. in denselben {{count}} Kategorien",
    byCategory: "Nach Kategorie",
    averageHint:
      "Durchschnitt pro erfasstem Monat: letzte {{window}} Monate ({{current}} erfasst) vs. die {{window}} davor ({{prior}} erfasst)",
    rowMeta: "{{prior}} → {{current}}/Mon.",
    newSpending:
      "Plus {{amount}}/Mon. in Kategorien, die du letztes Jahr nicht hattest - neue Ausgaben, keine Inflation, deshalb bleiben sie aus der Rate heraus.",
    note: "Offizielle Kennzahl: {{label}}, Stand {{asOf}}, mit der App gebündelt - nichts wird abgerufen. Deine Rate mischt Preisänderungen mit Mengen, also kann eine gestiegene Kategorie ebenso eine Gewohnheitsänderung wie eine Preiserhöhung sein. Schuldenzahlungen und Sparen sind Umbuchungen, keine Preise, und bleiben außen vor.",
  },
};

/**
 * BudgetArk - Deutsche Texte: Karten-Tab (planning)
 * File: src/i18n/locales/de/chartsPlanning.ts
 *
 * German counterpart of en/chartsPlanning.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. Amortization terms follow
 * German bank usage: Tilgung (principal portion), Zinsen, Restschuld.
 */

import type { Localized } from "../types";
import type { chartsPlanning as en } from "../en/chartsPlanning";

export const chartsPlanning: Localized<typeof en> = {
  plannerCard: {
    title: "Anschaffung planen",
    hint: "Ansparposten, die zu deinen Arche-Meilensteinen passen",
    yourPlans: "Deine Pläne",
    yourPlansHint: "Tippe auf einen Plan, um Geld hinzuzufügen. Pläne liegen auf deiner Brücke und zählen zum Nettovermögen.",
    newPlan: "+ Neue Anschaffung planen",
    form: {
      what: "Wofür sparst du?",
      namePlaceholder: "z. B. Neuer Laptop",
      price: "Preis",
      alreadySaved: "Schon gespart",
      zeroPlaceholder: "0",
    },
    categories: {
      car: "Auto",
      home: "Zuhause",
      travel: "Reisen",
      education: "Bildung",
      other: "Sonstiges",
      emergency_fund: "Notgroschen",
    },
    setAside: {
      label: "Monatlich zurücklegen",
    },
    needBy: {
      label: "Wunschtermin",
      none: "Kein Datum - sobald es finanziert ist",
      pickerTitle: "Wunschtermin",
      required: "Für diesen Termin brauchst du {{required}}/Mon.",
      requiredShort: "Für diesen Termin brauchst du {{required}}/Mon. - deine aktuellen {{monthly}}/Mon. reichen nicht rechtzeitig.",
    },
    timeline: {
      today: "Das könntest du heute kaufen",
      ready: "Bereit {{date}} ({{duration}})",
      pickAmount: "Wähle einen Monatsbetrag, um ein Datum zu sehen",
    },
    fit: {
      fits: "Passt gut: nach deinen durchschnittlichen Ausgaben bleiben etwa {{amount}}/Mon. übrig, und das hier braucht höchstens die Hälfte.",
      tight: "Knapp: das beansprucht den Großteil der ~{{amount}}/Mon., die nach deinen durchschnittlichen Ausgaben bleiben. Machbar, aber wenig Spielraum für Überraschungen.",
      over: "Über Budget: das ist mehr als die ~{{amount}}/Mon., die nach deinen durchschnittlichen Ausgaben bleiben - es WIRD andere Ausgaben oder Ziele beschneiden. Versuch einen kleineren Betrag oder einen späteren Termin.",
      overNoFreeCash:
        "Deine durchschnittlichen Ausgaben erreichen oder übersteigen bereits dein Einkommen, also geht jede Rücklage von bestehenden Ausgaben oder Zielen ab. Kürze am besten zuerst eine Kategorie (das Was-wäre-wenn-Tool oben hilft dabei).",
      trackFirst:
        "Erfasse ein paar Monate Einnahmen und Ausgaben im Budget-Tab, dann kann dieses Tool das Tempo mit deinem echten Cashflow abgleichen.",
    },
    cost: {
      title: "Was es wirklich kostet",
      perUse: "Das sind {{description}}.",
      perUseHint: "Wie oft wirst du es nutzen? Schieb den Regler über null, um den Preis pro Nutzung zu sehen - ein guter Test für die Wünsche-Spalte.",
      usesLabel: "Nutzungen pro Monat",
      notTracked: "nicht erfasst",
      usesValue: "{{count}}×",
      years_one: "{{count}} Jahr",
      years_other: "{{count}} Jahre",
    },
    hours: {
      title: "Arbeitsstunden",
      line: "{{price}} sind {{hours}} bei {{rate}}/Std. netto.",
      lineFromIncome: "{{price}} sind {{hours}} bei {{rate}}/Std. netto (aus deinem Durchschnittseinkommen von {{income}}/Mon.).",
      hint: "Erfasse dein Einkommen im Budget-Tab oder gib unten dein Netto pro Stunde ein, um diesen Preis in Arbeitsstunden zu sehen.",
      perWeekLabel: "Wochenarbeitsstunden",
      perWeekValue: "{{count}} Std.",
      overrideLabelWithIncome: "Oder gib dein Netto pro Stunde ein (leer lassen, um dein Einkommen zu nutzen)",
      overrideLabel: "Dein Netto pro Stunde",
      overridePlaceholder: "z. B. 28,50",
    },
    finance: {
      title: "Finanzieren oder ansparen?",
      aprLabel: "Zinssatz bei Finanzierung",
      aprValue: "{{rate}} %",
      termChip: "{{count}} Mon.",
      summary:
        "Finanzierung von {{amount}} zu {{rate}} % über {{months}} Monate: {{payment}}/Mon., {{interest}} Zinsen ({{total}} gesamt).",
      alreadyHave: "Du hast das Geld schon - Sparen gewinnt klar.",
      savingWins: "Wenn du stattdessen sparst, hast du es {{date}}, also {{later}} später, und behältst die {{interest}}{{perMonthClause}}.",
      perMonthClause: " - etwa {{amount}} für jeden Monat Wartezeit, den der Kredit überspringen würde",
      extraClause: " Die Kreditrate liegt außerdem {{amount}}/Mon. über deiner Rücklage, und das {{months}} Monate lang.",
      pickAmount: "Wähle oben eine monatliche Rücklage, um die Wartezeit mit den Zinsen zu vergleichen.",
      arkWarning: "Ein neuer Kredit, während du beim Schritt „{{step}}“ bist, wirft deine Arche zurück - diese Zinsen sind Geld, das der Schritt braucht.",
      nothingToFinance: "Nichts zu finanzieren - was du gespart hast, deckt es schon.",
    },
    ark: {
      title: "Deine Arche: Schritt „{{step}}“",
      sinkingFund: "In Ansparposten denken",
      tradeoff: "Abwägung: {{amount}}/Mon. stattdessen in deine Schulden würde dich {{sooner}} früher schuldenfrei machen{{interestClause}}.",
      interestClause: " und {{amount}} Zinsen sparen",
    },
    errors: {
      start: "Dieser Ansparposten konnte nicht angelegt werden. Bitte versuch es erneut.",
    },
    buttons: {
      start: "Ansparposten starten",
    },
  },
  loan: {
    title: "Kredit-/Hypothekenrechner",
    hint: "Sieh deine Monatsrate und die Gesamtzinsen",
    sliders: {
      loanAmount: "Kreditbetrag",
      loanRate: "Zinssatz (eff. p. a.)",
      loanTerm: "Laufzeit",
      rateValue: "{{value}} %",
      termValue: "{{value}} J.",
      preset: "{{count}} J.",
    },
    result: {
      label: "MONATSRATE",
      sub_one: "{{amount}} Kredit · {{rate}} % Zinsen · {{count}} Jahr",
      sub_other: "{{amount}} Kredit · {{rate}} % Zinsen · {{count}} Jahre",
    },
    breakdown: {
      title: "Kostenaufstellung",
      principal: "Kreditsumme",
      totalInterest: "Gesamtzinsen",
      totalPaid_one: "Du zahlst insgesamt {{total}} über {{count}} Jahr",
      totalPaid_other: "Du zahlst insgesamt {{total}} über {{count}} Jahre",
    },
    firstFive: {
      label: "ZINSEN IN DEN ERSTEN 5 JAHREN",
      share: "{{percent}} % deiner Gesamtzinsen zahlst du in den ersten 60 Monaten.",
      shortLoan: "Dieser Kredit endet vor Jahr 5, daher zeigt das die Zinsen der gesamten Laufzeit.",
      principal: "Tilgung in diesem Zeitraum: {{amount}}",
    },
    yearly: {
      title: "Jahresübersicht",
      hint: "Fasst je 12 Raten ab Kreditbeginn zusammen. Das letzte Jahr kann kürzer sein.",
      meta: "{{count}} J.",
      columns: {
        year: "Jahr",
        payments: "Raten",
        principal: "Tilgung",
        interest: "Zinsen",
        endBalance: "Restschuld",
      },
    },
    schedule: {
      title: "Tilgungsplan",
      hint: "Rate, Tilgung, Zinsen und Restschuld Monat für Monat.",
      meta: "{{count}} Mon.",
      columns: {
        month: "Monat",
        payment: "Rate",
        principal: "Tilgung",
        interest: "Zinsen",
        balance: "Restschuld",
      },
      showing: "{{visible}} von {{total}} Monaten",
      exportCsv: "CSV exportieren",
      preparing: "CSV wird erstellt...",
      showMore: "{{count}} weitere",
      showLess: "Weniger anzeigen",
      exportDialogTitle: "Tilgungsplan exportieren",
      exportSuccess: "CSV-Export geöffnet. Speichere oder teile ihn über das Menü.",
      exportFailed: "Export des Tilgungsplans fehlgeschlagen.",
    },
  },
};

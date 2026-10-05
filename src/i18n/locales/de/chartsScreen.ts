/**
 * BudgetArk - Deutsche Texte: Karten-Tab (screen)
 * File: src/i18n/locales/de/chartsScreen.ts
 *
 * German counterpart of en/chartsScreen.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. The "Why 7%?" card keeps
 * its US-market framing (S&P 500, dollars) because that is what the
 * calculator's default rate is based on.
 */

import type { Localized } from "../types";
import type { chartsScreen as en } from "../en/chartsScreen";

export const chartsScreen: Localized<typeof en> = {
  header: {
    title: "Karten",
    subtitle: "Lerne die Gewässer kennen. Setze deinen Kurs.",
  },
  course: {
    eyebrow: "⭐ KAPITÄNSKURS",
    startHere: "HIER STARTEN",
    resume: "WEITERMACHEN",
    chapterRef: "Kap. {{number}} · {{title}}",
    readMin: " · {{count}} Min.",
    lessonReadMin: "{{count}} Min.",
    filterOnly: "Nur Lektionen zu {{glyph}} {{topic}}",
    showAll: "Alle anzeigen ✕",
    comingSoon: "Demnächst",
  },
  topics: {
    sectionTitle: "THEMEN",
    hint: "Tippe, um den Kurs nach Thema zu filtern",
    labels: {
      budgeting: "Budget",
      debt: "Schulden",
      saving: "Sparen",
      investing: "Investieren",
      taxes: "Steuern",
      insurance: "Versicherung",
      real_estate: "Immobilien",
      retirement: "Altersvorsorge",
      mindset: "Einstellung",
    },
  },
  tools: {
    sectionTitle: "WERKZEUGE",
    hint: "Rechner & Hilfsmittel",
  },
  units: {
    percent: "{{value}} %",
    years: "{{value}} J.",
    yearPreset: "{{count}} J.",
  },
  compound: {
    title: "Zinseszinsrechner",
    hint: "Berechne, wie deine Anlage über die Zeit wächst",
    projectedValue: "PROGNOSTIZIERTER WERT",
    subLump: "{{lump}} jetzt + {{monthly}}/Monat · nach {{years}} Jahren bei {{rate}} %",
    subPlain: "in heutiger Kaufkraft · nach {{years}} Jahren bei {{rate}} %",
    sliders: {
      lumpSum: "Einmalanlage zu Beginn",
      contribution: "Monatlicher Beitrag",
      returnRate: "Jährliche Rendite",
      years: "Anlagedauer",
    },
    presets: {
      savings: "Sparkonto",
      bonds: "Anleihen",
      sp500: "S&P 500",
      aggressive: "Offensiv",
    },
    comparison: {
      title: "Einmalanlage vs. monatlich",
      once: "{{amount}} einmalig",
      perMonth: "{{amount}}/Monat",
      both: "Beides",
      crossover:
        "Der monatliche Plan überholt die Einmalanlage im Jahr {{year}} - zahlt aber auch {{putIn}} statt {{lump}} ein. Beides zusammen ist der eigentliche Gewinn.",
      noCrossover:
        "Über {{years}} Jahre bleibt die Einmalanlage allein vor dem monatlichen Plan. Beides zusammen ist der eigentliche Gewinn.",
    },
    rule72: "Bei {{rate}} % verdoppelt sich dein Geld etwa alle ~{{years}} Jahre (72er-Regel)",
    whyShow: "Warum 7 %?",
    whyHide: "Ausblenden: Warum 7 %?",
    why: {
      title: "S&P 500 und Inflation",
      p1: "Der S&P 500 ist ein Index der 500 größten US-Unternehmen. Seit 1926 hat er im Schnitt ~10 % pro Jahr erzielt.",
      p2: "Die Inflation (steigende Preise) liegt historisch aber bei ~3 % pro Jahr. 100 $ von heute kaufen in Zukunft also weniger.",
      p3: "Ziehen wir die Inflation ab (10 % - 3 %), bleibt eine reale Rendite von etwa 7 %. Dieser Rechner nutzt standardmäßig inflationsbereinigte Renditen - der prognostizierte Wert zeigt also, was dein Geld in heutiger Kaufkraft tatsächlich wert ist.",
      footer: "Vergangene Wertentwicklung ist keine Garantie für die Zukunft. Tatsächliche Renditen schwanken von Jahr zu Jahr.",
    },
    chart: {
      title: "Wachstum im Zeitverlauf",
      totalValue: "Gesamtwert",
      contributions: "Einzahlungen",
      axisYear: "{{count}} J.",
    },
    breakdown: {
      title: "Aufschlüsselung",
      putIn: "Eingezahlt",
      contribute: "Deine Beiträge",
      interest: "Erzielte Zinsen",
      ratio: "Dein Geld hat durch den Zinseszins {{percent}} % mehr erwirtschaftet",
    },
  },
  refi: {
    title: "Umschuldungsrechner",
    hint: "Prüfe, ob eine Umschuldung wirklich Geld spart",
    breakEven: "BREAK-EVEN",
    pickOne: "Wähle unten mindestens eine Schuld, um den Vergleich zu sehen.",
    months: "{{count}} Mon.",
    recoverYears: "~{{years}} Jahre, bis {{amount}} Abschlusskosten wieder drin sind",
    recoverUnderYear: "{{amount}} Abschlusskosten sind in unter einem Jahr wieder drin",
    noBreakEven: "Die neue Rate ist nicht niedriger als die aktuelle - kein Break-Even.",
    currentLoan: "AKTUELLER KREDIT",
    pickDebts: "Wähle die Schulden, die du umschulden willst",
    noDebts: "Lege im Schulden-Tracker eine Schuld an, um diesen Rechner zu nutzen.",
    debtMeta: "{{balance}} · {{rate}} % Zinsen",
    goalSet: " · Ziel gesetzt",
    summaryTitle: "ZUSAMMENFASSUNG AKTUELLER KREDIT",
    combinedBalance: "Gesamtsaldo",
    apr: "Zinssatz",
    weightedApr: "Gewichteter Zinssatz",
    selected: "{{selected}} von {{total}} Schulden ausgewählt",
    weightedByBalance: " · nach Saldo gewichtet",
    autoFilledHint:
      "Restlaufzeit aus dem Zieldatum jeder Schuld übernommen. Passe sie frei an, falls die Zieldaten nicht exakt sind.",
    setGoalHint: "Setze im Tracker ein Zieldatum je Schuld, um die Restlaufzeit automatisch zu füllen.",
    newLoan: "NEUER KREDIT",
    sliders: {
      refiCurrentTerm: "Restlaufzeit (Jahre)",
      refiNewRate: "Neuer Zinssatz",
      refiNewTerm: "Neue Laufzeit (Jahre)",
      refiClosingCosts: "Abschlusskosten",
    },
    monthlyPayment: "Monatliche Rate",
    current: "Aktuell",
    new: "Neu",
    savesPerMonth: "Spart {{amount}}/Monat",
    costsPerMonth: "Kostet {{amount}}/Monat mehr",
    samePayment: "Gleiche monatliche Rate",
    lifetimeInterest: "Zinsen über die Laufzeit",
    keepCurrent: "Aktuell behalten",
    refinance: "Umschulden",
    savesLifetime: "Spart {{amount}} über die gesamte Laufzeit",
    paysMore: "Zahlt insgesamt {{amount}} mehr Zinsen",
    sameLifetime: "Gleiche Zinsen über die Laufzeit",
    netSavings: "Netto-Ersparnis über die neue Laufzeit von {{years}} Jahren: ",
    extendsWarning:
      "Achtung: Die neue Laufzeit ist länger als die Restlaufzeit deines aktuellen Kredits. Die niedrigere Rate kommt zum Teil daher, dass der Saldo auf mehr Monate verteilt wird - prüfe oben die Zinsen über die Laufzeit, ob sich das lohnt.",
  },
  ef: {
    title: "Notgroschen-Rechner",
    hint: "Verfolge den Aufbau deines Sicherheitsnetzes",
    expensesTitle: "Deine monatlichen Ausgaben",
    basedOn: "Laut deinem Budget: im Schnitt {{amount}}/Monat",
    noData: "Noch keine Budgetdaten - gib unten deine monatlichen Ausgaben ein",
    placeholder: "Monatliche Ausgaben",
    threeMonth: "3-Monats-Polster",
    sixMonth: "6-Monats-Polster",
    saved: "{{amount}} gespart",
    monthsToReach_one: "~{{count}} Monat bis zum Ziel bei {{amount}}/Monat",
    monthsToReach_other: "~{{count}} Monate bis zum Ziel bei {{amount}}/Monat",
    threeReached: "3-Monats-Polster erreicht!",
    sixReached: "6-Monats-Polster erreicht!",
    monthlySavings: "Monatliche Sparrate",
    note: "Ein gängiges Ziel sind 3-6 Monatsausgaben in bar. Das deckt Jobverlust, medizinische Notfälle oder unerwartete Reparaturen ab, ohne neue Schulden. Deine Situation kann abweichen.",
  },
  errors: {
    loadFailed: "Deine Daten konnten nicht geladen werden. Öffne den Tab erneut, um es noch einmal zu versuchen.",
  },
};

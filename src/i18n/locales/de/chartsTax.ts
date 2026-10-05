/**
 * BudgetArk - Deutsche Texte: Karten-Tab (tax)
 * File: src/i18n/locales/de/chartsTax.ts
 *
 * German counterpart of en/chartsTax.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. Both tools model US tax
 * rules only, so the titles carry "(nur USA)" and US terms (W-2, 1099,
 * 401(k), IRS, FICA, Social Security, Medicare, state names) stay as they
 * are - there is no German equivalent and inventing one would mislead.
 */

import type { Localized } from "../types";
import type { chartsTax as en } from "../en/chartsTax";

export const chartsTax: Localized<typeof en> = {
  filingStatus: {
    single: "Ledig (Single)",
    marriedJoint: "Verheiratet, gemeinsam (Married joint)",
    marriedSeparate: "Verheiratet, getrennt (Married separate)",
    headOfHousehold: "Haushaltsvorstand (Head of household)",
  },
  takeHome: {
    title: "Nettogehalt (nur USA)",
    hint: "Schätzt US-Bundes-, Bundesstaats- und Lohnsteuer auf ein Gehalt",
    income: {
      sectionTitle: "Dein Einkommen",
      grossLabel: "Bruttojahresgehalt (USD)",
      grossPlaceholder: "z. B. 75000",
      filingStatusLabel: "Veranlagungsart (filing status)",
      paidEveryLabel: "Auszahlung",
    },
    payFrequency: {
      "52": "Wöchentlich",
      "26": "Alle zwei Wochen",
      "24": "Zweimal im Monat",
      "12": "Monatlich",
    },
    periodNoun: {
      "52": "Woche",
      "26": "zwei Wochen",
      "24": "halben Monat",
      "12": "Monat",
      default: "Periode",
    },
    state: {
      sectionTitle: "Bundesstaat (State)",
      noWageTax: " - keine Einkommensteuer des Bundesstaats auf Löhne",
      pickPrompt: "Wähle deinen Bundesstaat, um die Schätzung zu sehen.",
    },
    deductions: {
      sectionTitle: "Vorsteuerabzüge (optional)",
      k401Label: "401(k) % vom Gehalt",
      hsaLabel: "HSA pro Jahr",
      healthLabel: "Kranken­versicherung / Monat",
      hint: "Ein klassisches 401(k) senkt die Einkommensteuer; HSA und Krankenversicherungsbeiträge senken zusätzlich die Lohnsteuer (FICA).",
    },
    result: {
      perPeriodLabel: "NETTO PRO {{period}}",
      perYearAndMonth: "{{year}} / Jahr · {{month}} / Monat",
    },
    segments: {
      sectionTitle: "Wohin jeder Dollar geht",
      home: "Netto",
      saved: "Vorsteuer-Sparen",
      fed: "Bund",
      state: "Bundesstaat",
      fica: "FICA",
    },
    breakdown: {
      sectionTitle: "Jahresübersicht",
      gross: "Bruttogehalt",
      k401: "401(k)-Beitrag",
      cafeteria: "HSA + Krankenversicherung",
      federal: "Bundeseinkommensteuer",
      stateTax: "Einkommensteuer {{state}}",
      stateFallback: "Bundesstaat",
      socialSecurity: "Social Security",
      medicare: "Medicare",
      takeHome: "Netto",
      effectiveRate: "Effektiver Steuersatz",
      marginalBracket: "Grenzsteuersatz (Bund)",
    },
    compare: {
      sectionTitle: "Was wäre bei einem Umzug?",
      lead: "Gleiches Gehalt in {{state}}: {{amount}} netto - ",
      more: "{{amount}} MEHR pro Jahr.",
      less: "{{amount}} WENIGER pro Jahr.",
      same: "gleich viel.",
    },
    disclaimer:
      "Nur eine Schätzung - die tatsächliche Steuer hängt von Freibeträgen, Abzügen, lokalen Steuern und anderen hier nicht berücksichtigten Faktoren ab. Keine Steuerberatung. Wird komplett auf deinem Telefon aus den mitgelieferten Tabellen {{year}} berechnet (IRS Rev. Proc. 2025-32; Bundesstaatsdaten der Tax Foundation) - nichts, was du eingibst, verlässt das Gerät.",
  },
  quarterly: {
    title: "Quartalssteuern (nur USA)",
    hintWithIncome: "{{year}}: {{setAside}} von ~{{estimated}} geschätzt zurückgelegt",
    hintEmpty: "Geschätzte Vorauszahlungen auf dein 1099-Einkommen",
    updateFailed: "Das Quartal konnte nicht aktualisiert werden.",
    prevYear: "Vorheriges Jahr",
    nextYear: "Nächstes Jahr",
    taxYear: "Steuerjahr {{year}}",
    filingStatusLabel: "Veranlagungsart (filing status)",
    empty:
      "Kein 1099-Einkommen für {{year}} erfasst. Markiere Einnahmen im Buchungsformular als 1099 (mit einem Steuer-Rücklagesatz), dann füllen sich die Quartale hier.",
    summary: {
      label: "GESCHÄTZTE VORAUSZAHLUNGEN {{year}}",
      sub: "auf {{income}} 1099-Einkommen · zurückgelegt {{setAside}}",
      short: " ({{amount}} fehlen)",
      spare: " ({{amount}} übrig)",
    },
    status: {
      paid: "Bezahlt {{date}}",
      overdue: "War fällig {{date}}",
      due: "Fällig {{date}}",
      none: "Kein 1099-Einkommen",
    },
    row: {
      title: "{{quarter}} · {{from}}–{{to}}",
      income: "1099-Einkommen",
      setAside: "Zurückgelegt",
      estimated: "Geschätzte Zahlung",
      markPaid: "Als bezahlt markieren",
      undoPaid: "Bezahlt zurücknehmen",
    },
    disclaimer:
      "Schätzung aus den US-Bundestabellen {{year}}: Selbstständigensteuer plus Einkommensteuer auf dein hochgerechnetes 1099-Einkommen, mit Standardabzug. Ohne Bundesstaatssteuer, Freibeträge, W-2-Einbehalt oder sonstiges Einkommen - hast du zusätzlich einen W-2-Job, kann deine echte Rate abweichen. Fälligkeiten folgen dem IRS-Kalender; die Bezahlt-Markierung bleibt auf diesem Telefon.",
  },
};

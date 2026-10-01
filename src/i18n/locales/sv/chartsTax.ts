/**
 * BudgetArk - Svenska texter: Sjökort-fliken (tax)
 * File: src/i18n/locales/sv/chartsTax.ts
 *
 * Swedish counterpart of en/chartsTax.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. Both tools model US tax
 * rules only, so the titles carry "(endast USA)" and US terms (W-2, 1099,
 * 401(k), IRS, FICA, Social Security, Medicare, state names) stay as they
 * are - there is no Swedish equivalent and inventing one would mislead.
 */

import type { Localized } from "../types";
import type { chartsTax as en } from "../en/chartsTax";

export const chartsTax: Localized<typeof en> = {
  filingStatus: {
    single: "Ensamstående (Single)",
    marriedJoint: "Gift, gemensamt (Married joint)",
    marriedSeparate: "Gift, separat (Married separate)",
    headOfHousehold: "Familjeförsörjare (Head of household)",
  },
  takeHome: {
    title: "Nettolön (endast USA)",
    hint: "Uppskatta amerikansk federal, delstatlig och löneskatt på en lön",
    income: {
      sectionTitle: "Din inkomst",
      grossLabel: "Bruttoårslön (USD)",
      grossPlaceholder: "t.ex. 75000",
      filingStatusLabel: "Deklarationsstatus (filing status)",
      paidEveryLabel: "Utbetalning",
    },
    payFrequency: {
      "52": "Varje vecka",
      "26": "Varannan vecka",
      "24": "Två gånger i månaden",
      "12": "Varje månad",
    },
    periodNoun: {
      "52": "vecka",
      "26": "två veckor",
      "24": "halvmånad",
      "12": "månad",
      default: "period",
    },
    state: {
      sectionTitle: "Delstat (State)",
      noWageTax: " - ingen delstatlig inkomstskatt på lön",
      pickPrompt: "Välj din delstat för att se uppskattningen.",
    },
    deductions: {
      sectionTitle: "Avdrag före skatt (valfritt)",
      k401Label: "401(k) % av lönen",
      hsaLabel: "HSA per år",
      healthLabel: "Sjukförsäkring / månad",
      hint: "Ett traditionellt 401(k) sänker inkomstskatten; HSA och sjukförsäkringspremier sänker även löneskatten (FICA).",
    },
    result: {
      perPeriodLabel: "NETTO PER {{period}}",
      perYearAndMonth: "{{year}} / år · {{month}} / månad",
    },
    segments: {
      sectionTitle: "Vart varje dollar går",
      home: "Netto",
      saved: "Sparande före skatt",
      fed: "Federal",
      state: "Delstat",
      fica: "FICA",
    },
    breakdown: {
      sectionTitle: "Årlig fördelning",
      gross: "Bruttolön",
      k401: "401(k)-insättning",
      cafeteria: "HSA + sjukförsäkring",
      federal: "Federal inkomstskatt",
      stateTax: "Inkomstskatt {{state}}",
      stateFallback: "Delstat",
      socialSecurity: "Social Security",
      medicare: "Medicare",
      takeHome: "Netto",
      effectiveRate: "Effektiv skattesats",
      marginalBracket: "Federal marginalskatt",
    },
    compare: {
      sectionTitle: "Tänk om du flyttade?",
      lead: "Samma lön i {{state}}: {{amount}} netto - ",
      more: "{{amount}} MER per år.",
      less: "{{amount}} MINDRE per år.",
      same: "lika mycket.",
    },
    disclaimer:
      "Bara en uppskattning - den verkliga skatten beror på skattereduktioner, avdrag, lokala skatter och annat som inte modelleras här. Inte skatterådgivning. Beräknas helt på din telefon från medföljande tabeller för {{year}} (IRS Rev. Proc. 2025-32; delstatsdata från Tax Foundation) - inget du skriver lämnar enheten.",
  },
  quarterly: {
    title: "Kvartalsskatt (endast USA)",
    hintWithIncome: "{{year}}: {{setAside}} undansatt av ~{{estimated}} uppskattat",
    hintEmpty: "Preliminära betalningar på din 1099-inkomst",
    updateFailed: "Kunde inte uppdatera det kvartalet.",
    prevYear: "Föregående år",
    nextYear: "Nästa år",
    taxYear: "Skatteår {{year}}",
    filingStatusLabel: "Deklarationsstatus (filing status)",
    empty:
      "Ingen 1099-inkomst loggad för {{year}}. Markera inkomstposter som 1099 (med en procentsats att sätta undan för skatt) i formuläret Lägg till post så fylls kvartalen i här.",
    summary: {
      label: "PRELIMINÄRA BETALNINGAR {{year}}",
      sub: "på {{income}} i 1099-inkomst · undansatt {{setAside}}",
      short: " ({{amount}} saknas)",
      spare: " ({{amount}} över)",
    },
    status: {
      paid: "Betald {{date}}",
      overdue: "Förföll {{date}}",
      due: "Förfaller {{date}}",
      none: "Ingen 1099-inkomst",
    },
    row: {
      title: "{{quarter}} · {{from}}–{{to}}",
      income: "1099-inkomst",
      setAside: "Undansatt",
      estimated: "Uppskattad betalning",
      markPaid: "Markera som betald",
      undoPaid: "Ångra betald",
    },
    disclaimer:
      "Uppskattning från de federala tabellerna för {{year}}: egenföretagarskatt plus inkomstskatt på din 1099-inkomst omräknad till årsbasis, med standardavdraget. Ingen delstatsskatt, inga skattereduktioner, ingen W-2-källskatt eller annan inkomst - har du även ett W-2-jobb kan din verkliga delbetalning skilja sig. Förfallodatumen följer IRS-kalendern; betald-markeringen stannar på den här telefonen.",
  },
};

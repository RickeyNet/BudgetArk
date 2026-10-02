/**
 * BudgetArk - Norske tekster: Sjøkart-fanen (tax)
 * File: src/i18n/locales/nb/chartsTax.ts
 *
 * Norwegian (Bokmål) counterpart of en/chartsTax.ts. Informal "du"
 * throughout; see src/i18n/GLOSSARY.md for the fixed vocabulary. Both
 * tools model US tax rules only, so the titles carry "(kun USA)" and US
 * terms (W-2, 1099, 401(k), IRS, FICA, Social Security, Medicare, state
 * names) stay as they are - there is no Norwegian equivalent and
 * inventing one would mislead.
 */

import type { Localized } from "../types";
import type { chartsTax as en } from "../en/chartsTax";

export const chartsTax: Localized<typeof en> = {
  filingStatus: {
    single: "Enslig (Single)",
    marriedJoint: "Gift, felles (Married joint)",
    marriedSeparate: "Gift, separat (Married separate)",
    headOfHousehold: "Husholdningsforsørger (Head of household)",
  },
  takeHome: {
    title: "Nettolønn (kun USA)",
    hint: "Anslå amerikansk føderal skatt, delstatsskatt og trygdeavgift på en lønn",
    income: {
      sectionTitle: "Inntekten din",
      grossLabel: "Brutto årslønn (USD)",
      grossPlaceholder: "f.eks. 75000",
      filingStatusLabel: "Skattestatus (filing status)",
      paidEveryLabel: "Utbetaling",
    },
    payFrequency: {
      "52": "Hver uke",
      "26": "Hver 14. dag",
      "24": "To ganger i måneden",
      "12": "Hver måned",
    },
    periodNoun: {
      "52": "uke",
      "26": "to uker",
      "24": "halvmåned",
      "12": "måned",
      default: "periode",
    },
    state: {
      sectionTitle: "Delstat (State)",
      noWageTax: " - ingen delstatlig inntektsskatt på lønn",
      pickPrompt: "Velg delstaten din for å se anslaget.",
    },
    deductions: {
      sectionTitle: "Fradrag før skatt (valgfritt)",
      k401Label: "401(k) % av lønnen",
      hsaLabel: "HSA per år",
      healthLabel: "Helseforsikring / måned",
      hint: "Et tradisjonelt 401(k) senker inntektsskatten; HSA og helseforsikringspremier senker også trygdeavgiften (FICA).",
    },
    result: {
      perPeriodLabel: "NETTO PER {{period}}",
      perYearAndMonth: "{{year}} / år · {{month}} / måned",
    },
    segments: {
      sectionTitle: "Hvor hver dollar går",
      home: "Netto",
      saved: "Sparing før skatt",
      fed: "Føderal",
      state: "Delstat",
      fica: "FICA",
    },
    breakdown: {
      sectionTitle: "Årlig fordeling",
      gross: "Bruttolønn",
      k401: "401(k)-innskudd",
      cafeteria: "HSA + helseforsikring",
      federal: "Føderal inntektsskatt",
      stateTax: "Inntektsskatt {{state}}",
      stateFallback: "Delstat",
      socialSecurity: "Social Security",
      medicare: "Medicare",
      takeHome: "Netto",
      effectiveRate: "Effektiv skattesats",
      marginalBracket: "Føderalt marginalskattetrinn",
    },
    compare: {
      sectionTitle: "Hva om du flyttet?",
      lead: "Samme lønn i {{state}}: {{amount}} netto - ",
      more: "{{amount}} MER per år.",
      less: "{{amount}} MINDRE per år.",
      same: "det samme.",
    },
    disclaimer:
      "Bare et anslag - den faktiske skatten avhenger av skattefradrag, fratrekk, lokale skatter og annet som ikke modelleres her. Ikke skatterådgivning. Beregnes helt på telefonen din fra medfølgende tabeller for {{year}} (IRS Rev. Proc. 2025-32; delstatsdata fra Tax Foundation) - ingenting du skriver inn forlater enheten.",
  },
  quarterly: {
    title: "Kvartalsskatt (kun USA)",
    hintWithIncome: "{{year}}: satt av {{setAside}} av ~{{estimated}} anslått",
    hintEmpty: "Forskuddsbetalinger på 1099-inntekten din",
    updateFailed: "Kunne ikke oppdatere det kvartalet.",
    prevYear: "Forrige år",
    nextYear: "Neste år",
    taxYear: "Skatteår {{year}}",
    filingStatusLabel: "Skattestatus (filing status)",
    empty:
      "Ingen 1099-inntekt logget for {{year}}. Merk inntektsposter som 1099 (med en prosentsats satt av til skatt) i skjemaet Legg til post, så fylles kvartalene inn her.",
    summary: {
      label: "FORSKUDDSBETALINGER {{year}}",
      sub: "på {{income}} i 1099-inntekt · satt av {{setAside}}",
      short: " ({{amount}} mangler)",
      spare: " ({{amount}} til overs)",
    },
    status: {
      paid: "Betalt {{date}}",
      overdue: "Forfalt {{date}}",
      due: "Forfaller {{date}}",
      none: "Ingen 1099-inntekt",
    },
    row: {
      title: "{{quarter}} · {{from}}–{{to}}",
      income: "1099-inntekt",
      setAside: "Satt av",
      estimated: "Anslått betaling",
      markPaid: "Merk som betalt",
      undoPaid: "Angre betalt",
    },
    disclaimer:
      "Anslag fra de føderale tabellene for {{year}}: skatt for selvstendig næringsdrivende pluss inntektsskatt på 1099-inntekten din omregnet til årsbasis, med standardfradraget. Ingen delstatsskatt, skattefradrag, W-2-forskuddstrekk eller annen inntekt - har du også en W-2-jobb, kan den faktiske delbetalingen din avvike. Forfallsdatoene følger IRS-kalenderen; betalt-merket blir på denne telefonen.",
  },
};

/**
 * BudgetArk - Norske tekster: pakket data (templates)
 * File: src/i18n/locales/nb/dataTemplates.ts
 *
 * Norwegian (Bokmål) counterpart of en/dataTemplates.ts. Informal "du"
 * throughout; see src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { dataTemplates as en } from "../en/dataTemplates";

export const dataTemplates: Localized<typeof en> = {
  single: {
    title: "Singel",
    tagline: "Én inntekt, balansert 50/30/20",
    description:
      "Behov rundt halvparten, ønsker under en tredjedel og en femtedel til sparing og pensjon. Hverdagsstandarden.",
  },
  couple: {
    title: "Par / husholdning",
    tagline: "Delte kostnader, en reisepost, plass til to",
    description:
      "Dagligvarer og forsikring dimensjonert for to, et reisebudsjett og sparing delt mellom en buffer og pensjon. Koble sammen telefonene senere for å dele det.",
  },
  "debt-heavy": {
    title: "Nedbetaling av gjeld",
    tagline: "Nøkterne ønsker, en fjerdedel av lønnen fri til nedbetaling",
    description:
      "Ønsker kuttet hardt så omtrent 27 % av nettolønnen står igjen til gjeldsbetalinger, som Gjeld-fanen planlegger for deg. Passer sammen med Bygg arken din.",
  },
  "zero-based": {
    title: "Nullbasert",
    tagline: "Hver krone får en jobb",
    description:
      "Grensene for alle kategorier summerer seg til nøyaktig nettolønnen din, gaver inkludert. Ingenting står utildelt.",
  },
};

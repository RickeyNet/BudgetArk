/**
 * BudgetArk - Svenska texter: paketerad data (templates)
 * File: src/i18n/locales/sv/dataTemplates.ts
 *
 * Swedish counterpart of en/dataTemplates.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { dataTemplates as en } from "../en/dataTemplates";

export const dataTemplates: Localized<typeof en> = {
  single: {
    title: "Singel",
    tagline: "En inkomst, balanserad 50/30/20",
    description:
      "Behov ungefär hälften, önskemål under en tredjedel och en femtedel till sparande och pension. Vardagsstandarden.",
  },
  couple: {
    title: "Par / hushåll",
    tagline: "Delade kostnader, en resepost, plats för två",
    description:
      "Matvaror och försäkringar dimensionerade för två, en resebudget och sparande delat mellan en buffert och pension. Koppla ihop telefonerna senare för att dela den.",
  },
  "debt-heavy": {
    title: "Betala av skulder",
    tagline: "Snåla önskemål, en fjärdedel av lönen fri till avbetalning",
    description:
      "Önskemål hårt nedskurna så att cirka 27 % av nettolönen blir kvar till skuldbetalningar, som fliken Skulder planerar för dig. Passar ihop med Bygg din ark.",
  },
  "zero-based": {
    title: "Nollbaserad",
    tagline: "Varje krona får ett jobb",
    description:
      "Gränserna för alla kategorier summerar till exakt din nettolön, gåvor inräknat. Inget lämnas otilldelat.",
  },
};

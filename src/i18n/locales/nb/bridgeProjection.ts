/**
 * BudgetArk - Norske tekster: Broen-fanen (prognose)
 * File: src/i18n/locales/nb/bridgeProjection.ts
 *
 * Norwegian (Bokmål) counterpart of en/bridgeProjection.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { bridgeProjection as en } from "../en/bridgeProjection";

export const bridgeProjection: Localized<typeof en> = {
  title: "Hvor dette er på vei",
  horizon: "{{amount}} innen {{month}}",
  onTrack: "I rute",
  offTrack: "Ute av rute",
  chart: {
    now: "Nå",
  },
  pace: {
    noHistory:
      "Ingen budsjetthistorikk enda, så linjen antar at ingenting legges til fra måned til måned - logg noen måneder, så lærer den tempoet ditt.",
    tracked_one:
      "I ditt tempo på {{signedAmount}}/mnd etter forbruk og minstebetalinger på gjeld (siste {{count}} sporede måned), med gjelden nedbetalt med minstebeløpene.",
    tracked_other:
      "I ditt tempo på {{signedAmount}}/mnd etter forbruk og minstebetalinger på gjeld (siste {{count}} sporede måneder), med gjelden nedbetalt med minstebeløpene.",
  },
  form: {
    targetLabel: "Mål for nettoformue",
    targetPlaceholder: "f.eks. 100000",
    byEndOf: "Innen utgangen av",
    save: "Lagre mål",
    pickerTitle: "Nå det innen utgangen av",
  },
  errors: {
    missingAmount: "Skriv inn et målbeløp.",
    monthPassed: "Velg en måned som ikke har passert.",
    notSaved: "Målet kunne ikke lagres.",
    saveFailed: "Kunne ikke lagre målet.",
    removeFailed: "Kunne ikke fjerne målet.",
  },
  goal: {
    title: "Mål: {{amount}} innen {{month}}",
    projected: "Prognose da: {{amount}} ({{signedGap}})",
    early: "I dette tempoet er du der rundt {{month}} - før tiden.",
    onPace: "Akkurat i rute.",
    needsMonthly: "Trenger omtrent {{amount}}/mnd for å lande i tide",
    arrivesAround: "; i dagens tempo kommer det rundt {{month}}.",
    neverReaches: "; dagens tempo når aldri dit.",
    set: "Sett et mål for nettoformuen",
  },
  footer:
    "Heltrukket: månedshistorikk. Stiplet: prognose. Anslag, ikke løfter - markeder, lønnsøkninger og overraskelser flytter alle linjen.",
};

/**
 * BudgetArk - Svenska texter: Bryggan-fliken (prognos)
 * File: src/i18n/locales/sv/bridgeProjection.ts
 *
 * Swedish counterpart of en/bridgeProjection.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { bridgeProjection as en } from "../en/bridgeProjection";

export const bridgeProjection: Localized<typeof en> = {
  title: "Vart det här är på väg",
  horizon: "{{amount}} till {{month}}",
  onTrack: "I fas",
  offTrack: "Ur fas",
  chart: {
    now: "Nu",
  },
  pace: {
    noHistory:
      "Ingen budgethistorik än, så linjen antar att inget läggs till månad för månad - logga några månader så lär den sig din takt.",
    tracked_one:
      "I din takt på {{signedAmount}}/mån efter utgifter och minimibetalningar (senaste {{count}} spårade månaden), med skulderna avbetalade med sina minimibelopp.",
    tracked_other:
      "I din takt på {{signedAmount}}/mån efter utgifter och minimibetalningar (senaste {{count}} spårade månaderna), med skulderna avbetalade med sina minimibelopp.",
  },
  form: {
    targetLabel: "Mål för nettoförmögenhet",
    targetPlaceholder: "t.ex. 100000",
    byEndOf: "Senast i slutet av",
    save: "Spara mål",
    pickerTitle: "Nå det senast i slutet av",
  },
  errors: {
    missingAmount: "Ange ett målbelopp.",
    monthPassed: "Välj en månad som inte har passerat.",
    notSaved: "Målet kunde inte sparas.",
    saveFailed: "Kunde inte spara målet.",
    removeFailed: "Kunde inte ta bort målet.",
  },
  goal: {
    title: "Mål: {{amount}} till {{month}}",
    projected: "Prognos då: {{amount}} ({{signedGap}})",
    early: "I den här takten är du där runt {{month}} - i förtid.",
    onPace: "Precis i fas.",
    needsMonthly: "Kräver ungefär {{amount}}/mån för att landa i tid",
    arrivesAround: "; i dagens takt kommer det runt {{month}}.",
    neverReaches: "; dagens takt når aldrig dit.",
    set: "Sätt ett mål för nettoförmögenheten",
  },
  footer:
    "Heldragen: månadshistorik. Streckad: prognos. Uppskattningar, inte löften - marknader, löneökningar och överraskningar flyttar alla linjen.",
};

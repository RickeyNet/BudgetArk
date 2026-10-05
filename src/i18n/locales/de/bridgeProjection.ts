/**
 * BudgetArk - Deutsche Texte: Brücke-Tab (Prognose)
 * File: src/i18n/locales/de/bridgeProjection.ts
 *
 * German counterpart of en/bridgeProjection.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { bridgeProjection as en } from "../en/bridgeProjection";

export const bridgeProjection: Localized<typeof en> = {
  title: "Wohin es geht",
  horizon: "{{amount}} bis {{month}}",
  onTrack: "Im Plan",
  offTrack: "Hinter Plan",
  chart: {
    now: "Jetzt",
  },
  pace: {
    noHistory:
      "Noch kein Budgetverlauf, darum nimmt die Linie an, dass von Monat zu Monat nichts dazukommt - erfasse ein paar Monate, dann lernt sie dein Tempo.",
    tracked_one:
      "Bei deinem Tempo von {{signedAmount}}/Monat nach Ausgaben und Mindestraten (letzter {{count}} erfasster Monat), Schulden mit Mindestraten getilgt.",
    tracked_other:
      "Bei deinem Tempo von {{signedAmount}}/Monat nach Ausgaben und Mindestraten (letzte {{count}} erfasste Monate), Schulden mit Mindestraten getilgt.",
  },
  form: {
    targetLabel: "Ziel-Nettovermögen",
    targetPlaceholder: "z. B. 100000",
    byEndOf: "Bis Ende",
    save: "Ziel speichern",
    pickerTitle: "Erreichen bis Ende",
  },
  errors: {
    missingAmount: "Gib einen Zielbetrag ein.",
    monthPassed: "Wähle einen Monat, der noch nicht vorbei ist.",
    notSaved: "Dieses Ziel konnte nicht gespeichert werden.",
    saveFailed: "Ziel konnte nicht gespeichert werden.",
    removeFailed: "Ziel konnte nicht entfernt werden.",
  },
  goal: {
    title: "Ziel: {{amount}} bis {{month}}",
    projected: "Prognose dann: {{amount}} ({{signedGap}})",
    early: "Bei diesem Tempo bist du etwa im {{month}} da - früher als geplant.",
    onPace: "Genau im Plan.",
    needsMonthly: "Braucht etwa {{amount}}/Monat, um pünktlich anzukommen",
    arrivesAround: "; beim heutigen Tempo etwa im {{month}}.",
    neverReaches: "; beim heutigen Tempo nie.",
    set: "Nettovermögensziel setzen",
  },
  footer:
    "Durchgezogen: Monatsverlauf. Gestrichelt: Prognose. Schätzungen, keine Versprechen - Märkte, Gehaltserhöhungen und Überraschungen verschieben die Linie.",
};

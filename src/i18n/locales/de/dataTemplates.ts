/**
 * BudgetArk - Deutsche Texte: gebuendelte Daten (templates)
 * File: src/i18n/locales/de/dataTemplates.ts
 *
 * German counterpart of en/dataTemplates.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { dataTemplates as en } from "../en/dataTemplates";

export const dataTemplates: Localized<typeof en> = {
  single: {
    title: "Single",
    tagline: "Ein Einkommen, ausgewogen 50/30/20",
    description:
      "Rund die Hälfte für Nötiges, unter einem Drittel für Wünsche und ein Fünftel für Sparen und Altersvorsorge. Der Alltagsstandard.",
  },
  couple: {
    title: "Paar / Haushalt",
    tagline: "Geteilte Kosten, ein Reiseposten, Platz für zwei",
    description:
      "Lebensmittel und Versicherung für zwei bemessen, ein Reisebudget und Sparen aufgeteilt in Polster und Altersvorsorge. Koppelt später eure Handys, um es zu teilen.",
  },
  "debt-heavy": {
    title: "Schulden abbauen",
    tagline: "Wenig Wünsche, ein Viertel des Gehalts frei zum Tilgen",
    description:
      "Wünsche stark gekürzt, damit etwa 27 % des Nettogehalts für Schuldenzahlungen bleiben, die der Schulden-Tab für dich plant. Passt zu Baue deine Arche.",
  },
  "zero-based": {
    title: "Zero-Based",
    tagline: "Jeder Cent bekommt eine Aufgabe",
    description:
      "Die Limits aller Kategorien ergeben zusammen genau dein Nettogehalt, Spenden inklusive. Nichts bleibt unverteilt.",
  },
};

/**
 * BudgetArk - Deutsche Texte: Profil > Darstellung
 * File: src/i18n/locales/de/appearance.ts
 *
 * German counterpart of en/appearance.ts.
 */

import type { Localized } from "../types";
import type { appearance as en } from "../en/appearance";

export const appearance: Localized<typeof en> = {
  sectionTitle: "DARSTELLUNG",
  theme: {
    label: "Farbschema",
    pickerTitle: "Farbschema wählen",
  },
  surfaceStyle: {
    label: "Oberflächenstil",
    pickerTitle: "Oberflächenstil",
    themeDefaultSuffix: " · Standard des Farbschemas",
    themeDefaultNote:
      "{{theme}} verwendet standardmäßig Glas. Wähle hier einen Stil, um ihn für alle Farbschemata beizubehalten.",
    presets: {
      solid: { name: "Deckend", description: "Klassische, undurchsichtige Karten und Fenster." },
      glass: { name: "Glas", description: "Halbtransparente Milchglas-Karten in der ganzen App." },
    },
  },
  backgroundEffects: {
    label: "Stimmungshintergründe",
    enabled: "Dekorative Hintergründe passend zum Farbschema sind aktiviert",
    disabled: "Schlichte Hintergründe für weniger visuelle Unruhe",
  },
  density: {
    label: "Layoutdichte",
    pickerTitle: "Layoutdichte",
    presets: {
      compact: { name: "Kompakt", description: "Engere Abstände, mehr Inhalt pro Bildschirm." },
      comfortable: { name: "Komfortabel", description: "Ausgewogene Abstände - die Standardansicht." },
      spacious: { name: "Großzügig", description: "Größere Tippflächen und mehr Platz für Text." },
    },
  },
  textSize: {
    label: "Textgröße",
    pickerTitle: "Textgröße",
    a11yLabel: "Textgröße, aktuell {{current}}",
    a11yHint: "Öffnet die Textgrößen-Optionen für die ganze App",
    presets: {
      small: { name: "Klein", description: "Etwas kleinerer Text - passt ein bisschen mehr auf den Bildschirm." },
      default: { name: "Standard", description: "Normale Textgröße." },
      large: { name: "Groß", description: "Größerer Text zum leichteren Lesen." },
      xlarge: { name: "Sehr groß", description: "Größter Text - maximale Lesbarkeit." },
    },
  },
};

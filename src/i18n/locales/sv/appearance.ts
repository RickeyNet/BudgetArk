/**
 * BudgetArk - Svenska texter: Profil > Utseende
 * File: src/i18n/locales/sv/appearance.ts
 *
 * Swedish counterpart of en/appearance.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. Theme names (The Ark,
 * Forest Gold, ...) are proper nouns and deliberately stay untranslated.
 */

import type { Localized } from "../types";
import type { appearance as en } from "../en/appearance";

export const appearance: Localized<typeof en> = {
  sectionTitle: "UTSEENDE",
  theme: {
    label: "Tema",
    pickerTitle: "Välj tema",
  },
  surfaceStyle: {
    label: "Designstil",
    pickerTitle: "Designstil",
    themeDefaultSuffix: " · temats standard",
    themeDefaultNote:
      "{{theme}} använder Glas som standard just nu. Välj en stil här för att behålla den i alla teman.",
    presets: {
      solid: { name: "Enfärgad", description: "Klassiska ogenomskinliga kort och fönster." },
      glass: { name: "Glas", description: "Genomskinliga frostade kort i hela appen." },
    },
  },
  backgroundEffects: {
    label: "Bakgrundseffekter",
    enabled: "Dekorativa bakgrunder i temats stil är på",
    disabled: "Enkla bakgrunder för mindre visuellt brus",
  },
  density: {
    label: "Layouttäthet",
    pickerTitle: "Layouttäthet",
    presets: {
      compact: { name: "Kompakt", description: "Tätare avstånd, mer innehåll per skärm." },
      comfortable: { name: "Bekväm", description: "Balanserade avstånd - standardutseendet." },
      spacious: { name: "Luftig", description: "Större tryckytor och rymligare text." },
    },
  },
  textSize: {
    label: "Textstorlek",
    pickerTitle: "Textstorlek",
    a11yLabel: "Textstorlek, just nu {{current}}",
    a11yHint: "Öppnar textstorleksalternativen för hela appen",
    presets: {
      small: { name: "Liten", description: "Något mindre text - får plats med lite mer på skärmen." },
      default: { name: "Standard", description: "Vanlig textstorlek." },
      large: { name: "Stor", description: "Större text som är lättare att läsa." },
      xlarge: { name: "Extra stor", description: "Störst text - maximal läsbarhet." },
    },
  },
};

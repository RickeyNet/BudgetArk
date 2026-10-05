/**
 * BudgetArk - Norske tekster: Profil > Utseende
 * File: src/i18n/locales/nb/appearance.ts
 *
 * Norwegian (Bokmål) counterpart of en/appearance.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. Theme names (The Ark,
 * Forest Gold, ...) are proper nouns and deliberately stay untranslated.
 */

import type { Localized } from "../types";
import type { appearance as en } from "../en/appearance";

export const appearance: Localized<typeof en> = {
  sectionTitle: "UTSEENDE",
  theme: {
    label: "Tema",
    pickerTitle: "Velg tema",
  },
  surfaceStyle: {
    label: "Designstil",
    pickerTitle: "Designstil",
    themeDefaultSuffix: " · temaets standard",
    themeDefaultNote:
      "{{theme}} bruker Glass som standard nå. Velg en stil her for å beholde den i alle temaer.",
    presets: {
      solid: { name: "Ensfarget", description: "Klassiske ugjennomsiktige kort og vinduer." },
      glass: { name: "Glass", description: "Gjennomskinnelige frostede kort i hele appen." },
    },
  },
  backgroundEffects: {
    label: "Bakgrunnseffekter",
    enabled: "Dekorative bakgrunner i temaets stil er på",
    disabled: "Enkle bakgrunner for mindre visuell støy",
  },
  density: {
    label: "Layouttetthet",
    pickerTitle: "Layouttetthet",
    presets: {
      compact: { name: "Kompakt", description: "Tettere avstand, mer innhold per skjerm." },
      comfortable: { name: "Komfortabel", description: "Balansert avstand - standardutseendet." },
      spacious: { name: "Luftig", description: "Større trykkflater og mer luft rundt teksten." },
    },
  },
  textSize: {
    label: "Tekststørrelse",
    pickerTitle: "Tekststørrelse",
    a11yLabel: "Tekststørrelse, nå {{current}}",
    a11yHint: "Åpner tekststørrelsesvalgene for hele appen",
    presets: {
      small: { name: "Liten", description: "Litt mindre tekst - får plass til litt mer på skjermen." },
      default: { name: "Standard", description: "Vanlig tekststørrelse." },
      large: { name: "Stor", description: "Større tekst som er lettere å lese." },
      xlarge: { name: "Ekstra stor", description: "Størst tekst - maksimal lesbarhet." },
    },
  },
};

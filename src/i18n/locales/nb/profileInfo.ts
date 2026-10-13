/**
 * BudgetArk - Norske tekster: Profil (info)
 * File: src/i18n/locales/nb/profileInfo.ts
 *
 * Norwegian (Bokmål) counterpart of en/profileInfo.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { profileInfo as en } from "../en/profileInfo";

export const profileInfo: Localized<typeof en> = {
  about: {
    sectionTitle: "OM APPEN",
    versionRow: "v{{version}} - {{title}}",
    tapForReleaseNotes: "Trykk for versjonsinformasjon",
    websiteLabel: "Nettsted",
    websiteA11y: "Åpne BudgetArks nettsted",
    githubLabel: "GitHub",
    releaseNotes: {
      title: "Versjonsinformasjon",
      subtitle: "Bla gjennom gjeldende og tidligere versjoner.",
      releasedOn: "Utgitt {{date}}",
    },
  },
  help: {
    sectionTitle: "HJELP",
    featureGuide: {
      label: "Funksjonsguide",
      description: "Søkbar guide til hver funksjon, omvisningen per fane, hva som er nytt og ta introduksjonen på nytt",
      a11yLabel: "Åpne funksjonsguiden",
    },
    /** Formerly the SUPPORT card - feedback and the tip jar are help-adjacent. */
    feedback: {
      label: "Send tilbakemelding",
      description: "Feilrapporter & funksjonsønsker",
    },
    tipJar: {
      label: "Tipsboks 💛",
      description: "Frivillig støtte - ingenting å låse opp",
    },
  },
  /** One card for the three "how do I tag entries?" rows: categories, people, businesses. */
  organize: {
    sectionTitle: "ORDNE",
  },
  business: {
    businesses: {
      label: "Bedrifter 💼",
      description: "Merk utgifter med et firma eller en sidegeskjeft, pluss rapporten til skattemeldingen",
      a11yLabel: "Administrer bedrifter",
    },
  },
  categories: {
    custom: {
      label: "Egne kategorier",
      a11yLabel: "Administrer egne kategorier",
      empty: "Legg til dine egne budsjettkategorier",
      count_one: "{{count}} egen",
      count_other: "{{count}} egne",
    },
  },
};

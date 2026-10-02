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
    onboarding: {
      label: "Introduksjon",
      description: "Søkbar guide til alt, eller gjør førstegangsoppsettet på nytt",
    },
    featureTour: {
      label: "Funksjonsomvisning",
      description: "Se omvisningen i de nyeste funksjonene igjen",
      a11yLabel: "Spill av funksjonsomvisningen igjen",
    },
    featureGuide: {
      label: "Funksjonsguide",
      description: "Hver funksjon per fane - hvor den ligger og hvordan du bruker den",
      a11yLabel: "Åpne funksjonsguiden",
    },
  },
  support: {
    feedback: {
      label: "Send tilbakemelding",
      description: "Feilrapporter & funksjonsønsker",
    },
    tipJar: {
      label: "Tipsboks 💛",
      description: "Frivillig støtte - ingenting å låse opp",
    },
  },
  business: {
    sectionTitle: "BEDRIFTSUTGIFTER",
    businesses: {
      label: "Bedrifter 💼",
      description: "Merk utgifter med et firma eller en sidegeskjeft",
      a11yLabel: "Administrer bedrifter",
    },
    report: {
      label: "Rapport over bedriftsutgifter",
      description: "Summer per bedrift og år, med CSV-eksport",
      a11yLabel: "Åpne rapporten over bedriftsutgifter",
    },
  },
  categories: {
    sectionTitle: "KATEGORIER",
    custom: {
      label: "Egne kategorier",
      a11yLabel: "Administrer egne kategorier",
      empty: "Legg til dine egne budsjettkategorier",
      count_one: "{{count}} egen",
      count_other: "{{count}} egne",
    },
  },
};

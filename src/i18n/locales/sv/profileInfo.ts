/**
 * BudgetArk - Svenska texter: Profil (info)
 * File: src/i18n/locales/sv/profileInfo.ts
 *
 * Swedish counterpart of en/profileInfo.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { profileInfo as en } from "../en/profileInfo";

export const profileInfo: Localized<typeof en> = {
  about: {
    sectionTitle: "OM APPEN",
    versionRow: "v{{version}} - {{title}}",
    tapForReleaseNotes: "Tryck för versionsinformation",
    websiteLabel: "Webbplats",
    websiteA11y: "Öppna BudgetArks webbplats",
    githubLabel: "GitHub",
    releaseNotes: {
      title: "Versionsinformation",
      subtitle: "Bläddra bland aktuella och tidigare versioner.",
      releasedOn: "Släppt {{date}}",
    },
  },
  help: {
    sectionTitle: "HJÄLP",
    onboarding: {
      label: "Introduktion",
      description: "Sökbar guide till allt, eller gör om förstagångsinställningen",
    },
    featureTour: {
      label: "Funktionsrundtur",
      description: "Se nyhetsrundturen om de senaste funktionerna igen",
      a11yLabel: "Spela upp funktionsrundturen igen",
    },
    featureGuide: {
      label: "Funktionsguide",
      description: "Varje funktion per flik - var den finns och hur du använder den",
      a11yLabel: "Öppna funktionsguiden",
    },
  },
  support: {
    feedback: {
      label: "Skicka feedback",
      description: "Felrapporter & funktionsönskemål",
    },
    tipJar: {
      label: "Dricksburk 💛",
      description: "Frivilligt stöd - inget att låsa upp",
    },
  },
  business: {
    sectionTitle: "FÖRETAGSUTGIFTER",
    businesses: {
      label: "Företag 💼",
      description: "Märk utgifter med ett företag eller sidoprojekt",
      a11yLabel: "Hantera företag",
    },
    report: {
      label: "Rapport över företagsutgifter",
      description: "Summor per företag och år, med CSV-export",
      a11yLabel: "Öppna rapporten över företagsutgifter",
    },
  },
  categories: {
    sectionTitle: "KATEGORIER",
    custom: {
      label: "Egna kategorier",
      a11yLabel: "Hantera egna kategorier",
      empty: "Lägg till egna budgetkategorier",
      count_one: "{{count}} egen",
      count_other: "{{count}} egna",
    },
  },
};

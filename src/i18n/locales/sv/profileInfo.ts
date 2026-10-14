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
    featureGuide: {
      label: "Funktionsguide",
      description: "Sökbar guide till varje funktion, rundturen per flik, vad som är nytt och gör om introduktionen",
      a11yLabel: "Öppna funktionsguiden",
    },
  },
  /** Header-less card right under the name card. Briefly folded into HELP; the user wants it at the top - keep it here. */
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
  /** One card for the three "how do I tag entries?" rows: categories, people, businesses. */
  organize: {
    sectionTitle: "ORDNA",
  },
  business: {
    businesses: {
      label: "Företag 💼",
      description: "Märk utgifter med ett företag eller sidoprojekt, plus rapporten inför deklarationen",
      a11yLabel: "Hantera företag",
    },
  },
  categories: {
    custom: {
      label: "Egna kategorier",
      a11yLabel: "Hantera egna kategorier",
      empty: "Lägg till egna budgetkategorier",
      count_one: "{{count}} egen",
      count_other: "{{count}} egna",
    },
  },
};

/**
 * BudgetArk - Deutsche Texte: Profil (info)
 * File: src/i18n/locales/de/profileInfo.ts
 *
 * German counterpart of en/profileInfo.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary.
 */

import type { Localized } from "../types";
import type { profileInfo as en } from "../en/profileInfo";

export const profileInfo: Localized<typeof en> = {
  about: {
    sectionTitle: "ÜBER DIE APP",
    versionRow: "v{{version}} - {{title}}",
    tapForReleaseNotes: "Antippen für Versionshinweise",
    websiteLabel: "Website",
    websiteA11y: "BudgetArk-Website öffnen",
    githubLabel: "GitHub",
    releaseNotes: {
      title: "Versionshinweise",
      subtitle: "Aktuelle und frühere Versionen durchsehen.",
      releasedOn: "Veröffentlicht am {{date}}",
    },
  },
  help: {
    sectionTitle: "HILFE",
    onboarding: {
      label: "Einführung",
      description: "Durchsuchbare Anleitung zu allem, oder die Ersteinrichtung wiederholen",
    },
    featureTour: {
      label: "Funktionstour",
      description: "Die Neuigkeiten-Tour zu aktuellen Funktionen noch einmal ansehen",
      a11yLabel: "Funktionstour erneut abspielen",
    },
  },
  support: {
    feedback: {
      label: "Feedback senden",
      description: "Fehlermeldungen & Funktionswünsche",
    },
    tipJar: {
      label: "Trinkgeldkasse 💛",
      description: "Freiwillige Unterstützung - nichts freizuschalten",
    },
  },
  business: {
    sectionTitle: "GESCHÄFTSAUSGABEN",
    businesses: {
      label: "Unternehmen 💼",
      description: "Ausgaben einer Firma oder einem Nebenjob zuordnen",
      a11yLabel: "Unternehmen verwalten",
    },
    report: {
      label: "Geschäftsausgaben-Bericht",
      description: "Summen je Unternehmen und Jahr, mit CSV-Export",
      a11yLabel: "Geschäftsausgaben-Bericht öffnen",
    },
  },
  categories: {
    sectionTitle: "KATEGORIEN",
    custom: {
      label: "Eigene Kategorien",
      a11yLabel: "Eigene Kategorien verwalten",
      empty: "Lege eigene Budget-Kategorien an",
      count_one: "{{count}} eigene",
      count_other: "{{count}} eigene",
    },
  },
};

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
    featureGuide: {
      label: "Funktionsübersicht",
      description: "Durchsuchbare Anleitung zu jeder Funktion, der Rundgang pro Tab, Neuigkeiten und Einführung wiederholen",
      a11yLabel: "Funktionsübersicht öffnen",
    },
  },
  /** Header-less card right under the name card. Briefly folded into HELP; the user wants it at the top - keep it here. */
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
  /** One card for the three "how do I tag entries?" rows: categories, people, businesses. */
  organize: {
    sectionTitle: "ORDNEN",
  },
  business: {
    businesses: {
      label: "Unternehmen 💼",
      description: "Ausgaben einer Firma oder einem Nebenjob zuordnen, plus der Bericht fürs Finanzamt",
      a11yLabel: "Unternehmen verwalten",
    },
  },
  categories: {
    custom: {
      label: "Eigene Kategorien",
      a11yLabel: "Eigene Kategorien verwalten",
      empty: "Lege eigene Budget-Kategorien an",
      count_one: "{{count}} eigene",
      count_other: "{{count}} eigene",
    },
  },
};

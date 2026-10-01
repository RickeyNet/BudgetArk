/**
 * BudgetArk - Svenska texter: paketerad data (achievements)
 * File: src/i18n/locales/sv/dataAchievements.ts
 *
 * Swedish counterpart of en/dataAchievements.ts. Informal "du" throughout;
 * see src/i18n/GLOSSARY.md for the fixed vocabulary. Badge names are
 * translated for feel, not word for word. Chapter names ("Setting Sail",
 * "Patching the Hull") stay English because the lessons do.
 */

import type { Localized } from "../types";
import type { dataAchievements as en } from "../en/dataAchievements";

export const dataAchievements: Localized<typeof en> = {
  badges: {
    first_steps: {
      title: "Första stegen",
      description: "Loggade din första skuld och kastade loss.",
      hint: "Lägg till en skuld i Skuldkoll.",
    },
    patched_the_hull: {
      title: "Skrovet lagat",
      description: "Registrerade din första skuldbetalning.",
      hint: "Registrera en betalning på valfri skuld.",
    },
    half_mast: {
      title: "Halv stång",
      description: "Betalade av hälften av din ursprungliga skuld (utan bolån).",
      hint: "Betala av 50 % av din startskuld.",
    },
    debt_free_captain: {
      title: "Skuldfri kapten",
      description: "Alla skulder utom bolånet avklarade. Besättningen gör honnör.",
      hint: "Bli av med varje skuld utom bolånet.",
    },
    galley_stocked: {
      title: "Kabyssen fylld",
      description: "Din buffert nådde 1 000 $.",
      hint: "Spara 1 000 $ till oförutsett.",
    },
    sextant_sharp: {
      title: "Sextanten kalibrerad",
      description: "Nådde ditt första sparmål.",
      hint: "Slutför valfritt sparmål.",
    },
    treasure_i: {
      title: "Skattkammare I",
      description: "Nettoförmögenheten passerade 10 000 $.",
      hint: "Få nettoförmögenheten över 10 000 $.",
    },
    treasure_ii: {
      title: "Skattkammare II",
      description: "Nettoförmögenheten passerade 25 000 $.",
      hint: "Få nettoförmögenheten över 25 000 $.",
    },
    treasure_iii: {
      title: "Skattkammare III",
      description: "Nettoförmögenheten passerade 100 000 $.",
      hint: "Få nettoförmögenheten över 100 000 $.",
    },
    galleons_hold: {
      title: "Galjonens lastrum",
      description: "Nettoförmögenheten passerade 1 000 000 $. Ett riktigt skattskepp.",
      hint: "Få nettoförmögenheten över 1 miljon $.",
    },
    ark_builder: {
      title: "Arkbyggare",
      description: "Slutförde ditt första milstolpesteg.",
      hint: "Klara milstolpen Skrov, Däck eller Förråd.",
    },
    first_mate: {
      title: "Förste styrman",
      description: "Ihopkopplad med en partner för synk mellan enheter.",
      hint: "Koppla ihop med din partner under Profil → Synk.",
    },
    doubloon_streak: {
      title: "Dublonsvit",
      description: "12 månader i rad med sparinsättningar.",
      hint: "Lägg till en sparpost varje månad i ett år.",
    },
    cartographer: {
      title: "Kartograf",
      description: "Lade ut en kurs - exporterade din data minst en gång.",
      hint: "Exportera din data under Profil → Data.",
    },
    crows_nest: {
      title: "Utkiken",
      description: "Höll utkik - öppnade Månadsöversikten tre gånger.",
      hint: "Öppna Månadsöversikten från fliken Budget 3 gånger.",
    },
    steady_crew: {
      title: "Stadig besättning",
      description: "Tre månader i rad med varje kategori under budget.",
      hint: "Håll dig under alla kategorigränser 3 månader i rad.",
    },
    lighthouse_keeper: {
      title: "Fyrvaktare",
      description: "Öppnade appen 30 dagar i rad.",
      hint: "Håll en svit på 30 dagar med appen öppnad.",
    },
    all_sails_set: {
      title: "Alla segel satta",
      description: "Höll varje budgetkategori under sin gräns en hel månad.",
      hint: "Håll alla kategorigränser en hel månad.",
    },
    first_voyage: {
      title: "Första resan",
      description: "Slutförde din första lektion på Sjökort.",
      hint: "Klara en lektion i Kaptenskursen.",
    },
    course_plotter: {
      title: "Kursplottare",
      description: "Slutförde kapitel 1: Setting Sail.",
      hint: "Slutför varje lektion i kapitel 1.",
    },
    hull_hand: {
      title: "Skrovgast",
      description: "Slutförde kapitel 2: Patching the Hull.",
      hint: "Slutför varje lektion i kapitel 2.",
    },
    anchored_in_knowledge: {
      title: "Förankrad i kunskap",
      description: "Slutförde varje lektion i varje publicerat kapitel.",
      hint: "Gå igenom hela Kaptenskursen.",
    },
    admiral: {
      title: "Amiral",
      description: "Slutförde varje milstolpe. Arken är byggd.",
      hint: "Slutför varje steg i milstolpeplanen.",
    },
  },
  progress: {
    months: "{{current}} / {{target}} mån",
    days: "{{current}} / {{target}} dagar",
  },
};

/**
 * BudgetArk - Norske tekster: pakket data (achievements)
 * File: src/i18n/locales/nb/dataAchievements.ts
 *
 * Norwegian (Bokmål) counterpart of en/dataAchievements.ts. Informal "du"
 * throughout; see src/i18n/GLOSSARY.md for the fixed vocabulary. Badge names
 * are translated for feel, not word for word. Chapter names ("Setting Sail",
 * "Patching the Hull") stay English because the lessons do.
 */

import type { Localized } from "../types";
import type { dataAchievements as en } from "../en/dataAchievements";

export const dataAchievements: Localized<typeof en> = {
  badges: {
    first_steps: {
      title: "Første skritt",
      description: "Logget din første gjeldspost og satte seil.",
      hint: "Legg til en gjeldspost i Gjeldsoversikt.",
    },
    patched_the_hull: {
      title: "Skroget tettet",
      description: "Registrerte din første gjeldsbetaling.",
      hint: "Registrer en betaling på en hvilken som helst gjeldspost.",
    },
    half_mast: {
      title: "Halv stang",
      description: "Betalte ned halvparten av den opprinnelige gjelden din (uten boliglån).",
      hint: "Betal ned 50 % av startgjelden din.",
    },
    debt_free_captain: {
      title: "Gjeldfri kaptein",
      description: "All gjeld utenom boliglånet er nedbetalt. Mannskapet gjør honnør.",
      hint: "Bli kvitt all gjeld utenom boliglånet.",
    },
    galley_stocked: {
      title: "Byssa fylt",
      description: "Bufferen din nådde 1 000 $.",
      hint: "Spar 1 000 $ til uforutsette utgifter.",
    },
    sextant_sharp: {
      title: "Sekstanten kalibrert",
      description: "Nådde ditt første sparemål.",
      hint: "Fullfør et hvilket som helst sparemål.",
    },
    treasure_i: {
      title: "Skattkammer I",
      description: "Nettoformuen passerte 10 000 $.",
      hint: "Få nettoformuen over 10 000 $.",
    },
    treasure_ii: {
      title: "Skattkammer II",
      description: "Nettoformuen passerte 25 000 $.",
      hint: "Få nettoformuen over 25 000 $.",
    },
    treasure_iii: {
      title: "Skattkammer III",
      description: "Nettoformuen passerte 100 000 $.",
      hint: "Få nettoformuen over 100 000 $.",
    },
    galleons_hold: {
      title: "Galeonens lasterom",
      description: "Nettoformuen passerte 1 000 000 $. Et ekte skatteskip.",
      hint: "Få nettoformuen over 1 million $.",
    },
    ark_builder: {
      title: "Arkbygger",
      description: "Fullførte ditt første milepælssteg.",
      hint: "Fullfør milepælen Skrog, Dekk eller Forsyninger.",
    },
    first_mate: {
      title: "Førstestyrmann",
      description: "Sammenkoblet med en partner for synk mellom enheter.",
      hint: "Koble sammen med partneren din under Profil → Synk.",
    },
    doubloon_streak: {
      title: "Dublonrekke",
      description: "12 måneder på rad med sparing.",
      hint: "Legg til en sparepost hver måned i ett år.",
    },
    cartographer: {
      title: "Kartograf",
      description: "La ut en kurs - eksporterte dataene dine minst én gang.",
      hint: "Eksporter dataene dine under Profil → Data.",
    },
    crows_nest: {
      title: "Utkikkstønna",
      description: "Holdt utkikk - åpnet Månedsoversikten tre ganger.",
      hint: "Åpne Månedsoversikten fra Budsjett-skjermen 3 ganger.",
    },
    steady_crew: {
      title: "Stødig mannskap",
      description: "Tre måneder på rad med hver kategori under budsjett.",
      hint: "Hold deg under alle kategorigrensene 3 måneder på rad.",
    },
    lighthouse_keeper: {
      title: "Fyrvokter",
      description: "Åpnet appen 30 dager på rad.",
      hint: "Hold en rekke på 30 dager med appen åpnet.",
    },
    all_sails_set: {
      title: "Alle seil satt",
      description: "Holdt hver budsjettkategori under grensen sin i en måned.",
      hint: "Hold alle kategorigrensene en hel måned.",
    },
    first_voyage: {
      title: "Første reise",
      description: "Fullførte din første leksjon på Sjøkart.",
      hint: "Fullfør en leksjon i Kapteinskurset.",
    },
    course_plotter: {
      title: "Kursplotter",
      description: "Fullførte kapittel 1: Setting Sail.",
      hint: "Fullfør hver leksjon i kapittel 1.",
    },
    hull_hand: {
      title: "Skrogmatros",
      description: "Fullførte kapittel 2: Patching the Hull.",
      hint: "Fullfør hver leksjon i kapittel 2.",
    },
    anchored_in_knowledge: {
      title: "Forankret i kunnskap",
      description: "Fullførte hver leksjon i hvert utgitte kapittel.",
      hint: "Fullfør hele Kapteinskurset.",
    },
    admiral: {
      title: "Admiral",
      description: "Fullførte hver milepæl. Arken er bygd.",
      hint: "Fullfør hvert steg i milepælsplanen.",
    },
  },
  progress: {
    months: "{{current}} / {{target}} mnd",
    days: "{{current}} / {{target}} dager",
  },
};

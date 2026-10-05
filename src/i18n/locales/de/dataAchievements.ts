/**
 * BudgetArk - Deutsche Texte: gebuendelte Daten (achievements)
 * File: src/i18n/locales/de/dataAchievements.ts
 *
 * German counterpart of en/dataAchievements.ts. Informal "du" throughout;
 * badge names are translated for feel, not word for word. Chapter names
 * ("Setting Sail", "Patching the Hull") stay English because the lessons do.
 */

import type { Localized } from "../types";
import type { dataAchievements as en } from "../en/dataAchievements";

export const dataAchievements: Localized<typeof en> = {
  badges: {
    first_steps: {
      title: "Erste Schritte",
      description: "Erste Schuld erfasst und Leinen los.",
      hint: "Füge im Schulden-Tab eine Schuld hinzu.",
    },
    patched_the_hull: {
      title: "Rumpf geflickt",
      description: "Erste Schuldenzahlung erfasst.",
      hint: "Erfasse eine Zahlung auf eine beliebige Schuld.",
    },
    half_mast: {
      title: "Halbmast",
      description: "Die Hälfte deiner ursprünglichen Schulden (ohne Hypothek) getilgt.",
      hint: "Tilge 50 % deiner Anfangsschulden.",
    },
    debt_free_captain: {
      title: "Schuldenfreier Kapitän",
      description: "Alle Schulden außer der Hypothek getilgt. Die Crew salutiert.",
      hint: "Tilge jede Schuld außer deiner Hypothek.",
    },
    galley_stocked: {
      title: "Kombüse gefüllt",
      description: "Dein Notgroschen hat 1.000 $ erreicht.",
      hint: "Spare 1.000 $ für Notfälle.",
    },
    sextant_sharp: {
      title: "Sextant justiert",
      description: "Erstes Sparziel erreicht.",
      hint: "Schließe ein beliebiges Sparziel ab.",
    },
    treasure_i: {
      title: "Schatzkammer I",
      description: "Nettovermögen über 10.000 $.",
      hint: "Bring dein Nettovermögen über 10.000 $.",
    },
    treasure_ii: {
      title: "Schatzkammer II",
      description: "Nettovermögen über 25.000 $.",
      hint: "Bring dein Nettovermögen über 25.000 $.",
    },
    treasure_iii: {
      title: "Schatzkammer III",
      description: "Nettovermögen über 100.000 $.",
      hint: "Bring dein Nettovermögen über 100.000 $.",
    },
    galleons_hold: {
      title: "Laderaum der Galeone",
      description: "Nettovermögen über 1.000.000 $. Ein echtes Schatzschiff.",
      hint: "Bring dein Nettovermögen über 1 Mio. $.",
    },
    ark_builder: {
      title: "Archenbauer",
      description: "Ersten Meilenstein abgeschlossen.",
      hint: "Schließe den Meilenstein Rumpf, Deck oder Vorräte ab.",
    },
    first_mate: {
      title: "Erster Offizier",
      description: "Mit deinem Partner für den Sync über Geräte gekoppelt.",
      hint: "Koppele dich unter Profil → Sync mit deinem Partner.",
    },
    doubloon_streak: {
      title: "Dublonen-Serie",
      description: "12 Monate in Folge Sparbeiträge.",
      hint: "Buche ein Jahr lang jeden Monat eine Sparbuchung.",
    },
    cartographer: {
      title: "Kartograf",
      description: "Kurs abgesteckt - Daten mindestens einmal exportiert.",
      hint: "Exportiere deine Daten unter Profil → Daten.",
    },
    crows_nest: {
      title: "Krähennest",
      description: "Wache gehalten - den Monatsrückblick dreimal geöffnet.",
      hint: "Öffne den Monatsrückblick im Budget-Tab dreimal.",
    },
    steady_crew: {
      title: "Feste Crew",
      description: "Drei Monate in Folge jede Kategorie unter Budget.",
      hint: "Bleib 3 Monate in Folge unter allen Kategorielimits.",
    },
    lighthouse_keeper: {
      title: "Leuchtturmwärter",
      description: "Die App 30 Tage in Folge geöffnet.",
      hint: "Halte eine 30-Tage-Serie beim Öffnen der App.",
    },
    all_sails_set: {
      title: "Alle Segel gesetzt",
      description: "Einen ganzen Monat jede Budgetkategorie unter ihrem Limit gehalten.",
      hint: "Halte einen vollen Monat alle Kategorielimits ein.",
    },
    first_voyage: {
      title: "Erste Fahrt",
      description: "Erste Lektion im Karten-Tab abgeschlossen.",
      hint: "Schließe eine Lektion im Captain's Course ab.",
    },
    course_plotter: {
      title: "Kursplotter",
      description: "Kapitel 1 „Setting Sail“ abgeschlossen.",
      hint: "Schließe jede Lektion in Kapitel 1 ab.",
    },
    hull_hand: {
      title: "Rumpfmatrose",
      description: "Kapitel 2 „Patching the Hull“ abgeschlossen.",
      hint: "Schließe jede Lektion in Kapitel 2 ab.",
    },
    anchored_in_knowledge: {
      title: "Vor Anker im Wissen",
      description: "Jede Lektion in jedem veröffentlichten Kapitel abgeschlossen.",
      hint: "Beende den gesamten Captain's Course.",
    },
    admiral: {
      title: "Admiral",
      description: "Jeden Meilenstein abgeschlossen. Die Arche steht.",
      hint: "Schließe jeden Schritt im Meilensteinplan ab.",
    },
  },
  progress: {
    months: "{{current}} / {{target}} Mon.",
    days: "{{current}} / {{target}} Tage",
  },
};

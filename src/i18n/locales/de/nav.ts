/**
 * BudgetArk - Deutsche Texte: Navigation
 * File: src/i18n/locales/de/nav.ts
 *
 * Tab labels. "Bridge" is the ship's bridge (the app's Ark metaphor), so it
 * is "Brücke", and the Charts tab keeps its nautical-chart sense as
 * "Karten". Keys stay the English ROUTE names - never translate a key.
 */

import type { Localized } from "../types";
import type { nav as en } from "../en/nav";

export const nav: Localized<typeof en> = {
  tabs: {
    DebtTracker: "Schulden",
    Budget: "Budget",
    Bridge: "Brücke",
    Utilities: "Karten",
    Profile: "Profil",
  },
};

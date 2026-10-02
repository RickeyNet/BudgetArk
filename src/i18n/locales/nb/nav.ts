/**
 * BudgetArk - Norske tekster: navigasjon
 * File: src/i18n/locales/nb/nav.ts
 *
 * Norwegian (Bokmål) counterpart of en/nav.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. "Bridge" is the ship's
 * bridge (the app's Ark metaphor), so it is "Broen", and the Charts tab
 * keeps its nautical-chart sense as "Sjøkart". Keys stay the English ROUTE
 * names - never translate a key.
 */

import type { Localized } from "../types";
import type { nav as en } from "../en/nav";

export const nav: Localized<typeof en> = {
  tabs: {
    DebtTracker: "Gjeld",
    Budget: "Budsjett",
    Bridge: "Broen",
    Utilities: "Sjøkart",
    Profile: "Profil",
  },
};

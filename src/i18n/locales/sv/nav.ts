/**
 * BudgetArk - Svenska texter: navigation
 * File: src/i18n/locales/sv/nav.ts
 *
 * Swedish counterpart of en/nav.ts. Informal "du" throughout; see
 * src/i18n/GLOSSARY.md for the fixed vocabulary. "Bridge" is the ship's
 * bridge (the app's Ark metaphor), so it is "Bryggan", and the Charts tab
 * keeps its nautical-chart sense as "Sjökort". Keys stay the English ROUTE
 * names - never translate a key.
 */

import type { Localized } from "../types";
import type { nav as en } from "../en/nav";

export const nav: Localized<typeof en> = {
  tabs: {
    DebtTracker: "Skulder",
    Budget: "Budget",
    Bridge: "Bryggan",
    Utilities: "Sjökort",
    Profile: "Profil",
  },
};

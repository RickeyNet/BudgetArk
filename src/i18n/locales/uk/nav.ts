/**
 * BudgetArk - Українські тексти: навігація
 * File: src/i18n/locales/uk/nav.ts
 *
 * Ukrainian counterpart of en/nav.ts. Keys are ROUTE NAMES (never
 * translated); only the displayed labels move. "Місток" is the ship's
 * bridge, "Карти" the nautical charts - the app's ark metaphor.
 */

import type { LocalizedPlural } from "../types";
import type { nav as en } from "../en/nav";

export const nav: LocalizedPlural<typeof en> = {
  tabs: {
    DebtTracker: "Борги",
    Budget: "Бюджет",
    Bridge: "Місток",
    Utilities: "Карти",
    Profile: "Профіль",
  },
};

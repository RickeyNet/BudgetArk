/**
 * BudgetArk - Русские тексты: навигация
 * File: src/i18n/locales/ru/nav.ts
 *
 * Russian counterpart of en/nav.ts. Keys are ROUTE NAMES (never translated);
 * only the displayed labels move. "Мостик" is the ship's bridge, "Карты" the
 * nautical charts - the app's ark metaphor.
 */

import type { LocalizedPlural } from "../types";
import type { nav as en } from "../en/nav";

export const nav: LocalizedPlural<typeof en> = {
  tabs: {
    DebtTracker: "Долги",
    Budget: "Бюджет",
    Bridge: "Мостик",
    Utilities: "Карты",
    Profile: "Профиль",
  },
};

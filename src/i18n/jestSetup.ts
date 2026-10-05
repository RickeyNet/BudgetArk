/**
 * BudgetArk - Jest setup: English i18next instance
 * File: src/i18n/jestSetup.ts
 *
 * Wired via `setupFiles` in jest.config.js. Initialises the global i18next
 * instance synchronously with the English tree so pure helpers that call
 * `t` from src/i18n/translate.ts return real English sentences under test.
 * Deliberately imports the locale tree directly, not src/i18n/index.ts:
 * that module pulls in expo-localization, which has no Node build.
 */

import i18next from "i18next";
import { en } from "./locales/en";

// eslint-disable-next-line import/no-named-as-default-member
void i18next.init({
  lng: "en",
  fallbackLng: "en",
  resources: { en: { translation: en } },
  initAsync: false,
  interpolation: { escapeValue: false },
  returnNull: false,
});

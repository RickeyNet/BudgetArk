/**
 * BudgetArk - i18n bootstrap
 * File: src/i18n/index.ts
 *
 * Initializes i18next with the bundled translation trees (English is the
 * source and fallback; see locales/). Import this module ONCE, early in
 * App.tsx, before any screen renders; components then read strings via
 * `useTranslation()` from react-i18next so they re-render on a language
 * change. LanguageProvider owns the persisted setting and calls
 * `changeLanguage`.
 *
 * Why bundled resources and no backend: translations are part of the app
 * (OTA-updatable), nothing is fetched at runtime, and no locale or
 * language choice ever leaves the device - the privacy promise holds
 * without a new egress entry.
 *
 * NOTE: this file imports expo-localization (native). Keep it out of pure
 * helpers and Jest - language resolution logic lives in pickLanguage.ts.
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import { en } from "./locales/en";
import { de } from "./locales/de";
import { ru } from "./locales/ru";
import { uk } from "./locales/uk";
import {
  DEFAULT_LANGUAGE,
  pickSupportedLanguage,
  type SupportedLanguage,
} from "./pickLanguage";

/** Raw device language tags in OS preference order - empty on failure. */
export const getDeviceLanguageTags = (): string[] => {
  try {
    return getLocales().map((locale) => locale.languageTag);
  } catch {
    return [];
  }
};

/** Phone language narrowed to what we ship. */
export const getDeviceLanguage = (): SupportedLanguage =>
  pickSupportedLanguage(getDeviceLanguageTags());

// i18next's plural resolver needs Intl.PluralRules. Without it, i18next
// falls back to a one/other rule, which is wrong for Russian and Ukrainian
// (one / few / many) and shows "1 entries" in English. Hermes' Intl does
// not ship PluralRules on every version, so polyfill it when missing (the
// polyfill is full CLDR, pure JS, and a no-op where the API exists).
if (typeof Intl === "undefined" || typeof Intl.PluralRules === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("intl-pluralrules");
  if (__DEV__) console.warn("[i18n] Intl.PluralRules polyfilled (missing on this runtime).");
}

// eslint-disable-next-line import/no-named-as-default-member -- i18next's documented API is `i18n.use(plugin).init(...)` on the default instance; react-i18next binds to that same instance.
void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    de: { translation: de },
    ru: { translation: ru },
    uk: { translation: uk },
  },
  // Start in the phone's language so the first paint is already right for
  // an "Automatic" user; LanguageProvider switches if a fixed choice is stored.
  lng: getDeviceLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  // Resources are inline, so init synchronously - `t()` is usable the
  // moment this module evaluates (no flash of raw keys).
  initAsync: false,
  interpolation: {
    // React Native renders strings as text, never as HTML.
    escapeValue: false,
  },
  returnNull: false,
  saveMissing: false,
  // A key missing from EVERY language (typecheck should make this
  // impossible) is logged in dev so it never slips into a review unnoticed.
  missingKeyHandler: __DEV__
    ? (_lngs, _ns, key) => console.warn(`[i18n] missing key: ${key}`)
    : undefined,
});

export default i18n;

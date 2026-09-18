/**
 * BudgetArk - Language Resolution (pure)
 * File: src/i18n/pickLanguage.ts
 *
 * The supported-language list and the pure logic that turns "what the user
 * chose" + "what the phone speaks" into the language the app renders in.
 * Kept free of expo-localization / i18next imports so it is unit-testable
 * on Node and so storage/util code can reference the language ids without
 * dragging the native module into Jest.
 *
 * Fail-closed on unknown input: an unrecognized stored setting or device
 * tag resolves to English rather than throwing or rendering raw keys.
 */

export const SUPPORTED_LANGUAGES = ["en", "de"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: SupportedLanguage = "en";

/** The persisted Profile setting: follow the phone, or a fixed language. */
export type AppLanguageId = "auto" | SupportedLanguage;
export const DEFAULT_APP_LANGUAGE_ID: AppLanguageId = "auto";

/** Each language's name in ITSELF - language pickers never translate these. */
export const LANGUAGE_NATIVE_NAMES: Readonly<Record<SupportedLanguage, string>> = {
  en: "English",
  de: "Deutsch",
};

export const isSupportedLanguage = (value: unknown): value is SupportedLanguage =>
  typeof value === "string" &&
  (SUPPORTED_LANGUAGES as readonly string[]).includes(value);

export const isAppLanguageId = (value: unknown): value is AppLanguageId =>
  value === "auto" || isSupportedLanguage(value);

/**
 * First device language (in the phone's preference order) that the app
 * ships, matched on the primary language subtag only - `de-AT`, `de_CH`
 * and `de` all resolve to German. Anything unmatched falls back to English.
 */
export const pickSupportedLanguage = (
  languageTags: readonly (string | null | undefined)[],
): SupportedLanguage => {
  for (const tag of languageTags) {
    if (typeof tag !== "string") continue;
    const primary = tag.trim().toLowerCase().split(/[-_]/)[0];
    if (isSupportedLanguage(primary)) return primary;
  }
  return DEFAULT_LANGUAGE;
};

/** Stored setting + device tags -> the language i18next should render. */
export const resolveAppLanguage = (
  setting: AppLanguageId,
  deviceLanguageTags: readonly (string | null | undefined)[],
): SupportedLanguage =>
  setting === "auto" ? pickSupportedLanguage(deviceLanguageTags) : setting;

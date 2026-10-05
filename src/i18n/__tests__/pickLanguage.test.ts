/**
 * BudgetArk - Language resolution tests
 * File: src/i18n/__tests__/pickLanguage.test.ts
 *
 * Pure logic only (no expo-localization / i18next). Pins the fail-closed
 * behaviour: anything unrecognized resolves to English, never throws.
 */

import {
  DEFAULT_LANGUAGE,
  isAppLanguageId,
  isSupportedLanguage,
  pickSupportedLanguage,
  resolveAppLanguage,
} from "../pickLanguage";

describe("pickSupportedLanguage", () => {
  it("matches on the primary subtag regardless of region or separator", () => {
    expect(pickSupportedLanguage(["de-DE"])).toBe("de");
    expect(pickSupportedLanguage(["de-AT"])).toBe("de");
    expect(pickSupportedLanguage(["de_CH"])).toBe("de");
    expect(pickSupportedLanguage(["DE"])).toBe("de");
    expect(pickSupportedLanguage([" de "])).toBe("de");
    expect(pickSupportedLanguage(["ru-RU"])).toBe("ru");
    expect(pickSupportedLanguage(["uk-UA"])).toBe("uk");
    expect(pickSupportedLanguage(["uk"])).toBe("uk");
    expect(pickSupportedLanguage(["sv-SE"])).toBe("sv");
    expect(pickSupportedLanguage(["sv-FI"])).toBe("sv");
    expect(pickSupportedLanguage(["nb-NO"])).toBe("nb");
    expect(pickSupportedLanguage(["en-GB"])).toBe("en");
  });

  it("honours the phone's preference order, skipping unsupported languages", () => {
    expect(pickSupportedLanguage(["fr-FR", "de-DE", "en-US"])).toBe("de");
    expect(pickSupportedLanguage(["uk-UA", "ru-RU", "en-US"])).toBe("uk");
    expect(pickSupportedLanguage(["ja-JP", "ru-RU", "en-US"])).toBe("ru");
    expect(pickSupportedLanguage(["fi-FI", "sv-SE", "en-US"])).toBe("sv");
    expect(pickSupportedLanguage(["da-DK", "nb-NO", "en-US"])).toBe("nb");
  });

  it("serves Bokmål to Nynorsk and legacy \"no\" phones", () => {
    expect(pickSupportedLanguage(["nn-NO"])).toBe("nb");
    expect(pickSupportedLanguage(["no"])).toBe("nb");
    expect(pickSupportedLanguage(["no-NO", "en-US"])).toBe("nb");
    // A shipped language earlier in the list still wins over an alias.
    expect(pickSupportedLanguage(["sv-SE", "nn-NO"])).toBe("sv");
  });

  it("falls back to English when nothing matches or the list is empty", () => {
    expect(pickSupportedLanguage([])).toBe(DEFAULT_LANGUAGE);
    expect(pickSupportedLanguage(["ja-JP", "fi-FI"])).toBe(DEFAULT_LANGUAGE);
    expect(pickSupportedLanguage([null, undefined, ""])).toBe(DEFAULT_LANGUAGE);
  });
});

describe("resolveAppLanguage", () => {
  it("uses the device language only for the auto setting", () => {
    expect(resolveAppLanguage("auto", ["de-DE"])).toBe("de");
    expect(resolveAppLanguage("auto", ["ja-JP"])).toBe("en");
    expect(resolveAppLanguage("en", ["de-DE"])).toBe("en");
    expect(resolveAppLanguage("de", ["en-US"])).toBe("de");
  });
});

describe("type guards", () => {
  it("accept exactly the shipped languages plus auto for the setting", () => {
    expect(isSupportedLanguage("en")).toBe(true);
    expect(isSupportedLanguage("de")).toBe(true);
    expect(isSupportedLanguage("auto")).toBe(false);
    expect(isSupportedLanguage("ru")).toBe(true);
    expect(isSupportedLanguage("uk")).toBe(true);
    expect(isSupportedLanguage("sv")).toBe(true);
    expect(isSupportedLanguage("nb")).toBe(true);
    // Aliases resolve on the device tag only - "nn"/"no" are not stored ids.
    expect(isSupportedLanguage("nn")).toBe(false);
    expect(isSupportedLanguage("no")).toBe(false);
    expect(isSupportedLanguage("pl")).toBe(false);
    expect(isSupportedLanguage(null)).toBe(false);
    expect(isAppLanguageId("auto")).toBe(true);
    expect(isAppLanguageId("de")).toBe(true);
    expect(isAppLanguageId("de-DE")).toBe(false);
    expect(isAppLanguageId(42)).toBe(false);
  });
});

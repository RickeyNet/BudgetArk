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
    expect(pickSupportedLanguage(["en-GB"])).toBe("en");
  });

  it("honours the phone's preference order, skipping unsupported languages", () => {
    expect(pickSupportedLanguage(["fr-FR", "de-DE", "en-US"])).toBe("de");
    expect(pickSupportedLanguage(["uk-UA", "ru-RU", "en-US"])).toBe("uk");
    expect(pickSupportedLanguage(["ja-JP", "ru-RU", "en-US"])).toBe("ru");
  });

  it("falls back to English when nothing matches or the list is empty", () => {
    expect(pickSupportedLanguage([])).toBe(DEFAULT_LANGUAGE);
    expect(pickSupportedLanguage(["ja-JP", "sv-SE"])).toBe(DEFAULT_LANGUAGE);
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
    expect(isSupportedLanguage("pl")).toBe(false);
    expect(isSupportedLanguage(null)).toBe(false);
    expect(isAppLanguageId("auto")).toBe(true);
    expect(isAppLanguageId("de")).toBe(true);
    expect(isAppLanguageId("de-DE")).toBe(false);
    expect(isAppLanguageId(42)).toBe(false);
  });
});

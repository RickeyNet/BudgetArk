import {
  isCurrencyPreferenceId,
  getCurrencyPreferenceOption,
} from "../currencyPreferences";
import { DEFAULT_CURRENCY_PREFERENCE_ID } from "../../types";

describe("isCurrencyPreferenceId", () => {
  it("accepts known preference ids", () => {
    expect(isCurrencyPreferenceId("usd_us")).toBe(true);
    expect(isCurrencyPreferenceId("eur_de")).toBe(true);
    expect(isCurrencyPreferenceId("jpy_jp")).toBe(true);
  });

  it("rejects unknown strings and non-strings", () => {
    expect(isCurrencyPreferenceId("xxx")).toBe(false);
    expect(isCurrencyPreferenceId("")).toBe(false);
    expect(isCurrencyPreferenceId(undefined)).toBe(false);
    expect(isCurrencyPreferenceId(null)).toBe(false);
    expect(isCurrencyPreferenceId(123)).toBe(false);
    // not a real id even though it collides with an Object.prototype key
    expect(isCurrencyPreferenceId("toString")).toBe(false);
  });
});

describe("getCurrencyPreferenceOption", () => {
  it("returns the matching option for a valid id", () => {
    const opt = getCurrencyPreferenceOption("eur_de");
    expect(opt).toMatchObject({
      id: "eur_de",
      locale: "de-DE",
      currencyCode: "EUR",
    });
  });

  it("falls back to the default option for an unknown id", () => {
    const opt = getCurrencyPreferenceOption("nope");
    expect(opt.id).toBe(DEFAULT_CURRENCY_PREFERENCE_ID);
    expect(opt.currencyCode).toBe("USD");
  });

  it("falls back to the default option when no id is given", () => {
    expect(getCurrencyPreferenceOption().id).toBe(DEFAULT_CURRENCY_PREFERENCE_ID);
    expect(getCurrencyPreferenceOption(undefined).id).toBe(
      DEFAULT_CURRENCY_PREFERENCE_ID
    );
  });
});

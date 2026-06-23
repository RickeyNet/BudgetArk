import {
  USD_EXCHANGE_RATES,
  convertFromUsd,
  roundLocalTarget,
  localizeUsdTarget,
  convertAmount,
} from "../currencyConversion";

describe("convertFromUsd", () => {
  it("applies the static rate", () => {
    expect(convertFromUsd(100, "EUR")).toBeCloseTo(92, 5);
    expect(convertFromUsd(100, "USD")).toBe(100);
  });

  it("falls back to 1:1 for unknown currencies (never NaN)", () => {
    expect(convertFromUsd(100, "ZZZ")).toBe(100);
  });
});

describe("roundLocalTarget", () => {
  it("rounds to the nearest 100", () => {
    expect(roundLocalTarget(10594.32)).toBe(10600);
    expect(roundLocalTarget(149)).toBe(100);
    expect(roundLocalTarget(150)).toBe(200);
  });

  it("returns 0 for non-positive or non-finite input", () => {
    expect(roundLocalTarget(0)).toBe(0);
    expect(roundLocalTarget(-5)).toBe(0);
    expect(roundLocalTarget(NaN)).toBe(0);
  });
});

describe("localizeUsdTarget", () => {
  it("leaves round USD targets unchanged", () => {
    expect(localizeUsdTarget(1000, "USD")).toBe(1000);
  });

  it("converts and rounds into another currency", () => {
    // 1000 USD * 9.58 = 9580 -> nearest 100 = 9600
    expect(localizeUsdTarget(1000, "SEK")).toBe(9600);
  });
});

describe("convertAmount", () => {
  it("returns the value unchanged when the codes match", () => {
    expect(convertAmount(123.45, "EUR", "EUR")).toBe(123.45);
  });

  it("returns 0 for a zero or non-finite value", () => {
    expect(convertAmount(0, "USD", "EUR")).toBe(0);
    expect(convertAmount(NaN, "USD", "EUR")).toBe(0);
  });

  it("round-trips through USD with cents precision", () => {
    expect(convertAmount(92, "EUR", "USD")).toBeCloseTo(100, 2);
    expect(convertAmount(100, "USD", "EUR")).toBeCloseTo(92, 2);
  });

  it("rounds the result to 2 decimals", () => {
    const result = convertAmount(100, "USD", "JPY");
    expect(result).toBe(15200); // 100 * 152
  });

  it("uses a provided live-rate snapshot over the static table", () => {
    const live = { USD: 1, EUR: 0.5 };
    expect(convertAmount(100, "USD", "EUR", live)).toBe(50);
  });

  it("falls back to rate 1 for unknown codes", () => {
    expect(convertAmount(100, "USD", "ZZZ")).toBe(100);
  });
});

describe("USD_EXCHANGE_RATES", () => {
  it("anchors USD at 1", () => {
    expect(USD_EXCHANGE_RATES.USD).toBe(1);
  });
});

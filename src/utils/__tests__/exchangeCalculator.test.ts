import {
  crossRate,
  describeRatesSnapshot,
  EXCHANGE_CURRENCIES,
  formatAmountInCurrency,
  formatCrossRate,
  MAX_EXCHANGE_AMOUNT,
  parseAmountInput,
} from "../exchangeCalculator";
import { USD_EXCHANGE_RATES } from "../currencyConversion";

describe("EXCHANGE_CURRENCIES", () => {
  it("offers every currency the static fallback table can convert", () => {
    const codes = EXCHANGE_CURRENCIES.map((c) => c.code);
    expect(codes).toEqual(expect.arrayContaining(Object.keys(USD_EXCHANGE_RATES)));
  });

  it("has no duplicate codes", () => {
    const codes = EXCHANGE_CURRENCIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe("parseAmountInput", () => {
  it("parses plain integers and decimals", () => {
    expect(parseAmountInput("100")).toBe(100);
    expect(parseAmountInput("0.5")).toBe(0.5);
    expect(parseAmountInput(" 42.75 ")).toBe(42.75);
  });

  it("accepts comma thousands separators", () => {
    expect(parseAmountInput("1,234.56")).toBe(1234.56);
    expect(parseAmountInput("1,000,000")).toBe(1_000_000);
  });

  it("treats a single comma with no dot as a decimal separator", () => {
    expect(parseAmountInput("1234,56")).toBe(1234.56);
  });

  it("returns null for empty or unusable text", () => {
    expect(parseAmountInput("")).toBeNull();
    expect(parseAmountInput("   ")).toBeNull();
    expect(parseAmountInput("abc")).toBeNull();
    expect(parseAmountInput("12abc")).toBeNull();
    expect(parseAmountInput("-5")).toBeNull();
    expect(parseAmountInput("1.2.3")).toBeNull();
    expect(parseAmountInput(".")).toBeNull();
  });

  it("parses a bare leading/trailing decimal point", () => {
    expect(parseAmountInput(".5")).toBe(0.5);
    expect(parseAmountInput("5.")).toBe(5);
  });

  it("clamps absurd amounts to the shared money cap", () => {
    expect(parseAmountInput("99999999999999")).toBe(MAX_EXCHANGE_AMOUNT);
  });
});

describe("crossRate", () => {
  const rates = { USD: 1, EUR: 0.92, JPY: 152 };

  it("computes units of target per one source unit via USD", () => {
    expect(crossRate("USD", "EUR", rates)).toBeCloseTo(0.92);
    expect(crossRate("EUR", "USD", rates)).toBeCloseTo(1 / 0.92);
    expect(crossRate("EUR", "JPY", rates)).toBeCloseTo(152 / 0.92);
  });

  it("is 1 for a same-currency pair", () => {
    expect(crossRate("EUR", "EUR", rates)).toBe(1);
  });

  it("falls back to rate 1 for unknown codes instead of NaN", () => {
    expect(crossRate("XXX", "EUR", rates)).toBeCloseTo(0.92);
    expect(crossRate("USD", "XXX", rates)).toBe(1);
  });

  it("guards against a corrupt non-positive source rate", () => {
    expect(crossRate("EUR", "USD", { USD: 1, EUR: 0 })).toBe(1);
  });
});

describe("formatCrossRate", () => {
  it("uses 2 decimals for large rates", () => {
    expect(formatCrossRate(152.174)).toBe("152.17");
  });

  it("uses up to 3 decimals for mid rates, trimming trailing zeros", () => {
    expect(formatCrossRate(1.5)).toBe("1.50");
    expect(formatCrossRate(1.234)).toBe("1.234");
  });

  it("uses up to 4 decimals for sub-1 rates", () => {
    expect(formatCrossRate(0.0066)).toBe("0.0066");
    expect(formatCrossRate(0.92)).toBe("0.92");
  });

  it("renders -- for unusable rates", () => {
    expect(formatCrossRate(0)).toBe("--");
    expect(formatCrossRate(NaN)).toBe("--");
    expect(formatCrossRate(Infinity)).toBe("--");
  });
});

describe("formatAmountInCurrency", () => {
  it("formats with the currency's own symbol and digits", () => {
    expect(formatAmountInCurrency(1234.5, { code: "USD", locale: "en-US" })).toBe(
      "$1,234.50"
    );
    // JPY has no minor unit - Intl drops the decimals.
    expect(
      formatAmountInCurrency(15200, { code: "JPY", locale: "ja-JP" })
    ).toContain("15,200");
  });

  it("degrades to a code-suffixed number on a bad locale/currency pair", () => {
    expect(
      formatAmountInCurrency(10, { code: "NOT_A_CODE", locale: "en-US" })
    ).toBe("10 NOT_A_CODE");
  });
});

describe("describeRatesSnapshot", () => {
  const now = Date.parse("2026-07-20T12:00:00Z");
  const at = (msAgo: number) => new Date(now - msAgo).toISOString();

  it("labels static rates as the built-in fallback, not an age", () => {
    expect(
      describeRatesSnapshot({ source: "static", fetchedAt: at(0) }, now)
    ).toMatch(/built-in/i);
  });

  it("scales the age unit from minutes to hours to days", () => {
    expect(
      describeRatesSnapshot({ source: "live", fetchedAt: at(30_000) }, now)
    ).toBe("Rates updated just now");
    expect(
      describeRatesSnapshot({ source: "live", fetchedAt: at(5 * 60_000) }, now)
    ).toBe("Rates updated 5 minutes ago");
    expect(
      describeRatesSnapshot({ source: "cache", fetchedAt: at(3 * 3_600_000) }, now)
    ).toBe("Rates updated 3 hours ago");
    expect(
      describeRatesSnapshot({ source: "cache", fetchedAt: at(49 * 3_600_000) }, now)
    ).toBe("Rates updated 2 days ago");
  });

  it("uses singular units", () => {
    expect(
      describeRatesSnapshot({ source: "live", fetchedAt: at(90_000) }, now)
    ).toBe("Rates updated 1 minute ago");
  });

  it("treats an unparseable timestamp as just-now rather than garbage", () => {
    expect(
      describeRatesSnapshot({ source: "cache", fetchedAt: "not-a-date" }, now)
    ).toBe("Rates updated just now");
  });
});

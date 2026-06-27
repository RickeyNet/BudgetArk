import {
  QUOTE_REFRESH_INTERVAL_MS,
  collectSymbols,
  holdingGainLoss,
  holdingMarketValue,
  holdingsTotalValue,
  isQuoteRefreshDue,
  isValidSymbol,
  normalizeSymbol,
} from "../holdingsMath";

// ts-jest runs transpile-only, so light `as any` fixtures keep these concise
// without dragging in the full Holding shape.
const holding = (over: Record<string, unknown>): any => ({
  id: "h",
  symbol: "AAPL",
  shares: 1,
  createdAt: "2026-06-01",
  updatedAt: "2026-06-01",
  ...over,
});

const quote = (price: number) => ({ price, asOf: "2026-06-27T00:00:00.000Z" });

describe("isValidSymbol / normalizeSymbol", () => {
  it("accepts well-formed tickers, case-insensitively", () => {
    expect(isValidSymbol("aapl")).toBe(true);
    expect(isValidSymbol("VTI")).toBe(true);
    expect(isValidSymbol("BRK.B")).toBe(true);
    expect(isValidSymbol(" msft ")).toBe(true);
  });

  it("rejects empty, overlong, or illegal tickers", () => {
    expect(isValidSymbol("")).toBe(false);
    expect(isValidSymbol("TOOLONGSYMBOL1")).toBe(false);
    expect(isValidSymbol("A B")).toBe(false);
    expect(isValidSymbol("$$$")).toBe(false);
  });

  it("normalizes to trimmed uppercase", () => {
    expect(normalizeSymbol("  aapl ")).toBe("AAPL");
  });
});

describe("isQuoteRefreshDue", () => {
  const now = Date.parse("2026-06-27T12:00:00.000Z");

  it("is due when never fetched", () => {
    expect(isQuoteRefreshDue(null, now)).toBe(true);
    expect(isQuoteRefreshDue(undefined, now)).toBe(true);
  });

  it("is due when the stored timestamp is unparseable", () => {
    expect(isQuoteRefreshDue("not-a-date", now)).toBe(true);
  });

  it("is NOT due within the interval", () => {
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    expect(isQuoteRefreshDue(oneDayAgo, now)).toBe(false);
  });

  it("is due once a full interval has elapsed", () => {
    const exactlyAWeekAgo = new Date(now - QUOTE_REFRESH_INTERVAL_MS).toISOString();
    expect(isQuoteRefreshDue(exactlyAWeekAgo, now)).toBe(true);
  });

  it("is NOT due one millisecond before the interval", () => {
    const justUnder = new Date(now - QUOTE_REFRESH_INTERVAL_MS + 1).toISOString();
    expect(isQuoteRefreshDue(justUnder, now)).toBe(false);
  });
});

describe("collectSymbols", () => {
  it("returns distinct, normalized, valid symbols in first-seen order", () => {
    const result = collectSymbols([
      holding({ symbol: "aapl" }),
      holding({ symbol: "VTI" }),
      holding({ symbol: " AAPL " }), // dupe after normalization
      holding({ symbol: "bad symbol" }), // invalid, dropped
    ]);
    expect(result).toEqual(["AAPL", "VTI"]);
  });

  it("returns an empty array for no holdings", () => {
    expect(collectSymbols([])).toEqual([]);
  });
});

describe("holdingMarketValue", () => {
  it("multiplies shares by the cached price", () => {
    expect(holdingMarketValue(holding({ shares: 3 }), { AAPL: quote(200) })).toBe(600);
  });

  it("matches the quote regardless of symbol casing", () => {
    expect(holdingMarketValue(holding({ symbol: "aapl", shares: 2 }), { AAPL: quote(50) })).toBe(100);
  });

  it("returns 0 when there is no cached quote", () => {
    expect(holdingMarketValue(holding({ shares: 10 }), {})).toBe(0);
  });

  it("returns 0 for a non-finite price or shares", () => {
    expect(holdingMarketValue(holding({ shares: 10 }), { AAPL: quote(NaN) })).toBe(0);
    expect(holdingMarketValue(holding({ shares: NaN }), { AAPL: quote(5) })).toBe(0);
  });
});

describe("holdingsTotalValue", () => {
  it("sums only the priced positions", () => {
    const holdings = [
      holding({ symbol: "AAPL", shares: 2 }),
      holding({ symbol: "VTI", shares: 1 }),
      holding({ symbol: "TSLA", shares: 5 }), // unpriced -> contributes 0
    ];
    const quotes = { AAPL: quote(100), VTI: quote(300) };
    expect(holdingsTotalValue(holdings, quotes)).toBe(500);
  });

  it("is 0 for no holdings", () => {
    expect(holdingsTotalValue([], { AAPL: quote(100) })).toBe(0);
  });
});

describe("holdingGainLoss", () => {
  it("returns market value minus total cost basis", () => {
    expect(holdingGainLoss(holding({ shares: 10, costBasis: 800 }), { AAPL: quote(100) })).toBe(200);
  });

  it("returns null without a cost basis", () => {
    expect(holdingGainLoss(holding({ shares: 10 }), { AAPL: quote(100) })).toBeNull();
  });

  it("returns null when unpriced", () => {
    expect(holdingGainLoss(holding({ shares: 10, costBasis: 800 }), {})).toBeNull();
  });
});

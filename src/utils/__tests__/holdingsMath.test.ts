import {
  QUOTE_REFRESH_INTERVAL_MS,
  accountHoldingsValue,
  collectSymbols,
  holdingGainLoss,
  holdingKind,
  holdingMarketValue,
  holdingsTotalValue,
  isQuoteRefreshDue,
  isValidSymbol,
  normalizeSymbol,
  quoteCurrency,
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
  it("accepts well-formed tickers and crypto pairs, case-insensitively", () => {
    expect(isValidSymbol("aapl")).toBe(true);
    expect(isValidSymbol("VTI")).toBe(true);
    expect(isValidSymbol("BRK.B")).toBe(true);
    expect(isValidSymbol(" msft ")).toBe(true);
    // Crypto pairs use a slash (priced by the same provider).
    expect(isValidSymbol("BTC/USD")).toBe(true);
    expect(isValidSymbol("eth/usd")).toBe(true);
  });

  it("rejects empty, overlong, or illegal tickers", () => {
    expect(isValidSymbol("")).toBe(false);
    expect(isValidSymbol("WAYTOOLONGSYMBOL1")).toBe(false); // 17 chars, cap is 15
    expect(isValidSymbol("A B")).toBe(false);
    expect(isValidSymbol("$$$")).toBe(false);
    expect(isValidSymbol("BTC\\USD")).toBe(false); // backslash, not a valid pair
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

describe("quoteCurrency", () => {
  it("reads the quote side of a crypto pair", () => {
    expect(quoteCurrency("BTC/USD")).toBe("USD");
    expect(quoteCurrency("ETH/EUR")).toBe("EUR");
    expect(quoteCurrency("btc/usd")).toBe("USD"); // normalized first
  });

  it("assumes USD for a plain ticker (and degrades on a trailing slash)", () => {
    expect(quoteCurrency("AAPL")).toBe("USD");
    expect(quoteCurrency("BRK.B")).toBe("USD");
    expect(quoteCurrency("BTC/")).toBe("USD");
  });
});

describe("display-currency conversion", () => {
  // 1 USD = 10 SEK in this toy table (units-per-USD).
  const rates = { USD: 1, SEK: 10, EUR: 0.5 };

  it("leaves values untouched without a display currency (raw quote currency)", () => {
    expect(
      holdingMarketValue(holding({ symbol: "BTC/USD", shares: 0.5 }), { "BTC/USD": quote(60000) })
    ).toBe(30000);
  });

  it("is a 1:1 no-op when the display currency matches the quote currency", () => {
    expect(
      holdingMarketValue(holding({ symbol: "AAPL", shares: 2 }), { AAPL: quote(100) }, {
        displayCurrency: "USD",
        rates,
      })
    ).toBe(200);
  });

  it("converts a USD-quoted holding into the display currency", () => {
    // 0.5 BTC * $60,000 = $30,000 USD -> 300,000 SEK at 10 SEK/USD.
    expect(
      holdingMarketValue(holding({ symbol: "BTC/USD", shares: 0.5 }), { "BTC/USD": quote(60000) }, {
        displayCurrency: "SEK",
        rates,
      })
    ).toBe(300000);
  });

  it("converts via USD when the pair is quoted in a third currency", () => {
    // 2 ETH * 100 EUR = 200 EUR; 1 USD = 0.5 EUR so 200 EUR = 400 USD.
    expect(
      holdingMarketValue(holding({ symbol: "ETH/EUR", shares: 2 }), { "ETH/EUR": quote(100) }, {
        displayCurrency: "USD",
        rates,
      })
    ).toBe(400);
  });

  it("totals and per-account subtotals also convert", () => {
    const holdings = [
      holding({ symbol: "AAPL", shares: 1, accountId: "b1" }), // $100
      holding({ symbol: "BTC/USD", shares: 0.5, accountId: "b1" }), // $30,000
    ];
    const quotes = { AAPL: quote(100), "BTC/USD": quote(60000) };
    const opts = { displayCurrency: "SEK", rates };
    expect(holdingsTotalValue(holdings, quotes, opts)).toBe(301000); // 30,100 USD * 10
    expect(accountHoldingsValue("b1", holdings, quotes, opts)).toBe(301000);
  });

  it("converts the holding's market value before subtracting cost basis", () => {
    // Market $200 -> 2,000 SEK; cost basis is recorded in display currency (SEK).
    expect(
      holdingGainLoss(holding({ symbol: "AAPL", shares: 2, costBasis: 1500 }), { AAPL: quote(100) }, {
        displayCurrency: "SEK",
        rates,
      })
    ).toBe(500); // 2000 - 1500
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

  it("computes gain/loss for a manual holding without any quote", () => {
    // manualValue 5000, cost basis 4000 -> +1000, no quote needed.
    expect(
      holdingGainLoss(holding({ symbol: "", manualValue: 5000, costBasis: 4000 }), {})
    ).toBe(1000);
  });

  it("computes gain/loss for a proxy holding from its anchored value", () => {
    // anchor $1000 @ 100; proxy now 120 -> value 1200; cost 900 -> +300.
    expect(
      holdingGainLoss(
        holding({ symbol: "VOO", anchorValue: 1000, anchorPrice: 100, costBasis: 900 }),
        { VOO: quote(120) }
      )
    ).toBe(300);
  });
});

describe("holdingKind", () => {
  it("classifies a plain ticker", () => {
    expect(holdingKind(holding({ symbol: "AAPL", shares: 3 }))).toBe("ticker");
  });

  it("classifies a manual-value fund", () => {
    expect(holdingKind(holding({ symbol: "", manualValue: 1000 }))).toBe("manual");
  });

  it("classifies a proxy-tracked fund (anchorValue wins over a present symbol)", () => {
    expect(
      holdingKind(holding({ symbol: "VOO", anchorValue: 1000, anchorPrice: 100 }))
    ).toBe("proxy");
  });
});

describe("collectSymbols with manual/proxy holdings", () => {
  it("skips manual holdings but includes proxy tickers", () => {
    const result = collectSymbols([
      holding({ symbol: "AAPL", shares: 1 }), // ticker -> included
      holding({ symbol: "", manualValue: 5000 }), // manual -> skipped (no ticker)
      holding({ symbol: "VOO", anchorValue: 1000, anchorPrice: 100 }), // proxy -> included
    ]);
    expect(result).toEqual(["AAPL", "VOO"]);
  });
});

describe("manual-value holdings", () => {
  it("returns the manual value as-is, with no quote", () => {
    expect(holdingMarketValue(holding({ symbol: "", manualValue: 42580 }), {})).toBe(42580);
  });

  it("ignores any display-currency conversion (already in display currency)", () => {
    expect(
      holdingMarketValue(holding({ symbol: "", manualValue: 1000 }), {}, {
        displayCurrency: "SEK",
        rates: { USD: 1, SEK: 10 },
      })
    ).toBe(1000);
  });

  it("returns 0 for a non-finite manual value", () => {
    expect(holdingMarketValue(holding({ symbol: "", manualValue: NaN }), {})).toBe(0);
  });
});

describe("proxy-tracked holdings", () => {
  const proxy = holding({ symbol: "VOO", anchorValue: 1000, anchorPrice: 100 });

  it("scales the anchored value by the proxy's move since the anchor", () => {
    // proxy up 20% (100 -> 120) -> 1000 * 1.2 = 1200.
    expect(holdingMarketValue(proxy, { VOO: quote(120) })).toBe(1200);
  });

  it("holds flat at the anchor value when the proxy has no fresh price", () => {
    expect(holdingMarketValue(proxy, {})).toBe(1000);
  });

  it("holds flat at the anchor value before an anchor price is stamped", () => {
    expect(
      holdingMarketValue(holding({ symbol: "VOO", anchorValue: 1000 }), { VOO: quote(120) })
    ).toBe(1000);
  });

  it("does not convert currency (the price ratio is dimensionless)", () => {
    expect(
      holdingMarketValue(proxy, { VOO: quote(110) }, {
        displayCurrency: "SEK",
        rates: { USD: 1, SEK: 10 },
      })
    ).toBe(1100);
  });

  it("is included in portfolio totals alongside tickers and manual funds", () => {
    const holdings = [
      holding({ id: "a", symbol: "AAPL", shares: 2 }), // $200
      holding({ id: "b", symbol: "", manualValue: 5000 }), // $5000
      holding({ id: "c", symbol: "VOO", anchorValue: 1000, anchorPrice: 100 }), // -> $1100
    ];
    const quotes = { AAPL: quote(100), VOO: quote(110) };
    expect(holdingsTotalValue(holdings, quotes)).toBe(6300);
  });
});

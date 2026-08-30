/**
 * Pure-logic tests for the quotes proxy. These guard the money-adjacent
 * decisions: what counts as a valid symbol, how the warmer registry stays
 * bounded, how upstream batches are sliced against the daily budget, and -
 * most importantly - how Twelve Data's HTTP-200 error bodies are classified
 * (the bug class that once poisoned the 24h miss cache for whole batches).
 */
import { describe, expect, it } from "vitest";
import {
  mapTwelveDataResponse,
  parseSymbols,
  pruneRegistry,
  sliceUpstreamBatch,
} from "./index";

describe("parseSymbols", () => {
  it("uppercases, trims, dedupes, and keeps exchange punctuation", () => {
    expect(parseSymbols("aapl, vti ,AAPL,brk.b,btc/usd,bf-b")).toEqual([
      "AAPL",
      "VTI",
      "BRK.B",
      "BTC/USD",
      "BF-B",
    ]);
  });

  it("rejects junk and over-long symbols", () => {
    expect(parseSymbols("<script>,SIXTEEN_CHARS_XX,SPA CE, ,")).toEqual([]);
    expect(parseSymbols(null)).toEqual([]);
    expect(parseSymbols("")).toEqual([]);
  });

  it("caps the set at the batch limit", () => {
    const raw = Array.from({ length: 200 }, (_, i) => `S${i}`).join(",");
    expect(parseSymbols(raw).length).toBe(120);
  });
});

describe("pruneRegistry", () => {
  const NOW = Date.parse("2026-07-16T12:00:00.000Z");
  const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();
  const DAY = 24 * 60 * 60 * 1000;

  it("drops symbols idle past the retention window and unparseable stamps", () => {
    const pruned = pruneRegistry(
      { AAPL: iso(DAY), OLD: iso(31 * DAY), BAD: "not-a-date" },
      NOW
    );
    expect(Object.keys(pruned)).toEqual(["AAPL"]);
  });

  it("evicts least-recently-requested symbols past the cap", () => {
    const registry: Record<string, string> = {};
    for (let i = 0; i < 250; i++) {
      registry[`S${i}`] = iso(i * 1000); // S0 newest ... S249 oldest
    }
    const pruned = pruneRegistry(registry, NOW);
    expect(Object.keys(pruned)).toHaveLength(200);
    expect(pruned.S0).toBeDefined(); // newest kept
    expect(pruned.S249).toBeUndefined(); // oldest evicted
  });
});

describe("sliceUpstreamBatch", () => {
  const stale = Array.from({ length: 12 }, (_, i) => `S${i}`);

  it("caps a batch at the provider's per-minute credit allowance", () => {
    const { toFetch, pending } = sliceUpstreamBatch(stale, 0);
    expect(toFetch).toHaveLength(8);
    expect(pending).toEqual(["S8", "S9", "S10", "S11"]);
  });

  it("shrinks the batch to the remaining daily budget", () => {
    const { toFetch, pending } = sliceUpstreamBatch(stale, 697); // 3 credits left of 700
    expect(toFetch).toEqual(["S0", "S1", "S2"]);
    expect(pending).toHaveLength(9);
  });

  it("fetches nothing once the daily budget is spent", () => {
    const { toFetch, pending } = sliceUpstreamBatch(stale, 700);
    expect(toFetch).toEqual([]);
    expect(pending).toEqual(stale);
  });
});

describe("mapTwelveDataResponse", () => {
  it("maps the single-symbol shape", () => {
    expect(mapTwelveDataResponse(["AAPL"], { price: "192.31" })).toEqual({
      AAPL: 192.31,
    });
  });

  it("maps the batch shape, leaving unpriced symbols absent", () => {
    const data = {
      AAPL: { price: "192.31" },
      VTI: { price: "263.05" },
      DEADTICKER: { code: 400, status: "error", message: "symbol not found" },
    };
    expect(mapTwelveDataResponse(["AAPL", "VTI", "DEADTICKER"], data)).toEqual({
      AAPL: 192.31,
      VTI: 263.05,
    });
  });

  it("throws on a batch-level error body (credit exhaustion) instead of returning 'no prices'", () => {
    // Regression: Twelve Data reports credit exhaustion in the body with
    // HTTP 200. Treating it as success negative-cached every symbol in the
    // batch for 24h, consumed the device throttle, and edge-cached the gap.
    const exhausted = {
      code: 429,
      message: "You have run out of API credits for the current minute.",
      status: "error",
    };
    expect(() => mapTwelveDataResponse(["AAPL", "VTI"], exhausted)).toThrow(/429/);
    expect(() => mapTwelveDataResponse(["AAPL"], { code: 401, status: "error" })).toThrow(/401/);
  });

  it("treats a single-symbol 400 error as 'unpriced', so the miss cache can do its job", () => {
    // A dead ticker is a fact about the symbol, not the service: throwing
    // here would make the warmer retry it every pass and drain the budget -
    // the exact behavior the miss cache exists to stop.
    const notFound = { code: 400, status: "error", message: "symbol not found" };
    expect(mapTwelveDataResponse(["TYPO"], notFound)).toEqual({});
  });

  it("throws on malformed bodies", () => {
    expect(() => mapTwelveDataResponse(["AAPL"], null)).toThrow(/malformed/);
    expect(() => mapTwelveDataResponse(["AAPL"], "<html>")).toThrow(/malformed/);
    expect(() => mapTwelveDataResponse(["AAPL"], [1, 2])).toThrow(/malformed/);
  });
});

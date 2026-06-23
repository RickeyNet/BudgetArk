/**
 * BudgetArk stock-quote proxy.
 *
 * Why this exists: a client-only app cannot keep an API key secret (it can be
 * extracted from the bundle). This Worker holds the Twelve Data key as a
 * Cloudflare secret and is the only thing that talks to the provider.
 *
 * It stores NO portfolio data:
 *   - the price cache is keyed by SYMBOL only (quote:AAPL)
 *   - the throttle is keyed by a SHA-256 HASH of the device id (throttle:<hash>)
 * so nothing here records who holds what.
 *
 * Endpoint:  GET /quotes?symbols=AAPL,VTI,MSFT
 * Header:    x-device: <stable per-install id>   (optional but enables throttle)
 * Response:  { "quotes": { "AAPL": { "price": 192.31, "asOf": "..." }, ... } }
 */

export interface Env {
  TWELVE_DATA_API_KEY: string;
  QUOTES: KVNamespace;
}

const QUOTE_TTL_SECONDS = 7 * 24 * 60 * 60; // cache a price for a week (matches refresh cadence)
const THROTTLE_TTL_SECONDS = 7 * 24 * 60 * 60; // 1 request per week per device
const MAX_SYMBOLS = 120; // Twelve Data batch limit

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (req.method !== "GET" || url.pathname !== "/quotes") {
      return json({ error: "not_found" }, 404);
    }

    const symbols = parseSymbols(url.searchParams.get("symbols"));
    if (symbols.length === 0) {
      return json({ error: "no_symbols" }, 400);
    }

    // --- Per-device throttle (defends against a tampered client that ignores
    // the app's own weekly gate). Hashed so we never store the raw id. ---
    const deviceId = req.headers.get("x-device") ?? "";
    let throttleKey: string | null = null;
    if (deviceId) {
      throttleKey = `throttle:${await sha256Hex(deviceId)}`;
      if (await env.QUOTES.get(throttleKey)) {
        return json({ error: "rate_limited" }, 429);
      }
    }

    // --- Serve fresh prices from cache; collect the stale/missing ones. ---
    const quotes: Record<string, CachedQuote> = {};
    const stale: string[] = [];
    await Promise.all(
      symbols.map(async (symbol) => {
        const cached = (await env.QUOTES.get(`quote:${symbol}`, "json")) as CachedQuote | null;
        if (cached) {
          quotes[symbol] = cached;
        } else {
          stale.push(symbol);
        }
      })
    );

    // --- One batched upstream call for everything stale. ---
    if (stale.length > 0) {
      try {
        const fetched = await fetchFromTwelveData(stale, env.TWELVE_DATA_API_KEY);
        const asOf = new Date().toISOString();
        await Promise.all(
          stale.map(async (symbol) => {
            const price = fetched[symbol];
            if (Number.isFinite(price)) {
              const record: CachedQuote = { price, asOf };
              quotes[symbol] = record;
              await env.QUOTES.put(`quote:${symbol}`, JSON.stringify(record), {
                expirationTtl: QUOTE_TTL_SECONDS,
              });
            }
          })
        );
      } catch (err) {
        // If the provider is down we still return whatever was cached.
        if (Object.keys(quotes).length === 0) {
          return json({ error: "upstream_unavailable" }, 502);
        }
      }
    }

    // Only consume the throttle budget once we've actually served something.
    if (throttleKey) {
      await env.QUOTES.put(throttleKey, "1", { expirationTtl: THROTTLE_TTL_SECONDS });
    }

    return json({ quotes });
  },
};

interface CachedQuote {
  price: number;
  asOf: string;
}

function parseSymbols(raw: string | null): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  for (const part of raw.toUpperCase().split(",")) {
    const sym = part.trim();
    // Tickers are short alphanumerics (allow . and - for class shares / indices).
    if (sym && /^[A-Z0-9.\-]{1,12}$/.test(sym)) seen.add(sym);
    if (seen.size >= MAX_SYMBOLS) break;
  }
  return [...seen];
}

/**
 * Calls Twelve Data's /price endpoint. The response shape differs for one vs
 * many symbols:
 *   one  -> { "price": "192.31" }
 *   many -> { "AAPL": { "price": "192.31" }, "VTI": { "price": "..." } }
 * Returns a flat { SYMBOL: number } map; bad/failed symbols are simply absent.
 */
async function fetchFromTwelveData(
  symbols: string[],
  apiKey: string
): Promise<Record<string, number>> {
  const endpoint =
    `https://api.twelvedata.com/price?symbol=${encodeURIComponent(symbols.join(","))}` +
    `&apikey=${encodeURIComponent(apiKey)}`;

  const res = await fetch(endpoint);
  if (!res.ok) throw new Error(`twelvedata ${res.status}`);
  const data = (await res.json()) as Record<string, unknown>;

  const out: Record<string, number> = {};
  if (symbols.length === 1) {
    const price = Number((data as { price?: string }).price);
    if (Number.isFinite(price)) out[symbols[0]] = price;
    return out;
  }
  for (const symbol of symbols) {
    const node = data[symbol] as { price?: string } | undefined;
    const price = Number(node?.price);
    if (Number.isFinite(price)) out[symbol] = price;
  }
  return out;
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

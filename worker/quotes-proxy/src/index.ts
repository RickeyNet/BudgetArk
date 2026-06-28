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

/**
 * Cloudflare's rate-limiting binding. Declared locally so the Worker types
 * version doesn't need to ship it. `limit()` counts the call and reports
 * whether it's still within the configured window.
 */
interface RateLimit {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  TWELVE_DATA_API_KEY: string;
  QUOTES: KVNamespace;
  /**
   * Optional per-IP rate limiter (configured in wrangler.toml). Guarded at the
   * call site so a missing/misconfigured binding never takes the Worker down -
   * the daily budget + per-device throttle still apply.
   */
  QUOTES_RL?: RateLimit;
}

const QUOTE_TTL_SECONDS = 7 * 24 * 60 * 60; // cache a price for a week (matches refresh cadence)
const THROTTLE_TTL_SECONDS = 7 * 24 * 60 * 60; // 1 request per week per device
const MAX_SYMBOLS = 120; // Twelve Data batch limit

/**
 * Hard daily ceiling on symbols fetched upstream, across ALL callers. A backstop
 * so distributed abuse (clients that drop x-device) can't blow past the provider
 * quota or run up the bill. Set this to your Twelve Data plan's daily credit
 * limit minus headroom (free tier is ~800/day -> 700 is a safe default).
 * Counted in KV, which has no atomic increment, so this is best-effort (a small
 * overshoot under heavy concurrency is acceptable for a soft cap).
 */
const DAILY_UPSTREAM_SYMBOL_BUDGET = 700;
const DAILY_COUNTER_TTL_SECONDS = 2 * 24 * 60 * 60; // yesterday's counter auto-expires

/**
 * Edge-cache window for an identical (normalized) symbol set. Repeat requests
 * are served straight from Cloudflare's cache with zero KV reads / upstream
 * calls, which is the main defense against KV-read exhaustion under load.
 *
 * NOTE: the Cache API is a no-op on *.workers.dev - it only takes effect once
 * the Worker runs on a custom domain (a Cloudflare zone). The code below is
 * written to degrade silently (every match misses) so it's safe either way.
 */
const EDGE_CACHE_TTL_SECONDS = 600; // 10 minutes

/** Max cache-MISS requests per source IP per day (a firm per-source bound). */
const IP_DAILY_REQUEST_CAP = 100;

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);

    if (req.method !== "GET" || url.pathname !== "/quotes") {
      return json({ error: "not_found" }, 404);
    }

    const symbols = parseSymbols(url.searchParams.get("symbols"));
    if (symbols.length === 0) {
      return json({ error: "no_symbols" }, 400);
    }

    const clientIp = req.headers.get("CF-Connecting-IP") ?? "";

    // --- 1. Per-IP burst limit (cheap, no KV) BEFORE the cache lookup, so one
    // IP can't flood even identical (cacheable) requests. Returns 503, NOT 429,
    // on purpose: 429 is reserved for the per-device weekly throttle, which the
    // app reacts to by backing off a full week. A momentary burst should just
    // retry, so 503 routes it through the app's transient-failure path. ---
    if (env.QUOTES_RL) {
      const { success } = await env.QUOTES_RL.limit({ key: clientIp || "anon" });
      if (!success) {
        return json({ error: "busy" }, 503, { "retry-after": "60" });
      }
    }

    // --- 2. Edge cache: serve an identical symbol set straight from Cloudflare
    // with ZERO KV reads / upstream calls. Key is normalized (sorted) so order
    // doesn't fragment it; the x-device header is intentionally NOT part of the
    // key (prices are public, non-personal). Free; no KV quota. No-op on
    // *.workers.dev (see EDGE_CACHE_TTL_SECONDS). ---
    const cache = caches.default;
    const cacheKey = new Request(
      `${url.origin}/quotes?symbols=${[...symbols].sort().join(",")}`,
      { method: "GET" }
    );
    const hit = await cache.match(cacheKey);
    if (hit) return hit;

    const today = new Date().toISOString().slice(0, 10);

    // --- 3. Per-IP daily cap (KV) - only on a cache MISS, so cache hits stay
    // KV-free. Bounds the expensive path (KV reads + upstream) per source per
    // day. 503 so a (rare) NAT'd legit client just retries later. ---
    let ipDayKey: string | null = null;
    let ipUsedToday = 0;
    if (clientIp) {
      ipDayKey = `ipday:${today}:${await sha256Hex(clientIp)}`;
      ipUsedToday = Number(await env.QUOTES.get(ipDayKey)) || 0;
      if (ipUsedToday >= IP_DAILY_REQUEST_CAP) {
        return json({ error: "busy" }, 503, { "retry-after": "3600" });
      }
    }

    // --- Per-device weekly throttle (cooperative clients). Hashed so we never
    // store the raw id. ---
    const deviceId = req.headers.get("x-device") ?? "";
    let throttleKey: string | null = null;
    if (deviceId) {
      throttleKey = `throttle:${await sha256Hex(deviceId)}`;
      if (await env.QUOTES.get(throttleKey)) {
        return json({ error: "rate_limited" }, 429);
      }
    }

    // --- Serve fresh prices from the per-symbol KV cache; collect stale. ---
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

    // --- One batched upstream call for everything stale, bounded by the global
    // daily budget. Past the ceiling we serve only what's cached (no error) so
    // the app keeps its last-known prices. ---
    if (stale.length > 0) {
      const dayKey = `upstream:${today}`;
      const usedToday = Number(await env.QUOTES.get(dayKey)) || 0;
      const remaining = DAILY_UPSTREAM_SYMBOL_BUDGET - usedToday;
      const toFetch = remaining > 0 ? stale.slice(0, remaining) : [];

      if (toFetch.length > 0) {
        try {
          const fetched = await fetchFromTwelveData(toFetch, env.TWELVE_DATA_API_KEY);
          const asOf = new Date().toISOString();
          await Promise.all(
            toFetch.map(async (symbol) => {
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
          // Charge the credits we actually spent against today's budget.
          await env.QUOTES.put(dayKey, String(usedToday + toFetch.length), {
            expirationTtl: DAILY_COUNTER_TTL_SECONDS,
          });
        } catch (err) {
          // If the provider is down we still return whatever was cached.
          if (Object.keys(quotes).length === 0) {
            return json({ error: "upstream_unavailable" }, 502);
          }
        }
      }
    }

    // Consume the per-device weekly budget once we've served something.
    if (throttleKey) {
      await env.QUOTES.put(throttleKey, "1", { expirationTtl: THROTTLE_TTL_SECONDS });
    }
    // Charge this source's daily request budget (best-effort; KV has no atomic
    // increment, which is fine for a soft cap).
    if (ipDayKey) {
      await env.QUOTES.put(ipDayKey, String(ipUsedToday + 1), {
        expirationTtl: DAILY_COUNTER_TTL_SECONDS,
      });
    }

    // Cache the served response for the next identical request (no-op on
    // workers.dev; offloads KV/upstream on a custom domain).
    const response = json({ quotes }, 200, {
      "cache-control": `public, max-age=${EDGE_CACHE_TTL_SECONDS}`,
    });
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
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

function json(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}

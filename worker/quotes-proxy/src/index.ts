/**
 * BudgetArk stock-quote proxy.
 *
 * Why this exists: a client-only app cannot keep an API key secret (it can be
 * extracted from the bundle). This Worker holds the Twelve Data key as a
 * Cloudflare secret and is the only thing that talks to the provider.
 *
 * It stores NO portfolio data:
 *   - the price cache is keyed by SYMBOL only (quote:<ver>:AAPL)
 *   - the throttle is keyed by a SHA-256 HASH of the device id (throttle:<ver>:<hash>)
 *   - the warmer's symbol registry (symbols:<ver>:registry) is a flat set of
 *     symbols with last-requested stamps - no device association
 * so nothing here records who holds what. (<ver> is CACHE_VERSION - bump it to
 * flush the cache + throttle without touching KV.)
 *
 * A cron trigger re-warms registered symbols a few at a time (see
 * `scheduled`), so serving a request never needs an upstream batch bigger
 * than the provider's per-minute credit allowance.
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
  /**
   * Shared key the app sends as the `x-app-key` header. A LOW-EFFORT BOT
   * DETERRENT, NOT authentication: it ships in the client bundle and can be
   * extracted, so it only filters blind internet scanners that probe the
   * workers.dev hostname. Real cost/abuse control is the throttle + budgets
   * below. Set it as a Cloudflare secret (`wrangler secret put APP_SHARED_KEY`)
   * with the SAME value as the app's QUOTES_APP_KEY. Leave it unset and the
   * check is skipped, so the Worker keeps working before you configure it.
   */
  APP_SHARED_KEY?: string;
}

const QUOTE_TTL_SECONDS = 24 * 60 * 60; // cache a price for a day (matches refresh cadence)
const THROTTLE_TTL_SECONDS = 24 * 60 * 60; // 1 request per day per device
const MAX_SYMBOLS = 120; // Twelve Data batch limit

/**
 * Max symbols fetched upstream in a single call. Twelve Data's FREE tier
 * allows 8 API credits per minute and a batched /price call costs 1 credit
 * per symbol, so any batch larger than 8 is rejected wholesale (HTTP 429 ->
 * we used to surface that as a 502 and the app failed silently forever once
 * a portfolio grew past 8 tickers). Anything beyond this cap stays stale for
 * the current response and is picked up by the cron warmer within minutes.
 */
const UPSTREAM_MINUTE_BATCH_LIMIT = 8;

/**
 * Namespace prefix for every KV key this Worker owns (price cache + per-device
 * throttle). Bump it to abandon all existing entries WITHOUT touching KV: old
 * keys keep their original TTL and expire on their own, while the new version
 * starts from an empty cache (forcing a fresh upstream fetch) and an empty
 * throttle set (so no device is stuck behind a stale cooldown). Use this to
 * flush after a cadence/TTL change instead of deleting keys by hand.
 */
const CACHE_VERSION = "v2";
const quoteKey = (symbol: string): string => `quote:${CACHE_VERSION}:${symbol}`;

/**
 * Registry of every symbol the app has asked for, so the cron warmer knows
 * what to keep fresh. SYMBOLS ONLY (no device ids) - the same privacy surface
 * as the per-symbol quote cache. Stored as { SYMBOL: lastRequestedAtISO }.
 * Bounded two ways so a leaked app key can't turn the warmer into a budget
 * drain: entries idle past the retention window fall out, and the map is
 * capped by evicting the least-recently-requested symbols.
 */
const registryKey = (): string => `symbols:${CACHE_VERSION}:registry`;
const REGISTRY_MAX_SYMBOLS = 200;
const REGISTRY_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
/** Skip a registry rewrite when a symbol's stamp is fresher than this. */
const REGISTRY_RESTAMP_MS = 6 * 60 * 60 * 1000;

type SymbolRegistry = Record<string, string>;

const readRegistry = async (env: Env): Promise<SymbolRegistry> => {
  const raw = (await env.QUOTES.get(registryKey(), "json")) as SymbolRegistry | null;
  return raw && typeof raw === "object" ? raw : {};
};

/** Drop idle symbols, then oldest-first down to the cap. Pure; returns a new map. */
export const pruneRegistry = (registry: SymbolRegistry, now: number): SymbolRegistry => {
  const alive = Object.entries(registry).filter(([, ts]) => {
    const t = new Date(ts).getTime();
    return Number.isFinite(t) && now - t < REGISTRY_RETENTION_MS;
  });
  alive.sort((a, b) => (a[1] < b[1] ? 1 : -1)); // newest first
  return Object.fromEntries(alive.slice(0, REGISTRY_MAX_SYMBOLS));
};

/**
 * Record that these symbols are in active use. Read-modify-write without a
 * lock (KV has none) - a lost update just delays a stamp, and the warmer
 * re-learns the symbol on the next request. Skips the write entirely when
 * every stamp is still fresh, which is the common case.
 */
const updateSymbolRegistry = async (
  env: Env,
  symbols: string[],
  now: number,
): Promise<void> => {
  try {
    const registry = await readRegistry(env);
    const nowIso = new Date(now).toISOString();
    let changed = false;
    for (const symbol of symbols) {
      const prev = registry[symbol] ? new Date(registry[symbol]).getTime() : NaN;
      if (!Number.isFinite(prev) || now - prev >= REGISTRY_RESTAMP_MS) {
        registry[symbol] = nowIso;
        changed = true;
      }
    }
    if (!changed) return;
    await env.QUOTES.put(registryKey(), JSON.stringify(pruneRegistry(registry, now)));
  } catch {
    // Best-effort: a failed stamp only postpones warming, never breaks serving.
  }
};

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
 * Splits the stale list into the batch to fetch now (bounded by both the
 * remaining daily budget and the provider's per-minute credit allowance)
 * and the tail to report as `pending`. Shared by the request path and the
 * cron warmer so the two can't drift.
 */
export const sliceUpstreamBatch = (
  stale: string[],
  usedToday: number
): { toFetch: string[]; pending: string[] } => {
  const remaining = DAILY_UPSTREAM_SYMBOL_BUDGET - usedToday;
  const toFetch =
    remaining > 0
      ? stale.slice(0, Math.min(remaining, UPSTREAM_MINUTE_BATCH_LIMIT))
      : [];
  return { toFetch, pending: stale.slice(toFetch.length) };
};

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

    // Drop anything that isn't carrying our app's shared key. This is only a
    // bot deterrent (the key ships in the client), so we answer with the same
    // 404 as an unknown path rather than 401 - no point advertising the gate.
    // Skipped entirely when APP_SHARED_KEY isn't configured.
    if (env.APP_SHARED_KEY && req.headers.get("x-app-key") !== env.APP_SHARED_KEY) {
      return json({ error: "not_found" }, 404);
    }

    const symbols = parseSymbols(url.searchParams.get("symbols"));
    if (symbols.length === 0) {
      return json({ error: "no_symbols" }, 400);
    }

    const clientIp = req.headers.get("CF-Connecting-IP") ?? "";

    // --- 1. Per-IP burst limit (cheap, no KV) BEFORE the cache lookup, so one
    // IP can't flood even identical (cacheable) requests. Returns 503, NOT 429,
    // on purpose: 429 is reserved for the per-device daily throttle, which the
    // app reacts to by backing off a full day. A momentary burst should just
    // retry, so 503 routes it through the app's transient-failure path. ---
    if (env.QUOTES_RL) {
      const { success } = await env.QUOTES_RL.limit({ key: clientIp || "anon" });
      if (!success) {
        return json({ error: "busy" }, 503, { "retry-after": "60" });
      }
    }

    // Teach the cron warmer about these symbols. Off the critical path, and
    // deliberately after the app-key gate + burst limit so scanners can't
    // poison the registry; deliberately before the early returns below so a
    // throttled/cached request still registers a freshly added ticker.
    ctx.waitUntil(updateSymbolRegistry(env, symbols, Date.now()));

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

    // --- Per-device daily throttle (cooperative clients). Hashed so we never
    // store the raw id. ---
    const deviceId = req.headers.get("x-device") ?? "";
    let throttleKey: string | null = null;
    if (deviceId) {
      throttleKey = `throttle:${CACHE_VERSION}:${await sha256Hex(deviceId)}`;
      if (await env.QUOTES.get(throttleKey)) {
        return json({ error: "rate_limited" }, 429);
      }
    }

    // --- Serve fresh prices from the per-symbol KV cache; collect stale. ---
    const quotes: Record<string, CachedQuote> = {};
    const stale: string[] = [];
    await Promise.all(
      symbols.map(async (symbol) => {
        const cached = (await env.QUOTES.get(quoteKey(symbol), "json")) as CachedQuote | null;
        if (cached) {
          quotes[symbol] = cached;
        } else {
          stale.push(symbol);
        }
      })
    );

    // --- One batched upstream call for everything stale, bounded by the global
    // daily budget AND the provider's per-minute credit allowance. Past either
    // ceiling we serve what we have and report the rest as `pending` so the
    // client can tell the user prices are minutes away (the cron warmer or a
    // retry picks them up) rather than silently missing. ---
    let pending: string[] = [];
    if (stale.length > 0) {
      const dayKey = `upstream:${today}`;
      const usedToday = Number(await env.QUOTES.get(dayKey)) || 0;
      const sliced = sliceUpstreamBatch(stale, usedToday);
      const toFetch = sliced.toFetch;
      pending = sliced.pending;

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
                await env.QUOTES.put(quoteKey(symbol), JSON.stringify(record), {
                  expirationTtl: QUOTE_TTL_SECONDS,
                });
              }
            })
          );
          // Charge the credits we actually spent against today's budget.
          await env.QUOTES.put(dayKey, String(usedToday + toFetch.length), {
            expirationTtl: DAILY_COUNTER_TTL_SECONDS,
          });
        } catch {
          // If the provider is down we still return whatever was cached.
          if (Object.keys(quotes).length === 0) {
            return json({ error: "upstream_unavailable" }, 502);
          }
          // Partial-from-cache: the batch we attempted is retryable too.
          pending = [...toFetch, ...pending];
        }
      }
    }

    // Consume the per-device daily budget - but only when this response
    // covered every stale symbol. If the minute cap (or daily budget) forced
    // us to leave some pending, the device may retry after the warmer fills
    // the gap instead of eating a 429 until tomorrow. The burst limit + per-IP
    // daily cap still bound how hard an un-throttled device can retry.
    if (throttleKey && pending.length === 0) {
      await env.QUOTES.put(throttleKey, "1", { expirationTtl: THROTTLE_TTL_SECONDS });
    }
    // Charge this source's daily request budget (best-effort; KV has no atomic
    // increment, which is fine for a soft cap).
    if (ipDayKey) {
      await env.QUOTES.put(ipDayKey, String(ipUsedToday + 1), {
        expirationTtl: DAILY_COUNTER_TTL_SECONDS,
      });
    }

    // Cache the served response for the next identical request - but only a
    // COMPLETE one. Edge-caching a partial answer would keep serving the same
    // gaps for the cache window and defeat the retry the `pending` field
    // invites. (No-op on workers.dev; offloads KV/upstream on a custom domain.)
    // `no-store` on partials also stops the CLIENT's HTTP cache from replaying
    // the same gaps on a quick retry - RN's fetch honors cache-control.
    const response = json(
      pending.length > 0 ? { quotes, pending } : { quotes },
      200,
      pending.length > 0
        ? { "cache-control": "no-store" }
        : { "cache-control": `public, max-age=${EDGE_CACHE_TTL_SECONDS}` }
    );
    if (pending.length === 0) {
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
    }
    return response;
  },

  /**
   * Cron warmer (see `crons` in wrangler.toml): keeps every registered symbol
   * priced in KV so user requests are pure cache reads. Each pass fetches at
   * most UPSTREAM_MINUTE_BATCH_LIMIT symbols, so the free-tier per-minute cap
   * can never reject a batch no matter how large a portfolio grows - the cap
   * that used to hard-fail any request with >8 stale symbols.
   */
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(warmQuoteCache(env));
  },
};

/**
 * Negative cache for symbols the provider couldn't price (typos, delistings,
 * unsupported instruments). Without it the warmer would retry a dead symbol
 * every pass and drain the daily budget; with it, one attempt per day.
 */
const missKey = (symbol: string): string => `miss:${CACHE_VERSION}:${symbol}`;
const MISS_TTL_SECONDS = 24 * 60 * 60;

async function warmQuoteCache(env: Env): Promise<void> {
  const now = Date.now();
  // In-memory prune only - idle symbols stop being warmed immediately; the
  // stored registry shrinks on the next request-path write.
  const registry = pruneRegistry(await readRegistry(env), now);
  const symbols = Object.keys(registry);
  if (symbols.length === 0) return;

  // A symbol needs warming when it has neither a live quote nor a recent
  // failed attempt. KV reads per pass are ~2x registry size + 1: at the
  // 200-symbol cap that's ~401 reads x 144 passes (10-min cadence) ≈ 58k
  // reads/day, inside the 100k/day KV free tier with headroom for the
  // request path. (At the old 5-min cadence the same math was ~115k/day -
  // OVER the free tier; once the read quota is exhausted, KV fails for the
  // rest of the UTC day and takes the serving path down with it.)
  const stale: string[] = [];
  await Promise.all(
    symbols.map(async (symbol) => {
      if (await env.QUOTES.get(quoteKey(symbol))) return;
      if (await env.QUOTES.get(missKey(symbol))) return;
      stale.push(symbol);
    })
  );
  if (stale.length === 0) return;

  const today = new Date(now).toISOString().slice(0, 10);
  const dayKey = `upstream:${today}`;
  const usedToday = Number(await env.QUOTES.get(dayKey)) || 0;
  const { toFetch } = sliceUpstreamBatch(stale, usedToday);
  if (toFetch.length === 0) return;

  try {
    const fetched = await fetchFromTwelveData(toFetch, env.TWELVE_DATA_API_KEY);
    const asOf = new Date(now).toISOString();
    await Promise.all(
      toFetch.map(async (symbol) => {
        const price = fetched[symbol];
        if (Number.isFinite(price)) {
          const record: CachedQuote = { price, asOf };
          await env.QUOTES.put(quoteKey(symbol), JSON.stringify(record), {
            expirationTtl: QUOTE_TTL_SECONDS,
          });
        } else {
          await env.QUOTES.put(missKey(symbol), "1", { expirationTtl: MISS_TTL_SECONDS });
        }
      })
    );
    await env.QUOTES.put(dayKey, String(usedToday + toFetch.length), {
      expirationTtl: DAILY_COUNTER_TTL_SECONDS,
    });
  } catch {
    // Provider hiccup: leave everything stale and let the next pass retry.
  }
}

interface CachedQuote {
  price: number;
  asOf: string;
}

export function parseSymbols(raw: string | null): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  for (const part of raw.toUpperCase().split(",")) {
    const sym = part.trim();
    // Short alphanumerics: `.`/`-` for class shares / indices, `/` for crypto
    // pairs (e.g. BTC/USD). Kept in sync with the app's holdingsMath regex.
    if (sym && /^[A-Z0-9./\-]{1,15}$/.test(sym)) seen.add(sym);
    if (seen.size >= MAX_SYMBOLS) break;
  }
  return [...seen];
}

/**
 * Twelve Data reports many failures in the RESPONSE BODY with HTTP 200 -
 * credit exhaustion looks like {"code":429,"status":"error","message":...}.
 * Treating such a body as "no prices" used to poison the 24h miss cache for
 * every symbol in the batch, consume the device throttle, and edge-cache the
 * gap - all for a response that priced nothing.
 *
 * The ONE body-level error that must NOT throw: a single-symbol request for
 * an unknown ticker also answers {"code":400,"status":"error"}. That's a
 * fact about the symbol, not the service - returning "unpriced" lets the
 * warmer negative-cache it, which is exactly the miss cache's job (throwing
 * would make the warmer retry the dead ticker every pass forever).
 */
export function mapTwelveDataResponse(
  symbols: string[],
  data: unknown
): Record<string, number> {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("twelvedata malformed body");
  }
  const body = data as Record<string, unknown> & { status?: unknown; code?: unknown };

  if (body.status === "error") {
    if (symbols.length === 1 && body.code === 400) {
      return {}; // unknown symbol - unpriced, eligible for the miss cache
    }
    throw new Error(`twelvedata body error ${String(body.code ?? "unknown")}`);
  }

  const out: Record<string, number> = {};
  if (symbols.length === 1) {
    const price = Number((body as { price?: string }).price);
    if (Number.isFinite(price)) out[symbols[0]] = price;
    return out;
  }
  for (const symbol of symbols) {
    // Per-symbol error nodes ({"code":400,...}) have no price and stay
    // absent - a dead ticker in a batch is a miss, not a batch failure.
    const node = body[symbol] as { price?: string } | undefined;
    const price = Number(node?.price);
    if (Number.isFinite(price)) out[symbol] = price;
  }
  return out;
}

/**
 * Calls Twelve Data's /price endpoint. The response shape differs for one vs
 * many symbols:
 *   one  -> { "price": "192.31" }
 *   many -> { "AAPL": { "price": "192.31" }, "VTI": { "price": "..." } }
 * Returns a flat { SYMBOL: number } map; bad/failed symbols are simply absent.
 * Throws on transport errors AND batch-level error bodies (see
 * mapTwelveDataResponse).
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
  return mapTwelveDataResponse(symbols, await res.json());
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

/**
 * BudgetArk - Stock Quote Proxy Config
 * File: src/config/quotesConfig.ts
 *
 * Connection details for the Cloudflare Worker that proxies stock prices
 * (see `worker/quotes-proxy/`). The app calls this Worker instead of the
 * stock provider directly so the Twelve Data API key stays off-device.
 *
 * Why the URL is a plain constant (not a secret / not in app.json `extra`):
 *   The Worker URL is inherently public - anyone can extract it from the app
 *   bundle or watch network traffic. Its protection is NOT URL secrecy; it's
 *   the Worker's server-side per-device throttle and symbol cache. So there's
 *   nothing to hide here, and keeping it as a pure JS constant avoids adding
 *   the `expo-constants` native dependency (which isn't installed) and keeps
 *   the value OTA-updatable.
 *
 * The actual secret (the Twelve Data API key) lives only as an encrypted
 * Cloudflare secret on the Worker - never in this repo or the app bundle.
 */

/** Deployed quote-proxy Worker. Endpoint: GET /quotes?symbols=AAPL,VTI */
export const QUOTES_PROXY_URL = "https://quotes.budgetark.app";

/**
 * Shared key sent as the `x-app-key` header on every quote request. This is a
 * LOW-EFFORT BOT DETERRENT, NOT a secret: like QUOTES_PROXY_URL it ships in the
 * app bundle and can be extracted from it or a TLS proxy. Its only job is to
 * make blind internet scanners that probe the workers.dev hostname get a 404.
 * Real abuse/cost control is server-side (per-device daily throttle, per-IP
 * daily cap, global daily Twelve Data budget).
 *
 * Must match the Worker's APP_SHARED_KEY secret (`wrangler secret put
 * APP_SHARED_KEY`). To rotate: set the new value here AND on the Worker, ship an
 * app update; older app versions stop being accepted once the Worker only knows
 * the new value, so rotate by deploying the app first if you need overlap.
 */
export const QUOTES_APP_KEY = "48a3334c846601cb8048638206acabd3cf5bacc4abe2d25d";

/**
 * Max tickers per request. Matches the Worker's MAX_SYMBOLS (Twelve Data's
 * batch limit). A single household won't approach this, but we cap defensively.
 */
export const MAX_QUOTE_SYMBOLS = 120;

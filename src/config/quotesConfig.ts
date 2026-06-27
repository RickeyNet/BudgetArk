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
export const QUOTES_PROXY_URL = "https://quotes-proxy.budgetark.workers.dev";

/**
 * Max tickers per request. Matches the Worker's MAX_SYMBOLS (Twelve Data's
 * batch limit). A single household won't approach this, but we cap defensively.
 */
export const MAX_QUOTE_SYMBOLS = 120;

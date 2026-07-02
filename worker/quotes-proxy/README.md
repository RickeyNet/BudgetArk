# quotes-proxy

Cloudflare Worker that fetches stock prices for BudgetArk's "Live Stock Holdings"
feature. It exists so the **Twelve Data API key stays off-device** — the app
calls this Worker, the Worker calls Twelve Data.

It stores no portfolio data: the price cache is keyed by symbol, and the abuse
throttle is keyed by a hash of the device id. Nothing here records who holds what.

## One-time setup

All commands run from this folder (`worker/quotes-proxy`).

```bash
# 1. Install deps
npm install

# 2. Log in to Cloudflare (opens a browser, one time)
npx wrangler login

# 3. Create the KV namespace, then paste the printed id into wrangler.toml
#    (replace REPLACE_WITH_KV_ID)
npx wrangler kv namespace create QUOTES

# 4. Store the Twelve Data key as an encrypted secret (never in git / the app)
npx wrangler secret put TWELVE_DATA_API_KEY
#    paste your key from twelvedata.com when prompted

# 5. Store the shared app key (bot deterrent). Use the SAME value as the app's
#    QUOTES_APP_KEY constant in src/config/quotesConfig.ts.
npx wrangler secret put APP_SHARED_KEY

# 6. Run locally and smoke-test (the x-app-key header is now required)
npx wrangler dev
#    in another terminal:
curl "http://localhost:8787/quotes?symbols=AAPL,VTI" \
  -H "x-app-key: <your QUOTES_APP_KEY>" -H "x-device: test123"
#    expect: {"quotes":{"AAPL":{"price":...},"VTI":{"price":...}}}
#    without the x-app-key header -> 404 (the gate is silent by design)

# 7. Deploy
npx wrangler deploy
#    note the printed URL, e.g. https://quotes-proxy.<subdomain>.workers.dev
```

The Worker URL and the shared app key both live as plain constants in
`src/config/quotesConfig.ts` (`QUOTES_PROXY_URL`, `QUOTES_APP_KEY`). Neither is a
real secret — they ship in the bundle by necessity. The only true secret is the
Twelve Data key, which stays a Cloudflare secret and never leaves the Worker.

`APP_SHARED_KEY` is **optional**: leave it unset and the Worker skips the check,
so it keeps serving while you configure things.

## API

```
GET /quotes?symbols=AAPL,VTI,MSFT
Header (required if APP_SHARED_KEY set): x-app-key: <shared app key>
Header (optional):                       x-device: <stable per-install id>  # enables 1/day throttle

200 -> { "quotes": { "AAPL": { "price": 192.31, "asOf": "2026-06-23T..." }, ... } }
400 -> { "error": "no_symbols" }
404 -> { "error": "not_found" }            # unknown path OR missing/wrong x-app-key
429 -> { "error": "rate_limited" }         # device already fetched today
502 -> { "error": "upstream_unavailable" } # provider down and nothing cached
503 -> { "error": "busy" }                 # per-IP burst / daily cap; retry later
```

## Tuning

In `src/index.ts`:
- `QUOTE_TTL_SECONDS` — how long a price is cached (default 1 day).
- `THROTTLE_TTL_SECONDS` — per-device cooldown (default 1 day).
- `MAX_SYMBOLS` — batch cap (Twelve Data allows 120).

## Useful commands

```bash
npm run dev        # local dev server
npm run deploy     # publish
npm run tail       # live production logs
npm run typecheck  # tsc --noEmit
```

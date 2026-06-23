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

# 5. Run locally and smoke-test
npx wrangler dev
#    in another terminal:
curl "http://localhost:8787/quotes?symbols=AAPL,VTI" -H "x-device: test123"
#    expect: {"quotes":{"AAPL":{"price":...},"VTI":{"price":...}}}

# 6. Deploy
npx wrangler deploy
#    note the printed URL, e.g. https://quotes-proxy.<subdomain>.workers.dev
```

After deploy, put the Worker URL in the app's config (`app.json` -> `expo.extra`)
so `src/services/quotesService.ts` can read it via `expo-constants`. Do **not**
hardcode it in source.

## API

```
GET /quotes?symbols=AAPL,VTI,MSFT
Header (optional): x-device: <stable per-install id>   # enables 1/week throttle

200 -> { "quotes": { "AAPL": { "price": 192.31, "asOf": "2026-06-23T..." }, ... } }
400 -> { "error": "no_symbols" }
429 -> { "error": "rate_limited" }        # device already fetched this week
502 -> { "error": "upstream_unavailable" } # provider down and nothing cached
```

## Tuning

In `src/index.ts`:
- `QUOTE_TTL_SECONDS` — how long a price is cached (default 7 days).
- `THROTTLE_TTL_SECONDS` — per-device cooldown (default 1 week).
- `MAX_SYMBOLS` — batch cap (Twelve Data allows 120).

## Useful commands

```bash
npm run dev        # local dev server
npm run deploy     # publish
npm run tail       # live production logs
npm run typecheck  # tsc --noEmit
```

# BudgetArk

Privacy-first personal finance app (Expo / React Native). There is **no BudgetArk
server**: all data lives encrypted on the device, and every marketing claim in
RELEASE_NOTES.md ("never leaves your phone", "encrypted on this device only")
is a promise the code must keep. The rules below exist because breaking one is
usually silent — nothing crashes when a key ships in a backup.

## Security invariants — never break these

### Data at rest

1. **All persistence goes through `src/storage/encryptedStorage.ts`**
   (AES-256 + HMAC-SHA256, master key in Keychain/Keystore). Never import
   `@react-native-async-storage/async-storage` anywhere else — not even for
   "harmless" flags. Today the only importer is encryptedStorage itself; keep
   it that way.
2. **Secrets must fail closed, never fall back to plaintext.** Bank
   credentials (`connectionSecretsStorage.ts`) write with `requireEncryption`
   and throw `EncryptionUnavailableError` when the keystore is unavailable.
   Any new secret-bearing storage must do the same; surface the error to the
   user instead of degrading silently.
3. **Never change the storage/crypto format without a versioned migration
   and golden fixtures.** `encryptedStorage.test.ts` pins byte-compat for
   V1/V2/V3 — extend it, don't weaken it. Partner sync intentionally stays on
   crypto-js; don't "modernize" it without cross-device compat fixtures.

### Data leaving the device

4. **Egress allowlist.** The only permitted network destinations are:
   SimpleFIN (user's own bridge, **https enforced** in `simplefinParser.ts`),
   Teller (user's own cert/mTLS), the Cloudflare quotes proxy (**ticker
   symbols only** — never share counts, balances, or identity), exchange
   rates, and LAN partner sync. Any NEW network call needs: minimum possible
   payload, https, and a plain-language user disclosure before first use
   (follow the `connectionsDisclosure.ts` pattern).
5. **Connection credentials never leave the device.** The
   `@budgetark_connection_secrets` key must not appear in
   `utils/exportData.ts`, `utils/importData.ts` KEYS, or `sync/types.ts`
   SyncDiff. `exportData.test.ts` has a regression test asserting no
   connection-prefixed keys in the export payload — when adding a new secret
   key, add it to that test.
6. **Receipt photos stay local.** Encrypted at rest, excluded from partner
   sync and backups. Exporting them requires explicit per-action user
   confirmation, and shared archives are deleted after the share sheet
   closes.

### API keys & the Cloudflare Worker (`worker/quotes-proxy/`)

7. **Provider API keys live only as Cloudflare secrets.** The Twelve Data
   key is set via `wrangler secret put TWELVE_DATA_API_KEY` and read as
   `env.*` at runtime — never in `wrangler.toml`, the repo, the app bundle,
   or `app.json`. Any future keyed third-party API gets the same treatment:
   proxy it through a Worker, never embed the provider key client-side.
   `.dev.vars` is gitignored in the worker dir — never commit one, and never
   paste a real key into comments, tests, or fixtures.
8. **Anything shipped in the app bundle is public.** `QUOTES_APP_KEY`
   (`x-app-key`) is a documented bot deterrent, NOT authentication — never
   gate data access or provider spend on a client-shipped value. Real abuse
   and cost control is server-side: per-device daily throttle, per-IP rate
   limit, bounded symbol registry, global daily upstream budget. Any new
   Worker endpoint needs equivalent guards, so a leaked bundle constant can
   never become a billing drain. Key rotation: ship the app with the new
   value first, then update the Worker secret.
9. **The Worker stores no portfolio data.** KV holds a symbol-keyed price
   cache, a SHA-256-hashed device throttle, and a flat symbol registry —
   nothing associates a device with its symbols. Never add logging,
   analytics, or storage that would; the promise is "only ticker symbols
   leave your phone, never who you are."
10. **Minimal public surface.** Custom domain only (`workers_dev = false`,
    `preview_urls = false`); never ship the app against a workers.dev URL.
    KV namespace ids and route patterns in wrangler.toml are identifiers,
    not secrets (fine to commit); Cloudflare account tokens are secrets
    (use `wrangler login`, never commit tokens or CI credentials).

### What appears on screen / OS surfaces

11. **No financial details on the lock screen.** Notifications may never
    contain amounts, account names, or balances. Notifications are engagement
    nudges only — bill-due alerts were explicitly rejected (banks do those).
12. **Respect privacy mode.** FlagSecure (Android) / ScreenGuard (iOS) block
    screenshots when enabled; new surfaces showing financial data must not
    bypass or disable it.
13. **Widgets and deep links carry no financial data.** The Quick Entry widget
    shows only category names; deep-link params are parsed fail-closed
    (`parseQuickAddUri` rejects anything unrecognized). Keep both properties
    for anything new on the home screen or in the URL scheme.

### Code hygiene

14. **Never log financial data or secrets.** Console output only under
    `if (__DEV__)`, and even then no tokens, amounts, or account names.
15. **Untrusted input parses fail-closed.** Bank API responses, imported
    files, OTA manifests, deep links: validate shape and reject on mismatch —
    return null/throw rather than guessing (see `simplefinParser`,
    `tryParseReleaseNoteFromMessage`, `isUpdateSafe`). User-entered text goes
    through `sanitizeTextInput`.
16. **OTA updates fail closed.** `isUpdateSafe` blocks downgrades and updates
    with missing version metadata. Don't relax it.

### Checklist for any new feature

- Does it **store** something? → through encryptedStorage (rule 1), fail
  closed if it's a secret (rule 2).
- Does it **send** something? → egress allowlist + disclosure (rule 4),
  never credentials (rule 5).
- Does it need a **third-party API key**? → Worker proxy with the key as a
  Cloudflare secret, server-side cost guards (rules 7, 8).
- Does it **show** something? → lock screen (rule 11), privacy mode
  (rule 12), widgets/deep links (rule 13).
- Does it **sync or export** something? → check the exclusion lists and
  extend the exportData regression test (rules 5, 6).

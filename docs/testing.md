# Testing

BudgetArk has a unit-test suite for its **pure business logic** — the math and
validation that power debt payoff, investing projections, net worth, currency
conversion, recurrence, and import/sync safety. Use it as a regression net:
run it before and after a change to confirm you didn't break an existing feature.

## Running

```bash
npm test            # run the whole suite once
npm run test:watch  # re-run affected tests as you edit
npm run test:coverage
```

## What's covered

Tests live next to the code under `__tests__/` folders (`src/utils/`,
`src/sync/`, `src/data/`):

| Suite | Module under test | Feature it guards |
| --- | --- | --- |
| `calculations.test.ts` | `calculations.ts` | Debt payoff timelines, total interest, investment growth, goal-date payments, currency formatting, multi-debt avalanche/snowball simulation |
| `currencyConversion.test.ts` | `currencyConversion.ts` | USD conversion table, milestone target localization, "convert my amounts" math |
| `currencyMigration.test.ts` | `currencyMigration.ts` | "Convert my amounts" migration: scales every stored money field across all collections, bumps `updatedAt`, counts converted records |
| `netWorth.test.ts` | `netWorth.ts` | Net worth totals, reserve-category counting, linked-account double-count guard |
| `recurrence.test.ts` | `recurrence.ts` | Recurring-entry cadence, occurrence counting, spreadsheet month projection |
| `budgetBucketMath.test.ts` | `budgetBucketMath.ts` | 50/30/20 bucket totals, targets, variance, percentages |
| `recordValidators.test.ts` | `recordValidators.ts` | Import / LAN-sync trust-boundary validation of every record type |
| `paymentUrl.test.ts` | `paymentUrl.ts` | Payment-URL normalization and scheme rejection (security) |
| `sanitize.test.ts` | `sanitize.ts` | Control-character stripping on text input |
| `debtDueCalendar.test.ts` | `debtDueCalendar.ts` | Debt reminders: due-day month clamping, payment-in-month detection, upcoming-due window + sorting, "due today needing a prompt" |
| `billCalendar.test.ts` | `billCalendar.ts` | Bill calendar: end-of-month day clamping, grouping by day, next-bill lookup, upcoming window + sorting, paid-vs-remaining split |
| `budgetInsights.test.ts` | `budgetInsights.ts` | Monthly Review: month summaries, month-over-month category changes, 3-month comparisons, streaks (net/under-budget/spending trend) |
| `linkedAccountRecurring.test.ts` | `linkedAccountRecurring.ts` | Linked-account catch-up: credits asset balances for missed recurring months, orphan-account skip, marker advancement, no input mutation |
| `annualReport.test.ts` | `annualReport.ts` | Year-in-review aggregation: income/expense/net totals, reserve vs spending split, debt paid, net-worth baseline, months-under-budget, sparkline, recurring projection, PII-free share text |
| `versionGuard.test.ts` | `versionGuard.ts` | OTA downgrade guard: semver compare (numeric, padded, non-numeric), fail-closed on missing incoming / fail-open on missing current |
| `currencyPreferences.test.ts` | `currencyPreferences.ts` | Currency-preference id validation + option lookup with default fallback (incl. prototype-key safety) |
| `exchangeRates.test.ts` | `exchangeRates.ts` | Live FX rates: response validation (USD base, all codes positive), fresh-cache reuse, stale refresh + write-back, forceRefresh, offline fallback to cache then static table, corrupt/invalid-cache handling |
| `achievements.test.ts` | `achievements.ts` | Achievement evaluator: unlock-once, revoke only revocable, first-run silent + persist gating, progress filtering, throwing check/progress swallowed |
| `updateReleaseNotes.test.ts` | `updateReleaseNotes.ts` | OTA update info: version normalization, release-note lookup, inline-JSON-message parsing + override, current-version inference, default-message fallback |
| `haptics.test.ts` | `haptics.ts` | Haptic wrapper: enabled-pref caching, in-memory override, disabled/error no-op, moment→expo-haptics mapping, native error swallowed |
| `iosNativeShare.test.ts` | `iosNativeShare.ts` | Native share: unavailable error, file+options passthrough, iOS screen-guard suspend/restore (incl. on failure), Android skip path |
| `uuid.test.ts` | `uuid.ts` | UUID generator delegates to `uuid.v4` (package is ESM-only, so mocked) |
| `diffEngine.test.ts` | `sync/diffEngine.ts` | LAN-sync trust boundary: outgoing diff filtering/backlog, incoming validation gate (rejects bad records, no writes), last-write-wins merge, tombstone resurrection guard, per-category limit + snapshot + custom-category merges, milestone/strategy LWW |
| `transportService.test.ts` | `sync/transportService.ts` | Wire-level security: full-envelope HMAC auth (rejects tampered/wrong-key/wrong-sender frames), protocol-version gate + mismatch flag, message age + nonce replay protection, length-prefixed frame buffering/splitting, server port allocation & close-before-connect |
| `achievementDefs.test.ts` | `data/achievementDefs.ts` | Ship's Log badge rules: presence badges, debt-payoff ratios (mortgage excluded), savings/net-worth thresholds, milestone completion, savings streak, under-budget consecutive runs, chapter-completion against real lesson data |
| `importData.test.ts` | `importData.ts` | JSON import: validation, merge vs replace, last-write-wins, stale-age, encrypted-payload gating |
| `exportData.test.ts` | `exportData.ts` | JSON export payload shape + a real encrypt→decrypt round-trip back through the importer |
| `spreadsheetImport.test.ts` | `spreadsheetImport.ts` | .xlsx/.csv import: amount/date parsing, row mapping, Total-row & artifact filtering, skipped-row reporting |
| `spreadsheetExport.test.ts` | `spreadsheetExport.ts` | .xlsx/.csv export: sheet structure, totals, partial-export flagging, backup stamping |
| `spreadsheetRoundTrip.test.ts` | export + import together | Schema-alignment guard: real export → re-import; entities survive, recurring projections are dropped |

### Import / export tests use mocks for the I/O edges

The pure-math suites above import nothing native. The import/export suites do
touch React Native, Expo native modules, the storage layer, and crypto — so
those edges are mocked per-file while the **real** logic (parsing, validation,
merge, SheetJS workbook build, crypto-js) runs:

- `../storage/encryptedStorage` → an in-memory `Map` (inspect/seed it directly).
- `expo-file-system` / `expo-document-picker` → return test-controlled content.
- `react-native` (`Share`, `Platform`) and the per-feature storage getters →
  lightweight stubs returning fixtures.
- `crypto-js` and `xlsx` are **not** mocked — encryption and spreadsheet
  parsing are exercised for real. (The PBKDF2 key derivation is intentionally
  slow, so the encrypted-export round-trip is the bulk of the suite's runtime.)

## Setup notes

- Runner: **Jest + ts-jest** on a Node environment (`jest.config.js`).
- These modules are plain TypeScript with **no React Native imports**, so the
  suite does **not** use `jest-expo` — it runs fast and offline with no native
  mocks. If you later add tests for components or hooks that import React Native,
  add a separate `jest-expo`-based Jest project rather than changing this one.
- `isolatedModules: true` (in `tsconfig.json`) makes ts-jest transpile each file
  on its own — quick, but it does **not** type-check. Run `tsc --noEmit`
  separately if you want full type checking.

## Adding tests

Drop a `*.test.ts` file under `src/utils/__tests__/` (or any `__tests__/`
folder beneath `src/`). Prefer testing pure functions — given inputs, assert
outputs. When a module pulls in React Native or storage, extract the pure logic
into a helper and test that, keeping the side-effecting shell thin.

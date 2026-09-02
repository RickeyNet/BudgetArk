# Testing

BudgetArk has a unit-test suite for its **pure business logic** - the math and
validation that power debt payoff, investing projections, net worth, currency
conversion, recurrence, storage repair, bank-sync ingest, and import/sync
safety. Use it as a regression net: run it before and after a change to confirm
you didn't break an existing feature.

## Running

```bash
npm test               # run the whole suite once
npm run test:watch     # re-run affected tests as you edit
npm run test:coverage  # with the coverage ratchet (jest.config.js thresholds)
npx jest src/utils/__tests__/cashFlow.test.ts   # one suite
```

Also run `npm run typecheck` - `tsc` covers the test files too (ts-jest alone
only transpiles), which is what makes the typed fixtures below worth having.

## Shared fixtures

`src/__tests__/fixtures.ts` exports typed `Partial<T> => T` builders
(`makeDebt`, `makePayment`, `makeBudgetEntry`, `makeSavingsGoal`,
`makeAssetAccount`, `makeBudgetLimit`, `makeMonthStartBalance`, `makePerson`,
`makeBusiness`, `makeCustomCategory`, `makeHolding`, `makeMerchantRule`,
`makeBankConnection`, `makeExternalAccountLink`, `makePendingTransaction`,
`makeNetWorthSnapshot`, plus `FIXTURE_TIME`). Use them instead of `as any`
literals - a fixture that drifts from the real type fails typecheck instead of
silently testing a shape the app never produces. Reserve `as any` for
deliberately malformed input aimed at a runtime validator.

## What's covered

Tests live next to the code under `__tests__/` folders: `src/utils/`,
`src/data/`, `src/sync/`, `src/storage/`, `src/crypto/`, `src/hooks/`,
`src/notifications/`, `src/services/connections/`, `src/services/attachments/`,
`src/services/autoBackup/`.

### Money math & planning (`src/utils`)

| Suite | Module under test | Feature it guards |
| --- | --- | --- |
| `calculations.test.ts` | `calculations.ts` | Debt payoff timelines, total interest, investment growth, goal-date payments, currency formatting, avalanche vs snowball simulation (targeting + total-interest comparison), non-zero-interest amortization |
| `chartCalculators.test.ts` | `chartCalculators.ts` | Charts-tab tool math: loan/mortgage schedules, refinance break-even, emergency-fund timeline |
| `debtTrackerMath.test.ts` | `debtTrackerMath.ts` | Debts tab derivations: summary totals (0-original guard), Build-Your-Ark milestone progress (mortgage-only `hull` guard), payoff ordering with tier promotion |
| `debtPaymentPlan.test.ts` | `debtPaymentPlan.ts` | Per-month debt payment plan: minimum floors in the current month, logged payments in past months, payment month bucketing |
| `debtPaymentDedupe.test.ts` | `debtPaymentDedupe.ts` | Deterministic minimum-due payment ids and the double-count repair |
| `debtFreeCountdown.test.ts` | `debtFreeCountdown.ts` | Debt-free date countdown |
| `debtDueCalendar.test.ts` | `debtDueCalendar.ts` | Debt reminders: due-day month clamping, payment-in-month detection, upcoming-due window, "due today needing a prompt" |
| `billCalendar.test.ts` | `billCalendar.ts` | Bill calendar: end-of-month clamping, grouping by day, next-bill lookup, paid-vs-remaining split, fulfilled bills shown as their actual charge |
| `billFulfillment.test.ts` | `billFulfillment.ts` | Bill fulfilment: `entriesForMonth` (actual replaces the estimate), candidate ranking, fulfilled-month maps for reports, estimate-from-actuals hint |
| `cashFlow.test.ts` | `cashFlow.ts` | Month-start cash flow: projection, reconciliation delta (recurring entries + debt plan, deleted-debt payments excluded), fail-closed balance-map parsing |
| `budgetMonths.test.ts` | `budgetMonths.ts` | The single local month-key helper set (offsets, history window, labels) |
| `budgetBucketMath.test.ts` | `budgetBucketMath.ts` | 50/30/20 bucket totals, targets, variance, percentages |
| `categoryBucketResolve.test.ts` | `categoryBucketResolve.ts` | Which bucket each spend category lands in: override > custom default > built-in default |
| `expenseCategoryRows.test.ts` | `expenseCategoryRows.ts` | Budget Spending rows: per-category totals/limits/ratios, synthetic debt-payment rows, business-only filter, sort |
| `budgetInsights.test.ts` | `budgetInsights.ts` | Monthly Review: month summaries, month-over-month changes, 3-month comparisons, streaks (frozen clock) |
| `budgetPacing.test.ts` | `budgetPacing.ts` | Spending pace: current-month clock, day-weighted expected spend, over/ahead/on-track with early-month guard, alert ordering, ordinal days |
| `tipJarNudge.test.ts` | `tipJarNudge.ts` | Post-win Tip Jar cadence: Nth-win + minimum-days gating, disabled still counts, clock rollback, fail-closed state parse, per-win copy |
| `entryMemory.test.ts` | `entryMemory.ts` | Add-form memory: description dedupe/recency/category re-filing, chip suggestions (category recents vs typed prefix/substring across categories), exact-match category lookup |
| `recurringBillDetection.test.ts` | `recurringBillDetection.ts` | "Looks like a monthly bill": once-a-month-for-N-months rule, store exclusion, existing-bill/linked/deleted exclusions, average + median day, month-key shifting |
| `limitsSheet.test.ts` | `limitsSheet.ts` | Limits sheet rows: month fallback resolution, lookback average over months with data, average-to-limit rounding, drafts -> limit list with LWW timestamps |
| `categoryVisibility.test.ts` | `categoryVisibility.ts` | Selectable built-in list, protected fallback, fail-closed hidden-list parse, visible list ordering |
| `trackingStrip.test.ts` | `trackingStrip.ts` | Bridge tracking strip: month-to-date spend with bill fulfilment, live-limit total, days-since-last-logged ignoring projections, newest-N logged rows with bill labels |
| `quickStart.test.ts` | `quickStart.ts` / `data/quickStartTemplates.ts` | Onboarding templates: allocation sanity, lenient amount parse, seed = tidy limits + income/housing lines, zero-based totals pay exactly, nothing sized without income |
| `trackingReminderOffer.test.ts` | `trackingReminderOffer.ts` | One-time reminders offer shows only to a phone that never decided (enabled / sheet visited / dismissed all retire it) |
| `whatIfSpending.test.ts` | `whatIfSpending.ts` | "What if I stopped spending on X": category averages, redirect impact on payoff and savings |
| `purchasePlanner.test.ts` / `purchasePlanSettings.test.ts` | `purchasePlanner.ts` / `purchasePlanSettings.ts` | Plan-a-Purchase sinking funds: monthly need, Ark-step guidance, plan ordering (snowball / soonest / custom), reorder assignments, rollover vs parallel month-by-month projection, list summary and slider suggestions, hours-of-work, finance-vs-save and per-debt opportunity-cost math; fail-closed plan-list + cost-analysis settings parse |
| `emergencyFund.test.ts` | `emergencyFund.ts` | EF goal resolution (explicit goal > Keel synthetic > linked savings accounts), savings reserve sum |
| `savingsGoals.test.ts` | `savingsGoals.ts` | EF contribution application, EF source selection |
| `paycheckMath.test.ts` | `paycheckMath.ts` | W-2 / 1099 rollups: tax set-aside, 401(k) contributions, monthly summary |
| `taxCalc.test.ts` | `taxCalc.ts` | Take-home pay: 2026 federal brackets, state tables, FICA, filing statuses |
| `netWorth.test.ts` | `netWorth.ts` | Net worth totals, reserve-category counting, linked-account double-count guard |
| `bridgeMath.test.ts` | `bridgeMath.ts` | Bridge tab derivations: trailing cash flow (January/February year boundary), account changes/breakdown, holdings-by-category sections, donut slices, next-quote-refresh label |
| `holdingsMath.test.ts` | `holdingsMath.ts` | Holding valuation: shares × price, proxy anchors, manual values, cost basis gain/loss |
| `accountValueHistory.test.ts` | `accountValueHistory.ts` | Per-account rise/drop tracker: daily upsert/retention, baseline per window, category roll-up, fail-closed sanitizer |
| `assetBalanceDeltas.test.ts` | `assetBalanceDeltas.ts` | Applying budget-entry deltas to linked asset balances |
| `linkedAccountRecurring.test.ts` | `linkedAccountRecurring.ts` | Linked-account catch-up: missed recurring months credited, orphan-account skip, marker advancement |
| `linkedAccountRecurringApply.test.ts` | `linkedAccountRecurringApply.ts` | The side-effecting shell: save order that prevents double-credit |
| `recurrence.test.ts` | `recurrence.ts` | Recurring-entry cadence, occurrence counting, month projection |
| `annualReport.test.ts` | `annualReport.ts` | Year-in-review aggregation, months-under-budget, sparkline, PII-free share text (frozen clock) |
| `businessReport.test.ts` / `personReport.test.ts` | `businessReport.ts` / `personReport.ts` | Business / person spending reports and CSV rows |
| `receiptExport.test.ts` | `receiptExport.ts` | Receipt zip export planning (no filesystem) |
| `cardKeepAlive.test.ts` / `cardKeepAlivePlanner.test.ts` | `cardKeepAlive.ts` / `cardKeepAlivePlanner.ts` | Card inactivity deadlines, banner state, reminder planning |
| `entryPeople.test.ts` | `entryPeople.ts` | Multi-person assignment: `personId`/`personIds` reconciliation, write normalization, even shares |
| `trackingReminderPlanner.test.ts` | `trackingReminderPlanner.ts` | Check-in reminder scheduling plan |
| `achievements.test.ts` | `achievements.ts` | Achievement evaluator: unlock-once, revoke rules, first-run gating |

### Currency, money input & formatting

| Suite | Module under test | Feature it guards |
| --- | --- | --- |
| `currencyConversion.test.ts` | `currencyConversion.ts` | USD conversion table, milestone localization |
| `currencyMigration.test.ts` | `currencyMigration.ts` | "Convert my amounts": scales every stored money field, bumps `updatedAt` |
| `currencyPreferences.test.ts` | `currencyPreferences.ts` | Currency-preference validation + option lookup (prototype-key safe) |
| `exchangeRates.test.ts` | `exchangeRates.ts` | Live FX: response validation, cache reuse/refresh, offline fallback |
| `exchangeCalculator.test.ts` | `exchangeCalculator.ts` | Converter math + amount parsing |
| `parseMoneyInput.test.ts` | `parseMoneyInput.ts` | The one money-input parser (comma rule, negatives, caps, never -0) |
| `money.test.ts` | `money.ts` | Cents rounding, bank-balance formatting |
| `dateFormat.test.ts` / `entryDate.test.ts` | `dateFormat.ts` / `entryDate.ts` | Month/day labels; local year-month for entries |

### Import, export & backups

| Suite | Module under test | Feature it guards |
| --- | --- | --- |
| `importData.test.ts` | `importData.ts` | JSON import: validation, merge vs replace, last-write-wins, stale-age, encrypted-payload gating, learning progress |
| `importData.merge.test.ts` | `importData.ts` | Replace-mode `keysToRemove` never touches unrelated keys (past data-loss bug), legacy flat `budgetLimits` wrap, snapshot / custom-category / singleton merges |
| `exportData.test.ts` | `exportData.ts` | Export payload shape, no connection-secret keys, encrypt→decrypt round-trip |
| `exportEncryption.test.ts` | `exportEncryption.ts` | v3 encrypt-then-MAC envelope: tamper evidence, wrong password, golden fixture at production PBKDF2 cost (fast cases use the test-only iteration override) |
| `spreadsheetImport.test.ts` | `spreadsheetImport.ts` | .xlsx/.csv import: amount/date parsing, row mapping, artifact filtering, skipped-row reporting |
| `spreadsheetImport.rows.test.ts` | `spreadsheetImport.ts` | Limit / payment / savings-goal row mappers, Excel serial dates, 5 MB and 5000-row caps |
| `spreadsheetExport.test.ts` | `spreadsheetExport.ts` | Sheet structure, totals, partial-export flagging |
| `spreadsheetExport.csv.test.ts` | `spreadsheetExport.ts` | CSV formula-cell neutralization (CWE-1236), recurring projection at 3/6/12-month intervals with day-31 clamping |
| `spreadsheetRoundTrip.test.ts` | export + import | Schema-alignment guard: real export → re-import |
| `demoDataGenerator.test.ts` / `demoDataStartupSmoke.test.ts` | `scripts/generate-demo-data.mjs` + import | Screenshot fixture generates, imports, and satisfies every startup read (structural invariants, not exact counts) |
| `shareTempFile.test.ts` | `shareTempFile.ts` | Plaintext export files are deleted after the share sheet, success or failure |

### Security & trust boundaries

| Suite | Module under test | Feature it guards |
| --- | --- | --- |
| `recordValidators.test.ts` | `recordValidators.ts` | Import / sync validation of every record type, including explicit reject cases |
| `sanitize.test.ts` | `sanitize.ts` | Control-character stripping on text input |
| `paymentUrl.test.ts` | `paymentUrl.ts` | Payment-URL normalization and scheme rejection |
| `quickAddLink.test.ts` | `quickAddLink.ts` | Widget deep-link builder + fail-closed parser (category names only) |
| `appLock.test.ts` | `appLock.ts` | PIN validation, record parsing, escalating lockout, clock-tamper clamp |
| `versionGuard.test.ts` / `updateReleaseNotes.test.ts` | `versionGuard.ts` / `updateReleaseNotes.ts` | OTA downgrade guard; release-note message parsing |
| `searchFilter.test.ts` / `guideSearch.test.ts` | `searchFilter.ts` / `guideSearch.ts` | Global search + advanced filters; guide search |
| `recordTimestamps.test.ts` | `recordTimestamps.ts` | `ensureUpdatedAt` normalizer, NaN-safe timestamp compare |
| `errorMessage.test.ts` / `haptics.test.ts` / `iosNativeShare.test.ts` / `uuid.test.ts` | matching modules | Error text, haptic wrapper, native share + screen-guard, UUID delegation |

### Storage layer (`src/storage`, `src/crypto`)

Storage suites mock `encryptedStorage` with an in-memory `Map` (including a
faithful `updateItem` read-modify-write) and run the real store logic.

| Suite | Module under test | Feature it guards |
| --- | --- | --- |
| `encryptedStorage.test.ts` | `encryptedStorage.ts` | V1/V2/V3 golden byte-compat fixtures, secret writes never degrade to plaintext (`requireEncryption`) |
| `encryptedStorage.multi.test.ts` | `encryptedStorage.ts` | `multiSet` / `multiRemove` queue ordering, duplicate-key throw, fail-closed decrypt, migration stale-write guard |
| `nativeCrypto.test.ts` | `crypto/nativeCrypto.ts` | quick-crypto vs crypto-js cross-implementation compatibility |
| `budgetStorage.test.ts` | `budgetStorage.ts` | Atomic entry CRUD, bulk delete/restore, `saveBudgetEntries` merge-back, limit tombstones + 13-month history pruning |
| `debtStorage.test.ts` / `debtStorage.crud.test.ts` | `debtStorage.ts` | Deterministic-id payments, duplicate repair; debt CRUD/tombstones, `restorePayment` with `appliedAmount`, legacy `car_house` split, payoff-strategy envelope migration |
| `assetAccountStorage.test.ts` | `assetAccountStorage.ts` | Atomic account CRUD + balance adjustments |
| `tombstones.test.ts` | `tombstones.ts` | Shared soft-delete primitives: merge preserving tombstones, untombstone, TTL purge with NaN-age guard |
| `collectionRepair.test.ts` / `referentialCleanup.test.ts` | `collectionRepair.ts` / person+business stores | Atomic read-repair; person/business deletion cascades to merchant rules and links |
| `customCategoriesStorage.test.ts` | `customCategoriesStorage.ts` | Name validation, icon normalization, cap, collision rules, fail-closed reads |
| `monthlyBalanceStorage.test.ts` / `netWorthSnapshotStorage.test.ts` | matching modules | Month-start balances + prompt tracking; daily net-worth history retention/repair |
| `reviewInboxStorage.test.ts` | `reviewInboxStorage.ts` | Ingest-ledger TTL pruning, partner-synced dismissal merge (newer `at` wins), 500-item inbox cap ordering |
| `connectionSecretsStorage.test.ts` | `connectionSecretsStorage.ts` | Rule 2: `EncryptionUnavailableError` propagates, provider-mismatch refusal |
| `exchangeRatesSettingsStorage.test.ts` / `dataChangeNotifier.test.ts` | matching modules | Disclosure ack fails closed; cross-tab change notifications |
| `tipJarNudgeStorage.test.ts` | `tipJarNudgeStorage.ts` | Win counter persists across calls, Nth win claims the nudge atomically, stale `enabled:false` dropped, corrupt record recovery |
| `purchasePlanSettingsStorage.test.ts` | `purchasePlanSettingsStorage.ts` | Device-local plan-list settings: patch merge between the two owning components, fail-closed over a corrupt record |
| `hiddenCategoriesStorage.test.ts` | `hiddenCategoriesStorage.ts` | Hidden built-ins: hide/restore round-trip, idempotent, protected/unknown names ignored, corrupt record reads empty |

### Bank connections (`src/services/connections`)

| Suite | Module under test | Feature it guards |
| --- | --- | --- |
| `simplefinParser.test.ts` / `tellerParser.test.ts` | provider parsers | Fail-closed parsing of bank responses (https enforced for SimpleFIN) |
| `http1.test.ts` / `tellerMtlsClient.test.ts` | transport | Minimal HTTP/1 client; Teller mTLS peer-identity verification |
| `ingest.test.ts` / `merchant.test.ts` | `ingest.ts` / `merchant.ts` | Transaction ingest planning (dedupe, twins, pending→posted), inbox reconciliation against partner-synced entries/dismissals, the synced-dismissal selector, merchant normalization |
| `syncGate.test.ts` / `linkPreferences.test.ts` | `syncGate.ts` / `linkPreferences.ts` | Sync gating, fetch windows incl. explicit re-import, gap backfill for a bank that came back after going dark; account-link edit rules |
| `debtBalances.test.ts` | `debtBalances.ts` | Bank → credit-card balance mirroring: sign-tolerant magnitude, high-water `originalBalance`, link/debt gating |
| `assetCategoryHint.test.ts` | `assetCategoryHint.ts` | Bridge category guessed from a bank account name (401k/IRA → retirement, HSA, brokerage, savings, checking; fallback checking) |
| `reviewInboxService.test.ts` | `reviewInboxService.ts` | Approve/skip/bulk flows, merchant-rule creation and edits, crash-safe write order, storage-backed inbox reconciliation |
| `connectionsSyncService.test.ts` | `connectionsSyncService.ts` | Per-connection orchestration: gates, provider routing, balance clamping, keep-alive stamping, failure isolation, secrets never written to non-secret keys |

### Partner sync (`src/sync`)

| Suite | Module under test | Feature it guards |
| --- | --- | --- |
| `diffEngine.test.ts` / `diffEngine.collections.test.ts` | `diffEngine.ts` | The LAN-sync trust boundary: outgoing filtering, incoming validation, last-write-wins + tombstones for every collection, limit-history first-sync split, bucket-override merge, dismissed-transaction send/validate/merge + inbox reconcile hook |
| `transportService.test.ts` | `transportService.ts` | Full-envelope HMAC, protocol-version gate, age + nonce replay protection (fake timers), frame buffering |
| `pairingService.test.ts` / `pairingStorage.test.ts` | `pairingService.ts` / `pairingStorage.ts` | Pairing handshake flows and codes; sync watermark reset after import |
| `syncOrchestrator.test.ts` / `autoSyncManager.test.ts` / `discoveryService.test.ts` | matching modules | End-to-end sync coordination; auto-sync gates; mDNS publish/browse |

### Data, hooks & notifications

| Suite | Module under test | Feature it guards |
| --- | --- | --- |
| `releaseNotes.test.ts` | `data/releaseNotes.ts` | Versions valid, strictly descending, unique; `RELEASE_NOTES[0]` matches `app.json` |
| `achievementDefs.test.ts` / `featureSpotlights.test.ts` / `coachmarkContent.test.ts` / `connectionGuides.test.ts` / `lessonIndex.test.ts` | `src/data/*` | Badge rules, spotlight gating, coachmark/guide content integrity, lesson topic index |
| `useSliderValueEditor.test.ts` | `hooks/useSliderValueEditor.ts` | Tap-to-type slider helpers: text sanitizing per field type, commit rounding/snapping, below-min rejection |
| `trackingReminders.test.ts` / `cardKeepAliveReminders.test.ts` | `notifications/*` | Rule 11: scheduled notification content is a fixed string that never carries amounts, balances, or account/card names |
| `attachmentStore.test.ts` / `attachmentSweep.test.ts` | `services/attachments/*` | Encrypted receipt files, half-pair cleanup, orphan sweep |
| `autoBackupPlan.test.ts` / `autoBackupStore.test.ts` | `services/autoBackup/*` | Weekly backup decision rules; encrypted writes, prune-after-write, fail-closed reads |

### Mocks at the I/O edges

The pure-math suites import nothing native. Suites that touch React Native,
Expo modules, storage, or crypto mock those edges per file while the **real**
logic runs:

- `../storage/encryptedStorage` → an in-memory `Map` (seed / inspect it directly).
- `expo-file-system`, `expo-document-picker`, `expo-image-manipulator`,
  `expo-notifications` → test-controlled fakes (capture the calls).
- `react-native` (`Share`, `Platform`, `AppState`) → lightweight stubs.
- `react-native-quick-crypto` → Node's `crypto` via `src/crypto/quickCryptoNodeShim.js`
  (mapped in `jest.config.js`), so the real OpenSSL math runs.
- `crypto-js` and `xlsx` are **not** mocked. PBKDF2 is intentionally slow;
  `exportEncryption` exposes `__setPbkdf2IterationsForTests`, a no-op outside
  `NODE_ENV === "test"`, so most envelope tests run at a low iteration count
  while the golden fixture still runs at the production 250k.
- `uuid` is ESM-only and is mocked wherever a module pulls it in.

## Setup notes

- Runner: **Jest + ts-jest** on a Node environment (`jest.config.js`), default
  5 s per-test timeout; the two real-timer handshake suites
  (`pairingService`, `syncOrchestrator`) set `jest.setTimeout(15000)` themselves.
- These modules have **no React Native imports**, so the suite does **not** use
  `jest-expo`. If you ever need component tests, add a separate
  `jest-expo`-based Jest project rather than changing this one.
- `isolatedModules: true` (in `tsconfig.json`) makes ts-jest transpile each
  file on its own - quick, but it does **not** type-check. `npm run typecheck`
  does, tests included.
- Coverage is a **ratchet** (`coverageThreshold` in `jest.config.js`): set just
  below the measured numbers, raised as coverage grows, never lowered to green
  a build. Scope: `src/{utils,data,sync,storage,crypto,services,hooks,notifications}`.
- Prefer deterministic clocks: `jest.useFakeTimers().setSystemTime(...)` or a
  `now` parameter. Never assert against two live `Date` reads.

## Adding tests

Drop a `*.test.ts` file under the nearest `__tests__/` folder beneath `src/`,
start it with a doc comment saying what it guards, and build records with the
shared fixtures. Prefer testing pure functions - given inputs, assert outputs.
When a module pulls in React Native or storage, extract the pure logic into a
helper and test that, keeping the side-effecting shell thin (see
`utils/bridgeMath.ts`, `utils/debtTrackerMath.ts`, `utils/expenseCategoryRows.ts`
for the pattern).

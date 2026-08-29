# BudgetArk Release Notes

## v1.10.0 - Sturdier Sync, Safer Data (2026-08-28)

**OTA-shippable.** Pure JS; `runtimeVersion` stays 1.9.0, so existing 1.9.0 builds receive this over the air. Minor bump rather than patch: no breaking change anywhere (protocol, HMAC, and envelope untouched; the only sync addition is an optional field older peers ignore; 1.9.x exports still import), but bank-mirrored credit-card balances are a new capability and the data-integrity fixes below change behaviour users will notice - together they deserve more than a "bug fixes" line.

- **Bill fulfilment: actual charges replace recurring estimates.** New optional `BudgetEntry.fulfillsRecurringId` marks a one-off expense as THE charge for a recurring bill in the month of its date. `utils/billFulfillment.ts` (pure, unit-tested) owns the rule: `entriesForMonth(entries, monthKey)` = `isEntryActiveInMonth` minus recurring projections an actual fulfils that month. Every consumer that used to filter on `isEntryActiveInMonth` directly now goes through it (Budget screen, `budgetInsights`, `bridgeMath`, `cashFlow`, `chartCalculators`, `purchasePlanner`, `whatIfSpending`, `annualReport`, `achievementDefs`; `businessReport`/`personReport` use `listUnfulfilledOccurrenceMonths`), so estimate-or-actual, never both, holds app-wide. The link lives on the actual, not the bill: deleting the actual restores the projection with no cleanup, older peers/importers ignore the field, and no `SyncDiff`/protocol change was needed. Candidates are recurring expenses without a linked account (linked contributions credit an asset on a schedule and must keep projecting); an actual whose bill is gone, one-off, linked, or off-cycle that month is just an ordinary entry.
- **Surfaces.** Add/Edit Entry gains an "Applies to bill" pill row (`rankBillCandidates`: unfulfilled bills for the chosen month, same category first, then closest estimate); a stale pick is dropped at submit. Spending rows show `🧾 <bill> · est. $X` on the actual and a "Log actual" chip on each projected bill row (`SpendingCard.onLogActual` → add sheet prefilled via `BudgetEntryModal.initialBill`, applied on the closed→open edge with the render-time `useValueChanged` pattern, not an effect). `expenseCategoryRows` takes an optional `entriesById` to label the badge.
- **Review Inbox + merchant rules learn the bill.** Expanded rows get the same picker (month of `postedAt`), approval passes `fulfillsRecurringId` (null = explicitly none, undefined = the item's suggestion), and "Always do this" stores `MerchantRule.recurringEntryId`; `planIngest`/`replanInboxForRules` derive `PendingTransaction.suggestedRecurringId` (outflows only). `approvePendingTransaction` re-validates every link against the live entries (`resolveFulfillment`) so a stale rule never writes a dangling id; auto-approve goes through the same check. `changeMerchantRule`/`buildMerchantRuleUpdate` carry the field with the businessId tri-state; the Rules screen shows and edits it. Rules stay device-local as before.
- **Bill calendar and reminders.** `groupBillsByDay` represents a fulfilled bill by its actual on the day it posted (projection dropped); `includeFulfilled: false` for `nextBillFrom`/`upcomingBillsWithin` so the 7-day banner and "next" never nag about a paid bill; `splitPaidVsRemaining` counts an actual as paid whatever its day. Day sheet rows read "✓ Paid (actual)".
- **Estimate hint, never auto-drift.** Editing a bill with ≥2 actuals shows "your last N actual charges averaged $X" and a one-tap "Use $X" (`suggestEstimateFromActuals`, last 3, silent when equal). The estimate changes only on that tap - by decision, so the budget line never moves on its own.
- **Spending pace on budget limits.** New pure `utils/budgetPacing.ts`: `pacingClockFor(monthKey, now)` (null unless the viewed month is the device's current local month), `computeCategoryPacing(spent, limit, clock)` -> expected-by-today, projected month-end (`spent / elapsedFraction`), and `over | ahead | on-track` (ahead needs `MIN_ELAPSED_FOR_AHEAD` = 10% of the month elapsed and a projected overshoot beyond `AHEAD_TOLERANCE` = 5%, so day-2 noise never flips a bar), and `buildPaceAlerts(rows, clock)` ordered over-limit (by overshoot) then ahead (by projected overshoot). Spending card: a pace mark at `expectedRatio` on each limited bar, amber fill when ahead, and the expanded header says "On pace - $X expected by today" / "Ahead of pace" / "Over limit by $Y". New `SpendingPaceBanner` above the card renders only when an alert exists (hidden in the business-only view, which drops limits by design); tapping it expands the headline category via `SpendingCard.expandCategoryRequest` (render-time `useValueChanged`, not an effect). Passive by rule: no notifications, no amounts on the lock screen.
- **Real dates for manual entries.** `BudgetEntryModal` stamped every non-recurring entry on `DEFAULT_RECURRENCE_DAY` (15) and edit mode preserved whatever day was stored, so hand-typed entries could never carry the day they happened while bank-imported ones did. The form now has a DAY grid for one-offs (sized to the chosen month, defaults to today, "Today" shortcut, clamped when the month changes) and the day state (`entryDay`, formerly `recurrenceDay`) feeds `buildEntryDateISO` on both add and edit. Recurring bills keep the 31-day "day it hits" picker and the month label reads "Start month". No storage change: `date` was always a full ISO string.
- **Spreadsheet schema v8.** Budget Entries gain a round-tripping `FulfillsBillId` column (import keeps it only on one-off expenses); `expandRecurringRows` omits the projected copy for months an actual covers, matching the app. Round-trip fixture `e10` pins it.
- **Tests:** `billFulfillment.test.ts` (21) plus fulfilment cases in `billCalendar`, `expenseCategoryRows`, `reviewInboxService` (validation, suggestion fallback, auto-approve, rule tri-state), `ingest`, `spreadsheetExport.csv`, `spreadsheetRoundTrip`. Suite: 1,951 tests.
- **Bank-connected credit-card balances on the Debts tab.** `ExternalAccountLink.debtId` now means "this provider account IS this card": every sync mirrors the provider balance onto `Debt.balance` (new pure planner `services/connections/debtBalances.ts`) in the same `updateDebt` write as the card keep-alive stamp (`applyDebtLinks` in `connectionsSyncService`, replacing `applyKeepAliveStamps`; still best-effort, one write per card per pass, unchanged balances skipped). Debt-balance changes count toward `ConnectionSyncResult.balancesUpdated`.
- **Amount owed = |provider balance|.** SimpleFIN servers report a card's balance negative and Teller's docs don't specify a sign, so the magnitude is used regardless (`debtBalanceFromProvider`). Documented trade-off: an overpaid card shows its credit as a small owed balance instead of a real balance ever showing as $0.
- **`originalBalance` as a high-water mark.** When the mirrored balance exceeds `originalBalance`, it is raised to match so the payoff ring / "paid off" figure never go negative after new charges (and stays ≥ 0.01 for older peers' validators).
- **New `ExternalAccountLink.updateDebtBalance?: boolean`** (per-device; undefined = on, so a link made for keep-alive before this release starts mirroring without a re-save). Keep-alive stamping is unchanged and rides the same link whenever the watch is on.
- **Debt editor.** `AddDebtModal`'s account picker moved out from under the keep-alive section into its own "Connected bank account" section (independent of the watch), with a "Balance from bank: On/Off" toggle. With mirroring on, the Total Balance field is read-only and shows the link's last-known provider balance ("From <account> · as of <date>"); the submitted balance is that value. Extras type renamed `DebtKeepAliveExtras` → `DebtBankLinkExtras { linkId, updateBalance }`; the screen's `applyKeepAliveLink` → `applyBankLink`.
- **Debts tab.** Expanded `DebtCard`s show "🏦 Balance from <account> · as of <date>", derived on-device from links (`DebtTrackerScreen` loads them with the debts and refreshes on the bank-sync data-change reload). Partners see the balance move, not the line. Connections manager rows read "updates a card on Debts" for linked accounts.
- **Feature spotlight** `bank-card-balances` (OTA, no runtime gate) with a Debts-tab CTA.
- **Mission statement opens onboarding.** `OnboardingScreen` gains a "mission" step ahead of the theme picker (4 steps; Skip Setup / Next / Back wired like the others), rendering `MISSION_STATEMENT` from `data/missionStatement.ts` - the same constant as the Profile `MissionCard`, so the two can't drift. The statement gained a second paragraph (`MISSION_STATEMENT.invite`) asking for ideas via Send Feedback on the Profile tab - features, fixes, new themes - shown on the onboarding page and in the expanded Profile card.
- **Multi-person expenses.** `BudgetEntry.personIds?: string[]` (validated: ≤ `MAX_PEOPLE` safe ids) alongside `personId`, which stays the FIRST assignee so older peers, JSON restores and v5/v6 spreadsheets still see one person. `utils/entryPeople.ts` is the single reconciliation point: `entryPersonIds` (the single field wins when the list no longer contains it - an older peer edited the assignment) and `personAssignmentFields` (one person is still stored the pre-multi way, so nothing changes for existing data). `BudgetEntryModal`'s people pills are multi-select (each dangling id gets its own untag pill); `computePersonMonthSpending` and `computePersonReport` split shared amounts evenly (`personShare`) so totals still sum to real spend; the Budget entry badge lists every name; `ManagePeopleModal` counts a shared entry for each person. Spreadsheet schema v7 adds a `PersonIds` (";"-joined, round-trip) column and `Person` lists every name. Review Inbox / merchant-rule suggestions stay single-person.

- **Data integrity: screen saves no longer erase synced records.** Budget and asset-account CRUD is atomic read-modify-write through `updateItem` (`addBudgetEntries`, `updateBudgetEntry`, `adjustAssetAccountBalances`, ...), so a partner sync, bank sync, or import landing behind a mounted screen is never reverted by a stale in-memory array. `storage/dataChangeNotifier.ts` re-runs tab loaders after those events. Incoming sync diffs merge inside `updateItem` per collection (`merge*FromSync`), and deleting a person/business - locally or via a partner's tombstone - cascades to merchant rules and bank-account links.
- **Sync: budget-limit removals propagate.** `CategoryBudgetLimit.deletedAt` (optional; older peers treat the row as live exactly as before) lets `saveCategoryBudgetLimits` tombstone omitted categories instead of leaving the partner to re-send the old limit forever. Missing `updatedAt` is normalized on read (`utils/recordTimestamps.ensureUpdatedAt`) and every LWW compare is NaN-safe; `importFromString` resets the sync watermark so a restore is followed by a full re-exchange (display-only `lastSyncCompletedAt` keeps the Profile label).
- **Bank connections.** `planIngest` claims twins so a pending decision (approve/skip/rule) follows the posted transaction by fingerprint, suggestions are shared by the update paths, description drift is compared against the capped text, and one posted transaction can satisfy one ledger decision; Tip Jar and Build-Your-Ark auto entries use the local calendar date (`entryDate.localYearMonth`). Teller postMessage fields must be non-empty strings.
- **Backups & spreadsheets.** Learning progress is exported/imported (`learningProgress`, union-earliest merge; still device-local for sync). Spreadsheets round-trip `keepAlive*` on debts, `AppliedAmount` on payments, and every holdings shape (name / manual value / anchors / account). Replace-mode import removes only keys it owns.
- **Disclosure & privacy.** The first display-currency switch shows the exchange-rate disclosure (`data/exchangeRatesDisclosure.ts`, consent in `@budgetark_exchange_rates_settings`, deliberately not in the reset key list) before the first open.er-api.com GET. Plaintext export files are deleted after the share sheet closes on every path (`utils/shareTempFile`); the spreadsheet export trace is `__DEV__`-only.
- **Fail closed, surface errors.** Pairing and App Lock records write with `requireEncryption`; `encryptedStorage.multiSet` gained the same option and now claims its per-key queue slot before awaiting the vault key (a same-tick `setItem` could previously be overwritten). App Lock's lockout countdown is clamped to the maximum lockout so a clock set back can't strand the user. Storage failures in Review Inbox, Merchant Rules, People/Businesses, Purchase Planner, Auto-backup, Connections, Charts, the month-balance prompt, and App Lock setup render inline (`utils/errorMessage.describeError`) instead of being swallowed.
- **Data hygiene.** A debt class BudgetArk inferred (or split from legacy `car_house`) is stamped `debtClassSource: "inferred"` rather than keeping a stale "manual"; custom-category names collide with built-ins case-insensitively (`collidesWithBuiltInCategory`).
- **Refactors (no behaviour change intended).** ChartsScreen 3,443 -> 2,189 lines (`LoanCalculatorCard`, `CurrencyExchangeCard`, `WhatIfSpendingCard`, shared `theme/toolStyles` + `SliderRow`); BudgetScreen 3,354 -> 2,589 (`SpendingCard`, `FoodSplitModal`, `utils/expenseCategoryRows`, `categoryBucketResolve`); Debts/Bridge math in `utils/debtTrackerMath` and `utils/bridgeMath` (the two `react-hooks/purity` disables are gone); `hooks/usePinVerifier` shared by the launch gate and setup modal; `people/PeopleProvider`, `SheetModal`, `TagPillPicker`, `CodeChipGrid`, `usePresentAfterDismiss`, `utils/budgetMonths`, `parseMoneyInput`, the `emergencyFund` resolver; `ThemeColors.overlay/overlayStrong` scrim tokens and `accentButtonText` on accent fills.
- **Tests:** 96 -> 123 suites, 1,388 -> 1,917 tests (incl. the new `debtBalances.test.ts` - magnitude/rounding, toggle default, high-water mark, link/debt gating - six sync-orchestrator cases for the merged balance+stamp write, and `entryPeople.test.ts` plus multi-person cases in the insights, report, validator and spreadsheet round-trip suites); coverage ratchet raised to L80/S79/B76/F75 (measured L81.8/S80.9/B77.8/F76.3) with `src/hooks` and `src/notifications` now collected. New suites for the previously untested stores/services (budget, tombstones, review inbox, connection secrets, sync + inbox services, notification rule-11 guard, release notes), thin branches in debtStorage/encryptedStorage/importData/spreadsheets/diffEngine/validators/calculations, typed fixtures in `src/__tests__/fixtures.ts`, deterministic clocks, and a rewritten `docs/testing.md`.

## v1.9.3 - Change Your Bank Account Choices Anytime (2026-08-26)

**OTA-shippable.** Pure JS; `runtimeVersion` stays 1.9.0, so existing 1.9.0 builds receive this over the air.

- **Fixed: pending bank transactions resurfacing as duplicates once posted.** `planIngest` recognizes a posted transaction that came back under a new provider id by fingerprint (`account|amount|day`). The inbox-twin path already allowed `PENDING_MATCH_WINDOW_DAYS` (±4) on the day, but the ledger path - a twin already approved/dismissed while pending - required the exact day. The fingerprint is stamped with the pending item's transacted date while the posted twin carries the settlement date (typically 1-3 days later), so every decide-while-pending case missed, produced a fresh inbox item, and an always-approve merchant rule would turn it into a duplicate `BudgetEntry` without the user seeing it. Ledger fingerprints are now indexed by `account|amount` and matched on day within the same ±4-day window (nearest day wins; malformed stored values never match). Stored fingerprint format is unchanged, so existing ledger decisions keep working - no migration. Regression tests cover 1-4 day settlement, dismissals, out-of-window/different-amount, nearest-day tie-break, and `splitPendingFingerprint`. Known gap: a posted amount that differs from the pending one (e.g. a tip added) is still a genuinely new item.

- **Bank-account link choices are editable after setup.** The Add Connection wizard's mapping step was one-shot: an account given "None" for balance updates on day one could never be mapped later, which also meant no Bridge account existed to designate as the emergency fund (v1.9.2). Each linked account row in the Connections manager (`ConnectionsModal`) now carries an "Import transactions" checkbox and a "Balance updates" picker - None / any existing cash-holding account / "+ New account" inline form (name + category; a Savings pick hints that it can be marked as the emergency fund from the Bridge).
- **Immediate, sync-consistent effects.** New `updateLinkPreferences` in `connectionsService` applies a pure plan from `services/connections/linkPreferences.ts`: a newly chosen target is seeded with the link's last-known provider balance (clamped at 0, same as the sync path) so the Bridge - and a linked emergency fund - is right without waiting out the sync cooldown; turning import on clears the connection's sync window for the initial backfill, exactly like `finalizeAccountLinks` (the ingest ledger still dedupes). `MAPPABLE_ASSET_CATEGORIES` moved to the service and is shared by the wizard and the manager so both offer the same targets.
- **Tip Jar → budget entry.** After a completed tip, the thank-you view offers to log it as today's expense under the built-in Giving category (`TipJarModal`). Only an explicit tap creates the entry; it's an ordinary `BudgetEntry`, editable/deletable in Budget. The offer renders only when the store returned a real positive price.
- **Tests:** new `linkPreferences` planner suite (no-op detection, `updateBalance` tracking, backfill-on-enable, balance seeding + clamp) plus the pending→posted ledger regression cases - 1276 tests across 84 suites.

## v1.9.2 - Emergency Fund, Linked to Your Savings (2026-08-20)

**OTA-shippable.** Pure JS; `runtimeVersion` stays 1.9.0, so existing 1.9.0 builds receive this over the air.

- **Designate savings accounts as the emergency fund.** New optional `isEmergencyFund` flag on `AssetAccount`, set via a checkbox in the Bridge account editor (savings category only; saving under any other category clears it). When at least one live account is flagged the fund is "linked": its value is the flagged accounts' combined balance, kept current by bank-connection balance pushes. Resolution lives in new pure helpers (`src/utils/emergencyFund.ts` - deliberately separate from `savingsGoals.ts` so pure consumers don't inherit its uuid dependency).
- **One value everywhere.** Linked resolution feeds the Bridge EF row ("From N savings accounts", 🛡️ markers on flagged accounts), Budget's EF display, the Charts emergency-fund plan, the Galley Stocked badge (`AchievementContext` gains `assetAccounts`), and the Keel/Deck Ark milestones plus the deck runway estimate on the Debts tab. `calculateNetWorthTotals` skips the emergency_fund goal's stored amount in linked mode - the balances are already summed, so the fund is never double-counted (this also removes the Bridge tracked-total double count for linked users).
- **Manual contributions disabled while linked.** The EF contribution entry points are gated with handler guards, and the Keel/Deck "Set Savings" editor is replaced by a pointer to the Bridge - a Savings-entry correction would no longer move the fund. Un-designating every account falls back to the goal's stored amount, untouched.
- **Round-trips everywhere data goes.** The flag flows through partner sync and JSON backups (`isAssetAccountItem` accepts a strict optional boolean - truthy non-booleans are rejected fail-closed), and the Asset Accounts sheet gains an `EmergencyFund` column ("yes"/blank, spreadsheet schema v6, both schema docs updated) so a backup/restore cycle can't silently flip the fund back to manual tracking. Older app versions ignore the field; sync wire format unchanged.
- **Tests:** new resolver suite plus cases for net worth, validators, achievements, and the spreadsheet round-trip - 1256 tests across 83 suites.

## v1.9.1 - Stability & Security Fixes (2026-08-14)

**OTA-shippable.** Pure JS + lockfile changes; `runtimeVersion` stays 1.9.0, so existing 1.9.0 builds (including the Play closed test) can receive this over the air.

- **Onboarding walkthrough iOS freeze fixed.** Chaining one spotlight Modal per tab raced iOS's present/dismiss cycle - the timer before navigating to the next tab could fire while the previous Modal was still dismissing, leaving a stuck transparent modal window that ate every touch (reported on iPhone 13, timing-dependent by iOS version). The spotlight now renders as an absolutely-positioned overlay in the screen's own tree - no UIKit presentation, nothing to race - with BackHandler parity on Android and synchronous guided-tour navigation replacing the timer.
- **Storage failures at startup no longer reset onboarding or blank Profile.** A read/write failure (full disk, degraded flash tripping the 5s storage timeout, DecryptionError) was swallowed on three paths: startup treated a failed user read as a fresh install and re-ran onboarding every launch, a failed onboarding save silently "succeeded" until next launch, and one bad read out of five left Profile on "Loading profile..." forever. Startup and Profile now show a retry screen, onboarding alerts with Try Again / Continue Anyway, and Profile's secondary reads degrade to defaults instead of failing the whole load.
- **Dependency security updates** (lockfile-only, all within existing semver ranges). App tree: nanoid 3.3.18 (GHSA-2v37-7h3g-55p8, infinite-loop fix incl. the React Native async variant - the only bump that ships in the JS bundle; the trigger is unreachable via react-navigation), postcss 8.5.26, shell-quote 1.10.0. Worker tree: wrangler 4.123.0, pulling patched sharp 0.35.2 (libvips CVEs), undici 7.29.0, and miniflare - `worker/quotes-proxy` now audits at 0 vulnerabilities. Remaining root-audit findings are the Expo/metro chain, addressable only by a deliberate SDK upgrade.
- **Tooling (dev-only):** demo-data generator for App Store screenshots.

## v1.9.0 - Bank Connections (2026-07-11)

**NOT OTA-shippable.** New native dependencies - `react-native-webview` (Teller Connect), `expo-iap` (Tip Jar), `react-native-quick-crypto` (native crypto), `expo-notifications` (Tracking Reminders), `expo-image-picker` + `expo-image-manipulator` (receipt photos) - bump `runtimeVersion` 1.4.14 → 1.9.0; both platforms need a new dev-client/EAS build, and existing runtimes never see this over the air. Also carries the Expo SDK 57 / RN 0.86 / TS 6.0 upgrade. No server/Worker changes: everything is device-to-provider by design.

### Bring-your-own-API bank syncing (`src/services/connections/`)

- **The user brings their own credentials; BudgetArk operates no aggregator.** Two providers, normalized into shared account/transaction shapes: **SimpleFIN Bridge** (one pasted setup token) and **Teller** (user's own developer cert; enrollment via Teller Connect in a WebView, token never leaves the device). Teller's mandatory mutual TLS runs over `react-native-tcp-socket` (already shipped for LAN sync) with a hand-rolled HTTP/1.1 layer - no new native module written for it. A completed Schwab connector was cut before release (narrowest audience, highest friction); it survives in git history.
- **Review Inbox: nothing enters the budget without approval.** New inbox on Budget (badge + modal, grouped by date, "likely transfers" set aside); approve/edit/skip per row, "always use this category" merchant rules with auto-suggested categories, bulk-approve. Linked accounts can also keep Bridge balances (and net worth) current automatically.
- **Duplicates are impossible by design.** `BudgetEntry` gains provenance (`source`, `externalTxId`, `merchant`); `planIngest` (pure, unit-tested) is the single dedup guardian: a ledger of decided transactions, tombstone-aware `externalTxId` checks (covers partner sync and restored backups), and a pending→posted fingerprint fallback for providers with unstable ids. Spreadsheet export/import and the import/sync validators round-trip the provenance fields so backups can't reopen decided transactions.
- **Privacy boundary.** Six new per-device stores in `encryptedStorage`; credentials never in raw SecureStore (Teller PEMs exceed its size limits), never synced, never exported (a regression test enforces the exclusion). Deleting a connection wipes credentials but keeps the decided-transaction ledger so reconnecting can't re-offer them.
- **Polite syncing:** auto at most every 6h per connection (SimpleFIN's daily budget), manual every 15min, attempts stamped before fetching so failing providers are never hammered; 7-day overlap window re-observes pending transactions until they post. Foreground AppState trigger + per-connection Sync Now.
- **Tests:** new suites for both parsers, ingest dedup, merchant normalization, cooldown/window math, the HTTP/1.1 codec, validator lockstep, export exclusion, and spreadsheet round-trip.

### Also in this release (2026-07-08 → 2026-07-12)

- **Security hardening.** SimpleFIN access URLs are https-only; `encryptedStorage.setItem` gains a `requireEncryption` option so bank credentials **throw** instead of silently falling back to plaintext when the OS keystore is unavailable.
- **In-app setup guide** for both providers: step-by-step instructions, costs, gotchas, privacy-at-a-glance, and a Start Setup shortcut into the wizard.
- **Teller: add another bank.** One Teller connection can hold multiple enrollments; existing account mappings never reset. SimpleFIN picks up new banks automatically.
- **Sync fix: double-counted debt payment.** Prompt-logged minimums carry a deterministic id (debt + month) so paired phones' confirmations merge into one record; existing duplicates are repaired automatically, genuine double payments untouched.
- **Tip Jar** (Profile): optional one-time tips via `expo-iap` (StoreKit 2 / Play Billing). Purchases consume immediately, unlock nothing, and nothing is persisted - the store connection only exists while the sheet is open.
- **Native crypto.** `react-native-quick-crypto` (OpenSSL) replaces crypto-js on the hot paths (backups, encrypted storage) - dramatically faster PBKDF2 on low-end devices. Legacy backup/storage formats still decrypt; golden-fixture tests pin that compatibility. LAN sync stays on crypto-js for wire compatibility.
- **Expo SDK 57 / RN 0.86 / TypeScript 6.0 upgrade.** `npx expo install --check` clean; eslint stays on 9.x (plugin ceiling). Golden-fixture tests lock v1/v2 encrypted-backup decryption so future dependency changes can't strand old backups.
- **React Compiler compliance.** All 43 `react-hooks` lint warnings refactored away across 23 files so the compiler optimizes those components; also fixes a latent coachmark reset bug. Repo lint: 0 warnings.
- **New theme: Deep Sea** (`deep_sea`, 2026-07-12) - third "Deep" ambient theme: abyssal navy-teal palette with a bioluminescent cyan-green accent; static seeded-SVG underwater background (`DeepSeaBackground.tsx` - surface light shafts, plankton motes, abyss vignette, same approach as Space/Forest). Defaults to the Glass surface style like Deep Space (explicit user choice wins). Pure JS - OTA-safe. Theme idea backlog added to TODO.md (Lighthouse, Chart Room, Harbor Dawn, Ledger).
- **New themes: Slate & Classic** (`slate` 2026-07-20, `classic` 2026-07-21) - Slate: graphite greys + mustard-yellow accent in the spirit of monkeytype's serika dark; warning shifted orange so it never blurs with the yellow accent. Classic: the Windows 98 palette verbatim (teal desktop bg, silver cards, navy accent with white button text, maroon danger). Both are colors-only presets (no ambient background, no per-theme fonts - the theme system is palette-only) - OTA-safe. Shared debut slide `slate-classic-themes` in FEATURE_SPOTLIGHTS.

### Tracking Reminders - opt-in check-in notifications (2026-07-12)

Local notifications only - planned on-device from the user's own activity (`expo-notifications`), no push token, no server. Payment/bill-due push was deliberately **rejected** (banks already send those; in-app banners cover due dates) - these target habit retention instead.

- **Two kinds, each behind its own toggle** (master default OFF): *quiet-spell check-ins* anchored 1/3/7 days after the newest budget entry - rescheduled on every app open/background, so logging an entry pushes every pending nudge out and active trackers never get pinged; and a *month-start planning* nudge on the 1st (set this month's goals, review last month). A check-in landing on a month-start day is dropped - never two notifications in one day.
- **Pure planner** (`src/utils/trackingReminderPlanner.ts`, 20 tests): 30-day window, 32-request cap, deterministic identifiers so replans are idempotent, rotating content-free copy - nothing sensitive on the lock screen.
- **Scheduler + app-root host:** Android channel, permission flow (permanent denial → Open Settings), idempotent cancel-ours-then-reschedule, banners suppressed while the app is foregrounded, taps (warm or cold-start) open the Budget tab.
- **Settings:** Profile → Tracking Reminders bottom sheet - per-kind toggles, cadence (daily / 3 days / weekly), time of day (morning / afternoon / evening). Per-device, never synced; Reset All Data wipes the settings and cancels everything pending.
- **Tests:** full suite as of 2026-07-12: 680 passing across 49 suites.

### Quick Entry home-screen widget - Android (2026-07-12)

One-tap expense logging from the launcher (`react-native-android-widget` - another native dep riding this same build; iOS deferred, WidgetKit needs a native Swift target).

- **Widget** (`src/widgets/QuickEntryWidget.tsx` + task handler): a 4x2 grid of six everyday expense categories (Grocery, Restaurant, Transportation, Shopping, Entertainment, Other). Each button is a native `OPEN_URI` click on a `budgetark://quick-add?category=<name>` deep link - no JS runs on the widget side, and nothing financial renders on the home screen. Header tap opens quick-add with no preselection. Custom `index.js` entry point registers the headless handler (Android-only require, so none of it reaches the iOS bundle).
- **Deep links land fail-closed** (`src/utils/quickAddLink.ts`, 10 tests - closes the standing "deep link validation" security TODO): builder + validator share one module; anything that isn't exactly a quick-add link is rejected (scheme/host anchored, length-capped, no extra path/fragment), categories decode then must exactly match a built-in or drop to "no preselection", control chars and malformed percent-encoding fail closed. `app.json` gains `"scheme": "budgetark"`.
- **Routing** (`QuickAddLinkHost` at app root, same shape as `TrackingReminderHost`): warm taps via the `url` event, cold starts via `getInitialURL` with the once-per-launch guard, retries until navigation is ready, then navigates Budget with a new `quickAdd` route param. BudgetScreen defers past the tab transition (the iOS silent-present pattern) and opens `AddBudgetEntryModal`, which gains an `initialCategory` prop applied only on the closed→open edge so it can never clobber an in-progress draft.
- **v2 ideas parked in TODO:** in-widget amount numpad (headless render + storage write - needs encrypted-storage-in-headless verification), user-configurable category set, iOS WidgetKit port.

### Receipt photos + business expense tracking (2026-07-12)

Two features built together: encrypted receipt attachments on entries (photo plumbing only - OCR stays future work) and per-business expense tagging with a tax-time report. Business tracking is pure JS; photos need this build's `expo-image-picker`/`expo-image-manipulator`.

- **Business entity (`src/storage/businessStorage.ts`).** `Business {id, name, createdAt, updatedAt, deletedAt?}` - tombstoned (unlike custom categories) because entries reference by id and deletes must propagate through P2P sync and Undo. Cap 20, name ≤40. New optional `SyncDiff.businesses` collection (older peers unaffected); JSON export/import (LWW merge incl. tombstones); spreadsheet schema v1→v2 (`BusinessId` round-trip + readable export-only `Business` columns, new Businesses xlsx sheet; v1 files still import). `BudgetEntry.businessId?` - expenses only, cleared on income flip, 💼 badge on Budget rows. Validators deliberately permissive at the trust boundary (no dup-name rejection; `businessId` cap 120 matches the business-id cap exactly) - one invalid record kills a whole diff.
- **Business Expense Report** (Profile → Business Expenses): pure `computeBusinessReport` (year window, recurring expanded via `listOccurrenceMonths` so it agrees with the Budget screen, capped at the current month, day-31 clamped in short months, deleted businesses flagged) + accountant CSV (`Date,Business,Category,Description,Amount,Recurring,HasReceipt`; RFC quoting + formula-injection defusing).
- **Receipt photos: encrypted at rest, device-local.** Downscale (1600px/q0.7 + 240px thumb) → encrypt with the master key (fixture-tested V3 envelope via new `encryptStringWithMasterKey`/`decryptStringWithMasterKey` exports) → `<document>/attachments/<id>.jpg.enc`. Vault-unavailable throws and the UI refuses the photo - never plaintext; the picker/camera's plaintext cache copy is deleted right after import. Metadata only (`EntryAttachment {id, createdAt, width?, height?}`, UI cap 3) rides sync/backups; partner devices render a placeholder; a regression test walks the whole export tree asserting no image bytes.
- **Lifecycle: one GC, Undo-safe.** Files are never deleted when an entry is deleted OR when an edit removes a photo - the Undo toast (and 90-day sync tombstones) must restore photos, so the sole GC is a cold-start orphan sweep (24h throttle, 48h age gate, references from live+tombstoned entries; corrupted throttle marker treated as due). Eager deletes only for same-session cancelled staging. A `stagingSession` counter discards photo imports still in flight when a modal closes, so they can't ghost-attach to the next entry; merge-mode imports never strip local attachment refs (spreadsheet rows carry none - without this, a no-op re-import would orphan the files for the sweep). Reset All Data wipes the attachments dir.
- **Receipt zip export.** Business Report → explicit confirm → `budgetark-receipts-<year>.zip` (jszip, STORE - entries are JPEGs) with CSV-matching names `<date>_<business-slug>_<amount>.jpg` (`_2`/`_3` for multi-photo entries, de-collided); recurring entries contribute photos once at their earliest in-year occurrence; partner-device photos skipped + counted; archive deleted after the share sheet closes.
- **Adversarial review pass** (4 parallel reviewers over the staged diff) caught and fixed 9 defects pre-commit, incl. the Undo/eager-delete conflict, the plaintext picker copy, the ghost-staging race, and a NaN-amount entry from a blank multi-line row that would have stolen the attachments slot.
- **Tests:** validator matrices, diffEngine business LWW/tombstone/reject, JSON+spreadsheet round-trips, report math + CSV escaping, sweep planning, V3 helper round-trip/tamper, export no-image-bytes regression, attachment-preserving merge, zip naming/dedupe. Full suite as of 2026-07-12: 753 passing across 53 suites.

### Income-type tracking - W-2 / 1099 paychecks (2026-07-15)

Pure JS - no new native deps; rides the same build.

- **`BudgetEntry` gains three optional fields:** `incomeType` (`"w2" | "1099"`), `retirementContribution` (401(k) dollars withheld from a W-2 paycheck), and `taxSetAsideRate` (percent, 1099 only). Income-only - the Add/Edit modals clear the trio when an entry flips to expense, mirroring `businessId` in the other direction. Plain income (incl. bank-imported) carries none of them.
- **W-2 semantics:** `amount` is the NET take-home deposit (the modal says so). The 401(k) contribution is deliberately NOT added to income totals - it never hits a bank account - and surfaces as its own Budget summary-card line ("Plus $X into your 401(k) this month"). In multi-line adds it attaches to the first valid line only (same rule as photos) so it can't double-count the monthly rollup.
- **1099 semantics:** `amount` is gross; set-aside dollars are always derived (`amount × rate`), never stored, so edits can't leave a stale figure. Default rate 25 (`DEFAULT_TAX_SET_ASIDE_RATE`), clamped 0-100, NaN-safe. Live "Set aside $X of this for taxes" preview in both modals; monthly rollup line on the summary card; W-2/1099 tags on the income summary rows.
- **Pure math** in `src/utils/paycheckMath.ts` (per-entry set-aside/contribution + `summarizePaychecks` rollup, cents-rounded); BudgetScreen memoizes it over the month's recurring-aware entries.
- **Trust boundary:** `isBudgetEntryItem` / `explainBudgetEntryProblem` (lockstep) accept the fields with bounds - the rate is capped at 100 so a hostile sync peer can't render an absurd set-aside figure. The fields ride JSON export/import and P2P sync as part of the whole record; older peers ignore them (optional fields, no `SyncDiff` shape change).
- **Spreadsheet schema v2 → v3:** `IncomeType` / `Retirement401k` / `TaxSetAsideRate` columns round-trip on Budget Entries (CSV + xlsx). Importer keeps them on income rows only, tolerates hand-edited `W-2`/`W2` variants, and drops the trio fail-closed on anything unrecognized. Older files still import - the columns are simply absent. `docs/SPREADSHEET_SCHEMA.md` updated.
- **Tests:** paycheckMath suite, validator matrix, spreadsheet round-trip fixtures (W-2 + 1099 entries through export → import on both formats). Full suite as of 2026-07-15: 791 passing across 55 suites.

### Full-codebase review follow-up - data fixes, hardening, refactor (2026-07-16)

Three-tier pass over the whole codebase. Pure JS/TS - rides the same 1.9.0 build and stays OTA-eligible on its runtime. Worker changes need a separate `wrangler deploy`.

- **Data-integrity fixes (Tier 1).** UTC-noon entry-date anchoring (`utils/entryDate.ts`) ends month drift for users west of UTC and day-of-month shifts on edit. Atomic read-modify-write (`encryptedStorage.updateItem` + `collectionRepair`) closes write-on-read races across all eight storage repair paths, so background normalization can no longer clobber a just-saved change. Sync watermark is captured before the diff reads (mid-sync writes aren't skipped next time); category-limit merges are LWW-gated. Spreadsheet import parses decimal-comma amounts, reads CSV with `raw: true` (SheetJS type inference was mangling amount/date cells), and anchors imported dates to UTC-noon.
- **Hardening (Tier 2).** LAN transport: 16MB frame cap with chunked buffering; the server grants the partner slot only after a frame passes HMAC validation. Pairing payloads validated fail-closed (64-hex secret, sanitized peer names, literal `confirmed: true`) and the initiator can no longer hang on a failed start. `validateIncomingDiff` requires well-formed arrays; `isSafeText` gains a control-character gate. Quotes Worker: Twelve Data HTTP-200 error bodies classified (single-symbol 400 cached as a miss), `*/10` cron, invocation logs off (URLs carry symbol lists), plus a vitest suite. `importData`'s `as any` cluster replaced with typed narrowing. Coverage thresholds re-based on an honest denominator; lint ratcheted to `--max-warnings 1`.
- **Refactor (Tier 3).** Shared helpers: `utils/money.ts` (one `roundToCents`; export subtotals rounded at write), `utils/dateFormat.ts`, `utils/savingsGoals.ts` (EF contribution), `utils/linkedAccountRecurringApply.ts` (owns the entries-before-assets save order that prevents double-crediting; test-pinned). `OptionPickerModal` replaces ProfileScreen's five copy-pasted pickers (restores lost a11y props). `BudgetEntryModal` merges the Add/Edit entry modals behind one `entryFormState` field mapping; `MonthYearPicker` (immediate + confirm variants) replaces three private copies; `SheetKeyboardAvoider` consolidates the seven-modal bottom-sheet keyboard strategy. BudgetScreen: month paging reloads only the month-scoped limits, and expanded categories render 30 entries + Show-more instead of unbounded. ChartsScreen: loan/refi/EF math extracted to `utils/chartCalculators.ts` and the slider tap-to-type pattern to `hooks/useSliderValueEditor` (legacy rounding/commit quirks pinned in tests). ProfileScreen decomposed 4927 → 651 lines across `src/screens/profile/` sections, with modal field state moved into the owning sections.
- **Tests:** full suite as of 2026-07-16: 889 passing across 63 suites.

### Per-account rise/drop tracker (2026-07-17)

Pure JS - rides the same 1.9.0 runtime, OTA-eligible.

- **Daily per-account value snapshots.** `syncNetWorthSnapshot` now also records each live account's value (cash balance + priced holdings, display currency, holdings gated by the opt-in - exactly what the Bridge rows show) into `@budgetark_account_value_history` (`storage/accountValueSnapshotStorage.ts`; all math pure in `utils/accountValueHistory.ts`). One row per account per day via atomic `updateItem`, ~400-day cap per account, deleted accounts pruned on the next capture.
- **Device-local by design.** Values derive from the per-device quote cache, so the history is excluded from partner sync and backups - same policy as `quoteCacheStorage`; each device builds its own baselines. Wiped by Reset All Data, rescaled by the "convert my amounts" currency migration.
- **Bridge UI.** A 1D/7D/30D/90D chip selector (NetWorthHistoryCard's chip styling); rise/drop lines (`▲ +$X (y%)` green / `▼ -$X (y%)` red / muted `±$0.00`) under every cash account row, broker/HSA row, and category header. Category deltas sum member accounts, excluding accounts with no baseline from BOTH sides so a just-created account can't read as a giant gain. Baseline = nearest recorded day at/before the window cutoff, falling back to the earliest recorded day for young histories; a one-line hint shows until a prior-day capture exists.
- **Debut slide** in the feature-spotlight carousel (`account-change-tracker`), backed by a new `bridge` spotlight CTA kind that navigates straight to the Bridge tab.
- **Tests:** day-key/window math, upsert/retention/pruning, baseline selection + fallbacks, category roll-up, fail-closed sanitizer, currency-migration rescale. Full suite as of 2026-07-17: 910 passing across 64 suites.

### "What If I Stopped Spending on X" projections (2026-07-17)

Pure JS - rides the same 1.9.0 runtime, OTA-eligible. No storage, no network - everything derives from data already on the device.

- **New Charts-tab tool** ("What If I Stopped Spending on…", after the Emergency Fund calculator): pick a spending category, dial in a monthly amount to redirect, and see the debt-payoff and savings-growth outcomes side by side.
- **Pure math** in `src/utils/whatIfSpending.ts`: per-category monthly averages over the last 6 full tracked months (tracked-month denominator matches `calcAvgMonthlyExpenses`; recurring-aware via `isEntryActiveInMonth`; "Debt Payments" excluded - redirecting it to debt is circular), debt impact via the existing `simulatePayoffPlan`, savings marks via `calcInvestmentGrowth`.
- **Debt side:** current-plan vs redirected payoff timelines with a snowball/avalanche toggle - months sooner + lifetime interest saved. Edge cases surface honestly: an unsolvable plan turning solvable gets its own callout (interest delta suppressed - the truncated baseline total would mislead), and a still-unsolvable plan prompts for a larger amount. Hidden when there are no active debts.
- **Savings side:** value at 1/5/10 years at an assumed 7% annual return (compounded monthly), growth split out from contributions, assumption stated on-card.
- **Debut slide** in the feature-spotlight carousel (`what-if-spending`), backed by a new `charts` spotlight CTA kind that navigates to the Utilities route (displayed as "Charts").
- **Tests:** category averaging/filtering matrix, debt-impact edge cases (unsolvable→solvable flip, both-unsolvable, zero redirect), savings marks vs the shared growth math, duration formatting, slider ceiling. Full suite as of 2026-07-17: 924 passing across 65 suites.

### Onboarding polish - back buttons, redo, reset restart (2026-07-19)

Pure JS - rides the same 1.9.0 runtime, OTA-eligible.

- **Back buttons:** the onboarding welcome and name steps now have Back buttons so a user can revisit an earlier choice without abandoning setup.
- **Reset restarts onboarding:** Reset All Data now leaves the fresh account's `onboardingComplete` flag false and flips the app gate (new `OnboardingGateContext` provided by `App.tsx`), dropping straight back into first-launch onboarding - and it resets the coachmark tour's in-memory state so the wiped account replays the tab tour like a true first launch.
- **Redo from Profile:** a "Redo onboarding" row in Profile → Help persists `onboardingComplete: false` (new `resetOnboardingStatus` in `userStorage`) then restarts the flow, without touching any data - a blank name keeps the current display name, and finishing simply re-marks onboarding complete. It also resets the coachmark tour, since onboarding now flows into the walkthrough.
- **Onboarding + walkthrough are one flow:** finishing setup calls `startGuidedTour` so the spotlight tour chains across every tab automatically (Bridge fires on focus as the initial route; the queue handles the rest). Deliberately skipped when the user picks "Finish + Build Your Ark" - the milestones modal owns the Debts tab's first visit and a stacked spotlight would hit the iOS silent-present failure; per-tab tips still fire individually as they explore.
- **How-To guide / walkthrough expanded** (`coachmarkContent.ts`, shared by both surfaces): 12 → 22 steps covering payment logging + due reminders, payoff strategies, the Review Inbox, receipts + business expenses, W-2/1099 tagging, rise/drop tracking, bank-linked balances, the Captain's Course, all four calculators, the What-If tool, bank connections, partner sync + backups, and achievements/reminders/privacy mode. The Utilities tour intro now matches the tab's displayed name ("Charts"); new steps use the centered-card fallback (no new anchors required).

### "Plan a Purchase" sinking-fund planner (2026-07-19)

Pure JS - rides the same 1.9.0 runtime, OTA-eligible. No new storage surface: plans persist as `SavingsGoal`s, so sync, backups, spreadsheets, net worth, and currency migration all come for free.

- **New Charts-tab tool** (`components/PurchasePlannerCard.tsx`, after the What-If tool): name the item, set price + already-saved, pick a monthly set-aside on a slider, optionally a need-by month (`MonthYearPicker`). Shows the ready month, the required-monthly for the date, and an affordability verdict against free cash flow.
- **Pure math** in `src/utils/purchasePlanner.ts` (27 tests): `calcMonthlyCashFlow` (avg income/expenses over the last 6 tracked months - same denominator rule as `calcAvgMonthlyExpenses`), save-up timeline with ceil months, required-monthly-by-date (floors at 1 month, rejects malformed targets), fit tiers (`fits` ≤50% of free cash flow, `tight` ≤100%, `over` beyond - or whenever cash flow is non-positive), and slider ceiling.
- **Ark correlation** (`buildArkPurchaseGuidance`): guidance keyed off the milestone plan's current step - Keel holds (fund the starter cushion first), Hull/Deck caution (with the debt trade-off quantified via `calcDebtRedirectImpact`, avalanche framing so the cost of saving instead is never overstated), Supplies onward is a green light; a completed current step also greenlights. Education-category plans automatically feed the Ark's Gather Animals (college) milestone progress on the Debts tab.
- **Constant tracking home on the Bridge** (`components/PurchasePlanList.tsx`, shared): a Purchase Plans card on the Bridge renders every non-EF savings goal - progress bar, per-plan required-monthly when a target date is set, tap-to-contribute (negative amounts correct mistakes; floor at 0), soft-delete via the existing tombstone helpers so deletes propagate over partner sync - with "+ Plan" navigating to the Charts tool. The same list renders inside the Charts card, so the two surfaces can't drift. Contributions refresh net worth snapshots and achievements, mirroring the EF contribution path. This card is also the first management UI non-EF savings goals have ever had.
- **Debut slide** in the feature-spotlight carousel (`purchase-planner`, charts CTA) + Charts and Bridge tour/how-to steps (`charts-purchase`, `bridge-plans`).
- **Tests:** full suite as of 2026-07-19: 951 passing across 66 suites.

### Credit card keep-alive watch (2026-07-20)

Pure JS - rides the same 1.9.0 runtime, OTA-eligible (`expo-notifications` is already in this build). Issuers close cards that sit unused, and the credit-score hit is silent - this is the warning a bank will never send.

- **Optional fields on `Debt`, not a new collection** (`keepAliveEnabled` / `keepAliveWindowMonths` / `keepAliveLeadDays` / `keepAliveLastUsedAt`): debts already sync whole-record LWW and ride export/import untouched, so the only trust-boundary change is `isDebtItem` accepting the bounded optional fields (wider than the UI chips so future options can't brick a peer's diff) + `normalizeDebt` dropping out-of-range values on read.
- **Pure math** in `utils/cardKeepAlive.ts` (28 tests): local calendar-month deadline arithmetic with end-of-month clamping (DST-safe, date-only provider stamps parsed as local parts), ok/upcoming/urgent/overdue status, per-card-per-calendar-month dismissals (a permanent dismissal would silence an unmoving deadline forever), and the pure half of auto-stamping (`latestOutflowByAccount` - outflows only, pending counts; `planKeepAliveStamps` - live+enabled debts, strictly-newer only, future provider dates clamped).
- **Per-card setup in Add/Edit Debt** (credit cards only; UI gate, data stays class-agnostic): watch toggle (permission ask on enable, denial doesn't block - banners work without notifications), inactivity window chips (3/6/12/24 mo, default 6), warning lead chips (14/30/60 days), and a linked-account picker over the existing `ExternalAccountLink`s (new per-device `debtId` field; one account per card, "Manual only" clears). Enable-time anchor stamps "now" when no last-used date exists. $0-balance credit cards are now addable (paid-off cards are the ones at risk); `originalBalance` floors at 0.01 for older peers' validators.
- **Auto-stamping on every bank sync** (`connectionsSyncService`): newest fetched outflow per debt-linked account advances `keepAliveLastUsedAt` - raw fetch, so accounts with transaction-import off still prove activity; at most one write per new-activity day keeps P2P `updatedAt` churn down; stale links lazily nulled; best-effort so it can never fail the sync pass.
- **Surfaces:** `CardKeepAliveBanner` (cloned from the debt-due banner) on BOTH the DebtTracker header and the Bridge (initial tab), naming the card and use-by date with a per-month "Later"; DebtCard gains a status row + "I used it" button (expanded) and a warning dot (collapsed).
- **Notifications stay generic** (security rule 11): planner (`cardKeepAlivePlanner.ts`, 9 tests incl. a no-card-name-in-content assertion) coalesces all cards into ONE notification per day, cap 16 under tracking-reminders' 32, deterministic per-day identifiers; scheduler/host mirror the tracking-reminders pattern (own channel + data type, cancel-only-ours, cold-start tap routing to a new `DebtTracker.openKeepAlive` route param - boolean only, no ids in deep links). The module deliberately does NOT call `setNotificationHandler` - `trackingReminders.ts` owns the global policy.
- **Wiring:** dismissals ride export/import (union merge) and Reset All Data; reset also cancels pending nudges. Debut slide `card-keep-alive` (new `debt-tracker` spotlight CTA kind), gated on runtime 1.9.0.
- **Tests:** full suite as of 2026-07-20: 992 passing across 68 suites.

### Onboarding unification: spotlight back button + naming (2026-07-20)

Pure JS - rides the same 1.9.0 runtime, OTA-eligible.

- **Back button in the guided tips:** every spotlight step after the first now has a Back button (re-measures the previous anchor on the way back). Back stays within the current tab's steps - the previous tab is already marked seen and its anchors unmounted, so crossing the boundary would replay a whole tab, not a step.
- **One name, one action:** the spotlight card's eyebrow now reads ONBOARDING (was WALKTHROUGH), and the separate "Replay walkthrough" row (plus the How-To modal's "Replay tour" button) is gone - Profile → Help now has a single "Redo onboarding" row that runs the whole flow, setup and guided tips together, without touching data. The how-to step and final setup screen describe the tips as part of onboarding.

### Searchable onboarding guide + deep content pass (2026-07-20)

Pure JS - rides the same 1.9.0 runtime, OTA-eligible. Completes the onboarding unification: guide and onboarding are now literally one surface with one name.

- **Content model** (`coachmarkContent.ts`): `CoachmarkStep` gains `detail` (long-form explanation, ~60-120 words), `location` (a "Debts tab → + button" where-to-find breadcrumb), and `keywords` (search-only synonyms like "credit card", "dark mode", "excel"). `body` deliberately stays concise - it renders inside the small spotlight tooltip. All 27 steps now carry all three; two NEW steps close the coverage gaps: `debts-keepalive` (card keep-alive watch) and `budget-widget` (Android Quick Entry widget). A new content-integrity test (`src/data/__tests__/coachmarkContent.test.ts`) fails any future step that ships without detail + location, and pins unique ids + lowercase keywords.
- **Keyword search** (`src/utils/guideSearch.ts`, pure + unit-tested - the app's first text-search surface): query is lowercased/tokenized, every token must match somewhere in title + body + detail + location + keywords + tab label (AND semantics), results ranked title > keyword > location > body and stable in tab order within a rank. Empty query → browse mode.
- **One surface** (`src/components/OnboardingGuideModal.tsx`): the centered How-To dialog is replaced by a slide-up sheet (AddDebtModal skeleton + `SheetKeyboardAvoider` - a centered card can't share a small screen with the keyboard). Search bar up top (sanitized input, clear button); empty query shows the per-tab accordion, a query shows flat results with tab eyebrow + 📍 location + full detail; pinned footer holds Redo onboarding + Done. Profile → Help collapses to a single "Onboarding" row. Redo (from inside the sheet) closes first, waits out the dismiss animation, then resets the onboarding flag + coachmark state and flips the gate - the iOS modal-stacking rule.
- **Learn more on every spotlight tip** (`Spotlight.tsx`): tour cards keep their concise body and gain a Learn more toggle revealing the same long-form detail, capped in a 180px scroll so buttons never leave the screen; collapses on step change (but not on a same-step re-measure). The onboarding welcome step now previews all five tabs + the privacy promise in a scrollable list, and the final setup step points at the searchable guide.
- **Feature-debut flair on every page** (same session): `CoachmarkStep` gains `emoji` and `CoachmarkTour` a tab emoji (integrity-tested like detail/location). Tour cards now mirror the what's-new carousel - hero emoji (48px) springing in on each step change (`Animated.spring`, native driver), centered 800-weight title, centered body (long-form detail stays left-aligned for readability); `TOOLTIP_MIN_HEIGHT` 180 → 240 so above/below placement accounts for the taller card. All three setup pages carry 64px heroes (🎨 theme, 💸 welcome, ⚓ name), and the guide sheet shows tab emojis on accordion headers/search eyebrows and step emojis inline in titles.
- **Tests:** full suite as of 2026-07-20: 1008 passing across 70 suites.

### Currency exchange calculator (2026-07-20)

Pure JS - rides the same 1.9.0 runtime, OTA-eligible. The rate provider (open.er-api.com) is already on the egress allowlist for the currency switch - no new network destination, and the request carries no user data (a plain GET of the public rate table).

- **New Charts-tab tool** (after the Emergency Fund calculator): amount field + From/To chip rows over the six supported currencies (USD, EUR, GBP, CAD, JPY, SEK - derived from `CURRENCY_PREFERENCE_OPTIONS`, so a new preference appears automatically), a swap button, the result formatted in the target currency's own locale, and a "1 USD = 0.92 EUR" cross-rate line. From defaults to the user's display currency.
- **Separate rate cache on purpose** (`getConverterRates` in `exchangeRates.ts`, key `@budgetark_fx_converter_rates`): the existing cache is the PINNED display snapshot that must only move when the user changes currency (the rate-pinning policy) - sharing it would let an innocent converter refresh silently re-pin every displayed balance. Resolution: fresh converter cache (12h TTL) → live fetch → stale converter cache → pinned snapshot (honest fetchedAt) → static table. Never throws; always answers offline.
- **Transparency in the tool:** a "Rates updated X ago" line (with distinct "built-in approximate rates" wording when on the static fallback), a manual "Refresh rates" action, and an on-card note that only the request for the day's rate table leaves the phone - never amounts. The freshness label is stamped when a snapshot lands, not during render (react-hooks/purity).
- **Pure helpers** in `src/utils/exchangeCalculator.ts` (unit-tested): amount parsing (comma thousands and single-comma-decimal input, clamped to the shared $1B money cap), cross-rate math with the same fall-back-to-1 policy as `convertAmount` (which is reused for the conversion itself), per-currency Intl formatting with CurrencyProvider's fallback ladder, and freshness labeling.
- **Tests:** converter cache isolation (a converter refresh never touches the pinned key), fallback ladder, parsing/formatting matrix. Full suite as of 2026-07-20: 1038 passing across 71 suites.

### Debt-Free Countdown (2026-07-20)

Pure JS - rides the same 1.9.0 runtime, OTA-eligible. No new storage, no network - everything derives from debts + payments already on the device.

- **New card on the Debt Tracker** (`components/DebtFreeCountdownCard.tsx`, between the summary card and the due-reminder banner): years / months / days boxes counting down to the projected debt-free date, the projected month ("Projected debt-free in March 2029"), and the pace + basis line. Hidden with no debts; a celebration state when every balance is zero; an honest "no payoff date at the current pace" state when interest outruns the payments (pointing at the Build Your Ark payoff planner) instead of a date that never arrives.
- **Payment velocity** (`utils/debtFreeCountdown.ts`, pure + injectable `now`): average of monthly payment totals over the last 6 COMPLETE calendar months, denominator starting at the user's first payment month (mirrors `calcAvgMonthlyExpenses`'s tracked-month rule); the current partial month joins the sample only once it has payments - that's what makes the countdown move the moment a payment is logged, without an empty young month dragging the pace down. No history → falls back to the sum of minimums, labeled "assuming minimum payments".
- **Projection** reuses `simulatePayoffPlan` with `extra = max(0, velocity − Σ minimums)`. The engine can't model paying below minimums (which debt gets shorted?), so a below-minimum history simulates at minimums WITH an explicit on-card caveat showing the gap. All debt classes count - it's a DEBT-free date, mortgage included (deliberately unlike the Hull milestone, which excludes the house). "Custom" sort preference projects as avalanche (extra must target something; cheapest defensible assumption).
- **Calendar math:** `addMonthsClamped` (Jan 31 + 1mo → Feb 28/29) and `diffCalendarYMD` (whole-month walk with day-clamp borrow, remainder in exact days - no 30-day-month approximations).
- **Render purity:** `now` is stamped in the screen's focus-effect data load and passed as a prop - never `new Date()` in render (the react-hooks/purity rule the currency tool hit). Each focus re-stamps it; recording a payment refreshes the payments state, so the countdown updates dynamically both ways.
- **Tests** (21): month clamp/diff matrix incl. leap years and month-end borrows, velocity sampling rules (window edges, first-payment anchor, zero-month drag, current-month inclusion, tombstone/garbage-date/zero-amount filtering), projection statuses (no-debts / debt-free / counting / not-solvable), extra-vs-minimums, below-minimum flag, mortgage inclusion. Full suite as of 2026-07-20: 1059 passing across 72 suites.

### Global search & advanced filters (2026-07-20)

Pure JS - rides the same 1.9.0 runtime, OTA-eligible. No new storage, no network - a read-only view over collections the hosting screens already load.

- **Pure engine** (`src/utils/searchFilter.ts`, 24 tests): tokenized AND matching (guideSearch's model) over debts (name + owner/class labels), payments (parent debt's name - they carry no text of their own; a missing/tombstoned parent labels as "(deleted debt)" and stays findable), and budget entries (description, category, merchant), with amount and `YYYY-MM-DD` date strings in every haystack so "45.50" or "2026-05" match. Advanced filters: scope (everything/debts/payments/budget), date presets (30d/90d/this year, resolved against an injected `now`), entry type, category multi-select, inclusive amount range. Deliberate semantics, test-pinned: entry-only filters (type/category) narrow results to entries; a date range hides standing debts (no transaction date) while their payments still surface; results are date-/balance-sorted rather than relevance-ranked; per-group cap of 50 with honest pre-cap totals; tombstones never match; unparseable dates fail closed under a date filter.
- **One sheet, two hosts** (`src/components/GlobalSearchModal.tsx`): slide-up sheet (OnboardingGuideModal skeleton) with sanitized auto-focus query, a collapsible filter panel (active-count badge, Reset, scope switches clear filters the new scope can't use - a leftover category filter under a Debts scope would silently zero everything), grouped results with category/debt-class icons and locale-formatted amounts/dates, and explicit notes when debts are hidden by filters or a group is truncated. The host stamps `now` when opening (never in render) and owns result-tap behavior, so the component stays navigation-free.
- **Result taps land where the record lives.** On the hosting tab: dismiss, then present the follow-up sheet after 250ms (the iOS dismiss-then-present rule) - a debt opens AddDebtModal in edit mode, a payment opens PaymentHistoryModal, an entry opens BudgetEntryModal. Cross-tab: two new app-internal route params consumed with the deferred InteractionManager pattern - `Budget.searchEntryId` (opens that entry's edit sheet; waits for `isLoaded` so a first-ever visit doesn't drop the param) and `DebtTracker.openHistory`. Neither is reachable from external deep links.
- **Entry points:** 🔍 icon in both title sections (DebtTracker right corner; Budget left corner, sliding beside the Review Inbox icon when connections exist). DebtTracker already loaded budget entries for milestone math - they're now kept in state so its sheet searches all three collections too.
- **Tests:** full suite as of 2026-07-20: 1083 passing across 73 suites.

### App Lock - PIN gate on launch (2026-07-26)

Pure JS - rides the same 1.9.0 runtime, OTA-eligible. Closes the v1.4.16 audit's "no auth between device unlock and full financial data" finding with an app-specific PIN (deliberately NOT `expo-local-authentication` biometrics - no new native dep; a biometric option can layer on later).

- **Gate** (`components/AppLockGate.tsx`, mounted in `App.tsx` around the post-onboarding tree): locks on cold start and on returning from >15s in the background (iOS `inactive` - control center, app-switcher peek - never locks). While locked the app tree is **unmounted**, not overlaid - an overlay could sit under an open RN Modal (the iOS stacked-modal failure). The record is re-read on every foreground so Profile changes apply without a restart. Custom on-screen keypad (`components/PinPad.tsx`) - the system keyboard never handles the PIN.
- **Storage** (`storage/appLockStorage.ts`, `@budgetark_app_lock` in EncryptedStorage): versioned record `{version: 1, pinLength, saltHex, hashHex, iterations, failedAttempts, lockoutUntil, ...}` - PBKDF2-SHA256 (250k iterations, native quick-crypto) with a random 16-byte salt, constant-time verify. **Forward compatibility is the contract** (`utils/appLock.ts` header): future versions must keep these fields unlockable - the parser already accepts newer `version`s + unknown fields so an update can never lock a user out. Fail-open on unreadable record (documented: the PIN is a privacy gate, not an encryption factor - unreadable storage means the data can't decrypt either).
- **Lockout:** 4 free misses, then 30s doubling per miss, capped at 5 minutes - persisted in the record so force-quitting doesn't reset the clock. The Profile verify flow feeds the same counter (otherwise it'd be an unthrottled oracle for an unlocked phone).
- **Settings** (Profile → Settings → App Lock, `components/AppLockSetupModal.tsx`): set / change / turn off, always verifying the current PIN first; enable flow states the no-recovery trade-off up front. Lock screen has a "Forgot your PIN?" explainer (reinstall + restore from backup - the data itself is never PIN-locked).
- **Never leaves the device:** not in `exportData` (regression test extended), not in `SyncDiff`, wiped by Reset All Data (`RESET_KEYS`).
- **Tests** (`utils/__tests__/appLock.test.ts`): validation matrix, hash round-trip + salting, fail-closed parse matrix + future-version acceptance, iteration bounds (tamper can't freeze unlocks), lockout escalation/clear/format.

### Scheduled local auto-backup (2026-07-26)

Pure JS - rides the same 1.9.0 runtime, OTA-eligible. Closes the Engineering Health "backup story is fully manual" gap: an on-device safety net for users who never tap Export. Deliberately NOT a cloud/off-device backup - sandbox files die with an uninstall, and the docs/UI say so; the share-sheet Export remains the device-migration path.

- **What a backup is:** the standard export JSON (same `buildExportMessage()` as manual export - identical collections, identical size discipline) encrypted with the MASTER KEY via the fixture-tested V3 envelope (`encryptStringWithMasterKey`, same posture as receipt photos - never plaintext on disk, vault-unavailable throws instead of degrading). Files live at `<document>/autobackups/auto-backup-<epochMs>.enc`, newest 3 kept, pruned only AFTER a new write succeeds.
- **Scheduling without background tasks** (`services/autoBackup/autoBackupRunner.ts`, kicked from App.tsx's deferred launch block after the payment-repair pass): due-ness derives from the newest file's name-embedded timestamp - no separate "last run" marker to drift. Weekly (default) or monthly; ON by default (the point is protecting users who never export; the file is sandbox-local + same-key encrypted, so no new exposure surface). Enabling or tightening the cadence in the modal runs the due-check immediately.
- **UI** (Profile → Data → "Automatic Backups" row + `components/AutoBackupModal.tsx`): toggle, cadence chips, Back Up Now, and the backup list (date · size) with an INLINE merge/replace restore confirm (no stacked modals). Restores go through the same `importFromString` path as manual imports - same validation, bounds, and merge semantics; result surfaces via the shared info dialog after modal teardown, achievements re-check deferred 500ms (the Cartographer lesson).
- **Housekeeping:** settings under `@budgetark_auto_backup_settings` (fail-closed parse to defaults, in RESET_KEYS); Reset All Data also wipes the backup directory (`clearAllAutoBackups` beside `clearAllAttachments` - RESET_KEYS only clears AsyncStorage). Nothing syncs, nothing is exported.
- **Tests** (`services/autoBackup/__tests__/autoBackupPlan.test.ts`): file-name round-trip + fail-closed parse, due-check matrix (newest-wins, clock rollback, monthly), prune plan, settings parse defaults, size labels.

### Security hardening - v1.4.16 audit follow-ups (2026-07-26)

Pure JS - OTA-eligible. Clears three standing items from the security-audit backlog; the remaining Low items (WordArray keys, HKDF separation) stay parked pending post-V3 re-verification.

- **Encrypt-then-MAC exports (`__BUDGETARK_ENC3__:`).** Password-protected exports gain an integrity tag: new `src/utils/exportEncryption.ts` derives 64 bytes from ONE PBKDF2-SHA256 (250k) call - first 32 the AES-256-CBC key, last 32 an HMAC-SHA256 key - and the MAC over `salt.iv.ciphertext` is verified (constant-time) BEFORE any decryption. A tampered or corrupted file now fails with an honest message instead of maybe decrypting to garbage; CBC bit-flipping is detected. Import reads v1/v2/v3 forever (golden fixtures for all three); only the write path moved. Known cost: an app version predating v3 can't read a NEW password-protected export.
- **Master key pinned device-only.** `expo-secure-store` writes now pass `WHEN_UNLOCKED_THIS_DEVICE_ONLY`. Precision on the exposure: expo never sets `kSecAttrSynchronizable`, so the key was never in iCloud Keychain *sync* - but without ThisDeviceOnly it could migrate to a DIFFERENT phone inside an iCloud/Finder device backup; that's what this closes (iOS attribute; Android Keystore is device-bound already, so the migration is iOS-gated). Existing installs need a one-time **delete + re-add**: expo-secure-store's duplicate-item path updates only the value, never `kSecAttrAccessible`, so an in-place rewrite is a silent no-op (verified against `SecureStoreModule.swift`). The delete window is crash-bracketed: a recovery copy under a second keychain alias is written first, the read-back is verified, and `loadOrCreateKey` checks the recovery alias before it would ever mint a fresh key - so an interrupted migration can never strand existing ciphertexts. Fire-and-forget off the key-load path, marker-gated to run once. Deliberate trade-off: a backup restore onto a new phone no longer carries the key - the export file / auto-backups are the migration path, as the UI already says.
- **Constant-time MAC compares everywhere.** `constantTimeEquals` moved to `src/crypto/nativeCrypto.ts` (appLock re-exports it) and now guards the storage V3/V2 HMAC checks, the LAN-sync envelope HMAC in `transportService.ts`, and the new export MAC - no comparison short-circuits on the first wrong character anymore.
- **Tests:** new `exportEncryption.test.ts` (round-trip, single-character tamper on ciphertext AND mac, wrong password, malformed-envelope matrix, fresh salt/iv per export, golden v3 fixture); importData golden-fixture suite extended with v3 import/tamper/wrong-password; encryptedStorage suite pins the keychain option on creation AND the one-time migration + marker.

### Month-start cash-flow budget (2026-07-27)

Pure JS - OTA-eligible. Chosen over Rollover Mode: anchored to ground truth (a real balance the user re-enters monthly) and self-correcting, no stateful carry-over chain re-deriving prior months.

- **Data:** `MonthStartBalance {balance, capturedAt, updatedAt}` keyed by `YYYY-MM` in `storage/monthlyBalanceStorage.ts` (`@budgetark_month_start_balances`, atomic `updateItem` writes, in RESET_KEYS). Fail-closed per-record parsing (`parseMonthStartBalances` + `isMonthStartBalanceRecord`, magnitude-capped, negative = overdrawn allowed) shared by storage, import, and sync. No tombstones - records are only ever overwritten; LWW on `updatedAt`.
- **Sync + backup:** new optional `SyncDiff.monthStartBalances` (older peers unaffected); whole-map send when non-empty (tiny), per-month LWW merge with ties-keep-local so the re-broadcast is idempotent - no backfill flag needed. JSON export/import round-trips the map (merge = per-month LWW, ties to incoming like every collection; replace = verbatim).
- **Math** (`utils/cashFlow.ts`, pure + unit-tested): projection (`start + income − expenses`), safe-to-spend (month net), reconciliation (actual start vs last month's projected end), `previousMonthKey` year-rollover, cent rounding.
- **UI:** `CashFlowCard` on Budget between the summary card and the reminder banners - starting cash → projected end → safe-to-spend (uses the SAME `monthlyIncome`/`monthlyExpenses` the summary card shows, recurring + debt plan included, so the two can never disagree), reconciliation line ("started $X above/below last month's plan"), CTA state for an unset current month, hidden for unset past months. `MonthBalancePromptModal`: once-per-calendar-month nudge on the Budget tab (marker stamped when SHOWN - "Not now" never re-nags until next month; deferred via InteractionManager and skipped when a deep-link param is mid-present), plus manual Set/Update from the card. Prefill chip offers the Bridge checking total; when exactly ONE live checking account exists and the month is current, saving also updates that account's balance (multi-account totals can't be distributed, so those save history only) and recaptures the day's net-worth snapshot.
- **Debut:** `cash-flow-budget` FEATURE_SPOTLIGHTS slide.
- **Tests:** cashFlow math/parse matrix, diffEngine build/validate/apply (reject bad months, LWW, tie-skip write), import merge/drop-invalid/replace, export round-trip fixture.

### Merchant rules manager - change "Always do this" decisions (2026-07-27)

Pure JS - OTA-eligible. Closes the Review Inbox's one-way door: "always use this category" / "always skip" rules were previously invisible and permanent once created.

- **UI:** new `MerchantRulesModal` (ConnectionsModal sub-screen pattern, nested delete-confirm dialog), opened from a Rules button in the Review Inbox header. Each rule row expands into the same category pill picker the inbox uses, with a leading "🚫 Always skip" pill - flip a rule between skip and categorize, retarget its category, or delete it.
- **Service:** `changeMerchantRule` / `removeMerchantRule` in `reviewInboxService` mutate the rule then re-apply the FULL rule set to items still in the inbox: newly-ignored merchants are dismissed (ledger-recorded), stale suggestions are rewritten, and a deleted rule's items re-match against remaining rules exactly as a fresh ingest would (`replanInboxForRules`, pure in `merchant.ts`).
- **Deliberate limit:** rule changes never resurrect transactions already skipped - the ingest ledger's decisions stand (the modal says so). Removing an ignore rule only affects future fetches.
- **Storage:** `updateMerchantRule(id, patch)` added to `merchantRulesStorage` (identity fields preserved). Rules stay per-device, unsynced, unexported - unchanged.
- **Tests:** `replanInboxForRules` matrix (category change, ignore takeover, deletion clear, fallback re-match, no-merchant skip).

### Take-home pay calculator (2026-07-27)

Pure JS - OTA-eligible. Charts-tab "Take-Home Pay" tool: US federal + state + FICA estimate from bundled tax-year-2026 tables; no network call, ever.

- **Data:** `src/data/taxData2026.ts` (federal brackets all 4 filing statuses incl. the MFS $384,350 37% start and the HoH $256,200 quirk; standard deductions; FICA rates, $184,500 SS wage base, Additional Medicare thresholds - IRS Rev. Proc. 2025-32 / SSA) + `src/data/stateTaxData2026.ts` (all 50 states + DC: 9 no-tax, flat, and progressive with full single-filer brackets; Tax Foundation 2026 with hand-verified corrections for MO/AZ, which the bulk source garbled). Annual refresh = OTA bundle update; `TAX_DATA_YEAR` + the in-card source line move together.
- **Documented v1 approximations** (in the data file header + on-card disclaimer): MFJ doubles single-filer state brackets; MFS/HoH reuse the single table; exemption-system states (IL/IN/MI/PA/NJ/CT/OH/MA/WV) modeled with $0 deduction; Utah's credit applied flat with a 0 floor; no local/city taxes (noted per-state for NYC/MD/OH/PA/IN/MI), no credits, no itemizing, no SE tax.
- **Math** (`utils/taxCalc.ts`, pure, 24 tests): marginal bracket walk, FICA with SS cap + Additional Medicare by status, state calc (deduction → brackets/flat → credit floor), take-home orchestrator. Withholding model: traditional 401(k) reduces income-tax bases but NOT FICA wages; HSA + health premiums (Section 125) reduce both. Inputs clamp (MAX_MONEY, 0-100%, NaN-safe) - never throw.
- **UI:** `TaxCalculatorCard.tsx` (collapsible tool card after Plan a Purchase): salary / filing-status / pay-frequency / 51-state chip grid / optional pre-tax inputs → per-paycheck take-home, segmented where-each-dollar bar, yearly breakdown with effective + marginal rates, per-state caveat notes, and a "What if you moved?" state comparison. Deliberately formats USD regardless of display currency (US-only tool; labeled).
- **Debut:** `take-home-pay` FEATURE_SPOTLIGHTS slide (Charts CTA).
- **Fix (2026-07-28):** a salary below the standard deduction showed "10% marginal bracket" with $0 tax - `marginalRateFor` now returns 0 at zero taxable income (the next dollar is still deduction-covered).

### Four new themes - Lighthouse, Chart Room, Harbor Dawn, Ledger (2026-07-27)

Pure JS - OTA-eligible. Four `ThemePreset`s in `src/theme/themes.ts`; none are ambient (no background components, no AppNavigator wiring - only the Deep themes carry those).

- **Lighthouse** - the high-contrast accessibility theme. Every text-carrying slot (text/textDim/textMuted, accent, success, warning, danger, teal) numerically verified >= 7:1 (WCAG AAA) against BOTH bg and card via a WCAG relative-luminance script; lowest slot is textMuted at 7.75:1; cardBorder clears the 3:1 non-text bar. The audit note lives in the preset comment - re-verify before touching any value.
- **Chart Room** - a real nautical chart: pale SEA-BLUE bg (water) with buff land-tone cards, dark-teal contour-ink text, brass accent. Redesigned same-day from an aged-sepia first draft - user feedback flagged the three non-Lighthouse themes as too similar to each other AND to The Ark's parchment, so each light theme now owns a distinct bg family (sea-blue / peach / green). The optional compass-rose ambient watermark from the spec was deliberately skipped (non-Deep themes don't carry ambient backgrounds).
- **Harbor Dawn** - pastel coastal light theme: peach sunrise bg over seafoam-tinted cards (the warm/cool duo is the identity), muted gold accent. Accent/status colors run deeper than typical "muted gold" so everything clears ~4:1 on both surfaces - tuned with the same contrast script (the first-draft gold sat at 2.6:1, and the first-draft `white` slot was dark - unreadable on the dark-gold accent - now #ffffff).
- **Ledger** - classic "green bar" accounting paper: pale ledger-green bg (deliberately NOT cream - that's Ark/Chart Room territory), white paper cards with ruled-green borders, accounting-green accent, red-ink danger.
- **Debut:** one combined `four-themes` FEATURE_SPOTLIGHTS slide (theme CTA).
- Visual check on device/simulator recommended (palettes are untestable in Jest); glass derivation and density tokens apply automatically.

### Private budget entries - partner visibility control (2026-07-27)

Pure JS - OTA-eligible. Mark any budget entry 🔒 Private and it never syncs to the paired partner; it stays in all local budget math, JSON backups, and spreadsheets.

- **Data:** `BudgetEntry.isPrivate?: boolean`. Enforcement is a single filter in `computeOutgoingDiff` - private entries (live AND tombstoned) are dropped from the outgoing `budgetEntries` collection. No wire change; older peers are unaffected. Marking private bumps `updatedAt`, so a partner re-broadcasting the old public copy (backlog/re-pair) loses LWW to the local private version.
- **Deliberate limits:** no retraction tombstone is sent when an already-synced entry is flipped private (an echoed tombstone could LWW-delete the live local entry) - the partner keeps the copy they already have, and the edit-modal hint says so. Un-marking private re-sends the entry on the next sync.
- **No clawback (hardening, 2026-07-28):** review found that a partner editing their pre-privacy public copy would win LWW and silently CLEAR the local flag - the entry would resume syncing. Now `isPrivate` is device-side intent: incoming sync records (upsert or tombstone) and merge-mode imports can never clear a locally-set flag - content merges normally, the flag is re-stamped (`applyIncomingDiff` + importData's `reconcileBudgetEntry`, regression-tested on both paths). Un-privating is a local UI action only.
- **Round-trip:** JSON export/import carries the flag wholesale; spreadsheet schema bumped v3→v4 with a `Private` ("yes"/blank) column on Budget Entries - stripping it on a backup/restore cycle would silently re-enable syncing, so it round-trips as a privacy requirement (docs + in-app schema modal updated). Validator gates `isPrivate` to boolean-or-absent at the sync/import trust boundary.
- **UI:** 🔒 Private toggle in the Add/Edit entry modal (below Recurring), 🔒 badge on expanded Budget entry rows.
- **Debut:** `private-entries` FEATURE_SPOTLIGHTS slide (Add Entry CTA). An `app-lock` slide was also added for the earlier App Lock feature (new `appLock` openSection deep link → SettingsSection `openAppLock()` ref, ConnectionsSection pattern).
- **Tests:** diffEngine exclusion (live/tombstoned/first-sync/unmark), validator matrix + explain, spreadsheet round-trip (xlsx + CSV).

## v1.8.3 - Captain's Course Complete + Debt Payment Fixes (2026-07-07)

Pure JS - ships OTA against the existing native runtime. No Worker changes.

### Captain's Course: Chapters 3-5

- **All 24 lessons are now written** (`src/data/lessons/`, `lessonChapters.ts`, `lessonIndex.ts`). Chapter 3 "Stocking the Galley" (emergency fund, HYSA, sinking funds, short-term cash), Chapter 4 "Catching Wind" (compounding, index funds, 401(k)/IRA/Roth, asset allocation, big mistakes), Chapter 5 "Charting Far Waters" (net worth, buy vs rent, insurance, estate basics).
- **Named institutions in account-opening lessons.** ch2-l3, ch3-l2, ch3-l4, ch4-l2, ch4-l3 mention SoFi, Robinhood, Fidelity, Charles Schwab, Vanguard, and local banks/credit unions as plain editorial callouts - each carries a not-sponsored note and the FDIC-vs-SIPC nuance for brokerage money market funds. No affiliate links ship in this release; book cards ("Unshakeable" in ch4-l2/ch4-l3) render info-only until `showAffiliateLinks` + `amazonUrl` light up.
- **ch4-l2 teaches the expense ratio by name** with real tickers per broker (FXAIX/FSKAX/FZROX, SWPPX/SWTSX, VOO/VTI, SPLG), mutual fund vs ETF wrapper labels, and an ETF trading/portability explainer.

### Budget screen: Debt Payments correctness (`src/screens/BudgetScreen.tsx`)

- **Root cause A - phantom planned rows in past months.** The per-debt baseline (`max(paid, minPayment)`, added with the due-reminder feature) applied to every viewed month, not just the current one. A closed month where logged payments totaled less than the debt's *current* minimum grew a retroactive "minimum (planned)" top-up row - and edits to `minPayment` rewrote history. The plan builder moved to `src/utils/debtPaymentPlan.ts` (`buildDebtPaymentPlanForMonth`, unit-tested): current/future months keep the minimum floor; past months count only recorded payments. Debts paid to zero also stopped dropping their payment rows (the old `activeDebts` filter hid the final payment the moment the balance cleared).
- **Root cause B - silent no-op deletes.** Debt Payments drilldown rows are synthetic (`payment-<id>`, `debt-min-topup-<id>`, `auto-debt-<id>`), derived from the debt tracker's Payment collection - but the selection guard (`isAutoEntry`) only recognized `auto-debt-`. A `payment-` row could be multi-selected and "deleted": `deleteBudgetEntries` matched nothing in budget storage, the undo toast still said "Deleted 1 entry", and the row re-derived on the next render. All three prefixes are now guarded; tapping a logged-payment row shows an alert pointing at the debt's payment history (where `deletePayment` correctly tombstones and restores the balance).
- **Root cause C - UTC/local month split.** Budget bucketed payments by the UTC prefix of their ISO timestamp while the due-reminder math bucketed by local month (`hasPaymentInMonth`), so an evening payment on the last day of a month landed in the next month on Budget - one of the ways a re-prompt could double-log. New shared `paymentMonthKey` (`src/utils/debtDueCalendar.ts`): full timestamps bucket by local month, date-only strings keep their stored YYYY-MM prefix. Both consumers use it; budget *entry* dates (noon-UTC, prefix-matched) are untouched.
- Tests: `src/utils/__tests__/debtPaymentPlan.test.ts` (12 cases - past/current/future month floors, paid-off debt retention, local-month bucketing).

## v1.8.2 - Holdings Price Updates Fixed (2026-07-02)

Pure JS on the app side - ships OTA against the existing native runtime. The Worker half needs a `wrangler deploy` (it adds a cron trigger via `wrangler.toml`); the app fix degrades gracefully against the old Worker (failures surface instead of vanishing), but portfolios past the batch cap only price once the Worker is redeployed.

- **Root cause: any portfolio past 8 tickers could never update.** Twelve Data's free tier allows 8 API credits/minute and a batched `/price` call costs 1 credit per symbol, so a 9+ symbol batch was rejected wholesale (HTTP 429 upstream). With nothing cached for those symbols the Worker answered `502 upstream_unavailable`, which the app's `refreshQuotes` mapped to `"unavailable"` - a deliberate silent no-op that never stamps `lastFetchedAt`. Net effect: "Update prices" looked completely dead, with no trace anywhere. (Found via `wrangler tail` while reproducing; the only ticker that ever priced was the one added while the portfolio was still a single symbol.)
- **Worker: per-minute batch cap + cron cache warmer (`worker/quotes-proxy/src/index.ts`, `wrangler.toml`).** Inline upstream fetches are capped at `UPSTREAM_MINUTE_BATCH_LIMIT` (8). A symbol registry (`symbols:v2:registry` - symbols and last-requested stamps only, no device ids; 200-symbol cap, 30-day retention, written only behind the app-key gate so scanners can't poison it) feeds a `scheduled()` handler on `crons = ["*/5 * * * *"]` that refetches up to 8 stale registered symbols per pass. Steady state: every known symbol re-warms within minutes of its 24h quote expiring, so user requests are pure cache reads regardless of portfolio size. Symbols the provider can't price negative-cache for 24h (`miss:v2:<sym>`) so a typo/delisting can't drain the `DAILY_UPSTREAM_SYMBOL_BUDGET` at the cron cadence.
- **Partial responses are now honest.** When the minute cap or daily budget forces the Worker to defer symbols, they come back in a `pending` array alongside the quotes it did serve. Such responses skip the per-device throttle (the retry shouldn't eat a 429 until tomorrow), go out `cache-control: no-store`, and are excluded from the edge cache - otherwise Cloudflare or RN's own HTTP cache would replay the same gaps at the retry. If the upstream call itself fails but cache had some symbols, the attempted batch folds into `pending` too.
- **App: forced manual refresh + surfaced outcomes (`src/services/quotesService.ts`, `src/screens/BridgeScreen.tsx`).** The "Update prices" tap now passes `{ force: true }` (the Worker throttle stays the cost gate), and every non-success outcome renders as a notice under the price row instead of silence: connection failure, "already updated today" (429), and the new `"partial"` outcome - "still fetching N tickers, tap again in a few minutes" - which merges the received prices into the cache but deliberately does NOT stamp `lastFetchedAt`, keeping the daily gate open for the follow-up tap. Proxy-anchor stamping moved ahead of the partial/full split so a proxy ticker priced on a partial pass still anchors. The button hides entirely when `collectSymbols(holdings)` is empty (all-manual portfolios have nothing to fetch).

### Startup time (Android time-to-tabs)

- **Appearance settings load in one pass (`src/theme/appearanceBoot.ts`, new).** BackgroundEffects → SurfaceStyle → Theme → Density each gated their children on their own encrypted-storage read, and a nested provider only starts its read after its parent unblocks - four serialized round-trips (five keys) before anything rendered. A shared module-level `Promise.all` now starts all five reads the moment the bundle evaluates; each provider awaits the shared snapshot and keeps its own validation/`ready` gate. Storage latency is paid once instead of four times; write paths are unchanged (keys exported from the boot module so they can't drift).
- **Non-critical boot work deferred past first paint (`InteractionManager.runAfterInteractions`).** Four startup consumers now wait until the navigator has painted: the OTA auto-update check in `App.tsx` (network + possible background bundle download; foreground-resume checks stay immediate), the initial silent achievements evaluation (decrypts and scans every major collection), `DebtDueReminderHost`'s due-payment evaluation (decrypts debts + payments; the prompt appears a beat later, imperceptibly), and the FX-rates resolve in `CurrencyProvider`.
- **FX rates are pinned at currency-change time (`src/utils/exchangeRates.ts`, `src/currency/CurrencyProvider.tsx`, `src/storage/netWorthSnapshotStorage.ts`).** New policy: the network is consulted for display rates exactly once - when the user changes their currency - and the resulting snapshot stays pinned until the next change. Display paths (the provider's `rates` table, net-worth snapshot writes) read the pin via new `getStoredRates()` (cache -> static, never network, no TTL), so day-to-day FX moves can't wiggle converted balances the user didn't touch; previously both the provider (at boot) and every snapshot write refetched on a 12h TTL. `setPreferenceId` re-pins via `getCurrentRates()` - the default resolve reuses the fresh cache the conversion prompt just wrote (so the pinned table matches the rate amounts were converted with), and fetches live for switch paths that skip conversion. USD users bypass the table entirely (USD->USD is 1:1 against the static seed). Also removes the FX fetch from the boot path for everyone. Accepted edge: a USD-display user holding a non-USD crypto pair (e.g. BTC/EUR) converts via the static seed until they touch their currency preference.

## v1.8.1 - Daily Holdings Prices + Fixes (2026-06-29)

Pure JS - ships OTA against the existing native runtime. No new native modules.

- **Holdings refresh cadence weekly → daily.** The refresh gate moved from 7 days to 1 day, enforced in both places that gate it: the client `QUOTE_REFRESH_INTERVAL_MS` (`src/utils/holdingsMath.ts`) and the Worker's `QUOTE_TTL_SECONDS` + `THROTTLE_TTL_SECONDS` (`worker/quotes-proxy/src/index.ts`). The client gate is the binding one, so the change needs both an OTA and a `wrangler deploy`. The Bridge "next update" label is now interval-aware (shows hours under a day) instead of a hardcoded "7d".
- **Update dialogs scroll.** The "Update Ready" and "What's New" modals capped at 85% height with their body in a `ScrollView`; the title and action buttons stay pinned so Install/Later are always reachable on long release notes.
- **Bill calendar moved to a header icon.** The Budget screen's mid-page bill-calendar card is now a compact calendar button in the top-right; the due-date reminder banners regained the standard section gap above the Spending card.

## v1.8.0 - Live Stock Holdings (2026-06-27)

Pure JS - ships OTA against the existing native runtime (`runtimeVersion` unchanged). No new native modules; the feature reuses `expo-secure-store` and the existing networking stack.

### Live Stock Holdings & weekly quote feed

- **Private quote proxy (`worker/quotes-proxy/`, Cloudflare Worker).** Live prices come from Twelve Data, but a mobile client can't hide an API key, so the key lives only as a Cloudflare encrypted secret (`wrangler secret put TWELVE_DATA_API_KEY`) - never in the repo or app bundle. The Worker exposes `GET /quotes?symbols=AAPL,VTI` with an `x-device` header and is the only thing that talks to the upstream provider. Its public URL is *not* the secret: protection is server-side, a KV-backed per-symbol price cache (7-day TTL) plus a per-device throttle (one refresh per week, keyed by a SHA-256 hash of the device id). The Worker stores no portfolio data - only symbols and a throttle stamp.
- **Holdings data model (`src/types/index.ts`).** New `Holding` (id, symbol, shares, optional `costBasis` = total dollars invested, optional `accountId`, timestamps, tombstone fields) and `CachedQuote` (price + `asOf`) types, plus `HoldingsSettings` (`enabled`, `disclosureAcknowledged`) for the opt-in.
- **Pure math (`src/utils/holdingsMath.ts`, tested).** `isQuoteRefreshDue` (weekly gate), `collectSymbols`, `holdingMarketValue`, `holdingsTotalValue`, `holdingGainLoss`, and `isValidSymbol`/`normalizeSymbol` - all side-effect free and covered by `holdingsMath.test.ts`.
- **Storage layers.** `holdingsStorage.ts` is a synced, tombstone-aware collection (clone of `assetAccountStorage.ts`, key `@budgetark_holdings`) so deletes propagate instead of resurrecting. `quoteCacheStorage.ts` is per-device and **never synced** (key `@budgetark_quote_cache`). `deviceIdStorage.ts` holds a stable UUID for the `x-device` throttle header. `holdingsSettingsStorage.ts` is the per-device opt-in (key `@budgetark_holdings_settings`, default off).
- **Quote service (`src/services/quotesService.ts`).** `refreshQuotes()` gathers live symbols, applies the weekly gate, fetches through the Worker, and merges the cache. It degrades safely: a 429 stamps `lastFetchedAt` to back off, while a network/timeout keeps the stale cache without stamping so it retries. It never throws into net-worth math. **Fetching is manual only:** the app never calls the Worker on add/edit/tab-focus (those read cache); a weekly-gated "Update prices" button is the sole network trigger, so adding several tickers in a row no longer spends the weekly window on the first one.

### Net worth, sync & privacy

- **Net-worth integration.** `calculateNetWorthTotals` takes optional `holdings`+`quotes` (default empty, backward compatible) and adds holdings market value as a fourth asset term; unpriced positions contribute 0. `syncNetWorthSnapshot` gates holdings/quotes on the opt-in flag so a disabled feature contributes nothing, keeping the persisted snapshot consistent with the on-screen total.
- **Sync wiring.** Holdings ride the existing sync diff (registered in `sync/types.ts`, `recordValidators.isHoldingItem`, `diffEngine.ts`, and the orchestrator count) and merge tombstone-aware LWW by id. The quote cache deliberately stays **out** of sync - prices are per-device and re-fetch locally.
- **Opt-in & off-device disclosure.** The feature is off by default. The first time it's enabled - from the Bridge teaser or the Profile → Settings toggle - an off-device disclosure must be acknowledged. The disclosure copy lives in one shared module (`src/data/holdingsDisclosure.ts`) so the Bridge and Profile surfaces can't drift. Only enabled devices send tickers to the proxy.

### UI & backups

- **Holdings live under brokers in the Investment category (`src/screens/BridgeScreen.tsx`).** Each Investment-category `AssetAccount` is a broker; holdings link to it via `Holding.accountId`. The Bridge nests Investment -> brokers -> holdings (tap a broker to expand its tickers); each broker row totals its holdings via `accountHoldingsValue`, and the Investment header totals all brokers. The broker modal edits the broker name plus its tickers inline - add/edit/remove in one place. Investment accounts are holdings-only (`balance` forced to 0), so net worth still counts each holding exactly once (added globally, separate from account balances). Price fetching is manual via a weekly-gated "Update prices" button (see the quote service note above). A one-time `migrateOrphanHoldings` pass on Bridge load attaches any pre-redesign holding (no `accountId`) to a default "My Holdings" broker so nothing is left counted-but-invisible.
- **Crypto holdings & display-currency conversion (`src/utils/holdingsMath.ts`, `src/utils/netWorth.ts`, `src/currency/CurrencyProvider.tsx`).** The symbol regex now accepts crypto pairs (`BTC/USD`, cap 15) across the app, Worker, and validators, priced through the same Twelve Data `/price` endpoint. Because a quote arrives in the symbol's own currency (USD for US listings, the pair's quote side for crypto), `holdingMarketValue`/`holdingsTotalValue`/`accountHoldingsValue`/`holdingGainLoss` take an optional `{ displayCurrency, rates }` and convert into the user's currency via `quoteCurrency(symbol)` + the existing `convertAmount` (units-per-USD). The `CurrencyProvider` now exposes a best-available `rates` table (live → cache → static), and `syncNetWorthSnapshot` resolves currency + rates itself so the persisted snapshot matches the Bridge's on-screen total. A USD portfolio on a USD display currency is an exact 1:1 no-op (the prior behavior); cost basis stays recorded in the display currency, so gain/loss subtracts like-for-like.
- **Profile toggle (`src/screens/ProfileScreen.tsx`).** A "Live Holdings" on/off row in Settings next to Privacy Mode, wired to the same opt-in flow and disclosure copy.
- **Export/import round-trip.** JSON backups include holdings (with tombstones); the Excel export gains a **Holdings** sheet (`ID, Symbol, Shares, CostBasis, CreatedAt, UpdatedAt` - no price column). Import normalizes tickers and skips invalid rows. Prices are never exported or imported - they re-fetch on the device. Schema reference (`SpreadsheetSchemaModal.tsx`, `docs/SPREADSHEET_SCHEMA.md`) updated.

### Update prompt fixes

- **No more stacked update pop-ups, and notes never go missing (`App.tsx`, `src/screens/ProfileScreen.tsx`, `src/storage/releaseNotesStorage.ts`).** The post-launch "What's New" prompt and the "Update Ready" dialog were independent and could render on top of each other; the notes prompt is now gated on `pendingUpdate === null` so only one shows at a time. The OTA flag records whether the install dialog actually showed notes (`setOtaUpdateInstalled(notesShown)`) - if a build is published without the stamped message (version only), the post-reload prompt still runs from the baked-in notes, so notes are never silently lost. Both the auto-install (`App.tsx`) and manual-install (`ProfileScreen`) paths record the same signal. The publish helper (`scripts/eas-update-message.mjs`) gained a PowerShell-friendly invocation.

### Worker hardening

- **Quote proxy hardened against quota/cost abuse (`worker/quotes-proxy/`).** The per-device weekly throttle only bit when a client sent `x-device`, so a tampered client could drop it and drain the Twelve Data quota / run up the bill (no portfolio data is at risk - it's a cost/availability gap). Added defenses that don't rely on client cooperation: a per-IP burst limit (Cloudflare rate-limiting binding, 5/min, guarded so a missing binding can't break the Worker), a global daily upstream symbol budget (KV day-counter), a per-IP daily request cap (KV, on cache-miss only), and edge response caching (`caches.default`, normalized symbol key - a no-op on `*.workers.dev`, active on a custom domain). Cloudflare absorbs network-layer DDoS for free on all plans, so this targets the realistic app-layer vector.

### Keyboard handling in modals

- **Focused inputs stay above the keyboard (`src/components/KeyboardAwareModalOverlay.tsx`, new).** Modals either lacked a `KeyboardAvoidingView` or hardcoded `behavior="padding"` for both platforms (an iOS mode) and never scrolled the focused field into view, so a field low in a form sat hidden under the keyboard. New `KeyboardAwareModalOverlay` wraps centered dialogs (iOS `padding` / Android `height`) - applied to the Bridge broker / Emergency Fund / disclosure modals and the Profile export + import-password dialogs. The sheet/scroll form modals (`AddDebtModal`, `AddBudgetEntryModal`, `EditBudgetEntryModal`, `FeedbackModal`, `ManageCategoriesModal`) use the ScrollView's `automaticallyAdjustKeyboardInsets` on iOS (which also scrolls the focused field into view) plus height-mode KAV on Android - one mechanism per platform to avoid a double shift - with extra scroll bottom padding. `PairingModal` (no ScrollView) gets the platform-correct KAV behavior. Input-less modals (Bill Calendar, confirm/info dialogs) were skipped. iOS is solid; Android modals remain the weaker case since RN renders them in a separate window.

## v1.7.5 - Payoff Goal Date Fixes (2026-06-23)

Pure JS - ships OTA against the existing native runtime (`runtimeVersion` unchanged).

### Goal date shown a day early

- **Timezone-safe goal-date display (`src/utils/calculations.ts`, `src/components/DebtCard.tsx`).** A goal of December showed as `11/30` on the debt card. Goal dates are stored as `YYYY-MM-01`, and `new Date("2026-12-01")` parses as UTC midnight, which `toLocaleDateString()` then rendered as the *previous* calendar day for any user west of UTC (Dec 1 -> "11/30"). New `parseGoalDateLocal` helper builds the Date from its parts so it stays pinned to the intended day in the user's own timezone; the card now reads `12/1/2026`. Display only - the month math (`calcMonthsUntilDate`, already UTC-consistent since v1.7.x) is unchanged. Covered by a regression test in `src/utils/__tests__/calculations.test.ts`.
- **Context: the matching "Goal date has passed" / "too soon - not achievable" mislabels** came from the older `calcMonthsUntilDate` that compared a UTC-parsed date with local `getMonth()`, flipping the month back one for western timezones (count to 0/negative -> "passed", required payment -> `Infinity` -> "not achievable"). That was already corrected to UTC-on-both-sides; this release removes the last remaining display-side instance of the same root cause.

### Clearer month picker

- **Confirm-before-apply flow (`src/components/AddDebtModal.tsx`).** Tapping a month used to commit and close the picker instantly with no confirmation - easy to set the wrong month or year by accident, and the only button was a vague "Close". The picker now highlights the tapped month without saving (new `pickerMonth` state, kept separate from `goalMonth` so Cancel is non-destructive), shows a live **"Selected: Dec 2026"** confirmation line, and commits only on an explicit **Done** button (disabled until a month is chosen). **Cancel** dismisses without touching the saved goal.
- **Unambiguous year controls.** The bare `←`/`→` arrows (mistaken for day/date steppers) are now `‹`/`›` buttons with visible chrome and larger tap targets, flanking a stacked **"YEAR / 2026"** label, so it's clear they step the year. A "Set payoff goal date" title was added to the picker.

## v1.7.4 - Swedish Krona, Currency Conversion + Milestones (2026-06-19)

Pure JS - ships OTA against the existing native runtime (`runtimeVersion` unchanged).

### Swedish Krona

- **SEK currency option (`src/types/index.ts`).** Added `sek_se` (locale `sv-SE`, code `SEK`) to `CURRENCY_PREFERENCE_OPTIONS`. Everything downstream is data-driven off that array - the Profile picker, `Intl.NumberFormat` formatting (`1 234,56 kr`), storage, validation (`isCurrencyPreferenceId`), and import/export - so no other wiring was needed. A JSON backup carrying `currencyPreferenceId: "sek_se"` now restores instead of silently falling back to USD.

### Currency conversion on switch

- **Live exchange rates (`src/utils/exchangeRates.ts`, new).** `getCurrentRates` resolves rates through a best-available chain: live fetch (open.er-api.com, base USD, no API key, 8s `AbortController` timeout, validated so `result==="success"`, `USD===1`, and every supported code is positive/finite) -> encrypted cache (`@budgetark_fx_rates`, 12h TTL, reused without a network call) -> the built-in static table. Never throws. The request sends no user data; conversion math stays local.
- **`convertAmount(value, from, to, rates?)` (`src/utils/currencyConversion.ts`).** Converts a real stored amount between currencies via USD (`value / rate[from] * rate[to]`), rounded to 2 dp. `rates` is units-per-USD and defaults to the static table; the convert flow passes a live snapshot. Same-code, zero, and non-finite inputs return the value unchanged so a migration can never produce `NaN`. The static `USD_EXCHANGE_RATES` table is now the offline fallback and the source for milestone-target seeding only.
- **`convertAllStoredData(from, to, rates?)` (`src/utils/currencyMigration.ts`, new).** One-time walk that scales every monetary field with the supplied (live) rates and writes it back: debt `balance`/`originalBalance`/`minPayment`, payment `amount`/`appliedAmount`, budget-entry `amount`, category `monthlyLimit` (all months), savings-goal `targetAmount`/`currentAmount`, asset-account `balance`, net-worth snapshot `totalAssets`/`totalDebt`/`netWorth`, and milestone `targetAmount`. Bumps `updatedAt` where present so converted values win last-write-wins on any later sync. `Debt.rate`, dates, and ids are left alone.
- **`savePayments` bulk writer (`src/storage/debtStorage.ts`).** Payments had no exported bulk save (only `recordPayment`/`deletePayment`). Added one that writes the full payments array including tombstones, so the migration can persist scaled amounts in a single write.
- **Convert/relabel prompt (`src/screens/ProfileScreen.tsx`).** Picking a currency whose code differs from the current one opens a themed dialog that force-fetches today's rate and shows it (with freshness/source) *before* the user commits: *Convert my amounts* (runs the migration with that snapshot, then switches), *Just change the symbol* (relabel only - correct when the stored numbers are already in the target currency), or *Cancel*. Same-code picks (e.g. USD↔CAD, both `$`) skip the prompt. The Convert button is disabled until the rate resolves.
- **Paired-device guard.** Currency is a per-device setting but financial data is shared via sync and carries no per-record currency tag, so converting on one device would push inflated values to a partner still on the old currency. While `pairing !== null` the Convert option is hidden (and no rate is fetched) and the dialog tells the user to unpair first; conversion is offered to solo devices only.
- **Caveats.** Conversion uses live rates, but two FX sources won't match to the last decimal at the same instant, so a converted figure can differ from another converter by a fraction of a percent; a round trip (USD→SEK→USD) is not guaranteed bit-exact due to 2-dp rounding; offline switches fall back to cached/static rates (surfaced in the prompt); paired users must unpair to convert.

### Localized milestone targets

- **USD anchors converted on fresh seed (`src/types/index.ts`, `src/storage/debtMilestoneStorage.ts`).** The default milestone `targetAmount`s are now treated as canonical USD anchors. `createDefaultPlan` localizes each to the user's currency via `localizeUsdTarget` (convert + round to a tidy figure) when seeding a *new* plan - e.g. a Swedish user's keel emergency fund starts near 12 700 kr instead of 1 200. `normalizePlan` still preserves any stored target, so existing plans are untouched and USD users see no change (the conversion rounds back to the same value). The keel description dropped its hardcoded `$1,000` (the amount is shown by the target editor below it), which also fixes a pre-existing 1,000-vs-1,200 text mismatch.

### Achievement progress formatting

- **Currency-aware progress strings (`src/data/achievementDefs.ts`, `src/screens/AchievementsScreen.tsx`).** Replaced the hardcoded-`$` `formatCurrencyProgress` helper with an `isCurrency: true` flag on the ~7 monetary progress rings (Half Mast, Galley Stocked, Sextant Sharp, Treasure I/II/III, Galleon's Hold). The screen formats those values with the active currency via `useCurrency().formatCompactCurrency`, so badge progress reads in the user's symbol (`10 tn kr`) instead of always `$`.

## v1.7.3 - Import Fixes (2026-06-12)

Pure JS - ships OTA against the existing native runtime.

### iOS document-picker race (`b6874d9`)

- **Both import paths now wait for modal teardown before launching the picker.** `confirmFileImport` (JSON/backup) and `confirmSpreadsheetImport` (CSV/Excel) closed the merge/replace `<Modal>` and called `DocumentPicker.getDocumentAsync` in the same tick. On iOS the picker presented over the still-dismissing modal and failed silently, but `expo-document-picker`'s internal "picking in progress" flag stayed set - so the first tap did nothing and every later tap threw *"Different document picking in progress. Await other document picking first"* until the app was force-quit. Both handlers now `await waitForIosModalTeardown(350)` first, matching the export path's existing fix.
- **`openDocumentPicker` wrapper.** New shared wrapper in `importData.ts` (used by both the JSON and spreadsheet pickers) translates the stuck-state rejection into actionable guidance - *"The file picker is stuck from an earlier attempt. Please fully close and reopen the app, then try again."* - for anyone who already tripped the flag before updating.

### Actionable JSON rejection errors

- **Indexed collection errors.** `sanitizeCollection` now reports the invalid count and the 1-based index of the first offending record (e.g. *"budget entries contains 1 invalid record (first at item 3 of 12)."*) instead of a bare *"contains invalid records."* The per-month budget-limits path gets the same index pointer.
- **Field-level reason for budget entries (`explainBudgetEntryProblem`).** The hand-edited collection most likely to fail now names the specific problem on the first bad record - missing `id`, missing `createdAt`, a `type` that isn't exactly `income`/`expense`, an `amount` typed as a quoted string rather than a number, an out-of-range category, etc. Checks run in lockstep with `isBudgetEntryItem`.

### Issue template

- **GitHub bug report template (`.github/ISSUE_TEMPLATE/bug_report.md`).** Replaced the unmodified stock template's Desktop/Browser fields with an "App & device info" section that asks for the BudgetArk version (and points to where it's shown - bottom of the Profile tab), auto-applies the `bug` label, and prompts import/export reporters to include the exact error message and a redacted sample file.

## v1.7.2 - Reliability + Sync Security (2026-06-09)

Pure JS - ships OTA against the existing native runtime. **Sync protocol bumped to v2: both paired devices must be on 1.7.2 before they can sync with each other again.**

### Sync security & data (protocol v2)

- **Full-envelope authentication (`8fd1948`, breaking).** The HMAC previously covered only the payload ciphertext, leaving `type`, `senderId`, `timestamp`, and `nonce` unauthenticated - a LAN attacker could re-wrap a captured payload+HMAC pair in a fresh envelope (new timestamp, new nonce, any message type) and defeat replay protection entirely. The MAC now covers the whole envelope and is verified before any field is trusted. Protocol version bumped so v1 and v2 peers refuse to interoperate.
- **Version-mismatch reporting (`dff2961`).** A peer on the old protocol used to surface as a generic 30s timeout (reads as a network problem right after an update). Frames shaped like sync messages with a missing/different protocol version now flag the failure so the error says the partner's app needs updating. Detection only works when the outdated peer sends first; a v1 server drops our frames silently, so that direction still times out generically.
- **Net-worth history sync (`8d14100`).** Each phone built its own snapshot history, so Bridge graphs diverged permanently (days a device never opened were simply missing). Snapshots now ride the sync diff - merged by `dayKey`, newer `capturedAt` wins, validated like the import path. Since incremental diffs can't carry anything captured before the last sync, the first successful sync after this update sends the full history (and the full custom-category list, which had the same backlog gap).
- **Custom categories & bucket overrides sync (`8b758fb`).** Budget entries reference custom categories by name, but the definitions never synced - partner devices rendered synced entries with the fallback icon and default "wants" bucket, so 50/30/20 math diverged for identical data. Categories now merge LWW by id (deduped by name, built-in shadows dropped); overrides merge key-wise since that store has no timestamps. Both are counted in sync results.

### Deletes, tombstones & debt payments

- **Tombstone preservation (`ed02e47`).** Screens read `filterLive()` results and round-tripped them back into `saveX()`, erasing every soft-delete tombstone - undo then restored nothing and the paired device resurrected the deletion on its next sync. Public `saveX` now merges stored tombstones back in; internal helpers and the TTL purge use a raw write so expired tombstones still drop.
- **Payment delete reversal (`a7f2df1`).** `recordPayment` clamps the balance at zero but `deletePayment` added back the full amount: logging $150 against a $40 balance then deleting it showed a $150 debt - more than was ever owed. Payments now carry `appliedAmount` (the delta actually subtracted) and delete/restore reverse exactly that. The due-date prompt also clamps its logged amount to the remaining balance instead of raw `minPayment`.
- **Due-prompt double-tap & celebration clash (`de851f6`).** "Yes, log" stayed enabled through several awaits, so a double-tap recorded the minimum twice; a payment that zeroed the debt presented the payoff celebration while the prompt was still dismissing (iOS hides one of two racing modals). Fixed with an in-flight ref guard plus the established 250ms dismiss-then-present defer. This commit also guards the strategy comparison so an unsolvable plan reads "Not solvable" instead of rendering "Infinity mo faster" / "NaN mo faster".
- **Local-month due bucketing (`a1b1f36`).** UTC ISO prefix vs local month key: an evening payment on the last day of the month matched the *next* month for users west of UTC - the reminder kept firing all day (inviting a double payment) and next month's was silently suppressed.

### Budget month attribution

- **Local-month entry default (`7caeec4`).** The new-entry sheet defaulted to `toISOString()`'s UTC month ("Jun" while the user's evening was still May 31), quietly booking entries into next month. Entry dates now store noon UTC inside the picked month and `isDateInMonthKey` slices the `YYYY-MM` prefix, matching `recurrence.ts`, so extreme timezones (UTC+13/14) stop shifting entries across months.
- **Shared recurring catch-up (`28d4953`).** The Budget focus effect re-implemented `applyMissedRecurringLinkedAccountContributions` inline, missing two prior fixes: orphaned entries got `lastAppliedMonth` stamped while their credit vanished, and date-only ISO strings parsed as UTC credited a month early west of UTC. Budget is the most-visited tab, so the broken copy usually ran first.

### Import & backup

- **Compact exports, bigger caps (`cf85eb0`).** Pretty-printed exports outgrew import's own 500 KB / 2,000-item caps after ~2 years of normal use - the app's own backups became unrestorable, discovered only at device migration. Exports are now compact JSON; import bounds are 12 MB pre-decryption, 8 MB post-decryption, 20k per collection, 50k total. Backups also began carrying Ship's Log badges, their stats, and due-date dismissals.
- **Merge mode stops overwriting singletons (`86db11c`).** Merge wrote net-worth snapshots, bucket overrides, milestones, and payoff strategy verbatim from the file - importing a 3-month-old backup erased 3 months of daily snapshot history with no recovery path. Snapshots now union by `dayKey`, overrides merge key-wise, and milestones/strategy only apply when at least as new as local.
- **Spreadsheet hardening (`fe2b806`).** One out-of-range cell used to abort the whole file (the downstream sanitizer throws), so the row mappers now mirror the validator limits and count bad rows in `skippedRows` instead. Replace mode scoped its key removals to what the payload actually carries (a CSV replace had been erasing net-worth history and milestones). CSV cells starting with `= + - @` get a leading apostrophe on the CSV path (CWE-1236 formula injection). Temp-key writes moved inside the try/rollback so a mid-loop failure can't strand `*_import_tmp` keys, and CSV export no longer calls `recordBackup` (it's a partial export and was silencing the backup reminder for exactly the user it protects).

### Storage & UI reliability

- **Migration write queue (`040ab3c`).** `getItem`'s V1/plaintext upgrade wrote directly via `AsyncStorage.setItem` after awaiting the SecureStore key - a queued `setItem` landing in that window was silently reverted to the pre-edit value. Migration writes now queue and re-check the stored value before overwriting.
- **Modal presentation races (`59c012c`).** Bill calendar → edit entry presented the edit sheet in the same tick two modals tore down; achievement unlocks fired the root modal while the triggering screen's modal was mid-dismissal, so the celebration silently never appeared (and the unlock persists, so it never re-shows). The calendar path now waits the standard 250ms; the achievements queue defers presentation 300ms centrally, covering every `runCheck` call site.

### Round 4 audit (misc correctness) (`6ebe608`)

- Stop the auto-sync monitor on unmount regardless of which path started it (the toggle path leaked the NetInfo listener).
- `calcTotalInterest` simulates the final partial month; it had reported $200 interest on a 0% loan.
- `isMonthKey` rejects month > 12 - `"9999-99"` permanently occupied a lexicographic limit-history slot.
- Savings streak uses the shared recurrence rule; a recurring monthly contribution had counted only its creation month, capping streaks at 1.
- Annual report stops at the current month - recurring entries were projected Jul-Dec as actuals while `debtPaid` stayed real.
- `UndoProvider` key-tag exit animation so a replace during the 160ms exit can't instantly kill the new snackbar.

### Feedback

- **Structured report template (`60b6f92`).** Free-form reports usually arrived without repro steps or expected behavior. Send Feedback now opens the email composer pre-filled with a template prompting for them; the in-app box still asks one question so the flow stays lightweight.

## v1.7.1 - Debt Reminders + Captain's Course Ch 2 (2026-06-02)

Pure JS - ships OTA against the existing native runtime.

### Debt due-date reminders (in-app, no push)

- New optional `Debt.paymentDueDay?: number` (1-31). Validator (`isDebtItem`) enforces integer range; `normalizeDebt` floors fractional values and treats out-of-range as undefined so the migration is graceful. Reset/export/import all carry the field via a `PaymentDueDay` column on the Debts sheet (parser also accepts `Payment Due Day` / `DueDay` / `Due Day` aliases).
- `src/utils/debtDueCalendar.ts` is the pure helper: `getEffectivePaymentDueDay` falls back to `DEFAULT_DEBT_PAYMENT_DUE_DAY` (15) when unset, `clampDueDayToMonth` rolls day 29-31 to month-end via `new Date(y, m+1, 0)`, `upcomingDebtDuesWithin` walks today..today+N and skips debts already paid this month (`hasPaymentInMonth` matches by `YYYY-MM-` prefix) or dismissed for the month, and `debtsDueTodayNeedingPrompt` dedupes by debt id.
- `src/storage/debtDueReminderStorage.ts` persists per-month "not yet this month" dismissals under `@budgetark_debt_due_dismissals`, keyed by `debtId:YYYY-MM`. Key is added to `RESET_KEYS` so wipes pick it up.
- New `DebtDueReminderBanner` renders on both Budget and Debts. Shows total minimum due + the next debt's name/amount/relative day, color-shifts to a warning tint when the next due is today or tomorrow, and renders nothing when no debts qualify. The Budget banner navigates to the Debts tab; the Debts banner opens the due-day prompt (if anything is due today) or the edit form for the next upcoming debt.
- New `DebtDuePaymentPromptModal` fires when the Debts tab focuses on a due day. **Yes, log $X** records a minimum payment via the existing `handlePayment` path (so balance, payment history, net-worth snapshot, and Budget's Debt Payments all update); **Not yet this month** writes a dismissal; **Remind me later** closes without persisting. After each action the prompt chains forward to the next debt due today via `advanceDuePrompt`.

### Per-debt due-day picker on Add/Edit Debt

- New control on `AddDebtModal` with a default/custom toggle plus a stepper (-/Day N/+). State is `number | null` and is only persisted when the user explicitly picks a day, so opening + saving an old debt no longer silently assigns day 15. Defaults flow through naturally if the app's default ever changes.
- Reminder math always reads `getEffectivePaymentDueDay(debt)`, so debts with `paymentDueDay === undefined` still surface in the banner/prompt - they just use day 15 until the user sets their real schedule.

### Captain's Course chapter 2 - Patching the Hull

- Shipped all six lessons under chapter `patching_the_hull`: `ch2-l1-good-vs-bad-debt`, `ch2-l2-how-interest-works`, `ch2-l3-starter-emergency-fund`, `ch2-l4-snowball-vs-avalanche`, `ch2-l5-refinancing`, `ch2-l6-debt-snowflake`. Wired into `lessonIndex` so the Course landing now shows Ch 2 as fully readable.
- New `hull_hand` achievement awarded on completing every Ch 2 lesson. Definition + check live in `achievementDefs.ts`; revoked-from-locked semantics are unchanged.
- Added `learningDisclaimer` text rendered on both `ChartsScreen` (Course landing) and `LessonScreen` so the not-a-financial-professional framing is consistent. Removed remaining em dashes from `dev-setup-guide.md` and a few share-flow comments.

### Budget reflects planned debt minimums

- `BudgetScreen` Spending/Debt-Payments math now counts each active debt as `max(loggedPaymentsThisMonth, debt.minPayment)` so Spent and Net surface a planned baseline from the 1st of the month instead of only growing as payments are logged.
- Debt Payments breakdown shows a "planned minimum" row for any active debt with no logged payment yet, distinct from logged payment rows. Summary copy explains the rollup so users don't think their actual spend doubled.

### Mission statement on Profile

- New static card at the top of `ProfileScreen` (`src/data/missionStatement.ts`) explaining why BudgetArk exists and that it's free. Pure content addition; no behavior changes.

### Batch add on Budget

- `AddBudgetEntryModal` starts with one amount/description row and a small **+** to add more lines before saving.
- Shared fields (type, category, month, recurring, linked account, etc.) apply to every line in the batch.
- Save creates separate `BudgetEntry` records in one pass; button reads **Add Entry** or **Add N Entries** based on how many rows have a valid amount.
- Extra rows can be removed with **×**; empty amount rows are ignored on submit.

## v1.6.5 - Ship's Log Progress + Live Badges (2026-05-25)

Two-part upgrade to the achievement system. Pure JS - ships OTA against the existing 1.6.x native runtime.

### Per-badge progress tracking

- New `AchievementDef.progress?(ctx) => { current, target, format? } | null` reporter. Returns null for badges with no meaningful partial state (binary "first payment" / "paired" / "exported once" / month-flip badges); otherwise reports raw counts so the evaluator and UI can render a partial-fill ring + "X / Y" caption.
- Added progress to 12 threshold/counter badges: Half Mast (paid vs original/2), Treasure Hoard I/II/III (net worth vs $10k/$25k/$100k), Galley Stocked (EF vs $1k), Sextant Sharp (best-progressed goal), Lighthouse Keeper (longest streak vs 30 days), Doubloon Streak (consecutive savings months vs 12), Crow's Nest (review opens vs 3), Steady Crew (longest under-budget run vs 3 months), Debt-Free Captain (cleared non-mortgage count vs total), Admiral (completed milestone steps vs total).
- `Medal` accepts an optional `progress` ratio 0..1. Locked badges with progress render a `strokeDasharray` sweep starting at 12 o'clock and bump container opacity from 0.45 to 0.7 so partial progress reads as "closer to done" than truly-flat-locked.
- `evaluateAchievements` collects every def's progress into a new `progress: Record<string, AchievementProgress>` field on `EvaluationResult` so the screen renders without a second storage pass.
- Compact currency formatter (`formatCurrencyProgress`) renders `$1.2k / $10k`, `$25k / $100k`, etc. - units stay tight on the small caption.
- `AchievementsScreen` cell shows the formatted progress line in accent color under the title; detail sheet shows the same line above the unlock date. a11y label includes progress on locked badges.

### Revocable state-based badges

- New `AchievementDef.revocable?: boolean` flag. When true and `check(ctx)` later returns false on a previously-unlocked badge, the evaluator deletes it from the unlocked map and surfaces its id in a new `EvaluationResult.newlyRevoked` array.
- Marked revocable: Half Mast, Galley Stocked, Treasure Hoard I/II/III, Debt-Free Captain, First Mate, Admiral - all conditions describe *current state*, not a historical event. Historical badges (first_steps, patched_the_hull, cartographer, sextant_sharp, crows_nest, lighthouse_keeper, doubloon_streak, steady_crew, all_sails_set, ark_builder) intentionally stay earned forever because their underlying events already happened.
- Evaluator loop restructured: single `check(ctx)` call per def feeds both the unlock-on-true path and the revoke-on-false-when-revocable path. Persist also runs when only revokes happened (previously gated on `newlyUnlocked.length || isFirstEvaluation`).
- Revoked badges silently revert to locked with their progress ring showing distance to re-earning - no nag modal in v1. `newlyRevoked` is plumbed through for a future "badge dimmed" toast.

### New legendary badge

- `galleons_hold` (💰, legendary, revocable): net worth ≥ $1,000,000. Slots between Treasure Hoard III ($100k gold) and Admiral (capstone). Progress ring tracks against the $1M target via the same `formatCurrencyProgress` used by the other Treasure tiers. Total badge count goes 18 → 19; `TOTAL_ACHIEVEMENTS` is array-length-derived so the Ship's Log "X / Y earned" counter updates automatically.

### Refinance Break-Even calculator

- New collapsible card on `UtilitiesScreen` between Loan/Mortgage and Emergency Fund.
- Current-loan side is driven entirely by the debt tracker. Multi-select list of every debt from `getDebts()` (loaded alongside EF data in the focus effect); tapping a row toggles inclusion via a `Set<string>` of selected IDs. Combined balance and balance-weighted APR derive in `useMemo`s from the selection - both read-only.
- Years remaining auto-fills via a balance-weighted average of `calcMonthsUntilDate(debt.goalDate)` across the selection, but only when every selected debt has a `goalDate`. Stays user-editable via the same `SmoothSlider` / tap-to-edit pattern. Hint copy switches between "auto-filled" and "set a goal date in the tracker to auto-fill" so users know why the slider isn't moving.
- New-loan side: rate, term, closing costs (sliders). Math reuses `calcPaymentForGoalDate` + `generatePayoffSchedule`. Surfaces months-to-break-even (`closingCosts / monthlyDelta`), monthly delta (savings/cost color cue), lifetime interest delta, and net savings over the new term (`monthlyDelta * newMonths - closingCosts`).
- Empty states: when `refiDebts.length === 0` the list shows a "Add a debt in the Debt Tracker" message. When zero debts are selected the result card shows "--" / "Pick at least one debt below" and the new-loan sliders + breakdowns are hidden via a single `hasRefiSelection` gate.
- Edge cases handled: when the new payment isn't lower, result reads "no break-even" and the net-savings card is suppressed. When the new term extends past the current loan's remaining term, a warning-tinted insight card explains the lower-payment-for-more-interest trade-off.
- Supports the consolidation-refi case: select multiple debts to roll into one new loan; the combined APR is balance-weighted, matching how a lender would amortize the consolidated principal.

### Fix: Android nav-bar tab-bar clipping

- Every main tab (Debts, Budget, Bridge, Utilities, Profile) had a hardcoded `paddingBottom: 100/110` on the scroll container - tuned to iPhone's ~34px home-indicator + the 58px `TAB_BAR_BASE_HEIGHT`. On Android phones with a 3-button nav bar (~48px inset) or even gesture pill (~24px), the actual on-screen tab bar height (`TAB_BAR_BASE_HEIGHT + insets.bottom`) exceeded that buffer, clipping the last item (most visibly the "BudgetArk v1.6.5" footer on Profile).
- Replaced the magic numbers with `paddingBottom: TAB_BAR_BASE_HEIGHT + insets.bottom + 24` applied inline on each scroll container's `contentContainerStyle`. Static styles drop the dead `paddingBottom` field so there's only one source of truth. Pulled `useSafeAreaInsets` + `TAB_BAR_BASE_HEIGHT` imports into Profile/Utilities/Bridge; Budget/DebtTracker already had insets for FAB positioning so just added the layout import.

### Fix: walkthrough spotlight missing the FAB

- Budget and Debts walkthrough steps that highlight the `+` button were using `useCoachmarkComputedAnchor` to derive a window rect from `Dimensions.get("window").height - fabBottomOffset(insets.bottom) - FAB_SIZE`. That math only matches the real on-screen FAB when the window's coordinate space matches the screen view's coordinate space - which on Android can drift depending on edge-to-edge mode, status-bar-translucent flag, and nav-bar height. Result: the spotlight ring landed above (or below) the actual FAB.
- Replaced the computed-rect approach with a **phantom anchor View** rendered next to each FAB at the same layout position (`styles.fab` + the live `bottom: fabBottomOffset(insets.bottom)`), marked `collapsable={false}`, `pointerEvents="none"`, and `opacity: 0`. The coachmark anchor system measures it via `measureInWindow`, which is RN's source of truth for the on-screen position - by construction the spotlight lands exactly where the FAB lands.
- The phantom stays mounted even when the FAB is conditionally hidden (e.g. during multi-select on Budget), so the walkthrough still finds an anchor if it runs in those states. Dropped the now-unused `useCoachmarkComputedAnchor` + `Dimensions` imports from both screens and trimmed the stale "computed-rect" comment on `FAB_RIGHT/SIZE`.

## v1.6.4 - Cleaner Bridge + Smarter Update Prompt (2026-05-24)

Bridge accounts card UX polish + a structural fix for the OTA "Update Ready" modal so highlights actually show. Pure JS - ships OTA against the existing 1.6.x native runtime.

### Bridge category UX

- `BridgeScreen` accounts card now opens with every category collapsed. `collapsedAccountCategories` state seeds with `new Set(ASSET_ACCOUNT_CATEGORIES)` so first render hides every group; tap a header to expand. Cuts first-view height for users with accounts spread across several categories.
- Moved the category emoji glyph from individual account rows up to the category header (`{iconForCategory(group.category)} {label}`), matching the Budget screen's `{getCategoryIcon(category)} {category}` pattern. Removed the per-row `accountIcon` chip; nested rows keep their 28px indent via the existing `accountRowNested` style. Emergency Fund keeps its 🛡️ chip since it's pinned outside the category groups.

### Budget screen spacing fix

- `BillCalendarCard`'s root `card` style had no `marginBottom`, so the card butted directly against the Spending card below it - inconsistent with every other Budget card. Added `marginBottom: 14` to match the surrounding `reviewBtn` / `marginBottom: tokens.gap` spacing.

### OTA "Update Ready" modal now shows highlights

- Root cause: `findReleaseNoteForVersion` was looking up the incoming version in the *currently running* bundle's `RELEASE_NOTES` list. Since release-note entries ship inside the bundle they describe, the running (older) bundle never has the new version's entry - the lookup always returned undefined and the modal rendered version-only.
- Fix: `resolveUpdateInfo` now tries `JSON.parse` on the manifest's message field first via the new `tryParseReleaseNoteFromMessage` helper. If the parsed payload has the `{version, title, releasedAt, highlights[]}` shape we treat it as the release note directly, ahead of the baked-in lookup chain. Plain-string messages still fall through to the existing `findReleaseNoteForVersion` → `inferReleaseFromCurrentVersion` cascade so older publish flows keep working.
- New `scripts/eas-update-message.mjs` reads the top entry from `src/data/releaseNotes.ts` (regex-based, no ts-node dependency) and emits the JSON payload to stdout. Wired up as `npm run update:message`. Publish becomes:

  ```bash
  eas update --branch production --message "$(npm run -s update:message)"
  ```

- The very next OTA still shows version-only (existing user bundles predate the parser); every OTA after that picks up highlights from the manifest immediately.

## v1.6.3 - Better Update Check Errors (2026-05-24)

Tightens the "Update Check Failed" modal in Profile so a flaky connection is correctly identified instead of being surfaced as an unknown failure. Pure JS - ships OTA against the existing 1.6.x native runtime.

### Update-check error handling

- `ProfileScreen.checkForUpdates` catch branch was matching Expo's thrown error string with case-sensitive `.includes()` against three substrings (`failed to check`, `network`, `timeout`). Real platform throws are worded differently - iOS `"Failed to download manifest"` / `"The Internet connection appears to be offline"`, Android `"Unable to resolve host"`, Node-style `ENOTFOUND` / `ECONNREFUSED` / `ECONNRESET` / `ETIMEDOUT` - so the friendly "check your connection" copy almost never fired and users saw a raw stack-trace-looking message instead.
- Lowercases the message before matching and broadens the hint list: `failed to check`, `failed to download`, `network`, `timeout`, `timed out`, `offline`, `resolve host`, `unreachable`, `connection`, `internet`, `enotfound`, `econnrefused`, `econnreset`, `etimedout`.
- Always appends the raw error message under `Details:` regardless of which branch matched, so non-network failures still surface the underlying error for diagnosis instead of being swallowed by friendly copy.

## v1.6.2 - Bridge Categories + Pay-Off Fix (2026-05-24)

Bridge screen restructure plus a Debt-screen rounding fix. Pure JS - ships OTA against the existing 1.6.x native runtime.

### Bridge accounts grouped by category

- `BridgeScreen` accounts card was a flat list; now matches the Budget screen's grouped-by-category layout. A `DonutChart` allocation summary sits on top showing total balance + account count, then collapsible per-category groups (Checking, Savings, Retirement, HSA, Investment, Other) hold the nested account rows. Empty categories drop out of the list. Emergency Fund stays pinned above the groups since it's a savings goal, not an asset.
- Removed the now-redundant Tracked Accounts / Emergency Fund stats strip above the accounts card - the donut summary shows the same totals.
- Dropped the orphan `bridge-overview` coachmark + its dead anchor/styles along with the stats strip.

### New Checking asset category

- Added `checking` to `AssetAccountCategory`. The new-asset modal defaults to Checking instead of Savings so the most common asset type is one tap away.
- Fixed `ACCOUNT_ICONS` map: had stale `investing` / `cash` keys that didn't match real categories and missing entries for `checking` / `investment`. Re-typed the map as `Record<AssetAccountCategory, string>` so future category additions fail typecheck if not mapped.

### Debt pay-off rounding fix

- `DebtCard` Pay button silently rejected the typed amount when it exceeded `debt.balance`, which left small balances impossible to clear (a debt displaying $0.09 with a stored 0.0899... balance refused $0.09 as an overpayment). Clamp the typed amount down to `debt.balance` instead so display-rounding gaps and small intentional overpayments still zero the debt.

## v1.6.1 - Profile Crash Fix + OTA Release Notes (2026-05-24)

Hotfix for an iOS crash on the Profile tab introduced by the v1.6.0 OTA-prompt refactor, plus the previously-unreleased release-notes prompt that drove that refactor.

### Profile crash on iOS (P0)

- The v1.6.0 OTA refactor extracted `findReleaseNoteForVersion` into `src/utils/updateReleaseNotes.ts` but `ProfileScreen.tsx` still referenced the symbol directly inside an inline IIFE in the Update Ready Modal's JSX. Because the IIFE evaluates during render regardless of Modal visibility, every mount of ProfileScreen threw `ReferenceError`, crashing the app with a black screen on Profile tab tap. Added the missing import.

### Release notes in OTA prompt

- New `src/utils/updateReleaseNotes.ts` consolidates the version-matching + notes-lookup helpers (`findReleaseNoteForVersion`, etc.) that were duplicated across `App.tsx` and `ProfileScreen.tsx`.
- `App.tsx` Update Ready modal now shows the highlights for the incoming version instead of a generic "an update is available" message. `ProfileScreen` shares the same util so the in-app release notes viewer stays consistent with the OTA prompt.

## v1.6.0 - Appearance Controls + Loan Details (2026-05-22)

Minor version bump for the new appearance-system split, accessibility-focused background controls, and loan-calculator expansions.

### Appearance controls

- Appearance is now split into **Theme + Design Style**. The glass look is no longer tied only to Deep Space - you can mix **Solid** or **Glass** with any theme, including Deep Space in a plain solid mode.
- Added a persisted **SurfaceStyleProvider** and design-style picker in **Profile → Appearance** so visual treatment is selected separately from color theme.
- Deep Space's glass treatment was decoupled from the theme palette itself, so the theme can now be used in both Glass and Solid modes without special-case color definitions.

### Ambient backgrounds

- Deep Forest now gets a richer misty night-forest ambient background: dark forest gradient base, canopy glow, soft mist bands, and subtle firefly specks.
- Deep Space keeps its starfield / nebula background, but ambient backgrounds are now controlled centrally instead of being hardwired only to that theme.
- Added an **Ambient Backgrounds** toggle in **Profile → Appearance** so users can disable decorative backgrounds and keep a plain backdrop for readability, comfort, or accessibility.
- Synthwave's decorative grid also respects the same background-effects preference.

### Budget reminders

- Budget now shows an in-app **due-date reminder banner** for upcoming recurring bills. It surfaces the next few due dates, total scheduled amount, and opens the Bill Calendar when tapped.

### Utilities loan upgrades

- The **Loan / Mortgage Calculator** on Utilities now includes a full amortization schedule with month-by-month principal, interest, payment, and remaining balance.
- Loan results now also include a **yearly summary**, a **first-5-years interest highlight**, a **collapsible yearly summary section**, and **CSV export** for the amortization schedule.

## v1.5.0 - Deep Space Redesign (2026-05-15)

Minor version bump - first release with a native-facing UI redesign plus the features accumulated since v1.4.16. `app.json` version is `1.5.0`.

### Bridge & Budget redesign

- Both screens reworked to a "trading terminal" concept layout: centered header block, a bordered divider stat strip (`Income / Spent / Net` on Budget, `Tracked Accounts / Emergency Fund` on Bridge), glass cards with a top accent hairline, and `tabular-nums` values throughout.
- Budget Spending card rebuilt: 92px donut with a centered month-total overlay, a side legend with per-slice percentages, and per-category horizontal bars (fill scales to the limit when set, otherwise to the biggest category that month; over-limit turns red). Tap-to-expand and long-press-to-set-limit behavior unchanged - presentational only, no logic/data changes.
- Budget month switcher replaced with a single `‹ Month ›` pill.
- New `CashFlowChart` component on the Bridge: grouped income/expense bars for the trailing 6 months with a net "wick" + net trend line, derived from existing budget entries.

### Deep Space theme

- New opt-in `deep_space` theme preset (`src/theme/themes.ts`) with a translucent-card palette.
- New `SpaceBackground` component: SVG radial-gradient base, three nebula glows, and a static seeded starfield (mulberry32 PRNG so it never reshuffles). Static by design - no animation loop.
- Mounted globally in `AppNavigator` behind the tab navigator and gated on the active theme id. When Deep Space is active, all five tab screens (Bridge, Budget, Debts, Utilities, Profile) render their roots transparent and the navigator scene is transparent so the starfield shows app-wide. Other themes pay zero cost.

### Features since v1.4.16

- Custom budget categories with emoji icons (add-only v1), preserved across spreadsheet/backup round-trips and paired-device sync.
- Ship's Log completed: 5 new achievement badges, full-year history, and a Profile entry point.
- Annual Financial Report added to the Bridge.
- "View history" hint added to the debt payoff ring.
- Recurring budget entries gained a frequency picker (Monthly / Quarterly / Every 6 months / Yearly). New `recurrenceInterval?: 1 | 3 | 6 | 12` field on `BudgetEntry` defaults to monthly on read so pre-existing recurring entries keep their cadence with no migration. A shared `src/utils/recurrence.ts` helper (`isEntryActiveInMonth`, `countOccurrencesBetween`, `listOccurrenceMonths`, `getRecurrenceInterval`, `getRecurrenceTag`) replaced inline `entryMonth <= monthKey` logic in `BudgetScreen`, `BridgeScreen`, `annualReport`, `budgetInsights`, `achievementDefs`, `UtilitiesScreen`, and `linkedAccountRecurring` so every consumer agrees on which months a recurring entry is active. The linked-account catch-up loop now credits one delta per cycle that lands in the window (a quarterly entry credits once per quarter, not three times). Spreadsheet export adds a `RecurrenceInterval` column and only projects cycle months; import parses it and falls back to monthly when blank, so older workbooks round-trip cleanly. Entry-row labels show the interval ("Quarterly", "6 mo", "Yearly") instead of always saying "Monthly".
- Bill Calendar on Budget. Recurring expenses now carry a real day-of-month (Add/Edit modals show a 1-31 picker when Recurring + Expense; default 15 for backwards compat, clamped to the start month's last day on write). New `src/utils/billCalendar.ts` derives `getDayOfMonth` (with per-rendered-month clamp, mirroring the spreadsheet exporter), `groupBillsByDay`, `nextBillFrom` (walks up to 12 months so quarterly / 6-mo / yearly entries surface), and `splitPaidVsRemaining`. `BillCalendarModal` renders a 7-col grid with category-color dots per day (palette matches the donut via the existing `colorForCategory`), today ringed, past days dimmed, tap-a-day bottom sheet that hands off to the existing `EditBudgetEntryModal`. `BillCalendarCard` on the Budget tab between the Monthly Review button and the Spending card shows "N bills · $X · remaining · next bill" and hides itself when there are zero bills. Income excluded by default (paychecks aren't bills); a "Show one-offs too" toggle inside the modal opts non-recurring expenses in. Pure JS - no storage migration, no new deps.

## v1.4.16 - Sync Reliability + Cleanup (2026-05-04)

Round 2 audit follow-up - closes every remaining `Potentialbugs.md` Round 2 item except the two explicitly deferred low-impact P3s. Pure JS - `runtimeVersion` stays at `1.4.14`, ships as OTA against the v1.4.14 native binary.

### Tombstone-based soft delete for sync (P0)

- New `src/storage/tombstones.ts` module: `tombstone(record, now)`, `filterLive(records)`, `purgeExpiredTombstones(records)`. `TOMBSTONE_TTL_MS = 90 days` - old tombstones GC'd on read once every paired device has had time to converge.
- `Debt`, `Payment`, `BudgetEntry`, `SavingsGoal`, `AssetAccount` types each gained an optional `deletedAt: string`.
- Each storage module now exposes `getXIncludingDeleted` for sync consumers; the public `getX` filters tombstones via `filterLive`. `deleteX` soft-deletes by stamping `deletedAt` + `updatedAt` to the same `now`. `addX` / `updateX` route through the tombstone-aware getters so an in-flight tombstone isn't accidentally overwritten by a new save.
- `src/sync/diffEngine.ts`: `computeOutgoingDiff` reads via the `*IncludingDeleted` getters; `filterChanged` now emits `action: "delete"` for any record whose `updatedAt > since` AND has `deletedAt` set, `upsert` otherwise. `mergeById` is tombstone-aware: it always replaces by LWW timestamp instead of `localMap.delete()`-ing on the delete branch, which keeps the tombstone locally so a stale third device's later upsert loses LWW. `applyIncomingDiff` now reads + saves through the `*IncludingDeleted` helpers so tombstones survive merge.
- `recordPayment` reads via `getDebtsIncludingDeleted` + `getPaymentsIncludingDeleted` and only mutates non-tombstoned debts, then writes both through the new `multiSet` (see below) so tombstones don't get clobbered.
- Screens that previously deleted via `arr.filter(x => x.id !== id)` + `saveX(filtered)` now route through the soft-delete CRUD: `DebtTrackerScreen.confirmDelete` → `deleteDebt(id)`; `DebtTrackerScreen.handleDeleteSavingsGoal` → `deleteSavingsGoal(id)`; `BudgetScreen.handleDeleteEntry` → `deleteBudgetEntry(id)`; `BudgetScreen.deleteAsset` → `deleteAssetAccount(id)`; `BridgeScreen.deleteAsset` → `deleteAssetAccount(id)`.

### P1 fixes

- **PairingModal unmount cleanup**: teardown body extracted into a single function used by both the `!visible` branch and the effect's return. A parent that unmounted the modal while it was still `visible: true` used to leak the countdown setInterval, listening TCP server, and Zeroconf publish - wedging the next pair attempt on the same port.
- **Cross-key compound writes**: new `EncryptedStorage.multiSet([[k,v],...])` encrypts each value, splices a single tail Promise into every per-key queue, then issues one `AsyncStorage.multiSet`. `recordPayment` refactored onto it so a `withTimeout` rejection between debts and payments no longer leaves the balance reduced without a matching payment row.
- **Timezone bugs**: `calcMonthsUntilDate` (`src/utils/calculations.ts`) now uses UTC getters on both ends. `linkedAccountRecurring.getMonthKey` switched to UTC; new `monthKeyFromISO` slices the YYYY-MM prefix directly when possible. ISO date strings parse as UTC midnight; mixing that with `getMonth()` for users west of UTC was reading the previous month and either rounding `calcPaymentForGoalDate` to `Infinity` on the boundary or crediting recurring contributions a month early.

### P2 fixes

- **Auto-sync double-fire**: new `syncInProgress` boolean in `autoSyncManager`. The cooldown check still gates entry, but two listeners that pass cooldown nearly simultaneously and the first one suspends on `await getPairingState()` no longer race into a parallel sync.
- **Discovery teardown**: `discoveryService` split into separate `publishZc` / `browseZc` instances. `discoverPartner.cleanup`'s `zc.stop()` was killing the publish channel too - a fallback-mode device that started its own server + publish, then ran a second discovery scan, was silently losing its advertisement.
- **`seenNonces` bound**: now `Map<nonce, ts>`. Pruning runs when size > 1024, drops entries older than `MAX_MESSAGE_AGE_MS` (5 min). Age check moved before the insert so we never spend a slot on a nonce we'd just have to prune. Also removes the unbounded session-lifetime growth.
- **Replay reset on every error path**: `syncNow` calls `Discovery.stop()` + `Transport.resetReplayProtection()` from a `finally` block instead of only on the catch path. Inner happy paths still call them too - calling twice is idempotent. Covers timeout closures and other internal failures that don't bubble through the outer catch.
- **PayoffStrategy LWW**: strategy now stored as `{ value, updatedAt }` envelope. New `getPayoffStrategyEnvelope` and `savePayoffStrategyEnvelope` for sync use; legacy bare-string data normalized to the epoch on read AND written back so subsequent reads skip the migration branch. `SyncDiff` carries `payoffStrategyUpdatedAt` alongside `payoffStrategy` (back-compat: missing timestamp from older peers treated as epoch). `applyIncomingDiff` resolves with proper LWW; the strategy no longer flip-flops on every sync direction.
- **Theme + Density flash**: both providers track a `ready: boolean` and render `null` until storage resolves. Adds ~10-30 ms blank screen on cold start but eliminates the flash of `DEFAULT_THEME_ID` / `DEFAULT_DENSITY_ID` for users with non-default presets.
- **`clearAllData` non-atomic on Android**: new `ResetIncompleteError`. `clearAllData` uses `Promise.allSettled` + one retry pass per key; throws if any still hasn't cleared. `ProfileScreen.confirmReset` catches it and shows a "Reset incomplete" modal instead of pretending success.

### P3 cleanups

- `useTabCoachmark.handleNext` setTimeout tracked in `navTimerRef`, cleared on unmount so we don't fire `navigation.navigate` against a stale screen ref.
- `CoachmarksProvider.markSeen` reads `seenTabs` directly and awaits `persist` outside the setState updater (updaters must be pure; old code could fire the async persist twice on a re-render).
- `calcAvgMonthlyExpenses` denominator counts months with *any* entry, not just months with `expense > 0`. Was inflating the average upward by dropping legitimate zero-expense months from the divisor.

### Audit follow-up after second pass

A final-pass audit found six more issues. Top-three fixed:

- **Password-encrypted export KDF (P1, security)** - old format used `CryptoJS.AES.encrypt(json, password).toString()`, which falls back to OpenSSL's EVP_BytesToKey (single-round MD5). A 4-character password was brute-forceable in seconds offline. New v2 envelope uses PBKDF2-SHA256 with 250k iterations, a random 16-byte salt per export, and a random 16-byte IV: `__BUDGETARK_ENC2__:<salt-hex>.<iv-hex>.<ct-base64>`. The import path detects the prefix and dispatches to the v2 decrypt; the legacy `__BUDGETARK_ENC__:` prefix is still readable for old backups (no migration needed - users keep using the same password).
- **`clearAllData` storage key coverage (P1)** - `RESET_KEYS` now also wipes `@budgetark_coachmarks` (so the walkthrough re-shows after a reset), `@budgetark_backup_reminder` (so the post-upgrade nudge doesn't carry over), `@budgetark_last_seen_release_notes_version` + `@budgetark_ota_update_installed` (so the latest release notes show again), and `@budgetark_update_preferences`. User account, pairing state, and sync metadata were already wiped via `confirmReset` in ProfileScreen. Visual prefs (theme, density, haptics, privacy mode) intentionally survive - they're cosmetic, not user data.
- **Import LWW gap (P2, silent data loss)** - `computeMergedById` in `importData.ts` previously did `existing[idx] = item` unconditionally on ID collision, which contradicted the LWW semantics `applyIncomingDiff` carefully implements. A backup-restore could (a) silently flip a tombstoned record back to live, or (b) silently delete a recent edit because the imported tombstone was older. Now compares `updatedAt` and only replaces when `incoming.updatedAt >= existing.updatedAt`. Ties go to the incoming record since the user explicitly chose to import.

Plus three smaller fixes:

- **Import rollback partial state (P2)** - Phase 3 rollback in `importData.ts` previously did sequential `await` on each restore; if a single restore timed out, the loop aborted and remaining backups stayed un-restored, leaving storage in a torn state. Now uses `Promise.allSettled`, collects failed keys, and throws a distinct error message asking the user to reinstall + re-import a recent backup if any restore failed. Best-effort temp-key cleanup runs regardless.
- **`debtMilestone` sync ping-pong (P3)** - `applyIncomingDiff` was calling `saveDebtMilestonePlan` on a remote-merged plan, which clobbered the incoming `updatedAt` with `now`. Next outbound diff then re-broadcast it as a fresh edit. New `saveDebtMilestonePlanFromSync` setter preserves the incoming timestamp, mirroring the `savePayoffStrategyEnvelope` pattern.
- **Spreadsheet schema doc** - already updated in the first audit pass; covers `UpdatedAt` for Debts / Payments / Savings Goals / Asset Accounts.

### Audit follow-up after first pass

A focused parallel-agent re-audit of the changes turned up four more concrete issues, all fixed before commit:

- **Validator gap on `deletedAt`**: `recordValidators.ts` now requires `deletedAt` to be a parseable ISO string when present (new `isOptionalIso` helper applied to all five record validators). Without this a malicious peer could send `deletedAt: "garbage"` past the diff-engine validator and create a permanent un-purgeable tombstone (the GC's `Number.isFinite(now - NaN)` is false, so the age-out branch never fires).
- **Spreadsheet round-trip wipes `updatedAt` for non-budget-entry types**: same shape as the v1.4.15 P0 fix that only covered budget entries. `DEBT_COLUMNS`, `PAYMENT_COLUMNS`, `SAVINGS_GOAL_COLUMNS`, `ASSET_ACCOUNT_COLUMNS` now include `UpdatedAt`. Row builders write `entity.updatedAt`. Importers preserve it (fall back to `CreatedAt` then `now`). Without this, debts/payments/savings/assets imported from xlsx all stamped `now`, then the next paired sync would clobber the partner's data via LWW.
- **JSON export drops tombstones**: `exportData.ts` switched to `getXIncludingDeleted` for the five tombstoned collections. Replace-mode imports now preserve tombstones across backup-restore. Without this, restoring a backup wiped the user's local tombstones and only the partner's tombstones (next sync) would keep things consistent - a state that breaks if the partner hasn't synced yet.
- **Legacy payoff strategy re-pays JSON.parse on every cold start**: `getPayoffStrategyEnvelope` now writes back the synthesized envelope on first read of a legacy bare-string value. Subsequent reads skip the migration branch.

`docs/SPREADSHEET_SCHEMA.md` updated with the new `UpdatedAt` columns for Debts / Payments / Savings Goals / Asset Accounts.

### Audit follow-up after third pass

A third-pass audit found four more concrete issues - three were the same shape as bugs we'd already fixed (`updatedAt` getting stripped on a round-trip path that paired-sync's LWW depends on), one defense-in-depth on the new compound-write helper.

- **JSON export drops `payoffStrategyUpdatedAt`** - `exportData.ts` was calling `getPayoffStrategyPreference()` (returns the bare value), so the JSON payload had `payoffStrategy` but no timestamp. A backup-restore on this or a paired device stamped the strategy with import-time `now`, which sync's LWW then propagated over whichever choice the partner had - same ping-pong the v1.4.16 P2 fix closed for the sync wire format. Switched to `getPayoffStrategyEnvelope`, exports both `payoffStrategy` and `payoffStrategyUpdatedAt`. `importData.computeMergedById` already LWW's correctly; the import path now also persists the proper `{value, updatedAt}` envelope to disk when both fields are present (older exports without the timestamp keep falling through to the legacy bare-string format, which `getPayoffStrategyEnvelope` upgrades on first read).
- **Budget-limits sheet missed the spreadsheet `UpdatedAt` round-trip** - the v1.4.16 second-pass fix added `UpdatedAt` columns to debts / payments / savings goals / asset accounts but missed budget limits. `BUDGET_LIMIT_COLUMNS` now includes `UpdatedAt`; `budgetLimitToRow` writes `limit.updatedAt`; `rowToBudgetLimit` parses and preserves it. Without this a spreadsheet round-trip silently re-stamped every limit at import time, clobbering partner edits via LWW the same way the other four entities used to.
- **`updatedAt` not enforced at the trust boundary** - pre-existing gap, but bigger now that we lean entirely on LWW for delete propagation. All five entity validators (`isDebtItem`, `isPaymentItem`, `isBudgetEntryItem`, `isSavingsGoalItem`, `isAssetAccountItem`) now call `isOptionalIso(item.updatedAt)`. Missing field is still allowed (older peers stay compatible - they just lose LWW to the local record, which is the safe default), but a peer sending garbage in `updatedAt` is rejected at the validator instead of silently producing a `tsOf === 0` that then loses every comparison.
- **`EncryptedStorage.multiSet` duplicate-key guard** - no current caller passes the same key twice, but the silent last-write-wins behavior at the platform layer combined with the per-key write-queue tail map only retaining one entry meant any earlier queued write for that key could resolve *after* the multiSet and clobber it. Now throws on duplicate keys; cheap to detect, nightmare to debug if it ever happened.

### Final cleanup pass

Picked up the previously-deferred items from `Potentialbugs.md` plus one self-audit finding on the v1.4.16 changes themselves.

- **`getBudgetEntries` rewrite-on-read churn** (and the matching `getDebtsIncludingDeleted` / `getPaymentsIncludingDeleted` / `getSavingsGoalsIncludingDeleted` / `getAssetAccountsIncludingDeleted` paths). The previous pattern was `parsed.map(normalizeX) → purgeExpiredTombstones → JSON.stringify(parsed) !== JSON.stringify(purged)` for the gate, which allocated a new spread per record on every read and ran an O(n × record-size) self-diff on data that almost always hadn't changed. Normalize helpers now return the same element ref when no field needs filling; the read path tracks a `normalizeChanged` boolean and compares array identity against `purgeExpiredTombstones`'s "returns original ref on no-op" semantics. Steady-state reads (post-migration, no expired tombstones) cost O(1) instead of O(n).
- **`calcInvestmentGrowth` clamps negative rates to 0** - silently turned a deflationary / loss scenario into a 0%-return one. Math accepts any monthly r > −1, so widened to `[-MAX_RATE, MAX_RATE]`. UI still defaults to positive input - this just makes the function correct if a future loss-scenario picker exposes negative rates. Same widening applied to `calcInvestmentTimeline`.
- **`linkedAccountRecurring` orphan stamping (self-audit finding)** - when an asset account got soft-deleted, recurring budget entries linked to it still advanced their `lastAppliedMonth` on the next focus catch-up even though the missing account never received the credit. Result: the user silently lost one month's contribution at delete time, and the entry was thereafter treated as already applied with nothing to apply against. Catch-up now skips entries whose `linkedAccountId` isn't in the live-account set, leaving them in needs-catch-up state so a future relink can apply the missed months.

### Deferred

- Theme/Density null-render flicker (~10-30 ms blank frame) - already gated on a `ready` boolean above; collapsing the blank frame to zero would need a splash background or a coordinated `ready` gate at the App level.
- Merge-mode JSON import resurrection of locally-tombstoned records - sync corrects on next round-trip via LWW (partner's tombstone wins). Annoying intermediate state but self-corrects.

### Verification

- `npx tsc --noEmit` clean.
- No `app.json` / `eas.json` / native module changes.
- `runtimeVersion` stays at `1.4.14` - ships OTA on the v1.4.14 binary in TestFlight / Play.

## v1.4.15 - Stability + Math Fixes (2026-05-03)

Round of audit-driven fixes against a static-review pass over the codebase. All P0 items from `Potentialbugs.md` round 2 plus the P1 items that were single-file changes; architectural fixes (delete tombstones, multiSet for compound writes) stay deferred. Pure JS - runtimeVersion stays at `1.4.14`, ships as OTA against the v1.4.14 native binary already in TestFlight / Play.

- BudgetScreen now reads recorded debt payments. Previously the screen only knew about the synthetic minimum-payment forecast (derived from `activeDebts.minPayment`), and that forecast was hard-suppressed (`return 0`) for any month that wasn't current or next - so past months always showed `$0` for the "Debt Payments" category even when the user had recorded real payments on the Debt Tracker. Now `BudgetScreen` loads `getPayments()` alongside its other data, computes `recordedDebtPaymentsForMonth` by filtering on `selectedMonthKey`, and surfaces both the total and per-payment drilldown rows. The synthetic forecast (`automaticDebtMonthlyCost`) now only fires for the next-month view - past and current months show actuals only, no double-counting between forecast and recorded data. Drilldown rows for past/current pull from the Payment collection (with debt name + actual amount + actual date); for next-month forecast they fall back to the per-debt min-payment synthetic rows. The "Includes $X auto debt minimums" hint stays but now only renders on next-month view, since past/current months don't need a forecast caveat.
- Build-Your-Ark savings reserve narrowed to the `Savings` category only. The keel/supplies milestone progress, runway-months calc, and the synthetic `__keel_ef__` SavingsGoal Bridge constructs when no explicit EF goal exists used to sum `Savings` + `Retirement` + `Investing` entries. That conflated long-term retirement money with the user's liquid emergency fund. `Retirement` and `Investing` already feed the gather_animals milestone via `retirementInvestingMonthly`, so narrowing keeps the milestones semantically distinct: liquid EF on keel/supplies, retirement-rate on gather_animals. Applied identically across `DebtTrackerScreen.tsx`, `BridgeScreen.tsx`, `BudgetScreen.tsx`, and `spreadsheetExport.ts` so all four `savingsReserve` derivations stay consistent.
- Net Worth math (`src/utils/netWorth.ts`): `entrySavings` filter broadened from `"Savings"` only to all three reserve categories (`Savings`, `Retirement`, `Investing`). Net Worth represents *all* assets the user has, including long-term ones - so Retirement and Investing still count here, just not toward the EF. Previously a user with $10k logged in Retirement saw Bridge report a different Net Worth than Build-Your-Ark for identical data. Also excluded entries carrying a `linkedAccountId` from `entrySavings` - those contributions already credited an asset account via `applyMissedRecurringLinkedAccountContributions` / the Budget add/edit handlers, so counting them again was double-counting against the asset balance below.
- Per-key write serialization in `encryptedStorage.ts`: `setItem`, `removeItem`, and `multiRemove` now route through a per-key Promise chain. Two concurrent writes to the same storage key (e.g. `recordPayment` mutating debts while `applyIncomingDiff` also writes debts on a sync) used to race because each ran `getX → mutate → saveX` on its own snapshot, and the second writer would silently overwrite the first writer's record. The chain ensures the second write reads-after-the-first-writes-back at the storage layer, closing the silent-clobber window. The map only tracks the latest tail per key and self-cleans when the tail settles.
- Recurring auto-apply double-credit: `BridgeScreen` and `BudgetScreen` both ran `saveBudgetEntries` and `saveAssetAccounts` in `Promise.all` after computing missed-contribution deltas. If the asset write committed first, another tab focusing in that window could read `(newBalance, oldLastAppliedMonth)` and re-apply the same contribution, silently inflating the asset balance. Both screens now sequence: entries (the marker) save first, then assets - so any reader between the two saves sees a `lastApplied` that gates further apply attempts.
- Spreadsheet round-trip preserves timestamps: `BUDGET_ENTRY_COLUMNS` now includes `CreatedAt` and `UpdatedAt`. Importer prefers stored timestamps over import-time `now`, falling back to `createdAt` then `now` when missing. Without this, exporting xlsx and re-importing the same file made every entry "freshly edited" on the partner's next sync, overwriting their data via LWW. Schema doc (`docs/SPREADSHEET_SCHEMA.md`) updated with the three new optional columns (`LastAppliedMonth`, `CreatedAt`, `UpdatedAt`).
- Hull simulator divergence: `SmartPlanModal.tsx` and `PayoffPlannerModal.tsx` were filtering `balance > 0` only (mortgage included) while `DebtTrackerScreen` filtered `debtClass !== "house"`. Same data, simulator numbers 10-30× larger on the modal side once a mortgage existed. Both files were orphans (zero imports across the repo, presumably superseded during v1.0.5 development) - deleted, same treatment `InvestmentScreen.tsx` got in v1.4.12.
- `decryptV2` (`src/storage/encryptedStorage.ts`) no longer collapses an empty plaintext into a tampering throw. The `return plaintext || null` line treated an empty string as a `DecryptionError`, which `getOrCreateUser` and other callers don't catch. HMAC has already validated the bytes by the time we hit the toString call, so empty is legitimate; trust it.
- iOS modal-stacking fixed in two `DebtTrackerScreen` paths: `onViewHistory` now waits 250 ms between dismissing the celebration and presenting history, and `handleSaveEdit` defers the celebration Modal by 250 ms when an edit pays off a debt so the edit Modal's close animation finishes first. Same dismiss-then-present-in-one-frame pitfall the coachmark Modal hit earlier - RN can't reliably stack two Modal state changes in a single render.
- Async-loader cancellation flags added in `BudgetScreen`, `BridgeScreen`, `DebtTrackerScreen`, `UtilitiesScreen`, and `PaymentHistoryModal`. Standard pattern: `let cancelled = false`, gate every `setX` after an await, return cleanup that flips the flag. Tap the BudgetScreen month switcher fast and you no longer see a slower load resolve last and overwrite the newer one's data.
- `ProfileScreen` mount-effect cleanup now calls `stopMonitoring()` when the load actually started auto-sync monitoring, so unmounting the Profile screen (Reset All Data flow, navigation reset, etc.) doesn't leak the NetInfo subscription firing `setLastSyncTime` against a torn-down component.
- `simulatePayoffPlan` (`src/utils/calculations.ts`) returns `monthsToPayoff: Infinity` (instead of the misleading early-exit month count) when `isPayoffPossible` is false. `formatPayoffMonths` already handles non-finite as "Not solvable", so the UI now correctly shows that label instead of "1 mo" for a debt where the minimum can't cover monthly interest.

Tracked but deferred to a future commit (see `Potentialbugs.md`):

- Delete tombstones for cross-device sync (`mergeById` can't currently represent deletions - needs schema change).
- Storage-timeout cross-key partial state (compound writes need `multiSet` adoption).
- Timezone bugs in `calcMonthsUntilDate` and recurring auto-apply month parsing.
- `PairingModal` cleanup leak on parent unmount.
- Auto-sync race firing `syncNow` twice on app foreground.
- Discovery `zc.stop()` tearing down both browse and publish channels.
- Unbounded `seenNonces` set in `transportService`.
- `payoffStrategy` LWW (currently flip-flops on sync direction).
- ThemeProvider / DensityProvider flash-of-default on cold launch.
- `clearAllData` `multiRemove` non-atomic on Android.

## v1.4.14 - Walkthrough Polish (2026-05-03)

- Replay walkthrough now chains all five tabs into a single continuous tour. Earlier the Replay button cleared `seenTabs` and fired the spotlight on the currently-focused tab only - the user got Profile's two-step tour and nothing else, because there was no mechanism to navigate between tabs. Added a `guidedQueue` ref to `CoachmarksProvider` plus `startGuidedTour(queue)` / `advanceGuidedTour()` helpers; Profile's two Replay buttons now call `startGuidedTour(["DebtTracker", "Budget", "Bridge", "Utilities"])` after `replayCoachmarks()`. After the last step's "Got it" on each tab, `useTabCoachmark` pops the queue head and `navigation.navigate()`s there (220 ms after the spotlight Modal close so dismissal and tab change don't fight). `skipAll` and `replay` both clear the queue so abandoned tours don't strand stale state.
- Replay flow no longer stacks two Modals. Profile's "Replay walkthrough" and the How-To "Replay tour" buttons used to call `replayCoachmarks()` followed immediately by `setInfoModal(...)`. With `seenTabs` cleared, every mounted tab's `useTabCoachmark` re-fired its tour-start effect in the same render cycle that opened the info-confirmation Modal - RN can't reliably present two Modals at once, so one was queued or visually layered behind the other (visible in user-supplied screenshot: "Walkthrough reset" dialog and the spotlight tooltip rendering on top of each other). Drop the info modal on the settings-row Replay (the spotlight is its own confirmation); on the How-To "Replay tour" button, dismiss the How-To Modal first and defer `replayCoachmarks()` by 350 ms so the close animation finishes before the spotlight presents.
- `useTabCoachmark` now gates the spotlight on `useIsFocused`. With React Navigation's lazy-mount tabs, every visited tab stays mounted; when `seenTabs` reset, all five tabs' hooks fired `setActive(true)` simultaneously and tried to present their `<Spotlight>` Modal - only the focused tab's content was correct, the rest leaked from hidden tabs. Single `useEffect` now fires only when `isFocused === true`; a second effect closes the Modal on blur so the spotlight cleanly hands off to the next focused tab. Old `useFocusEffect` + standalone re-trigger pattern removed.
- Spotlight overlay now scrolls the parent `FlatList` / `ScrollView` to bring the anchor into view before measuring. New `useCoachmarkAnchor(id, { scrollRef })` option threads a screen's main scroll ref into its anchors; on `measure(id)`, the context calls `findNodeHandle` on the scroll node, runs `measureLayout` to compute the anchor's content-relative `y`, fires `scrollToOffset` (FlatList) or `scrollTo` (ScrollView), waits 320 ms for the animation to settle, then `measureInWindow` for the final rect. Bridge / Budget / Debt / Utilities / Profile screens were updated to pass `{ scrollRef }` for in-list anchors (FABs intentionally skip - they're absolute-positioned and always visible). Closes the visible bug where the Bridge "Track asset accounts" step highlighted a partially-clipped card at the bottom of the screen with the tooltip stranded mid-screen above it.
- Spotlight clears `rect` at the top of its measure effect so the previous step's highlight ring doesn't linger over the new step's text while the scroll/measure pipeline (~80 ms timer + 320 ms scroll wait + measure) is in flight.
- Bridge tour content rewritten so each step's title matches what's actually highlighted. Earlier, step 1's "Total assets minus debt" copy was anchored to `bridge-overview-card` (the small Tracked Accounts / Emergency Fund row) while the big Net Worth number lives in `bridge-history-card` above it - the user saw a ring around the wrong element. New ordering matches visual top-to-bottom: history card ("Your Net Worth", which holds the big number AND the chart) → overview card ("Tracked balances at a glance") → accounts card ("Manage your accounts").
- Empty-state behavior unchanged but worth noting: when `measureInWindow` returns null (zero-size or unmeasurable anchor) the Spotlight already falls back to a centered tooltip card with full-screen dim, so a user with no entries still sees the title and body - just no highlight ring.
- All changes pure JS. `runtimeVersion` stays at `1.4.1`, ships as OTA.

## v1.4.13 - Density Everywhere, Guided Walkthrough + Car/House Split (2026-05-03)

- Layout Density now applies app-wide. `DebtTrackerScreen`, `BudgetScreen`, `UtilitiesScreen`, `BridgeScreen`, `ProfileScreen`, and `OnboardingScreen` all consume `useDensity()` tokens through their `makeStyles(colors, tokens)` factories with a `scale(n)` helper for font sizes. Switching presets in Profile → Appearance now resizes card padding, border radius, inter-card spacing, and font sizes everywhere instead of only Bridge.
- `ProfileScreen.tsx` had a module-level `StyleSheet.create` - lifted into a `makeStyles(tokens)` factory and consumed via `useMemo`. Settings rows and grouped-card rows now also pick up `tokens.rowHeight` as a `minHeight`, so Compact tightens row height and Spacious enlarges the touch targets.
- `NetWorthHistoryCard.tsx` (rendered inside Bridge) was the last module-level offender - now also a factory consuming `useDensity()` directly. Card padding, border radius, font sizes, and meta-row spacing reflect the preset.
- Comfortable preset still matches the previous default visuals exactly, so users who don't change the setting won't notice anything different after upgrading.
- New first-launch spotlight walkthrough. The first time the user lands on each of the 5 tabs, a guided tour highlights specific UI elements - for example, on Debts the tour spotlights the summary card, then the + button, then the milestones row - with a tooltip card explaining each one and a step counter (1 of 3, 2 of 3...). Spotlight is implemented as four absolutely-positioned dim strips around a measured anchor rect plus an accent-colored highlight ring; tooltip placement (above vs below the anchor) is chosen automatically based on which side has more screen space. Skip-all bails out of the entire tour from any step. State persists to encrypted storage under `@budgetark_coachmarks` (`COACHMARK_VERSION = 2`) so every tab is shown at most once until the user explicitly replays.
- Built from a small set of new modules - `CoachmarkAnchorContext` (View ref registry with `measureInWindow`-based async measure), `Spotlight.tsx` (modal overlay), `useTabCoachmark.tsx` (step machine driving the sequence per tab), `coachmarkContent.ts` (per-tab step list). Each tab attaches anchors to its key elements via `<View ref={useCoachmarkAnchor("debts-summary-card")} collapsable={false}>` etc. Falls back to a centered card when an anchor isn't measurable (e.g. user scrolled it off screen).
- New "Help" section in Profile with a "How to use BudgetArk" per-tab reference modal listing all steps in each tab's tour, and a "Replay walkthrough" button that resets the seen-tabs state so the tour can be replayed at any time.
- `DebtClass` split from `"personal_credit" | "car_house"` into `"personal_credit" | "car" | "house"`. Add Debt modal exposes the new options; existing debts migrate automatically the next time storage is read - `car_house` rows are split by name keywords (`mortgage` / `house` / `home loan` / `home` → `"house"`, otherwise → `"car"`) via a `splitLegacyCarHouse` helper in `debtStorage.ts` and the same logic in `spreadsheetImport.ts`. Spreadsheet schema accepts both the new values and the legacy `car_house` token for backward compatibility.
- Debt list sort is now tier-based: credit/personal first, then car, then house. The `getDebtTier(debt, promoteSecured)` helper in `DebtTrackerScreen.tsx` returns 0/1/2 based on debt class and a promotion gate. The gate (`promoteSecured = hullCompleted && allCreditCleared`) opens only when (a) the Hull milestone is marked complete and (b) every `personal_credit` debt has a zero balance - both conditions are required so the mortgage can't bury an unpaid credit card just because someone navigated to a later milestone. When the gate is open, car promotes to tier 0 and house to tier 1, with credit dropped to tier 2. Within each tier the chosen strategy still applies (avalanche by APR, snowball by balance, custom by creation order).
- Hull milestone (Build Your Ark "Clear Non-Mortgage Debt") now correctly counts car loans as non-mortgage - `nonMortgageDebts` filter changed from `debtClass === "personal_credit"` to `debtClass !== "house"`. Moorings milestone progress is now keyed only on `house` debts (was both car and house lumped together as "secured"). Snowball priority in `calculations.ts` updated to a 3-tier ordering (credit 0, car 1, house 2).
- All changes are pure JS - no new native modules. `runtimeVersion` stays at `1.4.1`, so this ships as an OTA update reachable by all existing devices.

## v1.4.12 - Layout Density Selector (2026-05-02)

- New Layout Density picker in Profile → Appearance with three presets: Compact, Comfortable (default), Spacious. Plumbing mirrors the existing theme system - `DensityProvider` wraps the app, `useDensity()` returns a `tokens` object with `pad`, `padSm`, `padLg`, `gap`, `gapSm`, `gapLg`, `radius`, `radiusSm`, `fontScale`, and `rowHeight`. Persists to encrypted storage under `@budgetark_density_id`.
- Migration is incremental. Bridge is the first screen wired up - its `makeStyles` factory now accepts `tokens` and references them for the overview / accounts card padding, border radius, inter-card spacing, modal sizing, and a `scale(n)` helper applied to font sizes. Other screens still use hardcoded values and render at the Comfortable default until they migrate.
- Comfortable preset deliberately matches the existing default visuals (`pad: 16`, `gap: 16`, `radius: 16`) so users who don't change the setting see no shift after upgrading. Compact pulls those down to 12/10/12 with a 0.92× font scale; Spacious pushes them up to 20/22/18 with a 1.08× font scale.
- The orphan `src/screens/InvestmentScreen.tsx` file was deleted. It was never reached by navigation - the actual investment calculator lives inside `UtilitiesScreen.tsx`. Stale references in the two setup-guide markdown file-trees were cleaned up at the same time.
- All changes are pure JS. `runtimeVersion` stays at `1.4.1`, so this ships as an OTA update.

## v1.4.11 - Backup Reminder After Upgrades (2026-05-02)

- New banner at the top of the Profile screen prompts the user to take a fresh backup whenever the app version has changed since their last successful export. Stamps `lastBackupVersion` + `lastBackupAt` on every successful export (JSON via `exportAllData`, spreadsheet via `exportSpreadsheet`) and surfaces the banner via `shouldShowBackupReminder(state, CURRENT_APP_VERSION)`. Tap **Back up now** opens the existing encrypted-JSON export flow; tap **Dismiss** stamps `dismissedVersion` so the banner stays hidden until the next version bump.
- Closes the practical concern that an old backup might no longer round-trip cleanly after a schema change. Even when nothing in the import format has actually broken, a user who hasn't backed up since several versions ago is one device-loss away from losing all their data - the reminder makes "take a fresh backup after every app update" the default habit.
- Banner also shows on first run for users who have never exported, with copy that frames it as "no recovery point yet" rather than "you upgraded".
- Storage shape (`@budgetark_backup_reminder` in encrypted storage): `{ lastBackupVersion, lastBackupAt, dismissedVersion }`. All optional; missing fields treated as no-state. Recording a new backup clears `dismissedVersion` so the next upgrade will re-show the banner regardless of past dismissals.

## v1.4.10 - Stronger Pairing (2026-05-02)

- Pairing code bumped from 6 numeric digits (~20 bits, ~10⁶ codes) to 8 Crockford base32 characters (~40 bits, ~10¹² codes), formatted `XXXX-XXXX`. Closes the offline brute-force path on the pairing handshake: a passive sniffer on the same LAN who captured the encrypted `PAIR_OFFER` could previously recover the long-term `sharedSecret` in roughly a day on a single GPU (PBKDF2-SHA1 100k iters × 10⁶ codes ≈ 10¹¹ ops). The new code length raises that work factor by ~10⁶× - centuries on equivalent hardware. Crockford's alphabet excludes I/L/O/U; user-typed `I`/`L` get folded to `1`, `O` to `0` so mis-typed codes still work.
- Added a fingerprint-comparison step to the pairing flow. After the key exchange completes, both devices compute `SHA256(sharedSecret)` and display the first 6 Crockford chars (formatted `XXX-XXX`). The user must confirm both screens show the same fingerprint before either device commits the pairing to encrypted storage. If a wrong code (or an active MITM injecting a different shared secret to each side) caused the two devices to derive different `sharedSecret` values, the fingerprints will differ and the user can cancel - no pairing state is ever written. This is the same TOFU-style verification PAKE protocols give for free; doing it explicitly here keeps the protocol simple while closing the active-MITM gap.
- PBKDF2 salt label bumped to `budgetark-pairing-v2`. A v1 (6-digit) `PAIR_OFFER` recorded earlier and replayed against a v2 device cannot pass HMAC validation - different derivation, different keys.
- All changes are pure JS. Pre-existing pairings are unaffected (only new pairings use the new code length and salt). `runtimeVersion` stays at `1.4.1` so this ships as an OTA update.

## v1.4.9 - Hardened Partner Sync (2026-05-02)

- Incoming sync diffs from a paired partner are now fully validated per-record before any storage write. `applyIncomingDiff` runs the same `is*Item` validators the JSON-import path uses - debts, payments, budget entries, savings goals, asset accounts, budget limits, debt milestone plan, payoff strategy, month keys. Any malformed or out-of-range record causes the whole diff to be rejected, so storage stays consistent.
- Closes a real attack path: a paired peer (compromised partner device, or an attacker who recovered the pairing secret) could previously deliver a `SyncDiff` whose records had any shape - `mergeById` only checked `id` and `updatedAt`. Crafted records could silently zero out balances, inject NaN/Infinity into UI math, or wipe collections by upserting blanked rows with `updatedAt = now`. Validation gate now blocks all of these before the merge step runs.
- Validators extracted to `src/utils/recordValidators.ts` so import and sync share one source of truth - fixing a validation gap on one side fixes both.

## v1.4.8 - Real Date Columns in Exports (2026-05-02)

- Excel exports now write date columns as native Excel date cells (`t:"d"` with `yyyy-mm-dd` format) instead of left-aligned text. Affects Budget Entries `Date`, Debts `GoalDate`/`CreatedAt`, Payments `Date`, Savings Goals `TargetDate`/`CreatedAt`, Asset Accounts `CreatedAt`. Users can now sort/filter/use date functions on these columns directly without a manual Text-to-Columns pass.
- SUMIFS month-bucket criteria on the Budget Entries sheet switched from text comparison (`">="&"YYYY-MM-01"`) to numeric date comparison (`">="&DATE(y,m,1)`) so the live per-month subtotals continue to work against the new date-typed cells.
- Synthetic Emergency Fund row's `CurrentAmount` is now clamped to zero. A net-negative tracked reserve (rare - only happens when correction entries exceed deposits) used to display a negative number that import-side validators would reject anyway. Cleaner display, no behavior change on round-trip.

## v1.4.7 - Spreadsheet Export Fixes (2026-05-02)

- Recurring entries linked to an asset account now preserve their `lastAppliedMonth` stamp across spreadsheet round-trips. Earlier, importing a spreadsheet stripped that field, so the app re-applied the monthly delta for every month between the entry's start date and today on the next Budget screen open - silently doubling (or worse) the tracked deposits in the linked AssetAccount. New `LastAppliedMonth` column on the Budget Entries sheet round-trips the value, validated as YYYY-MM on import.
- Per-month Income / Expense / Net subtotals on the Budget Entries sheet are now live `SUMIFS` formulas filtering by date range, not static cached numbers. Editing an Amount cell in the spreadsheet updates the month subtotal and the grand total in lockstep, so they can no longer disagree silently.
- Savings Goals total now excludes the synthetic Emergency Fund row when one is present. Earlier, `appendTotalRow` summed every row including the synthetic one, so the same user's TargetAmount/CurrentAmount totals shifted depending on whether they tracked their EF explicitly or implicitly. The total uses a `SUMIF` with a `<>__derived_emergency_fund__` criterion so the formula stays live but the synthetic row is skipped.

## v1.4.6 - Recurring Income on Every Month (2026-05-02)

- Spreadsheet exports now project recurring entries (paycheck, monthly bills, subscriptions) into every month from their start through the latest month in your data. Earlier, a recurring paycheck appeared only in its start month, so every later month's Income subtotal looked like $0 even though the app counted it correctly.
- Projected rows carry an internal sentinel ID (`__projected_recurring__:`) so re-importing the exported workbook still creates exactly one underlying entry per recurring item - no duplication on round-trip.

## v1.4.5 - Per-Month Budget Entries Export (2026-05-02)

- Excel and CSV exports now sort the Budget Entries sheet by date and insert an Income / Expense / Net subtotal block after each month - labeled with the YYYY-MM key in the Description column - so you can cross-check the app's per-screen monthly totals without filtering or pivoting yourself. The grand-total block stays at the bottom with live SUMIF formulas. Subtotal rows are import-safe and drop silently on re-import.

## v1.4.4 - Budget Entries Totals Breakdown (2026-05-02)

- Excel exports now end the Budget Entries sheet with three labeled Total rows - Income Total, Expense Total, and Net (Income - Expense) - so you can cross-check against the app's per-screen numbers without doing the gross math yourself. Earlier the Total row showed only a single Net figure, which made it hard to reconcile against the app's Total Expenses display.
- Each total uses a live SUMIF formula so Excel/Sheets recompute as you edit rows, with a cached numeric value alongside so CSV export still shows real numbers.

## v1.4.3 - Spreadsheet Export Polish (2026-05-02)

- Excel exports now include your Emergency Fund on the Savings Goals sheet even when you're tracking it implicitly through the Keel milestone and Savings/Retirement/Investing entries - earlier it only appeared if you'd created an explicit emergency fund goal. The synthetic row carries a sentinel ID so re-importing the same workbook does not materialize a duplicate persisted goal.
- Budget Entries sheet now shows a real net total (income minus expense) in the Total row's Amount cell, with a live SUMIF formula so Excel/Sheets recompute as you edit. Earlier the Total row was label-only because a plain sum would have mixed income and expense into a meaningless figure.

## v1.4.2 - Sync & UI Reliability Fixes (2026-05-02)

- Fixed paired-device sync so a freshly edited budget limit on one device no longer gets rolled back by stale data syncing in later from the other. Limits now resolve last-write-wins per category, matching how debts and payments already merge.
- Fixed the sync fallback path so retrying mid-discovery cleanly tears down the local listener instead of leaving an orphaned TCP server and Zeroconf advertisement running in the background.
- Fixed sync success messaging so the count includes asset account changes - earlier the success toast under-reported how much actually moved between devices.
- Fixed debt cards so the expanded card follows your payoff strategy - switching between Avalanche and Snowball now correctly opens the new priority debt and collapses the previous one.
- Fixed the OTA update prompt so it shows the message bundled with the fetched update rather than highlights from the version you're already running.
- Fixed manual OTA installs from **Profile → Updates** so the release notes prompt no longer reappears after the reload - matching the auto-install flow.

## v1.4.1 - Update Prompt Fix, Bridge Tab & Celebration (2026-04-30)

- Added **The Bridge**, a new default home tab centered in the navigation bar for net worth, account balances, and progress at a glance.
- Moved net worth history and the Accounts section out of Budget into The Bridge so the Budget screen stays focused on income, expenses, and monthly review.
- Fixed Budget spending chart colors so categories keep stable, distinct colors instead of starting to repeat after several slices.
- Fixed the OTA update prompt to show the correct incoming app version and matching release notes instead of falling back to the installed build version.
- Added a debt payoff celebration screen with confetti, payoff stats, and a quick shortcut to payment history when a balance reaches zero.
- Improved update metadata parsing so release notes resolve from update-specific version fields first.
- Added **Export Spreadsheet** and **Import Spreadsheet** in Profile → Data so you can move budget data to and from Google Sheets, Excel, or CSV files. CSV covers budget entries; Excel exports a full multi-sheet backup including debts, payments, savings goals, and asset accounts.
- Spreadsheet imports now also restore savings goals and asset accounts - the Excel format is a full round-trip backup.
- Added an in-app format reference for spreadsheet imports so you can see the required columns and allowed categories before importing.
- Backup export and import are now a complete round-trip - savings goals, asset accounts, milestone progress, payoff strategy, net worth history, and full per-month budget limit history are all preserved.
- **Reset All Data** now actually clears everything - asset accounts and milestone progress are no longer left behind.
- Fixed a quiet bug where lowering a tracked savings reserve created a correction entry that couldn't be re-imported from a backup. Backups now round-trip cleanly even after savings adjustments.
- Added subtle haptic feedback on key actions (recording payments, saving entries, completing imports/exports, payoff celebrations). Toggle in **Profile → Settings → Haptic Feedback** if you'd rather keep it silent.
- Updated build-time dependencies (postcss and uuid) to address two security advisories. Build tooling only - no in-app behavior changes.

## v1.4.0 - Net Worth History & Monthly Insights (2026-04-30)

- Added net worth history to the top of the Budget screen with current net worth, assets, debt, and 7D / 30D / All timeline views.
- Net worth now saves daily snapshots automatically so your history graph starts building from current balances and keeps updating over time.
- Added a Monthly Insight spotlight card on the Budget screen so the biggest spending trend shows before opening the full review.
- Added Category Spending Comparison in Monthly Review to compare this month's category spend against the trailing 3-month average.
- Fixed linked account balances so deleting or editing linked budget entries properly reverses and reapplies account contributions.
- Fixed debt payment handling so recorded payments no longer risk double-applying balance changes.

## v1.3.3 - Utilities Hub & Asset Tracking (2026-04-01)

### Utilities Tab
- Replaced the Investments tab with a new Utilities hub containing collapsible financial tools.
- **Compound Interest Calculator** - now includes S&P 500 return presets (Savings 2%, Bonds 4%, S&P 500 7%, Aggressive 10%), a "Why 7%?" educational card explaining inflation-adjusted returns, and a Rule of 72 insight showing how quickly your money doubles.
- **Loan/Mortgage Calculator** - enter loan amount, interest rate, and term to see monthly payments with a principal vs interest breakdown and visual ratio bar. Includes 15, 20, and 30-year term presets.
- **Emergency Fund Calculator** - automatically pulls your average monthly expenses from the last 6 months of budget data. Shows progress toward 3-month and 6-month savings targets with a monthly savings slider and time-to-reach estimates.

### Asset Account Tracking
- Added asset accounts on the Budget screen for tracking savings, 401k/retirement, HSA, investment, and other account balances.
- Asset accounts are persistent balances that don't count as monthly budget entries but are included in net worth calculations.
- Asset accounts sync between paired devices via the existing peer-to-peer sync system.
- Emergency fund savings goal now appears automatically in the Accounts section on the Budget screen.
- Savings, Retirement, and Investing budget entries can now be linked to a specific asset account - contributions are added to the account balance on save.
- Recurring budget entries linked to an account automatically contribute to that account's balance each month.

### Bug Fixes & Polish
- Fixed scroll freeze when opening the edit budget entry modal - form rendering is now deferred until the modal animation completes.
- Centered page titles and subtitles across all screens (Debt Tracker, Budget, Utilities, Profile).
- Updated onboarding to reflect the new Utilities tab.

### Security & Reliability
- Added 5-second timeout protection on all storage operations to prevent app freezes from degraded flash storage or backed-up I/O queues.
- Hardened OTA update version guard - updates with missing version metadata are now blocked (fail-closed) to prevent downgrade attacks. Fresh installs without version metadata are still allowed.
- Importing a backup older than 30 days now shows a staleness warning so you know the data may be outdated. The import still proceeds - the warning is informational only.
- Added explicit bounds checks on all financial calculation inputs (balance capped at $1B, rate at 200%, payments at $1M, years at 100) to prevent Infinity/NaN from cascading into the UI.

## v1.2.2 - Bug Fixes & Ark Build Expansion (2026-03-31)

### Bug Fixes
- Fixed Keel savings not reflecting in the Budget screen total savings display.
- Fixed Build Your Ark plan requiring a long-press to open - now opens on a single tap.
- Fixed savings log only allowing additions - you can now set an exact savings amount or adjust down with -$50 / -$100 quick buttons.

### Ark Build Expansion
- Expanded Build Your Ark from 5 steps to 7, following a complete financial milestone journey:
  1. **Keel** - Save $1,000 for a starter emergency fund.
  2. **Hull** - Pay off all debt except the house using the debt snowball.
  3. **Deck** - Save 3 to 6 months of living expenses for a fully funded emergency fund.
  4. **Supplies** - Invest 15% of household income for retirement.
  5. **Gather Animals** - Save for your children's college education.
  6. **Moorings** - Pay off your home early.
  7. **Sail** - Build wealth and give.
- Moved payoff strategy comparison (Avalanche vs Snowball) into the Hull milestone step so planning and progress live in one place.
- Existing milestone progress is automatically preserved when upgrading - new steps are added without losing any data.
- Added monthly budget summary graph showing income vs expenses across recent months.
- Emergency fund balance now reflects consistently across Budget and Debt Tracker tabs.

## v1.2.1 - Bug Fixes & Polish (2026-03-28)

- Fixed edit budget modal scroll freeze after selecting a category pill.
- Fixed extra bottom padding in edit budget modal on devices without a navigation bar.
- Debt cards now collapse by default - only the priority payoff debt is expanded based on your chosen strategy.
- Income entries moved inline into the summary card for a cleaner budget layout.
- Spending section redesigned - donut chart and category rows in one card, tap any row to expand entries.
- Profile screen reorganized - Send Feedback at top, Data/Settings/About sections consolidated.
- Restored missing Auto Updates toggle in Profile settings.

## v1.2.0 - Minimalist UI Redesign (2026-03-28)

- Redesigned Debt Tracker - owner summary row now doubles as a filter (tap to filter and see amounts), milestone bar absorbs strategy label and Deck/Supplies chips into one row, and the progress ring opens payment history on tap.
- Redesigned Budget - donut chart and category list merged into one unified section with color-coded rows. Long-press any category to set a spending limit. Split Food action moved to a compact link in the section header instead of a full-width button.
- Redesigned Profile - grouped Theme, Currency, and Privacy Mode into a single Appearance card. Compressed Partner Sync from five rows to three (partner info, sync now, unpair). Consolidated Updates, Release Notes, Feedback, and Reset into an About card. Removed standalone How-To Docs, Feedback, Privacy, and What's New sections.
- Added floating action buttons (FAB) on Debt Tracker and Budget screens for quick access to adding entries, replacing the inline header buttons.
- OTA update prompt now shows the app version and what's new from the release notes instead of raw update metadata (ID, runtime version).
- Removed the standalone How-To Docs modal - help guidance will be added inline to Export, Import, and Sync flows in a future update.

## v1.1.0 - Partner Sync & Feedback (2026-03-23)

- Added peer-to-peer sync for couples - share budgets, debts, and savings goals directly between phones over WiFi with no server or account required.
- One-time device pairing with a 6-digit code and PBKDF2 key exchange. All sync traffic is AES-256 encrypted with HMAC integrity verification.
- Sync Now button for on-demand data exchange - both devices see the same debts, payments, budget entries, savings goals, and milestone progress.
- Optional auto-sync when both phones are on your home WiFi network. Set your home network once and syncing happens automatically in the foreground.
- Added in-app feedback - report bugs or suggest features directly from Profile. Your message is sent via your email app with device info auto-attached.
- Added a link to GitHub Issues for public bug tracking and feature requests.
- Added updatedAt timestamps to all record types for accurate conflict resolution using last-write-wins per record.
- Existing data is automatically migrated to include timestamps on first launch - no action needed.
- Squashed some bugs and improved overall stability.

## v1.0.6 - Security & Encryption (2026-03-12)

- Added AES-256 encryption for all on-device data with HMAC-SHA256 integrity verification - your financial data is now encrypted at rest.
- Encryption keys are stored in the platform secure vault (iOS Keychain / Android Keystore) and cleared from memory when the app is backgrounded.
- Existing data from previous versions is automatically migrated to the encrypted format on first launch - no action needed.
- Added privacy mode toggle in Profile settings to mask sensitive balances on screen.
- Added version guard to prevent downgrade attacks via OTA updates.
- Upgraded to cryptographically strong UUID generation for all identifiers.
- Improved data import validation with stricter schema checks and encrypted storage support.

## v1.0.5 - Build Your Ark Planning Hub (2026-03-10)

- Added Build Your Ark, a unified planning hub that combines Hull (payoff), Deck (emergency coverage), and Supplies (savings goals) in one modal.
- Added side-by-side Avalanche vs Snowball what-if comparisons with extra-payment scenarios, payoff speed, total-interest impact, and strategy recommendations.
- Payoff strategy preference now persists across app restarts instead of resetting to Custom each launch.
- Added savings goals with on-device persistence, quick contribution chips, progress bars, and inline create/delete management.
- Added Deck tracking (formerly runway) with monthly essentials input, coverage status (Deck at risk -> Storm-ready deck), and progress guidance.
- Added Ark phase progress framing (Keel, Hull, Deck, Supplies, Sail) to tie payoff, safety cushion, and goals into one guided journey.
- Added compact Debt Tracker summary chips for Deck and active Supplies goal to keep key planning context visible without screen clutter.
- Improved Debt Milestones readability with a full-screen modal, larger typography, and safe-area-aware spacing on Android and iOS.
- Added recurring budget entries so fixed monthly items can automatically appear in future months while one-off imports remain month-specific.
- Improved theme contrast across dark themes and The Ark, including milestone action buttons and theme selector card readability.

## v1.0.4 - Debt Milestones and UX Polish (2026-03-09)

- Added a new Debt Milestones planner with progress tracking, current-step focus, and completion management.
- Added editable milestone targets with quick adjust chips (+100, +250, +500, -100).
- Completed milestones now collapse into concise cards with congratulatory messages; future steps are collapsed by default and expandable on tap.
- Improved debt and budget modal button visibility on Android devices with bottom navigation bars to avoid keyboard overlap.
- Updated budget category options by adding Fitness and removing Food from add/edit selection bubbles.
- Improved theme selector readability by forcing black theme-name text in onboarding and profile theme pickers.

## v1.0.3 - Shared Debt Planning and Budget Workflow Upgrades (2026-03-08)

- Added debt ownership tracking (Mine, Partner, Joint) with filters and balance summaries for couples.
- Added explicit debt types (Credit/Personal vs Car/House) for Snowball ordering, plus bulk classification tools and review badges for inferred types.
- Added month/year pickers to debt and budget add/edit flows to replace manual date typing.
- Expanded budget categories with Grocery, Restaurant, Tech, Giving, Retirement, and Investing.
- Added a one-time Food split helper to migrate older Food entries into Grocery or Restaurant.

## v1.0.2 - Payment History & Localization (2026-03-07)

- Added Payment History view accessible from the Debt Tracker summary card, showing all recorded payments grouped by month with totals.
- Added "The Ark" theme - a warm cream and brown parchment-inspired color scheme.
- Added multiple currency and locale presets in Settings (USD, EUR, GBP, CAD, JPY).
- Applied locale-aware money formatting across Debt, Budget, Investment, and Payment History screens.
- Persisted currency preference in user profile and included it in data export/import backups.

## v1.0.1 - Debt Payoff Tools (2026-02-20)

- Added debt editing directly from each debt card.
- Added payoff strategies with Avalanche and Snowball prioritization modes.
- Added optional payoff goal dates with required monthly payment guidance.

## v1.0.0 - Initial Release (2026-02-10)

- Launched debt tracking with progress insights.
- Launched budget management with category views.
- Launched investment projections and theme selection.

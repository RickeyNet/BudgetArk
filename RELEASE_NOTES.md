# BudgetArk Release Notes

## v1.4.13 - Density Everywhere, Guided Walkthrough + Car/House Split (2026-05-03)

- Layout Density now applies app-wide. `DebtTrackerScreen`, `BudgetScreen`, `UtilitiesScreen`, `BridgeScreen`, `ProfileScreen`, and `OnboardingScreen` all consume `useDensity()` tokens through their `makeStyles(colors, tokens)` factories with a `scale(n)` helper for font sizes. Switching presets in Profile → Appearance now resizes card padding, border radius, inter-card spacing, and font sizes everywhere instead of only Bridge.
- `ProfileScreen.tsx` had a module-level `StyleSheet.create` — lifted into a `makeStyles(tokens)` factory and consumed via `useMemo`. Settings rows and grouped-card rows now also pick up `tokens.rowHeight` as a `minHeight`, so Compact tightens row height and Spacious enlarges the touch targets.
- `NetWorthHistoryCard.tsx` (rendered inside Bridge) was the last module-level offender — now also a factory consuming `useDensity()` directly. Card padding, border radius, font sizes, and meta-row spacing reflect the preset.
- Comfortable preset still matches the previous default visuals exactly, so users who don't change the setting won't notice anything different after upgrading.
- New first-launch spotlight walkthrough. The first time the user lands on each of the 5 tabs, a guided tour highlights specific UI elements — for example, on Debts the tour spotlights the summary card, then the + button, then the milestones row — with a tooltip card explaining each one and a step counter (1 of 3, 2 of 3...). Spotlight is implemented as four absolutely-positioned dim strips around a measured anchor rect plus an accent-colored highlight ring; tooltip placement (above vs below the anchor) is chosen automatically based on which side has more screen space. Skip-all bails out of the entire tour from any step. State persists to encrypted storage under `@budgetark_coachmarks` (`COACHMARK_VERSION = 2`) so every tab is shown at most once until the user explicitly replays.
- Built from a small set of new modules — `CoachmarkAnchorContext` (View ref registry with `measureInWindow`-based async measure), `Spotlight.tsx` (modal overlay), `useTabCoachmark.tsx` (step machine driving the sequence per tab), `coachmarkContent.ts` (per-tab step list). Each tab attaches anchors to its key elements via `<View ref={useCoachmarkAnchor("debts-summary-card")} collapsable={false}>` etc. Falls back to a centered card when an anchor isn't measurable (e.g. user scrolled it off screen).
- New "Help" section in Profile with a "How to use BudgetArk" per-tab reference modal listing all steps in each tab's tour, and a "Replay walkthrough" button that resets the seen-tabs state so the tour can be replayed at any time.
- `DebtClass` split from `"personal_credit" | "car_house"` into `"personal_credit" | "car" | "house"`. Add Debt modal exposes the new options; existing debts migrate automatically the next time storage is read — `car_house` rows are split by name keywords (`mortgage` / `house` / `home loan` / `home` → `"house"`, otherwise → `"car"`) via a `splitLegacyCarHouse` helper in `debtStorage.ts` and the same logic in `spreadsheetImport.ts`. Spreadsheet schema accepts both the new values and the legacy `car_house` token for backward compatibility.
- Debt list sort is now tier-based: credit/personal first, then car, then house. The `getDebtTier(debt, promoteSecured)` helper in `DebtTrackerScreen.tsx` returns 0/1/2 based on debt class and a promotion gate. The gate (`promoteSecured = hullCompleted && allCreditCleared`) opens only when (a) the Hull milestone is marked complete and (b) every `personal_credit` debt has a zero balance — both conditions are required so the mortgage can't bury an unpaid credit card just because someone navigated to a later milestone. When the gate is open, car promotes to tier 0 and house to tier 1, with credit dropped to tier 2. Within each tier the chosen strategy still applies (avalanche by APR, snowball by balance, custom by creation order).
- Hull milestone (Build Your Ark "Clear Non-Mortgage Debt") now correctly counts car loans as non-mortgage — `nonMortgageDebts` filter changed from `debtClass === "personal_credit"` to `debtClass !== "house"`. Moorings milestone progress is now keyed only on `house` debts (was both car and house lumped together as "secured"). Snowball priority in `calculations.ts` updated to a 3-tier ordering (credit 0, car 1, house 2).
- All changes are pure JS — no new native modules. `runtimeVersion` stays at `1.4.1`, so this ships as an OTA update reachable by all existing devices.

## v1.4.12 - Layout Density Selector (2026-05-02)

- New Layout Density picker in Profile → Appearance with three presets: Compact, Comfortable (default), Spacious. Plumbing mirrors the existing theme system — `DensityProvider` wraps the app, `useDensity()` returns a `tokens` object with `pad`, `padSm`, `padLg`, `gap`, `gapSm`, `gapLg`, `radius`, `radiusSm`, `fontScale`, and `rowHeight`. Persists to encrypted storage under `@budgetark_density_id`.
- Migration is incremental. Bridge is the first screen wired up — its `makeStyles` factory now accepts `tokens` and references them for the overview / accounts card padding, border radius, inter-card spacing, modal sizing, and a `scale(n)` helper applied to font sizes. Other screens still use hardcoded values and render at the Comfortable default until they migrate.
- Comfortable preset deliberately matches the existing default visuals (`pad: 16`, `gap: 16`, `radius: 16`) so users who don't change the setting see no shift after upgrading. Compact pulls those down to 12/10/12 with a 0.92× font scale; Spacious pushes them up to 20/22/18 with a 1.08× font scale.
- The orphan `src/screens/InvestmentScreen.tsx` file was deleted. It was never reached by navigation — the actual investment calculator lives inside `UtilitiesScreen.tsx`. Stale references in the two setup-guide markdown file-trees were cleaned up at the same time.
- All changes are pure JS. `runtimeVersion` stays at `1.4.1`, so this ships as an OTA update.

## v1.4.11 - Backup Reminder After Upgrades (2026-05-02)

- New banner at the top of the Profile screen prompts the user to take a fresh backup whenever the app version has changed since their last successful export. Stamps `lastBackupVersion` + `lastBackupAt` on every successful export (JSON via `exportAllData`, spreadsheet via `exportSpreadsheet`) and surfaces the banner via `shouldShowBackupReminder(state, CURRENT_APP_VERSION)`. Tap **Back up now** opens the existing encrypted-JSON export flow; tap **Dismiss** stamps `dismissedVersion` so the banner stays hidden until the next version bump.
- Closes the practical concern that an old backup might no longer round-trip cleanly after a schema change. Even when nothing in the import format has actually broken, a user who hasn't backed up since several versions ago is one device-loss away from losing all their data — the reminder makes "take a fresh backup after every app update" the default habit.
- Banner also shows on first run for users who have never exported, with copy that frames it as "no recovery point yet" rather than "you upgraded".
- Storage shape (`@budgetark_backup_reminder` in encrypted storage): `{ lastBackupVersion, lastBackupAt, dismissedVersion }`. All optional; missing fields treated as no-state. Recording a new backup clears `dismissedVersion` so the next upgrade will re-show the banner regardless of past dismissals.

## v1.4.10 - Stronger Pairing (2026-05-02)

- Pairing code bumped from 6 numeric digits (~20 bits, ~10⁶ codes) to 8 Crockford base32 characters (~40 bits, ~10¹² codes), formatted `XXXX-XXXX`. Closes the offline brute-force path on the pairing handshake: a passive sniffer on the same LAN who captured the encrypted `PAIR_OFFER` could previously recover the long-term `sharedSecret` in roughly a day on a single GPU (PBKDF2-SHA1 100k iters × 10⁶ codes ≈ 10¹¹ ops). The new code length raises that work factor by ~10⁶× — centuries on equivalent hardware. Crockford's alphabet excludes I/L/O/U; user-typed `I`/`L` get folded to `1`, `O` to `0` so mis-typed codes still work.
- Added a fingerprint-comparison step to the pairing flow. After the key exchange completes, both devices compute `SHA256(sharedSecret)` and display the first 6 Crockford chars (formatted `XXX-XXX`). The user must confirm both screens show the same fingerprint before either device commits the pairing to encrypted storage. If a wrong code (or an active MITM injecting a different shared secret to each side) caused the two devices to derive different `sharedSecret` values, the fingerprints will differ and the user can cancel — no pairing state is ever written. This is the same TOFU-style verification PAKE protocols give for free; doing it explicitly here keeps the protocol simple while closing the active-MITM gap.
- PBKDF2 salt label bumped to `budgetark-pairing-v2`. A v1 (6-digit) `PAIR_OFFER` recorded earlier and replayed against a v2 device cannot pass HMAC validation — different derivation, different keys.
- All changes are pure JS. Pre-existing pairings are unaffected (only new pairings use the new code length and salt). `runtimeVersion` stays at `1.4.1` so this ships as an OTA update.

## v1.4.9 - Hardened Partner Sync (2026-05-02)

- Incoming sync diffs from a paired partner are now fully validated per-record before any storage write. `applyIncomingDiff` runs the same `is*Item` validators the JSON-import path uses — debts, payments, budget entries, savings goals, asset accounts, budget limits, debt milestone plan, payoff strategy, month keys. Any malformed or out-of-range record causes the whole diff to be rejected, so storage stays consistent.
- Closes a real attack path: a paired peer (compromised partner device, or an attacker who recovered the pairing secret) could previously deliver a `SyncDiff` whose records had any shape — `mergeById` only checked `id` and `updatedAt`. Crafted records could silently zero out balances, inject NaN/Infinity into UI math, or wipe collections by upserting blanked rows with `updatedAt = now`. Validation gate now blocks all of these before the merge step runs.
- Validators extracted to `src/utils/recordValidators.ts` so import and sync share one source of truth — fixing a validation gap on one side fixes both.

## v1.4.8 - Real Date Columns in Exports (2026-05-02)

- Excel exports now write date columns as native Excel date cells (`t:"d"` with `yyyy-mm-dd` format) instead of left-aligned text. Affects Budget Entries `Date`, Debts `GoalDate`/`CreatedAt`, Payments `Date`, Savings Goals `TargetDate`/`CreatedAt`, Asset Accounts `CreatedAt`. Users can now sort/filter/use date functions on these columns directly without a manual Text-to-Columns pass.
- SUMIFS month-bucket criteria on the Budget Entries sheet switched from text comparison (`">="&"YYYY-MM-01"`) to numeric date comparison (`">="&DATE(y,m,1)`) so the live per-month subtotals continue to work against the new date-typed cells.
- Synthetic Emergency Fund row's `CurrentAmount` is now clamped to zero. A net-negative tracked reserve (rare — only happens when correction entries exceed deposits) used to display a negative number that import-side validators would reject anyway. Cleaner display, no behavior change on round-trip.

## v1.4.7 - Spreadsheet Export Fixes (2026-05-02)

- Recurring entries linked to an asset account now preserve their `lastAppliedMonth` stamp across spreadsheet round-trips. Earlier, importing a spreadsheet stripped that field, so the app re-applied the monthly delta for every month between the entry's start date and today on the next Budget screen open — silently doubling (or worse) the tracked deposits in the linked AssetAccount. New `LastAppliedMonth` column on the Budget Entries sheet round-trips the value, validated as YYYY-MM on import.
- Per-month Income / Expense / Net subtotals on the Budget Entries sheet are now live `SUMIFS` formulas filtering by date range, not static cached numbers. Editing an Amount cell in the spreadsheet updates the month subtotal and the grand total in lockstep, so they can no longer disagree silently.
- Savings Goals total now excludes the synthetic Emergency Fund row when one is present. Earlier, `appendTotalRow` summed every row including the synthetic one, so the same user's TargetAmount/CurrentAmount totals shifted depending on whether they tracked their EF explicitly or implicitly. The total uses a `SUMIF` with a `<>__derived_emergency_fund__` criterion so the formula stays live but the synthetic row is skipped.

## v1.4.6 - Recurring Income on Every Month (2026-05-02)

- Spreadsheet exports now project recurring entries (paycheck, monthly bills, subscriptions) into every month from their start through the latest month in your data. Earlier, a recurring paycheck appeared only in its start month, so every later month's Income subtotal looked like $0 even though the app counted it correctly.
- Projected rows carry an internal sentinel ID (`__projected_recurring__:`) so re-importing the exported workbook still creates exactly one underlying entry per recurring item — no duplication on round-trip.

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

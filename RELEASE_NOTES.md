# BudgetArk Release Notes

## v1.4.15 - Stability + Math Fixes (2026-05-03)

Round of audit-driven fixes against a static-review pass over the codebase. All P0 items from `Potentialbugs.md` round 2 plus the P1 items that were single-file changes; architectural fixes (delete tombstones, multiSet for compound writes) stay deferred. Pure JS — runtimeVersion stays at `1.4.14`, ships as OTA against the v1.4.14 native binary already in TestFlight / Play.

- BudgetScreen now reads recorded debt payments. Previously the screen only knew about the synthetic minimum-payment forecast (derived from `activeDebts.minPayment`), and that forecast was hard-suppressed (`return 0`) for any month that wasn't current or next — so past months always showed `$0` for the "Debt Payments" category even when the user had recorded real payments on the Debt Tracker. Now `BudgetScreen` loads `getPayments()` alongside its other data, computes `recordedDebtPaymentsForMonth` by filtering on `selectedMonthKey`, and surfaces both the total and per-payment drilldown rows. The synthetic forecast (`automaticDebtMonthlyCost`) now only fires for the next-month view — past and current months show actuals only, no double-counting between forecast and recorded data. Drilldown rows for past/current pull from the Payment collection (with debt name + actual amount + actual date); for next-month forecast they fall back to the per-debt min-payment synthetic rows. The "Includes $X auto debt minimums" hint stays but now only renders on next-month view, since past/current months don't need a forecast caveat.
- Build-Your-Ark savings reserve narrowed to the `Savings` category only. The keel/supplies milestone progress, runway-months calc, and the synthetic `__keel_ef__` SavingsGoal Bridge constructs when no explicit EF goal exists used to sum `Savings` + `Retirement` + `Investing` entries. That conflated long-term retirement money with the user's liquid emergency fund. `Retirement` and `Investing` already feed the gather_animals milestone via `retirementInvestingMonthly`, so narrowing keeps the milestones semantically distinct: liquid EF on keel/supplies, retirement-rate on gather_animals. Applied identically across `DebtTrackerScreen.tsx`, `BridgeScreen.tsx`, `BudgetScreen.tsx`, and `spreadsheetExport.ts` so all four `savingsReserve` derivations stay consistent.
- Net Worth math (`src/utils/netWorth.ts`): `entrySavings` filter broadened from `"Savings"` only to all three reserve categories (`Savings`, `Retirement`, `Investing`). Net Worth represents *all* assets the user has, including long-term ones — so Retirement and Investing still count here, just not toward the EF. Previously a user with $10k logged in Retirement saw Bridge report a different Net Worth than Build-Your-Ark for identical data. Also excluded entries carrying a `linkedAccountId` from `entrySavings` — those contributions already credited an asset account via `applyMissedRecurringLinkedAccountContributions` / the Budget add/edit handlers, so counting them again was double-counting against the asset balance below.
- Per-key write serialization in `encryptedStorage.ts`: `setItem`, `removeItem`, and `multiRemove` now route through a per-key Promise chain. Two concurrent writes to the same storage key (e.g. `recordPayment` mutating debts while `applyIncomingDiff` also writes debts on a sync) used to race because each ran `getX → mutate → saveX` on its own snapshot, and the second writer would silently overwrite the first writer's record. The chain ensures the second write reads-after-the-first-writes-back at the storage layer, closing the silent-clobber window. The map only tracks the latest tail per key and self-cleans when the tail settles.
- Recurring auto-apply double-credit: `BridgeScreen` and `BudgetScreen` both ran `saveBudgetEntries` and `saveAssetAccounts` in `Promise.all` after computing missed-contribution deltas. If the asset write committed first, another tab focusing in that window could read `(newBalance, oldLastAppliedMonth)` and re-apply the same contribution, silently inflating the asset balance. Both screens now sequence: entries (the marker) save first, then assets — so any reader between the two saves sees a `lastApplied` that gates further apply attempts.
- Spreadsheet round-trip preserves timestamps: `BUDGET_ENTRY_COLUMNS` now includes `CreatedAt` and `UpdatedAt`. Importer prefers stored timestamps over import-time `now`, falling back to `createdAt` then `now` when missing. Without this, exporting xlsx and re-importing the same file made every entry "freshly edited" on the partner's next sync, overwriting their data via LWW. Schema doc (`docs/SPREADSHEET_SCHEMA.md`) updated with the three new optional columns (`LastAppliedMonth`, `CreatedAt`, `UpdatedAt`).
- Hull simulator divergence: `SmartPlanModal.tsx` and `PayoffPlannerModal.tsx` were filtering `balance > 0` only (mortgage included) while `DebtTrackerScreen` filtered `debtClass !== "house"`. Same data, simulator numbers 10–30× larger on the modal side once a mortgage existed. Both files were orphans (zero imports across the repo, presumably superseded during v1.0.5 development) — deleted, same treatment `InvestmentScreen.tsx` got in v1.4.12.
- `decryptV2` (`src/storage/encryptedStorage.ts`) no longer collapses an empty plaintext into a tampering throw. The `return plaintext || null` line treated an empty string as a `DecryptionError`, which `getOrCreateUser` and other callers don't catch. HMAC has already validated the bytes by the time we hit the toString call, so empty is legitimate; trust it.
- iOS modal-stacking fixed in two `DebtTrackerScreen` paths: `onViewHistory` now waits 250 ms between dismissing the celebration and presenting history, and `handleSaveEdit` defers the celebration Modal by 250 ms when an edit pays off a debt so the edit Modal's close animation finishes first. Same dismiss-then-present-in-one-frame pitfall the coachmark Modal hit earlier — RN can't reliably stack two Modal state changes in a single render.
- Async-loader cancellation flags added in `BudgetScreen`, `BridgeScreen`, `DebtTrackerScreen`, `UtilitiesScreen`, and `PaymentHistoryModal`. Standard pattern: `let cancelled = false`, gate every `setX` after an await, return cleanup that flips the flag. Tap the BudgetScreen month switcher fast and you no longer see a slower load resolve last and overwrite the newer one's data.
- `ProfileScreen` mount-effect cleanup now calls `stopMonitoring()` when the load actually started auto-sync monitoring, so unmounting the Profile screen (Reset All Data flow, navigation reset, etc.) doesn't leak the NetInfo subscription firing `setLastSyncTime` against a torn-down component.
- `simulatePayoffPlan` (`src/utils/calculations.ts`) returns `monthsToPayoff: Infinity` (instead of the misleading early-exit month count) when `isPayoffPossible` is false. `formatPayoffMonths` already handles non-finite as "Not solvable", so the UI now correctly shows that label instead of "1 mo" for a debt where the minimum can't cover monthly interest.

Tracked but deferred to a future commit (see `Potentialbugs.md`):

- Delete tombstones for cross-device sync (`mergeById` can't currently represent deletions — needs schema change).
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

- Replay walkthrough now chains all five tabs into a single continuous tour. Earlier the Replay button cleared `seenTabs` and fired the spotlight on the currently-focused tab only — the user got Profile's two-step tour and nothing else, because there was no mechanism to navigate between tabs. Added a `guidedQueue` ref to `CoachmarksProvider` plus `startGuidedTour(queue)` / `advanceGuidedTour()` helpers; Profile's two Replay buttons now call `startGuidedTour(["DebtTracker", "Budget", "Bridge", "Utilities"])` after `replayCoachmarks()`. After the last step's "Got it" on each tab, `useTabCoachmark` pops the queue head and `navigation.navigate()`s there (220 ms after the spotlight Modal close so dismissal and tab change don't fight). `skipAll` and `replay` both clear the queue so abandoned tours don't strand stale state.
- Replay flow no longer stacks two Modals. Profile's "Replay walkthrough" and the How-To "Replay tour" buttons used to call `replayCoachmarks()` followed immediately by `setInfoModal(...)`. With `seenTabs` cleared, every mounted tab's `useTabCoachmark` re-fired its tour-start effect in the same render cycle that opened the info-confirmation Modal — RN can't reliably present two Modals at once, so one was queued or visually layered behind the other (visible in user-supplied screenshot: "Walkthrough reset" dialog and the spotlight tooltip rendering on top of each other). Drop the info modal on the settings-row Replay (the spotlight is its own confirmation); on the How-To "Replay tour" button, dismiss the How-To Modal first and defer `replayCoachmarks()` by 350 ms so the close animation finishes before the spotlight presents.
- `useTabCoachmark` now gates the spotlight on `useIsFocused`. With React Navigation's lazy-mount tabs, every visited tab stays mounted; when `seenTabs` reset, all five tabs' hooks fired `setActive(true)` simultaneously and tried to present their `<Spotlight>` Modal — only the focused tab's content was correct, the rest leaked from hidden tabs. Single `useEffect` now fires only when `isFocused === true`; a second effect closes the Modal on blur so the spotlight cleanly hands off to the next focused tab. Old `useFocusEffect` + standalone re-trigger pattern removed.
- Spotlight overlay now scrolls the parent `FlatList` / `ScrollView` to bring the anchor into view before measuring. New `useCoachmarkAnchor(id, { scrollRef })` option threads a screen's main scroll ref into its anchors; on `measure(id)`, the context calls `findNodeHandle` on the scroll node, runs `measureLayout` to compute the anchor's content-relative `y`, fires `scrollToOffset` (FlatList) or `scrollTo` (ScrollView), waits 320 ms for the animation to settle, then `measureInWindow` for the final rect. Bridge / Budget / Debt / Utilities / Profile screens were updated to pass `{ scrollRef }` for in-list anchors (FABs intentionally skip — they're absolute-positioned and always visible). Closes the visible bug where the Bridge "Track asset accounts" step highlighted a partially-clipped card at the bottom of the screen with the tooltip stranded mid-screen above it.
- Spotlight clears `rect` at the top of its measure effect so the previous step's highlight ring doesn't linger over the new step's text while the scroll/measure pipeline (~80 ms timer + 320 ms scroll wait + measure) is in flight.
- Bridge tour content rewritten so each step's title matches what's actually highlighted. Earlier, step 1's "Total assets minus debt" copy was anchored to `bridge-overview-card` (the small Tracked Accounts / Emergency Fund row) while the big Net Worth number lives in `bridge-history-card` above it — the user saw a ring around the wrong element. New ordering matches visual top-to-bottom: history card ("Your Net Worth", which holds the big number AND the chart) → overview card ("Tracked balances at a glance") → accounts card ("Manage your accounts").
- Empty-state behavior unchanged but worth noting: when `measureInWindow` returns null (zero-size or unmeasurable anchor) the Spotlight already falls back to a centered tooltip card with full-screen dim, so a user with no entries still sees the title and body — just no highlight ring.
- All changes pure JS. `runtimeVersion` stays at `1.4.1`, ships as OTA.

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

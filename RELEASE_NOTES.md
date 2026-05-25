# BudgetArk Release Notes

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
- **Theme + Density flash**: both providers track a `ready: boolean` and render `null` until storage resolves. Adds ~10–30 ms blank screen on cold start but eliminates the flash of `DEFAULT_THEME_ID` / `DEFAULT_DENSITY_ID` for users with non-default presets.
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

- Theme/Density null-render flicker (~10–30 ms blank frame) - already gated on a `ready` boolean above; collapsing the blank frame to zero would need a splash background or a coordinated `ready` gate at the App level.
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
- Hull simulator divergence: `SmartPlanModal.tsx` and `PayoffPlannerModal.tsx` were filtering `balance > 0` only (mortgage included) while `DebtTrackerScreen` filtered `debtClass !== "house"`. Same data, simulator numbers 10–30× larger on the modal side once a mortgage existed. Both files were orphans (zero imports across the repo, presumably superseded during v1.0.5 development) - deleted, same treatment `InvestmentScreen.tsx` got in v1.4.12.
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

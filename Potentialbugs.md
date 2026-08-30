# Potential Bugs

Sorted by **priority / user impact**: crash or data-loss risk first, then data-integrity issues, then sync correctness, then UX consistency.

Static review only. No automated build/test run was performed in this environment.

## P0 - Critical: data loss / serious integrity risk

- [x] **Debt payment may apply twice or race incorrectly**
  - **Priority:** P0
  - **Files:** `src/screens/DebtTrackerScreen.tsx`, `src/storage/debtStorage.ts`
  - **What:** `handlePayment()` decrements debt balance in local state and saves debts, then calls `recordPayment()`, which also loads debts and decrements the balance again.
  - **Why this is a bug:** Two separate write paths mutate the same balance for one payment. Because the first `saveDebts(updated)` is not awaited, the second path can read stale or already-updated data.
  - **Impact:** Debt balance may drop twice, or UI and persisted storage may disagree after refocus/restart.
  - **Suggested manual repro:** Make one payment, leave the screen, reopen, and compare expected balance vs saved balance.

- [x] **Reset All Data does not actually clear all finance data**
  - **Priority:** P0
  - **Files:** `src/storage/debtStorage.ts`, `src/storage/assetAccountStorage.ts`, `src/storage/debtMilestoneStorage.ts`, `src/screens/ProfileScreen.tsx`
  - **What:** `clearAllData()` removes debts, payments, budget entries, limits, payoff strategy, and savings goals, but does not remove asset accounts or debt milestone data.
  - **Why this is a bug:** Reset flow promises full reset, but important persisted finance state survives.
  - **Impact:** Old account balances or milestone progress can still appear after reset.

- [x] **Export/import is not a full round-trip backup of current app data**
  - **Priority:** P0
  - **Files:** `src/utils/exportData.ts`, `src/utils/importData.ts`
  - **What:** Export/import covers debts, payments, budget entries, current budget limits, and user, but omits savings goals, asset accounts, debt milestone plan, payoff strategy, pairing state, and other newer app data.
  - **Why this is a bug:** Users can reasonably expect export/import to preserve full app state.
  - **Impact:** Device migration or restore can silently lose data.

- [x] **App can generate negative budget entries that its own import validator rejects**
  - **Priority:** P0
  - **Files:** `src/screens/DebtTrackerScreen.tsx`, `src/utils/importData.ts`
  - **What:** `handleSetSavingsReserve()` can create a `BudgetEntry` with negative `amount` when user lowers tracked savings. Import validator rejects budget entries with amount less than `0.01`.
  - **Why this is a bug:** App-generated data can become non-importable.
  - **Impact:** Exported backups can fail to import later.

## P1 - High: important accounting / history correctness bugs

- [x] **Deleting linked budget entry does not reverse linked account contribution**
  - **Priority:** P1
  - **Files:** `src/screens/BudgetScreen.tsx`
  - **What:** Add flow credits linked accounts. Edit flow reconciles linked-account delta. Delete flow removes entry but does not reverse linked account balance.
  - **Why this is a bug:** Accounting logic is incomplete across CRUD paths.
  - **Impact:** Asset account balances and net worth can drift upward over time.

- [x] **Budget limit history is not preserved by export/import**
  - **Priority:** P1
  - **Files:** `src/utils/exportData.ts`, `src/utils/importData.ts`, `src/storage/budgetStorage.ts`
  - **What:** Export uses `getCategoryBudgetLimits()` for one month only. Import writes incoming limits into the current month key.
  - **Why this is a bug:** Historical month-specific limit data is lost or remapped to the wrong month.
  - **Impact:** Monthly review and budget history can become inaccurate after restore.
  - **Example:** January limits exported and imported in April become April limits.

## P2 - Medium: sync correctness / state consistency

- [x] **Budget limit sync can overwrite newer local data with stale remote data**
  - **Priority:** P2
  - **Files:** `src/sync/diffEngine.ts`, `src/types/index.ts`
  - **What:** Budget limits sync has no timestamp/conflict metadata. Incoming limits overwrite by category/month without `updatedAt` comparison.
  - **Why this is a bug:** Older data from one device can win if it syncs later.
  - **Impact:** Paired devices can unexpectedly roll back budget limit values.

- [x] **Sync fallback path may leave orphaned server/discovery running**
  - **Priority:** P2
  - **Files:** `src/sync/syncOrchestrator.ts`, `src/sync/transportService.ts`
  - **What:** `syncNow()` starts server sync, then may switch to client sync if partner is discovered. Background server promise is abandoned without explicit cancellation.
  - **Why this is a bug:** TCP server and Zeroconf publish may linger.
  - **Impact:** Resource leak, stale advertising, possible interference with future sync attempts.

- [x] **Sync result count does not include asset account changes**
  - **Priority:** P2
  - **File:** `src/sync/syncOrchestrator.ts`
  - **What:** `SyncDiff` includes `assetAccounts`, but `countDiffEntries()` does not count them.
  - **Impact:** Sync success messaging under-reports number of synced records.

- [x] **Priority debt expand/collapse state does not react to strategy changes**
  - **Priority:** P2
  - **File:** `src/components/DebtCard.tsx`
  - **What:** `expanded` state initializes from `isFocusDebt` once with `useState(isFocusDebt)` and does not sync when prop changes later.
  - **Why this is a bug:** When avalanche/snowball strategy changes, focus debt can change, but card expansion state does not update accordingly.
  - **Impact:** UI can disagree with selected payoff strategy.

## P3 - Lower: UX / messaging consistency

- [x] **Auto-update popup in `App.tsx` can show wrong release notes**
  - **Priority:** P3
  - **Files:** `App.tsx`, `src/screens/ProfileScreen.tsx`
  - **What:** `App.tsx` uses `RELEASE_NOTES[0]` for OTA modal, regardless of fetched update version. `ProfileScreen` manual update flow does version matching correctly.
  - **Impact:** OTA popup may show notes for latest local release entry, not actual fetched update.

- [x] **Manual update install path may show release notes twice**
  - **Priority:** P3
  - **Files:** `App.tsx`, `src/screens/ProfileScreen.tsx`, `src/storage/releaseNotesStorage.ts`
  - **What:** Auto-install path sets `setOtaUpdateInstalled()` before reload. Manual install path in `ProfileScreen` does not set same flag.
  - **Impact:** After manual OTA install from Profile, app may still show release-notes prompt again after reload.

## Theme summary

- [x] **P0: Data loss / serious integrity risk**
  - Payment double-apply race
  - Incomplete reset
  - Incomplete backup/restore
  - Negative app-generated entries breaking import

- [x] **P1: Accounting / historical correctness**
  - Linked-account delete drift
  - Budget limit history remapped on restore

- [x] **P2: Sync correctness / state consistency**
  - No conflict resolution for budget limits
  - Possible orphaned sync server/discovery
  - Asset account sync counts under-reported
  - Debt card focus state not reactive

- [x] **P3: UX consistency**
  - Wrong OTA release notes in auto popup
  - Manual install may re-show release notes

---

# Round 2 - Audit Findings (2026-05-03)

Discovered via four parallel code-review agents covering React hooks, storage
integrity, financial calculations, and partner sync. Sorted by user impact.

## P0 - Critical: data loss / wrong-money risk

- [x] **Net Worth filter only counts "Savings" category - ignores Retirement and Investing**
  - **Priority:** P0
  - **Files:** `src/utils/netWorth.ts:27-32`
  - **What:** `entrySavings` filter is `entry.category === "Savings"` but every other screen (`DebtTrackerScreen.tsx:325`, `BudgetScreen.tsx:413`) treats `Savings`, `Retirement`, and `Investing` as the same reserve.
  - **Impact:** Bridge shows a different net-worth number than Build-Your-Ark for identical data. A user with $10k in Retirement category sees that $10k missing from Net Worth on the Bridge.
  - **Fix:** Match the rest of the app - broaden filter to all three categories.

- [x] **Net Worth double-counts emergency fund when explicit goal + savings entry both exist**
  - **Priority:** P0
  - **Files:** `src/utils/netWorth.ts:27-32`, `src/screens/BridgeScreen.tsx:167`
  - **What:** A user with a $1,000 `emergency_fund` SavingsGoal AND a `Savings`-category expense entry contributing to it sees both `goalSavings` and `entrySavings` summed into `totalAssets`. Same double-count on Bridge's `trackedAccountsTotal = totalAssetBalance + emergencyFundGoal.currentAmount` when an asset account labelled savings is also tracked.
  - **Impact:** Net worth and tracked-accounts numbers can be inflated by the user's full EF amount.
  - **Fix:** Pick one source of truth (goal OR entries). When both exist, prefer the explicit goal and exclude its contribution amount from `entrySavings`.

- [x] **Hull payoff simulator gives different numbers on different screens**
  - **Priority:** P0
  - **Files:** `src/screens/DebtTrackerScreen.tsx:560-571`, `src/components/SmartPlanModal.tsx:274-289`, `src/components/PayoffPlannerModal.tsx:152-173`
  - **What:** DebtTrackerScreen filters `debt.debtClass !== "house"` before feeding `simulatePayoffPlan`. The two modal-based simulators feed all balances including the mortgage. With a 30-year mortgage in the list, modal numbers can be 10-30× the card numbers for "the same Hull strategy."
  - **Impact:** Direct contradiction of the v1.4.13 design. Same data, two different numbers depending on which screen the user opens.
  - **Fix:** Add the same `debtClass !== "house"` filter to the modals' simulator inputs.

- [x] **`recordPayment` race silently undoes a payment**
  - **Priority:** P0
  - **Files:** `src/storage/debtStorage.ts:202-227`
  - **What:** Pattern is `loadDebts → mutate balance → savePayments + saveDebts`. No locking. If the user double-taps "Pay" or `applyIncomingDiff` runs mid-save, the second writer reads stale balance and one of the two payments effectively disappears.
  - **Impact:** Payments silently fail to apply. Same race shape exists across every `addX/updateX/deleteX` storage helper.
  - **Fix:** Serialize writes per storage key in `encryptedStorage.ts` (per-key async queue). At minimum, gate `applyIncomingDiff` on a "no save in flight" flag.

- [x] **Recurring auto-apply runs from two screens and can double-credit asset balances**
  - **Priority:** P0
  - **Files:** `src/screens/BudgetScreen.tsx:285-341`, `src/screens/BridgeScreen.tsx:75-98`, `src/utils/linkedAccountRecurring.ts`
  - **What:** Both screens, on focus, call `applyMissedRecurringLinkedAccountContributions` which mutates entries + asset accounts. If the user opens Bridge then quickly switches to Budget while the first save is in flight, both screens compute deltas off pre-update state and credit the asset balance twice.
  - **Impact:** Tracked retirement/savings balance creeps up by `amount × N` for every screen visit until next month rollover.
  - **Fix:** Move catch-up into a single guarded function that runs on app foreground only. Write `lastAppliedMonth` first, balance second; abort balance write if marker save failed.

- [x] **Spreadsheet round-trip drops `updatedAt` on budget entries - wipes partner data on next sync**
  - **Priority:** P0
  - **Files:** `src/utils/spreadsheetExport.ts:184-194`, `src/utils/spreadsheetImport.ts:285-298`
  - **What:** Budget entry export columns don't include `UpdatedAt`. Importer always stamps `updatedAt: now`. Round-tripping through xlsx makes every entry "freshly edited."
  - **Impact:** On the next paired-device sync, every entry overwrites the partner's data because the import-time stamp wins LWW.
  - **Fix:** Add `UpdatedAt` to budget entry column set; preserve on import; if absent, fall back to `createdAt` not `now`.

- [x] **`mergeById` cannot delete records - silent resurrection across paired devices**
  - **Priority:** P0
  - **Files:** `src/sync/diffEngine.ts:121-150` and every `filterChanged` site (74-80)
  - **What:** `computeOutgoingDiff` only ever emits `action: "upsert"`. When Alice deletes a debt, the next sync sends nothing for it. Bob still has the record, his next sync upserts it back to Alice - resurrecting the deletion.
  - **Impact:** Deletions silently revert across paired devices; the user thinks they deleted a record but it keeps coming back.
  - **Fix:** Persist deletion tombstones (`deletedAt`); emit `action: "delete"` from `computeOutgoingDiff`; reject upserts older than a known tombstone in `mergeById`.

## P1 - High: visible glitches, crashy edge cases

- [x] **iOS modal-stacking on debt celebration → history**
  - **Priority:** P1
  - **Files:** `src/screens/DebtTrackerScreen.tsx:1056-1064` (`onViewHistory`), `src/screens/DebtTrackerScreen.tsx:628-640` (`handleSaveEdit` celebration trigger)
  - **What:** `setCelebrationDebt(null) + setShowHistory(true)` in the same tick - iOS Modal can't reliably dismiss-then-present in one frame. Same problem for an edit that pays off a debt while the edit modal is still tearing down.
  - **Impact:** "View History" sometimes leaves the user staring at a dimmed celebration with no history modal; or shows a flicker where two sheets overlap.
  - **Fix:** Wait one frame between dismiss and present (250ms `setTimeout`).

- [x] **Async screen loaders lack cancellation flags - month-switch shows wrong data**
  - **Priority:** P1
  - **Files:** `src/screens/BudgetScreen.tsx:285-356`, `BridgeScreen.tsx:74-120`, `DebtTrackerScreen.tsx:278-378`, `UtilitiesScreen.tsx:439-457`, `ProfileScreen.tsx:253-290`, `src/components/PaymentHistoryModal.tsx:95-104`
  - **What:** Every `useFocusEffect`/effect that does `await getX(); setX(...)` has no `let cancelled = false` guard.
  - **Impact:** Tap month switcher fast on Budget → see the wrong month's data because the older async load resolves last.
  - **Fix:** Standard cancel-flag pattern in every async loader.

- [x] **PairingModal + ProfileScreen leak listeners on unmount**
  - **Priority:** P1
  - **Files:** `src/components/PairingModal.tsx:81-105`, `src/screens/ProfileScreen.tsx:253-290`
  - **What:** PairingModal cleanup runs only on `visible` flip, not on parent unmount - leaves countdown interval, TCP server, and Zeroconf advert running. ProfileScreen registers `startMonitoring` on mount with no `stopMonitoring()` in cleanup.
  - **Impact:** Resource leak; can wedge subsequent pair attempts on the same port.
  - **Fix:** Move cleanup body into the effect's `return () => { ... }`.

- [x] **Storage timeouts leave cross-key partial state**
  - **Priority:** P1
  - **Files:** `src/storage/encryptedStorage.ts:79-92, 270-294`, `src/storage/debtStorage.ts:202-227`, `src/utils/importData.ts:610-637`
  - **What:** `withTimeout` doesn't cancel the underlying native write. If `recordPayment` times out between `saveDebts` and `savePayments`, balance is reduced with no payment row. Import's Phase 3 promotion has the same shape - rollback writes use the same timeout.
  - **Impact:** Inconsistent storage state after a slow disk write times out.
  - **Fix:** Use `multiSet` for compound writes where possible; surface "data may be inconsistent" instead of swallowing throws.

- [x] **`simulatePayoffPlan` returns `monthsToPayoff: 1` for unsolvable plans**
  - **Priority:** P1
  - **Files:** `src/utils/calculations.ts:201-210`
  - **What:** Early-exit on "balance not decreasing" returns `{monthsToPayoff: 1, isPayoffPossible: false}`. `formatPayoffMonths(1)` prints `"1 mo"` even when `isPayoffPossible: false`.
  - **Impact:** UI shows "1 mo" for a debt where the minimum payment doesn't cover monthly interest.
  - **Fix:** Set `monthsToPayoff: Infinity` when `isPayoffPossible: false`.

- [x] **Timezone bugs in `calcMonthsUntilDate` and recurring auto-apply**
  - **Priority:** P1
  - **Files:** `src/utils/calculations.ts:448-455`, `src/utils/linkedAccountRecurring.ts:15-19`
  - **What:** `new Date(isoString)` parses as UTC midnight; `getMonth()` runs in local TZ. For users west of UTC, a date stored as `"2026-06-01T00:00:00Z"` reads as May.
  - **Impact:** Required-payment math can flip to `Infinity`; recurring contributions can credit a month early.
  - **Fix:** Slice `entry.date.slice(0,7)` for month keys, or use `getUTCMonth()`.

- [x] **`decryptV2` treats empty plaintext as integrity failure**
  - **Priority:** P1
  - **Files:** `src/storage/encryptedStorage.ts:194-197, 256-262`
  - **What:** `return plaintext || null` collapses empty string to null, which the caller interprets as a tampering throw. `getOrCreateUser` (`userStorage.ts:40`) doesn't catch the throw.
  - **Impact:** Could surface as a "data corrupted" crash even when the data is fine.
  - **Fix:** Check `bytes.sigBytes` to distinguish "decrypt produced empty" from "decrypt failed."

## P2 - Medium: state consistency, sync edge cases

- [x] **Auto-sync race fires `syncNow` twice on app foreground**
  - **Priority:** P2
  - **Files:** `src/sync/autoSyncManager.ts:53-77`
  - **What:** NetInfo change + AppState→active fire <1ms apart. Both pass cooldown check before storage `lastSyncAttempt` is updated.
  - **Fix:** Update `lastSyncAttempt` synchronously before any await; add `syncInProgress` boolean guard.

- [x] **Discovery `zc.stop()` tears down both browse and publish channels**
  - **Priority:** P2
  - **Files:** `src/sync/discoveryService.ts:23-31, 65-71, 112-121`
  - **What:** Single Zeroconf instance shared between publish and browse. `discoverPartner` cleanup calls `zc.stop()`, killing publish too.
  - **Fix:** Separate publish/browse instances; refcount before `stop()`.

- [x] **`seenNonces` set is unbounded - memory DoS path**
  - **Priority:** P2
  - **Files:** `src/sync/transportService.ts:17, 103-111`
  - **What:** Module-level `seenNonces` Set grows unbounded. A peer that can send valid frames repeatedly causes unbounded memory growth.
  - **Fix:** Bound with TTL/LRU matching `MAX_MESSAGE_AGE_MS`.

- [x] **Replay nonce set not reset on every error path**
  - **Priority:** P2
  - **File:** `src/sync/syncOrchestrator.ts:122-127, 205-208`
  - **What:** `Transport.resetReplayProtection()` only fires from outer `syncNow` catch. Internal failures + timeout closures don't reset.
  - **Fix:** Always reset in `finally` blocks.

- [x] **`payoffStrategy` flip-flops on every sync direction**
  - **Priority:** P2
  - **File:** `src/sync/diffEngine.ts:319-323`
  - **What:** Resolution comment says "accept remote since we can't timestamp a bare string." Each sync overwrites with whoever's preference is sent last.
  - **Fix:** Wrap strategy in `{value, updatedAt}` and apply LWW.

- [x] **ThemeProvider / DensityProvider flash of default on cold launch**
  - **Priority:** P2
  - **Files:** `src/theme/ThemeProvider.tsx:31-37`, `src/theme/DensityProvider.tsx:34-40`
  - **What:** First render returns defaults before storage resolves. No `ready` gate.
  - **Fix:** Track `ready` boolean; show splash or hold render until both providers are ready. (Compare CoachmarksProvider's `ready` flag pattern.)

- [x] **`clearAllData` `multiRemove` isn't atomic on Android**
  - **Priority:** P2
  - **File:** `src/storage/debtStorage.ts:233-246`
  - **What:** AsyncStorage `multiRemove` isn't transactional on Android. Slow flash + `withTimeout` can produce partial reset state.
  - **Fix:** Wrap in try/catch; surface partial-failure state instead of silent.

## P3 - Lower

- [x] **`getBudgetEntries` rewrites all entries on every read where any normalization changes anything** - startup latency, no integrity issue. `src/storage/budgetStorage.ts:69-82`. Same opt applied to `getDebtsIncludingDeleted`, `getPaymentsIncludingDeleted`, `getSavingsGoalsIncludingDeleted`, `getAssetAccountsIncludingDeleted`. Normalize helpers now return the same ref when nothing needs filling; the read path uses ref equality against `purgeExpiredTombstones` (which already returns the original array on no-op) instead of an O(n × record-size) `JSON.stringify` self-diff.
- [x] **`useTabCoachmark.handleNext` setTimeout has no cleanup on unmount** - defensive only. `src/onboarding/useTabCoachmark.tsx:52-71`.
- [x] **`CoachmarksProvider.markSeen` calls async `persist` from inside setState updater** - fire-and-forget, no observed failure. `src/onboarding/CoachmarksProvider.tsx:73-84`.
- [x] **`calcAvgMonthlyExpenses` excludes zero-spend months - biases the average upward** - affects EF target calculation. `src/screens/UtilitiesScreen.tsx:104`.
- [x] **`calcInvestmentGrowth` clamps negative rates to 0** - silently suppresses deflationary scenarios. `src/utils/calculations.ts:355-376`. Math now allows `[-MAX_RATE, MAX_RATE]` - formula is well-defined for any monthly r > -1 and -200% annual maps to monthly ≈ -0.167. Same clamp widened in `calcInvestmentTimeline`. UI still defaults to positive input; this just makes the function correct if a future scenario picker exposes losses.

## Round 3 - Self-audit findings on the v1.4.16 changes themselves

- [x] **`linkedAccountRecurring` orphan stamping when a linked asset account is deleted** - entry's `lastAppliedMonth` advanced to "now" even when the linked account no longer existed in the live array, so the credit silently vanished and every subsequent month treated the entry as already applied. Now skips entries pointing to a non-live account so they stay in catch-up state if the user later relinks.

## Suggested manual test list

### P0 tests first
- [ ] **Debt payment test**
  - Pay one debt once.
  - Leave screen and reopen.
  - Verify balance dropped exactly once.

- [ ] **Reset flow test**
  - Create asset account and edit milestone targets.
  - Reset all data.
  - Verify both are gone.

- [ ] **Backup/restore test**
  - Create savings goal, asset account, milestone edits, and budget limits in multiple months.
  - Export data.
  - Wipe app.
  - Import data.
  - Compare all restored state.

- [ ] **Negative savings correction import test**
  - Lower tracked savings in Build Your Ark.
  - Export data.
  - Attempt import.
  - Verify import still works.

### P1/P2 tests next
- [ ] **Linked account delete test**
  - Add linked savings entry.
  - Delete it.
  - Verify account balance reverses.

- [ ] **Paired sync budget limit test**
  - Change budget limit on device A.
  - Sync device B with stale data.
  - Verify limit does not roll back.

- [ ] **Sync retry leak test**
  - Start sync on both devices in awkward timing.
  - Cancel/retry.
  - Verify no stale advertising or weird second-connection behavior.

---

# Round 4 - Audit Findings (2026-06-09)

Discovered via five parallel code-review agents (screens, storage/import-export,
sync, financial calculations, components/providers). Items marked **(2x)** were
independently found by two agents. Prior rounds' items excluded.

## P0 - Critical: data loss / wrong-money risk

- [x] **Screens save tombstone-stripped arrays back to storage - wipes soft-delete tombstones (2x impact: Undo no-ops + paired-device resurrection)**
  - **Priority:** P0
  - **Files:** `src/screens/BudgetScreen.tsx:409-421, 881-884, 924-927, 1158, 1299, 1355`, `src/screens/DebtTrackerScreen.tsx:331-334, 635-637, 813-822, 978-1006`, `src/screens/BridgeScreen.tsx:147-148, 364, 413`
  - **What:** Storage docs (e.g. `savingsGoalStorage.ts:40-42`) require saving the tombstone-aware array, but screens read via `getX()` (live-only `filterLive` result) and round-trip that straight into `saveX()`. The BudgetScreen focus-effect recurring catch-up does this with **no user action** - merely focusing Budget when a monthly catch-up is due erases every pending budget-entry and asset tombstone.
  - **Impact:** (1) Delete an entry/debt, then add another or trip the catch-up - tombstone erased, Undo (`restoreBudgetEntry`/`restoreDebt`) finds nothing and silently no-ops; record permanently gone via a flow advertised as undoable. (2) With the tombstone gone before next sync, the partner's stale upsert resurrects the deletion - the exact bug the tombstone work was meant to kill.
  - **Fix:** Route screen mutations through the tombstone-aware helpers (`addDebt`, `addBudgetEntry`, ...), or make `saveX` merge the passed live array over stored records that have `deletedAt`.

- [x] **Due-date prompt logs unclamped minPayment; deletePayment restores full amount - balance can exceed what was ever owed (2x)**
  - **Priority:** P0
  - **Files:** `src/components/DebtDuePaymentPromptModal.tsx:66`, `src/storage/debtStorage.ts:312` vs `:359`
  - **What:** Prompt calls `onLogPayment(debt.id, debt.minPayment)` with no clamp to balance (DebtCard clamps at `DebtCard.tsx:136-138`). `recordPayment` clamps balance at 0 but stores the full payment amount; `deletePayment` adds back the full `target.amount`.
  - **Impact:** Balance $40, minPayment $150 - prompt logs $150, balance 0. User deletes the overpayment - balance becomes **$150** on a debt that was $40. Delete/restore cycles aren't idempotent. Spreadsheet-imported payments hit the same asymmetry.
  - **Fix:** Clamp in prompt handler (`Math.min(debt.minPayment, debt.balance)`); store the applied delta on the payment so delete/restore reverse exactly.

- [x] **Merge-mode JSON import silently overwrites singletons instead of merging - erases net-worth history**
  - **Priority:** P0
  - **Files:** `src/utils/importData.ts:823-829, 869-887`
  - **What:** In merge mode, net-worth snapshots, category bucket overrides, debt milestones, and payoff strategy are written verbatim from the file - no union, no `updatedAt` LWW.
  - **Impact:** Importing a 3-month-old backup in "Merge" mode permanently erases the last 3 months of daily net-worth snapshots; stale backup rolls back newer milestone targets/strategy.
  - **Fix:** Union snapshots by `dayKey` (keep newest `capturedAt`); merge overrides key-wise; LWW on milestones/strategy.

## P1 - High: balance drift, broken reminders, unrestorable backups, security

- [x] **BudgetScreen inline recurring catch-up duplicates `linkedAccountRecurring` without the Round-2/3 fixes**
  - **Priority:** P1
  - **Files:** `src/screens/BudgetScreen.tsx:372-422` vs `src/utils/linkedAccountRecurring.ts`
  - **What:** The focus-effect re-implements `applyMissedRecurringLinkedAccountContributions` inline, missing (1) the Round-3 orphan-account skip - entries linked to deleted accounts get `lastAppliedMonth` stamped while the credit silently vanishes, and (2) the Round-2 local-TZ month-key fix - `getMonthKey(new Date(entry.date))` parses date-only ISO as UTC. Budget is the most-visited tab, so it usually stamps before Bridge's fixed util runs - the Round-3 fix is effectively dead in practice.
  - **Impact:** Asset balances silently drift (lost or duplicated monthly contributions).
  - **Fix:** Delete the inline block; call `applyMissedRecurringLinkedAccountContributions` like BridgeScreen does.

- [x] **Due-date reminder month attribution: UTC payment timestamps vs local month key (2x)**
  - **Priority:** P1
  - **Files:** `src/utils/debtDueCalendar.ts:38-47` (used at :86, :100)
  - **What:** `hasPaymentInMonth` does `p.date.startsWith(monthKey + "-")` - UTC ISO prefix vs local-derived month key. Denver user pays June 30 at 7:30 PM local - stored as `2026-07-01T01:30Z`.
  - **Impact:** "MINIMUM DUE TODAY" prompt/banner keeps firing the rest of the day as if unpaid (inviting a double payment on next focus), and **July's reminder is silently suppressed for the whole month** - user can miss a real payment. Also disagrees with BudgetScreen's local-month bucketing of the same payment.
  - **Fix:** `getMonthKey(new Date(p.date)) === monthKey` (local components, matching the rest of the reminder math).

- [x] **Due-prompt "Yes, log" has no in-flight guard - double-tap logs the payment twice (2x)**
  - **Priority:** P1
  - **Files:** `src/components/DebtDuePaymentPromptModal.tsx:64-72`, `src/screens/DebtTrackerScreen.tsx:685-697`
  - **What:** Button stays enabled through 100-500 ms of awaits; modal closes only after `recordPayment` + `getPayments` + `syncNetWorthSnapshot`. Storage serialization means **both** taps apply cleanly. DebtCard avoids this by clearing its input synchronously.
  - **Fix:** Disable button on first press (local `submitting` state) or null the prompt synchronously.

- [x] **App's own backups outgrow its own import caps - long-term users get unrestorable exports**
  - **Priority:** P1
  - **Files:** `src/utils/exportData.ts:136`, `src/utils/importData.ts:151-155, 378-382`
  - **What:** Export pretty-prints (`JSON.stringify(payload, null, 2)`, ~3-4x compact) with no limit; import rejects >500 KB raw (checked **before** decryption, so encrypted exports lose another ~25% to base64), >2,000 items/collection, >6,000 total. ~2 years at 2-3 entries/day exceeds the cap.
  - **Impact:** Failure discovered only at restore time (device migration), when the original data may be gone.
  - **Fix:** Compact stringify on export; check size post-decryption; warn at export time if payload exceeds import limits.

- [x] **Sync transport HMAC covers payload only - envelope (type, senderId, timestamp, nonce) unauthenticated**
  - **Priority:** P1
  - **Files:** `src/sync/transportService.ts:39-43, 84-96, 102-133`
  - **What:** `buildAndSend` MACs the payload ciphertext only; `validateAndDecrypt` checks senderId/timestamp/nonce from the unauthenticated envelope. A LAN attacker who captured any valid frame can re-wrap the payload+hmac with a fresh timestamp, new nonce, and any `type` - defeating replay/age protection and enabling type confusion (SYNC_RESPONSE relabeled as SYNC_REQUEST).
  - **Fix:** HMAC the full canonical message (type|senderId|timestamp|nonce|payload); verify before trusting any envelope field.

- [x] **iOS modal stacking regressions in new flows (3 sites)**
  - **Priority:** P1
  - **Files:** (a) `src/screens/DebtTrackerScreen.tsx:662-697` - paying off a debt from the due prompt presents the celebration while the prompt is still up (2x); (b) `src/screens/BudgetScreen.tsx:1983-1986` + `src/components/BillCalendarModal.tsx:315-318` - Bill Calendar "edit entry" tears down two modals and presents the edit sheet in the same tick; (c) `src/achievements/AchievementsProvider.tsx:117-125` - achievement unlock modal presents mid-dismissal of lesson celebration (`LessonScreen.tsx:203-218`) or edit modal (`DebtTrackerScreen.tsx:746`).
  - **What:** All three violate the documented dismiss-then-present constraint the codebase fixes elsewhere with 250 ms defers (`DebtTrackerScreen.tsx:738-742, 1276-1281`).
  - **Impact:** Payoff celebration lost/flickers when final payment logged from prompt; bill-edit sheet intermittently never appears; achievement unlock celebration silently skipped (unlock persists, so it never re-shows).
  - **Fix:** Close first, present after 250 ms defer; for achievements, centralize the defer in AchievementsProvider when the queue becomes non-empty.

## P2 - Medium

- [x] **`customCategories` + `categoryBucketOverrides` do not participate in sync**
  - **Files:** `src/sync/diffEngine.ts`, `src/sync/types.ts:83-101`
  - **What:** Both are in export/import but absent from `SyncDiff`. Synced entries referencing a custom category render with fallback icon and default "wants" bucket on the partner device - bucket math diverges between paired devices.
  - **Fix:** Add both to `SyncDiff` with `updatedAt` LWW (validators already exist).

- [x] **Reset All Data leaves achievements and achievement stats**
  - **Files:** `src/storage/debtStorage.ts:430-461`
  - **What:** `RESET_KEYS` omits `@budgetark_achievements` and `@budgetark_achievement_stats`; the clear helpers exist but have zero callers. Previous user's badges/streaks survive reset. Same class as the Round-1 reset gap.
  - **Fix:** Add both keys to `RESET_KEYS`.

- [x] **Backup omits achievements, achievement stats, and due-date dismissals**
  - **Files:** `src/utils/exportData.ts:69-134`
  - **What:** After device migration, stat-based achievements reset to zero permanently; every debt with a due day re-prompts for the current month.

- [x] **`getItem` migration writes bypass the per-key write queue**
  - **Files:** `src/storage/encryptedStorage.ts:273, 278`
  - **What:** V1→V2 and legacy-plaintext upgrades call `AsyncStorage.setItem` directly, not `enqueueWrite`. A queued fresh write can land mid-migration and get silently reverted to the pre-edit value. Window is first-read-after-upgrade at app startup - exactly when concurrent reads/writes happen.
  - **Fix:** Route both migration writes through `enqueueWrite`.

- [x] **Add Entry modal: UTC month default + UTC+13/14 date shift (2x)**
  - **Files:** `src/components/AddBudgetEntryModal.tsx:58, 89-93`
  - **What:** (1) `todayYearMonth` uses `toISOString().slice(0,7)` - EST user at 8 PM on May 31 gets a "Jun 2026" default; entries quietly book into next month. (2) `buildEntryDateISO` stores local-noon-as-UTC; for UTC+13/14, day-1 entries land in the previous month and every recurrence fires a month early, permanently.
  - **Fix:** Build month key from local components; store local date parts (or noon **UTC**).

- [x] **Payoff comparison renders "Infinity mo faster" / "NaN mo faster"**
  - **Files:** `src/screens/DebtTrackerScreen.tsx:1468, 1496`, fed by `calculations.ts:207, 221`
  - **What:** Round-2 fix made unsolvable plans return `monthsToPayoff: Infinity`; the savings line does raw subtraction (`Infinity - 81 = Infinity`; both unsolvable = `NaN`). `totalInterestPaid` for an unsolvable plan is ~1 month of interest, so "Save $X" is garbage too.
  - **Fix:** Guard with `Number.isFinite`; render "Makes payoff possible" instead.

- [x] **Annual report counts future months of recurring entries as actuals**
  - **Files:** `src/utils/annualReport.ts:104-130, 221-237`
  - **What:** Current-year report sums recurring entries across all 12 months. In June, a $500/mo recurring entry shows $6,000 "set aside" when $3,000 has happened; `debtPaid` counts only real payments, so the card mixes projections and actuals.
  - **Fix:** Cap the month loop at the current month for the current year.

- [x] **Savings-streak achievement ignores recurrence and mis-parses date-only dates**
  - **Files:** `src/data/achievementDefs.ts:91-113`
  - **What:** (1) Builds month set from literal `entry.date` only - a recurring monthly Savings entry counts only its creation month, so the streak reads 0 despite continuous saving (and can revoke the badge). (2) `new Date(entry.date)` parses date-only strings as UTC - west-of-UTC users logging on the 1st get attributed to the prior month.
  - **Fix:** Use `isEntryActiveInMonth` from recurrence.ts; slice month keys (`entry.date.slice(0,7)`).

- [x] **Spreadsheet import: one out-of-range cell aborts the whole import**
  - **Files:** `src/utils/spreadsheetImport.ts` (mappers), `src/utils/importData.ts:196-199`
  - **What:** Header claims bad rows are "dropped silently" but `sanitizeCollection` throws. Mappers are looser than `recordValidators` (negative balance, unbounded rate, `(500)` parsed as -500), so rows the mappers accept reject the entire file with no row info. Caps also inconsistent (5,000 rows/sheet vs 2,000 items/collection vs 500 KB re-serialized JSON, with JSON-flavored error text for an xlsx).
  - **Fix:** Align mapper ranges with validators; skip + count in `skippedRows`; align caps.

- [x] **Replace-mode spreadsheet import destroys data the format cannot carry**
  - **Files:** `src/utils/spreadsheetImport.ts:629-639`, `src/utils/importData.ts:902-921`
  - **What:** Replace removes all 11 storage keys including net-worth snapshots, custom categories, milestones, strategy - none of which exist in the xlsx schema (CSV carries budget entries only).
  - **Fix:** Scope `keysToRemove` to collections actually present in the payload.

- [x] **CSV export formula injection (CWE-1236)**
  - **Files:** `src/utils/spreadsheetExport.ts:214-228, 989-991`
  - **What:** Descriptions/category names written verbatim; `=HYPERLINK(...)` becomes a live formula in Excel/Sheets. XLSX output is safe (string-typed cells); CSV is not.
  - **Fix:** Prefix `'` to CSV cells starting with `=`, `+`, `-`, `@`.

- [x] **Bulk-deleting payments can pop the due-date prompt over the open Payment History sheet**
  - **Files:** `src/screens/DebtTrackerScreen.tsx:781-798`, `src/components/PaymentHistoryModal.tsx:147`
  - **What:** `handlePaymentsChanged` ends with `setDuePromptDebt(...)` while the history modal is still presented; covers the in-modal UNDO bar during its 5-second window.
  - **Fix:** Skip while `showHistory` is true; re-evaluate when the history modal closes.

- [x] **`connectToHost` socket leak on post-connect error during pairing**
  - **Files:** `src/sync/transportService.ts:213-258`
  - **What:** After the connect promise resolves, a later socket error is swallowed (promise already settled) and the socket is never destroyed; mid-pairing drops rely on `joinPairing`'s 15 s timer alone.

- [x] **Net-worth snapshots do not sync between paired devices** (possibly by design - each device recomputes daily; but the unused `isNetWorthSnapshotItem` validator suggests sync was intended; history series permanently diverge)
  - **Files:** `src/sync/diffEngine.ts`, `src/storage/netWorthSnapshotStorage.ts`
  - **Fixed (1.7.2):** `SyncDiff.netWorthSnapshots?` (bare records, no tombstones) - merged by dayKey, strictly-newer capturedAt wins, validated with the previously-unused `isNetWorthSnapshotItem`. Incremental syncs send only days captured since the last sync; a one-time backlog send (`@budgetark_sync_backfill_done_v1`, stamped after the first successful sync, cleared by Reset) transfers the pre-feature history for already-paired couples - and also re-sends the full custom-category list, which had the same never-transfers-the-backlog gap.

- [x] **ProfileScreen: auto-sync monitor started via toggle never stopped on unmount**
  - **Files:** `src/screens/ProfileScreen.tsx:322-367, 661-673`
  - **What:** Unmount cleanup only stops monitoring when the mount effect started it; the toggle path recreates the listener-leak shape the prior round fixed.

## P3 - Lower

- [x] **`calcTotalInterest` overstates interest; returns $200 interest on a 0% loan** - currently has zero callers, latent only. `src/utils/calculations.ts:276-291`. Final partial month treated as a full payment.
- [x] **`isMonthKey` regex accepts `9999-99`** - one corrupt key permanently occupies a `pruneLimitHistory` slot (lexicographically-last 13) and evicts a real month on every save. Fix regex to `(0[1-9]|1[0-2])`.
- [x] **Import Phase-2 temp-key leak** - `importData.ts:893-896`: temp-write loop runs outside try/rollback; mid-loop failure strands `*_import_tmp` keys.
- [x] **CSV export calls `recordBackup`** - clears the backup-reminder banner even though CSV carries budget entries only. `spreadsheetExport.ts:1035`.
- [x] **UndoProvider replace-during-exit race** - `src/undo/UndoProvider.tsx:95-117`: a `pushUndo` landing during the prior bar's 160 ms exit can have the stale animation callback kill the new snackbar. Tag animations by bar key.

## Verified clean this round

- Charts (Sparkline, CashFlow, Donut, NetWorthHistogram, ProgressRing): divide-by-zero/NaN-to-SVG all guarded.
- 31-day due-day tap grid: `clampDueDayToMonth` handles day 31 in February correctly in reminders and bill calendar.
- Tombstone purge, `multiSet` tail-splicing, v1→v2 decrypt edge cases, prototype-pollution paths in JSON import: correct.
- Both-devices-as-server sync deadlock, partial TCP frame handling, debt `paymentDueDay` sync + validation: correct.
- Theme/Density/SurfaceStyle/Currency/CustomCategories providers: memoized, `ready`-gated.
- Prior-round cancel-flag fixes verified correctly implemented.

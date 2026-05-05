# Potential Bugs

Sorted by **priority / user impact**: crash or data-loss risk first, then data-integrity issues, then sync correctness, then UX consistency.

Static review only. No automated build/test run was performed in this environment.

## P0 — Critical: data loss / serious integrity risk

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

## P1 — High: important accounting / history correctness bugs

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

## P2 — Medium: sync correctness / state consistency

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

## P3 — Lower: UX / messaging consistency

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

# Round 2 — Audit Findings (2026-05-03)

Discovered via four parallel code-review agents covering React hooks, storage
integrity, financial calculations, and partner sync. Sorted by user impact.

## P0 — Critical: data loss / wrong-money risk

- [x] **Net Worth filter only counts "Savings" category — ignores Retirement and Investing**
  - **Priority:** P0
  - **Files:** `src/utils/netWorth.ts:27-32`
  - **What:** `entrySavings` filter is `entry.category === "Savings"` but every other screen (`DebtTrackerScreen.tsx:325`, `BudgetScreen.tsx:413`) treats `Savings`, `Retirement`, and `Investing` as the same reserve.
  - **Impact:** Bridge shows a different net-worth number than Build-Your-Ark for identical data. A user with $10k in Retirement category sees that $10k missing from Net Worth on the Bridge.
  - **Fix:** Match the rest of the app — broaden filter to all three categories.

- [x] **Net Worth double-counts emergency fund when explicit goal + savings entry both exist**
  - **Priority:** P0
  - **Files:** `src/utils/netWorth.ts:27-32`, `src/screens/BridgeScreen.tsx:167`
  - **What:** A user with a $1,000 `emergency_fund` SavingsGoal AND a `Savings`-category expense entry contributing to it sees both `goalSavings` and `entrySavings` summed into `totalAssets`. Same double-count on Bridge's `trackedAccountsTotal = totalAssetBalance + emergencyFundGoal.currentAmount` when an asset account labelled savings is also tracked.
  - **Impact:** Net worth and tracked-accounts numbers can be inflated by the user's full EF amount.
  - **Fix:** Pick one source of truth (goal OR entries). When both exist, prefer the explicit goal and exclude its contribution amount from `entrySavings`.

- [x] **Hull payoff simulator gives different numbers on different screens**
  - **Priority:** P0
  - **Files:** `src/screens/DebtTrackerScreen.tsx:560-571`, `src/components/SmartPlanModal.tsx:274-289`, `src/components/PayoffPlannerModal.tsx:152-173`
  - **What:** DebtTrackerScreen filters `debt.debtClass !== "house"` before feeding `simulatePayoffPlan`. The two modal-based simulators feed all balances including the mortgage. With a 30-year mortgage in the list, modal numbers can be 10–30× the card numbers for "the same Hull strategy."
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

- [x] **Spreadsheet round-trip drops `updatedAt` on budget entries — wipes partner data on next sync**
  - **Priority:** P0
  - **Files:** `src/utils/spreadsheetExport.ts:184-194`, `src/utils/spreadsheetImport.ts:285-298`
  - **What:** Budget entry export columns don't include `UpdatedAt`. Importer always stamps `updatedAt: now`. Round-tripping through xlsx makes every entry "freshly edited."
  - **Impact:** On the next paired-device sync, every entry overwrites the partner's data because the import-time stamp wins LWW.
  - **Fix:** Add `UpdatedAt` to budget entry column set; preserve on import; if absent, fall back to `createdAt` not `now`.

- [x] **`mergeById` cannot delete records — silent resurrection across paired devices**
  - **Priority:** P0
  - **Files:** `src/sync/diffEngine.ts:121-150` and every `filterChanged` site (74-80)
  - **What:** `computeOutgoingDiff` only ever emits `action: "upsert"`. When Alice deletes a debt, the next sync sends nothing for it. Bob still has the record, his next sync upserts it back to Alice — resurrecting the deletion.
  - **Impact:** Deletions silently revert across paired devices; the user thinks they deleted a record but it keeps coming back.
  - **Fix:** Persist deletion tombstones (`deletedAt`); emit `action: "delete"` from `computeOutgoingDiff`; reject upserts older than a known tombstone in `mergeById`.

## P1 — High: visible glitches, crashy edge cases

- [x] **iOS modal-stacking on debt celebration → history**
  - **Priority:** P1
  - **Files:** `src/screens/DebtTrackerScreen.tsx:1056-1064` (`onViewHistory`), `src/screens/DebtTrackerScreen.tsx:628-640` (`handleSaveEdit` celebration trigger)
  - **What:** `setCelebrationDebt(null) + setShowHistory(true)` in the same tick — iOS Modal can't reliably dismiss-then-present in one frame. Same problem for an edit that pays off a debt while the edit modal is still tearing down.
  - **Impact:** "View History" sometimes leaves the user staring at a dimmed celebration with no history modal; or shows a flicker where two sheets overlap.
  - **Fix:** Wait one frame between dismiss and present (250ms `setTimeout`).

- [x] **Async screen loaders lack cancellation flags — month-switch shows wrong data**
  - **Priority:** P1
  - **Files:** `src/screens/BudgetScreen.tsx:285-356`, `BridgeScreen.tsx:74-120`, `DebtTrackerScreen.tsx:278-378`, `UtilitiesScreen.tsx:439-457`, `ProfileScreen.tsx:253-290`, `src/components/PaymentHistoryModal.tsx:95-104`
  - **What:** Every `useFocusEffect`/effect that does `await getX(); setX(...)` has no `let cancelled = false` guard.
  - **Impact:** Tap month switcher fast on Budget → see the wrong month's data because the older async load resolves last.
  - **Fix:** Standard cancel-flag pattern in every async loader.

- [x] **PairingModal + ProfileScreen leak listeners on unmount**
  - **Priority:** P1
  - **Files:** `src/components/PairingModal.tsx:81-105`, `src/screens/ProfileScreen.tsx:253-290`
  - **What:** PairingModal cleanup runs only on `visible` flip, not on parent unmount — leaves countdown interval, TCP server, and Zeroconf advert running. ProfileScreen registers `startMonitoring` on mount with no `stopMonitoring()` in cleanup.
  - **Impact:** Resource leak; can wedge subsequent pair attempts on the same port.
  - **Fix:** Move cleanup body into the effect's `return () => { ... }`.

- [x] **Storage timeouts leave cross-key partial state**
  - **Priority:** P1
  - **Files:** `src/storage/encryptedStorage.ts:79-92, 270-294`, `src/storage/debtStorage.ts:202-227`, `src/utils/importData.ts:610-637`
  - **What:** `withTimeout` doesn't cancel the underlying native write. If `recordPayment` times out between `saveDebts` and `savePayments`, balance is reduced with no payment row. Import's Phase 3 promotion has the same shape — rollback writes use the same timeout.
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

## P2 — Medium: state consistency, sync edge cases

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

- [x] **`seenNonces` set is unbounded — memory DoS path**
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

## P3 — Lower

- [x] **`getBudgetEntries` rewrites all entries on every read where any normalization changes anything** — startup latency, no integrity issue. `src/storage/budgetStorage.ts:69-82`. Same opt applied to `getDebtsIncludingDeleted`, `getPaymentsIncludingDeleted`, `getSavingsGoalsIncludingDeleted`, `getAssetAccountsIncludingDeleted`. Normalize helpers now return the same ref when nothing needs filling; the read path uses ref equality against `purgeExpiredTombstones` (which already returns the original array on no-op) instead of an O(n × record-size) `JSON.stringify` self-diff.
- [x] **`useTabCoachmark.handleNext` setTimeout has no cleanup on unmount** — defensive only. `src/onboarding/useTabCoachmark.tsx:52-71`.
- [x] **`CoachmarksProvider.markSeen` calls async `persist` from inside setState updater** — fire-and-forget, no observed failure. `src/onboarding/CoachmarksProvider.tsx:73-84`.
- [x] **`calcAvgMonthlyExpenses` excludes zero-spend months — biases the average upward** — affects EF target calculation. `src/screens/UtilitiesScreen.tsx:104`.
- [x] **`calcInvestmentGrowth` clamps negative rates to 0** — silently suppresses deflationary scenarios. `src/utils/calculations.ts:355-376`. Math now allows `[-MAX_RATE, MAX_RATE]` — formula is well-defined for any monthly r > -1 and -200% annual maps to monthly ≈ -0.167. Same clamp widened in `calcInvestmentTimeline`. UI still defaults to positive input; this just makes the function correct if a future scenario picker exposes losses.

## Round 3 — Self-audit findings on the v1.4.16 changes themselves

- [x] **`linkedAccountRecurring` orphan stamping when a linked asset account is deleted** — entry's `lastAppliedMonth` advanced to "now" even when the linked account no longer existed in the live array, so the credit silently vanished and every subsequent month treated the entry as already applied. Now skips entries pointing to a non-live account so they stay in catch-up state if the user later relinks.

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

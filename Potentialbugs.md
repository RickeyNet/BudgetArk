# Potential Bugs

Sorted by **priority / user impact**: crash or data-loss risk first, then data-integrity issues, then sync correctness, then UX consistency.

Static review only. No automated build/test run was performed in this environment.

## P0 — Critical: data loss / serious integrity risk

- [ ] **Debt payment may apply twice or race incorrectly**
  - **Priority:** P0
  - **Files:** `src/screens/DebtTrackerScreen.tsx`, `src/storage/debtStorage.ts`
  - **What:** `handlePayment()` decrements debt balance in local state and saves debts, then calls `recordPayment()`, which also loads debts and decrements the balance again.
  - **Why this is a bug:** Two separate write paths mutate the same balance for one payment. Because the first `saveDebts(updated)` is not awaited, the second path can read stale or already-updated data.
  - **Impact:** Debt balance may drop twice, or UI and persisted storage may disagree after refocus/restart.
  - **Suggested manual repro:** Make one payment, leave the screen, reopen, and compare expected balance vs saved balance.

- [ ] **Reset All Data does not actually clear all finance data**
  - **Priority:** P0
  - **Files:** `src/storage/debtStorage.ts`, `src/storage/assetAccountStorage.ts`, `src/storage/debtMilestoneStorage.ts`, `src/screens/ProfileScreen.tsx`
  - **What:** `clearAllData()` removes debts, payments, budget entries, limits, payoff strategy, and savings goals, but does not remove asset accounts or debt milestone data.
  - **Why this is a bug:** Reset flow promises full reset, but important persisted finance state survives.
  - **Impact:** Old account balances or milestone progress can still appear after reset.

- [ ] **Export/import is not a full round-trip backup of current app data**
  - **Priority:** P0
  - **Files:** `src/utils/exportData.ts`, `src/utils/importData.ts`
  - **What:** Export/import covers debts, payments, budget entries, current budget limits, and user, but omits savings goals, asset accounts, debt milestone plan, payoff strategy, pairing state, and other newer app data.
  - **Why this is a bug:** Users can reasonably expect export/import to preserve full app state.
  - **Impact:** Device migration or restore can silently lose data.

- [ ] **App can generate negative budget entries that its own import validator rejects**
  - **Priority:** P0
  - **Files:** `src/screens/DebtTrackerScreen.tsx`, `src/utils/importData.ts`
  - **What:** `handleSetSavingsReserve()` can create a `BudgetEntry` with negative `amount` when user lowers tracked savings. Import validator rejects budget entries with amount less than `0.01`.
  - **Why this is a bug:** App-generated data can become non-importable.
  - **Impact:** Exported backups can fail to import later.

## P1 — High: important accounting / history correctness bugs

- [ ] **Deleting linked budget entry does not reverse linked account contribution**
  - **Priority:** P1
  - **Files:** `src/screens/BudgetScreen.tsx`
  - **What:** Add flow credits linked accounts. Edit flow reconciles linked-account delta. Delete flow removes entry but does not reverse linked account balance.
  - **Why this is a bug:** Accounting logic is incomplete across CRUD paths.
  - **Impact:** Asset account balances and net worth can drift upward over time.

- [ ] **Budget limit history is not preserved by export/import**
  - **Priority:** P1
  - **Files:** `src/utils/exportData.ts`, `src/utils/importData.ts`, `src/storage/budgetStorage.ts`
  - **What:** Export uses `getCategoryBudgetLimits()` for one month only. Import writes incoming limits into the current month key.
  - **Why this is a bug:** Historical month-specific limit data is lost or remapped to the wrong month.
  - **Impact:** Monthly review and budget history can become inaccurate after restore.
  - **Example:** January limits exported and imported in April become April limits.

## P2 — Medium: sync correctness / state consistency

- [ ] **Budget limit sync can overwrite newer local data with stale remote data**
  - **Priority:** P2
  - **Files:** `src/sync/diffEngine.ts`, `src/types/index.ts`
  - **What:** Budget limits sync has no timestamp/conflict metadata. Incoming limits overwrite by category/month without `updatedAt` comparison.
  - **Why this is a bug:** Older data from one device can win if it syncs later.
  - **Impact:** Paired devices can unexpectedly roll back budget limit values.

- [ ] **Sync fallback path may leave orphaned server/discovery running**
  - **Priority:** P2
  - **Files:** `src/sync/syncOrchestrator.ts`, `src/sync/transportService.ts`
  - **What:** `syncNow()` starts server sync, then may switch to client sync if partner is discovered. Background server promise is abandoned without explicit cancellation.
  - **Why this is a bug:** TCP server and Zeroconf publish may linger.
  - **Impact:** Resource leak, stale advertising, possible interference with future sync attempts.

- [ ] **Sync result count does not include asset account changes**
  - **Priority:** P2
  - **File:** `src/sync/syncOrchestrator.ts`
  - **What:** `SyncDiff` includes `assetAccounts`, but `countDiffEntries()` does not count them.
  - **Impact:** Sync success messaging under-reports number of synced records.

- [ ] **Priority debt expand/collapse state does not react to strategy changes**
  - **Priority:** P2
  - **File:** `src/components/DebtCard.tsx`
  - **What:** `expanded` state initializes from `isFocusDebt` once with `useState(isFocusDebt)` and does not sync when prop changes later.
  - **Why this is a bug:** When avalanche/snowball strategy changes, focus debt can change, but card expansion state does not update accordingly.
  - **Impact:** UI can disagree with selected payoff strategy.

## P3 — Lower: UX / messaging consistency

- [ ] **Auto-update popup in `App.tsx` can show wrong release notes**
  - **Priority:** P3
  - **Files:** `App.tsx`, `src/screens/ProfileScreen.tsx`
  - **What:** `App.tsx` uses `RELEASE_NOTES[0]` for OTA modal, regardless of fetched update version. `ProfileScreen` manual update flow does version matching correctly.
  - **Impact:** OTA popup may show notes for latest local release entry, not actual fetched update.

- [ ] **Manual update install path may show release notes twice**
  - **Priority:** P3
  - **Files:** `App.tsx`, `src/screens/ProfileScreen.tsx`, `src/storage/releaseNotesStorage.ts`
  - **What:** Auto-install path sets `setOtaUpdateInstalled()` before reload. Manual install path in `ProfileScreen` does not set same flag.
  - **Impact:** After manual OTA install from Profile, app may still show release-notes prompt again after reload.

## Theme summary

- [ ] **P0: Data loss / serious integrity risk**
  - Payment double-apply race
  - Incomplete reset
  - Incomplete backup/restore
  - Negative app-generated entries breaking import

- [ ] **P1: Accounting / historical correctness**
  - Linked-account delete drift
  - Budget limit history remapped on restore

- [ ] **P2: Sync correctness / state consistency**
  - No conflict resolution for budget limits
  - Possible orphaned sync server/discovery
  - Asset account sync counts under-reported
  - Debt card focus state not reactive

- [ ] **P3: UX consistency**
  - Wrong OTA release notes in auto popup
  - Manual install may re-show release notes

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

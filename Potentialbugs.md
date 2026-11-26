# Potential Bugs

Sorted by **priority / user impact**: crash or data-loss risk first, then data-integrity issues, then sync correctness, then UX consistency.

Static review only. No automated build/test run was performed in this environment.

Completed findings from audit rounds 1-4 have been removed; they remain in git history.

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

## Verified clean (round 4 audit, 2026-06-09)

- Charts (Sparkline, CashFlow, Donut, NetWorthHistogram, ProgressRing): divide-by-zero/NaN-to-SVG all guarded.
- 31-day due-day tap grid: `clampDueDayToMonth` handles day 31 in February correctly in reminders and bill calendar.
- Tombstone purge, `multiSet` tail-splicing, v1→v2 decrypt edge cases, prototype-pollution paths in JSON import: correct.
- Both-devices-as-server sync deadlock, partial TCP frame handling, debt `paymentDueDay` sync + validation: correct.
- Theme/Density/SurfaceStyle/Currency/CustomCategories providers: memoized, `ready`-gated.
- Prior-round cancel-flag fixes verified correctly implemented.

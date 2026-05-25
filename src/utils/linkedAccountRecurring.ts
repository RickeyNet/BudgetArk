import { AssetAccount, BudgetEntry } from "../types";
import { countOccurrencesBetween } from "./recurrence";

// UTC, not local. ISO date strings like "2026-06-01" parse as UTC midnight;
// using `getMonth()` against that for users west of UTC was reading the
// previous month and credited recurring contributions one month early.
const getMonthKey = (date: Date): string => {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}`;
};

// For arbitrary ISO date strings, slice the YYYY-MM prefix directly when
// possible - that avoids a Date round-trip entirely.
const monthKeyFromISO = (iso: string): string => {
  if (/^\d{4}-\d{2}/.test(iso)) return iso.slice(0, 7);
  return getMonthKey(new Date(iso));
};

export const applyMissedRecurringLinkedAccountContributions = (
  entries: BudgetEntry[],
  assetAccounts: AssetAccount[],
  fromDate: Date = new Date()
): {
  entries: BudgetEntry[];
  assetAccounts: AssetAccount[];
  changed: boolean;
} => {
  const currentMonth = getMonthKey(fromDate);
  const nextEntries = entries.map((entry) => ({ ...entry }));
  const totalsByAccountId = new Map<string, number>();
  // Callers pass live (non-tombstoned) accounts. An entry pointing to an
  // account that no longer exists used to still advance its `lastAppliedMonth`
  // here even though the credit silently vanished (the missing account isn't
  // in the map below) - so the user lost one month's contribution at delete
  // time and every subsequent month the entry was treated as "already
  // applied" with nothing to apply against. Skipping orphans keeps the
  // entry in "needs catch-up" state so a future fix-up (relink to a
  // different account) can apply the missed months instead of stranding
  // them.
  const liveAccountIds = new Set(assetAccounts.map((a) => a.id));
  let changed = false;

  for (const entry of nextEntries) {
    if (!entry.recurring || !entry.linkedAccountId) continue;
    if (!liveAccountIds.has(entry.linkedAccountId)) continue;

    const entryStartMonth = monthKeyFromISO(entry.date);
    const lastApplied = entry.lastAppliedMonth ?? entryStartMonth;
    if (lastApplied >= currentMonth) continue;

    const occurrences = countOccurrencesBetween(entry, lastApplied, currentMonth);
    if (occurrences <= 0) {
      // No cycle landed in this window (e.g. quarterly entry between cycles).
      // Still advance the marker so we don't re-scan the same gap each load.
      entry.lastAppliedMonth = currentMonth;
      changed = true;
      continue;
    }

    const delta = entry.amount * occurrences;
    totalsByAccountId.set(
      entry.linkedAccountId,
      (totalsByAccountId.get(entry.linkedAccountId) ?? 0) + delta
    );
    entry.lastAppliedMonth = currentMonth;
    changed = true;
  }

  if (!changed) {
    return { entries, assetAccounts, changed: false };
  }

  const now = new Date().toISOString();
  const nextAccounts = assetAccounts.map((account) => {
    const delta = totalsByAccountId.get(account.id);
    if (!delta) return account;
    return {
      ...account,
      balance: account.balance + delta,
      updatedAt: now,
    };
  });

  return {
    entries: nextEntries,
    assetAccounts: nextAccounts,
    changed: true,
  };
};

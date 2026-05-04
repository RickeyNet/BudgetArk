import { AssetAccount, BudgetEntry } from "../types";

// UTC, not local. ISO date strings like "2026-06-01" parse as UTC midnight;
// using `getMonth()` against that for users west of UTC was reading the
// previous month and credited recurring contributions one month early.
const getMonthKey = (date: Date): string => {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}`;
};

// For arbitrary ISO date strings, slice the YYYY-MM prefix directly when
// possible — that avoids a Date round-trip entirely.
const monthKeyFromISO = (iso: string): string => {
  if (/^\d{4}-\d{2}/.test(iso)) return iso.slice(0, 7);
  return getMonthKey(new Date(iso));
};

const getMonthKeysBetween = (from: string, to: string): string[] => {
  const keys: string[] = [];
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  let y = fy;
  let m = fm;

  m++;
  if (m > 12) {
    m = 1;
    y++;
  }

  while (y < ty || (y === ty && m <= tm)) {
    keys.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }

  return keys;
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
  let changed = false;

  for (const entry of nextEntries) {
    if (!entry.recurring || !entry.linkedAccountId) continue;

    const entryStartMonth = monthKeyFromISO(entry.date);
    const lastApplied = entry.lastAppliedMonth ?? entryStartMonth;
    if (lastApplied >= currentMonth) continue;

    const missedMonths = getMonthKeysBetween(lastApplied, currentMonth);
    if (missedMonths.length === 0) continue;

    const delta = entry.amount * missedMonths.length;
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

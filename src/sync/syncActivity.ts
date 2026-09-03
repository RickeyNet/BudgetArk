/**
 * BudgetArk - Sync Activity Summary
 * File: src/sync/syncActivity.ts
 *
 * Pure helpers behind the Profile's "Recent activity" list under Partner
 * Sync: what an incoming diff contained, as COUNTS per collection (upserts
 * and removals) - never amounts, names or balances, so the log is safe to
 * show anywhere and safe to keep. `summarizeIncomingDiff` runs in the
 * orchestrator on the diff a partner sent (before the merge decides what
 * actually changed locally - the log answers "what arrived", which is the
 * question a couple asks); the record itself is device-local
 * (storage/syncActivityStorage). No storage import here so the
 * orchestrator's tests keep their mock surface.
 */

import type { SyncDiff } from "./types";

/** Collection keys the activity log reports, in display order. */
export const SYNC_ACTIVITY_COLLECTIONS = [
  "budgetEntries",
  "payments",
  "debts",
  "savingsGoals",
  "assetAccounts",
  "holdings",
  "budgetLimits",
  "monthStartBalances",
  "customCategories",
  "businesses",
  "people",
  "dismissedTransactions",
  "netWorthSnapshots",
] as const;

export type SyncActivityCollection = (typeof SYNC_ACTIVITY_COLLECTIONS)[number];

export const SYNC_ACTIVITY_LABELS: Record<SyncActivityCollection, [singular: string, plural: string]> = {
  budgetEntries: ["entry", "entries"],
  payments: ["payment", "payments"],
  debts: ["debt", "debts"],
  savingsGoals: ["savings goal", "savings goals"],
  assetAccounts: ["account", "accounts"],
  holdings: ["holding", "holdings"],
  budgetLimits: ["limit", "limits"],
  monthStartBalances: ["starting balance", "starting balances"],
  customCategories: ["category", "categories"],
  businesses: ["business", "businesses"],
  people: ["person", "people"],
  dismissedTransactions: ["skipped transaction", "skipped transactions"],
  netWorthSnapshots: ["net worth snapshot", "net worth snapshots"],
};

export type SyncActivityCount = { upserts: number; deletes: number };

export type SyncActivityCounts = Partial<Record<SyncActivityCollection, SyncActivityCount>>;

export type SyncActivityRecord = {
  /** ISO timestamp of the sync. */
  at: string;
  /** Partner display name at the time (sanitized upstream at pairing). */
  partnerName: string;
  /** What arrived from the partner. */
  received: SyncActivityCounts;
  /** How many records this phone sent (a single count - the partner keeps its own log). */
  sent: number;
};

const countEntries = (
  list: readonly { action: "upsert" | "delete" }[] | undefined
): SyncActivityCount | null => {
  if (!list || list.length === 0) return null;
  let upserts = 0;
  let deletes = 0;
  for (const item of list) {
    if (item.action === "delete") deletes += 1;
    else upserts += 1;
  }
  return { upserts, deletes };
};

const countKeys = (record: object | undefined): SyncActivityCount | null => {
  if (!record) return null;
  const size = Object.keys(record).length;
  return size > 0 ? { upserts: size, deletes: 0 } : null;
};

/** Counts per collection for the diff a partner sent; empty collections are omitted. */
export const summarizeIncomingDiff = (diff: SyncDiff): SyncActivityCounts => {
  const out: SyncActivityCounts = {};
  const put = (key: SyncActivityCollection, count: SyncActivityCount | null) => {
    if (count) out[key] = count;
  };
  put("budgetEntries", countEntries(diff.budgetEntries));
  put("payments", countEntries(diff.payments));
  put("debts", countEntries(diff.debts));
  put("savingsGoals", countEntries(diff.savingsGoals));
  put("assetAccounts", countEntries(diff.assetAccounts));
  put("holdings", countEntries(diff.holdings));
  put(
    "budgetLimits",
    diff.budgetLimits && diff.budgetLimits.length > 0
      ? { upserts: diff.budgetLimits.length, deletes: 0 }
      : null
  );
  put("monthStartBalances", countKeys(diff.monthStartBalances));
  put("customCategories", countEntries(diff.customCategories));
  put("businesses", countEntries(diff.businesses));
  put("people", countEntries(diff.people));
  put("dismissedTransactions", countKeys(diff.dismissedTransactions));
  put(
    "netWorthSnapshots",
    diff.netWorthSnapshots && diff.netWorthSnapshots.length > 0
      ? { upserts: diff.netWorthSnapshots.length, deletes: 0 }
      : null
  );
  return out;
};

export const totalReceived = (counts: SyncActivityCounts): number =>
  Object.values(counts).reduce((sum, c) => sum + (c ? c.upserts + c.deletes : 0), 0);

/**
 * "12 entries (1 removed), 2 payments" - counts only. Empty counts read
 * as "nothing new".
 */
export const describeSyncActivity = (counts: SyncActivityCounts): string => {
  const parts: string[] = [];
  for (const key of SYNC_ACTIVITY_COLLECTIONS) {
    const count = counts[key];
    if (!count) continue;
    const total = count.upserts + count.deletes;
    const [singular, plural] = SYNC_ACTIVITY_LABELS[key];
    let part = `${total} ${total === 1 ? singular : plural}`;
    if (count.deletes > 0) part += ` (${count.deletes} removed)`;
    parts.push(part);
  }
  return parts.length > 0 ? parts.join(", ") : "nothing new";
};

const isCount = (value: unknown): value is SyncActivityCount =>
  typeof value === "object" &&
  value !== null &&
  Number.isInteger((value as SyncActivityCount).upserts) &&
  (value as SyncActivityCount).upserts >= 0 &&
  Number.isInteger((value as SyncActivityCount).deletes) &&
  (value as SyncActivityCount).deletes >= 0;

/** Fail-closed parse of one stored record; null drops it. */
export const parseSyncActivityRecord = (value: unknown): SyncActivityRecord | null => {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.at !== "string" || Number.isNaN(Date.parse(record.at))) return null;
  if (typeof record.partnerName !== "string" || record.partnerName.length > 80) return null;
  if (typeof record.received !== "object" || record.received === null) return null;
  const received: SyncActivityCounts = {};
  for (const key of SYNC_ACTIVITY_COLLECTIONS) {
    const count = (record.received as Record<string, unknown>)[key];
    if (count === undefined) continue;
    if (!isCount(count)) return null;
    received[key] = { upserts: count.upserts, deletes: count.deletes };
  }
  const sent = typeof record.sent === "number" && Number.isInteger(record.sent) && record.sent >= 0 ? record.sent : 0;
  return { at: record.at, partnerName: record.partnerName, received, sent };
};

/** Fail-closed parse of the stored list, newest first. */
export const parseSyncActivityLog = (raw: string | null): SyncActivityRecord[] => {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const out: SyncActivityRecord[] = [];
  for (const item of parsed) {
    const record = parseSyncActivityRecord(item);
    if (record) out.push(record);
  }
  return out.sort((a, b) => b.at.localeCompare(a.at));
};

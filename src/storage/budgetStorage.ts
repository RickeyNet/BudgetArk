import * as EncryptedStorage from "./encryptedStorage";
import { BudgetEntry, CategoryBudgetLimit } from "../types";
import {
  filterLive,
  mergePreservingTombstones,
  purgeExpiredTombstones,
  tombstone,
  untombstone,
} from "./tombstones";

export const BUDGET_STORAGE_KEYS = {
  ENTRIES: "@budgetark_budget_entries",
  LIMITS_BY_MONTH: "@budgetark_budget_limits_by_month",
} as const;

type BudgetLimitHistory = Record<string, CategoryBudgetLimit[]>;

const getMonthKey = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
};

/**
 * Records persisted before `updatedAt` existed default to the epoch. That way
 * any fresh edit wins last-write-wins on the next sync and we don't need a
 * separate migration pass.
 */
const LIMIT_LEGACY_TIMESTAMP = "1970-01-01T00:00:00.000Z";

const normalizeLimit = (limit: CategoryBudgetLimit): CategoryBudgetLimit => ({
  ...limit,
  updatedAt:
    typeof limit.updatedAt === "string" && limit.updatedAt
      ? limit.updatedAt
      : LIMIT_LEGACY_TIMESTAMP,
});

const cloneLimits = (limits: CategoryBudgetLimit[]): CategoryBudgetLimit[] =>
  limits.map((limit) => ({ ...normalizeLimit(limit) }));

const getLimitHistory = async (): Promise<BudgetLimitHistory> => {
  const raw = await EncryptedStorage.getItem(BUDGET_STORAGE_KEYS.LIMITS_BY_MONTH);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as BudgetLimitHistory;
    if (parsed && typeof parsed === "object") {
      const normalized: BudgetLimitHistory = {};
      for (const [monthKey, limits] of Object.entries(parsed)) {
        if (Array.isArray(limits)) {
          normalized[monthKey] = limits.map(normalizeLimit);
        }
      }
      return normalized;
    }
    return {};
  } catch {
    return {};
  }
};

/**
 * Months of category-limit history to retain. 13 = a full trailing year
 * plus the current month, so a calendar-year Annual Report and the
 * year-spanning achievements (Steady Crew, All Sails Set) can verify every
 * month. ~13 small records is negligible storage.
 */
const LIMIT_HISTORY_MONTHS = 13;

const pruneLimitHistory = (history: BudgetLimitHistory): BudgetLimitHistory => {
  const keys = Object.keys(history).sort();
  const keep = keys.slice(-LIMIT_HISTORY_MONTHS);
  const next: BudgetLimitHistory = {};
  keep.forEach((key) => {
    next[key] = history[key];
  });
  return next;
};

/**
 * Returns the same ref when the entry already has `updatedAt`, so the
 * common (post-migration) read path doesn't allocate a new spread per
 * entry just to copy identical data.
 */
const normalizeBudgetEntry = (entry: BudgetEntry): BudgetEntry => {
  if (entry.updatedAt) return entry;
  return {
    ...entry,
    updatedAt: entry.createdAt || new Date().toISOString(),
  };
};

export const getBudgetEntries = async (): Promise<BudgetEntry[]> => {
  const all = await getBudgetEntriesIncludingDeleted();
  return filterLive(all);
};

/**
 * Sync-only: returns every budget entry including soft-deleted tombstones
 * so `computeOutgoingDiff` can emit `action: "delete"` for them. UI code
 * should always use `getBudgetEntries`.
 */
export const getBudgetEntriesIncludingDeleted = async (): Promise<BudgetEntry[]> => {
  const raw = await EncryptedStorage.getItem(BUDGET_STORAGE_KEYS.ENTRIES);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as BudgetEntry[];
    let normalizeChanged = false;
    const normalized = parsed.map((entry) => {
      const next = normalizeBudgetEntry(entry);
      if (next !== entry) normalizeChanged = true;
      return next;
    });
    const purged = purgeExpiredTombstones(normalized);
    // `purgeExpiredTombstones` returns the same ref when nothing was
    // dropped, and `normalizeBudgetEntry` returns the same element refs
    // when no field needed filling. Together that means a steady-state
    // read (every entry already normalized, no tombstones over TTL) costs
    // O(1) here instead of the previous O(n × entry-size) JSON.stringify
    // diff against itself.
    if (normalizeChanged || purged !== normalized) {
      await writeBudgetEntries(purged);
    }
    return purged;
  } catch {
    return [];
  }
};

/**
 * Raw write - persists exactly the array given. Only for callers that
 * already hold the tombstone-aware array (internal CRUD helpers and the
 * purge path, which must be able to drop expired tombstones).
 */
const writeBudgetEntries = async (entries: BudgetEntry[]): Promise<void> => {
  await EncryptedStorage.setItem(BUDGET_STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
};

/**
 * Persists the entries array. Safe to call with a live-only
 * (`getBudgetEntries`) array: stored tombstones missing from `entries` are
 * merged back in so a screen-level save can't erase the soft-deletes that
 * Undo and sync need. Deletes should still go through the CRUD helpers.
 */
export const saveBudgetEntries = async (entries: BudgetEntry[]): Promise<void> => {
  const raw = await EncryptedStorage.getItem(BUDGET_STORAGE_KEYS.ENTRIES);
  let stored: BudgetEntry[] = [];
  if (raw) {
    try {
      stored = JSON.parse(raw) as BudgetEntry[];
    } catch {
      stored = [];
    }
  }
  await writeBudgetEntries(mergePreservingTombstones(entries, stored));
};

export const addBudgetEntry = async (entry: BudgetEntry): Promise<BudgetEntry[]> => {
  const entries = await getBudgetEntriesIncludingDeleted();
  entries.push(entry);
  await writeBudgetEntries(entries);
  return filterLive(entries);
};

/**
 * Soft-deletes a budget entry. See debtStorage.deleteDebt for rationale.
 */
export const deleteBudgetEntry = async (id: string): Promise<BudgetEntry[]> => {
  const entries = await getBudgetEntriesIncludingDeleted();
  const now = new Date().toISOString();
  const next = entries.map((entry) =>
    entry.id === id ? tombstone(entry, now) : entry
  );
  await writeBudgetEntries(next);
  return filterLive(next);
};

/**
 * Tombstone-safe field update for a single entry. Operates on the
 * including-deleted array (like deleteBudgetEntry) so we never drop a
 * tombstone the next sync needs, and bumps `updatedAt` for LWW. Used by
 * undo-of-edit and bulk recategorize.
 */
export const updateBudgetEntry = async (
  id: string,
  patch: Partial<BudgetEntry>
): Promise<BudgetEntry[]> => {
  const entries = await getBudgetEntriesIncludingDeleted();
  const now = new Date().toISOString();
  const next = entries.map((entry) =>
    entry.id === id ? { ...entry, ...patch, id: entry.id, updatedAt: now } : entry
  );
  await writeBudgetEntries(next);
  return filterLive(next);
};

/**
 * Undo a soft-delete: clears the tombstone so the entry is live again.
 * No-op (returns current live set) if the id isn't a tombstone.
 */
export const restoreBudgetEntry = async (id: string): Promise<BudgetEntry[]> => {
  const entries = await getBudgetEntriesIncludingDeleted();
  const now = new Date().toISOString();
  const next = entries.map((entry) =>
    entry.id === id && entry.deletedAt ? untombstone(entry, now) : entry
  );
  await writeBudgetEntries(next);
  return filterLive(next);
};

/* ─── Bulk operations (multi-select) ─── */

/**
 * Soft-deletes many entries in a single read/write. Returns live entries.
 */
export const deleteBudgetEntries = async (
  ids: string[]
): Promise<BudgetEntry[]> => {
  const idSet = new Set(ids);
  const entries = await getBudgetEntriesIncludingDeleted();
  const now = new Date().toISOString();
  const next = entries.map((entry) =>
    idSet.has(entry.id) && !entry.deletedAt ? tombstone(entry, now) : entry
  );
  await writeBudgetEntries(next);
  return filterLive(next);
};

/**
 * Undo a bulk delete: clears tombstones for the given ids in one write.
 */
export const restoreBudgetEntries = async (
  ids: string[]
): Promise<BudgetEntry[]> => {
  const idSet = new Set(ids);
  const entries = await getBudgetEntriesIncludingDeleted();
  const now = new Date().toISOString();
  const next = entries.map((entry) =>
    idSet.has(entry.id) && entry.deletedAt ? untombstone(entry, now) : entry
  );
  await writeBudgetEntries(next);
  return filterLive(next);
};

/**
 * Sets the category on each entry id in the map (id -> category) in one
 * read/write, bumping updatedAt. Used by bulk recategorize and, with the
 * captured prior categories, by its undo.
 */
export const setBudgetEntryCategories = async (
  categoryById: Record<string, BudgetEntry["category"]>
): Promise<BudgetEntry[]> => {
  const entries = await getBudgetEntriesIncludingDeleted();
  const now = new Date().toISOString();
  const next = entries.map((entry) => {
    const nextCategory = categoryById[entry.id];
    return nextCategory != null
      ? { ...entry, category: nextCategory, updatedAt: now }
      : entry;
  });
  await writeBudgetEntries(next);
  return filterLive(next);
};

export const getAllLimitsByMonth = async (): Promise<BudgetLimitHistory> =>
  getLimitHistory();

export const getCategoryBudgetLimits = async (
  monthKey: string = getMonthKey(new Date())
): Promise<CategoryBudgetLimit[]> => {
  const history = await getLimitHistory();
  const exact = history[monthKey];
  if (exact) {
    return cloneLimits(exact);
  }

  const fallbackKey = Object.keys(history)
    .filter((key) => key < monthKey)
    .sort()
    .pop();

  if (!fallbackKey) {
    return [];
  }

  return cloneLimits(history[fallbackKey]);
};

export const saveCategoryBudgetLimits = async (
  limits: CategoryBudgetLimit[],
  monthKey: string = getMonthKey(new Date())
): Promise<void> => {
  const history = await getLimitHistory();
  history[monthKey] = cloneLimits(limits);
  const pruned = pruneLimitHistory(history);
  await EncryptedStorage.setItem(
    BUDGET_STORAGE_KEYS.LIMITS_BY_MONTH,
    JSON.stringify(pruned)
  );
};

export const upsertCategoryBudgetLimit = async (
  nextLimit: CategoryBudgetLimit,
  monthKey: string = getMonthKey(new Date())
): Promise<CategoryBudgetLimit[]> => {
  const limits = await getCategoryBudgetLimits(monthKey);
  const existingIndex = limits.findIndex(
    (limit) => limit.category === nextLimit.category
  );

  if (existingIndex >= 0) {
    limits[existingIndex] = nextLimit;
  } else {
    limits.push(nextLimit);
  }

  await saveCategoryBudgetLimits(limits, monthKey);
  return limits;
};

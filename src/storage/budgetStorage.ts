import * as EncryptedStorage from "./encryptedStorage";
import { BudgetEntry, CategoryBudgetLimit } from "../types";
import {
  filterLive,
  purgeExpiredTombstones,
  tombstone,
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
      await saveBudgetEntries(purged);
    }
    return purged;
  } catch {
    return [];
  }
};

/**
 * Persists the full entries array (live + tombstones). Sync writes go
 * through this. UI screens that need to splice/delete should use the CRUD
 * helpers below - calling `saveBudgetEntries(filtered)` to delete would
 * silently drop the tombstone the next sync needs to propagate the delete.
 */
export const saveBudgetEntries = async (entries: BudgetEntry[]): Promise<void> => {
  await EncryptedStorage.setItem(BUDGET_STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
};

export const addBudgetEntry = async (entry: BudgetEntry): Promise<BudgetEntry[]> => {
  const entries = await getBudgetEntriesIncludingDeleted();
  entries.push(entry);
  await saveBudgetEntries(entries);
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
  await saveBudgetEntries(next);
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

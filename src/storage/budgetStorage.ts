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

const pruneLimitHistory = (history: BudgetLimitHistory): BudgetLimitHistory => {
  const keys = Object.keys(history).sort();
  const keep = keys.slice(-6);
  const next: BudgetLimitHistory = {};
  keep.forEach((key) => {
    next[key] = history[key];
  });
  return next;
};

const normalizeBudgetEntry = (entry: BudgetEntry): BudgetEntry => ({
  ...entry,
  updatedAt: entry.updatedAt || entry.createdAt || new Date().toISOString(),
});

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
    const normalized = parsed.map(normalizeBudgetEntry);
    const purged = purgeExpiredTombstones(normalized);
    if (JSON.stringify(parsed) !== JSON.stringify(purged)) {
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
 * helpers below — calling `saveBudgetEntries(filtered)` to delete would
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

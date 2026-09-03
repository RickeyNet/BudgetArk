import * as EncryptedStorage from "./encryptedStorage";
import { getMonthKey } from "../utils/budgetMonths";
import { BudgetEntry, CategoryBudgetLimit } from "../types";
import {
  filterLive,
  mergePreservingTombstones,
  purgeExpiredTombstones,
  tombstone,
  untombstone,
} from "./tombstones";
import { repairCollectionInPlace } from "./collectionRepair";
import {
  addLoanRepayment,
  removeLoanRepayment,
  type NewLoanRepaymentInput,
} from "../utils/loans";

export const BUDGET_STORAGE_KEYS = {
  ENTRIES: "@budgetark_budget_entries",
  LIMITS_BY_MONTH: "@budgetark_budget_limits_by_month",
} as const;

type BudgetLimitHistory = Record<string, CategoryBudgetLimit[]>;

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
      // Atomic recompute instead of writing our own (possibly stale)
      // snapshot: a mutation or sync write landing between the read above
      // and this write must not be reverted by the repair.
      await repairCollectionInPlace(
        BUDGET_STORAGE_KEYS.ENTRIES,
        normalizeBudgetEntry
      );
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

/**
 * Atomic read-modify-write for the entries collection. `mutate` receives
 * the CURRENT stored array (tombstones included, corrupt/missing -> empty)
 * inside encryptedStorage's per-key write queue and returns the next array.
 *
 * Every CRUD helper below goes through this rather than the getX -> mutate
 * -> saveX pattern. The difference matters because entries have writers the
 * Budget screen never sees: an incoming partner sync (`applyIncomingDiff`)
 * and bank auto-approvals (`reviewInboxService`) both land on app
 * foreground. A screen-level `saveBudgetEntries(stateArray)` after either
 * one hard-deleted their records (`mergePreservingTombstones` deliberately
 * drops live records absent from its input) - and the partner never
 * re-sent them because their `updatedAt` predated the sync watermark.
 * Mutating the stored array in place means those records survive whatever
 * the screen's state was when the user tapped Save.
 *
 * Returns the live (non-tombstoned) result, which is what screens render.
 */
const mutateBudgetEntries = async (
  mutate: (stored: BudgetEntry[]) => BudgetEntry[]
): Promise<BudgetEntry[]> => {
  let result: BudgetEntry[] = [];
  await EncryptedStorage.updateItem(BUDGET_STORAGE_KEYS.ENTRIES, (current) => {
    let stored: BudgetEntry[] = [];
    if (current) {
      try {
        const parsed: unknown = JSON.parse(current);
        if (Array.isArray(parsed)) stored = parsed as BudgetEntry[];
      } catch {
        stored = [];
      }
    }
    result = mutate(stored);
    return JSON.stringify(result);
  });
  return filterLive(result);
};

/**
 * Incoming-sync merge, atomic against every other writer on the key.
 * `merge` sees the CURRENT stored array (tombstones included, legacy
 * records normalized exactly as the getter would) and returns the full
 * array to persist. Replaces the old getX -> mergeById -> saveX sequence in
 * applyIncomingDiff, whose read-to-write window could drop a user edit.
 */
export const mergeBudgetEntriesFromSync = async (
  merge: (stored: BudgetEntry[]) => BudgetEntry[]
): Promise<void> => {
  await mutateBudgetEntries((stored) => merge(stored.map(normalizeBudgetEntry)));
};

export const addBudgetEntry = async (entry: BudgetEntry): Promise<BudgetEntry[]> =>
  addBudgetEntries([entry]);

/**
 * Appends several new entries in one atomic write (the Add Entry modal can
 * submit a batch). Ids already present in storage are skipped so a retried
 * save can't duplicate a record.
 */
export const addBudgetEntries = async (
  newEntries: BudgetEntry[]
): Promise<BudgetEntry[]> =>
  mutateBudgetEntries((stored) => {
    if (newEntries.length === 0) return stored;
    const existingIds = new Set(stored.map((entry) => entry.id));
    const fresh = newEntries.filter((entry) => !existingIds.has(entry.id));
    return fresh.length === 0 ? stored : [...stored, ...fresh];
  });

/**
 * Soft-deletes a budget entry. See debtStorage.deleteDebt for rationale.
 */
export const deleteBudgetEntry = async (id: string): Promise<BudgetEntry[]> =>
  deleteBudgetEntries([id]);

/**
 * Tombstone-safe field update for a single entry. Operates on the
 * including-deleted array (like deleteBudgetEntry) so we never drop a
 * tombstone the next sync needs, and bumps `updatedAt` for LWW. Used by
 * the edit sheet, undo-of-edit and bulk recategorize.
 */
export const updateBudgetEntry = async (
  id: string,
  patch: Partial<BudgetEntry>
): Promise<BudgetEntry[]> =>
  mutateBudgetEntries((stored) => {
    const now = new Date().toISOString();
    return stored.map((entry) =>
      entry.id === id ? { ...entry, ...patch, id: entry.id, updatedAt: now } : entry
    );
  });

/**
 * Record a payment received against a loan (BudgetEntry.lentTo). Runs the
 * pure utils/loans rule inside the write queue so two quick taps can't
 * both read the same pre-payment entry and overpay it. Resolves to the
 * updated entry, or null when the rule refused (not a loan, more than is
 * owed, bad date) - the caller shows that as a validation message.
 */
export const addLoanRepaymentToEntry = async (
  entryId: string,
  input: NewLoanRepaymentInput
): Promise<BudgetEntry | null> => {
  let updated: BudgetEntry | null = null;
  await mutateBudgetEntries((stored) => {
    const now = new Date().toISOString();
    return stored.map((entry) => {
      if (entry.id !== entryId || entry.deletedAt) return entry;
      const next = addLoanRepayment(entry, input);
      if (!next) return entry;
      updated = { ...next, updatedAt: now };
      return updated;
    });
  });
  return updated;
};

/** Remove one recorded repayment; no-op when the id isn't on the entry. */
export const removeLoanRepaymentFromEntry = async (
  entryId: string,
  repaymentId: string
): Promise<BudgetEntry | null> => {
  let updated: BudgetEntry | null = null;
  await mutateBudgetEntries((stored) => {
    const now = new Date().toISOString();
    return stored.map((entry) => {
      if (entry.id !== entryId || entry.deletedAt) return entry;
      const next = removeLoanRepayment(entry, repaymentId);
      if (next === entry) return entry;
      updated = { ...next, updatedAt: now };
      return updated;
    });
  });
  return updated;
};

/**
 * Undo a soft-delete: clears the tombstone so the entry is live again.
 * No-op (returns current live set) if the id isn't a tombstone.
 */
export const restoreBudgetEntry = async (id: string): Promise<BudgetEntry[]> =>
  restoreBudgetEntries([id]);

/* ─── Bulk operations (multi-select) ─── */

/**
 * Soft-deletes many entries in a single read/write. Returns live entries.
 */
export const deleteBudgetEntries = async (
  ids: string[]
): Promise<BudgetEntry[]> => {
  const idSet = new Set(ids);
  return mutateBudgetEntries((stored) => {
    const now = new Date().toISOString();
    return stored.map((entry) =>
      idSet.has(entry.id) && !entry.deletedAt ? tombstone(entry, now) : entry
    );
  });
};

/**
 * Undo a bulk delete: clears tombstones for the given ids in one write.
 */
export const restoreBudgetEntries = async (
  ids: string[]
): Promise<BudgetEntry[]> => {
  const idSet = new Set(ids);
  return mutateBudgetEntries((stored) => {
    const now = new Date().toISOString();
    return stored.map((entry) =>
      idSet.has(entry.id) && entry.deletedAt ? untombstone(entry, now) : entry
    );
  });
};

/**
 * Sets the category on each entry id in the map (id -> category) in one
 * read/write, bumping updatedAt. Used by bulk recategorize, the Food split
 * sheet and, with the captured prior categories, by their undo.
 */
export const setBudgetEntryCategories = async (
  categoryById: Record<string, BudgetEntry["category"]>
): Promise<BudgetEntry[]> =>
  mutateBudgetEntries((stored) => {
    const now = new Date().toISOString();
    return stored.map((entry) => {
      const nextCategory = categoryById[entry.id];
      return nextCategory != null
        ? { ...entry, category: nextCategory, updatedAt: now }
        : entry;
    });
  });

const isLiveLimit = (limit: CategoryBudgetLimit): boolean => !limit.deletedAt;

const liveLimitsByMonth = (history: BudgetLimitHistory): BudgetLimitHistory => {
  const live: BudgetLimitHistory = {};
  for (const [monthKey, limits] of Object.entries(history)) {
    live[monthKey] = limits.filter(isLiveLimit);
  }
  return live;
};

/**
 * Live limits per month - what every screen, report and achievement
 * reads. Removed limits (tombstones, see CategoryBudgetLimit.deletedAt)
 * are filtered out here; a month whose limits were all removed comes back
 * as an empty array, not as "no data" (so it doesn't fall back to an
 * earlier month's limits).
 */
export const getAllLimitsByMonth = async (): Promise<BudgetLimitHistory> =>
  liveLimitsByMonth(await getLimitHistory());

/**
 * Sync/export-only: includes tombstoned limits so the diff engine can tell
 * a paired device about removals and a backup preserves them.
 */
export const getAllLimitsByMonthIncludingDeleted = async (): Promise<BudgetLimitHistory> =>
  getLimitHistory();

export const getCategoryBudgetLimits = async (
  monthKey: string = getMonthKey(new Date())
): Promise<CategoryBudgetLimit[]> => {
  const history = await getLimitHistory();
  const exact = history[monthKey];
  if (exact) {
    return cloneLimits(exact.filter(isLiveLimit));
  }

  const fallbackKey = Object.keys(history)
    .filter((key) => key < monthKey)
    .sort()
    .pop();

  if (!fallbackKey) {
    return [];
  }

  return cloneLimits(history[fallbackKey].filter(isLiveLimit));
};

/** Parse the stored history inside an updater (missing/corrupt -> {}). */
const parseLimitHistory = (raw: string | null): BudgetLimitHistory => {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const normalized: BudgetLimitHistory = {};
    for (const [monthKey, limits] of Object.entries(parsed as Record<string, unknown>)) {
      if (Array.isArray(limits)) {
        normalized[monthKey] = (limits as CategoryBudgetLimit[]).map(normalizeLimit);
      }
    }
    return normalized;
  } catch {
    return {};
  }
};

/**
 * Persists one month's LIVE limits. Atomic against sync and other writers
 * on the key (the merge runs inside encryptedStorage.updateItem).
 *
 * A category present in storage but absent from `limits` is a removal:
 * it stays in the month as a tombstone (`deletedAt` + a fresh `updatedAt`)
 * so the next sync sends it and the partner's per-category LWW retires
 * its copy. A category that comes back in `limits` after being removed is
 * resurrected (tombstone cleared). Callers pass live arrays and never see
 * tombstones - `getCategoryBudgetLimits` filters them.
 */
export const saveCategoryBudgetLimits = async (
  limits: CategoryBudgetLimit[],
  monthKey: string = getMonthKey(new Date())
): Promise<void> => {
  const now = new Date().toISOString();
  await EncryptedStorage.updateItem(BUDGET_STORAGE_KEYS.LIMITS_BY_MONTH, (current) => {
    const history = parseLimitHistory(current);
    const stored = history[monthKey] ?? [];
    const nextByCategory = new Map<string, CategoryBudgetLimit>();
    for (const limit of cloneLimits(limits)) {
      const { deletedAt: _cleared, ...live } = limit;
      nextByCategory.set(limit.category, live);
    }
    for (const limit of stored) {
      if (nextByCategory.has(limit.category)) continue;
      nextByCategory.set(
        limit.category,
        limit.deletedAt ? limit : { ...limit, deletedAt: now, updatedAt: now }
      );
    }
    history[monthKey] = Array.from(nextByCategory.values());
    return JSON.stringify(pruneLimitHistory(history));
  });
};

/**
 * Incoming-sync merge for the whole history (tombstones included), atomic
 * against every other writer on the key. `merge` receives the current
 * normalized history and returns the history to persist; the 13-month
 * prune is applied on the way out.
 */
export const mergeLimitHistoryFromSync = async (
  merge: (stored: BudgetLimitHistory) => BudgetLimitHistory
): Promise<void> => {
  await EncryptedStorage.updateItem(BUDGET_STORAGE_KEYS.LIMITS_BY_MONTH, (current) =>
    JSON.stringify(pruneLimitHistory(merge(parseLimitHistory(current))))
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

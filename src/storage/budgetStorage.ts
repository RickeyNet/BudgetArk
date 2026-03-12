import * as EncryptedStorage from "./encryptedStorage";
import { BudgetEntry, CategoryBudgetLimit } from "../types";

export const BUDGET_STORAGE_KEYS = {
  ENTRIES: "@budgetark_budget_entries",
  LIMITS_BY_MONTH: "@budgetark_budget_limits_by_month",
} as const;

type BudgetLimitHistory = Record<string, CategoryBudgetLimit[]>;

const getMonthKey = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
};

const cloneLimits = (limits: CategoryBudgetLimit[]): CategoryBudgetLimit[] =>
  limits.map((limit) => ({ ...limit }));

const getLimitHistory = async (): Promise<BudgetLimitHistory> => {
  const raw = await EncryptedStorage.getItem(BUDGET_STORAGE_KEYS.LIMITS_BY_MONTH);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as BudgetLimitHistory;
    if (parsed && typeof parsed === "object") {
      return parsed;
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

export const getBudgetEntries = async (): Promise<BudgetEntry[]> => {
  const raw = await EncryptedStorage.getItem(BUDGET_STORAGE_KEYS.ENTRIES);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as BudgetEntry[];
  } catch {
    return [];
  }
};

export const saveBudgetEntries = async (entries: BudgetEntry[]): Promise<void> => {
  await EncryptedStorage.setItem(BUDGET_STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
};

export const addBudgetEntry = async (entry: BudgetEntry): Promise<BudgetEntry[]> => {
  const entries = await getBudgetEntries();
  entries.push(entry);
  await saveBudgetEntries(entries);
  return entries;
};

export const deleteBudgetEntry = async (id: string): Promise<BudgetEntry[]> => {
  const entries = await getBudgetEntries();
  const filtered = entries.filter((entry) => entry.id !== id);
  await saveBudgetEntries(filtered);
  return filtered;
};

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

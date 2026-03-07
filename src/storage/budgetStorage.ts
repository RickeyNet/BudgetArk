import AsyncStorage from "@react-native-async-storage/async-storage";
import { BudgetEntry, CategoryBudgetLimit } from "../types";

export const BUDGET_STORAGE_KEYS = {
  ENTRIES: "@budgetark_budget_entries",
  LIMITS: "@budgetark_budget_limits",
} as const;

export const getBudgetEntries = async (): Promise<BudgetEntry[]> => {
  const raw = await AsyncStorage.getItem(BUDGET_STORAGE_KEYS.ENTRIES);
  return raw ? JSON.parse(raw) : [];
};

export const saveBudgetEntries = async (entries: BudgetEntry[]): Promise<void> => {
  await AsyncStorage.setItem(BUDGET_STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
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

export const getCategoryBudgetLimits = async (): Promise<CategoryBudgetLimit[]> => {
  const raw = await AsyncStorage.getItem(BUDGET_STORAGE_KEYS.LIMITS);
  return raw ? JSON.parse(raw) : [];
};

export const saveCategoryBudgetLimits = async (
  limits: CategoryBudgetLimit[]
): Promise<void> => {
  await AsyncStorage.setItem(BUDGET_STORAGE_KEYS.LIMITS, JSON.stringify(limits));
};

export const upsertCategoryBudgetLimit = async (
  nextLimit: CategoryBudgetLimit
): Promise<CategoryBudgetLimit[]> => {
  const limits = await getCategoryBudgetLimits();
  const existingIndex = limits.findIndex(
    (limit) => limit.category === nextLimit.category
  );

  if (existingIndex >= 0) {
    limits[existingIndex] = nextLimit;
  } else {
    limits.push(nextLimit);
  }

  await saveCategoryBudgetLimits(limits);
  return limits;
};

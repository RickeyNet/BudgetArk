/**
 * BudgetBuddy — Data Import Utility
 * File: src/utils/importData.ts
 *
 * Opens a document picker for the user to select a previously exported
 * BudgetBuddy JSON file, validates its structure, and writes the data
 * back into AsyncStorage — enabling device-to-device transfer.
 */

import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";

/* ── Storage keys (must match the rest of the app) ── */
const KEYS = {
  DEBTS: "@budgetbuddy_debts",
  PAYMENTS: "@budgetbuddy_payments",
  BUDGET_ENTRIES: "@budgetbuddy_budget_entries",
  BUDGET_LIMITS: "@budgetbuddy_budget_limits",
  USER: "@budgetbuddy_user",
} as const;

/* ── Minimal shape checks ── */

/** Returns true if value is a non-null object (not an array). */
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Validates that the parsed JSON looks like a BudgetBuddy export.
 * We intentionally keep this loose — we check top-level keys and that
 * arrays are arrays, but we don't deep-validate every field so that
 * older/newer export versions still work.
 */
const validatePayload = (data: unknown): data is ImportPayload => {
  if (!isObject(data)) return false;

  // Must have at least one data array
  const hasDebts = Array.isArray(data.debts);
  const hasPayments = Array.isArray(data.payments);
  const hasBudgetEntries = Array.isArray(data.budgetEntries);
  const hasBudgetLimits = Array.isArray(data.budgetLimits);

  if (!hasDebts && !hasPayments && !hasBudgetEntries && !hasBudgetLimits) {
    return false;
  }

  return true;
};

interface ImportPayload {
  debts?: unknown[];
  payments?: unknown[];
  budgetEntries?: unknown[];
  budgetLimits?: unknown[];
  user?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ImportResult {
  debts: number;
  payments: number;
  budgetEntries: number;
  budgetLimits: number;
}

/**
 * Opens the document picker, reads and validates the selected JSON file,
 * and writes the data into AsyncStorage.
 *
 * Data is **merged** with existing data by default — duplicates (same id)
 * are replaced, new items are appended.
 *
 * @param mode - "merge" keeps existing data and adds imported data,
 *               "replace" wipes existing data first.
 * @returns ImportResult with counts of imported items, or null if cancelled.
 */
export const importData = async (
  mode: "merge" | "replace" = "merge"
): Promise<ImportResult | null> => {
  /* 1. Pick a file */
  const result = await DocumentPicker.getDocumentAsync({
    type: "application/json",
  });

  if (result.canceled) return null;

  const file = result.assets[0];
  if (!file?.uri) throw new Error("No file selected.");

  /* 2. Read file contents */
  const raw = await FileSystem.readAsStringAsync(file.uri);

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(
      "The selected file is not valid JSON. Please choose a BudgetBuddy export file."
    );
  }

  /* 3. Validate structure */
  if (!validatePayload(data)) {
    throw new Error(
      "The file does not appear to be a BudgetBuddy export. Expected debts, payments, or budget data."
    );
  }

  /* 4. Write to AsyncStorage */
  const counts: ImportResult = {
    debts: 0,
    payments: 0,
    budgetEntries: 0,
    budgetLimits: 0,
  };

  if (mode === "replace") {
    // Wipe existing data first
    await AsyncStorage.multiRemove([
      KEYS.DEBTS,
      KEYS.PAYMENTS,
      KEYS.BUDGET_ENTRIES,
      KEYS.BUDGET_LIMITS,
    ]);
  }

  // Helper: merge arrays by id (or full-replace if mode is "replace")
  const mergeById = async (
    storageKey: string,
    incoming: unknown[] | undefined
  ): Promise<number> => {
    if (!incoming || incoming.length === 0) return 0;

    if (mode === "replace") {
      await AsyncStorage.setItem(storageKey, JSON.stringify(incoming));
      return incoming.length;
    }

    // Merge: load existing, deduplicate by id
    const existingRaw = await AsyncStorage.getItem(storageKey);
    const existing: Record<string, unknown>[] = existingRaw
      ? JSON.parse(existingRaw)
      : [];

    const existingIds = new Set(
      existing.map((item) => (item as any).id as string).filter(Boolean)
    );

    let added = 0;
    for (const item of incoming) {
      const id = (item as any)?.id;
      if (id && existingIds.has(id)) {
        // Replace existing item with imported version
        const idx = existing.findIndex((e) => (e as any).id === id);
        if (idx >= 0) existing[idx] = item as Record<string, unknown>;
      } else {
        existing.push(item as Record<string, unknown>);
      }
      added++;
    }

    await AsyncStorage.setItem(storageKey, JSON.stringify(existing));
    return added;
  };

  // Merge budget limits by category instead of id
  const mergeLimits = async (
    incoming: unknown[] | undefined
  ): Promise<number> => {
    if (!incoming || incoming.length === 0) return 0;

    if (mode === "replace") {
      await AsyncStorage.setItem(KEYS.BUDGET_LIMITS, JSON.stringify(incoming));
      return incoming.length;
    }

    const existingRaw = await AsyncStorage.getItem(KEYS.BUDGET_LIMITS);
    const existing: Record<string, unknown>[] = existingRaw
      ? JSON.parse(existingRaw)
      : [];

    const existingCategories = new Set(
      existing.map((item) => (item as any).category as string).filter(Boolean)
    );

    for (const item of incoming) {
      const cat = (item as any)?.category;
      if (cat && existingCategories.has(cat)) {
        const idx = existing.findIndex((e) => (e as any).category === cat);
        if (idx >= 0) existing[idx] = item as Record<string, unknown>;
      } else {
        existing.push(item as Record<string, unknown>);
      }
    }

    await AsyncStorage.setItem(KEYS.BUDGET_LIMITS, JSON.stringify(existing));
    return incoming.length;
  };

  counts.debts = await mergeById(KEYS.DEBTS, data.debts);
  counts.payments = await mergeById(KEYS.PAYMENTS, data.payments);
  counts.budgetEntries = await mergeById(KEYS.BUDGET_ENTRIES, data.budgetEntries);
  counts.budgetLimits = await mergeLimits(data.budgetLimits);

  return counts;
};

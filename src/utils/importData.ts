/**
 * BudgetArk — Data Import Utility
 * File: src/utils/importData.ts
 *
 * Two import paths:
 *   1. importData()       — opens a document picker to select a JSON file
 *   2. importFromString() — accepts a raw JSON string (e.g. pasted text)
 *
 * Both validate the payload and write into AsyncStorage.
 */

import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BUDGET_CATEGORIES } from "../types";

/* ── Storage keys (must match the rest of the app) ── */
const KEYS = {
  DEBTS: "@budgetark_debts",
  PAYMENTS: "@budgetark_payments",
  BUDGET_ENTRIES: "@budgetark_budget_entries",
  BUDGET_LIMITS: "@budgetark_budget_limits_by_month",
  USER: "@budgetark_user",
} as const;

const getCurrentMonthKey = (): string => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
};

/* ── Minimal shape checks ── */

/** Returns true if value is a non-null object (not an array). */
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Validates that the parsed JSON looks like a BudgetArk export.
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

interface SanitizedImportPayload {
  debts: Record<string, unknown>[];
  payments: Record<string, unknown>[];
  budgetEntries: Record<string, unknown>[];
  budgetLimits: Record<string, unknown>[];
  user?: Record<string, unknown>;
}

export interface ImportResult {
  debts: number;
  payments: number;
  budgetEntries: number;
  budgetLimits: number;
}

const LIMITS = {
  MAX_RAW_CHARS: 2_000_000,
  MAX_COLLECTION_ITEMS: 2_000,
  MAX_TOTAL_ITEMS: 6_000,
  MAX_TEXT_LENGTH: 120,
  MAX_DESCRIPTION_LENGTH: 220,
  MAX_MONEY: 1_000_000_000,
  MAX_RATE: 200,
} as const;

const VALID_CATEGORIES = new Set<string>(BUDGET_CATEGORIES);

const isValidDateValue = (value: unknown): value is string =>
  typeof value === "string" && !Number.isNaN(Date.parse(value));

const isSafeText = (
  value: unknown,
  maxLength: number = LIMITS.MAX_TEXT_LENGTH
): value is string =>
  typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;

const isSafeNumber = (
  value: unknown,
  { min = 0, max = LIMITS.MAX_MONEY }: { min?: number; max?: number } = {}
): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;

const isDebtItem = (item: unknown): item is Record<string, unknown> => {
  if (!isObject(item)) return false;
  return (
    isSafeText(item.id) &&
    isSafeText(item.name, 80) &&
    isSafeNumber(item.balance) &&
    isSafeNumber(item.originalBalance, { min: 0.01 }) &&
    isSafeNumber(item.rate, { min: 0, max: LIMITS.MAX_RATE }) &&
    isSafeNumber(item.minPayment) &&
    isValidDateValue(item.createdAt)
  );
};

const isPaymentItem = (item: unknown): item is Record<string, unknown> => {
  if (!isObject(item)) return false;
  return (
    isSafeText(item.id) &&
    isSafeText(item.debtId) &&
    isSafeNumber(item.amount, { min: 0.01 }) &&
    isValidDateValue(item.date)
  );
};

const isBudgetEntryItem = (item: unknown): item is Record<string, unknown> => {
  if (!isObject(item)) return false;
  const typeValid = item.type === "income" || item.type === "expense";
  const categoryValid =
    typeof item.category === "string" && VALID_CATEGORIES.has(item.category);
  const descriptionValid =
    item.description === undefined ||
    (typeof item.description === "string" &&
      item.description.length <= LIMITS.MAX_DESCRIPTION_LENGTH);

  return (
    isSafeText(item.id) &&
    typeValid &&
    categoryValid &&
    isSafeNumber(item.amount, { min: 0.01 }) &&
    descriptionValid &&
    isValidDateValue(item.date) &&
    isValidDateValue(item.createdAt)
  );
};

const isBudgetLimitItem = (item: unknown): item is Record<string, unknown> => {
  if (!isObject(item)) return false;
  return (
    typeof item.category === "string" &&
    VALID_CATEGORIES.has(item.category) &&
    isSafeNumber(item.monthlyLimit, { min: 0.01 })
  );
};

const sanitizeCollection = (
  collection: unknown[] | undefined,
  label: string,
  validator: (item: unknown) => item is Record<string, unknown>
): Record<string, unknown>[] => {
  if (!collection) return [];
  if (!Array.isArray(collection)) {
    throw new Error(`Invalid ${label} format. Expected an array.`);
  }
  if (collection.length > LIMITS.MAX_COLLECTION_ITEMS) {
    throw new Error(
      `Too many ${label} items. Maximum allowed is ${LIMITS.MAX_COLLECTION_ITEMS}.`
    );
  }

  const valid = collection.filter(validator);
  if (valid.length !== collection.length) {
    throw new Error(`Import rejected: ${label} contains invalid records.`);
  }
  return valid;
};

const sanitizeUser = (user: unknown): Record<string, unknown> | undefined => {
  if (user === undefined) return undefined;
  if (!isObject(user)) {
    throw new Error("Import rejected: user profile format is invalid.");
  }

  const normalized: Record<string, unknown> = {
    id: isSafeText(user.id) ? user.id : "",
    displayName: isSafeText(user.displayName, 40) ? user.displayName : "Buddy",
    createdAt: isValidDateValue(user.createdAt)
      ? user.createdAt
      : new Date().toISOString(),
  };

  if (typeof user.onboardingComplete === "boolean") {
    normalized.onboardingComplete = user.onboardingComplete;
  }

  if (!normalized.id) {
    throw new Error("Import rejected: user profile is missing a valid id.");
  }

  return normalized;
};

const sanitizePayload = (data: ImportPayload): SanitizedImportPayload => {
  const debts = sanitizeCollection(data.debts, "debts", isDebtItem);
  const payments = sanitizeCollection(data.payments, "payments", isPaymentItem);
  const budgetEntries = sanitizeCollection(
    data.budgetEntries,
    "budget entries",
    isBudgetEntryItem
  );
  const budgetLimits = sanitizeCollection(
    data.budgetLimits,
    "budget limits",
    isBudgetLimitItem
  );
  const user = sanitizeUser(data.user);

  const totalItems =
    debts.length + payments.length + budgetEntries.length + budgetLimits.length;
  if (totalItems > LIMITS.MAX_TOTAL_ITEMS) {
    throw new Error(
      `Import rejected: payload is too large. Maximum total records is ${LIMITS.MAX_TOTAL_ITEMS}.`
    );
  }

  return { debts, payments, budgetEntries, budgetLimits, user };
};

/* ── Core import logic (shared by file-picker and paste paths) ── */

/**
 * Parses, validates, and writes an import payload into AsyncStorage.
 *
 * @param raw  — the raw JSON string to import
 * @param mode — "merge" keeps existing data, "replace" wipes first
 * @returns ImportResult with counts of imported items
 */
export const importFromString = async (
  raw: string,
  mode: "merge" | "replace" = "merge"
): Promise<ImportResult> => {
  if (raw.length > LIMITS.MAX_RAW_CHARS) {
    throw new Error(
      "Import file is too large. Please use an export under 2 MB."
    );
  }

  /* 1. Parse */
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(
      "The text is not valid JSON. Please paste a BudgetArk export."
    );
  }

  /* 2. Validate structure */
  if (!validatePayload(data)) {
    throw new Error(
      "The data does not appear to be a BudgetArk export. Expected debts, payments, or budget data."
    );
  }

  const sanitized = sanitizePayload(data);

  /* 3. Write to AsyncStorage */
  const counts: ImportResult = {
    debts: 0,
    payments: 0,
    budgetEntries: 0,
    budgetLimits: 0,
  };

  if (mode === "replace") {
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

    const monthKey = getCurrentMonthKey();

    if (mode === "replace") {
      await AsyncStorage.setItem(
        KEYS.BUDGET_LIMITS,
        JSON.stringify({ [monthKey]: incoming })
      );
      return incoming.length;
    }

    const existingRaw = await AsyncStorage.getItem(KEYS.BUDGET_LIMITS);
    const parsed = existingRaw ? JSON.parse(existingRaw) : {};
    const history =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};

    const existingForMonth = Array.isArray(history[monthKey])
      ? (history[monthKey] as Record<string, unknown>[])
      : [];

    const existingCategories = new Set(
      existingForMonth.map((item) => (item as any).category as string).filter(Boolean)
    );

    for (const item of incoming) {
      const cat = (item as any)?.category;
      if (cat && existingCategories.has(cat)) {
        const idx = existingForMonth.findIndex((e) => (e as any).category === cat);
        if (idx >= 0) existingForMonth[idx] = item as Record<string, unknown>;
      } else {
        existingForMonth.push(item as Record<string, unknown>);
      }
    }

    history[monthKey] = existingForMonth;
    await AsyncStorage.setItem(KEYS.BUDGET_LIMITS, JSON.stringify(history));
    return incoming.length;
  };

  counts.debts = await mergeById(KEYS.DEBTS, sanitized.debts);
  counts.payments = await mergeById(KEYS.PAYMENTS, sanitized.payments);
  counts.budgetEntries = await mergeById(KEYS.BUDGET_ENTRIES, sanitized.budgetEntries);
  counts.budgetLimits = await mergeLimits(sanitized.budgetLimits);

  if (sanitized.user && mode === "replace") {
    await AsyncStorage.setItem(KEYS.USER, JSON.stringify(sanitized.user));
  }

  return counts;
};

/* ── File-picker import (original path) ── */

/**
 * Opens the document picker, reads the selected JSON file, and delegates
 * to importFromString for validation and storage.
 *
 * @param mode - "merge" or "replace"
 * @returns ImportResult with counts, or null if the user cancelled the picker.
 */
export const importData = async (
  mode: "merge" | "replace" = "merge"
): Promise<ImportResult | null> => {
  const result = await DocumentPicker.getDocumentAsync({
    type: "application/json",
  });

  if (result.canceled) return null;

  const file = result.assets[0];
  if (!file?.uri) throw new Error("No file selected.");

  const raw = await FileSystem.readAsStringAsync(file.uri);
  return importFromString(raw, mode);
};

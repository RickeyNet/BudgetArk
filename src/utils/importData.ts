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
import { File as ExpoFile } from "expo-file-system";
import CryptoJS from "crypto-js";
import * as EncryptedStorage from "../storage/encryptedStorage";
import {
  ASSET_ACCOUNT_CATEGORIES,
  BUDGET_CATEGORIES,
  DEFAULT_CURRENCY_PREFERENCE_ID,
} from "../types";
import { isCurrencyPreferenceId } from "./currencyPreferences";
import { ENCRYPTED_EXPORT_PREFIX } from "./exportData";

/* ── Storage keys (must match the rest of the app) ── */
const KEYS = {
  DEBTS: "@budgetark_debts",
  PAYMENTS: "@budgetark_payments",
  BUDGET_ENTRIES: "@budgetark_budget_entries",
  BUDGET_LIMITS: "@budgetark_budget_limits_by_month",
  USER: "@budgetark_user",
  SAVINGS_GOALS: "@budgetark_savings_goals",
  ASSET_ACCOUNTS: "@budgetark_asset_accounts",
  DEBT_MILESTONES: "@budgetark_debt_milestones",
  PAYOFF_STRATEGY: "@budgetark_payoff_strategy",
  NET_WORTH_SNAPSHOTS: "@budgetark_net_worth_snapshots",
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

  // Must have at least one recognized collection. Each new field added below
  // expands the surface so older / partial exports still pass.
  const hasAny =
    Array.isArray(data.debts) ||
    Array.isArray(data.payments) ||
    Array.isArray(data.budgetEntries) ||
    Array.isArray(data.budgetLimits) ||
    isObject(data.budgetLimitsByMonth) ||
    Array.isArray(data.savingsGoals) ||
    Array.isArray(data.assetAccounts) ||
    isObject(data.debtMilestones) ||
    typeof data.payoffStrategy === "string" ||
    Array.isArray(data.netWorthSnapshots);

  return hasAny;
};

interface ImportPayload {
  debts?: unknown[];
  payments?: unknown[];
  budgetEntries?: unknown[];
  budgetLimits?: unknown[];
  budgetLimitsByMonth?: Record<string, unknown>;
  savingsGoals?: unknown[];
  assetAccounts?: unknown[];
  debtMilestones?: Record<string, unknown>;
  payoffStrategy?: unknown;
  netWorthSnapshots?: unknown[];
  user?: Record<string, unknown>;
  [key: string]: unknown;
}

interface SanitizedImportPayload {
  debts: Record<string, unknown>[];
  payments: Record<string, unknown>[];
  budgetEntries: Record<string, unknown>[];
  budgetLimits: Record<string, unknown>[];
  budgetLimitsByMonth?: Record<string, Record<string, unknown>[]>;
  savingsGoals: Record<string, unknown>[];
  assetAccounts: Record<string, unknown>[];
  debtMilestones?: Record<string, unknown>;
  payoffStrategy?: "custom" | "avalanche" | "snowball";
  netWorthSnapshots: Record<string, unknown>[];
  user?: Record<string, unknown>;
}

export interface ImportResult {
  debts: number;
  payments: number;
  budgetEntries: number;
  budgetLimits: number;
  savingsGoals: number;
  assetAccounts: number;
  debtMilestones: boolean;
  payoffStrategy: boolean;
  netWorthSnapshots: number;
  /** Number of days since the export was created, or undefined if no exportedAt timestamp */
  staleDays?: number;
}

const LIMITS = {
  MAX_RAW_CHARS: 500_000,
  MAX_COLLECTION_ITEMS: 2_000,
  MAX_TOTAL_ITEMS: 6_000,
  MAX_TEXT_LENGTH: 120,
  MAX_DESCRIPTION_LENGTH: 220,
  MAX_MONEY: 1_000_000_000,
  MAX_RATE: 200,
} as const;

const VALID_CATEGORIES = new Set<string>(BUDGET_CATEGORIES);

/**
 * Categories where the app legitimately writes negative-amount entries
 * (e.g. lowering a tracked savings reserve via Build Your Ark generates a
 * correction entry with amount = newTotal - oldTotal, which can be negative).
 * Round-trip safety requires the validator to accept these.
 */
const NEGATIVE_AMOUNT_CATEGORIES = new Set<string>([
  "Savings",
  "Retirement",
  "Investing",
]);

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

  // Savings/Retirement/Investing entries may legitimately be negative
  // (the app writes correction entries when a tracked reserve goes down).
  // For all other categories, require positive amount.
  const allowsNegative =
    typeof item.category === "string" &&
    NEGATIVE_AMOUNT_CATEGORIES.has(item.category);
  const amountValid = allowsNegative
    ? isSafeNumber(item.amount, {
        min: -LIMITS.MAX_MONEY,
        max: LIMITS.MAX_MONEY,
      }) && Math.abs(item.amount as number) >= 0.01
    : isSafeNumber(item.amount, { min: 0.01 });

  return (
    isSafeText(item.id) &&
    typeValid &&
    categoryValid &&
    amountValid &&
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
    isSafeNumber(item.monthlyLimit, { min: 0.01, max: LIMITS.MAX_MONEY })
  );
};

const VALID_SAVINGS_GOAL_CATEGORIES = new Set([
  "emergency_fund",
  "travel",
  "home",
  "car",
  "education",
  "other",
]);

const isSavingsGoalItem = (item: unknown): item is Record<string, unknown> => {
  if (!isObject(item)) return false;
  return (
    isSafeText(item.id) &&
    isSafeText(item.name, 80) &&
    typeof item.category === "string" &&
    VALID_SAVINGS_GOAL_CATEGORIES.has(item.category) &&
    isSafeNumber(item.targetAmount, { min: 0.01 }) &&
    isSafeNumber(item.currentAmount, { min: 0 }) &&
    (item.targetDate === undefined || isValidDateValue(item.targetDate)) &&
    isValidDateValue(item.createdAt)
  );
};

const VALID_ASSET_ACCOUNT_CATEGORIES = new Set<string>(ASSET_ACCOUNT_CATEGORIES);

const isAssetAccountItem = (item: unknown): item is Record<string, unknown> => {
  if (!isObject(item)) return false;
  return (
    isSafeText(item.id) &&
    isSafeText(item.name, 80) &&
    typeof item.category === "string" &&
    VALID_ASSET_ACCOUNT_CATEGORIES.has(item.category) &&
    isSafeNumber(item.balance, { min: 0 }) &&
    isValidDateValue(item.createdAt)
  );
};

const isNetWorthSnapshotItem = (item: unknown): item is Record<string, unknown> => {
  if (!isObject(item)) return false;
  return (
    typeof item.dayKey === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(item.dayKey) &&
    isValidDateValue(item.capturedAt) &&
    typeof item.totalAssets === "number" &&
    Number.isFinite(item.totalAssets) &&
    typeof item.totalDebt === "number" &&
    Number.isFinite(item.totalDebt) &&
    typeof item.netWorth === "number" &&
    Number.isFinite(item.netWorth)
  );
};

const VALID_PAYOFF_STRATEGIES = new Set(["custom", "avalanche", "snowball"]);

const sanitizePayoffStrategy = (
  raw: unknown
): "custom" | "avalanche" | "snowball" | undefined => {
  if (typeof raw !== "string") return undefined;
  return VALID_PAYOFF_STRATEGIES.has(raw)
    ? (raw as "custom" | "avalanche" | "snowball")
    : undefined;
};

/**
 * Loosely validates the imported debt milestone plan. The storage layer
 * (`debtMilestoneStorage.normalizePlan`) re-derives any missing fields on
 * read, so we only need to confirm the basic shape is right.
 */
const sanitizeDebtMilestones = (
  raw: unknown
): Record<string, unknown> | undefined => {
  if (!isObject(raw)) return undefined;
  if (!Array.isArray(raw.steps)) return undefined;
  return raw;
};

const sanitizeBudgetLimitsByMonth = (
  raw: unknown
): Record<string, Record<string, unknown>[]> | undefined => {
  if (!isObject(raw)) return undefined;
  const out: Record<string, Record<string, unknown>[]> = {};
  for (const [monthKey, value] of Object.entries(raw)) {
    if (!/^\d{4}-\d{2}$/.test(monthKey)) continue;
    if (!Array.isArray(value)) continue;
    if (value.length > LIMITS.MAX_COLLECTION_ITEMS) {
      throw new Error(
        `Too many budget limits in month ${monthKey}. Maximum is ${LIMITS.MAX_COLLECTION_ITEMS}.`
      );
    }
    const valid = value.filter(isBudgetLimitItem);
    if (valid.length !== value.length) {
      throw new Error(
        `Import rejected: budget limits for ${monthKey} contain invalid records.`
      );
    }
    out[monthKey] = valid;
  }
  return Object.keys(out).length > 0 ? out : undefined;
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

  if (isCurrencyPreferenceId(user.currencyPreferenceId)) {
    normalized.currencyPreferenceId = user.currencyPreferenceId;
  } else {
    normalized.currencyPreferenceId = DEFAULT_CURRENCY_PREFERENCE_ID;
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
  const budgetLimitsByMonth = sanitizeBudgetLimitsByMonth(data.budgetLimitsByMonth);
  const savingsGoals = sanitizeCollection(
    data.savingsGoals,
    "savings goals",
    isSavingsGoalItem
  );
  const assetAccounts = sanitizeCollection(
    data.assetAccounts,
    "asset accounts",
    isAssetAccountItem
  );
  const netWorthSnapshots = sanitizeCollection(
    data.netWorthSnapshots,
    "net worth snapshots",
    isNetWorthSnapshotItem
  );
  const debtMilestones = sanitizeDebtMilestones(data.debtMilestones);
  const payoffStrategy = sanitizePayoffStrategy(data.payoffStrategy);
  const user = sanitizeUser(data.user);

  const limitsByMonthCount = budgetLimitsByMonth
    ? Object.values(budgetLimitsByMonth).reduce((sum, arr) => sum + arr.length, 0)
    : 0;

  const totalItems =
    debts.length +
    payments.length +
    budgetEntries.length +
    budgetLimits.length +
    limitsByMonthCount +
    savingsGoals.length +
    assetAccounts.length +
    netWorthSnapshots.length;
  if (totalItems > LIMITS.MAX_TOTAL_ITEMS) {
    throw new Error(
      `Import rejected: payload is too large. Maximum total records is ${LIMITS.MAX_TOTAL_ITEMS}.`
    );
  }

  return {
    debts,
    payments,
    budgetEntries,
    budgetLimits,
    budgetLimitsByMonth,
    savingsGoals,
    assetAccounts,
    netWorthSnapshots,
    debtMilestones,
    payoffStrategy,
    user,
  };
};

/* ── Core import logic (shared by file-picker and paste paths) ── */

/**
 * Parses, validates, and writes an import payload into AsyncStorage.
 *
 * @param raw  — the raw JSON string to import
 * @param mode — "merge" keeps existing data, "replace" wipes first
 * @returns ImportResult with counts of imported items
 */
/**
 * Returns true if the raw string is a password-encrypted BudgetArk export.
 */
export const isEncryptedExport = (raw: string): boolean =>
  raw.trimStart().startsWith(ENCRYPTED_EXPORT_PREFIX);

export const importFromString = async (
  raw: string,
  mode: "merge" | "replace" = "merge",
  password?: string
): Promise<ImportResult> => {
  if (raw.length > LIMITS.MAX_RAW_CHARS) {
    throw new Error(
      "Import file is too large. Please use an export under 500 KB."
    );
  }

  /* 0. Decrypt if this is a password-encrypted export */
  let jsonString = raw;
  if (isEncryptedExport(raw)) {
    if (!password) {
      throw new Error(
        "This export is password-encrypted. Please enter the password to decrypt it."
      );
    }
    const ciphertext = raw.trimStart().slice(ENCRYPTED_EXPORT_PREFIX.length);
    try {
      const bytes = CryptoJS.AES.decrypt(ciphertext, password);
      jsonString = bytes.toString(CryptoJS.enc.Utf8);
    } catch {
      throw new Error("Decryption failed. The password may be incorrect.");
    }
    if (!jsonString) {
      throw new Error("Decryption failed. The password may be incorrect.");
    }
  }

  /* 1. Parse */
  let data: unknown;
  try {
    data = JSON.parse(jsonString);
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

  /* 2b. Check export age for stale-import warning */
  let staleDays: number | undefined;
  if (isObject(data) && typeof (data as any).exportedAt === "string") {
    const exportedMs = Date.parse((data as any).exportedAt);
    if (!Number.isNaN(exportedMs)) {
      staleDays = Math.floor((Date.now() - exportedMs) / (1000 * 60 * 60 * 24));
      if (staleDays < 0) staleDays = 0;
    }
  }

  /* 3. Compute merged data in memory before writing anything */
  const counts: ImportResult = {
    debts: 0,
    payments: 0,
    budgetEntries: 0,
    budgetLimits: 0,
    savingsGoals: 0,
    assetAccounts: 0,
    debtMilestones: false,
    payoffStrategy: false,
    netWorthSnapshots: 0,
    staleDays,
  };

  // Helper: merge arrays by id in memory (no storage writes)
  const computeMergedById = async (
    storageKey: string,
    incoming: unknown[] | undefined
  ): Promise<{ json: string; count: number } | null> => {
    if (!incoming || incoming.length === 0) return null;

    if (mode === "replace") {
      return { json: JSON.stringify(incoming), count: incoming.length };
    }

    const existingRaw = await EncryptedStorage.getItem(storageKey);
    let existing: Record<string, unknown>[] = [];
    if (existingRaw) {
      try {
        existing = JSON.parse(existingRaw);
      } catch {
        existing = []; // corrupted storage — treat as empty
      }
    }

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

    return { json: JSON.stringify(existing), count: added };
  };

  // Compute merged budget limits in memory
  const computeMergedLimits = async (
    incoming: unknown[] | undefined
  ): Promise<{ json: string; count: number } | null> => {
    if (!incoming || incoming.length === 0) return null;

    const monthKey = getCurrentMonthKey();

    if (mode === "replace") {
      return { json: JSON.stringify({ [monthKey]: incoming }), count: incoming.length };
    }

    const existingRaw = await EncryptedStorage.getItem(KEYS.BUDGET_LIMITS);
    let parsed: unknown = {};
    if (existingRaw) {
      try {
        parsed = JSON.parse(existingRaw);
      } catch {
        parsed = {}; // corrupted storage — treat as empty
      }
    }
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
    return { json: JSON.stringify(history), count: incoming.length };
  };

  /**
   * Compute merged budget-limit history in memory. Prefers the full
   * `budgetLimitsByMonth` map when present. Falls back to the legacy
   * single-month `budgetLimits` array when only the older field is sent.
   */
  const computeMergedLimitsHistory = async (): Promise<{
    json: string;
    monthCount: number;
    totalItems: number;
  } | null> => {
    const incomingHistory = sanitized.budgetLimitsByMonth;

    // Build the canonical incoming map. Falls back to wrapping
    // legacy single-month limits under the current month key.
    let incomingMap: Record<string, Record<string, unknown>[]> | null = null;
    if (incomingHistory) {
      incomingMap = incomingHistory;
    } else if (sanitized.budgetLimits.length > 0) {
      incomingMap = { [getCurrentMonthKey()]: sanitized.budgetLimits };
    }
    if (!incomingMap) return null;

    if (mode === "replace") {
      const totalItems = Object.values(incomingMap).reduce(
        (sum, arr) => sum + arr.length,
        0
      );
      return {
        json: JSON.stringify(incomingMap),
        monthCount: Object.keys(incomingMap).length,
        totalItems,
      };
    }

    const existingRaw = await EncryptedStorage.getItem(KEYS.BUDGET_LIMITS);
    let parsed: unknown = {};
    if (existingRaw) {
      try {
        parsed = JSON.parse(existingRaw);
      } catch {
        parsed = {};
      }
    }
    const existing: Record<string, Record<string, unknown>[]> =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, Record<string, unknown>[]>)
        : {};

    let totalItems = 0;
    for (const [monthKey, incomingArr] of Object.entries(incomingMap)) {
      const existingForMonth = Array.isArray(existing[monthKey])
        ? existing[monthKey]
        : [];
      const existingCategories = new Set(
        existingForMonth.map((it: any) => it.category as string).filter(Boolean)
      );
      for (const item of incomingArr) {
        const cat = (item as any)?.category;
        if (cat && existingCategories.has(cat)) {
          const idx = existingForMonth.findIndex(
            (e: any) => e.category === cat
          );
          if (idx >= 0) existingForMonth[idx] = item;
        } else {
          existingForMonth.push(item);
        }
      }
      existing[monthKey] = existingForMonth;
      totalItems += incomingArr.length;
    }

    return {
      json: JSON.stringify(existing),
      monthCount: Object.keys(incomingMap).length,
      totalItems,
    };
  };

  // Phase 1: Compute all merged results in memory
  const mergedDebts = await computeMergedById(KEYS.DEBTS, sanitized.debts);
  const mergedPayments = await computeMergedById(KEYS.PAYMENTS, sanitized.payments);
  const mergedBudgetEntries = await computeMergedById(KEYS.BUDGET_ENTRIES, sanitized.budgetEntries);
  const mergedLimits = await computeMergedLimitsHistory();
  const mergedSavingsGoals = await computeMergedById(
    KEYS.SAVINGS_GOALS,
    sanitized.savingsGoals
  );
  const mergedAssetAccounts = await computeMergedById(
    KEYS.ASSET_ACCOUNTS,
    sanitized.assetAccounts
  );
  const mergedSnapshots = sanitized.netWorthSnapshots.length > 0
    ? { json: JSON.stringify(sanitized.netWorthSnapshots), count: sanitized.netWorthSnapshots.length }
    : null;

  // Phase 2: Write to temp keys first
  const TEMP_SUFFIX = "_import_tmp";
  const tempKeys: string[] = [];
  const tempWrites: Array<[string, string]> = [];

  if (mergedDebts) {
    tempWrites.push([KEYS.DEBTS + TEMP_SUFFIX, mergedDebts.json]);
  }
  if (mergedPayments) {
    tempWrites.push([KEYS.PAYMENTS + TEMP_SUFFIX, mergedPayments.json]);
  }
  if (mergedBudgetEntries) {
    tempWrites.push([KEYS.BUDGET_ENTRIES + TEMP_SUFFIX, mergedBudgetEntries.json]);
  }
  if (mergedLimits) {
    tempWrites.push([KEYS.BUDGET_LIMITS + TEMP_SUFFIX, mergedLimits.json]);
  }
  if (mergedSavingsGoals) {
    tempWrites.push([KEYS.SAVINGS_GOALS + TEMP_SUFFIX, mergedSavingsGoals.json]);
  }
  if (mergedAssetAccounts) {
    tempWrites.push([KEYS.ASSET_ACCOUNTS + TEMP_SUFFIX, mergedAssetAccounts.json]);
  }
  if (mergedSnapshots) {
    tempWrites.push([KEYS.NET_WORTH_SNAPSHOTS + TEMP_SUFFIX, mergedSnapshots.json]);
  }
  if (sanitized.debtMilestones) {
    tempWrites.push([
      KEYS.DEBT_MILESTONES + TEMP_SUFFIX,
      JSON.stringify(sanitized.debtMilestones),
    ]);
  }
  if (sanitized.payoffStrategy) {
    tempWrites.push([KEYS.PAYOFF_STRATEGY + TEMP_SUFFIX, sanitized.payoffStrategy]);
  }
  if (sanitized.user && mode === "replace") {
    tempWrites.push([KEYS.USER + TEMP_SUFFIX, JSON.stringify(sanitized.user)]);
  }

  // Write all temp keys
  for (const [key, value] of tempWrites) {
    await EncryptedStorage.setItem(key, value);
    tempKeys.push(key);
  }

  // Phase 3: Promote temp keys to real keys; rollback on failure
  // Back up originals first so we can restore them if the write loop fails
  const backups: Array<[string, string | null]> = [];
  try {
    if (mode === "replace") {
      const keysToRemove = [
        KEYS.DEBTS,
        KEYS.PAYMENTS,
        KEYS.BUDGET_ENTRIES,
        KEYS.BUDGET_LIMITS,
        KEYS.SAVINGS_GOALS,
        KEYS.ASSET_ACCOUNTS,
        KEYS.DEBT_MILESTONES,
        KEYS.PAYOFF_STRATEGY,
        KEYS.NET_WORTH_SNAPSHOTS,
      ];
      for (const key of keysToRemove) {
        const original = await EncryptedStorage.getItem(key);
        backups.push([key, original]);
      }
      await EncryptedStorage.multiRemove(keysToRemove);
    }

    for (const [tempKey, value] of tempWrites) {
      const realKey = tempKey.replace(TEMP_SUFFIX, "");
      if (mode !== "replace") {
        const original = await EncryptedStorage.getItem(realKey);
        backups.push([realKey, original]);
      }
      await EncryptedStorage.setItem(realKey, value);
    }

    counts.debts = mergedDebts?.count ?? 0;
    counts.payments = mergedPayments?.count ?? 0;
    counts.budgetEntries = mergedBudgetEntries?.count ?? 0;
    counts.budgetLimits = mergedLimits?.totalItems ?? 0;
    counts.savingsGoals = mergedSavingsGoals?.count ?? 0;
    counts.assetAccounts = mergedAssetAccounts?.count ?? 0;
    counts.netWorthSnapshots = mergedSnapshots?.count ?? 0;
    counts.debtMilestones = !!sanitized.debtMilestones;
    counts.payoffStrategy = !!sanitized.payoffStrategy;
  } catch (error) {
    // Rollback: restore original values, then clean up temp keys
    for (const [key, value] of backups) {
      if (value !== null) {
        await EncryptedStorage.setItem(key, value);
      } else {
        await EncryptedStorage.removeItem(key);
      }
    }
    if (tempKeys.length > 0) {
      await EncryptedStorage.multiRemove(tempKeys);
    }
    throw new Error(
      "Import failed during write. Your existing data has been restored."
    );
  }

  // Phase 4: Clean up temp keys
  if (tempKeys.length > 0) {
    await EncryptedStorage.multiRemove(tempKeys);
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
  mode: "merge" | "replace" = "merge",
  password?: string
): Promise<ImportResult | null> => {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "text/plain"],
  });

  if (result.canceled) return null;

  const file = result.assets[0];
  if (!file?.uri) throw new Error("No file selected.");

  const raw = await new ExpoFile(file.uri).text();
  return importFromString(raw, mode, password);
};

/**
 * BudgetArk - Data Import Utility
 * File: src/utils/importData.ts
 *
 * Two import paths:
 *   1. importData()       - opens a document picker to select a JSON file
 *   2. importFromString() - accepts a raw JSON string (e.g. pasted text)
 *
 * Both validate the payload and write into AsyncStorage.
 */

import * as DocumentPicker from "expo-document-picker";
import { File as ExpoFile } from "expo-file-system";
import CryptoJS from "crypto-js";
import * as EncryptedStorage from "../storage/encryptedStorage";
import {
  DEFAULT_CURRENCY_PREFERENCE_ID,
  CUSTOM_CATEGORY_STORAGE_VERSION,
} from "../types";
import { isBuiltInCategory, DEFAULT_CATEGORY_ICON } from "../data/categoryIcons";
import { generateUUID } from "./uuid";
import { isCurrencyPreferenceId } from "./currencyPreferences";
import {
  ENCRYPTED_EXPORT_PREFIX,
  ENCRYPTED_EXPORT_PREFIX_V2,
} from "./exportData";
import {
  isObject,
  isValidDateValue,
  isSafeText,
  isDebtItem,
  isPaymentItem,
  isBudgetEntryItem,
  isBudgetLimitItem,
  isSavingsGoalItem,
  isAssetAccountItem,
  isNetWorthSnapshotItem,
  isCustomCategoryItem,
  isMonthKey,
  sanitizePayoffStrategy,
  sanitizeDebtMilestones,
} from "./recordValidators";

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
  CUSTOM_CATEGORIES: "@budgetark_custom_categories",
} as const;

const getCurrentMonthKey = (): string => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
};

/* ── Minimal shape checks ── */

/**
 * Validates that the parsed JSON looks like a BudgetArk export.
 * We intentionally keep this loose - we check top-level keys and that
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
    Array.isArray(data.netWorthSnapshots) ||
    Array.isArray(data.customCategories);

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
  payoffStrategyUpdatedAt?: unknown;
  netWorthSnapshots?: unknown[];
  customCategories?: unknown[];
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
  payoffStrategyUpdatedAt?: string;
  netWorthSnapshots: Record<string, unknown>[];
  customCategories: Record<string, unknown>[];
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
  customCategories: number;
  /** Number of days since the export was created, or undefined if no exportedAt timestamp */
  staleDays?: number;
}

const LIMITS = {
  MAX_RAW_CHARS: 500_000,
  MAX_COLLECTION_ITEMS: 2_000,
  MAX_TOTAL_ITEMS: 6_000,
} as const;

const sanitizeBudgetLimitsByMonth = (
  raw: unknown
): Record<string, Record<string, unknown>[]> | undefined => {
  if (!isObject(raw)) return undefined;
  const out: Record<string, Record<string, unknown>[]> = {};
  for (const [monthKey, value] of Object.entries(raw)) {
    if (!isMonthKey(monthKey)) continue;
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
  const customCategories = sanitizeCollection(
    data.customCategories,
    "custom categories",
    isCustomCategoryItem
  );
  const debtMilestones = sanitizeDebtMilestones(data.debtMilestones);
  const payoffStrategy = sanitizePayoffStrategy(data.payoffStrategy);
  const payoffStrategyUpdatedAt = isValidDateValue(data.payoffStrategyUpdatedAt)
    ? data.payoffStrategyUpdatedAt
    : undefined;
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
    netWorthSnapshots.length +
    customCategories.length;
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
    customCategories,
    debtMilestones,
    payoffStrategy,
    payoffStrategyUpdatedAt,
    user,
  };
};

/* ── Core import logic (shared by file-picker and paste paths) ── */

/**
 * Parses, validates, and writes an import payload into AsyncStorage.
 *
 * @param raw  - the raw JSON string to import
 * @param mode - "merge" keeps existing data, "replace" wipes first
 * @returns ImportResult with counts of imported items
 */
/**
 * Returns true if the raw string is a password-encrypted BudgetArk export
 * (either format — v1 legacy or v2 PBKDF2).
 */
export const isEncryptedExport = (raw: string): boolean => {
  const head = raw.trimStart();
  return (
    head.startsWith(ENCRYPTED_EXPORT_PREFIX_V2) ||
    head.startsWith(ENCRYPTED_EXPORT_PREFIX)
  );
};

/** Decrypts a v2 envelope: salt-hex "." iv-hex "." ciphertext-base64. */
const decryptV2Envelope = (envelope: string, password: string): string => {
  const parts = envelope.split(".");
  if (parts.length !== 3) {
    throw new Error("Decryption failed. The encrypted export is malformed.");
  }
  const [saltHex, ivHex, ctB64] = parts;
  const salt = CryptoJS.enc.Hex.parse(saltHex);
  const iv = CryptoJS.enc.Hex.parse(ivHex);
  const ciphertext = CryptoJS.enc.Base64.parse(ctB64);
  const key = CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: 250_000,
    hasher: CryptoJS.algo.SHA256,
  });
  const decrypted = CryptoJS.AES.decrypt(
    CryptoJS.lib.CipherParams.create({ ciphertext }),
    key,
    { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
  );
  return decrypted.toString(CryptoJS.enc.Utf8);
};

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

  /* 0. Decrypt if this is a password-encrypted export. v2 uses PBKDF2 +
   * explicit salt/iv; v1 uses CryptoJS's weak default EVP_BytesToKey KDF
   * and is still readable here for backward-compat with older backups. */
  let jsonString = raw;
  const trimmed = raw.trimStart();
  if (trimmed.startsWith(ENCRYPTED_EXPORT_PREFIX_V2)) {
    if (!password) {
      throw new Error(
        "This export is password-encrypted. Please enter the password to decrypt it."
      );
    }
    const envelope = trimmed.slice(ENCRYPTED_EXPORT_PREFIX_V2.length);
    try {
      jsonString = decryptV2Envelope(envelope, password);
    } catch {
      throw new Error("Decryption failed. The password may be incorrect.");
    }
    if (!jsonString) {
      throw new Error("Decryption failed. The password may be incorrect.");
    }
  } else if (trimmed.startsWith(ENCRYPTED_EXPORT_PREFIX)) {
    if (!password) {
      throw new Error(
        "This export is password-encrypted. Please enter the password to decrypt it."
      );
    }
    const ciphertext = trimmed.slice(ENCRYPTED_EXPORT_PREFIX.length);
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
    customCategories: 0,
    staleDays,
  };

  // Helper: merge arrays by id in memory (no storage writes).
  //
  // Respects last-write-wins on `updatedAt` so that:
  //  1. An incoming live record can't resurrect a locally-tombstoned record
  //     unless its updatedAt is at least as new as the tombstone's.
  //  2. An incoming tombstone can't delete a locally-edited record unless
  //     its updatedAt beats the local edit.
  // Without this guard `computeMergedById` blindly replaced existing rows
  // with whatever the import contained, which contradicted the LWW semantics
  // the sync diff engine carefully implements. A backup taken before a
  // delete + re-import would silently flip the user's deleted records back
  // to live, and any partner-tombstone relayed via sync would lose to a
  // fresh import.
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
        existing = []; // corrupted storage - treat as empty
      }
    }

    const tsOf = (record: Record<string, unknown> | undefined): number => {
      if (!record) return -Infinity;
      const raw = record.updatedAt;
      if (typeof raw !== "string") return 0;
      const t = Date.parse(raw);
      return Number.isFinite(t) ? t : 0;
    };

    const indexById = new Map<string, number>();
    existing.forEach((item, idx) => {
      const id = (item as any).id;
      if (typeof id === "string") indexById.set(id, idx);
    });

    let touched = 0;
    for (const rawItem of incoming) {
      const item = rawItem as Record<string, unknown>;
      const id = item.id as string | undefined;
      if (!id) continue;

      const existingIdx = indexById.get(id);
      if (existingIdx === undefined) {
        existing.push(item);
        indexById.set(id, existing.length - 1);
        touched++;
        continue;
      }

      // Both rows present. LWW on updatedAt; ties go to the incoming record
      // since the user explicitly chose to import.
      if (tsOf(item) >= tsOf(existing[existingIdx])) {
        existing[existingIdx] = item;
        touched++;
      }
    }

    return { json: JSON.stringify(existing), count: touched };
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
        parsed = {}; // corrupted storage - treat as empty
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

    // Stamp a real updatedAt on imported rows that lack one (older exports,
    // spreadsheet rows). Without this, later paired-device sync would treat
    // these as epoch-time and any stale remote write could overwrite a
    // freshly imported limit. Using `now` keeps the import authoritative
    // until the user (or partner) edits it again.
    const importStampIso = new Date().toISOString();
    for (const limits of Object.values(incomingMap)) {
      for (const limit of limits) {
        if (typeof (limit as any).updatedAt !== "string" || !(limit as any).updatedAt) {
          (limit as any).updatedAt = importStampIso;
        }
      }
    }

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

  /**
   * Compute the merged custom-category store in memory.
   *
   * Two sources feed it, so the feature round-trips AND older/foreign
   * exports stay usable:
   *   1. The explicit `customCategories` collection (new exports).
   *   2. Names derived from imported budget entries / limits that aren't
   *      built-in and aren't already defined — covers pre-feature backups
   *      and sync-relayed entries that carry a custom name but no
   *      definition. Derived ones get the default icon until the user
   *      edits them.
   * Merge is LWW-by-id (like the other collections); names are de-duped
   * case-insensitively and any that shadow a built-in are dropped. Replace
   * mode starts from an empty base but is still seeded by both sources, so
   * a replace-from-old-backup never silently loses custom categories that
   * the imported entries still reference.
   */
  const computeMergedCustomCategories = async (): Promise<{
    json: string;
    count: number;
  } | null> => {
    const tsOf = (v: unknown): number => {
      if (typeof v !== "string") return 0;
      const t = Date.parse(v);
      return Number.isFinite(t) ? t : 0;
    };

    // Names referenced by imported entries / limits.
    const referenced = new Set<string>();
    for (const e of sanitized.budgetEntries) {
      const c = (e as any).category;
      if (typeof c === "string" && !isBuiltInCategory(c)) referenced.add(c);
    }
    const allLimitArrays: Record<string, unknown>[][] = [
      sanitized.budgetLimits,
      ...(sanitized.budgetLimitsByMonth
        ? Object.values(sanitized.budgetLimitsByMonth)
        : []),
    ];
    for (const arr of allLimitArrays) {
      for (const l of arr) {
        const c = (l as any).category;
        if (typeof c === "string" && !isBuiltInCategory(c)) referenced.add(c);
      }
    }

    const hasExplicit = sanitized.customCategories.length > 0;
    if (!hasExplicit && referenced.size === 0) return null;

    // Base: existing store (merge) or empty (replace).
    let base: Record<string, unknown>[] = [];
    if (mode !== "replace") {
      const existingRaw = await EncryptedStorage.getItem(KEYS.CUSTOM_CATEGORIES);
      if (existingRaw) {
        try {
          const parsed = JSON.parse(existingRaw);
          if (Array.isArray(parsed?.categories)) base = parsed.categories;
          else if (Array.isArray(parsed)) base = parsed; // legacy bare array
        } catch {
          base = [];
        }
      }
    }

    const byId = new Map<string, Record<string, unknown>>();
    for (const c of base) {
      const id = (c as any).id;
      if (typeof id === "string") byId.set(id, c);
    }

    let touched = 0;

    // 1. Explicit imported definitions — LWW by id.
    for (const incoming of sanitized.customCategories) {
      const id = (incoming as any).id as string;
      const existing = byId.get(id);
      if (!existing || tsOf((incoming as any).updatedAt) >= tsOf((existing as any).updatedAt)) {
        byId.set(id, incoming);
        touched++;
      }
    }

    // De-dupe by lowercased name (keep newest updatedAt) and drop any that
    // shadow a built-in category.
    const nameWinner = new Map<string, string>(); // lowerName -> id
    for (const [id, rec] of byId) {
      const name = (rec as any).name;
      if (typeof name !== "string" || isBuiltInCategory(name)) {
        byId.delete(id);
        continue;
      }
      const key = name.toLowerCase();
      const prevId = nameWinner.get(key);
      if (prevId === undefined) {
        nameWinner.set(key, id);
      } else {
        const prev = byId.get(prevId)!;
        if (tsOf((rec as any).updatedAt) >= tsOf((prev as any).updatedAt)) {
          byId.delete(prevId);
          nameWinner.set(key, id);
        } else {
          byId.delete(id);
        }
      }
    }

    // 2. Derive definitions for referenced-but-undefined names.
    const now = new Date().toISOString();
    for (const name of referenced) {
      if (nameWinner.has(name.toLowerCase())) continue;
      const id = generateUUID();
      byId.set(id, {
        id,
        name,
        icon: DEFAULT_CATEGORY_ICON,
        createdAt: now,
        updatedAt: now,
      });
      nameWinner.set(name.toLowerCase(), id);
      touched++;
    }

    if (touched === 0 && mode !== "replace") return null;

    const store = {
      categories: Array.from(byId.values()),
      version: CUSTOM_CATEGORY_STORAGE_VERSION,
    };
    return { json: JSON.stringify(store), count: touched };
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
  const mergedCustomCategories = await computeMergedCustomCategories();

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
  if (mergedCustomCategories) {
    tempWrites.push([
      KEYS.CUSTOM_CATEGORIES + TEMP_SUFFIX,
      mergedCustomCategories.json,
    ]);
  }
  if (sanitized.debtMilestones) {
    tempWrites.push([
      KEYS.DEBT_MILESTONES + TEMP_SUFFIX,
      JSON.stringify(sanitized.debtMilestones),
    ]);
  }
  if (sanitized.payoffStrategy) {
    // When the export includes `payoffStrategyUpdatedAt` (v1.4.16+), persist
    // the envelope shape so paired-device LWW can resolve it correctly.
    // Older exports without the timestamp fall through to the bare-string
    // legacy format, which `getPayoffStrategyEnvelope` upgrades on first read.
    const payoffPayload = sanitized.payoffStrategyUpdatedAt
      ? JSON.stringify({
          value: sanitized.payoffStrategy,
          updatedAt: sanitized.payoffStrategyUpdatedAt,
        })
      : sanitized.payoffStrategy;
    tempWrites.push([KEYS.PAYOFF_STRATEGY + TEMP_SUFFIX, payoffPayload]);
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
    counts.customCategories = mergedCustomCategories?.count ?? 0;
    counts.debtMilestones = !!sanitized.debtMilestones;
    counts.payoffStrategy = !!sanitized.payoffStrategy;
  } catch (error) {
    // Rollback: restore original values, then clean up temp keys.
    // We use `allSettled` and collect failures rather than awaiting each
    // restore in sequence — if a restore itself times out, the original
    // sequential `await` in a for-loop would abort and leave the remaining
    // backups un-restored, silently corrupting state. With allSettled we
    // attempt every restore and surface any that didn't make it.
    const restoreResults = await Promise.allSettled(
      backups.map(([key, value]) =>
        value !== null
          ? EncryptedStorage.setItem(key, value)
          : EncryptedStorage.removeItem(key)
      )
    );
    const restoreFailures = restoreResults
      .map((result, idx) => (result.status === "rejected" ? backups[idx][0] : null))
      .filter((key): key is string => key !== null);

    if (tempKeys.length > 0) {
      // Best-effort temp cleanup; don't let it mask the rollback report.
      await EncryptedStorage.multiRemove(tempKeys).catch(() => {});
    }

    if (restoreFailures.length > 0) {
      throw new Error(
        `Import failed during write and rollback could not restore all data ` +
          `(failed keys: ${restoreFailures.length}). ` +
          `Some records may be in an inconsistent state — please reinstall ` +
          `the app and re-import your most recent backup before adding new data.`
      );
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

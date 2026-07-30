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
import {
  aesCbcDecryptFromBase64,
  decryptLegacyCryptoJsBlob,
  hexToBytes,
  pbkdf2Sha256,
} from "../crypto/nativeCrypto";
import * as EncryptedStorage from "../storage/encryptedStorage";
import {
  DEFAULT_CURRENCY_PREFERENCE_ID,
  CUSTOM_CATEGORY_STORAGE_VERSION,
  BUSINESS_STORAGE_VERSION,
  PERSON_STORAGE_VERSION,
  ACHIEVEMENTS_STORAGE_VERSION,
  ACHIEVEMENT_STATS_VERSION,
  type AchievementStats,
} from "../types";
import { isBuiltInCategory, DEFAULT_CATEGORY_ICON } from "../data/categoryIcons";
import {
  DEFAULT_CUSTOM_CATEGORY_BUCKET,
  isBudgetBucket,
} from "../data/categoryBuckets";
import { generateUUID } from "./uuid";
import { isCurrencyPreferenceId } from "./currencyPreferences";
import {
  parseMonthStartBalances,
  type MonthStartBalanceMap,
} from "./cashFlow";
import {
  ENCRYPTED_EXPORT_PREFIX,
  ENCRYPTED_EXPORT_PREFIX_V2,
} from "./exportData";
import {
  ENCRYPTED_EXPORT_PREFIX_V3,
  decryptExportEnvelopeV3,
} from "./exportEncryption";
import {
  isObject,
  isValidDateValue,
  isSafeText,
  isDebtItem,
  isPaymentItem,
  isBudgetEntryItem,
  explainBudgetEntryProblem,
  isBudgetLimitItem,
  isSavingsGoalItem,
  isAssetAccountItem,
  isHoldingItem,
  isNetWorthSnapshotItem,
  isCustomCategoryItem,
  isBusinessItem,
  isPersonItem,
  isValidImportCategory,
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
  HOLDINGS: "@budgetark_holdings",
  DEBT_MILESTONES: "@budgetark_debt_milestones",
  PAYOFF_STRATEGY: "@budgetark_payoff_strategy",
  NET_WORTH_SNAPSHOTS: "@budgetark_net_worth_snapshots",
  CUSTOM_CATEGORIES: "@budgetark_custom_categories",
  BUSINESSES: "@budgetark_businesses",
  PEOPLE: "@budgetark_people",
  CATEGORY_BUCKET_OVERRIDES: "@budgetark_category_bucket_overrides",
  ACHIEVEMENTS: "@budgetark_achievements",
  ACHIEVEMENT_STATS: "@budgetark_achievement_stats",
  MONTH_START_BALANCES: "@budgetark_month_start_balances",
  DEBT_DUE_DISMISSALS: "@budgetark_debt_due_dismissals",
  CARD_KEEP_ALIVE_DISMISSALS: "@budgetark_card_keepalive_dismissals",
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
    Array.isArray(data.holdings) ||
    isObject(data.debtMilestones) ||
    typeof data.payoffStrategy === "string" ||
    Array.isArray(data.netWorthSnapshots) ||
    Array.isArray(data.customCategories) ||
    Array.isArray(data.businesses) ||
    Array.isArray(data.people) ||
    isObject(data.categoryBucketOverrides) ||
    isObject(data.achievements) ||
    isObject(data.achievementStats) ||
    isObject(data.monthStartBalances) ||
    isObject(data.debtDueDismissals) ||
    isObject(data.cardKeepAliveDismissals);

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
  holdings?: unknown[];
  debtMilestones?: Record<string, unknown>;
  payoffStrategy?: unknown;
  payoffStrategyUpdatedAt?: unknown;
  netWorthSnapshots?: unknown[];
  customCategories?: unknown[];
  businesses?: unknown[];
  people?: unknown[];
  categoryBucketOverrides?: Record<string, unknown>;
  achievements?: Record<string, unknown>;
  achievementStats?: Record<string, unknown>;
  monthStartBalances?: Record<string, unknown>;
  debtDueDismissals?: Record<string, unknown>;
  cardKeepAliveDismissals?: Record<string, unknown>;
  user?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Sanitized shape of the achievements unlock store (mirrors UnlockedAchievements). */
interface SanitizedAchievements {
  unlocked: Record<string, number>;
  firstEvaluatedAt?: number;
  version: number;
}

interface SanitizedImportPayload {
  debts: Record<string, unknown>[];
  payments: Record<string, unknown>[];
  budgetEntries: Record<string, unknown>[];
  budgetLimits: Record<string, unknown>[];
  budgetLimitsByMonth?: Record<string, Record<string, unknown>[]>;
  savingsGoals: Record<string, unknown>[];
  assetAccounts: Record<string, unknown>[];
  holdings: Record<string, unknown>[];
  debtMilestones?: Record<string, unknown>;
  payoffStrategy?: "custom" | "avalanche" | "snowball";
  payoffStrategyUpdatedAt?: string;
  netWorthSnapshots: Record<string, unknown>[];
  customCategories: Record<string, unknown>[];
  businesses: Record<string, unknown>[];
  people: Record<string, unknown>[];
  categoryBucketOverrides?: Record<string, "needs" | "wants" | "savings">;
  achievements?: SanitizedAchievements;
  achievementStats?: AchievementStats;
  monthStartBalances?: MonthStartBalanceMap;
  debtDueDismissals?: Record<string, string>;
  cardKeepAliveDismissals?: Record<string, string>;
  user?: Record<string, unknown>;
}

export interface ImportResult {
  debts: number;
  payments: number;
  budgetEntries: number;
  budgetLimits: number;
  savingsGoals: number;
  assetAccounts: number;
  holdings: number;
  debtMilestones: boolean;
  payoffStrategy: boolean;
  netWorthSnapshots: number;
  customCategories: number;
  businesses: number;
  people: number;
  /** Number of days since the export was created, or undefined if no exportedAt timestamp */
  staleDays?: number;
}

/**
 * Limits exist to bound parse/merge memory on hostile or corrupt input, NOT
 * to police real usage - they must stay far above anything the app itself
 * can generate, or long-term users' own backups become unrestorable (a
 * couple of years at 2-3 entries/day used to blow the old 500 KB /
 * 2,000-item caps, discovered only at device-migration time).
 * MAX_RAW_CHARS is checked pre-decryption (base64 inflates ~33%);
 * MAX_JSON_CHARS bounds the decoded JSON before JSON.parse.
 */
const LIMITS = {
  MAX_RAW_CHARS: 12_000_000,
  MAX_JSON_CHARS: 8_000_000,
  MAX_COLLECTION_ITEMS: 20_000,
  MAX_TOTAL_ITEMS: 50_000,
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
      const firstInvalidIdx = value.findIndex((item) => !isBudgetLimitItem(item));
      throw new Error(
        `Import rejected: budget limits for ${monthKey} contain invalid ` +
          `records (first at item ${firstInvalidIdx + 1} of ${value.length}). ` +
          `Each limit needs a valid "category" and a numeric "monthlyLimit".`
      );
    }
    out[monthKey] = valid;
  }
  return Object.keys(out).length > 0 ? out : undefined;
};

const sanitizeCollection = (
  collection: unknown[] | undefined,
  label: string,
  validator: (item: unknown) => item is Record<string, unknown>,
  explain?: (item: unknown) => string
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
    // Point at the first offending record (1-based, in file order) - one bad
    // record rejects the whole collection, and hand-edited exports are
    // impossible to debug from a bare "contains invalid records".
    const invalidCount = collection.length - valid.length;
    const firstInvalidIdx = collection.findIndex((item) => !validator(item));
    let message =
      `Import rejected: ${label} contains ${invalidCount} invalid ` +
      `record${invalidCount === 1 ? "" : "s"} ` +
      `(first at item ${firstInvalidIdx + 1} of ${collection.length}).`;
    if (explain) {
      message += ` Problem: ${explain(collection[firstInvalidIdx])}`;
    }
    throw new Error(message);
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

const sanitizeCategoryBucketOverrides = (
  raw: unknown
): Record<string, "needs" | "wants" | "savings"> | undefined => {
  if (!isObject(raw)) return undefined;
  const out: Record<string, "needs" | "wants" | "savings"> = {};
  for (const [category, bucket] of Object.entries(raw)) {
    if (!isValidImportCategory(category)) continue;
    if (!isBudgetBucket(bucket)) continue;
    out[category] = bucket;
  }
  return Object.keys(out).length > 0 ? out : undefined;
};

/**
 * Achievements unlock map (`id → epoch-ms unlock time`). Invalid entries are
 * dropped rather than rejecting the whole payload - achievements are
 * cosmetic, and a corrupt badge entry must never block restoring the user's
 * financial data. Older exports without the field return undefined and the
 * key is left untouched.
 */
const sanitizeAchievements = (raw: unknown): SanitizedAchievements | undefined => {
  if (!isObject(raw) || !isObject(raw.unlocked)) return undefined;
  const unlocked: Record<string, number> = {};
  for (const [id, ts] of Object.entries(raw.unlocked)) {
    if (!isSafeText(id)) continue;
    if (typeof ts !== "number" || !Number.isFinite(ts)) continue;
    unlocked[id] = ts;
  }
  if (Object.keys(unlocked).length === 0) return undefined;
  const out: SanitizedAchievements = {
    unlocked,
    version: ACHIEVEMENTS_STORAGE_VERSION,
  };
  if (
    typeof raw.firstEvaluatedAt === "number" &&
    Number.isFinite(raw.firstEvaluatedAt)
  ) {
    out.firstEvaluatedAt = raw.firstEvaluatedAt;
  }
  return out;
};

/**
 * Achievement stats: a fixed set of monotonic counters plus the streak's
 * last-open day. Non-numeric / negative counters degrade to 0 instead of
 * rejecting - these back badges, not money, so a partially-corrupt stats
 * blob should still restore whatever counters survived.
 */
const sanitizeAchievementStats = (raw: unknown): AchievementStats | undefined => {
  if (!isObject(raw)) return undefined;
  const counter = (v: unknown): number =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
  return {
    exportCount: counter(raw.exportCount),
    monthlyReviewOpens: counter(raw.monthlyReviewOpens),
    appOpenStreak: counter(raw.appOpenStreak),
    longestAppOpenStreak: counter(raw.longestAppOpenStreak),
    lastAppOpenDay:
      typeof raw.lastAppOpenDay === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(raw.lastAppOpenDay)
        ? raw.lastAppOpenDay
        : null,
    version: ACHIEVEMENT_STATS_VERSION,
  };
};

/**
 * Debt due-day dismissals: `"<debtId>:<YYYY-MM>" → ISO dismissed-at`. Only
 * the key matters to the reminder engine (the value is bookkeeping), so
 * validation gates on key shape and a sane value string; bad pairs are
 * dropped, not fatal. Card keep-alive dismissals share the exact key shape
 * and reuse this sanitizer.
 */
const sanitizeDebtDueDismissals = (
  raw: unknown
): Record<string, string> | undefined => {
  if (!isObject(raw)) return undefined;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!isSafeText(key) || !/:\d{4}-\d{2}$/.test(key)) continue;
    if (!isSafeText(value, 40)) continue;
    out[key] = value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
};

const sanitizePayload = (data: ImportPayload): SanitizedImportPayload => {
  const debts = sanitizeCollection(data.debts, "debts", isDebtItem);
  const payments = sanitizeCollection(data.payments, "payments", isPaymentItem);
  const budgetEntries = sanitizeCollection(
    data.budgetEntries,
    "budget entries",
    isBudgetEntryItem,
    explainBudgetEntryProblem
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
  const holdings = sanitizeCollection(data.holdings, "holdings", isHoldingItem);
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
  const businesses = sanitizeCollection(
    data.businesses,
    "businesses",
    isBusinessItem
  );
  const people = sanitizeCollection(data.people, "people", isPersonItem);
  const debtMilestones = sanitizeDebtMilestones(data.debtMilestones);
  const payoffStrategy = sanitizePayoffStrategy(data.payoffStrategy);
  const payoffStrategyUpdatedAt = isValidDateValue(data.payoffStrategyUpdatedAt)
    ? data.payoffStrategyUpdatedAt
    : undefined;
  const categoryBucketOverrides = sanitizeCategoryBucketOverrides(
    data.categoryBucketOverrides
  );
  const achievements = sanitizeAchievements(data.achievements);
  const achievementStats = sanitizeAchievementStats(data.achievementStats);
  // Month-start balances: drop invalid entries individually (parse is
  // fail-closed per record) - one corrupt month must not block restoring
  // the user's financial data. Older exports without the field skip it.
  const monthStartBalancesParsed = parseMonthStartBalances(
    data.monthStartBalances
  );
  const monthStartBalances =
    Object.keys(monthStartBalancesParsed).length > 0
      ? monthStartBalancesParsed
      : undefined;
  const debtDueDismissals = sanitizeDebtDueDismissals(data.debtDueDismissals);
  const cardKeepAliveDismissals = sanitizeDebtDueDismissals(
    data.cardKeepAliveDismissals
  );
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
    holdings.length +
    netWorthSnapshots.length +
    customCategories.length +
    businesses.length +
    people.length;
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
    holdings,
    netWorthSnapshots,
    customCategories,
    businesses,
    people,
    categoryBucketOverrides,
    achievements,
    achievementStats,
    monthStartBalances,
    debtDueDismissals,
    cardKeepAliveDismissals,
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
 * (any format - v1 legacy, v2 PBKDF2, or v3 encrypt-then-MAC).
 */
export const isEncryptedExport = (raw: string): boolean => {
  const head = raw.trimStart();
  return (
    head.startsWith(ENCRYPTED_EXPORT_PREFIX_V3) ||
    head.startsWith(ENCRYPTED_EXPORT_PREFIX_V2) ||
    head.startsWith(ENCRYPTED_EXPORT_PREFIX)
  );
};

/**
 * Decrypts a v2 envelope: salt-hex "." iv-hex "." ciphertext-base64.
 * Native crypto with the same parameters the crypto-js implementation used
 * (PBKDF2-SHA256 250k / AES-256-CBC) - old exports decrypt unchanged, and
 * the 250k iterations now run async on a native thread instead of freezing
 * the UI. Golden fixtures in importData.test.ts pin the compatibility.
 */
const decryptV2Envelope = async (
  envelope: string,
  password: string
): Promise<string> => {
  const parts = envelope.split(".");
  if (parts.length !== 3) {
    throw new Error("Decryption failed. The encrypted export is malformed.");
  }
  const [saltHex, ivHex, ctB64] = parts;
  const key = await pbkdf2Sha256(password, hexToBytes(saltHex), 250_000, 32);
  return aesCbcDecryptFromBase64(ctB64, key, hexToBytes(ivHex));
};

export const importFromString = async (
  raw: string,
  mode: "merge" | "replace" = "merge",
  password?: string
): Promise<ImportResult> => {
  if (raw.length > LIMITS.MAX_RAW_CHARS) {
    throw new Error(
      "Import file is too large to be a BudgetArk export."
    );
  }

  /* 0. Decrypt if this is a password-encrypted export. v3 (current write
   * format) is encrypt-then-MAC and verifies integrity before decrypting;
   * v2 uses PBKDF2 + explicit salt/iv with no MAC; v1 uses CryptoJS's weak
   * default EVP_BytesToKey KDF. All three stay readable forever so old
   * backups never become unrestorable. */
  let jsonString = raw;
  const trimmed = raw.trimStart();
  if (trimmed.startsWith(ENCRYPTED_EXPORT_PREFIX_V3)) {
    if (!password) {
      throw new Error(
        "This export is password-encrypted. Please enter the password to decrypt it."
      );
    }
    // Throws its own precise message (wrong password / altered file) - the
    // MAC check makes those the only failure modes, so don't re-wrap it.
    jsonString = await decryptExportEnvelopeV3(
      trimmed.slice(ENCRYPTED_EXPORT_PREFIX_V3.length),
      password
    );
  } else if (trimmed.startsWith(ENCRYPTED_EXPORT_PREFIX_V2)) {
    if (!password) {
      throw new Error(
        "This export is password-encrypted. Please enter the password to decrypt it."
      );
    }
    const envelope = trimmed.slice(ENCRYPTED_EXPORT_PREFIX_V2.length);
    try {
      jsonString = await decryptV2Envelope(envelope, password);
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
    // Legacy v1: crypto-js's passphrase format (EVP_BytesToKey KDF), decrypted
    // via the native EVP-compatible helper. A wrong password surfaces as a
    // padding/parse throw.
    const ciphertext = trimmed.slice(ENCRYPTED_EXPORT_PREFIX.length);
    try {
      jsonString = decryptLegacyCryptoJsBlob(ciphertext, password);
    } catch {
      throw new Error("Decryption failed. The password may be incorrect.");
    }
    if (!jsonString) {
      throw new Error("Decryption failed. The password may be incorrect.");
    }
  }

  /* 1. Parse */
  if (jsonString.length > LIMITS.MAX_JSON_CHARS) {
    throw new Error("Import file is too large to be a BudgetArk export.");
  }
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
  if (isObject(data) && typeof data.exportedAt === "string") {
    const exportedMs = Date.parse(data.exportedAt);
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
    holdings: 0,
    debtMilestones: false,
    payoffStrategy: false,
    netWorthSnapshots: 0,
    customCategories: 0,
    businesses: 0,
    people: 0,
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
    incoming: unknown[] | undefined,
    // Optional hook to reconcile an incoming record with the local one it
    // replaces (merge mode only). Used for budget entries to preserve
    // device-local attachment metadata and the isPrivate partner-sync flag
    // - see reconcileBudgetEntry.
    reconcile?: (
      incoming: Record<string, unknown>,
      existing: Record<string, unknown>
    ) => Record<string, unknown>
  ): Promise<{ json: string; count: number } | null> => {
    if (!incoming || incoming.length === 0) return null;

    if (mode === "replace") {
      return { json: JSON.stringify(incoming), count: incoming.length };
    }

    const existingRaw = await EncryptedStorage.getItem(storageKey);
    let existing: Record<string, unknown>[] = [];
    if (existingRaw) {
      try {
        const parsed: unknown = JSON.parse(existingRaw);
        if (Array.isArray(parsed)) existing = parsed;
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
      if (isObject(item) && typeof item.id === "string") {
        indexById.set(item.id, idx);
      }
    });

    let touched = 0;
    for (const rawItem of incoming) {
      // Narrow, don't assert: sanitizePayload validated these, but this
      // merge is the last stop before storage - rule 15 says check anyway.
      if (!isObject(rawItem)) continue;
      const item = rawItem;
      const id = typeof item.id === "string" && item.id ? item.id : undefined;
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
        existing[existingIdx] = reconcile
          ? reconcile(item, existing[existingIdx])
          : item;
        touched++;
      }
    }

    return { json: JSON.stringify(existing), count: touched };
  };

  /**
   * Budget-entry reconcile hook, applied when the incoming record wins LWW:
   *
   *  - Attachments: metadata points at encrypted photo files that exist only
   *    on THIS device, and spreadsheet rows carry no attachments at all
   *    (there is no column). Without this, a merge-mode re-import of an
   *    unchanged entry (updatedAt tie goes to incoming) would replace it
   *    with an attachment-less copy - and the orphan sweep would then
   *    permanently delete the photo files. An import may therefore never
   *    REMOVE local attachment references; when the incoming record carries
   *    its own list (JSON exports do), the incoming list wins as usual.
   *
   *  - isPrivate: privacy is device-side intent, so an import may never
   *    silently CLEAR a locally-set flag - a partner's export (or a backup
   *    taken before the entry was marked private) carries the public copy,
   *    and letting it win verbatim would un-private the entry and resume
   *    syncing it. Content still merges by LWW as usual; only the flag
   *    sticks. Un-privating is a local UI action only. Mirrors the same
   *    rule in sync's applyIncomingDiff.
   */
  const reconcileBudgetEntry = (
    incoming: Record<string, unknown>,
    existing: Record<string, unknown>
  ): Record<string, unknown> => {
    let result = incoming;
    const incomingHasAttachments =
      Array.isArray(incoming.attachments) && incoming.attachments.length > 0;
    const existingAttachments = existing.attachments;
    if (
      !incomingHasAttachments &&
      Array.isArray(existingAttachments) &&
      existingAttachments.length > 0
    ) {
      result = { ...result, attachments: existingAttachments };
    }
    if (existing.isPrivate === true && result.isPrivate !== true) {
      result = { ...result, isPrivate: true };
    }
    return result;
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
        if (typeof limit.updatedAt !== "string" || !limit.updatedAt) {
          limit.updatedAt = importStampIso;
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

    // Same LWW-on-updatedAt rule as computeMergedById: merge is documented
    // as non-destructive, so a stale backup must not roll back a limit the
    // user edited since the export. Ties go to the incoming record since
    // the user explicitly chose to import.
    const tsOf = (record: Record<string, unknown> | undefined): number => {
      if (!record) return -Infinity;
      const raw = record.updatedAt;
      if (typeof raw !== "string") return 0;
      const t = Date.parse(raw);
      return Number.isFinite(t) ? t : 0;
    };

    let totalItems = 0;
    for (const [monthKey, incomingArr] of Object.entries(incomingMap)) {
      const existingForMonth = Array.isArray(existing[monthKey])
        ? existing[monthKey]
        : [];
      const existingCategories = new Set<string>();
      for (const it of existingForMonth) {
        if (isObject(it) && typeof it.category === "string" && it.category) {
          existingCategories.add(it.category);
        }
      }
      for (const item of incomingArr) {
        const cat =
          isObject(item) && typeof item.category === "string"
            ? item.category
            : undefined;
        if (cat && existingCategories.has(cat)) {
          const idx = existingForMonth.findIndex(
            (e) => isObject(e) && e.category === cat
          );
          if (idx >= 0 && tsOf(item) >= tsOf(existingForMonth[idx])) {
            existingForMonth[idx] = item;
          }
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
   *      built-in and aren't already defined - covers pre-feature backups
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
      const c = e.category;
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
        const c = l.category;
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
      if (isObject(c) && typeof c.id === "string") byId.set(c.id, c);
    }

    let touched = 0;

    // 1. Explicit imported definitions - LWW by id.
    for (const incoming of sanitized.customCategories) {
      // The validator guarantees a string id; skipping anything else is the
      // fail-closed reading, not a behavior change.
      const id = typeof incoming.id === "string" ? incoming.id : undefined;
      if (!id) continue;
      const existing = byId.get(id);
      if (!existing || tsOf(incoming.updatedAt) >= tsOf(existing.updatedAt)) {
        byId.set(id, incoming);
        touched++;
      }
    }

    // De-dupe by lowercased name (keep newest updatedAt) and drop any that
    // shadow a built-in category.
    const nameWinner = new Map<string, string>(); // lowerName -> id
    for (const [id, rec] of byId) {
      const name = rec.name;
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
        if (tsOf(rec.updatedAt) >= tsOf(prev.updatedAt)) {
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
        defaultBucket: DEFAULT_CUSTOM_CATEGORY_BUCKET,
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

  const parseTimestamp = (value: unknown): number => {
    if (typeof value !== "string") return 0;
    const t = Date.parse(value);
    return Number.isFinite(t) ? t : 0;
  };

  /**
   * Businesses live in a `{businesses, version}` store (not a bare array),
   * so computeMergedById can't be reused directly. Same LWW-by-id semantics:
   * a tombstoned business survives a stale import, a newer import wins.
   * Tombstones ride along so a restore can't resurrect a deleted business.
   */
  const computeMergedBusinesses = async (): Promise<{
    json: string;
    count: number;
  } | null> => {
    if (sanitized.businesses.length === 0) return null;
    const wrap = (arr: Record<string, unknown>[]): string =>
      JSON.stringify({ businesses: arr, version: BUSINESS_STORAGE_VERSION });

    if (mode === "replace") {
      return {
        json: wrap(sanitized.businesses),
        count: sanitized.businesses.length,
      };
    }

    let existing: Record<string, unknown>[] = [];
    const existingRaw = await EncryptedStorage.getItem(KEYS.BUSINESSES);
    if (existingRaw) {
      try {
        const parsed = JSON.parse(existingRaw);
        if (Array.isArray(parsed?.businesses)) existing = parsed.businesses;
      } catch {
        existing = [];
      }
    }

    const indexById = new Map<string, number>();
    existing.forEach((item, idx) => {
      if (isObject(item) && typeof item.id === "string") {
        indexById.set(item.id, idx);
      }
    });

    let touched = 0;
    for (const item of sanitized.businesses) {
      const id = typeof item.id === "string" ? item.id : undefined;
      if (!id) continue;
      const existingIdx = indexById.get(id);
      if (existingIdx === undefined) {
        existing.push(item);
        indexById.set(id, existing.length - 1);
        touched++;
        continue;
      }
      if (
        parseTimestamp(item.updatedAt) >=
        parseTimestamp(existing[existingIdx].updatedAt)
      ) {
        existing[existingIdx] = item;
        touched++;
      }
    }

    return { json: wrap(existing), count: touched };
  };

  /**
   * People mirror businesses exactly: `{people, version}` envelope, LWW by
   * id, tombstones ride along so a restore can't resurrect a deleted person.
   */
  const computeMergedPeople = async (): Promise<{
    json: string;
    count: number;
  } | null> => {
    if (sanitized.people.length === 0) return null;
    const wrap = (arr: Record<string, unknown>[]): string =>
      JSON.stringify({ people: arr, version: PERSON_STORAGE_VERSION });

    if (mode === "replace") {
      return {
        json: wrap(sanitized.people),
        count: sanitized.people.length,
      };
    }

    let existing: Record<string, unknown>[] = [];
    const existingRaw = await EncryptedStorage.getItem(KEYS.PEOPLE);
    if (existingRaw) {
      try {
        const parsed = JSON.parse(existingRaw);
        if (Array.isArray(parsed?.people)) existing = parsed.people;
      } catch {
        existing = [];
      }
    }

    const indexById = new Map<string, number>();
    existing.forEach((item, idx) => {
      if (isObject(item) && typeof item.id === "string") {
        indexById.set(item.id, idx);
      }
    });

    let touched = 0;
    for (const item of sanitized.people) {
      const id = typeof item.id === "string" ? item.id : undefined;
      if (!id) continue;
      const existingIdx = indexById.get(id);
      if (existingIdx === undefined) {
        existing.push(item);
        indexById.set(id, existing.length - 1);
        touched++;
        continue;
      }
      if (
        parseTimestamp(item.updatedAt) >=
        parseTimestamp(existing[existingIdx].updatedAt)
      ) {
        existing[existingIdx] = item;
        touched++;
      }
    }

    return { json: wrap(existing), count: touched };
  };

  /**
   * Net-worth snapshots: replace mode takes the import verbatim; merge mode
   * unions by dayKey, keeping whichever side captured that day later. Merge
   * must never lose local-only days - importing an old backup in Merge mode
   * used to overwrite the whole array, silently erasing every snapshot
   * captured since the backup was taken.
   */
  const computeMergedSnapshots = async (): Promise<{
    json: string;
    count: number;
  } | null> => {
    if (sanitized.netWorthSnapshots.length === 0) return null;
    if (mode === "replace") {
      return {
        json: JSON.stringify(sanitized.netWorthSnapshots),
        count: sanitized.netWorthSnapshots.length,
      };
    }
    let existing: Record<string, unknown>[] = [];
    const existingRaw = await EncryptedStorage.getItem(KEYS.NET_WORTH_SNAPSHOTS);
    if (existingRaw) {
      try {
        const parsed = JSON.parse(existingRaw);
        if (Array.isArray(parsed)) existing = parsed;
      } catch {
        existing = [];
      }
    }
    const byDay = new Map<string, Record<string, unknown>>();
    for (const snap of existing) {
      if (isObject(snap) && typeof snap.dayKey === "string") {
        byDay.set(snap.dayKey, snap);
      }
    }
    for (const snap of sanitized.netWorthSnapshots) {
      const day = typeof snap.dayKey === "string" ? snap.dayKey : undefined;
      if (!day) continue;
      const prev = byDay.get(day);
      if (
        !prev ||
        parseTimestamp(snap.capturedAt) >= parseTimestamp(prev.capturedAt)
      ) {
        byDay.set(day, snap);
      }
    }
    const merged = Array.from(byDay.values()).sort((a, b) =>
      String(a.dayKey).localeCompare(String(b.dayKey))
    );
    return { json: JSON.stringify(merged), count: sanitized.netWorthSnapshots.length };
  };

  /**
   * Bucket overrides have no per-key timestamps, so merge mode is key-wise:
   * imported keys win, local-only keys survive. Replace mode is verbatim.
   */
  const computeMergedBucketOverrides = async (): Promise<{ json: string } | null> => {
    if (!sanitized.categoryBucketOverrides) return null;
    if (mode === "replace") {
      return { json: JSON.stringify(sanitized.categoryBucketOverrides) };
    }
    let existing: Record<string, unknown> = {};
    const existingRaw = await EncryptedStorage.getItem(
      KEYS.CATEGORY_BUCKET_OVERRIDES
    );
    if (existingRaw) {
      try {
        const parsed = JSON.parse(existingRaw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          existing = parsed as Record<string, unknown>;
        }
      } catch {
        existing = {};
      }
    }
    return {
      json: JSON.stringify({ ...existing, ...sanitized.categoryBucketOverrides }),
    };
  };

  /**
   * Achievements: merge is a union keeping the EARLIEST unlock timestamp per
   * id - an unlock is a historical fact, and re-importing a backup must not
   * move "first unlocked" forward (or re-trigger celebration popups for
   * badges the user already has). Replace mode takes the import verbatim.
   */
  const computeMergedAchievements = async (): Promise<{ json: string } | null> => {
    if (!sanitized.achievements) return null;
    if (mode === "replace") {
      return { json: JSON.stringify(sanitized.achievements) };
    }
    let existingUnlocked: Record<string, unknown> = {};
    let existingFirstEvaluatedAt: unknown;
    const existingRaw = await EncryptedStorage.getItem(KEYS.ACHIEVEMENTS);
    if (existingRaw) {
      try {
        const parsed = JSON.parse(existingRaw);
        if (isObject(parsed)) {
          if (isObject(parsed.unlocked)) existingUnlocked = parsed.unlocked;
          existingFirstEvaluatedAt = parsed.firstEvaluatedAt;
        }
      } catch {
        existingUnlocked = {};
      }
    }
    const unlocked: Record<string, number> = {};
    const keepEarliest = (id: string, ts: unknown) => {
      if (typeof ts !== "number" || !Number.isFinite(ts)) return;
      const prev = unlocked[id];
      unlocked[id] = prev === undefined ? ts : Math.min(prev, ts);
    };
    for (const [id, ts] of Object.entries(existingUnlocked)) keepEarliest(id, ts);
    for (const [id, ts] of Object.entries(sanitized.achievements.unlocked)) {
      keepEarliest(id, ts);
    }
    // Earliest firstEvaluatedAt for the same reason: it suppresses
    // celebrations for retroactive unlocks, so the older epoch is the truth.
    const evaluatedCandidates = [
      existingFirstEvaluatedAt,
      sanitized.achievements.firstEvaluatedAt,
    ].filter(
      (v): v is number => typeof v === "number" && Number.isFinite(v)
    );
    const merged: SanitizedAchievements = {
      unlocked,
      version: ACHIEVEMENTS_STORAGE_VERSION,
    };
    if (evaluatedCandidates.length > 0) {
      merged.firstEvaluatedAt = Math.min(...evaluatedCandidates);
    }
    return { json: JSON.stringify(merged) };
  };

  /**
   * Achievement stats are monotonic counters / streak bests, so merge takes
   * the max of each side - whichever device counted higher reflects more
   * real activity, and summing would double-count the shared history.
   * `lastAppOpenDay` takes the later day so the streak recorder doesn't
   * re-count today; a max streak paired with the other side's day can
   * over-credit by at most one open, which self-corrects on the next gap.
   * Replace mode takes the import verbatim.
   */
  const computeMergedAchievementStats = async (): Promise<{ json: string } | null> => {
    const incoming = sanitized.achievementStats;
    if (!incoming) return null;
    if (mode === "replace") {
      return { json: JSON.stringify(incoming) };
    }
    let local: AchievementStats | undefined;
    const existingRaw = await EncryptedStorage.getItem(KEYS.ACHIEVEMENT_STATS);
    if (existingRaw) {
      try {
        local = sanitizeAchievementStats(JSON.parse(existingRaw));
      } catch {
        local = undefined;
      }
    }
    if (!local) return { json: JSON.stringify(incoming) };
    // YYYY-MM-DD compares correctly as a string.
    const lastAppOpenDay =
      local.lastAppOpenDay && incoming.lastAppOpenDay
        ? local.lastAppOpenDay >= incoming.lastAppOpenDay
          ? local.lastAppOpenDay
          : incoming.lastAppOpenDay
        : local.lastAppOpenDay ?? incoming.lastAppOpenDay;
    const merged: AchievementStats = {
      exportCount: Math.max(local.exportCount, incoming.exportCount),
      monthlyReviewOpens: Math.max(
        local.monthlyReviewOpens,
        incoming.monthlyReviewOpens
      ),
      appOpenStreak: Math.max(local.appOpenStreak, incoming.appOpenStreak),
      longestAppOpenStreak: Math.max(
        local.longestAppOpenStreak,
        incoming.longestAppOpenStreak
      ),
      lastAppOpenDay,
      version: ACHIEVEMENT_STATS_VERSION,
    };
    return { json: JSON.stringify(merged) };
  };

  /**
   * Month-start balances: merge is per-month LWW on updatedAt, mirroring
   * the sync merge in diffEngine - with ties going to the incoming record
   * since the user explicitly chose to import (same tie rule as every
   * other collection here). Local-only months always survive a merge.
   * Replace mode takes the import verbatim.
   */
  const computeMergedMonthStartBalances = async (): Promise<{
    json: string;
  } | null> => {
    const incoming = sanitized.monthStartBalances;
    if (!incoming) return null;
    if (mode === "replace") {
      return { json: JSON.stringify(incoming) };
    }
    let existing: MonthStartBalanceMap = {};
    const existingRaw = await EncryptedStorage.getItem(
      KEYS.MONTH_START_BALANCES
    );
    if (existingRaw) {
      try {
        existing = parseMonthStartBalances(JSON.parse(existingRaw));
      } catch {
        existing = {};
      }
    }
    const merged: MonthStartBalanceMap = { ...existing };
    for (const [monthKey, record] of Object.entries(incoming)) {
      const local = merged[monthKey];
      if (!local || parseTimestamp(record.updatedAt) >= parseTimestamp(local.updatedAt)) {
        merged[monthKey] = record;
      }
    }
    return { json: JSON.stringify(merged) };
  };

  /**
   * Dismissals (debt due-day + card keep-alive) are idempotent facts ("user
   * said 'not yet' for this debt+month on some device"), so merge is a
   * key-wise union. The value is only a dismissed-at bookkeeping stamp -
   * either side's is fine; imported wins on conflict for consistency with
   * the bucket-override merge. Replace mode takes the import verbatim.
   */
  const computeMergedDismissalMap = async (
    imported: Record<string, string> | undefined,
    storageKey: string
  ): Promise<{ json: string } | null> => {
    if (!imported) return null;
    if (mode === "replace") {
      return { json: JSON.stringify(imported) };
    }
    let existing: Record<string, unknown> = {};
    const existingRaw = await EncryptedStorage.getItem(storageKey);
    if (existingRaw) {
      try {
        const parsed = JSON.parse(existingRaw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          existing = parsed as Record<string, unknown>;
        }
      } catch {
        existing = {};
      }
    }
    return {
      json: JSON.stringify({ ...existing, ...imported }),
    };
  };

  const computeMergedDueDismissals = () =>
    computeMergedDismissalMap(
      sanitized.debtDueDismissals,
      KEYS.DEBT_DUE_DISMISSALS
    );

  const computeMergedKeepAliveDismissals = () =>
    computeMergedDismissalMap(
      sanitized.cardKeepAliveDismissals,
      KEYS.CARD_KEEP_ALIVE_DISMISSALS
    );

  /**
   * Singleton LWW gate for merge mode: write the imported value only when
   * it's at least as new as what's on the device. Replace mode always
   * writes. Imports without a timestamp (older export formats) lose to any
   * existing local value - merge is documented as non-destructive, so a
   * stale backup must not roll back newer local edits.
   */
  const importedSingletonWins = async (
    storageKey: string,
    incomingUpdatedAt: unknown,
    readLocalUpdatedAt: (raw: string) => unknown
  ): Promise<boolean> => {
    if (mode === "replace") return true;
    const existingRaw = await EncryptedStorage.getItem(storageKey);
    if (!existingRaw) return true;
    let localUpdatedAt: unknown;
    try {
      localUpdatedAt = readLocalUpdatedAt(existingRaw);
    } catch {
      localUpdatedAt = undefined;
    }
    return parseTimestamp(incomingUpdatedAt) >= parseTimestamp(localUpdatedAt);
  };

  // Phase 1: Compute all merged results in memory
  const mergedDebts = await computeMergedById(KEYS.DEBTS, sanitized.debts);
  const mergedPayments = await computeMergedById(KEYS.PAYMENTS, sanitized.payments);
  const mergedBudgetEntries = await computeMergedById(
    KEYS.BUDGET_ENTRIES,
    sanitized.budgetEntries,
    reconcileBudgetEntry
  );
  const mergedLimits = await computeMergedLimitsHistory();
  const mergedSavingsGoals = await computeMergedById(
    KEYS.SAVINGS_GOALS,
    sanitized.savingsGoals
  );
  const mergedAssetAccounts = await computeMergedById(
    KEYS.ASSET_ACCOUNTS,
    sanitized.assetAccounts
  );
  const mergedHoldings = await computeMergedById(
    KEYS.HOLDINGS,
    sanitized.holdings
  );
  const mergedSnapshots = await computeMergedSnapshots();
  const mergedCustomCategories = await computeMergedCustomCategories();
  const mergedBusinesses = await computeMergedBusinesses();
  const mergedPeople = await computeMergedPeople();
  const mergedCategoryBucketOverrides = await computeMergedBucketOverrides();
  const mergedAchievements = await computeMergedAchievements();
  const mergedAchievementStats = await computeMergedAchievementStats();
  const mergedMonthStartBalances = await computeMergedMonthStartBalances();
  const mergedDueDismissals = await computeMergedDueDismissals();
  const mergedKeepAliveDismissals = await computeMergedKeepAliveDismissals();

  // Phase 2: Write to temp keys first
  const TEMP_SUFFIX = "_import_tmp";
  const tempKeys: string[] = [];
  const tempWrites: [string, string][] = [];

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
  if (mergedHoldings) {
    tempWrites.push([KEYS.HOLDINGS + TEMP_SUFFIX, mergedHoldings.json]);
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
  if (mergedBusinesses) {
    tempWrites.push([KEYS.BUSINESSES + TEMP_SUFFIX, mergedBusinesses.json]);
  }
  if (mergedPeople) {
    tempWrites.push([KEYS.PEOPLE + TEMP_SUFFIX, mergedPeople.json]);
  }
  if (mergedCategoryBucketOverrides) {
    tempWrites.push([
      KEYS.CATEGORY_BUCKET_OVERRIDES + TEMP_SUFFIX,
      mergedCategoryBucketOverrides.json,
    ]);
  }
  if (mergedAchievements) {
    tempWrites.push([KEYS.ACHIEVEMENTS + TEMP_SUFFIX, mergedAchievements.json]);
  }
  if (mergedAchievementStats) {
    tempWrites.push([
      KEYS.ACHIEVEMENT_STATS + TEMP_SUFFIX,
      mergedAchievementStats.json,
    ]);
  }
  if (mergedMonthStartBalances) {
    tempWrites.push([
      KEYS.MONTH_START_BALANCES + TEMP_SUFFIX,
      mergedMonthStartBalances.json,
    ]);
  }
  if (mergedDueDismissals) {
    tempWrites.push([
      KEYS.DEBT_DUE_DISMISSALS + TEMP_SUFFIX,
      mergedDueDismissals.json,
    ]);
  }
  if (mergedKeepAliveDismissals) {
    tempWrites.push([
      KEYS.CARD_KEEP_ALIVE_DISMISSALS + TEMP_SUFFIX,
      mergedKeepAliveDismissals.json,
    ]);
  }
  if (
    sanitized.debtMilestones &&
    (await importedSingletonWins(
      KEYS.DEBT_MILESTONES,
      (sanitized.debtMilestones as Record<string, unknown>).updatedAt,
      (raw) => (JSON.parse(raw) as Record<string, unknown>)?.updatedAt
    ))
  ) {
    tempWrites.push([
      KEYS.DEBT_MILESTONES + TEMP_SUFFIX,
      JSON.stringify(sanitized.debtMilestones),
    ]);
  }
  if (
    sanitized.payoffStrategy &&
    (await importedSingletonWins(
      KEYS.PAYOFF_STRATEGY,
      sanitized.payoffStrategyUpdatedAt,
      // Local value may be a legacy bare string (JSON.parse throws -> treated
      // as no timestamp) or the {value, updatedAt} envelope.
      (raw) => (JSON.parse(raw) as Record<string, unknown>)?.updatedAt
    ))
  ) {
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

  // Write all temp keys. This loop sits before the promote-phase try/rollback,
  // so a mid-loop failure (storage full, quota) used to strand every
  // already-written *_import_tmp key in storage forever. Best-effort cleanup
  // here; the cleanup itself must not mask the original failure.
  try {
    for (const [key, value] of tempWrites) {
      await EncryptedStorage.setItem(key, value);
      tempKeys.push(key);
    }
  } catch (error) {
    if (tempKeys.length > 0) {
      await EncryptedStorage.multiRemove(tempKeys).catch(() => {});
    }
    throw error;
  }

  // Phase 3: Promote temp keys to real keys; rollback on failure
  // Back up originals first so we can restore them if the write loop fails
  const backups: [string, string | null][] = [];
  try {
    if (mode === "replace") {
      // Replace means "replace what the file carries", not "wipe the device".
      // Only clear keys the sanitized payload actually has data for - a
      // spreadsheet-sourced import arrives with budget collections only
      // (CSV: just entries), so unconditionally clearing every key turned a
      // CSV restore into silent destruction of net-worth history, milestones,
      // achievements, and every other section the source format can't carry.
      const keysToRemove: string[] = [];
      if (sanitized.debts.length > 0) keysToRemove.push(KEYS.DEBTS);
      if (sanitized.payments.length > 0) keysToRemove.push(KEYS.PAYMENTS);
      if (sanitized.budgetEntries.length > 0) {
        keysToRemove.push(KEYS.BUDGET_ENTRIES);
      }
      if (mergedLimits) keysToRemove.push(KEYS.BUDGET_LIMITS);
      if (sanitized.savingsGoals.length > 0) keysToRemove.push(KEYS.SAVINGS_GOALS);
      if (sanitized.assetAccounts.length > 0) {
        keysToRemove.push(KEYS.ASSET_ACCOUNTS);
      }
      if (sanitized.holdings.length > 0) keysToRemove.push(KEYS.HOLDINGS);
      if (sanitized.debtMilestones) keysToRemove.push(KEYS.DEBT_MILESTONES);
      if (sanitized.payoffStrategy) keysToRemove.push(KEYS.PAYOFF_STRATEGY);
      if (sanitized.netWorthSnapshots.length > 0) {
        keysToRemove.push(KEYS.NET_WORTH_SNAPSHOTS);
      }
      // Custom categories may be carried implicitly (entries/limits that
      // reference a non-built-in name), so gate on the merged result, which
      // already accounts for both sources.
      if (mergedCustomCategories) keysToRemove.push(KEYS.CUSTOM_CATEGORIES);
      if (sanitized.businesses.length > 0) keysToRemove.push(KEYS.BUSINESSES);
      if (sanitized.people.length > 0) keysToRemove.push(KEYS.PEOPLE);
      if (sanitized.categoryBucketOverrides) {
        keysToRemove.push(KEYS.CATEGORY_BUCKET_OVERRIDES);
      }
      if (sanitized.achievements) keysToRemove.push(KEYS.ACHIEVEMENTS);
      if (sanitized.achievementStats) keysToRemove.push(KEYS.ACHIEVEMENT_STATS);
      if (sanitized.monthStartBalances) {
        keysToRemove.push(KEYS.MONTH_START_BALANCES);
      }
      if (sanitized.debtDueDismissals) {
        keysToRemove.push(KEYS.DEBT_DUE_DISMISSALS);
      }
      if (sanitized.cardKeepAliveDismissals) {
        keysToRemove.push(KEYS.CARD_KEEP_ALIVE_DISMISSALS);
      }
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
    counts.holdings = mergedHoldings?.count ?? 0;
    counts.netWorthSnapshots = mergedSnapshots?.count ?? 0;
    counts.customCategories = mergedCustomCategories?.count ?? 0;
    counts.businesses = mergedBusinesses?.count ?? 0;
    counts.people = mergedPeople?.count ?? 0;
    counts.debtMilestones = !!sanitized.debtMilestones;
    counts.payoffStrategy = !!sanitized.payoffStrategy;
  } catch {
    // Rollback: restore original values, then clean up temp keys.
    // We use `allSettled` and collect failures rather than awaiting each
    // restore in sequence - if a restore itself times out, the original
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
          `Some records may be in an inconsistent state - please reinstall ` +
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
 * Wraps DocumentPicker.getDocumentAsync to translate its "Different document
 * picking in progress" rejection into actionable guidance. The module gets
 * stuck in that state when a previous presentation silently failed (e.g. the
 * picker was launched while a modal was still dismissing) - the pending
 * promise never settles, so only an app restart clears the flag.
 */
export const openDocumentPicker = async (
  options: DocumentPicker.DocumentPickerOptions
): Promise<DocumentPicker.DocumentPickerResult> => {
  try {
    return await DocumentPicker.getDocumentAsync(options);
  } catch (error: any) {
    if (
      typeof error?.message === "string" &&
      error.message.includes("Different document picking in progress")
    ) {
      throw new Error(
        "The file picker is stuck from an earlier attempt. Please fully close and reopen the app, then try again."
      );
    }
    throw error;
  }
};

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
  const result = await openDocumentPicker({
    type: ["application/json", "text/plain"],
  });

  if (result.canceled) return null;

  const file = result.assets[0];
  if (!file?.uri) throw new Error("No file selected.");

  const raw = await new ExpoFile(file.uri).text();
  return importFromString(raw, mode, password);
};

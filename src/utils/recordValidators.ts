/**
 * BudgetArk - Shared Record Validators
 * File: src/utils/recordValidators.ts
 *
 * Per-record shape/range validators reused by the JSON import path
 * (src/utils/importData.ts) and the LAN-sync receive path
 * (src/sync/diffEngine.ts). Both paths cross a trust boundary into
 * persistent storage, so they share the same gate.
 */

import { ASSET_ACCOUNT_CATEGORIES, BUDGET_CATEGORIES } from "../types";
import { sanitizeTextInput } from "./sanitize";
import { isAcceptablePaymentUrl } from "./paymentUrl";

export const VALIDATOR_LIMITS = {
  MAX_TEXT_LENGTH: 120,
  MAX_DESCRIPTION_LENGTH: 220,
  MAX_MONEY: 1_000_000_000,
  MAX_RATE: 200,
} as const;

export const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

export const isValidDateValue = (value: unknown): value is string =>
  typeof value === "string" && !Number.isNaN(Date.parse(value));

export const isSafeText = (
  value: unknown,
  maxLength: number = VALIDATOR_LIMITS.MAX_TEXT_LENGTH
): value is string =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  value.length <= maxLength;

export const isSafeNumber = (
  value: unknown,
  {
    min = 0,
    max = VALIDATOR_LIMITS.MAX_MONEY,
  }: { min?: number; max?: number } = {}
): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= min &&
  value <= max;

const VALID_CATEGORIES = new Set<string>(BUDGET_CATEGORIES);

/**
 * Max custom-category name length accepted on import / sync. Mirrors
 * MAX_CATEGORY_NAME_LENGTH in customCategoriesStorage.ts - kept as a local
 * literal so this module stays free of storage-layer imports (it's also on
 * the LAN-sync receive path, which must not pull in EncryptedStorage).
 */
export const MAX_IMPORTED_CATEGORY_NAME_LENGTH = 24;

/**
 * A category reference is valid if it's a built-in name OR a safe
 * user-defined custom name: a non-empty string with no control/null bytes
 * (equal to its sanitized form) within the custom-name length cap. This
 * keeps import/sync backward compatible - built-ins still pass unchanged -
 * while letting custom-category entries/limits through the same bounded
 * gate instead of being rejected at the trust boundary.
 */
export const isValidImportCategory = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  if (VALID_CATEGORIES.has(value)) return true;
  if (value !== sanitizeTextInput(value)) return false;
  const trimmed = value.trim();
  return (
    trimmed.length > 0 &&
    trimmed.length <= MAX_IMPORTED_CATEGORY_NAME_LENGTH
  );
};

/**
 * For the spreadsheet importer: returns the category string if acceptable
 * (built-in or safe custom), else null so the row is skipped - same gate
 * as the JSON path, just non-throwing.
 */
export const normalizeImportCategory = (raw: string): string | null =>
  isValidImportCategory(raw) ? raw : null;

/**
 * Categories where the app legitimately writes negative-amount entries
 * (e.g. lowering a tracked savings reserve via Build Your Ark generates a
 * correction entry with amount = newTotal - oldTotal, which can be negative).
 */
export const NEGATIVE_AMOUNT_CATEGORIES = new Set<string>([
  "Savings",
  "Retirement",
  "Investing",
]);

/**
 * Tombstone marker validator. Records carrying a `deletedAt` field MUST
 * have it as a parseable ISO date - otherwise the on-read tombstone GC
 * (`purgeExpiredTombstones`) can't compute an age and the tombstone never
 * expires, polluting storage forever. Allowed because a malicious peer
 * could send `deletedAt: "garbage"` past the rest of the validator gate.
 */
const isOptionalIso = (value: unknown): boolean =>
  value === undefined || isValidDateValue(value);

export const isDebtItem = (item: unknown): item is Record<string, unknown> => {
  if (!isObject(item)) return false;
  return (
    isSafeText(item.id) &&
    isSafeText(item.name, 80) &&
    isSafeNumber(item.balance) &&
    isSafeNumber(item.originalBalance, { min: 0.01 }) &&
    isSafeNumber(item.rate, { min: 0, max: VALIDATOR_LIMITS.MAX_RATE }) &&
    isSafeNumber(item.minPayment) &&
    isValidDateValue(item.createdAt) &&
    isOptionalIso(item.updatedAt) &&
    isOptionalIso(item.deletedAt) &&
    (item.paymentDueDay === undefined ||
      (typeof item.paymentDueDay === "number" &&
        Number.isInteger(item.paymentDueDay) &&
        item.paymentDueDay >= 1 &&
        item.paymentDueDay <= 31))
  );
};

export const isPaymentItem = (
  item: unknown
): item is Record<string, unknown> => {
  if (!isObject(item)) return false;
  return (
    isSafeText(item.id) &&
    isSafeText(item.debtId) &&
    isSafeNumber(item.amount, { min: 0.01 }) &&
    isValidDateValue(item.date) &&
    isOptionalIso(item.updatedAt) &&
    isOptionalIso(item.deletedAt)
  );
};

export const isBudgetEntryItem = (
  item: unknown
): item is Record<string, unknown> => {
  if (!isObject(item)) return false;
  const typeValid = item.type === "income" || item.type === "expense";
  const categoryValid = isValidImportCategory(item.category);
  const descriptionValid =
    item.description === undefined ||
    (typeof item.description === "string" &&
      item.description.length <= VALIDATOR_LIMITS.MAX_DESCRIPTION_LENGTH);

  const allowsNegative =
    typeof item.category === "string" &&
    NEGATIVE_AMOUNT_CATEGORIES.has(item.category);
  const amountValid = allowsNegative
    ? isSafeNumber(item.amount, {
        min: -VALIDATOR_LIMITS.MAX_MONEY,
        max: VALIDATOR_LIMITS.MAX_MONEY,
      }) && Math.abs(item.amount as number) >= 0.01
    : isSafeNumber(item.amount, { min: 0.01 });

  const paymentUrlValid = isAcceptablePaymentUrl(item.paymentUrl);

  return (
    isSafeText(item.id) &&
    typeValid &&
    categoryValid &&
    amountValid &&
    descriptionValid &&
    paymentUrlValid &&
    isValidDateValue(item.date) &&
    isValidDateValue(item.createdAt) &&
    isOptionalIso(item.updatedAt) &&
    isOptionalIso(item.deletedAt)
  );
};

/**
 * Field-level diagnosis for a budget entry that failed isBudgetEntryItem.
 * The JSON import path rejects a whole collection over one bad record, so
 * "contains invalid records" alone leaves users hand-editing exports (the
 * most common source of bad entries) with nothing to fix. Checks run in the
 * same order as the validator; returns the first failing field's problem.
 * Must be kept in lockstep with isBudgetEntryItem.
 */
export const explainBudgetEntryProblem = (item: unknown): string => {
  if (!isObject(item)) return "the record is not a JSON object";
  if (!isSafeText(item.id)) {
    return item.id === undefined
      ? 'missing "id" (each entry needs a unique string id)'
      : '"id" must be a non-empty string';
  }
  if (item.type !== "income" && item.type !== "expense") {
    return '"type" must be exactly "income" or "expense"';
  }
  if (!isValidImportCategory(item.category)) {
    return `"category" must be a built-in category or a custom name up to ${MAX_IMPORTED_CATEGORY_NAME_LENGTH} characters`;
  }
  const allowsNegative =
    typeof item.category === "string" &&
    NEGATIVE_AMOUNT_CATEGORIES.has(item.category);
  const amountValid = allowsNegative
    ? isSafeNumber(item.amount, {
        min: -VALIDATOR_LIMITS.MAX_MONEY,
        max: VALIDATOR_LIMITS.MAX_MONEY,
      }) && Math.abs(item.amount as number) >= 0.01
    : isSafeNumber(item.amount, { min: 0.01 });
  if (!amountValid) {
    return typeof item.amount === "string"
      ? '"amount" must be a JSON number, not a quoted string (use 12.5, not "12.5")'
      : '"amount" must be a positive number of at least 0.01';
  }
  if (
    item.description !== undefined &&
    (typeof item.description !== "string" ||
      item.description.length > VALIDATOR_LIMITS.MAX_DESCRIPTION_LENGTH)
  ) {
    return `"description" must be a string of at most ${VALIDATOR_LIMITS.MAX_DESCRIPTION_LENGTH} characters`;
  }
  if (!isAcceptablePaymentUrl(item.paymentUrl)) {
    return '"paymentUrl" must be a valid https URL';
  }
  if (!isValidDateValue(item.date)) {
    return '"date" must be a parseable date string (e.g. "2026-06-12")';
  }
  if (!isValidDateValue(item.createdAt)) {
    return item.createdAt === undefined
      ? 'missing "createdAt" (an ISO date string like "2026-06-12T00:00:00.000Z")'
      : '"createdAt" must be a parseable date string';
  }
  if (!isOptionalIso(item.updatedAt)) {
    return '"updatedAt" must be a parseable date string when present';
  }
  if (!isOptionalIso(item.deletedAt)) {
    return '"deletedAt" must be a parseable date string when present';
  }
  return "the record has an unrecognized problem";
};

export const isBudgetLimitItem = (
  item: unknown
): item is Record<string, unknown> => {
  if (!isObject(item)) return false;
  return (
    isValidImportCategory(item.category) &&
    isSafeNumber(item.monthlyLimit, {
      min: 0.01,
      max: VALIDATOR_LIMITS.MAX_MONEY,
    }) &&
    (item.updatedAt === undefined || isValidDateValue(item.updatedAt))
  );
};

/**
 * A custom-category definition record (the export `customCategories`
 * collection). Name must be a safe custom name that does NOT shadow a
 * built-in; icon is a short non-empty glyph string (emoji ZWJ sequences
 * run a few code units, hence the small ceiling rather than length 1).
 */
export const isCustomCategoryItem = (
  item: unknown
): item is Record<string, unknown> => {
  if (!isObject(item)) return false;
  const defaultBucketValid =
    item.defaultBucket === undefined ||
    item.defaultBucket === "needs" ||
    item.defaultBucket === "wants" ||
    item.defaultBucket === "savings";
  return (
    isSafeText(item.id) &&
    typeof item.name === "string" &&
    !VALID_CATEGORIES.has(item.name) &&
    isValidImportCategory(item.name) &&
    typeof item.icon === "string" &&
    item.icon.length > 0 &&
    item.icon.length <= 8 &&
    defaultBucketValid &&
    isValidDateValue(item.createdAt) &&
    (item.updatedAt === undefined || isValidDateValue(item.updatedAt))
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

export const isSavingsGoalItem = (
  item: unknown
): item is Record<string, unknown> => {
  if (!isObject(item)) return false;
  return (
    isSafeText(item.id) &&
    isSafeText(item.name, 80) &&
    typeof item.category === "string" &&
    VALID_SAVINGS_GOAL_CATEGORIES.has(item.category) &&
    isSafeNumber(item.targetAmount, { min: 0.01 }) &&
    isSafeNumber(item.currentAmount, { min: 0 }) &&
    (item.targetDate === undefined || isValidDateValue(item.targetDate)) &&
    isValidDateValue(item.createdAt) &&
    isOptionalIso(item.updatedAt) &&
    isOptionalIso(item.deletedAt)
  );
};

const VALID_ASSET_ACCOUNT_CATEGORIES = new Set<string>(ASSET_ACCOUNT_CATEGORIES);

export const isAssetAccountItem = (
  item: unknown
): item is Record<string, unknown> => {
  if (!isObject(item)) return false;
  return (
    isSafeText(item.id) &&
    isSafeText(item.name, 80) &&
    typeof item.category === "string" &&
    VALID_ASSET_ACCOUNT_CATEGORIES.has(item.category) &&
    isSafeNumber(item.balance, { min: 0 }) &&
    isValidDateValue(item.createdAt) &&
    isOptionalIso(item.updatedAt) &&
    isOptionalIso(item.deletedAt)
  );
};

/**
 * A holding record, in one of three shapes (see `holdingKind` in holdingsMath):
 *   - ticker: a stock/ETF/crypto position. `symbol` is a short ticker (alnum
 *     plus `.`/`-` for class shares / indices, and `/` for crypto pairs like
 *     BTC/USD); `shares` is a positive number (fractional allowed).
 *   - proxy:  a 401k fund with no ticker that rides a proxy index. Carries a
 *     proxy `symbol`, a `name`, an `anchorValue`, and an `anchorPrice`.
 *   - manual: a fund with a fixed user-entered `manualValue` and a `name`; no
 *     ticker required.
 * `costBasis` (TOTAL invested) and `accountId` (link to an AssetAccount) are
 * optional in every shape. Same trust boundary as the other collections: a
 * semi-trusted peer could send arbitrary records.
 */
const HOLDING_SYMBOL_PATTERN = /^[a-zA-Z0-9./-]{1,15}$/;

export const isHoldingItem = (
  item: unknown
): item is Record<string, unknown> => {
  if (!isObject(item)) return false;

  // Fields common to every shape.
  if (
    !isSafeText(item.id) ||
    !(item.name === undefined || isSafeText(item.name)) ||
    !(item.costBasis === undefined || isSafeNumber(item.costBasis, { min: 0 })) ||
    !(item.accountId === undefined || isSafeText(item.accountId)) ||
    !isValidDateValue(item.createdAt) ||
    !isOptionalIso(item.updatedAt) ||
    !isOptionalIso(item.deletedAt)
  ) {
    return false;
  }

  // Proxy-tracked: a valid proxy ticker plus a named anchor (value + price).
  if (item.anchorValue !== undefined) {
    return (
      isSafeText(item.name) &&
      typeof item.symbol === "string" &&
      HOLDING_SYMBOL_PATTERN.test(item.symbol) &&
      isSafeNumber(item.anchorValue, { min: 0 }) &&
      isSafeNumber(item.anchorPrice, { min: 0 }) &&
      (item.anchorPrice as number) > 0
    );
  }

  // Manual fixed value: a named position with no ticker.
  if (item.manualValue !== undefined) {
    return isSafeText(item.name) && isSafeNumber(item.manualValue, { min: 0 });
  }

  // Plain ticker (the legacy shape).
  return (
    typeof item.symbol === "string" &&
    HOLDING_SYMBOL_PATTERN.test(item.symbol) &&
    isSafeNumber(item.shares, { min: 0 }) &&
    (item.shares as number) > 0
  );
};

export const isNetWorthSnapshotItem = (
  item: unknown
): item is Record<string, unknown> => {
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

export const VALID_PAYOFF_STRATEGIES = new Set([
  "custom",
  "avalanche",
  "snowball",
]);

export const sanitizePayoffStrategy = (
  raw: unknown
): "custom" | "avalanche" | "snowball" | undefined => {
  if (typeof raw !== "string") return undefined;
  return VALID_PAYOFF_STRATEGIES.has(raw)
    ? (raw as "custom" | "avalanche" | "snowball")
    : undefined;
};

/**
 * Loosely validates the imported debt milestone plan. The storage layer
 * (`debtMilestoneStorage.normalizePlan`) re-derives missing fields on read,
 * so we only need to confirm the basic shape is right.
 */
export const sanitizeDebtMilestones = (
  raw: unknown
): Record<string, unknown> | undefined => {
  if (!isObject(raw)) return undefined;
  if (!Array.isArray(raw.steps)) return undefined;
  return raw;
};

// Month must be 01-12: `\d{2}` accepted keys like "9999-99", and because
// budgetStorage's pruneLimitHistory keeps the lexicographically-LAST 13
// keys, one such corrupt key would permanently occupy a history slot and
// evict a real month on every limit save.
export const isMonthKey = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

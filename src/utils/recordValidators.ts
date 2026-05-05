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
 * have it as a parseable ISO date — otherwise the on-read tombstone GC
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
    isOptionalIso(item.deletedAt)
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
  const categoryValid =
    typeof item.category === "string" && VALID_CATEGORIES.has(item.category);
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

  return (
    isSafeText(item.id) &&
    typeValid &&
    categoryValid &&
    amountValid &&
    descriptionValid &&
    isValidDateValue(item.date) &&
    isValidDateValue(item.createdAt) &&
    isOptionalIso(item.updatedAt) &&
    isOptionalIso(item.deletedAt)
  );
};

export const isBudgetLimitItem = (
  item: unknown
): item is Record<string, unknown> => {
  if (!isObject(item)) return false;
  return (
    typeof item.category === "string" &&
    VALID_CATEGORIES.has(item.category) &&
    isSafeNumber(item.monthlyLimit, {
      min: 0.01,
      max: VALIDATOR_LIMITS.MAX_MONEY,
    }) &&
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

export const isMonthKey = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}$/.test(value);

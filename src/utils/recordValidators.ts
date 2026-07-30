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
import {
  KEEP_ALIVE_MAX_LEAD_DAYS,
  KEEP_ALIVE_MAX_WINDOW_MONTHS,
} from "./cardKeepAlive";

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
  value.length <= maxLength &&
  // Same control-char gate the category check below applies (and the
  // spreadsheet path's strip regex): imported/synced free text must equal
  // its sanitized form, so null bytes and control characters are rejected
  // at the trust boundary instead of landing in storage. Normal whitespace
  // (space/tab/newline) survives sanitizeTextInput, so multi-line
  // descriptions keep passing. Deliberately does NOT reject Unicode
  // bidi/format characters - genuine RTL text carries them.
  value === sanitizeTextInput(value);

/**
 * Free-text field that MAY be empty (descriptions): same control-char and
 * length gate as isSafeText minus the non-empty requirement.
 */
export const isSafeOptionalDescription = (value: unknown): boolean =>
  value === undefined ||
  (typeof value === "string" &&
    value.length <= VALIDATOR_LIMITS.MAX_DESCRIPTION_LENGTH &&
    value === sanitizeTextInput(value));

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
        item.paymentDueDay <= 31)) &&
    // Card keep-alive fields: all optional (older peers omit them), bounds
    // deliberately wider than the UI chips so a future UI option never
    // produces records this gate rejects mid-sync.
    (item.keepAliveEnabled === undefined ||
      typeof item.keepAliveEnabled === "boolean") &&
    (item.keepAliveWindowMonths === undefined ||
      (typeof item.keepAliveWindowMonths === "number" &&
        Number.isInteger(item.keepAliveWindowMonths) &&
        item.keepAliveWindowMonths >= 1 &&
        item.keepAliveWindowMonths <= KEEP_ALIVE_MAX_WINDOW_MONTHS)) &&
    (item.keepAliveLeadDays === undefined ||
      (typeof item.keepAliveLeadDays === "number" &&
        Number.isInteger(item.keepAliveLeadDays) &&
        item.keepAliveLeadDays >= 1 &&
        item.keepAliveLeadDays <= KEEP_ALIVE_MAX_LEAD_DAYS)) &&
    isOptionalIso(item.keepAliveLastUsedAt)
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

/**
 * Receipt-attachment metadata on a budget entry. Bounded so a hostile peer
 * or hand-edited import can't smuggle megabyte blobs inside an entry: at
 * most 10 items (UI caps at 3 - the generous boundary means a merged or
 * legacy record can't brick a whole sync diff), each with a short id, a
 * parseable createdAt, and sane optional pixel dimensions. The image BYTES
 * never ride the entry - only this metadata does.
 */
const MAX_IMPORTED_ATTACHMENTS = 10;

export const isEntryAttachmentsValue = (value: unknown): boolean => {
  if (value === undefined) return true;
  if (!Array.isArray(value)) return false;
  if (value.length > MAX_IMPORTED_ATTACHMENTS) return false;
  return value.every((item) => {
    if (!isObject(item)) return false;
    const dimensionValid = (v: unknown): boolean =>
      v === undefined ||
      (typeof v === "number" && Number.isFinite(v) && v >= 1 && v <= 20_000);
    return (
      isSafeText(item.id, 80) &&
      isValidDateValue(item.createdAt) &&
      dimensionValid(item.width) &&
      dimensionValid(item.height)
    );
  });
};

export const isBudgetEntryItem = (
  item: unknown
): item is Record<string, unknown> => {
  if (!isObject(item)) return false;
  const typeValid = item.type === "income" || item.type === "expense";
  const categoryValid = isValidImportCategory(item.category);
  const descriptionValid = isSafeOptionalDescription(item.description);

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

  // Bank-connection provenance fields (all optional; see BudgetEntry docs).
  const sourceValid = item.source === undefined || item.source === "bank";
  const externalTxIdValid =
    item.externalTxId === undefined || isSafeText(item.externalTxId, 200);
  const merchantValid =
    item.merchant === undefined || isSafeText(item.merchant, 120);
  // Cap matches what isBusinessItem accepts for a business id (default
  // isSafeText cap, 120) - a tagged entry must never fail validation where
  // its business passed, or one entry bricks the whole sync diff.
  const businessIdValid =
    item.businessId === undefined || isSafeText(item.businessId, 120);
  // Same contract as businessId, for the person assignment.
  const personIdValid =
    item.personId === undefined || isSafeText(item.personId, 120);
  // W-2 / 1099 paycheck fields (all optional; see BudgetEntry docs). The
  // rate is bounded 0-100 - a hostile peer's 10_000% rate would otherwise
  // render an absurd "set aside" figure on the summary card.
  const incomeTypeValid =
    item.incomeType === undefined ||
    item.incomeType === "w2" ||
    item.incomeType === "1099";
  const retirementContributionValid =
    item.retirementContribution === undefined ||
    isSafeNumber(item.retirementContribution, { min: 0 });
  const taxSetAsideRateValid =
    item.taxSetAsideRate === undefined ||
    isSafeNumber(item.taxSetAsideRate, { min: 0, max: 100 });
  const attachmentsValid = isEntryAttachmentsValue(item.attachments);
  // Partner-sync privacy flag. Boolean-or-absent only: a peer or import
  // smuggling a truthy non-boolean here would still behave like `true`
  // everywhere the flag is read, so shape-gate it like every other field.
  const isPrivateValid =
    item.isPrivate === undefined || typeof item.isPrivate === "boolean";

  return (
    isSafeText(item.id) &&
    typeValid &&
    categoryValid &&
    amountValid &&
    descriptionValid &&
    paymentUrlValid &&
    sourceValid &&
    externalTxIdValid &&
    merchantValid &&
    businessIdValid &&
    personIdValid &&
    incomeTypeValid &&
    retirementContributionValid &&
    taxSetAsideRateValid &&
    attachmentsValid &&
    isPrivateValid &&
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
  if (!isSafeOptionalDescription(item.description)) {
    return `"description" must be a string of at most ${VALIDATOR_LIMITS.MAX_DESCRIPTION_LENGTH} characters with no control characters`;
  }
  if (!isAcceptablePaymentUrl(item.paymentUrl)) {
    return '"paymentUrl" must be a valid https URL';
  }
  if (item.source !== undefined && item.source !== "bank") {
    return '"source" must be exactly "bank" when present';
  }
  if (item.externalTxId !== undefined && !isSafeText(item.externalTxId, 200)) {
    return '"externalTxId" must be a non-empty string of at most 200 characters when present';
  }
  if (item.merchant !== undefined && !isSafeText(item.merchant, 120)) {
    return '"merchant" must be a non-empty string of at most 120 characters when present';
  }
  if (item.businessId !== undefined && !isSafeText(item.businessId, 120)) {
    return '"businessId" must be a non-empty string of at most 120 characters when present';
  }
  if (item.personId !== undefined && !isSafeText(item.personId, 120)) {
    return '"personId" must be a non-empty string of at most 120 characters when present';
  }
  if (
    item.incomeType !== undefined &&
    item.incomeType !== "w2" &&
    item.incomeType !== "1099"
  ) {
    return '"incomeType" must be exactly "w2" or "1099" when present';
  }
  if (
    item.retirementContribution !== undefined &&
    !isSafeNumber(item.retirementContribution, { min: 0 })
  ) {
    return '"retirementContribution" must be a non-negative number when present';
  }
  if (
    item.taxSetAsideRate !== undefined &&
    !isSafeNumber(item.taxSetAsideRate, { min: 0, max: 100 })
  ) {
    return '"taxSetAsideRate" must be a number between 0 and 100 when present';
  }
  if (!isEntryAttachmentsValue(item.attachments)) {
    return `"attachments" must be an array of at most ${MAX_IMPORTED_ATTACHMENTS} items, each with a string "id", a parseable "createdAt", and optional numeric "width"/"height"`;
  }
  if (item.isPrivate !== undefined && typeof item.isPrivate !== "boolean") {
    return '"isPrivate" must be true or false when present';
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

/**
 * A business record (the export/sync `businesses` collection). Deliberately
 * permissive at this trust boundary: NO duplicate-name or cap check here -
 * one rejected record kills an entire sync diff (see diffEngine), and dup
 * names are cosmetic since entries reference businesses by id. Name length
 * mirrors MAX_BUSINESS_NAME_LENGTH (kept as a literal so this module stays
 * free of storage-layer imports, same as the category cap above).
 */
export const isBusinessItem = (
  item: unknown
): item is Record<string, unknown> => {
  if (!isObject(item)) return false;
  return (
    isSafeText(item.id) &&
    isSafeText(item.name, 40) &&
    isValidDateValue(item.createdAt) &&
    isOptionalIso(item.updatedAt) &&
    isOptionalIso(item.deletedAt)
  );
};

/**
 * A person record (the export/sync `people` collection). Same deliberately
 * permissive trust-boundary stance as isBusinessItem; name length mirrors
 * MAX_PERSON_NAME_LENGTH.
 */
export const isPersonItem = (
  item: unknown
): item is Record<string, unknown> => {
  if (!isObject(item)) return false;
  return (
    isSafeText(item.id) &&
    isSafeText(item.name, 40) &&
    isValidDateValue(item.createdAt) &&
    isOptionalIso(item.updatedAt) &&
    isOptionalIso(item.deletedAt)
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

/**
 * One month-start balance record (the VALUES of the `monthKey → record`
 * map; keys are gated separately with `isMonthKey`). Trust-boundary
 * validator shared by JSON import and P2P sync. The magnitude cap exists so
 * a hostile peer or hand-edited backup can't inject a figure that renders
 * an absurd projection - generous enough that no real checking account
 * ever hits it. Negative balances are legitimate (overdrawn account).
 */
export const isMonthStartBalanceRecord = (
  item: unknown
): item is Record<string, unknown> => {
  if (!isObject(item)) return false;
  return (
    typeof item.balance === "number" &&
    Number.isFinite(item.balance) &&
    Math.abs(item.balance) <= 1_000_000_000 &&
    isValidDateValue(item.capturedAt) &&
    isValidDateValue(item.updatedAt)
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

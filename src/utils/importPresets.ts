/**
 * BudgetArk - Import Presets (YNAB / Mint / Monarch)
 * File: src/utils/importPresets.ts
 *
 * Pure column mappings for the transaction CSVs the common budgeting apps
 * export, so switching to BudgetArk is a one-tap import instead of a
 * hand-edited sheet. `detectImportPreset` recognizes a file by its
 * signature headers (BudgetArk's own schema never matches - it has no
 * Payee/Outflow, Transaction Type or Original Statement column);
 * `presetRowToEntryRow` rewrites one source row into a BudgetArk
 * "Budget Entries" row (Date / Type / Category / Amount / Description /
 * Merchant) that the normal importer then validates exactly like a
 * hand-made sheet - so every fail-closed rule there still applies.
 * Transfers between the user's own accounts are dropped (they are not
 * income or spending); source categories map onto BudgetArk built-ins by
 * keyword, and otherwise come through as custom categories under their
 * own name. Nothing here touches storage or the network.
 */

export type ImportPresetId = "ynab" | "mint" | "monarch";

export type ImportPreset = {
  id: ImportPresetId;
  label: string;
  /** Every one of these headers (case-insensitive) must be present. */
  signature: string[];
};

export const IMPORT_PRESETS: readonly ImportPreset[] = [
  { id: "ynab", label: "YNAB", signature: ["Payee", "Outflow", "Inflow"] },
  { id: "mint", label: "Mint", signature: ["Transaction Type", "Original Description", "Amount"] },
  { id: "monarch", label: "Monarch", signature: ["Merchant", "Original Statement", "Amount"] },
];

/** The BudgetArk-schema row a preset produces. */
export type PresetEntryRow = {
  Date: string;
  Type: "income" | "expense";
  Category: string;
  Amount: string;
  Description: string;
  Merchant: string;
};

/** Longest custom category name the importer accepts (recordValidators). */
const MAX_CATEGORY_LENGTH = 24;

const normalizeHeader = (header: string): string => header.trim().toLowerCase();

/** The preset whose signature headers are all present, or null. */
export const detectImportPreset = (headers: readonly string[]): ImportPreset | null => {
  const present = new Set(headers.map(normalizeHeader));
  for (const preset of IMPORT_PRESETS) {
    if (preset.signature.every((header) => present.has(normalizeHeader(header)))) return preset;
  }
  return null;
};

const get = (row: Record<string, unknown>, ...candidates: string[]): string => {
  for (const candidate of candidates) {
    const lower = normalizeHeader(candidate);
    for (const key of Object.keys(row)) {
      if (normalizeHeader(key) === lower) {
        const value = row[key];
        return value == null ? "" : String(value).trim();
      }
    }
  }
  return "";
};

/** "$1,234.56" / "(12.00)" / "-12" -> signed number; NaN when unreadable. */
const parseMoney = (raw: string): number => {
  let s = raw.replace(/[\s$€£,]/g, "");
  if (!s) return Number.NaN;
  let negative = false;
  if (s.startsWith("(") && s.endsWith(")")) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (s.startsWith("-")) {
    negative = !negative;
    s = s.slice(1);
  }
  if (!/^\d*\.?\d*$/.test(s) || s === "" || s === ".") return Number.NaN;
  const value = Number(s);
  return negative ? -value : value;
};

type CategoryRule = { category: string; keywords: string[] };

/**
 * Keyword -> built-in category; first rule to match wins, so the specific
 * (loan payments, insurance, personal care) sit above the general (car,
 * gas). Keywords match a whole word plus at most a plural/simple suffix
 * (see keywordMatches): "grocer" takes "Groceries" and "car" takes "Car
 * Payment", but "rent" does not take "Rental Car", "bar" "Barber", "pet"
 * "Petrol" or "car" "Childcare". Word forms outside the suffix allowlist
 * ("Healthcare", "Electricity", "Transportation") are listed explicitly.
 */
export const PRESET_CATEGORY_RULES: readonly CategoryRule[] = [
  { category: "Debt Payments", keywords: ["loan", "student loan", "car payment", "mortgage payment", "debt"] },
  { category: "Retirement", keywords: ["retirement", "401k", "401(k)", "ira", "pension"] },
  { category: "Investing", keywords: ["invest", "brokerage", "stocks", "crypto", "cryptocurrency"] },
  { category: "Savings", keywords: ["saving", "emergency fund", "sinking"] },
  { category: "Freelance", keywords: ["freelance", "1099", "contract", "contractor", "consulting", "side hustle"] },
  { category: "Salary", keywords: ["paycheck", "salary", "payroll", "wages", "income", "ready to assign", "inflow"] },
  { category: "Grocery", keywords: ["grocer", "supermarket"] },
  { category: "Restaurant", keywords: ["restaurant", "dining", "fast food", "coffee", "takeout", "take-out", "bar", "eating out"] },
  { category: "Housing", keywords: ["rent", "mortgage", "housing", "hoa", "home improvement", "furnish", "furnishing"] },
  { category: "Utilities", keywords: ["utilit", "electric", "electricity", "water", "sewer", "trash", "internet", "phone", "mobile", "cable", "natural gas", "gas & electric", "gas and electric"] },
  { category: "Healthcare", keywords: ["health", "healthcare", "medical", "doctor", "pharmacy", "dental", "dentist", "vision", "therapy"] },
  { category: "Insurance", keywords: ["insurance"] },
  { category: "Fitness", keywords: ["gym", "fitness"] },
  { category: "Shopping", keywords: ["shopping", "clothing", "clothes", "amazon", "household", "personal care", "child care", "beauty", "pet", "kids", "baby"] },
  { category: "Transportation", keywords: ["gas", "fuel", "auto", "car", "transport", "transportation", "parking", "toll", "uber", "lyft", "transit", "rideshare"] },
  { category: "Tech", keywords: ["electronics", "software", "tech", "technology", "computer"] },
  { category: "Entertainment", keywords: ["entertainment", "streaming", "movie", "music", "games", "gaming", "subscription", "hobbies", "hobby", "fun money"] },
  { category: "Travel", keywords: ["travel", "vacation", "hotel", "airfare", "flight", "airline"] },
  { category: "Giving", keywords: ["gift", "charity", "charities", "donation", "giving", "church", "tithe"] },
  { category: "Food", keywords: ["food"] },
  { category: "Other", keywords: ["uncategorized", "misc", "other"] },
];

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Suffixes a keyword may carry and still count as the same word, so the
 * rule list can say "grocer" / "utilit" / "invest" / "saving" / "gift" once
 * and take Groceries, Utilities, Investments, Savings, Gifts. Anything
 * longer is a different word ("Rental", "Barber", "Petrol").
 */
const KEYWORD_SUFFIXES = ["s", "es", "ies", "y", "ing", "ment", "ments"] as const;

const suffixPattern = `(?:${KEYWORD_SUFFIXES.join("|")})?`;

/**
 * True when `keyword` appears in `lower` as a whole word: preceded by the
 * start or a non-alphanumeric, followed by the end, a non-alphanumeric, or
 * one allowlisted suffix. Pure; exported for the tests that pin it.
 */
export const keywordMatches = (lower: string, keyword: string): boolean =>
  new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(keyword)}${suffixPattern}(?=$|[^a-z0-9])`).test(lower);

/**
 * Best-effort BudgetArk category for a source category. Built-in by
 * keyword; otherwise the source name itself (trimmed to the importer's
 * custom-category limit) so nothing is silently rebucketed; "Other" when
 * blank. Income rows never land in an expense category and vice versa.
 */
export const mapPresetCategory = (raw: string, type: "income" | "expense"): string => {
  const text = raw.trim();
  const lower = text.toLowerCase();
  if (lower.length > 0) {
    for (const rule of PRESET_CATEGORY_RULES) {
      if (rule.keywords.some((keyword) => keywordMatches(lower, keyword))) {
        const isIncomeCategory = rule.category === "Salary" || rule.category === "Freelance";
        if (type === "income" && !isIncomeCategory) return "Salary";
        if (type === "expense" && isIncomeCategory) return "Other";
        return rule.category;
      }
    }
  }
  if (type === "income") return "Salary";
  if (!text) return "Other";
  // YNAB writes "Group: Category" - keep the leaf.
  const leaf = text.includes(":") ? text.slice(text.lastIndexOf(":") + 1).trim() : text;
  const clean = leaf.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  if (!clean) return "Other";
  return clean.length > MAX_CATEGORY_LENGTH ? clean.slice(0, MAX_CATEGORY_LENGTH).trim() : clean;
};

/**
 * Rows that move money between the user's own accounts: explicit transfers
 * and credit-card payments (Mint / Monarch file them under "Credit Card
 * Payment", YNAB under a "Credit Card Payments: <card>" category). The
 * card's purchases are the spending; importing the payment too would count
 * it twice. Deliberately a skip rather than a Debt Payments expense.
 */
const isTransfer = (...fields: string[]): boolean =>
  fields.some((field) => /\btransfer\b/i.test(field) || /\bcredit card payments?\b/i.test(field));

const buildRow = (
  date: string,
  signedAmount: number,
  sourceCategory: string,
  description: string,
  merchant: string
): PresetEntryRow | null => {
  if (!Number.isFinite(signedAmount) || signedAmount === 0) return null;
  const type: "income" | "expense" = signedAmount > 0 ? "income" : "expense";
  return {
    Date: date,
    Type: type,
    Category: mapPresetCategory(sourceCategory, type),
    Amount: Math.abs(signedAmount).toFixed(2),
    Description: description.slice(0, 220),
    Merchant: merchant.slice(0, 120),
  };
};

/**
 * One source row -> BudgetArk row, or null when the row is not a
 * transaction BudgetArk should keep (a transfer, a zero, an unreadable
 * amount - the importer's own validators handle bad dates).
 */
export const presetRowToEntryRow = (
  preset: ImportPresetId,
  row: Record<string, unknown>
): PresetEntryRow | null => {
  switch (preset) {
    case "ynab": {
      const payee = get(row, "Payee");
      const category = get(row, "Category") || get(row, "Category Group/Category");
      if (isTransfer(payee, category)) return null;
      const outflow = parseMoney(get(row, "Outflow"));
      const inflow = parseMoney(get(row, "Inflow"));
      const amount = (Number.isFinite(inflow) ? inflow : 0) - (Number.isFinite(outflow) ? outflow : 0);
      const memo = get(row, "Memo");
      return buildRow(get(row, "Date"), amount, category, memo || payee, payee);
    }
    case "mint": {
      const description = get(row, "Description");
      const category = get(row, "Category");
      if (isTransfer(category)) return null;
      const magnitude = Math.abs(parseMoney(get(row, "Amount")));
      const kind = get(row, "Transaction Type").toLowerCase();
      const amount = kind === "credit" ? magnitude : -magnitude;
      const notes = get(row, "Notes");
      return buildRow(get(row, "Date"), amount, category, notes || description, get(row, "Original Description") || description);
    }
    case "monarch": {
      const merchant = get(row, "Merchant");
      const category = get(row, "Category");
      if (isTransfer(category)) return null;
      const amount = parseMoney(get(row, "Amount"));
      const notes = get(row, "Notes");
      return buildRow(get(row, "Date"), amount, category, notes || merchant, get(row, "Original Statement") || merchant);
    }
    default:
      return null;
  }
};

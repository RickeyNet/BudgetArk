/**
 * BudgetArk — Spreadsheet Import Utility
 * File: src/utils/spreadsheetImport.ts
 *
 * Reads .csv or .xlsx files via expo-document-picker, parses with SheetJS,
 * normalizes rows into the BudgetArk JSON export shape, and pipes into the
 * existing transactional import pipeline (importFromString).
 *
 * Schema is fixed and mirrors spreadsheetExport.ts. See SPREADSHEET_SCHEMA.md.
 *
 * Supported sheets (sheet name match is case-insensitive, leading/trailing
 * whitespace trimmed):
 *   - Budget Entries  (CSV files: this is the only sheet)
 *   - Budget Limits
 *   - Debts
 *   - Payments
 *   - Savings Goals
 *   - Asset Accounts
 *
 * Unknown sheets are ignored. Rows that fail validation are dropped silently
 * by the downstream sanitizer in importData.ts (which is strict).
 */

import * as DocumentPicker from "expo-document-picker";
import { File as ExpoFile } from "expo-file-system";
import * as XLSX from "xlsx";
import { importFromString, type ImportResult } from "./importData";
import { DERIVED_EMERGENCY_FUND_ID } from "./spreadsheetExport";
import { generateUUID } from "./uuid";
import {
  BUDGET_CATEGORIES,
  ASSET_ACCOUNT_CATEGORIES,
  type BudgetCategory,
  type AssetAccountCategory,
} from "../types";

/** Cap raw spreadsheet file size (uncompressed bytes for csv, on-disk size for xlsx). */
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_ROWS_PER_SHEET = 5000;

const VALID_BUDGET_CATEGORIES = new Set<string>(BUDGET_CATEGORIES);

/** Categories where the app legitimately writes negative-amount correction entries. */
const NEGATIVE_AMOUNT_CATEGORIES = new Set<string>([
  "Savings",
  "Retirement",
  "Investing",
]);
const VALID_ASSET_CATEGORIES = new Set<string>(ASSET_ACCOUNT_CATEGORIES);
const VALID_SAVINGS_CATEGORIES = new Set([
  "emergency_fund",
  "travel",
  "home",
  "car",
  "education",
  "other",
]);
const VALID_DEBT_OWNERS = new Set(["mine", "partner", "joint"]);
const VALID_DEBT_CLASSES = new Set(["personal_credit", "car_house"]);
const VALID_DEBT_CLASS_SOURCES = new Set(["manual", "inferred"]);

/* ── Cell value coercion ── */

/**
 * Parses an arbitrary spreadsheet cell into a number.
 *
 * Handles:
 *   - Plain numbers (Excel returns numbers natively)
 *   - "$1,234.56", "1.234,56" (some locales), " 42 "
 *   - Parenthesized negatives like "(50.00)"
 *   - Leading/trailing whitespace
 *
 * Returns NaN if not parseable.
 */
const parseAmount = (raw: unknown): number => {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : NaN;
  if (typeof raw !== "string") return NaN;

  let s = raw.trim();
  if (!s) return NaN;

  // Parens = negative
  let negative = false;
  if (s.startsWith("(") && s.endsWith(")")) {
    negative = true;
    s = s.slice(1, -1).trim();
  }

  // Strip currency symbols and thousands separators (US convention)
  s = s.replace(/[$£€¥₹]/g, "");
  s = s.replace(/,/g, "");
  s = s.trim();

  const n = Number(s);
  if (!Number.isFinite(n)) return NaN;
  return negative ? -n : n;
};

/**
 * Normalizes a date cell into ISO 8601.
 *
 * Accepts:
 *   - Excel serial dates (numbers — XLSX with cellDates:true converts to Date)
 *   - JS Date objects (from cellDates:true)
 *   - ISO strings ("2026-04-30", "2026-04-30T12:00:00Z")
 *   - US-format strings ("4/30/2026", "04/30/2026")
 *
 * Returns "" if unparseable.
 */
const parseDate = (raw: unknown): string => {
  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) return "";
    return raw.toISOString();
  }
  if (typeof raw === "number") {
    // Excel serial date (days since 1899-12-30)
    if (!Number.isFinite(raw)) return "";
    const ms = Math.round((raw - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? "" : d.toISOString();
  }
  if (typeof raw !== "string") return "";

  const s = raw.trim();
  if (!s) return "";

  // Direct parse first (handles ISO + many native formats)
  const direct = Date.parse(s);
  if (!Number.isNaN(direct)) return new Date(direct).toISOString();

  // Try US-style M/D/YYYY
  const usMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (usMatch) {
    const [, m, d, yRaw] = usMatch;
    const y = yRaw.length === 2 ? 2000 + Number(yRaw) : Number(yRaw);
    const dt = new Date(y, Number(m) - 1, Number(d));
    if (!Number.isNaN(dt.getTime())) return dt.toISOString();
  }

  return "";
};

const parseString = (raw: unknown, maxLen = 220): string => {
  if (raw === null || raw === undefined) return "";
  const s = String(raw).trim();
  if (s.length > maxLen) return s.slice(0, maxLen);
  // Strip control chars + null bytes (mirrors validation in importData)
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
};

const parseBoolean = (raw: unknown): boolean => {
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "number") return raw !== 0;
  if (typeof raw !== "string") return false;
  const s = raw.trim().toLowerCase();
  return s === "yes" || s === "y" || s === "true" || s === "1";
};

/* ── Sheet name lookup (case-insensitive, whitespace-tolerant) ── */

const findSheet = (
  workbook: XLSX.WorkBook,
  targetName: string
): XLSX.WorkSheet | undefined => {
  const target = targetName.trim().toLowerCase();
  const matchKey = workbook.SheetNames.find(
    (n) => n.trim().toLowerCase() === target
  );
  return matchKey ? workbook.Sheets[matchKey] : undefined;
};

/**
 * Detects the sentinel "Total" row that the exporter appends to every sheet.
 *
 * The label sits in the first column, which `sheet_to_json` preserves as the
 * first key of each row object. Filtering total rows before mapping keeps them
 * from inflating `skippedRows` (otherwise a clean round-trip would always
 * report N skipped rows = number of sheets).
 */
const isTotalRow = (row: Record<string, unknown>): boolean => {
  const keys = Object.keys(row);
  if (keys.length === 0) return false;
  const firstVal = row[keys[0]];
  return (
    typeof firstVal === "string" &&
    firstVal.trim().toLowerCase() === "total"
  );
};

/**
 * Treat the workbook as either a multi-sheet xlsx or a single CSV sheet.
 *
 * For CSVs, the only sheet is the budget entries sheet — so we map the first
 * sheet to "Budget Entries" regardless of its actual name.
 */
const sheetToRows = (sheet: XLSX.WorkSheet | undefined): Record<string, unknown>[] => {
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    raw: true,
    defval: "",
  });
  if (rows.length > MAX_ROWS_PER_SHEET) {
    throw new Error(
      `Spreadsheet has too many rows (${rows.length}). Maximum is ${MAX_ROWS_PER_SHEET}.`
    );
  }
  return rows.filter((r) => !isTotalRow(r));
};

/**
 * Case-insensitive header lookup. Spreadsheet apps sometimes reformat header
 * casing on round-trip, so we normalize when reading.
 */
const get = (row: Record<string, unknown>, ...candidates: string[]): unknown => {
  for (const candidate of candidates) {
    if (row[candidate] !== undefined) return row[candidate];
    const lower = candidate.toLowerCase();
    for (const key of Object.keys(row)) {
      if (key.toLowerCase() === lower) return row[key];
    }
  }
  return undefined;
};

/* ── Row → entity mappers ── */

const rowToBudgetEntry = (row: Record<string, unknown>) => {
  const typeRaw = parseString(get(row, "Type")).toLowerCase();
  const type = typeRaw === "income" ? "income" : typeRaw === "expense" ? "expense" : null;
  const categoryRaw = parseString(get(row, "Category"), 60);
  const category: BudgetCategory | null = VALID_BUDGET_CATEGORIES.has(categoryRaw)
    ? (categoryRaw as BudgetCategory)
    : null;
  const amount = parseAmount(get(row, "Amount"));
  const dateIso = parseDate(get(row, "Date"));

  // Savings/Retirement/Investing entries may legitimately be negative
  // (correction entries when the user lowers a tracked reserve). All other
  // categories require positive amounts.
  const allowsNegative =
    category !== null && NEGATIVE_AMOUNT_CATEGORIES.has(category);
  const amountValid =
    Number.isFinite(amount) &&
    Math.abs(amount) >= 0.01 &&
    (allowsNegative ? true : amount > 0);

  if (!type || !category || !amountValid || !dateIso) {
    return null;
  }

  const id = parseString(get(row, "ID", "Id", "id"), 80) || generateUUID();
  const description = parseString(get(row, "Description", "Notes", "Memo"));
  const recurring = parseBoolean(get(row, "Recurring"));
  const linkedAccountId = parseString(get(row, "LinkedAccountId", "LinkedAccount"), 80);

  const now = new Date().toISOString();
  return {
    id,
    type,
    category,
    amount,
    description: description || undefined,
    date: dateIso,
    createdAt: now,
    updatedAt: now,
    recurring: recurring || undefined,
    linkedAccountId: linkedAccountId || undefined,
  };
};

const rowToBudgetLimit = (row: Record<string, unknown>) => {
  const categoryRaw = parseString(get(row, "Category"), 60);
  const category: BudgetCategory | null = VALID_BUDGET_CATEGORIES.has(categoryRaw)
    ? (categoryRaw as BudgetCategory)
    : null;
  const monthlyLimit = parseAmount(get(row, "MonthlyLimit", "Monthly Limit", "Limit"));

  if (!category || !Number.isFinite(monthlyLimit) || monthlyLimit <= 0) {
    return null;
  }
  return { category, monthlyLimit };
};

const rowToDebt = (row: Record<string, unknown>) => {
  const name = parseString(get(row, "Name"), 80);
  const balance = parseAmount(get(row, "Balance"));
  const originalBalance = parseAmount(get(row, "OriginalBalance", "Original Balance"));
  const rate = parseAmount(get(row, "Rate", "APR"));
  const minPayment = parseAmount(get(row, "MinPayment", "Min Payment", "MinimumPayment"));

  if (
    !name ||
    !Number.isFinite(balance) ||
    !Number.isFinite(originalBalance) ||
    originalBalance <= 0 ||
    !Number.isFinite(rate) ||
    rate < 0 ||
    !Number.isFinite(minPayment) ||
    minPayment < 0
  ) {
    return null;
  }

  const id = parseString(get(row, "ID", "Id"), 80) || generateUUID();
  const ownerRaw = parseString(get(row, "Owner")).toLowerCase();
  const owner = VALID_DEBT_OWNERS.has(ownerRaw) ? ownerRaw : "mine";
  const debtClassRaw = parseString(get(row, "DebtClass", "Debt Class")).toLowerCase();
  const debtClass = VALID_DEBT_CLASSES.has(debtClassRaw) ? debtClassRaw : "personal_credit";
  const debtClassSourceRaw = parseString(
    get(row, "DebtClassSource", "Debt Class Source")
  ).toLowerCase();
  const debtClassSource = VALID_DEBT_CLASS_SOURCES.has(debtClassSourceRaw)
    ? debtClassSourceRaw
    : "inferred";
  const goalDate = parseDate(get(row, "GoalDate", "Goal Date"));
  const createdAtIso = parseDate(get(row, "CreatedAt", "Created At"));
  const now = new Date().toISOString();

  return {
    id,
    name,
    balance,
    originalBalance,
    rate,
    minPayment,
    owner,
    debtClass,
    debtClassSource,
    goalDate: goalDate || undefined,
    createdAt: createdAtIso || now,
    updatedAt: now,
  };
};

const rowToPayment = (row: Record<string, unknown>) => {
  const debtId = parseString(get(row, "DebtID", "DebtId", "Debt ID"), 80);
  const amount = parseAmount(get(row, "Amount"));
  const dateIso = parseDate(get(row, "Date"));
  if (!debtId || !Number.isFinite(amount) || amount <= 0 || !dateIso) {
    return null;
  }
  const id = parseString(get(row, "ID", "Id"), 80) || generateUUID();
  return {
    id,
    debtId,
    amount,
    date: dateIso,
    updatedAt: new Date().toISOString(),
  };
};

const rowToSavingsGoal = (row: Record<string, unknown>) => {
  const name = parseString(get(row, "Name"), 80);
  const categoryRaw = parseString(get(row, "Category")).toLowerCase();
  const category = VALID_SAVINGS_CATEGORIES.has(categoryRaw) ? categoryRaw : null;
  const targetAmount = parseAmount(get(row, "TargetAmount", "Target Amount"));
  const currentAmount = parseAmount(get(row, "CurrentAmount", "Current Amount"));

  if (
    !name ||
    !category ||
    !Number.isFinite(targetAmount) ||
    targetAmount <= 0 ||
    !Number.isFinite(currentAmount) ||
    currentAmount < 0
  ) {
    return null;
  }

  const id = parseString(get(row, "ID", "Id"), 80) || generateUUID();
  // Skip the synthetic Emergency Fund row that the exporter writes when a
  // user tracks their EF implicitly through Keel + Savings entries. Importing
  // it would materialize a duplicate explicit goal on every round-trip.
  if (id === DERIVED_EMERGENCY_FUND_ID) {
    return null;
  }
  const targetDate = parseDate(get(row, "TargetDate", "Target Date"));
  const createdAt = parseDate(get(row, "CreatedAt", "Created At")) || new Date().toISOString();
  return {
    id,
    name,
    category,
    targetAmount,
    currentAmount,
    targetDate: targetDate || undefined,
    createdAt,
    updatedAt: new Date().toISOString(),
  };
};

const rowToAssetAccount = (row: Record<string, unknown>) => {
  const name = parseString(get(row, "Name"), 80);
  const categoryRaw = parseString(get(row, "Category")).toLowerCase();
  const category: AssetAccountCategory | null = VALID_ASSET_CATEGORIES.has(categoryRaw)
    ? (categoryRaw as AssetAccountCategory)
    : null;
  const balance = parseAmount(get(row, "Balance"));

  if (!name || !category || !Number.isFinite(balance) || balance < 0) {
    return null;
  }
  const id = parseString(get(row, "ID", "Id"), 80) || generateUUID();
  const createdAt = parseDate(get(row, "CreatedAt", "Created At")) || new Date().toISOString();
  return {
    id,
    name,
    category,
    balance,
    createdAt,
    updatedAt: new Date().toISOString(),
  };
};

/* ── Public API ── */

export interface SpreadsheetImportResult extends ImportResult {
  /** Number of rows the spreadsheet contained that we could not parse. */
  skippedRows: number;
}

/**
 * Picks a spreadsheet file, parses it, and pipes the normalized payload
 * through importFromString so it gets the same validation + transactional
 * write semantics as JSON imports.
 */
export const importSpreadsheet = async (
  mode: "merge" | "replace" = "merge"
): Promise<SpreadsheetImportResult | null> => {
  const picked = await DocumentPicker.getDocumentAsync({
    type: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
      "text/csv",
      "text/comma-separated-values",
    ],
    copyToCacheDirectory: true,
  });

  if (picked.canceled) return null;

  const file = picked.assets[0];
  if (!file?.uri) {
    throw new Error("No file selected.");
  }

  const fileSize = typeof file.size === "number" ? file.size : 0;
  if (fileSize > MAX_FILE_BYTES) {
    throw new Error(
      `File is too large (${(fileSize / 1024 / 1024).toFixed(1)} MB). Maximum is 5 MB.`
    );
  }

  const isCsvByName = file.name?.toLowerCase().endsWith(".csv");
  const isCsvByMime = file.mimeType === "text/csv" || file.mimeType === "text/comma-separated-values";
  const isCsv = isCsvByName || isCsvByMime;

  let workbook: XLSX.WorkBook;
  try {
    if (isCsv) {
      const csvText = await new ExpoFile(file.uri).text();
      workbook = XLSX.read(csvText, { type: "string", cellDates: true });
    } else {
      const base64 = await new ExpoFile(file.uri).base64();
      workbook = XLSX.read(base64, { type: "base64", cellDates: true });
    }
  } catch (err) {
    throw new Error(
      "Could not read the spreadsheet. The file may be corrupt or in an unsupported format."
    );
  }

  if (!workbook.SheetNames.length) {
    throw new Error("The spreadsheet is empty.");
  }

  // For CSV: treat the only sheet as Budget Entries regardless of its name.
  const budgetEntriesSheet = isCsv
    ? workbook.Sheets[workbook.SheetNames[0]]
    : findSheet(workbook, "Budget Entries");
  const budgetLimitsSheet = isCsv ? undefined : findSheet(workbook, "Budget Limits");
  const debtsSheet = isCsv ? undefined : findSheet(workbook, "Debts");
  const paymentsSheet = isCsv ? undefined : findSheet(workbook, "Payments");
  const savingsGoalsSheet = isCsv ? undefined : findSheet(workbook, "Savings Goals");
  const assetAccountsSheet = isCsv ? undefined : findSheet(workbook, "Asset Accounts");

  const entryRows = sheetToRows(budgetEntriesSheet);
  const limitRows = sheetToRows(budgetLimitsSheet);
  const debtRows = sheetToRows(debtsSheet);
  const paymentRows = sheetToRows(paymentsSheet);
  const savingsRows = sheetToRows(savingsGoalsSheet);
  const accountRows = sheetToRows(assetAccountsSheet);

  if (
    entryRows.length === 0 &&
    limitRows.length === 0 &&
    debtRows.length === 0 &&
    paymentRows.length === 0 &&
    savingsRows.length === 0 &&
    accountRows.length === 0
  ) {
    throw new Error(
      'No recognized sheets found. Expected a "Budget Entries" sheet (or one of: Budget Limits, Debts, Payments, Savings Goals, Asset Accounts).'
    );
  }

  const isPresent = <T>(v: T | null): v is T => v !== null;

  const budgetEntries = entryRows.map(rowToBudgetEntry).filter(isPresent);
  const budgetLimits = limitRows.map(rowToBudgetLimit).filter(isPresent);
  const debts = debtRows.map(rowToDebt).filter(isPresent);
  const payments = paymentRows.map(rowToPayment).filter(isPresent);
  const savingsGoals = savingsRows.map(rowToSavingsGoal).filter(isPresent);
  const assetAccounts = accountRows.map(rowToAssetAccount).filter(isPresent);

  const totalRowsParsed =
    entryRows.length +
    limitRows.length +
    debtRows.length +
    paymentRows.length +
    savingsRows.length +
    accountRows.length;
  const totalEntitiesValid =
    budgetEntries.length +
    budgetLimits.length +
    debts.length +
    payments.length +
    savingsGoals.length +
    assetAccounts.length;
  const skippedRows = Math.max(0, totalRowsParsed - totalEntitiesValid);

  if (totalEntitiesValid === 0) {
    throw new Error(
      "No valid rows found. Check that headers match the documented schema and Date / Amount / Type / Category are filled in."
    );
  }

  // Pipe into the JSON import pipeline so all collections inherit the
  // transactional safety + rollback semantics in importFromString.
  const payload = {
    exportedAt: new Date().toISOString(),
    debts,
    payments,
    budgetEntries,
    budgetLimits,
    savingsGoals,
    assetAccounts,
  };

  const result = await importFromString(JSON.stringify(payload), mode);

  return {
    ...result,
    skippedRows,
  };
};

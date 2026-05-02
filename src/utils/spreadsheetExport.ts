/**
 * BudgetArk — Spreadsheet Export Utility
 * File: src/utils/spreadsheetExport.ts
 *
 * Exports user data to .csv or .xlsx via expo-file-system + expo-sharing.
 *
 * CSV: budget entries only (single-sheet format).
 * XLSX: multi-sheet workbook (Budget Entries, Budget Limits, Debts, Payments,
 * Savings Goals, Asset Accounts).
 *
 * Schema is documented in SPREADSHEET_SCHEMA.md and is round-trip safe with
 * spreadsheetImport.ts — column headers must not change without bumping the
 * schema version in both files.
 */

import * as XLSX from "xlsx";
import * as Sharing from "expo-sharing";
import { File as ExpoFile, Paths } from "expo-file-system";
import { getDebts, getPayments } from "../storage/debtStorage";
import {
  getBudgetEntries,
  getCategoryBudgetLimits,
} from "../storage/budgetStorage";
import { getSavingsGoals } from "../storage/savingsGoalStorage";
import { getAssetAccounts } from "../storage/assetAccountStorage";
import { getDebtMilestonePlan } from "../storage/debtMilestoneStorage";
import {
  AssetAccount,
  BudgetEntry,
  CategoryBudgetLimit,
  Debt,
  Payment,
  SavingsGoal,
} from "../types";

export type SpreadsheetFormat = "csv" | "xlsx";

/** Schema version. Bump if column shape changes incompatibly. */
export const SPREADSHEET_SCHEMA_VERSION = 1;

/**
 * Sentinel ID for the synthetic Emergency Fund row written to the Savings
 * Goals sheet when the user tracks their emergency fund implicitly (via the
 * Keel milestone reserve + Savings/Retirement/Investing budget entries) but
 * has no explicit `emergency_fund` SavingsGoal record. Mirrors the synthetic
 * goal that BridgeScreen surfaces in the Accounts UI.
 *
 * spreadsheetImport.ts skips rows with this ID so round-trip exports don't
 * silently materialize the synthetic goal as a real persisted record.
 */
export const DERIVED_EMERGENCY_FUND_ID = "__derived_emergency_fund__";

/* ── Sheet column definitions (single source of truth, mirrored in import) ── */

const BUDGET_ENTRY_COLUMNS = [
  "ID",
  "Date",
  "Type",
  "Category",
  "Amount",
  "Description",
  "Recurring",
  "LinkedAccountId",
] as const;

const BUDGET_LIMIT_COLUMNS = ["Category", "MonthlyLimit"] as const;

const DEBT_COLUMNS = [
  "ID",
  "Name",
  "Balance",
  "OriginalBalance",
  "Rate",
  "MinPayment",
  "Owner",
  "DebtClass",
  "DebtClassSource",
  "GoalDate",
  "CreatedAt",
] as const;

const PAYMENT_COLUMNS = ["ID", "DebtID", "Amount", "Date"] as const;

const SAVINGS_GOAL_COLUMNS = [
  "ID",
  "Name",
  "Category",
  "TargetAmount",
  "CurrentAmount",
  "TargetDate",
  "CreatedAt",
] as const;

const ASSET_ACCOUNT_COLUMNS = [
  "ID",
  "Name",
  "Category",
  "Balance",
  "CreatedAt",
] as const;

/* ── Row builders — convert app types to flat row objects ── */

const formatDateOnly = (iso: string): string => {
  if (!iso) return "";
  const idx = iso.indexOf("T");
  return idx > 0 ? iso.slice(0, idx) : iso;
};

const budgetEntryToRow = (entry: BudgetEntry) => ({
  ID: entry.id,
  Date: formatDateOnly(entry.date),
  Type: entry.type,
  Category: entry.category,
  Amount: entry.amount,
  Description: entry.description ?? "",
  Recurring: entry.recurring ? "yes" : "no",
  LinkedAccountId: entry.linkedAccountId ?? "",
});

const budgetLimitToRow = (limit: CategoryBudgetLimit) => ({
  Category: limit.category,
  MonthlyLimit: limit.monthlyLimit,
});

const debtToRow = (debt: Debt) => ({
  ID: debt.id,
  Name: debt.name,
  Balance: debt.balance,
  OriginalBalance: debt.originalBalance,
  Rate: debt.rate,
  MinPayment: debt.minPayment,
  Owner: debt.owner,
  DebtClass: debt.debtClass,
  DebtClassSource: debt.debtClassSource,
  GoalDate: debt.goalDate ? formatDateOnly(debt.goalDate) : "",
  CreatedAt: debt.createdAt,
});

const paymentToRow = (payment: Payment) => ({
  ID: payment.id,
  DebtID: payment.debtId,
  Amount: payment.amount,
  Date: formatDateOnly(payment.date),
});

const savingsGoalToRow = (goal: SavingsGoal) => ({
  ID: goal.id,
  Name: goal.name,
  Category: goal.category,
  TargetAmount: goal.targetAmount,
  CurrentAmount: goal.currentAmount,
  TargetDate: goal.targetDate ? formatDateOnly(goal.targetDate) : "",
  CreatedAt: goal.createdAt,
});

const assetAccountToRow = (account: AssetAccount) => ({
  ID: account.id,
  Name: account.name,
  Category: account.category,
  Balance: account.balance,
  CreatedAt: account.createdAt,
});

/* ── Total row ──
 *
 * Each sheet ends with a "Total" row: "Total" label in column A, SUM formulas
 * in the configured numeric columns. Both `f` (formula) and `v` (cached sum)
 * are set so Excel/Sheets recompute live, and so sheet_to_csv (which reads `v`,
 * not `f`) still emits a real number.
 *
 * The label sits in the first column of every sheet by design — that column is
 * always either an `ID` (UUID) or a `Category` (enum). The string "Total" never
 * passes those validators on import, so the row is silently rejected even if
 * the import-side filter is missed.
 */

const TOTAL_LABEL = "Total";

type SheetName =
  | "Budget Entries"
  | "Budget Limits"
  | "Debts"
  | "Payments"
  | "Savings Goals"
  | "Asset Accounts";

// Budget Entries' Amount column gets a special-cased net total written after
// appendTotalRow runs (see writeBudgetEntriesNetTotal below). Income and
// expense rows are both stored as positive numbers, so a plain SUM(Amount)
// would lump them together as a meaningless figure — the net total uses
// SUMIF on Type instead.
const SHEET_SUM_COLUMNS: Record<SheetName, readonly string[]> = {
  "Budget Entries": [],
  "Budget Limits": ["MonthlyLimit"],
  Debts: ["Balance", "OriginalBalance", "MinPayment"],
  Payments: ["Amount"],
  "Savings Goals": ["TargetAmount", "CurrentAmount"],
  "Asset Accounts": ["Balance"],
};

/**
 * Writes a net total (income − expense) into the Amount cell of the Budget
 * Entries Total row. Uses SUMIF so the formula stays live in Excel/Sheets
 * if the user edits rows, and a cached numeric value so CSV export and any
 * non-formula-evaluating reader still sees a real number.
 *
 * Assumes appendTotalRow has already written the "Total" label and extended
 * the sheet range; this function only touches the Amount cell.
 */
const writeBudgetEntriesNetTotal = (
  sheet: XLSX.WorkSheet,
  rows: ReadonlyArray<Record<string, unknown>>
): void => {
  if (rows.length === 0) return;

  const typeColIdx = BUDGET_ENTRY_COLUMNS.indexOf("Type");
  const amountColIdx = BUDGET_ENTRY_COLUMNS.indexOf("Amount");
  if (typeColIdx < 0 || amountColIdx < 0) return;

  const totalRowIdx = rows.length + 1;
  const firstDataExcelRow = 2;
  const lastDataExcelRow = rows.length + 1;
  const typeCol = XLSX.utils.encode_col(typeColIdx);
  const amountCol = XLSX.utils.encode_col(amountColIdx);
  const typeRange = `${typeCol}${firstDataExcelRow}:${typeCol}${lastDataExcelRow}`;
  const amountRange = `${amountCol}${firstDataExcelRow}:${amountCol}${lastDataExcelRow}`;

  const net = rows.reduce<number>((acc, row) => {
    const amount = row.Amount;
    if (typeof amount !== "number" || !Number.isFinite(amount)) return acc;
    if (row.Type === "income") return acc + amount;
    if (row.Type === "expense") return acc - amount;
    return acc;
  }, 0);

  const cellRef = XLSX.utils.encode_cell({ r: totalRowIdx, c: amountColIdx });
  sheet[cellRef] = {
    t: "n",
    v: net,
    f: `SUMIF(${typeRange},"income",${amountRange})-SUMIF(${typeRange},"expense",${amountRange})`,
  };
};

const appendTotalRow = (
  sheet: XLSX.WorkSheet,
  rows: ReadonlyArray<Record<string, unknown>>,
  columns: readonly string[],
  sumColumns: readonly string[]
): void => {
  if (rows.length === 0) return;

  const totalRowIdx = rows.length + 1; // 0-indexed: header at 0, data 1..N, total at N+1
  const firstDataExcelRow = 2;
  const lastDataExcelRow = rows.length + 1;

  columns.forEach((colName, colIdx) => {
    const cellRef = XLSX.utils.encode_cell({ r: totalRowIdx, c: colIdx });
    if (colIdx === 0) {
      sheet[cellRef] = { t: "s", v: TOTAL_LABEL };
      return;
    }
    if (!sumColumns.includes(colName)) return;

    const colLetter = XLSX.utils.encode_col(colIdx);
    const sum = rows.reduce<number>((acc, row) => {
      const v = row[colName];
      return typeof v === "number" && Number.isFinite(v) ? acc + v : acc;
    }, 0);
    sheet[cellRef] = {
      t: "n",
      v: sum,
      f: `SUM(${colLetter}${firstDataExcelRow}:${colLetter}${lastDataExcelRow})`,
    };
  });

  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1");
  range.e.r = Math.max(range.e.r, totalRowIdx);
  range.e.c = Math.max(range.e.c, columns.length - 1);
  sheet["!ref"] = XLSX.utils.encode_range(range);
};

/* ── Filename helpers ── */

const buildFilename = (format: SpreadsheetFormat): string => {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate()
  ).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(
    now.getMinutes()
  ).padStart(2, "0")}`;
  return `budgetark-export-${stamp}.${format}`;
};

const sanitizeFilename = (raw: string): string =>
  raw.replace(/[^A-Za-z0-9._-]/g, "_");

/* ── Public API ── */

export interface SpreadsheetExportResult {
  format: SpreadsheetFormat;
  filename: string;
  entryCount: number;
}

/**
 * Builds the workbook, writes it to a cache file, and opens the share sheet.
 *
 * @param format — "csv" (budget entries only) or "xlsx" (full multi-sheet workbook)
 */
export const exportSpreadsheet = async (
  format: SpreadsheetFormat
): Promise<SpreadsheetExportResult> => {
  const [
    budgetEntries,
    budgetLimits,
    debts,
    payments,
    savingsGoals,
    assetAccounts,
    milestonePlan,
  ] = await Promise.all([
    getBudgetEntries(),
    getCategoryBudgetLimits(),
    getDebts(),
    getPayments(),
    getSavingsGoals(),
    getAssetAccounts(),
    getDebtMilestonePlan(),
  ]);

  // Build the savings-goal list shown in the spreadsheet. If the user has no
  // explicit emergency_fund goal but is tracking one via the Keel milestone
  // and Savings/Retirement/Investing budget entries (the same derivation
  // BridgeScreen runs), synthesize a row so the spreadsheet matches what the
  // Accounts UI displays. The synthetic row carries DERIVED_EMERGENCY_FUND_ID
  // so spreadsheetImport.rowToSavingsGoal can skip it on round-trip.
  const goalsForSheet: SavingsGoal[] = [...savingsGoals];
  const hasExplicitEmergencyFund = savingsGoals.some(
    (goal) => goal.category === "emergency_fund"
  );
  if (!hasExplicitEmergencyFund) {
    const keelStep = milestonePlan.steps.find((step) => step.key === "keel");
    const keelTarget = keelStep?.targetAmount ?? 0;
    const savingsReserve = budgetEntries
      .filter(
        (entry) =>
          entry.type === "expense" &&
          ["Savings", "Retirement", "Investing"].includes(entry.category)
      )
      .reduce((sum, entry) => sum + entry.amount, 0);
    if (keelTarget > 0 || savingsReserve > 0) {
      goalsForSheet.push({
        id: DERIVED_EMERGENCY_FUND_ID,
        name: "Emergency Fund",
        category: "emergency_fund",
        targetAmount: keelTarget,
        currentAmount: savingsReserve,
        createdAt: "",
        updatedAt: "",
      });
    }
  }

  const wb = XLSX.utils.book_new();

  const entryRows = budgetEntries.map(budgetEntryToRow);
  const entrySheet = XLSX.utils.json_to_sheet(entryRows, {
    header: [...BUDGET_ENTRY_COLUMNS],
  });
  appendTotalRow(
    entrySheet,
    entryRows,
    BUDGET_ENTRY_COLUMNS,
    SHEET_SUM_COLUMNS["Budget Entries"]
  );
  writeBudgetEntriesNetTotal(entrySheet, entryRows);
  XLSX.utils.book_append_sheet(wb, entrySheet, "Budget Entries");

  if (format === "xlsx") {
    const limitRows = budgetLimits.map(budgetLimitToRow);
    const limitsSheet = XLSX.utils.json_to_sheet(limitRows, {
      header: [...BUDGET_LIMIT_COLUMNS],
    });
    appendTotalRow(
      limitsSheet,
      limitRows,
      BUDGET_LIMIT_COLUMNS,
      SHEET_SUM_COLUMNS["Budget Limits"]
    );
    XLSX.utils.book_append_sheet(wb, limitsSheet, "Budget Limits");

    const debtRows = debts.map(debtToRow);
    const debtsSheet = XLSX.utils.json_to_sheet(debtRows, {
      header: [...DEBT_COLUMNS],
    });
    appendTotalRow(debtsSheet, debtRows, DEBT_COLUMNS, SHEET_SUM_COLUMNS["Debts"]);
    XLSX.utils.book_append_sheet(wb, debtsSheet, "Debts");

    const paymentRows = payments.map(paymentToRow);
    const paymentsSheet = XLSX.utils.json_to_sheet(paymentRows, {
      header: [...PAYMENT_COLUMNS],
    });
    appendTotalRow(
      paymentsSheet,
      paymentRows,
      PAYMENT_COLUMNS,
      SHEET_SUM_COLUMNS["Payments"]
    );
    XLSX.utils.book_append_sheet(wb, paymentsSheet, "Payments");

    const goalRows = goalsForSheet.map(savingsGoalToRow);
    const goalsSheet = XLSX.utils.json_to_sheet(goalRows, {
      header: [...SAVINGS_GOAL_COLUMNS],
    });
    appendTotalRow(
      goalsSheet,
      goalRows,
      SAVINGS_GOAL_COLUMNS,
      SHEET_SUM_COLUMNS["Savings Goals"]
    );
    XLSX.utils.book_append_sheet(wb, goalsSheet, "Savings Goals");

    const accountRows = assetAccounts.map(assetAccountToRow);
    const accountsSheet = XLSX.utils.json_to_sheet(accountRows, {
      header: [...ASSET_ACCOUNT_COLUMNS],
    });
    appendTotalRow(
      accountsSheet,
      accountRows,
      ASSET_ACCOUNT_COLUMNS,
      SHEET_SUM_COLUMNS["Asset Accounts"]
    );
    XLSX.utils.book_append_sheet(wb, accountsSheet, "Asset Accounts");
  }

  const filename = sanitizeFilename(buildFilename(format));
  const file = new ExpoFile(Paths.cache, filename);

  if (format === "csv") {
    const csv = XLSX.utils.sheet_to_csv(entrySheet);
    file.create({ overwrite: true });
    file.write(csv, { encoding: "utf8" });
  } else {
    const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" }) as string;
    file.create({ overwrite: true });
    file.write(base64, { encoding: "base64" });
  }

  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error(
      "Sharing is not available on this device. The file has been saved to the app cache."
    );
  }

  await Sharing.shareAsync(file.uri, {
    mimeType:
      format === "csv"
        ? "text/csv"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    dialogTitle: "Export BudgetArk Spreadsheet",
    UTI: format === "csv" ? "public.comma-separated-values-text" : "org.openxmlformats.spreadsheetml.sheet",
  });

  return {
    format,
    filename,
    entryCount: budgetEntries.length,
  };
};

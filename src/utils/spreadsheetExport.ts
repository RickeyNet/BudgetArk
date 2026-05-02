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

// Budget Entries is built by buildBudgetEntriesSheet — see that function
// for the per-month subtotal layout and grand-total block. The generic
// appendTotalRow doesn't apply here because income and expense are stored
// as positive amounts on different Type values, so a plain SUM of the
// Amount column would lump them together.
const SHEET_SUM_COLUMNS: Record<SheetName, readonly string[]> = {
  "Budget Entries": [],
  "Budget Limits": ["MonthlyLimit"],
  Debts: ["Balance", "OriginalBalance", "MinPayment"],
  Payments: ["Amount"],
  "Savings Goals": ["TargetAmount", "CurrentAmount"],
  "Asset Accounts": ["Balance"],
};

/**
 * Builds the Budget Entries sheet from scratch:
 *   1. Sort entries by Date ascending so months stay contiguous.
 *   2. After each month's rows, write an Income / Expense / Net subtotal
 *      block tagged with the YYYY-MM key in the Description column.
 *   3. After all months, write the same three totals as a grand total.
 *
 * The per-month split lets users cross-check the app's per-screen totals
 * (which are always for one month) without filtering or pivoting in
 * Excel themselves.
 *
 * Subtotal rows are import-safe: each one carries the "Total" sentinel in
 * the ID column and leaves Type/Category/Date blank, so spreadsheetImport's
 * rowToBudgetEntry returns null and drops them silently. Re-importing the
 * exported workbook does not duplicate or corrupt budget entries.
 *
 * Grand-total Amount cells use SUMIF formulas (plus cached numeric values)
 * so Excel/Sheets recompute live on edits and CSV export still emits real
 * numbers. Per-month subtotals use cached values only — formulas would
 * have to encode each month's exact row range, which adds complexity for
 * little gain.
 */
const buildBudgetEntriesSheet = (
  rows: ReadonlyArray<Record<string, unknown>>
): XLSX.WorkSheet => {
  const sheet: XLSX.WorkSheet = {};

  BUDGET_ENTRY_COLUMNS.forEach((col, colIdx) => {
    sheet[XLSX.utils.encode_cell({ r: 0, c: colIdx })] = { t: "s", v: col };
  });

  if (rows.length === 0) {
    sheet["!ref"] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: 0, c: BUDGET_ENTRY_COLUMNS.length - 1 },
    });
    return sheet;
  }

  const idColIdx = BUDGET_ENTRY_COLUMNS.indexOf("ID");
  const typeColIdx = BUDGET_ENTRY_COLUMNS.indexOf("Type");
  const amountColIdx = BUDGET_ENTRY_COLUMNS.indexOf("Amount");
  const descColIdx = BUDGET_ENTRY_COLUMNS.indexOf("Description");

  // Date column is YYYY-MM-DD (see formatDateOnly), so a string compare
  // sorts correctly.
  const sortedRows = [...rows].sort((a, b) =>
    String(a.Date ?? "").localeCompare(String(b.Date ?? ""))
  );

  const writeDataRow = (rowIdx: number, row: Record<string, unknown>) => {
    BUDGET_ENTRY_COLUMNS.forEach((col, colIdx) => {
      const value = row[col];
      if (value === undefined || value === null || value === "") return;
      const ref = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
      if (typeof value === "number") {
        sheet[ref] = Number.isFinite(value) ? { t: "n", v: value } : { t: "s", v: "" };
      } else {
        sheet[ref] = { t: "s", v: String(value) };
      }
    });
  };

  const writeSubtotalRow = (
    rowIdx: number,
    label: string,
    value: number,
    formula?: string
  ): void => {
    sheet[XLSX.utils.encode_cell({ r: rowIdx, c: idColIdx })] = {
      t: "s",
      v: TOTAL_LABEL,
    };
    sheet[XLSX.utils.encode_cell({ r: rowIdx, c: descColIdx })] = {
      t: "s",
      v: label,
    };
    const cell: XLSX.CellObject = { t: "n", v: value };
    if (formula) cell.f = formula;
    sheet[XLSX.utils.encode_cell({ r: rowIdx, c: amountColIdx })] = cell;
  };

  let writeIdx = 1; // 0-indexed sheet row; header at 0.
  let currentMonth: string | null = null;
  let monthIncome = 0;
  let monthExpense = 0;

  const flushMonthSubtotals = () => {
    if (currentMonth === null) return;
    writeSubtotalRow(writeIdx++, `Income Total - ${currentMonth}`, monthIncome);
    writeSubtotalRow(
      writeIdx++,
      `Expense Total - ${currentMonth}`,
      monthExpense
    );
    writeSubtotalRow(
      writeIdx++,
      `Net - ${currentMonth}`,
      monthIncome - monthExpense
    );
    monthIncome = 0;
    monthExpense = 0;
  };

  for (const row of sortedRows) {
    const dateStr = String(row.Date ?? "");
    const month = /^\d{4}-\d{2}/.test(dateStr) ? dateStr.slice(0, 7) : "Unknown";

    if (currentMonth !== null && month !== currentMonth) {
      flushMonthSubtotals();
    }
    currentMonth = month;

    writeDataRow(writeIdx++, row);

    const amount = row.Amount;
    if (typeof amount === "number" && Number.isFinite(amount)) {
      if (row.Type === "income") monthIncome += amount;
      else if (row.Type === "expense") monthExpense += amount;
    }
  }
  flushMonthSubtotals();

  // Grand total — SUMIF across the entire data + per-month-subtotal range.
  // Subtotal rows have Type blank, so SUMIF on "income"/"expense" naturally
  // skips them. The cached numeric value below mirrors that math.
  const grandIncome = sortedRows.reduce<number>((acc, row) => {
    if (row.Type !== "income") return acc;
    const amount = row.Amount;
    return typeof amount === "number" && Number.isFinite(amount) ? acc + amount : acc;
  }, 0);
  const grandExpense = sortedRows.reduce<number>((acc, row) => {
    if (row.Type !== "expense") return acc;
    const amount = row.Amount;
    return typeof amount === "number" && Number.isFinite(amount) ? acc + amount : acc;
  }, 0);

  const firstDataExcelRow = 2;
  const lastDataExcelRow = writeIdx; // writeIdx is 0-based next-row, so the
  // last filled row in 0-index = writeIdx - 1, which is writeIdx in 1-index.
  const typeColLetter = XLSX.utils.encode_col(typeColIdx);
  const amountColLetter = XLSX.utils.encode_col(amountColIdx);
  const typeRange = `${typeColLetter}${firstDataExcelRow}:${typeColLetter}${lastDataExcelRow}`;
  const amountRange = `${amountColLetter}${firstDataExcelRow}:${amountColLetter}${lastDataExcelRow}`;

  writeSubtotalRow(
    writeIdx++,
    "Income Total",
    grandIncome,
    `SUMIF(${typeRange},"income",${amountRange})`
  );
  writeSubtotalRow(
    writeIdx++,
    "Expense Total",
    grandExpense,
    `SUMIF(${typeRange},"expense",${amountRange})`
  );
  writeSubtotalRow(
    writeIdx++,
    "Net (Income - Expense)",
    grandIncome - grandExpense,
    `SUMIF(${typeRange},"income",${amountRange})-SUMIF(${typeRange},"expense",${amountRange})`
  );

  sheet["!ref"] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: writeIdx - 1, c: BUDGET_ENTRY_COLUMNS.length - 1 },
  });

  return sheet;
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

  // Budget Entries is built by hand (not via json_to_sheet + appendTotalRow)
  // so we can sort by date, interleave per-month Income / Expense / Net
  // subtotals, and finish with a grand-total block. See buildBudgetEntriesSheet.
  const entryRows = budgetEntries.map(budgetEntryToRow);
  const entrySheet = buildBudgetEntriesSheet(entryRows);
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

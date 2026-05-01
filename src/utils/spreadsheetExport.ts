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
  const [budgetEntries, budgetLimits, debts, payments, savingsGoals, assetAccounts] =
    await Promise.all([
      getBudgetEntries(),
      getCategoryBudgetLimits(),
      getDebts(),
      getPayments(),
      getSavingsGoals(),
      getAssetAccounts(),
    ]);

  const wb = XLSX.utils.book_new();

  const entrySheet = XLSX.utils.json_to_sheet(budgetEntries.map(budgetEntryToRow), {
    header: [...BUDGET_ENTRY_COLUMNS],
  });
  XLSX.utils.book_append_sheet(wb, entrySheet, "Budget Entries");

  if (format === "xlsx") {
    const limitsSheet = XLSX.utils.json_to_sheet(budgetLimits.map(budgetLimitToRow), {
      header: [...BUDGET_LIMIT_COLUMNS],
    });
    XLSX.utils.book_append_sheet(wb, limitsSheet, "Budget Limits");

    const debtsSheet = XLSX.utils.json_to_sheet(debts.map(debtToRow), {
      header: [...DEBT_COLUMNS],
    });
    XLSX.utils.book_append_sheet(wb, debtsSheet, "Debts");

    const paymentsSheet = XLSX.utils.json_to_sheet(payments.map(paymentToRow), {
      header: [...PAYMENT_COLUMNS],
    });
    XLSX.utils.book_append_sheet(wb, paymentsSheet, "Payments");

    const goalsSheet = XLSX.utils.json_to_sheet(savingsGoals.map(savingsGoalToRow), {
      header: [...SAVINGS_GOAL_COLUMNS],
    });
    XLSX.utils.book_append_sheet(wb, goalsSheet, "Savings Goals");

    const accountsSheet = XLSX.utils.json_to_sheet(
      assetAccounts.map(assetAccountToRow),
      { header: [...ASSET_ACCOUNT_COLUMNS] }
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

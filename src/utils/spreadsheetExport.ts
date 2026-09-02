/**
 * BudgetArk - Spreadsheet Export Utility
 * File: src/utils/spreadsheetExport.ts
 *
 * Exports user data to .csv or .xlsx via expo-file-system + expo-sharing.
 *
 * CSV: budget entries only (single-sheet format).
 * XLSX: multi-sheet workbook (Budget Entries, Budget Limits, Debts, Payments,
 * Savings Goals, Asset Accounts, Holdings).
 *
 * Schema is documented in SPREADSHEET_SCHEMA.md and is round-trip safe with
 * spreadsheetImport.ts - column headers must not change without bumping the
 * schema version in both files.
 */

import { entryPersonIds, formatPersonNames } from "./entryPeople";
import * as XLSX from "xlsx";
import { File as ExpoFile, Paths } from "expo-file-system";
import { Platform } from "react-native";
import { waitForIosModalTeardown } from "./iosNativeShare";
import { deleteLocalFileQuietly, shareLocalFileThenDelete } from "./shareTempFile";
import { roundToCents } from "./money";
import { getDebts, getPayments } from "../storage/debtStorage";
import {
  getBudgetEntries,
  getCategoryBudgetLimits,
} from "../storage/budgetStorage";
import { getSavingsGoals } from "../storage/savingsGoalStorage";
import { getAssetAccounts } from "../storage/assetAccountStorage";
import { getHoldings } from "../storage/holdingsStorage";
import { getBusinesses } from "../storage/businessStorage";
import { getPeople } from "../storage/personStorage";
import { getDebtMilestonePlan } from "../storage/debtMilestoneStorage";
import { recordBackup } from "../storage/backupReminderStorage";
import { CURRENT_APP_VERSION } from "../data/releaseNotes";
import {
  AssetAccount,
  BudgetEntry,
  Business,
  Person,
  CategoryBudgetLimit,
  DebtMilestonePlan,
  Debt,
  Holding,
  Payment,
  SavingsGoal,
} from "../types";
import { getRecurrenceInterval } from "./recurrence";
import { getEmergencyFundSource } from "./emergencyFund";

export type SpreadsheetFormat = "csv" | "xlsx";

/**
 * Schema version. Bump if column shape changes incompatibly.
 * v2 (1.10): Budget Entries gained BusinessId (round-trip) + Business
 * (readable name, export-only); new Businesses sheet in xlsx workbooks.
 * v3: Budget Entries gained IncomeType / Retirement401k / TaxSetAsideRate
 * (all round-trip; blank for expenses and plain income).
 * v4: Budget Entries gained Private ("yes"/blank, round-trip) - the
 * partner-sync privacy flag. Stripping it on a backup/restore cycle would
 * silently start syncing an entry the user marked private, so
 * round-tripping it is a privacy requirement, not convenience.
 * v5: Budget Entries gained PersonId (round-trip) + Person (readable name,
 * export-only) - who the spending is assigned to; new People sheet in xlsx
 * workbooks (same shape as Businesses).
 * v6: Asset Accounts gained EmergencyFund ("yes"/blank, round-trip) - marks
 * savings accounts designated as the emergency fund. Stripping it on a
 * backup/restore cycle would silently flip the fund back to manual goal
 * tracking, so it must round-trip.
 * Older files still import - the new columns are simply absent.
 * v7: Budget Entries gained PersonIds (";"-joined, round-trip) - every person
 * a shared expense is assigned to; PersonId stays the FIRST of them so v5/v6
 * importers still see one assignee, and Person lists every name.
 * v8: Budget Entries gained FulfillsBillId (round-trip) - the recurring bill
 * an actual charge stands in for. Stripping it on a backup/restore cycle
 * would put the estimate back next to the actual and double-count the bill,
 * so it must round-trip. Projected recurring copies are also omitted for
 * months an actual covers, matching what the app shows.
 */
export const SPREADSHEET_SCHEMA_VERSION = 8;

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

/**
 * Sentinel ID prefix for projected copies of recurring budget entries written
 * to the Budget Entries sheet. The app treats `recurring: true` entries as
 * appearing in every month from their start month onward (see
 * BudgetScreen.isRecurringInMonth), but we only persist the original row.
 * Without expansion, an export shows a recurring paycheck in its start month
 * only, so per-month income subtotals collapse to zero after that.
 *
 * spreadsheetImport drops rows whose ID begins with this prefix, so projected
 * copies don't multiply the original entry on round-trip.
 */
export const DERIVED_RECURRING_PREFIX = "__projected_recurring__:";

/* ── Sheet column definitions (single source of truth, mirrored in import) ── */

const BUDGET_ENTRY_COLUMNS = [
  "ID",
  "Date",
  "Type",
  "Category",
  "Amount",
  "Description",
  "Recurring",
  // Months between repeats when Recurring="yes": 1 (monthly), 3 (quarterly),
  // 6 (semiannual), 12 (yearly). Blank for non-recurring rows. Round-tripped
  // so re-importing the exported workbook preserves the cadence.
  "RecurrenceInterval",
  // Optional payment URL for recurring expenses paid online (utility portal,
  // trash service billing, etc.). Validator gates on http(s) only; blank for
  // non-recurring rows or entries without a saved link.
  "PaymentUrl",
  "LinkedAccountId",
  // Year-month key (YYYY-MM) of the last month a recurring entry was applied
  // to its linked AssetAccount. The app uses it to avoid double-applying the
  // monthly delta on subsequent BudgetScreen opens; if it's lost on import
  // the asset balance gets re-credited for every month between the entry's
  // start and today. Round-tripping this column is therefore required for
  // data integrity, not just convenience.
  "LastAppliedMonth",
  // Bank-connection provenance. ExternalTxId is the dedup identity of an
  // imported bank transaction - if it's stripped on a backup/restore cycle,
  // the next connections sync re-offers every transaction the user already
  // approved. Round-tripping these three columns is data integrity, not
  // convenience. Blank for manual entries.
  "Source",
  "ExternalTxId",
  "Merchant",
  // Business the expense is tagged with. BusinessId round-trips (it's the
  // reference entries carry); Business is the human-readable name at export
  // time and is IGNORED on import - renames must not fork identities.
  "BusinessId",
  "Business",
  // People the spending is assigned to. Same contract as Business above:
  // PersonId round-trips, Person is the readable name(s) and IGNORED on
  // import. PersonIds (v7) carries EVERY assignee of a shared expense,
  // ";"-joined; PersonId stays the first so older importers see one person.
  "PersonId",
  "PersonIds",
  "Person",
  // W-2 / 1099 paycheck fields. IncomeType is "w2" or "1099" (blank for
  // expenses and plain income). Retirement401k is the 401(k) dollars
  // withheld from a W-2 paycheck; TaxSetAsideRate is the percent of a 1099
  // payment reserved for taxes. All three round-trip so a backup/restore
  // cycle doesn't strip the user's paycheck tracking.
  "IncomeType",
  "Retirement401k",
  "TaxSetAsideRate",
  // Partner-sync privacy flag: "yes" = never sent to the paired partner.
  // Round-tripped as a privacy requirement - if a backup/restore cycle
  // stripped it, the entry would silently start syncing again.
  "Private",
  // Recurring bill this one-off is the actual charge for (see
  // BudgetEntry.fulfillsRecurringId). Round-tripped: without it a restore
  // would count both the estimate and the actual in that month.
  "FulfillsBillId",
  // ISO timestamp the entry was created. Round-tripped so re-importing an
  // exported file doesn't reset history.
  "CreatedAt",
  // ISO timestamp of last edit. Critical for paired-device sync: without it
  // the importer stamps every entry with import-time `now`, and the next
  // sync treats every row as "freshly edited" and overwrites the partner's
  // data via last-write-wins. See Potentialbugs.md P0 #6.
  "UpdatedAt",
] as const;

// UpdatedAt is round-tripped for the same reason as the other entities: the
// importer preserves it so paired-device sync's LWW doesn't treat every
// imported row as freshly edited and clobber the partner's data.
const BUDGET_LIMIT_COLUMNS = ["Category", "MonthlyLimit", "UpdatedAt"] as const;

// CreatedAt + UpdatedAt are round-tripped on every entity for the same
// reason as Budget Entries: the importer must preserve `updatedAt`, or
// the next paired sync treats every imported row as freshly edited and
// overwrites the partner's data via last-write-wins.
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
  "PaymentDueDay",
  // Card keep-alive watch (credit cards only). Must round-trip: on an
  // updatedAt tie the importer's merge takes the incoming row, so a
  // re-imported workbook without these columns silently switched the watch
  // OFF for every card. "yes"/"no" so an explicit off survives too.
  "KeepAlive",
  "KeepAliveWindowMonths",
  "KeepAliveLeadDays",
  "KeepAliveLastUsedAt",
  "CreatedAt",
  "UpdatedAt",
] as const;

// AppliedAmount is the slice of Amount that actually reduced the balance
// (an overpayment is clamped at zero). Deleting a payment adds back only
// this delta; without the column a round-tripped payment restores the full
// Amount and the balance can end up higher than was ever owed.
const PAYMENT_COLUMNS = [
  "ID",
  "DebtID",
  "Amount",
  "AppliedAmount",
  "Date",
  "UpdatedAt",
] as const;

const SAVINGS_GOAL_COLUMNS = [
  "ID",
  "Name",
  "Category",
  "TargetAmount",
  "CurrentAmount",
  "TargetDate",
  "Priority",
  "CreatedAt",
  "UpdatedAt",
] as const;

const ASSET_ACCOUNT_COLUMNS = [
  "ID",
  "Name",
  "Category",
  "Balance",
  // "yes" marks a savings account designated as (part of) the emergency
  // fund. Must round-trip: dropping it on a backup/restore cycle would
  // silently flip the emergency fund back to manual goal tracking.
  "EmergencyFund",
  "CreatedAt",
  "UpdatedAt",
] as const;

// Live prices are NOT exported - only the position itself. Prices live in a
// per-device cache and re-fetch on demand, so a spreadsheet round-trips the
// holding without ever carrying a market value. Three shapes share the
// sheet, told apart by which optional columns are filled:
//   ticker  - Symbol + Shares (+ CostBasis)
//   proxy   - Symbol (the proxy ticker) + Name + AnchorValue + AnchorPrice
//   manual  - Name + ManualValue, no Symbol
// AccountId links the position to its broker AssetAccount; dropping it on a
// round-trip orphaned every holding from the Bridge's account grouping.
const HOLDING_COLUMNS = [
  "ID",
  "Symbol",
  "Shares",
  "CostBasis",
  "Name",
  "ManualValue",
  "AnchorValue",
  "AnchorPrice",
  "AccountId",
  "CreatedAt",
  "UpdatedAt",
] as const;

// Live businesses only - tombstones stay in the JSON backup (the lossless
// path); a human-facing spreadsheet listing deleted clients is just noise.
const BUSINESS_COLUMNS = ["ID", "Name", "CreatedAt", "UpdatedAt"] as const;

// Same live-only rationale as businesses.
const PERSON_COLUMNS = ["ID", "Name", "CreatedAt", "UpdatedAt"] as const;

/* ── Row builders - convert app types to flat row objects ── */

const formatDateOnly = (iso: string): string => {
  if (!iso) return "";
  const idx = iso.indexOf("T");
  return idx > 0 ? iso.slice(0, idx) : iso;
};

/**
 * Parses a YYYY-MM-DD string into a JS Date pinned to local noon. Local noon
 * sidesteps DST/timezone edge cases that would otherwise let the date display
 * shift by a day depending on the user's locale, while still producing the
 * expected serial number for Excel's date system.
 *
 * Returns undefined for empty / unparseable input so the caller can leave the
 * cell blank.
 */
const toExcelDate = (yyyymmdd: string): Date | undefined => {
  if (!yyyymmdd) return undefined;
  const m = yyyymmdd.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return undefined;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
};

/**
 * Converts string-typed YYYY-MM-DD cells in the listed columns into native
 * Excel date cells (t:"d") with a yyyy-mm-dd display format. Used after
 * json_to_sheet to give the user real date columns they can sort/filter
 * with, instead of left-aligned text dates.
 *
 * Cells that are already typed (numeric, date, etc.) or that don't match the
 * date pattern are left alone - the Total row label, blank cells, and CSV-
 * style numeric inputs all pass through untouched.
 */
const promoteStringDateCells = (
  sheet: XLSX.WorkSheet,
  columns: readonly string[],
  dateColumnNames: readonly string[]
): void => {
  if (!sheet["!ref"]) return;
  const range = XLSX.utils.decode_range(sheet["!ref"]);
  for (const dateColName of dateColumnNames) {
    const colIdx = columns.indexOf(dateColName);
    if (colIdx === -1) continue;
    for (let r = 1; r <= range.e.r; r++) {
      const cellRef = XLSX.utils.encode_cell({ r, c: colIdx });
      const cell = sheet[cellRef];
      if (!cell || cell.t !== "s" || typeof cell.v !== "string") continue;
      const dateObj = toExcelDate(cell.v);
      if (!dateObj) continue;
      sheet[cellRef] = {
        t: "d",
        v: dateObj,
        z: "yyyy-mm-dd",
        w: cell.v.slice(0, 10),
      };
    }
  }
};

const budgetEntryToRow = (
  entry: BudgetEntry,
  businessNameById?: Map<string, string>,
  personNameById?: Map<string, string>
) => ({
  ID: entry.id,
  Date: formatDateOnly(entry.date),
  Type: entry.type,
  Category: entry.category,
  Amount: entry.amount,
  Description: entry.description ?? "",
  Recurring: entry.recurring ? "yes" : "no",
  RecurrenceInterval: entry.recurring ? getRecurrenceInterval(entry) : "",
  PaymentUrl: entry.paymentUrl ?? "",
  LinkedAccountId: entry.linkedAccountId ?? "",
  LastAppliedMonth: entry.lastAppliedMonth ?? "",
  Source: entry.source ?? "",
  ExternalTxId: entry.externalTxId ?? "",
  Merchant: entry.merchant ?? "",
  BusinessId: entry.businessId ?? "",
  // Readable name, export-only. A dangling id (business deleted) shows
  // "(deleted)" so tax-time filtering still groups those rows visibly.
  Business: entry.businessId
    ? businessNameById?.get(entry.businessId) ?? "(deleted)"
    : "",
  PersonId: entry.personId ?? "",
  PersonIds:
    entryPersonIds(entry).length > 1 ? entryPersonIds(entry).join(";") : "",
  // Readable names, export-only - same "(deleted)" convention as Business.
  Person: entry.personId
    ? formatPersonNames(entryPersonIds(entry), personNameById ?? new Map())
    : "",
  IncomeType: entry.incomeType ?? "",
  Retirement401k: entry.retirementContribution ?? "",
  TaxSetAsideRate: entry.taxSetAsideRate ?? "",
  Private: entry.isPrivate ? "yes" : "",
  FulfillsBillId: entry.fulfillsRecurringId ?? "",
  CreatedAt: entry.createdAt ?? "",
  UpdatedAt: entry.updatedAt ?? "",
});

const budgetLimitToRow = (limit: CategoryBudgetLimit) => ({
  Category: limit.category,
  MonthlyLimit: limit.monthlyLimit,
  UpdatedAt: limit.updatedAt ?? "",
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
  PaymentDueDay: debt.paymentDueDay ?? "",
  KeepAlive:
    debt.keepAliveEnabled === undefined ? "" : debt.keepAliveEnabled ? "yes" : "no",
  KeepAliveWindowMonths: debt.keepAliveWindowMonths ?? "",
  KeepAliveLeadDays: debt.keepAliveLeadDays ?? "",
  // Kept verbatim (full ISO or date-only) - not promoted to an Excel date
  // cell, so the stamp's precision survives the trip.
  KeepAliveLastUsedAt: debt.keepAliveLastUsedAt ?? "",
  CreatedAt: debt.createdAt,
  UpdatedAt: debt.updatedAt ?? "",
});

const paymentToRow = (payment: Payment) => ({
  ID: payment.id,
  DebtID: payment.debtId,
  Amount: payment.amount,
  AppliedAmount: payment.appliedAmount ?? "",
  Date: formatDateOnly(payment.date),
  UpdatedAt: payment.updatedAt ?? "",
});

const savingsGoalToRow = (goal: SavingsGoal) => ({
  ID: goal.id,
  Name: goal.name,
  Category: goal.category,
  TargetAmount: goal.targetAmount,
  CurrentAmount: goal.currentAmount,
  TargetDate: goal.targetDate ? formatDateOnly(goal.targetDate) : "",
  // Purchase planner "My order" rank (0 = first); blank when never ranked.
  Priority: goal.priority ?? "",
  CreatedAt: goal.createdAt,
  UpdatedAt: goal.updatedAt ?? "",
});

const assetAccountToRow = (account: AssetAccount) => ({
  ID: account.id,
  Name: account.name,
  Category: account.category,
  Balance: account.balance,
  EmergencyFund: account.isEmergencyFund === true ? "yes" : "",
  CreatedAt: account.createdAt,
  UpdatedAt: account.updatedAt ?? "",
});

const holdingToRow = (holding: Holding) => ({
  ID: holding.id,
  Symbol: holding.symbol,
  Shares: holding.shares,
  CostBasis: holding.costBasis ?? "",
  Name: holding.name ?? "",
  ManualValue: holding.manualValue ?? "",
  AnchorValue: holding.anchorValue ?? "",
  AnchorPrice: holding.anchorPrice ?? "",
  AccountId: holding.accountId ?? "",
  CreatedAt: holding.createdAt,
  UpdatedAt: holding.updatedAt ?? "",
});

const businessToRow = (business: Business) => ({
  ID: business.id,
  Name: business.name,
  CreatedAt: business.createdAt,
  UpdatedAt: business.updatedAt ?? "",
});

const personToRow = (person: Person) => ({
  ID: person.id,
  Name: person.name,
  CreatedAt: person.createdAt,
  UpdatedAt: person.updatedAt ?? "",
});

/* ── Total row ──
 *
 * Each sheet ends with a "Total" row: "Total" label in column A, SUM formulas
 * in the configured numeric columns. Both `f` (formula) and `v` (cached sum)
 * are set so Excel/Sheets recompute live, and so sheet_to_csv (which reads `v`,
 * not `f`) still emits a real number.
 *
 * The label sits in the first column of every sheet by design - that column is
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
  | "Asset Accounts"
  | "Holdings";

// Budget Entries is built by buildBudgetEntriesSheet - see that function
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
  // Shares can't be summed across different tickers; only CostBasis (dollars)
  // is meaningfully additive.
  Holdings: ["CostBasis"],
};

/**
 * Expands recurring entries across the full reporting window so per-month
 * income/expense subtotals match what the app shows on each month's screen.
 *
 * The app treats a `recurring: true` entry as appearing in every month from
 * its start month onward (see BudgetScreen.isRecurringInMonth). The exporter
 * persists only the original row, so without this expansion a recurring
 * paycheck would show up in the start month only and every later month would
 * report $0 income.
 *
 * Window:
 *   start  = the recurring entry's own month
 *   end    = max(latest month seen in data, current month)
 *
 * Projected copies use:
 *   - a sentinel ID prefixed with DERIVED_RECURRING_PREFIX so they are
 *     dropped on import (no duplication on round-trip)
 *   - a date in the projected month with the original day-of-month, clamped
 *     to that month's last valid day (Jan 31 → Feb 28 / Feb 29)
 */
const expandRecurringRows = (
  rows: readonly Record<string, unknown>[]
): Record<string, unknown>[] => {
  if (rows.length === 0) return [];

  const monthsInData: string[] = [];
  for (const row of rows) {
    const dateStr = String(row.Date ?? "");
    if (/^\d{4}-\d{2}/.test(dateStr)) monthsInData.push(dateStr.slice(0, 7));
  }
  if (monthsInData.length === 0) return [...rows];

  monthsInData.sort();
  const latestMonth = monthsInData[monthsInData.length - 1];
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const endMonth = latestMonth > currentMonth ? latestMonth : currentMonth;

  const addMonths = (ym: string, count: number): string => {
    const [yStr, mStr] = ym.split("-");
    let y = Number(yStr);
    let m = Number(mStr) + count;
    while (m > 12) {
      m -= 12;
      y += 1;
    }
    return `${y}-${String(m).padStart(2, "0")}`;
  };

  // last day of a YYYY-MM (1-indexed month)
  const lastDayOfMonth = (ym: string): number => {
    const [yStr, mStr] = ym.split("-");
    return new Date(Number(yStr), Number(mStr), 0).getDate();
  };

  // Months an actual charge already covers, per bill id: the projected copy
  // for those months is skipped so the sheet matches the app (estimate OR
  // actual, never both).
  const fulfilledMonths = new Map<string, Set<string>>();
  for (const row of rows) {
    const billId = String(row.FulfillsBillId ?? "");
    const dateStr = String(row.Date ?? "");
    if (!billId || row.Recurring === "yes" || !/^\d{4}-\d{2}/.test(dateStr)) continue;
    const months = fulfilledMonths.get(billId) ?? new Set<string>();
    months.add(dateStr.slice(0, 7));
    fulfilledMonths.set(billId, months);
  }

  const out: Record<string, unknown>[] = [];
  for (const row of rows) {
    out.push(row);
    if (row.Recurring !== "yes") continue;
    const dateStr = String(row.Date ?? "");
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) continue;
    const startMonth = `${match[1]}-${match[2]}`;
    const day = Number(match[3]);
    if (startMonth >= endMonth) continue;

    const rawInterval = Number(row.RecurrenceInterval);
    const interval =
      rawInterval === 3 || rawInterval === 6 || rawInterval === 12 ? rawInterval : 1;

    const baseId = String(row.ID ?? "");
    const covered = fulfilledMonths.get(baseId);
    let m = addMonths(startMonth, interval);
    while (m <= endMonth) {
      if (!covered?.has(m)) {
        const dd = String(Math.min(day, lastDayOfMonth(m))).padStart(2, "0");
        out.push({
          ...row,
          ID: `${DERIVED_RECURRING_PREFIX}${baseId}:${m}`,
          Date: `${m}-${dd}`,
        });
      }
      m = addMonths(m, interval);
    }
  }
  return out;
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
 * Both per-month subtotals and the grand-total block use live formulas
 * (SUMIFS for per-month, SUMIF for grand) plus cached numeric values, so
 * editing an Amount cell in the spreadsheet recalculates both blocks in
 * lockstep. Per-month formulas filter on the Date column with a YYYY-MM-01
 * to YYYY-(MM+1)-01 range; subtotal rows have a blank Date and are
 * naturally excluded from the per-month and grand-total ranges they sit in.
 */
const buildBudgetEntriesSheet = (
  rows: readonly Record<string, unknown>[]
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
  const dateColIdx = BUDGET_ENTRY_COLUMNS.indexOf("Date");
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
      if (col === "Date" && typeof value === "string") {
        // Promote YYYY-MM-DD strings to native Excel date cells so users
        // get real date sorting/filtering. The SUMIFS month-bucket
        // formulas rely on this typing too - they compare against
        // DATE(...) serial values, not text.
        const dateObj = toExcelDate(value);
        sheet[ref] = dateObj
          ? { t: "d", v: dateObj, z: "yyyy-mm-dd", w: value.slice(0, 10) }
          : { t: "s", v: value };
        return;
      }
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
    // Round the CACHED value: it's what the CSV serializes and what Excel
    // shows before recalculating, and the float accumulation upstream can
    // carry binary artifacts (6180.049999999999) into the user's export.
    const cell: XLSX.CellObject = { t: "n", v: roundToCents(value) };
    if (formula) cell.f = formula;
    sheet[XLSX.utils.encode_cell({ r: rowIdx, c: amountColIdx })] = cell;
  };

  let writeIdx = 1; // 0-indexed sheet row; header at 0.
  let currentMonth: string | null = null;
  let monthIncome = 0;
  let monthExpense = 0;

  // Per-month subtotal cells get tracked here and have their formulas
  // patched in after the data loop, once we know the final data range
  // (firstDataExcelRow .. lastDataExcelRow). Tracking by row index lets the
  // formulas reference the full data range - Excel doesn't care about
  // evaluation order, only that the range is valid when the file is opened.
  type MonthSubtotal = {
    row0: number; // 0-indexed sheet row of the Amount cell
    monthKey: string;
    kind: "income" | "expense" | "net";
  };
  const monthSubtotals: MonthSubtotal[] = [];

  const flushMonthSubtotals = () => {
    if (currentMonth === null) return;
    writeSubtotalRow(writeIdx, `Income Total - ${currentMonth}`, monthIncome);
    monthSubtotals.push({ row0: writeIdx, monthKey: currentMonth, kind: "income" });
    writeIdx++;
    writeSubtotalRow(writeIdx, `Expense Total - ${currentMonth}`, monthExpense);
    monthSubtotals.push({ row0: writeIdx, monthKey: currentMonth, kind: "expense" });
    writeIdx++;
    writeSubtotalRow(writeIdx, `Net - ${currentMonth}`, monthIncome - monthExpense);
    monthSubtotals.push({ row0: writeIdx, monthKey: currentMonth, kind: "net" });
    writeIdx++;
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

  // Grand total - SUMIF across the entire data + per-month-subtotal range.
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
  const dateColLetter = XLSX.utils.encode_col(dateColIdx);
  const typeColLetter = XLSX.utils.encode_col(typeColIdx);
  const amountColLetter = XLSX.utils.encode_col(amountColIdx);
  const typeRange = `${typeColLetter}${firstDataExcelRow}:${typeColLetter}${lastDataExcelRow}`;
  const amountRange = `${amountColLetter}${firstDataExcelRow}:${amountColLetter}${lastDataExcelRow}`;
  const dateRange = `${dateColLetter}${firstDataExcelRow}:${dateColLetter}${lastDataExcelRow}`;

  // Patch per-month subtotal Amount cells with live SUMIFS formulas now
  // that we know the full data range. Date cells are typed as Excel dates
  // (serial numbers), so the criteria use DATE(y,m,1) to do a numeric
  // comparison - text comparisons would silently fail against date-typed
  // cells. "Unknown" buckets stay as cached values only - there's no
  // valid month to anchor a DATE() range on.
  const nextMonthYM = (ym: string): { year: number; month: number } => {
    const [yStr, mStr] = ym.split("-");
    let y = Number(yStr);
    let m = Number(mStr) + 1;
    if (m > 12) {
      y += 1;
      m = 1;
    }
    return { year: y, month: m };
  };
  for (const sub of monthSubtotals) {
    if (sub.monthKey === "Unknown") continue;
    const [yStr, mStr] = sub.monthKey.split("-");
    const startY = Number(yStr);
    const startM = Number(mStr);
    const { year: nextY, month: nextM } = nextMonthYM(sub.monthKey);
    const startDate = `DATE(${startY},${startM},1)`;
    const nextDate = `DATE(${nextY},${nextM},1)`;
    const incomeFormula = `SUMIFS(${amountRange},${typeRange},"income",${dateRange},">="&${startDate},${dateRange},"<"&${nextDate})`;
    const expenseFormula = `SUMIFS(${amountRange},${typeRange},"expense",${dateRange},">="&${startDate},${dateRange},"<"&${nextDate})`;
    const cellRef = XLSX.utils.encode_cell({ r: sub.row0, c: amountColIdx });
    const cell = sheet[cellRef];
    if (!cell) continue;
    if (sub.kind === "income") cell.f = incomeFormula;
    else if (sub.kind === "expense") cell.f = expenseFormula;
    else cell.f = `${incomeFormula}-${expenseFormula}`;
  }

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
  rows: readonly Record<string, unknown>[],
  columns: readonly string[],
  sumColumns: readonly string[],
  options?: {
    /**
     * When set, rows whose first-column value (column A) equals this string
     * are excluded from both the cached sum and the SUMIF formula. Used to
     * keep the synthetic Emergency Fund row out of the Savings Goals total
     * - otherwise the totals shift depending on whether the user has an
     * explicit emergency_fund goal or only the Keel-derived synthetic one.
     */
    excludeFirstColumnEquals?: string;
  }
): void => {
  if (rows.length === 0) return;

  const totalRowIdx = rows.length + 1; // 0-indexed: header at 0, data 1..N, total at N+1
  const firstDataExcelRow = 2;
  const lastDataExcelRow = rows.length + 1;
  const excludeValue = options?.excludeFirstColumnEquals;
  const idColumnName = columns[0];
  const idColLetter = XLSX.utils.encode_col(0);
  const idRange = `${idColLetter}${firstDataExcelRow}:${idColLetter}${lastDataExcelRow}`;

  columns.forEach((colName, colIdx) => {
    const cellRef = XLSX.utils.encode_cell({ r: totalRowIdx, c: colIdx });
    if (colIdx === 0) {
      sheet[cellRef] = { t: "s", v: TOTAL_LABEL };
      return;
    }
    if (!sumColumns.includes(colName)) return;

    const colLetter = XLSX.utils.encode_col(colIdx);
    const sumRange = `${colLetter}${firstDataExcelRow}:${colLetter}${lastDataExcelRow}`;
    const sum = rows.reduce<number>((acc, row) => {
      if (excludeValue !== undefined && row[idColumnName] === excludeValue) {
        return acc;
      }
      const v = row[colName];
      return typeof v === "number" && Number.isFinite(v) ? acc + v : acc;
    }, 0);
    const formula =
      excludeValue !== undefined
        ? `SUMIF(${idRange},"<>"&"${excludeValue}",${sumRange})`
        : `SUM(${sumRange})`;
    sheet[cellRef] = {
      t: "n",
      v: sum,
      f: formula,
    };
  });

  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1");
  range.e.r = Math.max(range.e.r, totalRowIdx);
  range.e.c = Math.max(range.e.c, columns.length - 1);
  sheet["!ref"] = XLSX.utils.encode_range(range);
};

/**
 * Excel/Sheets execute a CSV cell that begins with =, +, -, or @ as a live
 * formula on open (CWE-1236) - a budget entry described as
 * "=HYPERLINK(...)" or "@SUM(...)" becomes code on whatever machine the
 * shared file lands on. Prefixing a single quote makes spreadsheet apps
 * treat the cell as text.
 *
 * CSV path only. String cells alone are guarded: numeric cells (negative
 * amounts included) serialize from `v` as numbers, and XLSX string cells
 * are explicitly typed in the binary format, so neither can be interpreted
 * as a formula. Returns a shallow copy so the workbook's shared sheet
 * object stays pristine.
 */
const escapeCsvFormulaCells = (sheet: XLSX.WorkSheet): XLSX.WorkSheet => {
  const out: XLSX.WorkSheet = {};
  for (const [ref, cell] of Object.entries(sheet)) {
    const c = cell as XLSX.CellObject;
    if (
      !ref.startsWith("!") &&
      c &&
      c.t === "s" &&
      typeof c.v === "string" &&
      /^[=+\-@]/.test(c.v)
    ) {
      // Drop the cached display text (`w`) too - sheet_to_csv prefers it
      // over `v`, which would silently bypass the guard.
      out[ref] = { t: "s", v: `'${c.v}` };
    } else {
      out[ref] = cell;
    }
  }
  return out;
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
  partial: boolean;
  missingSections: string[];
}

export interface SpreadsheetExportOptions {
  /**
   * Optional hook that runs after the export file has been written but before
   * the native share sheet is presented.
   */
  beforeShare?: () => void | Promise<void>;
}

const DATA_LOAD_TIMEOUT_MS = 12000;
const BEFORE_SHARE_TIMEOUT_MS = 2000;

const nowMs = (): number => Date.now();

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(message));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

/**
 * Builds the workbook, writes it to a cache file, and opens the share sheet.
 *
 * @param format - "csv" (budget entries only) or "xlsx" (full multi-sheet workbook)
 */
export const exportSpreadsheet = async (
  format: SpreadsheetFormat,
  options: SpreadsheetExportOptions = {}
): Promise<SpreadsheetExportResult> => {
  const runId = `${nowMs().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  // Dev-only timing/phase trace (no amounts, names or PII - see rule 14).
  // `typeof` guard: this module also runs under Jest/Node, where the RN
  // `__DEV__` global isn't defined.
  const devLogging = typeof __DEV__ !== "undefined" && __DEV__;
  const log = (phase: string, detail?: string) => {
    if (!devLogging) return;
    const suffix = detail ? ` ${detail}` : "";
    console.info(`[spreadsheetExport:${runId}] ${phase}${suffix}`);
  };

  log("start", `platform=${Platform.OS} format=${format}`);

  const missingSections = new Set<string>();
  const markMissingSection = (name: string) => {
    missingSections.add(name);
  };

  const loadStartedAt = nowMs();
  const [
    budgetEntriesResult,
    budgetLimitsResult,
    debtsResult,
    paymentsResult,
    savingsGoalsResult,
    assetAccountsResult,
    holdingsResult,
    milestonePlanResult,
    businessesResult,
    peopleResult,
  ] = await Promise.allSettled([
    withTimeout(
      getBudgetEntries(),
      DATA_LOAD_TIMEOUT_MS,
      "Timed out loading budget entries for export."
    ),
    withTimeout(
      getCategoryBudgetLimits(),
      DATA_LOAD_TIMEOUT_MS,
      "Timed out loading budget limits for export."
    ),
    withTimeout(getDebts(), DATA_LOAD_TIMEOUT_MS, "Timed out loading debts for export."),
    withTimeout(
      getPayments(),
      DATA_LOAD_TIMEOUT_MS,
      "Timed out loading payments for export."
    ),
    withTimeout(
      getSavingsGoals(),
      DATA_LOAD_TIMEOUT_MS,
      "Timed out loading savings goals for export."
    ),
    withTimeout(
      getAssetAccounts(),
      DATA_LOAD_TIMEOUT_MS,
      "Timed out loading asset accounts for export."
    ),
    withTimeout(
      getHoldings(),
      DATA_LOAD_TIMEOUT_MS,
      "Timed out loading holdings for export."
    ),
    withTimeout(
      getDebtMilestonePlan(),
      DATA_LOAD_TIMEOUT_MS,
      "Timed out loading milestone plan for export."
    ),
    withTimeout(
      getBusinesses(),
      DATA_LOAD_TIMEOUT_MS,
      "Timed out loading businesses for export."
    ),
    withTimeout(
      getPeople(),
      DATA_LOAD_TIMEOUT_MS,
      "Timed out loading people for export."
    ),
  ]);
  log("data-loaded", `ms=${nowMs() - loadStartedAt}`);

  const budgetEntries =
    budgetEntriesResult.status === "fulfilled"
      ? budgetEntriesResult.value
      : (markMissingSection("Budget Entries"), [] as BudgetEntry[]);
  const budgetLimits =
    budgetLimitsResult.status === "fulfilled"
      ? budgetLimitsResult.value
      : (markMissingSection("Budget Limits"), [] as CategoryBudgetLimit[]);
  const debts =
    debtsResult.status === "fulfilled"
      ? debtsResult.value
      : (markMissingSection("Debts"), [] as Debt[]);
  const payments =
    paymentsResult.status === "fulfilled"
      ? paymentsResult.value
      : (markMissingSection("Payments"), [] as Payment[]);
  const savingsGoals =
    savingsGoalsResult.status === "fulfilled"
      ? savingsGoalsResult.value
      : (markMissingSection("Savings Goals"), [] as SavingsGoal[]);
  const assetAccounts =
    assetAccountsResult.status === "fulfilled"
      ? assetAccountsResult.value
      : (markMissingSection("Asset Accounts"), [] as AssetAccount[]);
  const holdings =
    holdingsResult.status === "fulfilled"
      ? holdingsResult.value
      : (markMissingSection("Holdings"), [] as Holding[]);
  const milestonePlan: DebtMilestonePlan | null =
    milestonePlanResult.status === "fulfilled" ? milestonePlanResult.value : null;
  const businesses =
    businessesResult.status === "fulfilled"
      ? businessesResult.value
      : (markMissingSection("Businesses"), [] as Business[]);
  const businessNameById = new Map(businesses.map((b) => [b.id, b.name]));
  const people =
    peopleResult.status === "fulfilled"
      ? peopleResult.value
      : (markMissingSection("People"), [] as Person[]);
  const personNameById = new Map(people.map((p) => [p.id, p.name]));

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
  // Savings accounts designated as the emergency fund (their rows carry
  // EmergencyFund="yes" on the Asset Accounts sheet). When any exist, the
  // app displays their combined balance as the fund - mirror that here.
  const efSource = getEmergencyFundSource(assetAccounts);
  if (!hasExplicitEmergencyFund && (milestonePlan || efSource.linked)) {
    const keelStep = milestonePlan?.steps.find((step) => step.key === "keel");
    const keelTarget = keelStep?.targetAmount ?? 0;
    // Only the "Savings" category counts toward the derived emergency fund.
    // Retirement and Investing aren't liquid emergency money - they feed
    // the gather_animals milestone separately. Kept in sync with the same
    // narrowing on BridgeScreen / BudgetScreen / DebtTrackerScreen.
    const savingsReserve = budgetEntries
      .filter(
        (entry) =>
          entry.type === "expense" && entry.category === "Savings"
      )
      .reduce((sum, entry) => sum + entry.amount, 0);
    // Linked mode wins over the entry-derived reserve, matching the app UI.
    const currentAmount = efSource.linked
      ? efSource.linkedAmount
      : savingsReserve;
    if (keelTarget > 0 || currentAmount > 0) {
      goalsForSheet.push({
        id: DERIVED_EMERGENCY_FUND_ID,
        name: "Emergency Fund",
        category: "emergency_fund",
        targetAmount: keelTarget,
        // Clamp to zero. A net-negative reserve can happen if the user has
        // logged correction entries that exceed their tracked deposits;
        // showing a negative current amount would look like a bug, and
        // import-side validators would reject the row anyway.
        currentAmount: Math.max(0, currentAmount),
        createdAt: "",
        updatedAt: "",
      });
    }
  }

  const wb = XLSX.utils.book_new();

  // Budget Entries is built by hand (not via json_to_sheet + appendTotalRow)
  // so we can sort by date, interleave per-month Income / Expense / Net
  // subtotals, and finish with a grand-total block. See buildBudgetEntriesSheet.
  let entrySheet: XLSX.WorkSheet;
  try {
    const entryRows = expandRecurringRows(
      budgetEntries.map((entry) =>
        budgetEntryToRow(entry, businessNameById, personNameById)
      )
    );
    entrySheet = buildBudgetEntriesSheet(entryRows);
  } catch {
    markMissingSection("Budget Entries");
    entrySheet = buildBudgetEntriesSheet([]);
  }
  XLSX.utils.book_append_sheet(wb, entrySheet, "Budget Entries");

  if (format === "xlsx") {
    try {
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
    } catch {
      markMissingSection("Budget Limits");
    }

    try {
      const debtRows = debts.map(debtToRow);
      const debtsSheet = XLSX.utils.json_to_sheet(debtRows, {
        header: [...DEBT_COLUMNS],
      });
      appendTotalRow(debtsSheet, debtRows, DEBT_COLUMNS, SHEET_SUM_COLUMNS["Debts"]);
      promoteStringDateCells(debtsSheet, DEBT_COLUMNS, ["GoalDate", "CreatedAt"]);
      XLSX.utils.book_append_sheet(wb, debtsSheet, "Debts");
    } catch {
      markMissingSection("Debts");
    }

    try {
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
      promoteStringDateCells(paymentsSheet, PAYMENT_COLUMNS, ["Date"]);
      XLSX.utils.book_append_sheet(wb, paymentsSheet, "Payments");
    } catch {
      markMissingSection("Payments");
    }

    try {
      const goalRows = goalsForSheet.map(savingsGoalToRow);
      const goalsSheet = XLSX.utils.json_to_sheet(goalRows, {
        header: [...SAVINGS_GOAL_COLUMNS],
      });
      appendTotalRow(
        goalsSheet,
        goalRows,
        SAVINGS_GOAL_COLUMNS,
        SHEET_SUM_COLUMNS["Savings Goals"],
        { excludeFirstColumnEquals: DERIVED_EMERGENCY_FUND_ID }
      );
      promoteStringDateCells(goalsSheet, SAVINGS_GOAL_COLUMNS, ["TargetDate", "CreatedAt"]);
      XLSX.utils.book_append_sheet(wb, goalsSheet, "Savings Goals");
    } catch {
      markMissingSection("Savings Goals");
    }

    try {
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
      promoteStringDateCells(accountsSheet, ASSET_ACCOUNT_COLUMNS, ["CreatedAt"]);
      XLSX.utils.book_append_sheet(wb, accountsSheet, "Asset Accounts");
    } catch {
      markMissingSection("Asset Accounts");
    }

    try {
      const holdingRows = holdings.map(holdingToRow);
      const holdingsSheet = XLSX.utils.json_to_sheet(holdingRows, {
        header: [...HOLDING_COLUMNS],
      });
      appendTotalRow(
        holdingsSheet,
        holdingRows,
        HOLDING_COLUMNS,
        SHEET_SUM_COLUMNS["Holdings"]
      );
      promoteStringDateCells(holdingsSheet, HOLDING_COLUMNS, ["CreatedAt"]);
      XLSX.utils.book_append_sheet(wb, holdingsSheet, "Holdings");
    } catch {
      markMissingSection("Holdings");
    }

    // No Total row - nothing numeric to sum on a name list.
    try {
      const businessRows = businesses.map(businessToRow);
      const businessesSheet = XLSX.utils.json_to_sheet(businessRows, {
        header: [...BUSINESS_COLUMNS],
      });
      promoteStringDateCells(businessesSheet, BUSINESS_COLUMNS, ["CreatedAt"]);
      XLSX.utils.book_append_sheet(wb, businessesSheet, "Businesses");
    } catch {
      markMissingSection("Businesses");
    }

    try {
      const personRows = people.map(personToRow);
      const peopleSheet = XLSX.utils.json_to_sheet(personRows, {
        header: [...PERSON_COLUMNS],
      });
      promoteStringDateCells(peopleSheet, PERSON_COLUMNS, ["CreatedAt"]);
      XLSX.utils.book_append_sheet(wb, peopleSheet, "People");
    } catch {
      markMissingSection("People");
    }
  }

  const filename = sanitizeFilename(buildFilename(format));
  // iOS share sheet reads more reliably from the document directory than cache.
  const fileDir = Platform.OS === "ios" ? Paths.document : Paths.cache;
  const file = new ExpoFile(fileDir, filename);

  const writeStartedAt = nowMs();
  try {
    if (format === "csv") {
      const csv = XLSX.utils.sheet_to_csv(escapeCsvFormulaCells(entrySheet));
      file.create({ overwrite: true });
      file.write(csv, { encoding: "utf8" });
    } else {
      const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" }) as string;
      file.create({ overwrite: true });
      file.write(base64, { encoding: "base64" });
    }
  } catch (error) {
    log("file-write-failed");
    // A partial file is still plaintext on disk - don't leave it behind.
    deleteLocalFileQuietly(file);
    throw error;
  }
  log("file-written", `ms=${nowMs() - writeStartedAt}`);

  if (options.beforeShare) {
    await withTimeout(
      Promise.resolve(options.beforeShare()),
      BEFORE_SHARE_TIMEOUT_MS,
      "Timed out preparing share sheet presentation."
    );
  }

  // Yield so the JS thread can flush modal unmounts before native presentation.
  if (Platform.OS === "ios") {
    await waitForIosModalTeardown(400);
  }

  log("share-open");
  // Deletes the plaintext file once the sheet closes (or if sharing throws).
  await shareLocalFileThenDelete(file, {
    mimeType:
      format === "csv"
        ? "text/csv"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    dialogTitle: "Export BudgetArk Spreadsheet",
    UTI:
      format === "csv"
        ? "public.comma-separated-values-text"
        : "org.openxmlformats.spreadsheetml.sheet",
  });
  log("share-complete");

  // Stamp the backup version so the Profile reminder banner clears - xlsx
  // only. CSV carries budget entries alone, so counting it as "the user
  // took a backup" would silence the reminder while debts, goals, accounts,
  // net worth, etc. remain unbacked-up; the user most at risk (about to
  // migrate devices) is exactly the one the reminder exists for.
  // expo-sharing's shareAsync resolves on share-sheet dismissal regardless
  // of the user's choice, so even for xlsx this is a best-effort marker - a
  // user who opens the sheet and cancels will still clear the reminder.
  // Worth the tradeoff vs nagging users who did successfully save the file.
  if (format === "xlsx") {
    await recordBackup(CURRENT_APP_VERSION);
  }
  log(
    "done",
    `partial=${missingSections.size > 0 ? "yes" : "no"} missing=${
      [...missingSections].sort().join("|") || "none"
    }`
  );

  return {
    format,
    filename,
    entryCount: budgetEntries.length,
    partial: missingSections.size > 0,
    missingSections: [...missingSections].sort(),
  };
};

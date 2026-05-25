# BudgetArk Spreadsheet Schema (v1)

This is the column schema for `.csv` and `.xlsx` files exchanged with BudgetArk.
The schema is shared by `src/utils/spreadsheetExport.ts` and `src/utils/spreadsheetImport.ts`. Header names are matched case-insensitively and tolerate whitespace, but the column meanings are fixed.

CSV files contain a single sheet (Budget Entries). Excel files contain a multi-sheet workbook with all six sheets below. Sheet names are matched case-insensitively.

## Sheet: Budget Entries

| Column            | Required | Notes                                                                                  |
| ----------------- | -------- | -------------------------------------------------------------------------------------- |
| `ID`              | No       | Auto-generated UUID if missing. Stable IDs let you re-import without duplicating rows. |
| `Date`            | Yes      | ISO `YYYY-MM-DD`, full ISO timestamp, US `M/D/YYYY`, or Excel native date.             |
| `Type`            | Yes      | `income` or `expense` (case-insensitive).                                              |
| `Category`        | Yes      | Must match one of the BudgetArk categories (see list below).                           |
| `Amount`          | Yes      | Positive number for most categories. Strips `$`, commas, and treats `(50.00)` as `-50.00`. Exception: `Savings`, `Retirement`, and `Investing` accept negative amounts - these represent app-generated correction entries when a tracked reserve is lowered. |
| `Description`     | No       | Free-form note (max 220 chars).                                                        |
| `Recurring`       | No       | `yes` / `no` / `true` / `false` / `1` / `0`.                                           |
| `LinkedAccountId` | No       | UUID of an asset account (used for savings entries).                                   |
| `LastAppliedMonth`| No       | `YYYY-MM` of the last month a recurring entry was credited to its linked account. Round-tripped to avoid double-applying contributions. |
| `CreatedAt`       | No       | ISO timestamp the entry was created. Round-tripped so re-importing doesn't reset history. |
| `UpdatedAt`       | No       | ISO timestamp of last edit. Round-tripped so a paired-device sync after a re-import doesn't overwrite the partner's data with import-time stamps. |

### Allowed Budget Categories

`Salary`, `Freelance`, `Housing`, `Food`, `Grocery`, `Restaurant`, `Tech`, `Fitness`, `Transportation`, `Utilities`, `Healthcare`, `Insurance`, `Debt Payments`, `Giving`, `Retirement`, `Investing`, `Savings`, `Entertainment`, `Shopping`, `Travel`, `Other`.

Category names are case-sensitive on import.

## Sheet: Budget Limits (xlsx only)

| Column         | Required | Notes                              |
| -------------- | -------- | ---------------------------------- |
| `Category`     | Yes      | One of the allowed categories.     |
| `MonthlyLimit` | Yes      | Positive number, max 1,000,000,000 |

Imported limits land in the current month's limit set.

## Sheet: Debts (xlsx only)

| Column            | Required | Notes                                         |
| ----------------- | -------- | --------------------------------------------- |
| `ID`              | No       | Auto-generated if missing.                    |
| `Name`            | Yes      | Max 80 chars.                                 |
| `Balance`         | Yes      | Number, ≥ 0.                                  |
| `OriginalBalance` | Yes      | Number, ≥ 0.01.                               |
| `Rate`            | Yes      | APR as a percentage, 0–200.                   |
| `MinPayment`      | Yes      | Number, ≥ 0.                                  |
| `Owner`           | No       | `mine` / `partner` / `joint`. Default `mine`. |
| `DebtClass`       | No       | `personal_credit` / `car` / `house`. Legacy `car_house` is accepted on import and split to `house` when the name mentions mortgage/house/home, otherwise `car`. |
| `DebtClassSource` | No       | `manual` / `inferred`.                        |
| `GoalDate`        | No       | Optional payoff target date.                  |
| `CreatedAt`       | No       | ISO timestamp; defaults to now.               |
| `UpdatedAt`       | No       | ISO timestamp of last edit. Round-tripped so a paired-device sync after a re-import doesn't overwrite the partner's data with import-time stamps. |

## Sheet: Payments (xlsx only)

| Column      | Required | Notes                            |
| ----------- | -------- | -------------------------------- |
| `ID`        | No       | Auto-generated if missing.       |
| `DebtID`    | Yes      | Must match a debt's `ID`.        |
| `Amount`    | Yes      | Positive number, ≥ 0.01.         |
| `Date`      | Yes      | ISO date or US `M/D/YYYY` style. |
| `UpdatedAt` | No       | ISO timestamp of last edit. Round-tripped to preserve sync correctness. |

## Sheet: Savings Goals (xlsx only)

| Column          | Required | Notes                                                                                |
| --------------- | -------- | ------------------------------------------------------------------------------------ |
| `ID`            | No       | Auto-generated if missing.                                                           |
| `Name`          | Yes      | Max 80 chars.                                                                        |
| `Category`      | Yes      | One of `emergency_fund`, `travel`, `home`, `car`, `education`, `other`.              |
| `TargetAmount`  | Yes      | Positive number.                                                                     |
| `CurrentAmount` | Yes      | Number, ≥ 0.                                                                         |
| `TargetDate`    | No       | Optional target date.                                                                |
| `CreatedAt`     | No       | ISO timestamp; defaults to now.                                                      |
| `UpdatedAt`     | No       | ISO timestamp of last edit. Round-tripped to preserve sync correctness.              |

> Imported on Excel imports - full round-trip with the export utility.

## Sheet: Asset Accounts (xlsx only)

| Column      | Required | Notes                                                                |
| ----------- | -------- | -------------------------------------------------------------------- |
| `ID`        | No       | Auto-generated if missing.                                           |
| `Name`      | Yes      | Max 80 chars.                                                        |
| `Category`  | Yes      | One of `savings`, `retirement`, `hsa`, `investment`, `other`.        |
| `Balance`   | Yes      | Number, ≥ 0.                                                         |
| `CreatedAt` | No       | ISO timestamp; defaults to now.                                      |
| `UpdatedAt` | No       | ISO timestamp of last edit. Round-tripped to preserve sync correctness. |

> Imported on Excel imports - full round-trip with the export utility.

## Limits

- File size: 5 MB max
- Rows per sheet: 5,000 max
- Total records (across all sheets): 6,000 max (inherited from JSON import)

## Total Row

Every exported sheet ends with a **Total** row: the label `Total` in the first column, and live `SUM(...)` formulas in the numeric columns. Excel and Google Sheets evaluate the formulas live; CSV exports include the computed totals as static values.

Summed columns by sheet:

| Sheet          | Summed columns                                |
| -------------- | --------------------------------------------- |
| Budget Entries | *(label only - see note below)*               |
| Budget Limits  | `MonthlyLimit`                                |
| Debts          | `Balance`, `OriginalBalance`, `MinPayment`    |
| Payments       | `Amount`                                      |
| Savings Goals  | `TargetAmount`, `CurrentAmount`               |
| Asset Accounts | `Balance`                                     |

The Budget Entries Total row deliberately leaves the numeric column blank: income and expense rows both store positive amounts, so a raw `SUM(Amount)` mixes the two into a misleading number. Add your own `SUMIF` formulas keyed on the `Type` column if you want income / expense subtotals.

The `SUM` ranges are bounded to the data rows present at export time. Excel and Google Sheets auto-extend these ranges when you **insert** rows above the Total row; rows **appended** below it are not included.

The importer ignores the total row automatically - you don't need to delete it before re-importing. If you add your own summary row, give it the label `Total` (case-insensitive) in the first column and it will be skipped the same way.

> **Reserved value:** `Total` (case-insensitive) is a reserved sentinel in the **first column** of every sheet. Any row whose first cell equals `Total` is dropped silently on import. Don't use `Total` as a user-supplied `ID` or `Category` value - your row will disappear.

## Round-Trip Tip

To preserve IDs (and thus avoid duplicating rows when you re-import a file you exported), keep the `ID` column intact. If you export from BudgetArk, edit in Excel/Sheets, and re-import as a Merge, rows with matching IDs are updated in place; rows without matching IDs are added.

## Quickest Way to Get a Blank Template

You don't need to retype this schema by hand. Even with no data in the app, **Export Spreadsheet (XLSX)** produces a workbook with all six sheets and the correct column headers already in place - just empty rows below them. Use that file as your starting template: fill in your rows, save, and import. CSV exports the Budget Entries headers the same way.

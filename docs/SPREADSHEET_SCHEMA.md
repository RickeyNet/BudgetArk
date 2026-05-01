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
| `Amount`          | Yes      | Positive number. Strips `$`, commas, and treats `(50.00)` as `-50.00`.                 |
| `Description`     | No       | Free-form note (max 220 chars).                                                        |
| `Recurring`       | No       | `yes` / `no` / `true` / `false` / `1` / `0`.                                           |
| `LinkedAccountId` | No       | UUID of an asset account (used for savings entries).                                   |

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
| `DebtClass`       | No       | `personal_credit` / `car_house`.              |
| `DebtClassSource` | No       | `manual` / `inferred`.                        |
| `GoalDate`        | No       | Optional payoff target date.                  |
| `CreatedAt`       | No       | ISO timestamp; defaults to now.               |

## Sheet: Payments (xlsx only)

| Column   | Required | Notes                            |
| -------- | -------- | -------------------------------- |
| `ID`     | No       | Auto-generated if missing.       |
| `DebtID` | Yes      | Must match a debt's `ID`.        |
| `Amount` | Yes      | Positive number, ≥ 0.01.         |
| `Date`   | Yes      | ISO date or US `M/D/YYYY` style. |

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

> Note: This sheet is round-trip safe with the export utility, but the v1 importer does not yet write savings goals into storage. They will be parsed and the row count surfaced for confirmation in a follow-up release.

## Sheet: Asset Accounts (xlsx only)

| Column      | Required | Notes                                                                |
| ----------- | -------- | -------------------------------------------------------------------- |
| `ID`        | No       | Auto-generated if missing.                                           |
| `Name`      | Yes      | Max 80 chars.                                                        |
| `Category`  | Yes      | One of `savings`, `retirement`, `hsa`, `investment`, `other`.        |
| `Balance`   | Yes      | Number, ≥ 0.                                                         |
| `CreatedAt` | No       | ISO timestamp; defaults to now.                                      |

> Note: Same caveat as Savings Goals — round-trip exported but not yet imported in v1.

## Limits

- File size: 5 MB max
- Rows per sheet: 5,000 max
- Total records (across all sheets): 6,000 max (inherited from JSON import)

## Round-Trip Tip

To preserve IDs (and thus avoid duplicating rows when you re-import a file you exported), keep the `ID` column intact. If you export from BudgetArk, edit in Excel/Sheets, and re-import as a Merge, rows with matching IDs are updated in place; rows without matching IDs are added.

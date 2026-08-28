# BudgetArk Spreadsheet Schema (v3)

This is the column schema for `.csv` and `.xlsx` files exchanged with BudgetArk.
The schema is shared by `src/utils/spreadsheetExport.ts` and `src/utils/spreadsheetImport.ts`. Header names are matched case-insensitively and tolerate whitespace, but the column meanings are fixed.

CSV files contain a single sheet (Budget Entries). Excel files contain a multi-sheet workbook with all sheets below. Sheet names are matched case-insensitively.

**v2 changes:** Budget Entries gained `BusinessId` (round-trips) and `Business` (readable name, export-only); Excel workbooks gained a `Businesses` sheet. v1 files still import - the new columns are simply absent.

**v3 changes:** Budget Entries gained `IncomeType`, `Retirement401k`, and `TaxSetAsideRate` (all round-trip; blank for expenses and plain income). Older files still import - the new columns are simply absent.

**v4 changes:** Budget Entries gained `Private` (`yes`/blank, round-trips) - the partner-sync privacy flag. Older files still import - the column is simply absent.

> **Receipt photos do not round-trip.** Photo attachments on entries live as encrypted files on the device and are not part of the spreadsheet schema (or the JSON export). A **merge**-mode import never removes an entry's local photos - an entry updated from a spreadsheet row keeps the photos already on the device. A **replace**-mode spreadsheet restore keeps the entry but not its photos; the in-app JSON backup preserves the entry's photo *references* (files stay on the original device).

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
| `RecurrenceInterval` | No    | Months between repeats when `Recurring` is `yes`: `1`, `3`, `6`, or `12`.              |
| `PaymentUrl`      | No       | Optional `https` payment link for recurring expenses.                                  |
| `LinkedAccountId` | No       | UUID of an asset account (used for savings entries).                                   |
| `LastAppliedMonth`| No       | `YYYY-MM` of the last month a recurring entry was credited to its linked account. Round-tripped to avoid double-applying contributions. |
| `Source`          | No       | `bank` for entries created from a bank-imported transaction; blank for manual entries. Round-tripped. |
| `ExternalTxId`    | No       | Dedup identity of the source bank transaction. Round-tripped - losing it makes the next bank sync re-offer already-approved transactions. |
| `Merchant`        | No       | Normalized merchant key captured at approval time. Round-tripped.                      |
| `BusinessId`      | No       | UUID of the business this expense is tagged with (see the `Businesses` sheet). Round-tripped. |
| `Business`        | No       | Human-readable business name at export time. **Export-only - ignored on import** (matching by name would fork identities on rename). Shows `(deleted)` for a dangling id. |
| `IncomeType`      | No       | `w2` or `1099` for income rows (`W-2` / `W2` are accepted). Blank for expenses and plain income. Round-tripped. |
| `Retirement401k`  | No       | 401(k) dollars withheld from a W-2 paycheck. Only kept when `IncomeType` is `w2`. Not part of `Amount` (which is the net deposit). Round-tripped. |
| `TaxSetAsideRate` | No       | Percent (0-100) of a 1099 payment to set aside for taxes. Only kept when `IncomeType` is `1099`. Round-tripped. |
| `Private`         | No       | `yes` marks a private entry that never syncs to a paired partner's device. Round-tripped - stripping it would silently start syncing the entry again. |
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
| `PaymentDueDay`   | No       | Day of month (1–31) the payment is due.       |
| `KeepAlive`       | No       | Card keep-alive watch: `yes` / `no`. Blank leaves the watch unset. Round-trips, so re-importing a workbook doesn't switch the watch off. |
| `KeepAliveWindowMonths` | No | Issuer inactivity window in whole months, 1–60. |
| `KeepAliveLeadDays` | No     | Days before the deadline reminders begin, 1–180. |
| `KeepAliveLastUsedAt` | No   | When the card was last used (ISO timestamp or date). |
| `CreatedAt`       | No       | ISO timestamp; defaults to now.               |
| `UpdatedAt`       | No       | ISO timestamp of last edit. Round-tripped so a paired-device sync after a re-import doesn't overwrite the partner's data with import-time stamps. |

## Sheet: Payments (xlsx only)

| Column          | Required | Notes                            |
| --------------- | -------- | -------------------------------- |
| `ID`            | No       | Auto-generated if missing.       |
| `DebtID`        | Yes      | Must match a debt's `ID`.        |
| `Amount`        | Yes      | Positive number, ≥ 0.01.         |
| `AppliedAmount` | No       | The part of `Amount` that actually reduced the balance (an overpayment is clamped at zero). 0 – `Amount`. Blank means the whole amount. Round-trips so deleting the payment later adds back the right delta. |
| `Date`          | Yes      | ISO date or US `M/D/YYYY` style. |
| `UpdatedAt`     | No       | ISO timestamp of last edit. Round-tripped to preserve sync correctness. |

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
| `EmergencyFund` | No   | `yes` marks a savings account designated as (part of) your emergency fund; the app then tracks the fund from the designated accounts' combined balance. Round-trips. |
| `CreatedAt` | No       | ISO timestamp; defaults to now.                                      |
| `UpdatedAt` | No       | ISO timestamp of last edit. Round-tripped to preserve sync correctness. |

> Imported on Excel imports - full round-trip with the export utility.

## Sheet: Holdings (xlsx only)

| Column       | Required | Notes                                                                |
| ------------ | -------- | -------------------------------------------------------------------- |
| `ID`         | No       | Auto-generated if missing.                                           |
| `Symbol`     | Ticker/proxy | Ticker, e.g. `AAPL`, `VTI`. Up to 12 chars (letters, digits, `.`, `-`). For a proxy-tracked fund this is the proxy ticker; blank for a manual-value fund. |
| `Shares`     | Ticker   | Positive number. Fractional shares allowed. Ignored (0) for proxy/manual funds. |
| `CostBasis`  | No       | Total dollars invested, ≥ 0. Used for gain/loss.                    |
| `Name`       | Proxy/manual | Display label for a fund with no public ticker (e.g. a 401k pool). |
| `ManualValue` | Manual  | Fixed market value of a manual-value fund, ≥ 0. Filling this makes the row a manual-value holding. |
| `AnchorValue` | Proxy   | Dollar value entered when the proxy price was captured, ≥ 0. Filling this makes the row a proxy-tracked holding (needs `Symbol`, `Name`, `AnchorPrice`). |
| `AnchorPrice` | Proxy   | Proxy ticker price at the time `AnchorValue` was set, > 0. A proxy that has never been priced can't be represented and is skipped. |
| `AccountId`  | No       | `ID` of the Investment asset account (broker) the position sits in. Round-trips so holdings stay grouped under their broker on the Bridge. |
| `CreatedAt`  | No       | ISO timestamp; defaults to now.                                      |
| `UpdatedAt`  | No       | ISO timestamp of last edit. Round-tripped to preserve sync correctness. |

> Three shapes share the sheet and are told apart by which optional columns are filled: **ticker** (`Symbol` + `Shares`), **proxy** (`Symbol` + `Name` + `AnchorValue` + `AnchorPrice`), **manual** (`Name` + `ManualValue`, no `Symbol`). Live prices are fetched per-device and are **never** included in exports or imports - a spreadsheet carries the holding, not its market value.

## Sheet: Businesses (xlsx only)

| Column      | Required | Notes                                                                |
| ----------- | -------- | -------------------------------------------------------------------- |
| `ID`        | No       | Auto-generated if missing. Budget entries reference this via `BusinessId`. |
| `Name`      | Yes      | Max 40 chars.                                                        |
| `CreatedAt` | No       | ISO timestamp; defaults to now.                                      |
| `UpdatedAt` | No       | ISO timestamp of last edit. Round-tripped to preserve sync correctness. |

> Only live (non-deleted) businesses are exported. Entries whose `BusinessId` has no matching row still import - the business may arrive later via sync or a JSON restore. No Total row (nothing numeric to sum).

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
| Holdings       | `CostBasis`                                   |

The Budget Entries Total row deliberately leaves the numeric column blank: income and expense rows both store positive amounts, so a raw `SUM(Amount)` mixes the two into a misleading number. Add your own `SUMIF` formulas keyed on the `Type` column if you want income / expense subtotals.

The `SUM` ranges are bounded to the data rows present at export time. Excel and Google Sheets auto-extend these ranges when you **insert** rows above the Total row; rows **appended** below it are not included.

The importer ignores the total row automatically - you don't need to delete it before re-importing. If you add your own summary row, give it the label `Total` (case-insensitive) in the first column and it will be skipped the same way.

> **Reserved value:** `Total` (case-insensitive) is a reserved sentinel in the **first column** of every sheet. Any row whose first cell equals `Total` is dropped silently on import. Don't use `Total` as a user-supplied `ID` or `Category` value - your row will disappear.

## Round-Trip Tip

To preserve IDs (and thus avoid duplicating rows when you re-import a file you exported), keep the `ID` column intact. If you export from BudgetArk, edit in Excel/Sheets, and re-import as a Merge, rows with matching IDs are updated in place; rows without matching IDs are added.

## Quickest Way to Get a Blank Template

You don't need to retype this schema by hand. Even with no data in the app, **Export Spreadsheet (XLSX)** produces a workbook with all six sheets and the correct column headers already in place - just empty rows below them. Use that file as your starting template: fill in your rows, save, and import. CSV exports the Budget Entries headers the same way.

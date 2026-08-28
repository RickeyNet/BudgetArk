/**
 * BudgetArk - Spreadsheet Import Utility
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
 *   - Holdings
 *
 * Unknown sheets are ignored. Rows that fail validation MUST be dropped here
 * (returned as null from the row mappers, counted in `skippedRows`) - the
 * downstream sanitizer in importData.ts THROWS on any invalid record, so a
 * single out-of-range cell that slips past the mappers aborts the entire
 * import. The mappers therefore mirror the range limits in
 * src/utils/recordValidators.ts (VALIDATOR_LIMITS).
 */

import { File as ExpoFile } from "expo-file-system";
import * as XLSX from "xlsx";
import {
  importFromString,
  openDocumentPicker,
  type ImportResult,
} from "./importData";
import {
  DERIVED_EMERGENCY_FUND_ID,
  DERIVED_RECURRING_PREFIX,
} from "./spreadsheetExport";
import { generateUUID } from "./uuid";
import { normalizeImportCategory, VALIDATOR_LIMITS } from "./recordValidators";
import { isValidSymbol, normalizeSymbol } from "./holdingsMath";
import {
  KEEP_ALIVE_MAX_LEAD_DAYS,
  KEEP_ALIVE_MAX_WINDOW_MONTHS,
} from "./cardKeepAlive";
import { normalizePaymentUrl } from "./paymentUrl";
import {
  ASSET_ACCOUNT_CATEGORIES,
  PAYMENT_URL_MAX_LENGTH,
  type AssetAccountCategory,
} from "../types";

/** Cap raw spreadsheet file size (uncompressed bytes for csv, on-disk size for xlsx). */
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_ROWS_PER_SHEET = 5000;

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
const VALID_DEBT_CLASSES = new Set(["personal_credit", "car", "house"]);

const HOUSE_NAME_KEYWORDS = ["mortgage", "house", "home loan", "home"];

/**
 * Migrates a legacy "car_house" cell on import. Splits to "house" when the
 * debt name suggests a mortgage; defaults to "car" otherwise.
 */
const splitLegacyCarHouse = (name: string): "car" | "house" => {
  const normalized = name.toLowerCase();
  if (HOUSE_NAME_KEYWORDS.some((keyword) => normalized.includes(keyword))) return "house";
  return "car";
};
const VALID_DEBT_CLASS_SOURCES = new Set(["manual", "inferred"]);

/* ── Cell value coercion ── */

/**
 * Parses an arbitrary spreadsheet cell into a number.
 *
 * Handles:
 *   - Plain numbers (Excel returns numbers natively)
 *   - "$1,234.56" / "1,234.56" (US convention)
 *   - "1.234,56" / "1,50" / "1.234.567,89" (decimal-comma locales)
 *   - Parenthesized negatives like "(50.00)"
 *   - Leading/trailing whitespace
 *
 * Separator convention is detected per value: when both "." and "," appear,
 * the rightmost one is the decimal separator and the other is grouping. A
 * lone comma followed by 1-2 trailing digits is a decimal comma ("1,50");
 * otherwise commas are grouping. This used to strip ALL commas blindly, so
 * "1.234,56" imported as 1.23456 and "1,50" as 150 - silently wrong money
 * that passed every downstream bounds check.
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

  // Strip currency symbols
  s = s.replace(/[$£€¥₹]/g, "").trim();

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    if (lastComma > lastDot) {
      // Decimal comma: "1.234,56" - dots are grouping. A second comma
      // survives into Number() and yields NaN (fail closed, not a guess).
      s = s.replace(/\./g, "").replace(/,/g, ".");
    } else {
      // Decimal dot: "1,234.56" - commas are grouping.
      s = s.replace(/,/g, "");
    }
  } else if (lastComma >= 0) {
    const commaCount = s.split(",").length - 1;
    const digitsAfter = s.length - lastComma - 1;
    if (commaCount === 1 && digitsAfter >= 1 && digitsAfter <= 2) {
      // "1,50" - decimal comma. (A single comma with exactly 3 trailing
      // digits, "1,234", stays grouping per the US-format default.)
      s = s.replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (lastDot >= 0 && s.indexOf(".") !== lastDot) {
    // Multiple dots with no comma: "1.234.567" - grouping in decimal-comma
    // locales; never a valid US decimal.
    s = s.replace(/\./g, "");
  }
  s = s.trim();

  const n = Number(s);
  if (!Number.isFinite(n)) return NaN;
  return negative ? -n : n;
};

/** Formats calendar parts as noon-UTC ISO (the canonical entry-date anchor). */
const dateOnlyToNoonUtcIso = (y: number, m: number, d: number): string =>
  `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(
    d
  ).padStart(2, "0")}T12:00:00.000Z`;

/**
 * Normalizes a date cell into ISO 8601.
 *
 * Accepts:
 *   - Excel serial dates (numbers - XLSX with cellDates:true converts to Date)
 *   - JS Date objects (from cellDates:true)
 *   - ISO strings ("2026-04-30", "2026-04-30T12:00:00Z")
 *   - US-format strings ("4/30/2026", "04/30/2026")
 *
 * Date-only inputs are anchored at NOON UTC, matching how the app stores
 * entry dates (see utils/entryDate.ts). Month attribution app-wide slices
 * the YYYY-MM prefix, so a date-only cell parsed at local midnight (the old
 * behavior) landed on the previous UTC day for any user east of UTC -
 * first-of-month entries silently moved into the prior month's budget.
 *
 * Returns "" if unparseable.
 */
const parseDate = (raw: unknown): string => {
  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) return "";
    // SheetJS (cellDates:true) reconstructs date cells as local wall-clock
    // Dates, so the LOCAL calendar parts carry the day the sheet displays;
    // raw.toISOString() would shift that day for users east of UTC. Export
    // anchors cells at noon, so local parts are stable in every offset.
    return dateOnlyToNoonUtcIso(
      raw.getFullYear(),
      raw.getMonth() + 1,
      raw.getDate()
    );
  }
  if (typeof raw === "number") {
    // Excel serial date (days since 1899-12-30) - UTC arithmetic, so the
    // UTC parts carry the intended calendar day.
    if (!Number.isFinite(raw)) return "";
    const ms = Math.round((raw - 25569) * 86400 * 1000);
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return "";
    return dateOnlyToNoonUtcIso(
      d.getUTCFullYear(),
      d.getUTCMonth() + 1,
      d.getUTCDate()
    );
  }
  if (typeof raw !== "string") return "";

  const s = raw.trim();
  if (!s) return "";

  // Date-only ISO: anchor at noon UTC directly.
  const isoDay = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDay) {
    return dateOnlyToNoonUtcIso(
      Number(isoDay[1]),
      Number(isoDay[2]),
      Number(isoDay[3])
    );
  }

  // US-style M/D/YYYY. Built via Date.UTC with a rollover check so 13/40/26
  // is rejected instead of silently rolling into a different month.
  const usMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (usMatch) {
    const [, m, d, yRaw] = usMatch;
    const y = yRaw.length === 2 ? 2000 + Number(yRaw) : Number(yRaw);
    const dt = new Date(Date.UTC(y, Number(m) - 1, Number(d), 12));
    if (
      Number.isNaN(dt.getTime()) ||
      dt.getUTCMonth() !== Number(m) - 1 ||
      dt.getUTCDate() !== Number(d)
    ) {
      return "";
    }
    return dt.toISOString();
  }

  // Everything else goes through the engine parser. Strings carrying an
  // explicit time keep it; date-only formats ("June 1, 2026") parse at
  // local midnight, so the local parts carry the intended day.
  const direct = Date.parse(s);
  if (!Number.isNaN(direct)) {
    const dt = new Date(direct);
    if (/\d:\d/.test(s)) return dt.toISOString();
    return dateOnlyToNoonUtcIso(
      dt.getFullYear(),
      dt.getMonth() + 1,
      dt.getDate()
    );
  }

  return "";
};

const parseString = (raw: unknown, maxLen = 220): string => {
  if (raw === null || raw === undefined) return "";
  const s = String(raw).trim();
  if (s.length > maxLen) return s.slice(0, maxLen);
  // Strip control chars + null bytes (mirrors validation in importData)
   
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
 * For CSVs, the only sheet is the budget entries sheet - so we map the first
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

/** Raw ID cell for a row (case-insensitive header), trimmed; "" if absent. */
const rowId = (row: Record<string, unknown>): string => {
  const value = get(row, "ID", "Id", "id");
  return value == null ? "" : String(value).trim();
};

/**
 * Rows the exporter writes purely as round-trip artifacts and that the
 * mappers intentionally drop: projected copies of recurring entries
 * (`__projected_recurring__:` prefix) and the synthetic Emergency Fund goal
 * (`__derived_emergency_fund__`). They carry no user data, so they must be
 * excluded from `skippedRows` - otherwise a normal export of a few recurring
 * entries across several months reports dozens of "invalid" rows that were
 * never invalid, just deliberately not re-imported.
 */
const isDerivedArtifactRow = (row: Record<string, unknown>): boolean => {
  const id = rowId(row);
  return (
    id.startsWith(DERIVED_RECURRING_PREFIX) || id === DERIVED_EMERGENCY_FUND_ID
  );
};

/* ── Row → entity mappers ── */

/**
 * A mapped row is either a valid entity (`ok`) or a skip carrying a short,
 * human-readable reason. Reasons surface to the user so they can find and fix
 * the offending row instead of just seeing an opaque skipped-count.
 */
type RowResult<T> = { ok: true; value: T } | { ok: false; reason: string };
const okRow = <T>(value: T): RowResult<T> => ({ ok: true, value });
const skipRow = (reason: string): RowResult<never> => ({ ok: false, reason });

const rowToBudgetEntry = (row: Record<string, unknown>): RowResult<Record<string, unknown>> => {
  const typeRaw = parseString(get(row, "Type")).toLowerCase();
  const type = typeRaw === "income" ? "income" : typeRaw === "expense" ? "expense" : null;
  const categoryRaw = parseString(get(row, "Category"), 60);
  const category: string | null = normalizeImportCategory(categoryRaw);
  const amount = parseAmount(get(row, "Amount"));
  const dateIso = parseDate(get(row, "Date"));

  // Savings/Retirement/Investing entries may legitimately be negative
  // (correction entries when the user lowers a tracked reserve). All other
  // categories require positive amounts - note parseAmount turns "(500)"
  // into -500 (accounting negatives), and the strict sanitizer downstream
  // aborts the whole file on a negative it doesn't allow, so such rows must
  // be skipped here. The MAX_MONEY cap mirrors isBudgetEntryItem.
  const allowsNegative =
    category !== null && NEGATIVE_AMOUNT_CATEGORIES.has(category);
  const amountValid =
    Number.isFinite(amount) &&
    Math.abs(amount) >= 0.01 &&
    Math.abs(amount) <= VALIDATOR_LIMITS.MAX_MONEY &&
    (allowsNegative ? true : amount > 0);

  if (!type) {
    return skipRow('Type must be "income" or "expense"');
  }
  if (!category) {
    return skipRow(
      categoryRaw
        ? `Category "${categoryRaw}" is not a recognized category`
        : "Category is missing"
    );
  }
  if (!amountValid) {
    return skipRow(
      allowsNegative
        ? "Amount is missing or out of range"
        : "Amount must be a positive number of at least 0.01"
    );
  }
  if (!dateIso) {
    return skipRow("Date is missing or could not be read");
  }

  // Projected recurring copies are removed up front by isDerivedArtifactRow,
  // so a row reaching here is a real entry that gets a real or generated id.
  const id = parseString(get(row, "ID", "Id", "id"), 80) || generateUUID();
  const description = parseString(get(row, "Description", "Notes", "Memo"));
  const recurring = parseBoolean(get(row, "Recurring"));
  const recurrenceRaw = Number(
    parseString(get(row, "RecurrenceInterval", "Recurrence Interval"), 8)
  );
  const recurrenceInterval: 1 | 3 | 6 | 12 | undefined =
    recurring && (recurrenceRaw === 3 || recurrenceRaw === 6 || recurrenceRaw === 12)
      ? recurrenceRaw
      : recurring && recurrenceRaw === 1
      ? 1
      : undefined;
  const paymentUrlRaw = parseString(
    get(row, "PaymentUrl", "Payment URL", "PaymentLink"),
    PAYMENT_URL_MAX_LENGTH
  );
  const paymentUrl = recurring ? normalizePaymentUrl(paymentUrlRaw) ?? undefined : undefined;
  const linkedAccountId = parseString(get(row, "LinkedAccountId", "LinkedAccount"), 80);
  // Preserve the recurring/linked-account "last applied" stamp so the app
  // doesn't re-credit the linked AssetAccount for every month between the
  // entry's start and today on the first BudgetScreen open after import.
  // Validate the YYYY-MM shape; anything else is dropped to undefined.
  const lastAppliedRaw = parseString(get(row, "LastAppliedMonth", "Last Applied Month"), 7);
  const lastAppliedMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(lastAppliedRaw)
    ? lastAppliedRaw
    : undefined;

  // Bank-connection provenance. ExternalTxId is the dedup identity of a
  // bank-imported transaction: dropping it on a backup/restore cycle makes
  // the next connections sync re-offer already-approved transactions, so it
  // is round-tripped like LastAppliedMonth. Bounds mirror isBudgetEntryItem.
  const sourceRaw = parseString(get(row, "Source"), 10).toLowerCase();
  const source = sourceRaw === "bank" ? ("bank" as const) : undefined;
  const externalTxId =
    parseString(get(row, "ExternalTxId", "External Tx Id"), 200) || undefined;
  const merchant = parseString(get(row, "Merchant"), 120) || undefined;
  // BusinessId round-trips; the readable "Business" name column is
  // deliberately IGNORED - matching by name would fork identities on rename.
  const businessId =
    parseString(get(row, "BusinessId", "Business Id"), 80) || undefined;
  // Same contract for PersonId / the ignored "Person" name column.
  const personId =
    parseString(get(row, "PersonId", "Person Id"), 80) || undefined;

  // W-2 / 1099 paycheck fields - income rows only, mirroring the UI
  // invariant (the modals clear them when an entry flips to expense).
  // Tolerant of hand-edited variants ("W-2", "W2"); anything else drops the
  // whole trio so a corrupt cell can't smuggle a bogus rate past the
  // downstream validator. Bounds mirror isBudgetEntryItem.
  const incomeTypeRaw = parseString(get(row, "IncomeType", "Income Type"), 12)
    .toLowerCase()
    .replace(/-/g, "");
  const incomeType =
    type === "income" && incomeTypeRaw === "w2"
      ? ("w2" as const)
      : type === "income" && incomeTypeRaw === "1099"
      ? ("1099" as const)
      : undefined;
  const retirement401k = parseAmount(
    get(row, "Retirement401k", "Retirement 401k")
  );
  const retirementContribution =
    incomeType === "w2" &&
    Number.isFinite(retirement401k) &&
    retirement401k > 0 &&
    retirement401k <= VALIDATOR_LIMITS.MAX_MONEY
      ? retirement401k
      : undefined;
  const setAsideRaw = parseAmount(
    get(row, "TaxSetAsideRate", "Tax Set Aside Rate")
  );
  const taxSetAsideRate =
    incomeType === "1099" &&
    Number.isFinite(setAsideRaw) &&
    setAsideRaw >= 0 &&
    setAsideRaw <= 100
      ? setAsideRaw
      : undefined;

  // Partner-sync privacy flag. Must round-trip: a backup/restore cycle
  // that stripped it would silently start syncing an entry the user marked
  // private. Same truthy-cell parsing as Recurring.
  const isPrivate = parseBoolean(get(row, "Private")) || undefined;

  const now = new Date().toISOString();
  // Preserve original timestamps when round-tripping through xlsx/csv. If
  // they're missing or unparseable, fall back to `now` - but prefer carrying
  // them forward so paired-device sync doesn't treat every imported row as
  // "freshly edited" and overwrite the partner's data.
  const parseIsoOrNull = (value: string): string | null => {
    if (!value) return null;
    const ts = Date.parse(value);
    return Number.isFinite(ts) ? new Date(ts).toISOString() : null;
  };
  const createdAtRaw = parseString(get(row, "CreatedAt", "Created At"), 40);
  const updatedAtRaw = parseString(get(row, "UpdatedAt", "Updated At"), 40);
  const createdAt = parseIsoOrNull(createdAtRaw) ?? now;
  const updatedAt = parseIsoOrNull(updatedAtRaw) ?? createdAt;

  return okRow({
    id,
    type,
    category,
    amount,
    description: description || undefined,
    date: dateIso,
    createdAt,
    updatedAt,
    recurring: recurring || undefined,
    recurrenceInterval,
    paymentUrl,
    linkedAccountId: linkedAccountId || undefined,
    lastAppliedMonth,
    source,
    externalTxId,
    merchant,
    businessId,
    personId,
    incomeType,
    retirementContribution,
    taxSetAsideRate,
    isPrivate,
  });
};

const rowToBudgetLimit = (row: Record<string, unknown>): RowResult<Record<string, unknown>> => {
  const categoryRaw = parseString(get(row, "Category"), 60);
  const category: string | null = normalizeImportCategory(categoryRaw);
  const monthlyLimit = parseAmount(get(row, "MonthlyLimit", "Monthly Limit", "Limit"));

  // Bounds mirror isBudgetLimitItem (min 0.01, max MAX_MONEY): one
  // out-of-range cell would otherwise make the strict sanitizer reject the
  // whole import instead of just this row.
  if (!category) {
    return skipRow(
      categoryRaw
        ? `Category "${categoryRaw}" is not a recognized category`
        : "Category is missing"
    );
  }
  if (
    !Number.isFinite(monthlyLimit) ||
    monthlyLimit < 0.01 ||
    monthlyLimit > VALIDATOR_LIMITS.MAX_MONEY
  ) {
    return skipRow("Monthly limit must be a positive number of at least 0.01");
  }
  // Preserve `updatedAt` so a paired sync doesn't treat every imported limit
  // as "freshly edited" and clobber the partner's data via LWW. Importer
  // (`computeMergedLimitsHistory`) stamps `now` for rows that lack it, so
  // legacy spreadsheets without the column still import safely.
  const updatedAtIso = parseDate(get(row, "UpdatedAt", "Updated At"));
  return okRow(
    updatedAtIso
      ? { category, monthlyLimit, updatedAt: updatedAtIso }
      : { category, monthlyLimit }
  );
};

const rowToDebt = (row: Record<string, unknown>): RowResult<Record<string, unknown>> => {
  const name = parseString(get(row, "Name"), 80);
  const balance = parseAmount(get(row, "Balance"));
  const originalBalance = parseAmount(get(row, "OriginalBalance", "Original Balance"));
  const rate = parseAmount(get(row, "Rate", "APR"));
  const minPayment = parseAmount(get(row, "MinPayment", "Min Payment", "MinimumPayment"));

  // Bounds mirror isDebtItem: balance/minPayment in [0, MAX_MONEY],
  // originalBalance >= 0.01, rate <= MAX_RATE. A "(500)" balance parses as
  // -500 via parseAmount; it must be skipped here, because the strict
  // sanitizer downstream rejects the entire file over one bad row.
  if (!name) {
    return skipRow("Name is missing");
  }
  if (!Number.isFinite(balance) || balance < 0 || balance > VALIDATOR_LIMITS.MAX_MONEY) {
    return skipRow("Balance must be a number of 0 or more");
  }
  if (
    !Number.isFinite(originalBalance) ||
    originalBalance < 0.01 ||
    originalBalance > VALIDATOR_LIMITS.MAX_MONEY
  ) {
    return skipRow("Original balance must be a positive number of at least 0.01");
  }
  if (!Number.isFinite(rate) || rate < 0 || rate > VALIDATOR_LIMITS.MAX_RATE) {
    return skipRow(`Rate / APR must be between 0 and ${VALIDATOR_LIMITS.MAX_RATE}`);
  }
  if (!Number.isFinite(minPayment) || minPayment < 0 || minPayment > VALIDATOR_LIMITS.MAX_MONEY) {
    return skipRow("Minimum payment must be a number of 0 or more");
  }

  const id = parseString(get(row, "ID", "Id"), 80) || generateUUID();
  const ownerRaw = parseString(get(row, "Owner")).toLowerCase();
  const owner = VALID_DEBT_OWNERS.has(ownerRaw) ? ownerRaw : "mine";
  const debtClassRaw = parseString(get(row, "DebtClass", "Debt Class")).toLowerCase();
  let debtClass: "personal_credit" | "car" | "house";
  if (VALID_DEBT_CLASSES.has(debtClassRaw)) {
    debtClass = debtClassRaw as "personal_credit" | "car" | "house";
  } else if (debtClassRaw === "car_house") {
    debtClass = splitLegacyCarHouse(name);
  } else {
    debtClass = "personal_credit";
  }
  const debtClassSourceRaw = parseString(
    get(row, "DebtClassSource", "Debt Class Source")
  ).toLowerCase();
  const debtClassSource = VALID_DEBT_CLASS_SOURCES.has(debtClassSourceRaw)
    ? debtClassSourceRaw
    : "inferred";
  const goalDate = parseDate(get(row, "GoalDate", "Goal Date"));
  const paymentDueDayRaw = parseAmount(
    get(row, "PaymentDueDay", "Payment Due Day", "DueDay", "Due Day")
  );
  const paymentDueDay =
    Number.isFinite(paymentDueDayRaw) &&
    paymentDueDayRaw >= 1 &&
    paymentDueDayRaw <= 31
      ? Math.floor(paymentDueDayRaw)
      : undefined;
  const createdAtIso = parseDate(get(row, "CreatedAt", "Created At"));
  const updatedAtIso = parseDate(get(row, "UpdatedAt", "Updated At"));
  const now = new Date().toISOString();

  // Card keep-alive watch. All optional; an out-of-range value drops just
  // that field (mirroring isDebtItem's bounds) rather than skipping the
  // whole debt - the watch is a convenience, the debt is the data. Blank
  // KeepAlive stays undefined so a workbook from before the column existed
  // doesn't flip every card to an explicit "off".
  const keepAliveRaw = parseString(get(row, "KeepAlive", "Keep Alive")).toLowerCase();
  const keepAliveEnabled = keepAliveRaw
    ? parseBoolean(keepAliveRaw)
    : undefined;
  const optionalInt = (raw: unknown, min: number, max: number): number | undefined => {
    if (raw === undefined || raw === null || String(raw).trim() === "") return undefined;
    const n = parseAmount(raw);
    return Number.isInteger(n) && n >= min && n <= max ? n : undefined;
  };
  const keepAliveWindowMonths = optionalInt(
    get(row, "KeepAliveWindowMonths", "Keep Alive Window Months"),
    1,
    KEEP_ALIVE_MAX_WINDOW_MONTHS
  );
  const keepAliveLeadDays = optionalInt(
    get(row, "KeepAliveLeadDays", "Keep Alive Lead Days"),
    1,
    KEEP_ALIVE_MAX_LEAD_DAYS
  );
  const keepAliveLastUsedAt =
    parseDate(get(row, "KeepAliveLastUsedAt", "Keep Alive Last Used At")) || undefined;

  // Preserve `updatedAt` so a paired sync doesn't treat every imported row
  // as "freshly edited" and clobber the partner's data. Falls back to
  // CreatedAt (the row pre-existed but the export was older than the
  // UpdatedAt column) and finally to `now` (no timestamp at all).
  return okRow({
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
    paymentDueDay,
    ...(keepAliveEnabled !== undefined ? { keepAliveEnabled } : {}),
    ...(keepAliveWindowMonths !== undefined ? { keepAliveWindowMonths } : {}),
    ...(keepAliveLeadDays !== undefined ? { keepAliveLeadDays } : {}),
    ...(keepAliveLastUsedAt ? { keepAliveLastUsedAt } : {}),
    createdAt: createdAtIso || now,
    updatedAt: updatedAtIso || createdAtIso || now,
  });
};

const rowToPayment = (row: Record<string, unknown>): RowResult<Record<string, unknown>> => {
  const debtId = parseString(get(row, "DebtID", "DebtId", "Debt ID"), 80);
  const amount = parseAmount(get(row, "Amount"));
  const dateIso = parseDate(get(row, "Date"));
  // Bounds mirror isPaymentItem (min 0.01, max MAX_MONEY); a parenthesized
  // "(50)" amount comes back negative from parseAmount and must be skipped
  // rather than poisoning the whole file in the strict sanitizer.
  if (!debtId) {
    return skipRow("Debt ID is missing (the payment isn't linked to a debt)");
  }
  if (!Number.isFinite(amount) || amount < 0.01 || amount > VALIDATOR_LIMITS.MAX_MONEY) {
    return skipRow("Amount must be a positive number of at least 0.01");
  }
  if (!dateIso) {
    return skipRow("Date is missing or could not be read");
  }
  const id = parseString(get(row, "ID", "Id"), 80) || generateUUID();
  const updatedAtIso = parseDate(get(row, "UpdatedAt", "Updated At"));
  // AppliedAmount: the slice of Amount that actually hit the balance
  // (overpayments are clamped). Optional; blank keeps the legacy "absent =
  // whole amount" meaning, and a nonsense value (negative, > Amount) is
  // dropped rather than skipping the payment - it only affects what a later
  // delete adds back.
  const appliedRaw = get(row, "AppliedAmount", "Applied Amount");
  const appliedParsed =
    appliedRaw === undefined || appliedRaw === null || String(appliedRaw).trim() === ""
      ? undefined
      : parseAmount(appliedRaw);
  const appliedAmount =
    appliedParsed !== undefined &&
    Number.isFinite(appliedParsed) &&
    appliedParsed >= 0 &&
    appliedParsed <= amount
      ? appliedParsed
      : undefined;
  // Preserve `updatedAt` to avoid clobbering partner data on next sync.
  return okRow({
    id,
    debtId,
    amount,
    ...(appliedAmount !== undefined ? { appliedAmount } : {}),
    date: dateIso,
    updatedAt: updatedAtIso || dateIso || new Date().toISOString(),
  });
};

const rowToSavingsGoal = (row: Record<string, unknown>): RowResult<Record<string, unknown>> => {
  const name = parseString(get(row, "Name"), 80);
  const categoryRaw = parseString(get(row, "Category")).toLowerCase();
  const category = VALID_SAVINGS_CATEGORIES.has(categoryRaw) ? categoryRaw : null;
  const targetAmount = parseAmount(get(row, "TargetAmount", "Target Amount"));
  const currentAmount = parseAmount(get(row, "CurrentAmount", "Current Amount"));

  // Bounds mirror isSavingsGoalItem: targetAmount in [0.01, MAX_MONEY],
  // currentAmount in [0, MAX_MONEY]. Out-of-range rows are skipped so the
  // strict downstream sanitizer can't abort the whole import over them.
  if (!name) {
    return skipRow("Name is missing");
  }
  if (!category) {
    return skipRow(
      `Category must be one of: ${[...VALID_SAVINGS_CATEGORIES].join(", ")}`
    );
  }
  if (
    !Number.isFinite(targetAmount) ||
    targetAmount < 0.01 ||
    targetAmount > VALIDATOR_LIMITS.MAX_MONEY
  ) {
    return skipRow("Target amount must be a positive number of at least 0.01");
  }
  if (
    !Number.isFinite(currentAmount) ||
    currentAmount < 0 ||
    currentAmount > VALIDATOR_LIMITS.MAX_MONEY
  ) {
    return skipRow("Current amount must be a number of 0 or more");
  }

  // The synthetic Emergency Fund row is removed up front by
  // isDerivedArtifactRow, so a row reaching here is a real, explicit goal.
  const id = parseString(get(row, "ID", "Id"), 80) || generateUUID();
  const targetDate = parseDate(get(row, "TargetDate", "Target Date"));
  const createdAt = parseDate(get(row, "CreatedAt", "Created At")) || new Date().toISOString();
  const updatedAtIso = parseDate(get(row, "UpdatedAt", "Updated At"));
  // Preserve `updatedAt` to avoid clobbering partner data on next sync.
  return okRow({
    id,
    name,
    category,
    targetAmount,
    currentAmount,
    targetDate: targetDate || undefined,
    createdAt,
    updatedAt: updatedAtIso || createdAt,
  });
};

const rowToAssetAccount = (row: Record<string, unknown>): RowResult<Record<string, unknown>> => {
  const name = parseString(get(row, "Name"), 80);
  const categoryRaw = parseString(get(row, "Category")).toLowerCase();
  const category: AssetAccountCategory | null = VALID_ASSET_CATEGORIES.has(categoryRaw)
    ? (categoryRaw as AssetAccountCategory)
    : null;
  const balance = parseAmount(get(row, "Balance"));

  // Bounds mirror isAssetAccountItem (balance in [0, MAX_MONEY]); an
  // accounting-style "(500)" balance parses negative and must be skipped,
  // not handed to the strict sanitizer which would abort the whole file.
  if (!name) {
    return skipRow("Name is missing");
  }
  if (!category) {
    return skipRow(
      `Category must be one of: ${[...VALID_ASSET_CATEGORIES].join(", ")}`
    );
  }
  if (!Number.isFinite(balance) || balance < 0 || balance > VALIDATOR_LIMITS.MAX_MONEY) {
    return skipRow("Balance must be a number of 0 or more");
  }
  const id = parseString(get(row, "ID", "Id"), 80) || generateUUID();
  const createdAt = parseDate(get(row, "CreatedAt", "Created At")) || new Date().toISOString();
  const updatedAtIso = parseDate(get(row, "UpdatedAt", "Updated At"));
  // Emergency-fund designation. Must round-trip (see ASSET_ACCOUNT_COLUMNS):
  // dropping it would silently flip the fund back to manual goal tracking.
  // Same truthy-cell parsing as Recurring; stored as `true`/absent, never
  // `false`, matching how the Bridge account editor writes it.
  const isEmergencyFund =
    parseBoolean(get(row, "EmergencyFund", "Emergency Fund")) || undefined;
  // Preserve `updatedAt` to avoid clobbering partner data on next sync.
  return okRow({
    id,
    name,
    category,
    balance,
    ...(isEmergencyFund ? { isEmergencyFund } : {}),
    createdAt,
    updatedAt: updatedAtIso || createdAt,
  });
};

/** Blank-aware optional money cell: undefined when empty, else parsed. */
const optionalMoney = (raw: unknown): number | undefined =>
  raw === undefined || raw === null || String(raw).trim() === ""
    ? undefined
    : parseAmount(raw);

const isMoneyInRange = (n: number, min = 0): boolean =>
  Number.isFinite(n) && n >= min && n <= VALIDATOR_LIMITS.MAX_MONEY;

/**
 * Three holding shapes share the sheet (see HOLDING_COLUMNS in the
 * exporter): a plain ticker, a proxy-tracked fund (Symbol is the proxy
 * ticker; value = AnchorValue × price / AnchorPrice), and a manual
 * fixed-value fund (no Symbol at all). Bounds mirror isHoldingItem's three
 * branches; a row that fits none is skipped with a reason so the strict
 * downstream sanitizer can't abort the whole import.
 */
const rowToHolding = (row: Record<string, unknown>): RowResult<Record<string, unknown>> => {
  const symbolRaw = parseString(get(row, "Symbol", "Ticker"), 12);
  const symbol = normalizeSymbol(symbolRaw);
  const sharesCell = get(row, "Shares");
  const shares = optionalMoney(sharesCell) ?? 0;
  const costBasis = optionalMoney(get(row, "CostBasis", "Cost Basis"));
  const name = parseString(get(row, "Name"), 80) || undefined;
  const manualValue = optionalMoney(get(row, "ManualValue", "Manual Value"));
  const anchorValue = optionalMoney(get(row, "AnchorValue", "Anchor Value"));
  const anchorPrice = optionalMoney(get(row, "AnchorPrice", "Anchor Price"));
  const accountId = parseString(get(row, "AccountId", "Account ID", "Account Id"), 80) || undefined;

  if (costBasis !== undefined && !isMoneyInRange(costBasis)) {
    return skipRow("Cost basis must be a number of 0 or more");
  }
  if (symbolRaw && !isValidSymbol(symbol)) {
    return skipRow(`Symbol "${symbolRaw}" is not a valid ticker`);
  }

  let shape: Record<string, unknown>;
  if (anchorValue !== undefined) {
    // Proxy-tracked. isHoldingItem requires the anchor price too; a proxy
    // that was never priced can't be represented, so the row is skipped
    // rather than guessed into a different kind.
    if (!symbolRaw) return skipRow("Proxy holding needs a Symbol (the proxy ticker)");
    if (!name) return skipRow("Proxy holding needs a Name");
    if (!isMoneyInRange(anchorValue)) return skipRow("Anchor value must be a number of 0 or more");
    if (anchorPrice === undefined || !isMoneyInRange(anchorPrice) || anchorPrice <= 0) {
      return skipRow("Proxy holding needs a positive AnchorPrice");
    }
    shape = { symbol, shares: isMoneyInRange(shares) ? shares : 0, name, anchorValue, anchorPrice };
  } else if (manualValue !== undefined) {
    // Manual fixed value: a named position with no ticker.
    if (!name) return skipRow("Manual-value holding needs a Name");
    if (!isMoneyInRange(manualValue)) return skipRow("Manual value must be a number of 0 or more");
    shape = { symbol: "", shares: isMoneyInRange(shares) ? shares : 0, name, manualValue };
  } else {
    // Plain ticker (the legacy shape).
    if (!symbolRaw) return skipRow("Symbol is missing");
    if (!isMoneyInRange(shares) || shares <= 0) {
      return skipRow("Shares must be a positive number");
    }
    shape = { symbol, shares, ...(name ? { name } : {}) };
  }

  const id = parseString(get(row, "ID", "Id"), 80) || generateUUID();
  const createdAt = parseDate(get(row, "CreatedAt", "Created At")) || new Date().toISOString();
  const updatedAtIso = parseDate(get(row, "UpdatedAt", "Updated At"));
  // Preserve `updatedAt` to avoid clobbering partner data on next sync.
  return okRow({
    id,
    ...shape,
    costBasis,
    ...(accountId ? { accountId } : {}),
    createdAt,
    updatedAt: updatedAtIso || createdAt,
  });
};

const rowToBusiness = (row: Record<string, unknown>): RowResult<Record<string, unknown>> => {
  // Cap mirrors MAX_BUSINESS_NAME_LENGTH / isBusinessItem (40).
  const name = parseString(get(row, "Name"), 40);
  if (!name) {
    return skipRow("Name is missing");
  }
  const id = parseString(get(row, "ID", "Id"), 80) || generateUUID();
  const createdAt = parseDate(get(row, "CreatedAt", "Created At")) || new Date().toISOString();
  const updatedAtIso = parseDate(get(row, "UpdatedAt", "Updated At"));
  // Preserve `updatedAt` so the LWW merge in importData / paired sync can
  // order this row against local edits instead of treating it as fresh.
  return okRow({
    id,
    name,
    createdAt,
    updatedAt: updatedAtIso || createdAt,
  });
};

const rowToPerson = (row: Record<string, unknown>): RowResult<Record<string, unknown>> => {
  // Cap mirrors MAX_PERSON_NAME_LENGTH / isPersonItem (40).
  const name = parseString(get(row, "Name"), 40);
  if (!name) {
    return skipRow("Name is missing");
  }
  const id = parseString(get(row, "ID", "Id"), 80) || generateUUID();
  const createdAt = parseDate(get(row, "CreatedAt", "Created At")) || new Date().toISOString();
  const updatedAtIso = parseDate(get(row, "UpdatedAt", "Updated At"));
  // Same LWW-preserving rationale as rowToBusiness above.
  return okRow({
    id,
    name,
    createdAt,
    updatedAt: updatedAtIso || createdAt,
  });
};

/* ── Skipped-row reporting ── */

/** One invalid row that was dropped, with enough context to find and fix it. */
export interface SkippedRowInfo {
  /** Sheet the row came from, e.g. "Budget Entries". */
  sheet: string;
  /** Short identifier built from the row's own cells, e.g. "Groceries · 2026-03-15". */
  descriptor: string;
  /** Why the row was rejected, e.g. "Amount must be a positive number". */
  reason: string;
}

/**
 * Builds a short human label for a row from whichever identifying cells are
 * present, so a skipped-row report points at a recognizable line rather than
 * a bare row number (total/derived filtering makes true row numbers unreliable
 * anyway). Falls back to the first non-empty cell.
 */
const describeRow = (row: Record<string, unknown>): string => {
  const fields = [
    parseString(get(row, "Name"), 40),
    parseString(get(row, "Category"), 40),
    parseString(get(row, "Type"), 20),
    parseString(get(row, "Date"), 20),
    parseString(get(row, "Amount", "Balance", "MonthlyLimit", "Monthly Limit", "Limit"), 20),
  ].filter((v) => v.length > 0);
  if (fields.length > 0) return fields.slice(0, 3).join(" · ");
  const firstValue = Object.values(row).find(
    (v) => v != null && String(v).trim().length > 0
  );
  return firstValue != null ? String(firstValue).trim().slice(0, 40) : "(blank row)";
};

/**
 * Maps every row in a sheet, splitting results into valid entities and a list
 * of skipped rows annotated with sheet, descriptor, and reason.
 */
const processSheet = (
  sheet: string,
  rows: Record<string, unknown>[],
  mapper: (row: Record<string, unknown>) => RowResult<Record<string, unknown>>
): { valid: Record<string, unknown>[]; skipped: SkippedRowInfo[] } => {
  const valid: Record<string, unknown>[] = [];
  const skipped: SkippedRowInfo[] = [];
  for (const row of rows) {
    const result = mapper(row);
    if (result.ok) {
      valid.push(result.value);
    } else {
      skipped.push({ sheet, descriptor: describeRow(row), reason: result.reason });
    }
  }
  return { valid, skipped };
};

/* ── Public API ── */

export interface SpreadsheetImportResult extends ImportResult {
  /** Number of rows the spreadsheet contained that we could not parse. */
  skippedRows: number;
  /**
   * Per-row detail for each skipped (invalid) row. Excludes the exporter's
   * own derived/projected artifacts, which are filtered before counting.
   */
  skippedRowDetails: SkippedRowInfo[];
}

/**
 * Picks a spreadsheet file, parses it, and pipes the normalized payload
 * through importFromString so it gets the same validation + transactional
 * write semantics as JSON imports.
 */
export const importSpreadsheet = async (
  mode: "merge" | "replace" = "merge"
): Promise<SpreadsheetImportResult | null> => {
  const picked = await openDocumentPicker({
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
      // raw:true disables SheetJS's CSV type inference so every cell reaches
      // the row mappers as the string the user actually wrote. Inference is
      // lossy in exactly the ways the mappers guard against: fuzzynum strips
      // commas ("1.234,56" -> 1.23456, silently wrong money) and fuzzydate
      // rolls invalid dates over ("2/30/2026" -> March 2) before parseAmount
      // / parseDate can fail closed.
      workbook = XLSX.read(csvText, { type: "string", cellDates: true, raw: true });
    } else {
      const base64 = await new ExpoFile(file.uri).base64();
      workbook = XLSX.read(base64, { type: "base64", cellDates: true });
    }
  } catch {
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
  const holdingsSheet = isCsv ? undefined : findSheet(workbook, "Holdings");
  const businessesSheet = isCsv ? undefined : findSheet(workbook, "Businesses");
  const peopleSheet = isCsv ? undefined : findSheet(workbook, "People");

  // Drop the exporter's own round-trip artifacts (projected recurring copies,
  // synthetic Emergency Fund) up front so they count toward neither the valid
  // total nor `skippedRows` - they carry no user data and are not "invalid".
  const entryRows = sheetToRows(budgetEntriesSheet).filter(
    (r) => !isDerivedArtifactRow(r)
  );
  const limitRows = sheetToRows(budgetLimitsSheet);
  const debtRows = sheetToRows(debtsSheet);
  const paymentRows = sheetToRows(paymentsSheet);
  const savingsRows = sheetToRows(savingsGoalsSheet).filter(
    (r) => !isDerivedArtifactRow(r)
  );
  const accountRows = sheetToRows(assetAccountsSheet);
  const holdingRows = sheetToRows(holdingsSheet);
  const businessRows = sheetToRows(businessesSheet);
  const peopleRows = sheetToRows(peopleSheet);

  if (
    entryRows.length === 0 &&
    limitRows.length === 0 &&
    debtRows.length === 0 &&
    paymentRows.length === 0 &&
    savingsRows.length === 0 &&
    accountRows.length === 0 &&
    holdingRows.length === 0 &&
    businessRows.length === 0 &&
    peopleRows.length === 0
  ) {
    throw new Error(
      'No recognized sheets found. Expected a "Budget Entries" sheet (or one of: Budget Limits, Debts, Payments, Savings Goals, Asset Accounts, Holdings).'
    );
  }

  const entryResult = processSheet("Budget Entries", entryRows, rowToBudgetEntry);
  const limitResult = processSheet("Budget Limits", limitRows, rowToBudgetLimit);
  const debtResult = processSheet("Debts", debtRows, rowToDebt);
  const paymentResult = processSheet("Payments", paymentRows, rowToPayment);
  const savingsResult = processSheet("Savings Goals", savingsRows, rowToSavingsGoal);
  const accountResult = processSheet("Asset Accounts", accountRows, rowToAssetAccount);
  const holdingResult = processSheet("Holdings", holdingRows, rowToHolding);
  const businessResult = processSheet("Businesses", businessRows, rowToBusiness);
  const peopleResult = processSheet("People", peopleRows, rowToPerson);

  const budgetEntries = entryResult.valid;
  const budgetLimits = limitResult.valid;
  const debts = debtResult.valid;
  const payments = paymentResult.valid;
  const savingsGoals = savingsResult.valid;
  const assetAccounts = accountResult.valid;
  const holdings = holdingResult.valid;
  const businesses = businessResult.valid;
  const people = peopleResult.valid;

  // Each skipped row is genuinely invalid (derived artifacts were filtered
  // out above), so the count and the detail list line up exactly.
  const skippedRowDetails: SkippedRowInfo[] = [
    ...entryResult.skipped,
    ...limitResult.skipped,
    ...debtResult.skipped,
    ...paymentResult.skipped,
    ...savingsResult.skipped,
    ...accountResult.skipped,
    ...holdingResult.skipped,
    ...businessResult.skipped,
    ...peopleResult.skipped,
  ];
  const skippedRows = skippedRowDetails.length;

  const totalEntitiesValid =
    budgetEntries.length +
    budgetLimits.length +
    debts.length +
    payments.length +
    savingsGoals.length +
    assetAccounts.length +
    holdings.length +
    businesses.length +
    people.length;

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
    holdings,
    businesses,
    people,
  };

  const result = await importFromString(JSON.stringify(payload), mode);

  return {
    ...result,
    skippedRows,
    skippedRowDetails,
  };
};

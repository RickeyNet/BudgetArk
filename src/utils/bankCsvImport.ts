/**
 * BudgetArk - Bank Statement CSV Import (pure)
 * File: src/utils/bankCsvImport.ts
 *
 * Turns the transaction CSV a bank's website exports into the same
 * NormalizedTransaction shape the bank-connection fetchers produce, so a
 * downloaded statement flows through the Review Inbox exactly like a
 * SimpleFIN or Teller sync: merchant rules, duplicate flags, approve /
 * dismiss, the ingest ledger. Nothing here touches storage or the network;
 * the side-effecting shell is services/connections/csvStatementImport.ts.
 *
 * Every bank lays its CSV out differently (Chase signs the amount, Capital
 * One splits debit/credit, Amex lists charges as positive, Wells Fargo
 * ships no header row, Bank of America prefixes a summary block), so the
 * file is parsed into a header + rows matrix, a mapping is GUESSED from the
 * headers and the data, and the user confirms or corrects it in
 * BankStatementImportModal before anything is imported. The confirmed
 * mapping is remembered per header signature (statementImportMappingsStorage)
 * so the second statement from the same bank is one tap.
 *
 * Identity: a CSV row carries no bank-issued id, so one is derived from the
 * day, the signed amount, the normalized description and the row's ordinal
 * among identical rows in the file. Deterministic, so re-importing the same
 * statement (or an overlapping date range from the same bank) dedupes
 * through the planner's ledger / inbox / entry checks instead of doubling.
 *
 * Fail closed: unreadable dates and amounts skip the row (reported, never
 * guessed); zero-amount rows are dropped like the planner drops them.
 */

import * as XLSX from "xlsx";
import CryptoJS from "crypto-js";
import type { NormalizedTransaction } from "../services/connections/types";
import type { PendingTransaction } from "../types";
import { parseMoney } from "./importPresets";
import { sanitizeTextInput } from "./sanitize";

/** Cap raw file size - a year of card activity is well under 1 MB. */
export const MAX_STATEMENT_FILE_BYTES = 5 * 1024 * 1024;
/** Cap parsed rows, mirroring the spreadsheet importer. */
export const MAX_STATEMENT_ROWS = 5000;

/**
 * The connectionId stamped on inbox items from statement files. Never a
 * real BankConnection: the Connections manager ignores it, and nothing
 * purges inbox rows by this id (purgePendingForConnection runs only when a
 * real connection is removed).
 */
export const STATEMENT_CONNECTION_ID = "csv-import";

/**
 * Statement "accounts" are identified by a labelled key rather than a bank
 * account id: `csv:<label>`. The label is what the Review Inbox shows
 * (see statementAccountLabelFrom) - there is no ExternalAccountLink to
 * look a name up from.
 */
export const STATEMENT_ACCOUNT_PREFIX = "csv:";
export const DEFAULT_STATEMENT_ACCOUNT_LABEL = "Bank statement";
export const MAX_STATEMENT_ACCOUNT_LABEL_LENGTH = 40;

/** Longest description stored on an inbox item (mirrors the planner's cap). */
const MAX_DESCRIPTION_LENGTH = 220;

export type AmountLayout = "signed" | "split";

export interface BankCsvMapping {
  dateColumn: string;
  descriptionColumn: string;
  /** One signed amount column, or separate outflow / inflow columns. */
  layout: AmountLayout;
  /** `signed` layout: the amount column. */
  amountColumn?: string;
  /** `split` layout: the outflow (debit / withdrawal) column. */
  debitColumn?: string;
  /** `split` layout: the inflow (credit / deposit) column. */
  creditColumn?: string;
  /**
   * `signed` layout only. Checking exports write spending as negative
   * numbers; most credit-card exports write charges as POSITIVE and
   * payments as negative. True flips the sign so outflows end up negative.
   */
  positiveIsOutflow: boolean;
}

export interface ParsedStatementFile {
  headers: string[];
  /** One record per data row, keyed by header; missing cells are "". */
  rows: Record<string, string>[];
  /** True when no header row was found - columns are named "Column N". */
  headerless: boolean;
  /** Rows above the header row (bank preamble / summary block), ignored. */
  preambleRows: number;
}

export interface SkippedStatementRow {
  /** 1-based row number in the parsed data (after the header). */
  rowNumber: number;
  reason: string;
}

export interface StatementParseResult {
  transactions: NormalizedTransaction[];
  skipped: SkippedStatementRow[];
  /** Rows with a readable amount of exactly zero - not spending or income. */
  zeroRows: number;
}

/* ─── Account label / id ─── */

/**
 * Trim, drop control characters and the fingerprint separator ("|" - see
 * ingest.pendingFingerprintFor), cap; falls back to the default label.
 */
export const normalizeStatementAccountLabel = (raw: string | undefined): string => {
  const clean = sanitizeTextInput(raw ?? "")
    .replace(/\|/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_STATEMENT_ACCOUNT_LABEL_LENGTH)
    .trim();
  return clean || DEFAULT_STATEMENT_ACCOUNT_LABEL;
};

export const statementAccountIdFor = (label: string | undefined): string =>
  `${STATEMENT_ACCOUNT_PREFIX}${normalizeStatementAccountLabel(label)}`;

/** The label behind a statement account id; undefined for real bank accounts. */
export const statementAccountLabelFrom = (
  externalAccountId: string,
): string | undefined =>
  externalAccountId.startsWith(STATEMENT_ACCOUNT_PREFIX)
    ? externalAccountId.slice(STATEMENT_ACCOUNT_PREFIX.length) ||
      DEFAULT_STATEMENT_ACCOUNT_LABEL
    : undefined;

/* ─── Dates ─── */

const dateOnlyToNoonUtcIso = (y: number, m: number, d: number): string | null => {
  if (y < 1970 || y > 2100) return null;
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  if (
    Number.isNaN(dt.getTime()) ||
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return dt.toISOString();
};

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9,
  september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

const expandYear = (raw: string): number =>
  raw.length === 2 ? 2000 + Number(raw) : Number(raw);

/**
 * A statement date cell -> noon-UTC ISO (the app's date-only convention,
 * see spreadsheetImport.parseDate), or "" when unreadable. Accepts ISO
 * (with or without a time), YYYY/MM/DD, US M/D/YYYY and M/D/YY with "/",
 * "-" or "." separators (day-first only when the first field cannot be a
 * month), and "Jan 5, 2026" / "5 Jan 2026" / "05-Jan-2026". Trailing time
 * parts are ignored - a statement date is a calendar day.
 */
export const parseStatementDate = (raw: unknown): string => {
  if (raw == null) return "";
  const s = String(raw).trim();
  if (!s) return "";

  const iso = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s].*)?$/);
  if (iso) {
    return dateOnlyToNoonUtcIso(Number(iso[1]), Number(iso[2]), Number(iso[3])) ?? "";
  }

  const numeric = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})(?:[T\s].*)?$/);
  if (numeric) {
    let first = Number(numeric[1]);
    let second = Number(numeric[2]);
    // US order by default; an impossible month in the first slot means the
    // file is day-first (13/01/2026).
    if (first > 12 && second <= 12) [first, second] = [second, first];
    return dateOnlyToNoonUtcIso(expandYear(numeric[3]), first, second) ?? "";
  }

  const monthFirst = s.match(
    /^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{2}|\d{4})(?:[T\s].*)?$/,
  );
  if (monthFirst) {
    const month = MONTHS[monthFirst[1].toLowerCase()];
    if (!month) return "";
    return (
      dateOnlyToNoonUtcIso(expandYear(monthFirst[3]), month, Number(monthFirst[2])) ?? ""
    );
  }

  const dayFirst = s.match(
    /^(\d{1,2})[-\s]([A-Za-z]{3,9})\.?[-\s,]+(\d{2}|\d{4})(?:[T\s].*)?$/,
  );
  if (dayFirst) {
    const month = MONTHS[dayFirst[2].toLowerCase()];
    if (!month) return "";
    return (
      dateOnlyToNoonUtcIso(expandYear(dayFirst[3]), month, Number(dayFirst[1])) ?? ""
    );
  }

  return "";
};

const looksLikeDate = (cell: string): boolean => parseStatementDate(cell) !== "";
const looksLikeMoney = (cell: string): boolean => {
  const trimmed = cell.trim();
  return trimmed !== "" && Number.isFinite(parseMoney(trimmed));
};

/* ─── File -> headers + rows ─── */

/** One cell as clean single-line text: control characters out, whitespace collapsed. */
const cellText = (cell: unknown): string =>
  cell == null ? "" : sanitizeTextInput(String(cell)).replace(/\s+/g, " ").trim();

const nonEmptyCount = (row: string[]): number =>
  row.filter((cell) => cell !== "").length;

/**
 * Parse CSV text into headers + rows. The header row is the last row with
 * two or more filled cells before the first row that contains a date -
 * so a bank preamble ("Account: ...", a summary block, blank lines) is
 * skipped and a file with no header row at all (Wells Fargo) gets
 * generated column names. Throws on an empty file or one over the row cap.
 */
export const parseStatementCsv = (text: string): ParsedStatementFile => {
  let matrix: unknown[][];
  try {
    // raw:true keeps every cell as the text the bank wrote - SheetJS type
    // inference would otherwise reformat dates and strip thousands
    // separators before the fail-closed parsers here can see them.
    const workbook = XLSX.read(text, { type: "string", raw: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    matrix = sheet
      ? XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "" })
      : [];
  } catch {
    throw new Error(
      "Could not read the file. Make sure it is a CSV export from your bank.",
    );
  }

  const lines = matrix
    .map((row) => (Array.isArray(row) ? row.map(cellText) : []))
    .filter((row) => nonEmptyCount(row) > 0);
  if (lines.length === 0) throw new Error("The file is empty.");
  if (lines.length > MAX_STATEMENT_ROWS + 1) {
    throw new Error(
      `The file has too many rows (${lines.length}). Maximum is ${MAX_STATEMENT_ROWS} - export a shorter date range.`,
    );
  }

  const firstDataIndex = lines.findIndex((row) => row.some(looksLikeDate));
  if (firstDataIndex === -1) {
    throw new Error(
      "No transaction rows found - the file has no column with dates in it.",
    );
  }

  let headerIndex = -1;
  for (let i = firstDataIndex - 1; i >= 0; i -= 1) {
    if (nonEmptyCount(lines[i]) >= 2) {
      headerIndex = i;
      break;
    }
  }

  const dataRows = lines.slice(firstDataIndex);
  const width = Math.max(
    headerIndex >= 0 ? lines[headerIndex].length : 0,
    ...dataRows.map((row) => row.length),
  );

  const headers: string[] = [];
  const seen = new Map<string, number>();
  for (let i = 0; i < width; i += 1) {
    const raw = headerIndex >= 0 ? lines[headerIndex][i] ?? "" : "";
    let name = raw || `Column ${i + 1}`;
    const count = seen.get(name.toLowerCase()) ?? 0;
    seen.set(name.toLowerCase(), count + 1);
    if (count > 0) name = `${name} (${count + 1})`;
    headers.push(name);
  }

  const rows = dataRows.map((cells) => {
    const record: Record<string, string> = {};
    headers.forEach((header, i) => {
      record[header] = cells[i] ?? "";
    });
    return record;
  });

  return {
    headers,
    rows,
    headerless: headerIndex === -1,
    preambleRows: headerIndex === -1 ? firstDataIndex : headerIndex,
  };
};

/**
 * Stable key for "the same bank layout": the lowercased headers in file
 * order (cells never contain newlines after cellText, so "\n" is a safe
 * separator). Headerless files key on their column count.
 */
export const statementHeaderSignature = (
  file: Pick<ParsedStatementFile, "headers" | "headerless">,
): string =>
  file.headerless
    ? `headerless:${file.headers.length}`
    : file.headers.map((header) => header.trim().toLowerCase()).join("\n");

/* ─── Mapping guesses ─── */

const normalize = (header: string): string => header.trim().toLowerCase();

/** First header matching a candidate list, in candidate priority order. */
const pickHeader = (
  headers: readonly string[],
  candidates: readonly string[],
): string | undefined => {
  const lowered = headers.map(normalize);
  for (const candidate of candidates) {
    const index = lowered.indexOf(candidate);
    if (index >= 0) return headers[index];
  }
  return undefined;
};

const pickHeaderContaining = (
  headers: readonly string[],
  needle: string,
  exclude: readonly string[] = [],
): string | undefined =>
  headers.find((header) => {
    const lower = normalize(header);
    return lower.includes(needle) && !exclude.some((word) => lower.includes(word));
  });

const DATE_HEADERS = [
  "transaction date", "trans date", "trans. date", "date", "posted date", "post date",
  "posting date", "booking date", "value date", "transaction_date", "run date",
];
const DESCRIPTION_HEADERS = [
  "description", "transaction description", "original description", "payee", "merchant",
  "name", "memo", "details", "transaction details", "narrative", "reference",
  "transaction", "particulars", "action",
];
const AMOUNT_HEADERS = [
  "amount", "transaction amount", "amount (usd)", "amount ($)", "value", "sum",
];
const DEBIT_HEADERS = [
  "debit", "debits", "withdrawal", "withdrawals", "withdrawal (-)", "outflow",
  "money out", "paid out", "charge", "charges", "debit amount", "withdrawal amount",
];
const CREDIT_HEADERS = [
  "credit", "credits", "deposit", "deposits", "deposit (+)", "inflow", "money in",
  "paid in", "credit amount", "deposit amount",
];

/** Share of rows whose cell in `column` passes `test`. */
const columnShare = (
  rows: readonly Record<string, string>[],
  column: string,
  test: (cell: string) => boolean,
): number => {
  const sample = rows.slice(0, 200);
  if (sample.length === 0) return 0;
  return sample.filter((row) => test(row[column] ?? "")).length / sample.length;
};

/**
 * `signed` layout: true when charges look positive. Most people have far
 * more purchases than payments or deposits, so the majority sign of the
 * amount column is the direction of SPENDING: mostly negative = checking-
 * style export (leave alone), mostly positive = card-style export (flip).
 * The user sees the result in the preview and can override it.
 */
export const guessPositiveIsOutflow = (
  rows: readonly Record<string, string>[],
  amountColumn: string,
): boolean => {
  let positive = 0;
  let negative = 0;
  for (const row of rows.slice(0, 500)) {
    const value = parseMoney((row[amountColumn] ?? "").trim());
    if (!Number.isFinite(value) || value === 0) continue;
    if (value > 0) positive += 1;
    else negative += 1;
  }
  return positive > negative;
};

/**
 * Best guess at the column mapping from the headers (and, for headerless
 * files, the data). Any field it cannot place is left undefined for the
 * user to pick; see isMappingComplete.
 */
export const guessBankCsvMapping = (
  file: ParsedStatementFile,
): Partial<BankCsvMapping> => {
  const { headers, rows } = file;
  const guess: Partial<BankCsvMapping> = { layout: "signed", positiveIsOutflow: false };

  if (!file.headerless) {
    guess.dateColumn =
      pickHeader(headers, DATE_HEADERS) ?? pickHeaderContaining(headers, "date", ["update"]);
    guess.descriptionColumn =
      pickHeader(headers, DESCRIPTION_HEADERS) ?? pickHeaderContaining(headers, "desc");

    const debit =
      pickHeader(headers, DEBIT_HEADERS) ?? pickHeaderContaining(headers, "withdrawal");
    const credit =
      pickHeader(headers, CREDIT_HEADERS) ?? pickHeaderContaining(headers, "deposit");
    if (debit && credit && debit !== credit) {
      guess.layout = "split";
      guess.debitColumn = debit;
      guess.creditColumn = credit;
    } else {
      guess.amountColumn =
        pickHeader(headers, AMOUNT_HEADERS) ??
        pickHeaderContaining(headers, "amount", ["balance"]);
    }
  } else {
    // No names to go on: type each column from its cells. Dates first;
    // then money columns (the first one is the amount - a running balance,
    // when present, comes after it); the longest text column is the
    // description.
    const dateColumns = headers.filter(
      (header) => columnShare(rows, header, looksLikeDate) >= 0.8,
    );
    guess.dateColumn = dateColumns[0];
    const moneyColumns = headers.filter(
      (header) =>
        !dateColumns.includes(header) && columnShare(rows, header, looksLikeMoney) >= 0.8,
    );
    guess.amountColumn = moneyColumns[0];
    const textColumns = headers.filter(
      (header) => !dateColumns.includes(header) && !moneyColumns.includes(header),
    );
    let best: { header: string; length: number } | undefined;
    for (const header of textColumns) {
      const length = rows
        .slice(0, 200)
        .reduce((sum, row) => sum + (row[header] ?? "").length, 0);
      if (!best || length > best.length) best = { header, length };
    }
    guess.descriptionColumn = best?.header;
  }

  if (guess.layout === "signed" && guess.amountColumn) {
    guess.positiveIsOutflow = guessPositiveIsOutflow(rows, guess.amountColumn);
  }
  return guess;
};

export const isMappingComplete = (
  mapping: Partial<BankCsvMapping>,
): mapping is BankCsvMapping => {
  if (!mapping.dateColumn || !mapping.descriptionColumn) return false;
  if (mapping.layout === "split") {
    return (
      !!mapping.debitColumn &&
      !!mapping.creditColumn &&
      mapping.debitColumn !== mapping.creditColumn
    );
  }
  return mapping.layout === "signed" && !!mapping.amountColumn;
};

/* ─── Rows -> transactions ─── */

const descriptionKey = (description: string): string =>
  description.toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Deterministic id for a statement row. The ordinal makes two identical
 * rows in one file (two same-price coffees on one day) two transactions
 * while keeping a re-import of the same file a no-op.
 */
export const statementTransactionId = (
  day: string,
  amount: number,
  description: string,
  ordinal: number,
): string =>
  `csv-${CryptoJS.SHA256(
    `${day}|${amount.toFixed(2)}|${descriptionKey(description)}|${ordinal}`,
  )
    .toString(CryptoJS.enc.Hex)
    .slice(0, 32)}`;

const roundCents = (value: number): number => Math.round(value * 100) / 100;

/**
 * Apply a complete mapping to the parsed rows. Unreadable dates / amounts
 * skip the row with a reason (surfaced in the summary), zero amounts are
 * counted and dropped, everything else becomes a posted (never pending)
 * NormalizedTransaction on the given statement account.
 */
export const parseStatementRows = (
  file: ParsedStatementFile,
  mapping: BankCsvMapping,
  externalAccountId: string,
): StatementParseResult => {
  const result: StatementParseResult = { transactions: [], skipped: [], zeroRows: 0 };
  const ordinals = new Map<string, number>();

  file.rows.forEach((row, index) => {
    const rowNumber = index + 1;
    const dateRaw = row[mapping.dateColumn] ?? "";
    const postedAt = parseStatementDate(dateRaw);
    if (!postedAt) {
      result.skipped.push({ rowNumber, reason: `Unreadable date "${dateRaw}"` });
      return;
    }

    let amount: number;
    if (mapping.layout === "split") {
      const debitRaw = (row[mapping.debitColumn ?? ""] ?? "").trim();
      const creditRaw = (row[mapping.creditColumn ?? ""] ?? "").trim();
      const debit = debitRaw ? parseMoney(debitRaw) : 0;
      const credit = creditRaw ? parseMoney(creditRaw) : 0;
      if (!Number.isFinite(debit) || !Number.isFinite(credit)) {
        result.skipped.push({ rowNumber, reason: "Unreadable amount" });
        return;
      }
      // Some banks already write debits as negatives inside the debit
      // column; the column carries the direction, so use magnitudes.
      amount = Math.abs(credit) - Math.abs(debit);
    } else {
      const raw = (row[mapping.amountColumn ?? ""] ?? "").trim();
      const value = parseMoney(raw);
      if (!Number.isFinite(value)) {
        result.skipped.push({ rowNumber, reason: `Unreadable amount "${raw}"` });
        return;
      }
      amount = mapping.positiveIsOutflow ? -value : value;
    }
    amount = roundCents(amount);
    if (amount === 0) {
      result.zeroRows += 1;
      return;
    }

    const description = (row[mapping.descriptionColumn] ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_DESCRIPTION_LENGTH);

    const day = postedAt.slice(0, 10);
    const fingerprint = `${day}|${amount.toFixed(2)}|${descriptionKey(description)}`;
    const ordinal = ordinals.get(fingerprint) ?? 0;
    ordinals.set(fingerprint, ordinal + 1);

    result.transactions.push({
      providerTxId: statementTransactionId(day, amount, description, ordinal),
      externalAccountId,
      postedAt,
      amount,
      description,
      pending: false,
    });
  });

  return result;
};

/* ─── Inbox capacity ─── */

/**
 * The Review Inbox keeps at most MAX_INBOX_SIZE rows and silently drops
 * the oldest on overflow - a 1,500-row statement would lose two thirds of
 * itself. Keep the newest `room` items and report the rest as deferred;
 * their ids are deterministic, so re-importing the same file after the
 * inbox is cleared picks them up (the kept ones dedupe away).
 */
export const selectWithinInboxCapacity = <T extends Pick<PendingTransaction, "postedAt">>(
  items: readonly T[],
  room: number,
): { kept: T[]; deferred: T[] } => {
  const sorted = [...items].sort((a, b) => b.postedAt.localeCompare(a.postedAt));
  const limit = Math.max(0, Math.floor(room));
  return { kept: sorted.slice(0, limit), deferred: sorted.slice(limit) };
};

/**
 * BudgetArk - Bank Statement CSV Import tests
 * File: src/utils/__tests__/bankCsvImport.test.ts
 *
 * Pins the pure parser + mapping guesser against the CSV shapes the common
 * US banks export (Chase signed amount, Capital One / Wells Fargo variants,
 * Amex positive charges, a headerless file, a Bank of America summary
 * preamble), the fail-closed date/amount rules, and the deterministic row
 * ids that let re-imports dedupe.
 */

import {
  DEFAULT_STATEMENT_ACCOUNT_LABEL,
  guessBankCsvMapping,
  guessPositiveIsOutflow,
  isMappingComplete,
  normalizeStatementAccountLabel,
  parseStatementCsv,
  parseStatementDate,
  parseStatementRows,
  selectWithinInboxCapacity,
  statementAccountIdFor,
  statementAccountLabelFrom,
  statementHeaderSignature,
  statementTransactionId,
  type BankCsvMapping,
} from "../bankCsvImport";

const complete = (m: Partial<BankCsvMapping>): BankCsvMapping => {
  if (!isMappingComplete(m)) throw new Error("mapping incomplete in test setup");
  return m;
};

describe("parseStatementDate", () => {
  it("accepts ISO, US, and named-month formats to noon UTC", () => {
    expect(parseStatementDate("2026-01-05")).toBe("2026-01-05T12:00:00.000Z");
    expect(parseStatementDate("1/5/2026")).toBe("2026-01-05T12:00:00.000Z");
    expect(parseStatementDate("01/05/26")).toBe("2026-01-05T12:00:00.000Z");
    expect(parseStatementDate("Jan 5, 2026")).toBe("2026-01-05T12:00:00.000Z");
    expect(parseStatementDate("5 Jan 2026")).toBe("2026-01-05T12:00:00.000Z");
    expect(parseStatementDate("05-Jan-2026")).toBe("2026-01-05T12:00:00.000Z");
    expect(parseStatementDate("2026/01/05")).toBe("2026-01-05T12:00:00.000Z");
  });

  it("ignores a trailing time and dotted separators", () => {
    expect(parseStatementDate("2026-01-05T00:00:00")).toBe("2026-01-05T12:00:00.000Z");
    expect(parseStatementDate("01.05.2026")).toBe("2026-01-05T12:00:00.000Z");
  });

  it("reads day-first only when the first field cannot be a month", () => {
    // 13 is not a month, so 13/01 is 13 Jan.
    expect(parseStatementDate("13/01/2026")).toBe("2026-01-13T12:00:00.000Z");
    // Ambiguous stays US: 01/13 is 13 Jan too, from the other order.
    expect(parseStatementDate("01/13/2026")).toBe("2026-01-13T12:00:00.000Z");
  });

  it("fails closed on garbage and impossible dates", () => {
    expect(parseStatementDate("")).toBe("");
    expect(parseStatementDate("not a date")).toBe("");
    expect(parseStatementDate("2/30/2026")).toBe("");
    expect(parseStatementDate("13/13/2026")).toBe("");
    expect(parseStatementDate(undefined)).toBe("");
    expect(parseStatementDate("Balance")).toBe("");
  });
});

describe("account labels", () => {
  it("normalizes, strips the fingerprint separator, and defaults", () => {
    expect(normalizeStatementAccountLabel("  Chase  Checking ")).toBe("Chase Checking");
    expect(normalizeStatementAccountLabel("a|b")).toBe("ab");
    expect(normalizeStatementAccountLabel("")).toBe(DEFAULT_STATEMENT_ACCOUNT_LABEL);
    expect(normalizeStatementAccountLabel(undefined)).toBe(DEFAULT_STATEMENT_ACCOUNT_LABEL);
  });

  it("round-trips id <-> label and ignores non-statement ids", () => {
    const id = statementAccountIdFor("Amex Gold");
    expect(id).toBe("csv:Amex Gold");
    expect(statementAccountLabelFrom(id)).toBe("Amex Gold");
    expect(statementAccountLabelFrom("simplefin-acct-1")).toBeUndefined();
  });
});

describe("parseStatementCsv - real bank shapes", () => {
  it("Chase: a signed Amount column with a header row", () => {
    const csv = [
      "Details,Posting Date,Description,Amount,Type,Balance",
      "DEBIT,01/05/2026,COSTCO WHSE #1021,-84.32,ACH_DEBIT,1200.00",
      "CREDIT,01/06/2026,PAYROLL DIRECT DEP,2500.00,ACH_CREDIT,3700.00",
    ].join("\n");
    const file = parseStatementCsv(csv);
    expect(file.headerless).toBe(false);
    expect(file.rows).toHaveLength(2);
    const guess = guessBankCsvMapping(file);
    expect(guess.dateColumn).toBe("Posting Date");
    expect(guess.descriptionColumn).toBe("Description");
    expect(guess.layout).toBe("signed");
    expect(guess.amountColumn).toBe("Amount");
    // Mostly negative amounts => checking-style, do not flip.
    expect(guess.positiveIsOutflow).toBe(false);

    const parsed = parseStatementRows(file, complete(guess), "csv:Chase");
    expect(parsed.transactions).toHaveLength(2);
    expect(parsed.transactions[0]).toMatchObject({
      amount: -84.32,
      postedAt: "2026-01-05T12:00:00.000Z",
      description: "COSTCO WHSE #1021",
      pending: false,
      externalAccountId: "csv:Chase",
    });
    expect(parsed.transactions[1].amount).toBe(2500);
  });

  it("Capital One / bank export: split Debit and Credit columns", () => {
    const csv = [
      "Transaction Date,Posted Date,Description,Debit,Credit",
      "2026-01-05,2026-01-06,WHOLE FOODS,52.10,",
      "2026-01-07,2026-01-08,REFUND STORE,,19.99",
    ].join("\n");
    const file = parseStatementCsv(csv);
    const guess = guessBankCsvMapping(file);
    expect(guess.layout).toBe("split");
    expect(guess.debitColumn).toBe("Debit");
    expect(guess.creditColumn).toBe("Credit");

    const parsed = parseStatementRows(file, complete(guess), "csv:CapOne");
    expect(parsed.transactions[0].amount).toBe(-52.1);
    expect(parsed.transactions[1].amount).toBe(19.99);
  });

  it("Amex: a signed Amount where charges are POSITIVE", () => {
    const csv = [
      "Date,Description,Amount",
      "01/05/2026,UBER TRIP,24.50",
      "01/06/2026,STARBUCKS,6.25",
      "01/07/2026,AMEX PAYMENT RECEIVED,-500.00",
    ].join("\n");
    const file = parseStatementCsv(csv);
    const guess = guessBankCsvMapping(file);
    expect(guess.layout).toBe("signed");
    // Majority positive => card-style, flip so charges become outflows.
    expect(guess.positiveIsOutflow).toBe(true);

    const parsed = parseStatementRows(file, complete(guess), "csv:Amex");
    expect(parsed.transactions[0].amount).toBe(-24.5); // charge -> outflow
    expect(parsed.transactions[2].amount).toBe(500); // payment -> inflow
  });

  it("Bank of America: skips a summary preamble above the header row", () => {
    const csv = [
      "Description,,Summary Amt",
      "Beginning balance as of 01/01/2026,,1000.00",
      "Total credits,,2500.00",
      "",
      "Date,Description,Amount,Running Bal.",
      "01/05/2026,SETTLED PURCHASE,-30.00,970.00",
      "01/06/2026,SETTLED PURCHASE,-12.00,958.00",
    ].join("\n");
    const file = parseStatementCsv(csv);
    expect(file.headerless).toBe(false);
    expect(file.headers).toContain("Running Bal.");
    expect(file.rows).toHaveLength(2);
    const guess = guessBankCsvMapping(file);
    expect(guess.dateColumn).toBe("Date");
    // "amount" beats "Running Bal." because balance is excluded.
    expect(guess.amountColumn).toBe("Amount");
    const parsed = parseStatementRows(file, complete(guess), "csv:BofA");
    expect(parsed.transactions).toHaveLength(2);
  });

  it("Wells Fargo: a headerless file gets generated columns and typed guesses", () => {
    const csv = [
      '"01/05/2026","-45.00","*","","COSTCO GAS"',
      '"01/06/2026","-12.99","*","","NETFLIX.COM"',
      '"01/07/2026","1500.00","*","","DIRECT DEPOSIT"',
    ].join("\n");
    const file = parseStatementCsv(csv);
    expect(file.headerless).toBe(true);
    expect(file.headers[0]).toBe("Column 1");
    const guess = guessBankCsvMapping(file);
    expect(guess.dateColumn).toBe("Column 1");
    expect(guess.amountColumn).toBe("Column 2");
    expect(guess.descriptionColumn).toBe("Column 5");
    const parsed = parseStatementRows(file, complete(guess), "csv:Wells");
    expect(parsed.transactions).toHaveLength(3);
    expect(parsed.transactions[0].description).toBe("COSTCO GAS");
  });

  it("de-duplicates repeated header names", () => {
    const csv = [
      "Date,Amount,Amount,Note",
      "01/05/2026,-1.00,-1.00,x",
    ].join("\n");
    const file = parseStatementCsv(csv);
    expect(file.headers).toEqual(["Date", "Amount", "Amount (2)", "Note"]);
  });

  it("throws on an empty file and on a file with no dates", () => {
    expect(() => parseStatementCsv("")).toThrow();
    expect(() => parseStatementCsv("a,b,c\nfoo,bar,baz")).toThrow(/no column with dates/);
  });
});

describe("guessPositiveIsOutflow", () => {
  it("returns false when spending is negative (checking export)", () => {
    const rows = [
      { amt: "-10" },
      { amt: "-20" },
      { amt: "500" },
    ];
    expect(guessPositiveIsOutflow(rows, "amt")).toBe(false);
  });
  it("returns true when charges are positive (card export)", () => {
    const rows = [
      { amt: "10" },
      { amt: "20" },
      { amt: "-500" },
    ];
    expect(guessPositiveIsOutflow(rows, "amt")).toBe(true);
  });
});

describe("isMappingComplete", () => {
  it("requires date + description + a usable amount config", () => {
    expect(isMappingComplete({ dateColumn: "d", descriptionColumn: "x", layout: "signed", positiveIsOutflow: false })).toBe(false);
    expect(isMappingComplete({ dateColumn: "d", descriptionColumn: "x", layout: "signed", amountColumn: "a", positiveIsOutflow: false })).toBe(true);
    expect(isMappingComplete({ dateColumn: "d", descriptionColumn: "x", layout: "split", debitColumn: "a", creditColumn: "a", positiveIsOutflow: false })).toBe(false);
    expect(isMappingComplete({ dateColumn: "d", descriptionColumn: "x", layout: "split", debitColumn: "a", creditColumn: "b", positiveIsOutflow: false })).toBe(true);
  });
});

describe("parseStatementRows - fail closed and dedupe", () => {
  const map: BankCsvMapping = {
    dateColumn: "Date",
    descriptionColumn: "Description",
    layout: "signed",
    amountColumn: "Amount",
    positiveIsOutflow: false,
  };
  const fileOf = (rows: Record<string, string>[]) => ({
    headers: ["Date", "Description", "Amount"],
    rows,
    headerless: false,
    preambleRows: 0,
  });

  it("skips unreadable dates and amounts with a reason, and counts zeros", () => {
    const parsed = parseStatementRows(
      fileOf([
        { Date: "01/05/2026", Description: "OK", Amount: "-5.00" },
        { Date: "nope", Description: "BAD DATE", Amount: "-5.00" },
        { Date: "01/06/2026", Description: "BAD AMT", Amount: "abc" },
        { Date: "01/07/2026", Description: "ZERO", Amount: "0.00" },
      ]),
      map,
      "csv:x",
    );
    expect(parsed.transactions).toHaveLength(1);
    expect(parsed.skipped).toHaveLength(2);
    expect(parsed.skipped[0].reason).toMatch(/date/i);
    expect(parsed.skipped[1].reason).toMatch(/amount/i);
    expect(parsed.zeroRows).toBe(1);
  });

  it("gives identical rows distinct ids by ordinal, but the same file the same ids twice", () => {
    const rows = [
      { Date: "01/05/2026", Description: "COFFEE", Amount: "-4.00" },
      { Date: "01/05/2026", Description: "COFFEE", Amount: "-4.00" },
    ];
    const a = parseStatementRows(fileOf(rows), map, "csv:x").transactions;
    const b = parseStatementRows(fileOf(rows), map, "csv:x").transactions;
    expect(a[0].providerTxId).not.toBe(a[1].providerTxId);
    expect(a.map((t) => t.providerTxId)).toEqual(b.map((t) => t.providerTxId));
  });

  it("statementTransactionId is stable and ordinal-sensitive", () => {
    expect(statementTransactionId("2026-01-05", -4, "COFFEE", 0)).toBe(
      statementTransactionId("2026-01-05", -4, "coffee", 0),
    );
    expect(statementTransactionId("2026-01-05", -4, "COFFEE", 0)).not.toBe(
      statementTransactionId("2026-01-05", -4, "COFFEE", 1),
    );
  });

  it("reads a trailing-minus amount as an outflow (some bank exports)", () => {
    const parsed = parseStatementRows(
      fileOf([{ Date: "01/05/2026", Description: "TRAILING MINUS", Amount: "84.32-" }]),
      map,
      "csv:x",
    );
    expect(parsed.transactions).toHaveLength(1);
    expect(parsed.transactions[0].amount).toBe(-84.32);
  });

    it("split layout uses column magnitudes even if the debit is already negative", () => {
    const parsed = parseStatementRows(
      {
        headers: ["Date", "Description", "Debit", "Credit"],
        rows: [{ Date: "01/05/2026", Description: "X", Debit: "-10.00", Credit: "" }],
        headerless: false,
        preambleRows: 0,
      },
      { dateColumn: "Date", descriptionColumn: "Description", layout: "split", debitColumn: "Debit", creditColumn: "Credit", positiveIsOutflow: false },
      "csv:x",
    );
    expect(parsed.transactions[0].amount).toBe(-10);
  });
});

describe("statementHeaderSignature", () => {
  it("is stable across case and whitespace and distinguishes layouts", () => {
    const a = statementHeaderSignature({ headers: ["Date", "Amount"], headerless: false });
    const b = statementHeaderSignature({ headers: [" date ", "AMOUNT"], headerless: false });
    expect(a).toBe(b);
    const headerless = statementHeaderSignature({ headers: ["Column 1", "Column 2"], headerless: true });
    expect(headerless).toBe("headerless:2");
    expect(headerless).not.toBe(a);
  });
});

describe("selectWithinInboxCapacity", () => {
  it("keeps the newest that fit and defers the rest", () => {
    const items = [
      { postedAt: "2026-01-01T12:00:00.000Z", id: "a" },
      { postedAt: "2026-03-01T12:00:00.000Z", id: "b" },
      { postedAt: "2026-02-01T12:00:00.000Z", id: "c" },
    ];
    const { kept, deferred } = selectWithinInboxCapacity(items, 2);
    expect(kept.map((i) => i.id)).toEqual(["b", "c"]);
    expect(deferred.map((i) => i.id)).toEqual(["a"]);
  });
  it("defers everything when there is no room", () => {
    const items = [{ postedAt: "2026-01-01T12:00:00.000Z" }];
    expect(selectWithinInboxCapacity(items, 0).kept).toHaveLength(0);
    expect(selectWithinInboxCapacity(items, 0).deferred).toHaveLength(1);
  });
});

/**
 * Spreadsheet import tests (importSpreadsheet) for .xlsx and .csv.
 *
 * The real SheetJS parsing and all row mappers (parseAmount, parseDate,
 * rowTo*) run for real. Mocked edges:
 *   - ./importData       -> capture the normalized payload handed downstream
 *   - ./spreadsheetExport -> just the two sentinel-id constants
 *   - expo-file-system   -> File returns test-controlled content
 *   - ./uuid             -> deterministic ids
 */

import * as XLSX from "xlsx";

const DERIVED_RECURRING_PREFIX = "__projected_recurring__:";

// Test-controlled file + picker state (mock-prefixed so jest.mock factories
// may close over them).
const mockFileContent = { text: "", base64: "" };
let mockPicked: any = { canceled: true };

const mockImportFromString = jest.fn(async (_json: string, _mode?: string) => ({
  debts: 0,
  payments: 0,
  budgetEntries: 0,
  budgetLimits: 0,
  savingsGoals: 0,
  assetAccounts: 0,
  debtMilestones: false,
  payoffStrategy: false,
  netWorthSnapshots: 0,
  customCategories: 0,
}));
const mockOpenDocumentPicker = jest.fn(async () => mockPicked);

jest.mock("../importData", () => ({
  importFromString: mockImportFromString,
  openDocumentPicker: mockOpenDocumentPicker,
}));
jest.mock("../spreadsheetExport", () => ({
  DERIVED_RECURRING_PREFIX: "__projected_recurring__:",
  DERIVED_EMERGENCY_FUND_ID: "__derived_emergency_fund__",
}));
jest.mock("expo-file-system", () => ({
  File: class {
    async text() {
      return mockFileContent.text;
    }
    async base64() {
      return mockFileContent.base64;
    }
  },
}));
jest.mock("../uuid", () => ({ generateUUID: () => "gen-uuid" }));

// eslint-disable-next-line import/first -- must require after the jest.mock factories' captured consts initialize (ts-jest emits CJS, so import position is require order)
import { importSpreadsheet } from "../spreadsheetImport";

/** Build an xlsx workbook (base64) from a map of sheetName -> row objects. */
const buildXlsxBase64 = (sheets: Record<string, Record<string, unknown>[]>): string => {
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  return XLSX.write(wb, { type: "base64", bookType: "xlsx" }) as string;
};

const buildCsv = (rows: Record<string, unknown>[]): string => {
  const ws = XLSX.utils.json_to_sheet(rows);
  return XLSX.utils.sheet_to_csv(ws);
};

/** Point the mocked picker + file at an xlsx payload. */
const useXlsx = (sheets: Record<string, Record<string, unknown>[]>) => {
  mockFileContent.base64 = buildXlsxBase64(sheets);
  mockFileContent.text = "";
  mockPicked = {
    canceled: false,
    assets: [
      { uri: "file:///x.xlsx", name: "x.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", size: 1000 },
    ],
  };
};

const useCsv = (rows: Record<string, unknown>[]) => {
  mockFileContent.text = buildCsv(rows);
  mockFileContent.base64 = "";
  mockPicked = {
    canceled: false,
    assets: [{ uri: "file:///x.csv", name: "x.csv", mimeType: "text/csv", size: 500 }],
  };
};

/** The payload object handed to importFromString on the last call. */
const lastPayload = (): any =>
  JSON.parse(mockImportFromString.mock.calls[mockImportFromString.mock.calls.length - 1][0]);

const entryRow = (over: Record<string, unknown> = {}) => ({
  ID: "e1",
  Date: "2026-06-01",
  Type: "expense",
  Category: "Food",
  Amount: 30,
  Description: "Lunch",
  Recurring: "no",
  ...over,
});

beforeEach(() => {
  mockImportFromString.mockClear();
  mockOpenDocumentPicker.mockClear();
  mockPicked = { canceled: true };
  mockFileContent.text = "";
  mockFileContent.base64 = "";
});

describe("importSpreadsheet - picker handling", () => {
  it("returns null when the user cancels", async () => {
    mockPicked = { canceled: true };
    expect(await importSpreadsheet()).toBeNull();
    expect(mockImportFromString).not.toHaveBeenCalled();
  });
});

describe("importSpreadsheet - CSV", () => {
  it("parses a budget-entries CSV and pipes it to importFromString", async () => {
    useCsv([entryRow()]);
    const result = await importSpreadsheet("merge");

    expect(mockImportFromString).toHaveBeenCalledTimes(1);
    expect(mockImportFromString.mock.calls[0][1]).toBe("merge");
    const payload = lastPayload();
    expect(payload.budgetEntries).toHaveLength(1);
    expect(payload.budgetEntries[0]).toMatchObject({
      id: "e1",
      type: "expense",
      category: "Food",
      amount: 30,
    });
    expect(result?.skippedRows).toBe(0);
  });

  it("parses currency-formatted and parenthesized amounts", async () => {
    useCsv([
      entryRow({ ID: "e1", Amount: "$1,234.56" }),
      // Parenthesized negative on a reserve category is allowed
      entryRow({ ID: "e2", Category: "Savings", Amount: "(50.00)" }),
    ]);
    await importSpreadsheet();
    const entries = lastPayload().budgetEntries;
    expect(entries.find((e: any) => e.id === "e1").amount).toBeCloseTo(1234.56, 2);
    expect(entries.find((e: any) => e.id === "e2").amount).toBeCloseTo(-50, 2);
  });

  it("anchors date-only cells at noon UTC so the month never shifts", async () => {
    // Regression: date-only strings used to parse at local midnight, so any
    // user east of UTC importing "2026-06-01" got an ISO date on May 31 -
    // month attribution slices YYYY-MM, silently moving the entry (and its
    // budget totals) into the previous month.
    useCsv([
      entryRow({ ID: "e1", Date: "2026-06-01" }),
      entryRow({ ID: "e2", Date: "6/1/2026" }),
    ]);
    await importSpreadsheet();
    const entries = lastPayload().budgetEntries;
    expect(entries.find((e: any) => e.id === "e1").date).toBe(
      "2026-06-01T12:00:00.000Z"
    );
    expect(entries.find((e: any) => e.id === "e2").date).toBe(
      "2026-06-01T12:00:00.000Z"
    );
  });

  it("rejects rollover dates instead of guessing a month", async () => {
    useCsv([entryRow({ ID: "e1" }), entryRow({ ID: "e2", Date: "2/30/2026" })]);
    const result = await importSpreadsheet();
    const entries = lastPayload().budgetEntries;
    expect(entries.map((e: any) => e.id)).toEqual(["e1"]);
    expect(result?.skippedRows).toBe(1);
  });

  it("parses decimal-comma amounts instead of mangling them", async () => {
    // Regression: commas used to be stripped blindly, importing "1.234,56"
    // as 1.23456 and "1,50" as 150 - silently wrong by 100-1000x.
    useCsv([
      entryRow({ ID: "e1", Amount: "1.234,56" }),
      entryRow({ ID: "e2", Amount: "1,50" }),
      entryRow({ ID: "e3", Amount: "1.234.567,89" }),
      entryRow({ ID: "e4", Amount: "€1.234,56" }),
      // US grouping still parses as before
      entryRow({ ID: "e5", Amount: "1,234" }),
    ]);
    await importSpreadsheet();
    const entries = lastPayload().budgetEntries;
    const amountOf = (id: string) => entries.find((e: any) => e.id === id).amount;
    expect(amountOf("e1")).toBeCloseTo(1234.56, 2);
    expect(amountOf("e2")).toBeCloseTo(1.5, 2);
    expect(amountOf("e3")).toBeCloseTo(1234567.89, 2);
    expect(amountOf("e4")).toBeCloseTo(1234.56, 2);
    expect(amountOf("e5")).toBeCloseTo(1234, 2);
  });
});

describe("importSpreadsheet - XLSX multi-sheet", () => {
  it("parses Budget Entries and Debts sheets", async () => {
    useXlsx({
      "Budget Entries": [entryRow()],
      Debts: [
        {
          ID: "d1",
          Name: "Car Loan",
          Balance: 5000,
          OriginalBalance: 10000,
          Rate: 6.5,
          MinPayment: 200,
          Owner: "mine",
          DebtClass: "car",
          CreatedAt: "2026-01-01",
        },
      ],
    });
    const result = await importSpreadsheet("replace");

    expect(mockImportFromString.mock.calls[0][1]).toBe("replace");
    const payload = lastPayload();
    expect(payload.budgetEntries).toHaveLength(1);
    expect(payload.debts).toHaveLength(1);
    expect(payload.debts[0]).toMatchObject({ id: "d1", name: "Car Loan", balance: 5000 });
    expect(result?.skippedRows).toBe(0);
  });

  it("parses a Holdings sheet, normalizing the ticker and skipping bad rows", async () => {
    useXlsx({
      "Budget Entries": [entryRow()],
      Holdings: [
        { ID: "h1", Symbol: "aapl", Shares: 10, CostBasis: 1500, CreatedAt: "2026-05-01" },
        { ID: "h2", Symbol: "VTI", Shares: 0.25 },
        // Invalid ticker -> skipped with a reason, not fatal.
        { ID: "h3", Symbol: "not a ticker", Shares: 1 },
      ],
    });
    const result = await importSpreadsheet("merge");

    const payload = lastPayload();
    expect(payload.holdings).toHaveLength(2);
    // Ticker uppercased on the way in.
    expect(payload.holdings[0]).toMatchObject({ id: "h1", symbol: "AAPL", shares: 10, costBasis: 1500 });
    expect(payload.holdings[1].symbol).toBe("VTI");
    expect(payload.holdings[1].costBasis).toBeUndefined();
    expect(result?.skippedRows).toBe(1);
    expect(result?.skippedRowDetails[0]).toMatchObject({ sheet: "Holdings" });
  });
});

describe("importSpreadsheet - holding shapes", () => {
  it("imports proxy-tracked and manual-value funds, and skips an unpriced proxy", async () => {
    useXlsx({
      "Budget Entries": [entryRow()],
      Holdings: [
        { ID: "h1", Symbol: "voo", Name: "Spartan 500", AnchorValue: 12000, AnchorPrice: 480.5, AccountId: "a3" },
        { ID: "h2", Name: "Stable Value", ManualValue: 5000, AccountId: "a3" },
        // Proxy without an anchor price can't satisfy the validator - skipped
        // with a reason, not silently turned into another kind.
        { ID: "h3", Symbol: "VTI", Name: "Unpriced", AnchorValue: 100 },
        // Manual fund needs a name.
        { ID: "h4", ManualValue: 10 },
      ],
    });
    const result = await importSpreadsheet("merge");
    const payload = lastPayload();
    expect(payload.holdings.map((h: any) => h.id)).toEqual(["h1", "h2"]);
    expect(payload.holdings[0]).toMatchObject({
      symbol: "VOO", name: "Spartan 500", anchorValue: 12000, anchorPrice: 480.5, accountId: "a3", shares: 0,
    });
    expect(payload.holdings[1]).toMatchObject({
      symbol: "", name: "Stable Value", manualValue: 5000, accountId: "a3",
    });
    expect(result?.skippedRows).toBe(2);
    expect(result?.skippedRowDetails.map((d) => d.reason)).toEqual([
      expect.stringContaining("AnchorPrice"),
      expect.stringContaining("Name"),
    ]);
  });
});

describe("importSpreadsheet - debt keep-alive and payment applied amount", () => {
  it("round-trips keep-alive fields and drops out-of-range values without skipping the debt", async () => {
    useXlsx({
      "Budget Entries": [entryRow()],
      Debts: [
        { ID: "d1", Name: "Visa", Balance: 100, OriginalBalance: 500, Rate: 19.9, MinPayment: 25, KeepAlive: "yes", KeepAliveWindowMonths: 6, KeepAliveLeadDays: 30, KeepAliveLastUsedAt: "2026-05-20" },
        { ID: "d2", Name: "Amex", Balance: 100, OriginalBalance: 500, Rate: 19.9, MinPayment: 25, KeepAlive: "no", KeepAliveWindowMonths: 999, KeepAliveLeadDays: 0 },
        { ID: "d3", Name: "Old export", Balance: 100, OriginalBalance: 500, Rate: 19.9, MinPayment: 25 },
      ],
    });
    const result = await importSpreadsheet("merge");
    const [d1, d2, d3] = lastPayload().debts;
    expect(d1).toMatchObject({ keepAliveEnabled: true, keepAliveWindowMonths: 6, keepAliveLeadDays: 30 });
    expect(d1.keepAliveLastUsedAt).toMatch(/^2026-05-20/);
    // Explicit "no" survives; the two out-of-range numbers are dropped, not fatal.
    expect(d2.keepAliveEnabled).toBe(false);
    expect(d2.keepAliveWindowMonths).toBeUndefined();
    expect(d2.keepAliveLeadDays).toBeUndefined();
    // A workbook from before the columns existed leaves the watch unset.
    expect(d3.keepAliveEnabled).toBeUndefined();
    expect(result?.skippedRows).toBe(0);
  });

  it("keeps AppliedAmount when it is within [0, Amount] and drops it otherwise", async () => {
    useXlsx({
      "Budget Entries": [entryRow()],
      Payments: [
        { ID: "p1", DebtID: "d1", Amount: 300, AppliedAmount: 250, Date: "2026-06-10" },
        { ID: "p2", DebtID: "d1", Amount: 300, AppliedAmount: 999, Date: "2026-06-11" },
        { ID: "p3", DebtID: "d1", Amount: 300, Date: "2026-06-12" },
      ],
    });
    await importSpreadsheet("merge");
    const [p1, p2, p3] = lastPayload().payments;
    expect(p1.appliedAmount).toBe(250);
    expect(p2.appliedAmount).toBeUndefined();
    expect(p3.appliedAmount).toBeUndefined();
  });
});

describe("importSpreadsheet - row filtering", () => {
  it("skips invalid rows and reports a reason", async () => {
    useCsv([entryRow({ ID: "good" }), entryRow({ ID: "bad", Type: "transfer" })]);
    const result = await importSpreadsheet();

    expect(lastPayload().budgetEntries).toHaveLength(1);
    expect(result?.skippedRows).toBe(1);
    expect(result?.skippedRowDetails[0]).toMatchObject({ sheet: "Budget Entries" });
    expect(result?.skippedRowDetails[0].reason).toMatch(/income.*expense/i);
  });

  it("silently drops the exporter's Total row (not counted as skipped)", async () => {
    useCsv([entryRow({ ID: "good" }), entryRow({ ID: "Total", Type: "", Category: "", Amount: 0 })]);
    const result = await importSpreadsheet();
    expect(lastPayload().budgetEntries).toHaveLength(1);
    expect(result?.skippedRows).toBe(0);
  });

  it("silently drops projected recurring artifact rows", async () => {
    useCsv([
      entryRow({ ID: "real" }),
      entryRow({ ID: `${DERIVED_RECURRING_PREFIX}real:2026-07` }),
    ]);
    const result = await importSpreadsheet();
    expect(lastPayload().budgetEntries).toHaveLength(1);
    expect(result?.skippedRows).toBe(0);
  });
});

describe("importSpreadsheet - error cases", () => {
  it("throws when no recognized sheet is present", async () => {
    useXlsx({ "Random Sheet": [{ foo: "bar" }] });
    await expect(importSpreadsheet()).rejects.toThrow(/no recognized sheets/i);
  });

  it("throws when every row is invalid", async () => {
    useCsv([entryRow({ Type: "nonsense" })]);
    await expect(importSpreadsheet()).rejects.toThrow(/no valid rows/i);
  });
});

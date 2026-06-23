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
const DERIVED_EMERGENCY_FUND_ID = "__derived_emergency_fund__";

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
    constructor(_uri: string) {}
    async text() {
      return mockFileContent.text;
    }
    async base64() {
      return mockFileContent.base64;
    }
  },
}));
jest.mock("../uuid", () => ({ generateUUID: () => "gen-uuid" }));

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

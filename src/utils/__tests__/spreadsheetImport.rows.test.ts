/**
 * Row-mapper tests for spreadsheetImport.ts, split out of
 * spreadsheetImport.test.ts so that file's fixture migration doesn't
 * collide with this work.
 *
 * rowToBudgetLimit / rowToPayment / rowToSavingsGoal aren't exported, so
 * (like the sibling test file) they're driven through the real SheetJS
 * parse via the public importSpreadsheet() entry point - a valid row lands
 * in the captured payload, an invalid one is dropped and reported in
 * skippedRowDetails with a reason. Also covers:
 *   - parseDate's Excel-serial-number branch (SheetJS delivers a raw
 *     number, not a Date, for numeric cells with no date format - which is
 *     exactly what json_to_sheet produces from a plain JS number).
 *   - the 5 MB file-size cap (checked against the picker asset's reported
 *     `size`, before any content is read).
 *   - the 5000-row-per-sheet cap (checked in sheetToRows, before mapping).
 *
 * Mocked edges (mirrors spreadsheetImport.test.ts):
 *   - ./importData       -> capture the normalized payload handed downstream
 *   - ./spreadsheetExport -> just the two sentinel-id constants
 *   - expo-file-system   -> File returns test-controlled content
 *   - ./uuid             -> deterministic ids
 * The real SheetJS parsing and all row mappers run for real.
 */

import * as XLSX from "xlsx";

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

/** Point the mocked picker + file at an xlsx payload; `size` defaults under the 5 MB cap. */
const useXlsx = (
  sheets: Record<string, Record<string, unknown>[]>,
  size = 1000
) => {
  mockFileContent.base64 = buildXlsxBase64(sheets);
  mockFileContent.text = "";
  mockPicked = {
    canceled: false,
    assets: [
      {
        uri: "file:///x.xlsx",
        name: "x.xlsx",
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        size,
      },
    ],
  };
};

/** The payload object handed to importFromString on the last call. */
const lastPayload = (): any =>
  JSON.parse(
    mockImportFromString.mock.calls[mockImportFromString.mock.calls.length - 1][0]
  );

const lastResult = async (mode?: "merge" | "replace") => importSpreadsheet(mode);

beforeEach(() => {
  mockImportFromString.mockClear();
  mockOpenDocumentPicker.mockClear();
  mockPicked = { canceled: true };
  mockFileContent.text = "";
  mockFileContent.base64 = "";
});

describe("importSpreadsheet - Budget Limits rows", () => {
  it("imports a valid row, and stamps no updatedAt when the column is blank", async () => {
    useXlsx({ "Budget Limits": [{ Category: "Food", MonthlyLimit: 200 }] });
    const result = await lastResult();
    expect(result?.skippedRows).toBe(0);
    const limits = lastPayload().budgetLimits;
    expect(limits).toHaveLength(1);
    expect(limits[0]).toEqual({ category: "Food", monthlyLimit: 200 });
  });

  it("preserves an explicit UpdatedAt so a later sync doesn't clobber a partner's edit", async () => {
    useXlsx({
      "Budget Limits": [
        { Category: "Rent", MonthlyLimit: 1000, UpdatedAt: "2026-06-01" },
      ],
    });
    await lastResult();
    const limits = lastPayload().budgetLimits;
    expect(limits[0].updatedAt).toBe("2026-06-01T12:00:00.000Z");
  });

  it("skips a row with a missing category", async () => {
    useXlsx({
      "Budget Limits": [
        { Category: "Food", MonthlyLimit: 200 },
        { Category: "", MonthlyLimit: 100 },
      ],
    });
    const result = await lastResult();
    expect(lastPayload().budgetLimits).toHaveLength(1);
    expect(result?.skippedRows).toBe(1);
    expect(result?.skippedRowDetails[0]).toMatchObject({ sheet: "Budget Limits" });
    expect(result?.skippedRowDetails[0].reason).toMatch(/category is missing/i);
  });

  it("skips a row whose category is longer than the custom-name limit (24 chars)", async () => {
    useXlsx({
      "Budget Limits": [
        { Category: "Food", MonthlyLimit: 200 },
        { Category: "This Category Name Is Way Too Long", MonthlyLimit: 100 },
      ],
    });
    const result = await lastResult();
    expect(lastPayload().budgetLimits).toEqual([{ category: "Food", monthlyLimit: 200 }]);
    expect(result?.skippedRowDetails[0].reason).toMatch(/not a recognized category/i);
  });

  it("skips a non-numeric monthly limit", async () => {
    useXlsx({
      "Budget Limits": [
        { Category: "Food", MonthlyLimit: 200 },
        { Category: "Rent", MonthlyLimit: "oops" },
      ],
    });
    const result = await lastResult();
    expect(result?.skippedRowDetails[0].reason).toMatch(/positive number/i);
  });

  it("skips a monthly limit below the 0.01 minimum", async () => {
    useXlsx({
      "Budget Limits": [
        { Category: "Food", MonthlyLimit: 200 },
        { Category: "Rent", MonthlyLimit: 0 },
      ],
    });
    const result = await lastResult();
    expect(result?.skippedRowDetails[0].reason).toMatch(/positive number/i);
  });
});

describe("importSpreadsheet - Payments rows", () => {
  it("imports a valid row, including AppliedAmount", async () => {
    useXlsx({
      Payments: [
        { ID: "p1", DebtID: "d1", Amount: 300, AppliedAmount: 250, Date: "2026-06-10" },
      ],
    });
    const result = await lastResult();
    expect(result?.skippedRows).toBe(0);
    const payments = lastPayload().payments;
    expect(payments[0]).toMatchObject({
      id: "p1",
      debtId: "d1",
      amount: 300,
      appliedAmount: 250,
      date: "2026-06-10T12:00:00.000Z",
    });
  });

  it("skips a row missing DebtID", async () => {
    useXlsx({
      Payments: [
        { ID: "p0", DebtID: "d1", Amount: 50, Date: "2026-06-10" },
        { ID: "p1", Amount: 50, Date: "2026-06-10" },
      ],
    });
    const result = await lastResult();
    expect(result?.skippedRowDetails[0].reason).toMatch(/debt id is missing/i);
  });

  it("skips a parenthesized (negative) amount instead of importing it as negative", async () => {
    useXlsx({
      Payments: [
        { ID: "p0", DebtID: "d1", Amount: 50, Date: "2026-06-10" },
        { ID: "p1", DebtID: "d1", Amount: "(50.00)", Date: "2026-06-10" },
      ],
    });
    const result = await lastResult();
    expect(result?.skippedRowDetails[0].reason).toMatch(/positive number/i);
  });

  it("skips a row with a missing or unparseable date", async () => {
    useXlsx({
      Payments: [
        { ID: "p0", DebtID: "d1", Amount: 50, Date: "2026-06-10" },
        { ID: "p1", DebtID: "d1", Amount: 50, Date: "" },
      ],
    });
    const result = await lastResult();
    expect(result?.skippedRowDetails[0].reason).toMatch(/date is missing/i);
  });
});

describe("importSpreadsheet - Savings Goals rows", () => {
  it("imports a valid row", async () => {
    useXlsx({
      "Savings Goals": [
        { ID: "g1", Name: "Vacation", Category: "travel", TargetAmount: 2000, CurrentAmount: 500 },
      ],
    });
    const result = await lastResult();
    expect(result?.skippedRows).toBe(0);
    const goals = lastPayload().savingsGoals;
    expect(goals[0]).toMatchObject({
      id: "g1",
      name: "Vacation",
      category: "travel",
      targetAmount: 2000,
      currentAmount: 500,
    });
  });

  it("skips a row missing a name", async () => {
    useXlsx({
      "Savings Goals": [
        { Name: "Vacation", Category: "travel", TargetAmount: 2000, CurrentAmount: 500 },
        { Category: "travel", TargetAmount: 2000, CurrentAmount: 500 },
      ],
    });
    const result = await lastResult();
    expect(result?.skippedRowDetails[0].reason).toMatch(/name is missing/i);
  });

  it("skips a row with an unrecognized category", async () => {
    useXlsx({
      "Savings Goals": [
        { Name: "Vacation", Category: "travel", TargetAmount: 2000, CurrentAmount: 500 },
        { Name: "Boat", Category: "not-a-real-category", TargetAmount: 2000, CurrentAmount: 500 },
      ],
    });
    const result = await lastResult();
    expect(result?.skippedRowDetails[0].reason).toMatch(/category must be one of/i);
  });

  it("skips a target amount below the 0.01 minimum", async () => {
    useXlsx({
      "Savings Goals": [
        { Name: "Vacation", Category: "travel", TargetAmount: 2000, CurrentAmount: 500 },
        { Name: "Boat", Category: "travel", TargetAmount: 0, CurrentAmount: 0 },
      ],
    });
    const result = await lastResult();
    expect(result?.skippedRowDetails[0].reason).toMatch(/target amount/i);
  });

  it("skips a negative current amount", async () => {
    useXlsx({
      "Savings Goals": [
        { Name: "Vacation", Category: "travel", TargetAmount: 2000, CurrentAmount: 500 },
        { Name: "Boat", Category: "travel", TargetAmount: 2000, CurrentAmount: -5 },
      ],
    });
    const result = await lastResult();
    expect(result?.skippedRowDetails[0].reason).toMatch(/current amount/i);
  });

  it("carries the purchase-planner Priority rank (number or text), rounding fractions", async () => {
    useXlsx({
      "Savings Goals": [
        { Name: "Vacation", Category: "travel", TargetAmount: 2000, CurrentAmount: 500, Priority: 0 },
        { Name: "Boat", Category: "travel", TargetAmount: 2000, CurrentAmount: 0, Priority: "2" },
        { Name: "Bike", Category: "other", TargetAmount: 600, CurrentAmount: 0, Priority: 1.4 },
      ],
    });
    const result = await lastResult();
    expect(result?.skippedRows).toBe(0);
    expect(lastPayload().savingsGoals.map((g: { priority?: number }) => g.priority)).toEqual([0, 2, 1]);
  });

  it("drops a blank or junk Priority instead of skipping the row", async () => {
    useXlsx({
      "Savings Goals": [
        { Name: "Vacation", Category: "travel", TargetAmount: 2000, CurrentAmount: 500, Priority: "" },
        { Name: "Boat", Category: "travel", TargetAmount: 2000, CurrentAmount: 0, Priority: "first" },
        { Name: "Bike", Category: "other", TargetAmount: 600, CurrentAmount: 0, Priority: -3 },
        { Name: "Car", Category: "car", TargetAmount: 9000, CurrentAmount: 0 },
      ],
    });
    const result = await lastResult();
    expect(result?.skippedRows).toBe(0);
    for (const goal of lastPayload().savingsGoals) {
      expect(goal).not.toHaveProperty("priority");
    }
  });
});

describe("importSpreadsheet - parseDate Excel serial numbers", () => {
  it("converts the Excel epoch anchor (serial 25569 = 1970-01-01) to noon UTC", async () => {
    // 25569 is the well-documented "days since 1899-12-30" offset for the
    // Unix epoch - independent of the module's own conversion formula.
    useXlsx({
      Payments: [{ ID: "p1", DebtID: "d1", Amount: 50, Date: 25569 }],
    });
    await lastResult();
    expect(lastPayload().payments[0].date).toBe("1970-01-01T12:00:00.000Z");
  });

  it("converts an arbitrary serial number to the matching calendar day at noon UTC", async () => {
    // Independently derive the serial for 2026-06-01 from the same
    // documented epoch offset, rather than reusing parseDate's formula.
    const serialFor2026_06_01 = 25569 + Date.UTC(2026, 5, 1) / 86_400_000;
    useXlsx({
      Payments: [{ ID: "p1", DebtID: "d1", Amount: 50, Date: serialFor2026_06_01 }],
    });
    await lastResult();
    expect(lastPayload().payments[0].date).toBe("2026-06-01T12:00:00.000Z");
  });
});

describe("importSpreadsheet - file size cap", () => {
  it("rejects a file over 5 MB before reading its content", async () => {
    useXlsx({ Payments: [{ ID: "p1", DebtID: "d1", Amount: 50, Date: "2026-06-10" }] }, 6 * 1024 * 1024);
    await expect(importSpreadsheet()).rejects.toThrow(/too large/i);
    expect(mockImportFromString).not.toHaveBeenCalled();
  });

  it("accepts a file at exactly the 5 MB boundary", async () => {
    useXlsx(
      { Payments: [{ ID: "p1", DebtID: "d1", Amount: 50, Date: "2026-06-10" }] },
      5 * 1024 * 1024
    );
    await expect(importSpreadsheet()).resolves.not.toBeNull();
  });
});

describe("importSpreadsheet - per-sheet row cap", () => {
  it("rejects a sheet with more than 5000 rows before mapping any of them", async () => {
    const rows = Array.from({ length: 5001 }, (_, i) => ({
      Category: "Food",
      MonthlyLimit: 10 + (i % 5),
    }));
    useXlsx({ "Budget Limits": rows });
    await expect(importSpreadsheet()).rejects.toThrow(/too many rows/i);
    expect(mockImportFromString).not.toHaveBeenCalled();
  });

  it("accepts a sheet at exactly the 5000-row cap", async () => {
    const rows = Array.from({ length: 5000 }, () => ({
      Category: "Food",
      MonthlyLimit: 10,
    }));
    useXlsx({ "Budget Limits": rows });
    const result = await importSpreadsheet();
    expect(result?.skippedRows).toBe(0);
    expect(lastPayload().budgetLimits).toHaveLength(5000);
  }, 20000);
});

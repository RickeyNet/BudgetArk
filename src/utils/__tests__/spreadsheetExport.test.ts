/**
 * Spreadsheet export tests (exportSpreadsheet) for .xlsx and .csv.
 *
 * The real SheetJS workbook build runs; we capture the bytes the exporter
 * would have written to disk and parse them back to assert structure. Mocked
 * edges: expo-file-system (capture writes), react-native Platform, the native
 * share call, the storage getters, and the backup-reminder stamp.
 */

import * as XLSX from "xlsx";

const mockWritten = { content: "", encoding: "", created: false };

jest.mock("expo-file-system", () => ({
  Paths: { document: "doc", cache: "cache" },
  File: class {
    uri: string;
    constructor(dir: string, name: string) {
      this.uri = `${dir}/${name}`;
    }
    create() {
      mockWritten.created = true;
    }
    write(content: string, opts: { encoding: string }) {
      mockWritten.content = content;
      mockWritten.encoding = opts?.encoding;
    }
  },
}));
jest.mock("react-native", () => ({ Platform: { OS: "android" } }));

const mockShareLocalFile = jest.fn(async () => {});
jest.mock("../iosNativeShare", () => ({
  shareLocalFile: mockShareLocalFile,
  waitForIosModalTeardown: jest.fn(async () => {}),
}));

const debtFixture = {
  id: "d1",
  name: "Car Loan",
  balance: 5000,
  originalBalance: 10000,
  rate: 6.5,
  minPayment: 200,
  owner: "mine",
  debtClass: "car",
  debtClassSource: "manual",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};
const entryFixtures = [
  {
    id: "e1",
    type: "income",
    category: "Salary",
    amount: 4000,
    date: "2026-06-01",
    createdAt: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "e2",
    type: "expense",
    category: "Food",
    amount: 30,
    date: "2026-06-02",
    createdAt: "2026-06-02T00:00:00.000Z",
  },
];

const mockGetDebts = jest.fn(async () => [debtFixture]);
jest.mock("../../storage/debtStorage", () => ({
  getDebts: mockGetDebts,
  getPayments: jest.fn(async () => []),
}));
jest.mock("../../storage/budgetStorage", () => ({
  getBudgetEntries: jest.fn(async () => entryFixturesRef),
  getCategoryBudgetLimits: jest.fn(async () => []),
}));
jest.mock("../../storage/savingsGoalStorage", () => ({
  getSavingsGoals: jest.fn(async () => []),
}));
jest.mock("../../storage/assetAccountStorage", () => ({
  getAssetAccounts: jest.fn(async () => []),
}));
jest.mock("../../storage/holdingsStorage", () => ({
  getHoldings: jest.fn(async () => []),
}));
jest.mock("../../storage/debtMilestoneStorage", () => ({
  getDebtMilestonePlan: jest.fn(async () => null),
}));
jest.mock("../../storage/businessStorage", () => ({
  getBusinesses: jest.fn(async () => []),
}));
const mockRecordBackup = jest.fn(async () => {});
jest.mock("../../storage/backupReminderStorage", () => ({
  recordBackup: mockRecordBackup,
}));

const entryFixturesRef = entryFixtures;

// eslint-disable-next-line import/first -- must require after the jest.mock factories' captured consts initialize (ts-jest emits CJS, so import position is require order)
import { exportSpreadsheet } from "../spreadsheetExport";

// The exporter logs progress via console.info; keep test output clean.
jest.spyOn(console, "info").mockImplementation(() => {});

beforeEach(() => {
  mockWritten.content = "";
  mockWritten.encoding = "";
  mockWritten.created = false;
  mockShareLocalFile.mockClear();
  mockRecordBackup.mockClear();
  mockGetDebts.mockClear();
  mockGetDebts.mockImplementation(async () => [debtFixture]);
});

describe("exportSpreadsheet - CSV", () => {
  it("writes a budget-entries CSV and shares it", async () => {
    const result = await exportSpreadsheet("csv");

    expect(result).toMatchObject({ format: "csv", entryCount: 2, partial: false });
    expect(result.missingSections).toEqual([]);
    expect(mockWritten.encoding).toBe("utf8");
    expect(mockShareLocalFile).toHaveBeenCalledTimes(1);

    const csv = mockWritten.content;
    expect(csv).toContain("Date,Type,Category,Amount,Description");
    expect(csv).toContain("Salary");
    expect(csv).toContain("Food");
    // Grand-total block rows are present
    expect(csv).toMatch(/Income Total/);
  });

  it("does not stamp a backup for CSV (entries-only)", async () => {
    await exportSpreadsheet("csv");
    expect(mockRecordBackup).not.toHaveBeenCalled();
  });
});

describe("exportSpreadsheet - XLSX", () => {
  const parseWorkbook = () => XLSX.read(mockWritten.content, { type: "base64" });

  it("writes a multi-sheet workbook with the documented sheets", async () => {
    const result = await exportSpreadsheet("xlsx");

    expect(result.format).toBe("xlsx");
    expect(mockWritten.encoding).toBe("base64");
    const wb = parseWorkbook();
    expect(wb.SheetNames).toEqual(
      expect.arrayContaining([
        "Budget Entries",
        "Budget Limits",
        "Debts",
        "Payments",
        "Savings Goals",
        "Asset Accounts",
      ])
    );
  });

  it("includes debt data and a Total row in the Debts sheet", async () => {
    await exportSpreadsheet("xlsx");
    const wb = parseWorkbook();
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets["Debts"]);
    expect(rows.find((r) => r.ID === "d1")).toMatchObject({
      Name: "Car Loan",
      Balance: 5000,
    });
    expect(rows.some((r) => r.ID === "Total")).toBe(true);
  });

  it("stamps a backup for XLSX", async () => {
    await exportSpreadsheet("xlsx");
    expect(mockRecordBackup).toHaveBeenCalledTimes(1);
  });

  it("marks the export partial when a section fails to load", async () => {
    mockGetDebts.mockRejectedValueOnce(new Error("storage boom"));
    const result = await exportSpreadsheet("xlsx");
    expect(result.partial).toBe(true);
    expect(result.missingSections).toContain("Debts");
  });
});

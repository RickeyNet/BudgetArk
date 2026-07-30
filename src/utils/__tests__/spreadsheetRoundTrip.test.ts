/**
 * Spreadsheet round-trip test: export -> re-import.
 *
 * This is the schema-alignment guard. spreadsheetExport and spreadsheetImport
 * share column headers by convention (see SPREADSHEET_SCHEMA.md). The two
 * per-module suites each test against that schema independently, so a column
 * renamed on one side but not the other would leave both green while real
 * backups silently lose data. Here we run the REAL exporter, capture the bytes
 * it writes, feed them straight into the REAL importer, and assert the entities
 * survive the trip.
 *
 * Only the I/O edges are mocked. The shared `mockWritten` buffer is both the
 * export sink and the import source, so the file genuinely flows export->import.
 */

import * as XLSX from "xlsx";

const mockWritten = { content: "", encoding: "" };

jest.mock("expo-file-system", () => ({
  Paths: { document: "doc", cache: "cache" },
  File: class {
    uri: string;
    constructor(a: string, b?: string) {
      this.uri = b ? `${a}/${b}` : a;
    }
    create() {}
    write(content: string, opts: { encoding: string }) {
      mockWritten.content = content;
      mockWritten.encoding = opts?.encoding;
    }
    // Import reads back exactly what export wrote.
    async text() {
      return mockWritten.content;
    }
    async base64() {
      return mockWritten.content;
    }
  },
}));
jest.mock("react-native", () => ({
  Platform: { OS: "android" },
  Share: { share: jest.fn(), sharedAction: "sharedAction" },
}));
jest.mock("../iosNativeShare", () => ({
  shareLocalFile: jest.fn(async () => {}),
  waitForIosModalTeardown: jest.fn(async () => {}),
}));

// --- exporter data sources ---
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
  { id: "e1", type: "income", category: "Salary", amount: 4000, date: "2026-06-01", createdAt: "2026-06-01T00:00:00.000Z" },
  { id: "e2", type: "expense", category: "Food", amount: 30.5, date: "2026-06-02", createdAt: "2026-06-02T00:00:00.000Z" },
  // Recurring entry: the exporter projects copies across months; the importer
  // must drop those projections and keep exactly the original row.
  { id: "e3", type: "expense", category: "Housing", amount: 1200, date: "2026-01-01", recurring: true, createdAt: "2026-01-01T00:00:00.000Z" },
  // Bank-imported entry: Source/ExternalTxId/Merchant must round-trip -
  // externalTxId is the connections-sync dedup identity, so losing it on a
  // backup/restore cycle would re-offer every approved transaction.
  { id: "e4", type: "expense", category: "Grocery", amount: 82.14, date: "2026-06-03", createdAt: "2026-06-03T00:00:00.000Z", source: "bank", externalTxId: "simplefin:ACT-1:TXN-99", merchant: "COSTCO WHSE" },
  // Business-tagged, person-assigned expense: BusinessId/PersonId must
  // round-trip; the readable Business/Person name columns are export-only
  // and ignored on import.
  { id: "e5", type: "expense", category: "Tech", amount: 199, date: "2026-06-04", createdAt: "2026-06-04T00:00:00.000Z", businessId: "b1", personId: "per1" },
  // W-2 paycheck: incomeType + retirementContribution must round-trip.
  { id: "e6", type: "income", category: "Salary", amount: 2500, date: "2026-06-05", createdAt: "2026-06-05T00:00:00.000Z", incomeType: "w2", retirementContribution: 150 },
  // 1099 payment: incomeType + taxSetAsideRate must round-trip.
  { id: "e7", type: "income", category: "Freelance", amount: 1000, date: "2026-06-06", createdAt: "2026-06-06T00:00:00.000Z", incomeType: "1099", taxSetAsideRate: 25 },
  // Private entry: the Private flag must round-trip - stripping it on a
  // backup/restore cycle would silently start syncing the entry to a partner.
  { id: "e8", type: "expense", category: "Shopping", amount: 75, date: "2026-06-07", createdAt: "2026-06-07T00:00:00.000Z", isPrivate: true },
];
const businessFixtures = [
  { id: "b1", name: "Acme Consulting LLC", createdAt: "2026-02-01T00:00:00.000Z", updatedAt: "2026-02-01T00:00:00.000Z" },
];
const peopleFixtures = [
  { id: "per1", name: "Sam", createdAt: "2026-02-01T00:00:00.000Z", updatedAt: "2026-02-01T00:00:00.000Z" },
];
const holdingsFixtures = [
  { id: "h1", symbol: "AAPL", shares: 10, costBasis: 1500, createdAt: "2026-05-01T00:00:00.000Z", updatedAt: "2026-05-02T00:00:00.000Z" },
  // Fractional shares + no cost basis: both must round-trip through the sheet.
  { id: "h2", symbol: "VTI", shares: 0.25, createdAt: "2026-05-03T00:00:00.000Z", updatedAt: "2026-05-03T00:00:00.000Z" },
];

jest.mock("../../storage/debtStorage", () => ({
  getDebts: jest.fn(async () => [debtRef]),
  getPayments: jest.fn(async () => []),
}));
jest.mock("../../storage/budgetStorage", () => ({
  getBudgetEntries: jest.fn(async () => entriesRef),
  getCategoryBudgetLimits: jest.fn(async () => []),
}));
jest.mock("../../storage/savingsGoalStorage", () => ({ getSavingsGoals: jest.fn(async () => []) }));
jest.mock("../../storage/assetAccountStorage", () => ({ getAssetAccounts: jest.fn(async () => []) }));
jest.mock("../../storage/holdingsStorage", () => ({ getHoldings: jest.fn(async () => holdingsRef) }));
jest.mock("../../storage/businessStorage", () => ({ getBusinesses: jest.fn(async () => businessesRef) }));
jest.mock("../../storage/personStorage", () => ({ getPeople: jest.fn(async () => peopleRef) }));
jest.mock("../../storage/debtMilestoneStorage", () => ({ getDebtMilestonePlan: jest.fn(async () => null) }));
jest.mock("../../storage/backupReminderStorage", () => ({ recordBackup: jest.fn(async () => {}) }));

// --- importer's downstream sink (capture the normalized payload) ---
const mockImportFromString = jest.fn(async (_json: string, _mode?: string) => ({
  debts: 0, payments: 0, budgetEntries: 0, budgetLimits: 0,
  savingsGoals: 0, assetAccounts: 0, holdings: 0, debtMilestones: false,
  payoffStrategy: false, netWorthSnapshots: 0, customCategories: 0,
  businesses: 0, people: 0,
}));
let mockPicked: any = { canceled: true };
jest.mock("../importData", () => ({
  importFromString: mockImportFromString,
  openDocumentPicker: jest.fn(async () => mockPicked),
}));
jest.mock("../uuid", () => ({ generateUUID: () => "gen-uuid" }));

const debtRef = debtFixture;
const entriesRef = entryFixtures;
const holdingsRef = holdingsFixtures;
const businessesRef = businessFixtures;
const peopleRef = peopleFixtures;

// eslint-disable-next-line import/first -- must require after the jest.mock factories' captured consts initialize (ts-jest emits CJS, so import position is require order)
import { exportSpreadsheet } from "../spreadsheetExport";
// eslint-disable-next-line import/first -- same as above
import { importSpreadsheet } from "../spreadsheetImport";

jest.spyOn(console, "info").mockImplementation(() => {});

/** The payload object handed to importFromString on the last call. */
const lastPayload = (): any =>
  JSON.parse(mockImportFromString.mock.calls[mockImportFromString.mock.calls.length - 1][0]);

beforeEach(() => {
  mockWritten.content = "";
  mockWritten.encoding = "";
  mockImportFromString.mockClear();
});

describe("xlsx round-trip", () => {
  it("preserves budget entries and debts through export -> import", async () => {
    await exportSpreadsheet("xlsx");
    mockPicked = {
      canceled: false,
      assets: [{ uri: "file:///rt.xlsx", name: "rt.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", size: 2000 }],
    };
    const result = await importSpreadsheet("merge");

    const payload = lastPayload();

    // Entries: e1-e8 survive; the recurring projections of e3 are dropped.
    const byId = Object.fromEntries(payload.budgetEntries.map((e: any) => [e.id, e]));
    expect(Object.keys(byId).sort()).toEqual(["e1", "e2", "e3", "e4", "e5", "e6", "e7", "e8"]);
    expect(byId.e1).toMatchObject({ type: "income", category: "Salary", amount: 4000 });
    expect(byId.e2).toMatchObject({ type: "expense", category: "Food", amount: 30.5 });
    expect(byId.e3).toMatchObject({ type: "expense", category: "Housing", amount: 1200, recurring: true });
    // Bank provenance columns round-trip intact.
    expect(byId.e4).toMatchObject({
      source: "bank",
      externalTxId: "simplefin:ACT-1:TXN-99",
      merchant: "COSTCO WHSE",
    });
    // Manual entries never grow provenance fields on the way through.
    expect(byId.e1.source).toBeUndefined();
    expect(byId.e1.externalTxId).toBeUndefined();

    // BusinessId round-trips; untagged entries stay untagged; the readable
    // "Business" name column never becomes a field on the imported entry.
    expect(byId.e5.businessId).toBe("b1");
    expect(byId.e1.businessId).toBeUndefined();
    expect(byId.e5.Business).toBeUndefined();

    // PersonId mirrors the BusinessId contract exactly.
    expect(byId.e5.personId).toBe("per1");
    expect(byId.e1.personId).toBeUndefined();
    expect(byId.e5.Person).toBeUndefined();

    // W-2 / 1099 paycheck fields round-trip; plain income never grows them.
    expect(byId.e6).toMatchObject({ incomeType: "w2", retirementContribution: 150 });
    expect(byId.e6.taxSetAsideRate).toBeUndefined();
    expect(byId.e7).toMatchObject({ incomeType: "1099", taxSetAsideRate: 25 });
    expect(byId.e7.retirementContribution).toBeUndefined();
    expect(byId.e1.incomeType).toBeUndefined();
    expect(byId.e1.retirementContribution).toBeUndefined();
    expect(byId.e1.taxSetAsideRate).toBeUndefined();

    // The partner-sync privacy flag round-trips; public entries never grow it.
    expect(byId.e8.isPrivate).toBe(true);
    expect(byId.e1.isPrivate).toBeUndefined();

    // The Businesses sheet round-trips with timestamps intact (LWW needs them).
    expect(payload.businesses).toHaveLength(1);
    expect(payload.businesses[0]).toMatchObject({
      id: "b1",
      name: "Acme Consulting LLC",
      updatedAt: "2026-02-01T00:00:00.000Z",
    });

    // The People sheet round-trips the same way.
    expect(payload.people).toHaveLength(1);
    expect(payload.people[0]).toMatchObject({
      id: "per1",
      name: "Sam",
      updatedAt: "2026-02-01T00:00:00.000Z",
    });
    // Date asserted at month granularity: SheetJS shifts Excel date serials by
    // the test runner's TZ offset on round-trip. The app pins dates to local
    // noon (±12h slack), so on-device the calendar date is preserved; the
    // exact-day check here would flake on the offset, not on a real regression.
    expect(byId.e3.date).toMatch(/^2026-01/);

    // Debts survive with their numeric fields intact.
    expect(payload.debts).toHaveLength(1);
    expect(payload.debts[0]).toMatchObject({
      id: "d1", name: "Car Loan", balance: 5000, originalBalance: 10000, rate: 6.5, minPayment: 200,
    });

    // Holdings survive: symbol/shares/costBasis, including a fractional-share
    // position with no cost basis. Prices are never in the sheet to begin with.
    const holdingsById = Object.fromEntries(
      payload.holdings.map((h: any) => [h.id, h])
    );
    expect(Object.keys(holdingsById).sort()).toEqual(["h1", "h2"]);
    expect(holdingsById.h1).toMatchObject({ symbol: "AAPL", shares: 10, costBasis: 1500 });
    expect(holdingsById.h2).toMatchObject({ symbol: "VTI", shares: 0.25 });
    expect(holdingsById.h2.costBasis).toBeUndefined();

    // No data row was rejected on the way back in.
    expect(result?.skippedRows).toBe(0);
  });
});

describe("csv round-trip", () => {
  it("preserves budget entries through export -> import", async () => {
    await exportSpreadsheet("csv");
    mockPicked = {
      canceled: false,
      assets: [{ uri: "file:///rt.csv", name: "rt.csv", mimeType: "text/csv", size: 800 }],
    };
    const result = await importSpreadsheet("merge");

    const payload = lastPayload();
    const byId = Object.fromEntries(payload.budgetEntries.map((e: any) => [e.id, e]));
    expect(Object.keys(byId).sort()).toEqual(["e1", "e2", "e3", "e4", "e5", "e6", "e7", "e8"]);
    expect(byId.e2).toMatchObject({ category: "Food", amount: 30.5 });
    // Paycheck fields survive the single-sheet CSV path too.
    expect(byId.e6).toMatchObject({ incomeType: "w2", retirementContribution: 150 });
    expect(byId.e7).toMatchObject({ incomeType: "1099", taxSetAsideRate: 25 });
    // ...and so does the privacy flag.
    expect(byId.e8.isPrivate).toBe(true);
    expect(byId.e4).toMatchObject({
      source: "bank",
      externalTxId: "simplefin:ACT-1:TXN-99",
      merchant: "COSTCO WHSE",
    });
    // CSV carries the entry-level BusinessId/PersonId even though the
    // Businesses and People sheets are xlsx-only.
    expect(byId.e5.businessId).toBe("b1");
    expect(byId.e5.personId).toBe("per1");
    expect(result?.skippedRows).toBe(0);
  });
});

describe("round-trip schema guard", () => {
  it("confirms the captured file actually carries the exported sheets", async () => {
    // A direct check that export produced real bytes (guards against a future
    // change where write() is skipped and import silently reads stale content).
    await exportSpreadsheet("xlsx");
    expect(mockWritten.encoding).toBe("base64");
    const wb = XLSX.read(mockWritten.content, { type: "base64" });
    expect(wb.SheetNames).toEqual(
      expect.arrayContaining(["Budget Entries", "Debts", "Businesses", "People"])
    );
  });
});

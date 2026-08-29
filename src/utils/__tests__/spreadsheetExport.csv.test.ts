/**
 * CSV-safety and recurring-projection tests for spreadsheetExport.ts, split
 * out of spreadsheetExport.test.ts so that file's fixture migration doesn't
 * collide with this work.
 *
 * escapeCsvFormulaCells / expandRecurringRows aren't exported, so (like the
 * sibling test file) they're driven through the real SheetJS build via the
 * public exportSpreadsheet() entry point and asserted on the bytes that
 * would have been written to disk.
 *
 *   - escapeCsvFormulaCells (CWE-1236): a CSV cell whose text starts with
 *     =, +, -, or @ opens as a live formula in Excel/Sheets on double-click.
 *     A budget entry described as `=HYPERLINK(...)` becomes code on whoever
 *     opens the shared file. Only STRING cells starting with those four
 *     characters are prefixed with a guard quote; this is CSV-only (XLSX
 *     string cells are explicitly typed and can't be misread as formulas),
 *     and only applies to Description-style text - an ordinary negative
 *     Amount is a numeric cell and is untouched either way.
 *   - expandRecurringRows: projects a recurring entry across every month up
 *     to the reporting window's end, spaced by its RecurrenceInterval (1,
 *     3, 6, or 12 months), with the day-of-month clamped to the shorter
 *     target month's last valid day (the 31st of January projects to
 *     February 28th, not a JS-Date-style rollover to March 3rd).
 *
 * Mocked edges (mirrors spreadsheetExport.test.ts): expo-file-system
 * (capture writes), react-native Platform, the native share call, and every
 * storage getter (only budgetStorage's getBudgetEntries returns real test
 * data - everything else is empty/null so the sheets outside Budget
 * Entries stay irrelevant to these tests).
 */

import * as XLSX from "xlsx";

const DERIVED_RECURRING_PREFIX = "__projected_recurring__:";

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

jest.mock("../iosNativeShare", () => ({
  shareLocalFile: jest.fn(async () => {}),
  waitForIosModalTeardown: jest.fn(async () => {}),
}));

// Mutable so each describe block can point getBudgetEntries at its own fixtures.
let entryFixturesRef: Record<string, unknown>[] = [];

jest.mock("../../storage/debtStorage", () => ({
  getDebts: jest.fn(async () => []),
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
jest.mock("../../storage/personStorage", () => ({
  getPeople: jest.fn(async () => []),
}));
jest.mock("../../storage/backupReminderStorage", () => ({
  recordBackup: jest.fn(async () => {}),
}));

// eslint-disable-next-line import/first -- must require after the jest.mock factories' captured consts initialize (ts-jest emits CJS, so import position is require order)
import { exportSpreadsheet } from "../spreadsheetExport";

// The exporter logs progress via console.info; keep test output clean.
jest.spyOn(console, "info").mockImplementation(() => {});

beforeEach(() => {
  mockWritten.content = "";
  mockWritten.encoding = "";
  mockWritten.created = false;
  entryFixturesRef = [];
});

describe("exportSpreadsheet - CSV formula-cell escaping (CWE-1236)", () => {
  const entry = (over: Record<string, unknown> = {}) => ({
    id: "e1",
    type: "expense",
    category: "Food",
    amount: 10,
    date: "2026-06-01",
    createdAt: "2026-06-01T00:00:00.000Z",
    ...over,
  });

  it("neutralizes descriptions starting with =, +, -, or @ so they cannot execute as formulas", async () => {
    entryFixturesRef = [
      entry({ id: "e1", description: "=1+1" }),
      entry({ id: "e2", description: "+1+1" }),
      entry({ id: "e3", description: "-1+1" }),
      entry({ id: "e4", description: "@SUM(A1:A2)" }),
    ];
    await exportSpreadsheet("csv");
    const csv = mockWritten.content;

    // Guarded: a leading quote forces spreadsheet apps to read the cell as
    // text instead of evaluating it.
    expect(csv).toContain("'=1+1");
    expect(csv).toContain("'+1+1");
    expect(csv).toContain("'-1+1");
    expect(csv).toContain("'@SUM(A1:A2)");
    // Never present unguarded (immediately after a field-separating comma).
    expect(csv).not.toMatch(/,=1\+1/);
    expect(csv).not.toMatch(/,\+1\+1/);
    expect(csv).not.toMatch(/,-1\+1/);
    expect(csv).not.toMatch(/,@SUM\(A1:A2\)/);
  });

  it("does not disturb the realistic HYPERLINK-injection example", async () => {
    entryFixturesRef = [
      entry({ id: "e1", description: '=HYPERLINK("http://evil.example","Click")' }),
    ];
    await exportSpreadsheet("csv");
    expect(mockWritten.content).toContain("'=HYPERLINK(");
  });

  it("leaves an ordinary negative amount (a numeric cell) untouched", async () => {
    entryFixturesRef = [
      entry({ id: "e1", category: "Savings", amount: -45.5, description: "Correction" }),
    ];
    await exportSpreadsheet("csv");
    const csv = mockWritten.content;
    // The numeric cell serializes as a plain negative number, never quoted.
    expect(csv).toMatch(/,-45\.5,/);
    expect(csv).not.toContain("'-45.5");
  });

  it("leaves plain text untouched", async () => {
    entryFixturesRef = [entry({ id: "e1", description: "Grocery run" })];
    await exportSpreadsheet("csv");
    const csv = mockWritten.content;
    expect(csv).toContain("Grocery run");
    expect(csv).not.toContain("'Grocery run");
  });
});

describe("exportSpreadsheet - expandRecurringRows", () => {
  const parseWorkbook = () => XLSX.read(mockWritten.content, { type: "base64" });
  const entryRows = () =>
    XLSX.utils.sheet_to_json<Record<string, unknown>>(parseWorkbook().Sheets["Budget Entries"], {
      raw: false,
    });
  const rowById = (id: string) => entryRows().find((r) => r.ID === id);

  beforeEach(() => {
    entryFixturesRef = [
      // Pushes the reporting window's end month out to 2028-01 regardless
      // of the real wall-clock date the test suite happens to run on.
      {
        id: "anchor",
        type: "income",
        category: "Salary",
        amount: 1,
        date: "2028-01-01",
        createdAt: "2028-01-01T00:00:00.000Z",
      },
      {
        id: "rec_clamp",
        type: "expense",
        category: "Utilities",
        amount: 50,
        date: "2026-01-31",
        recurring: true, // no recurrenceInterval -> defaults to monthly (1)
        createdAt: "2026-01-31T00:00:00.000Z",
      },
      {
        id: "rec_q",
        type: "expense",
        category: "Insurance",
        amount: 75,
        date: "2026-01-15",
        recurring: true,
        recurrenceInterval: 3,
        createdAt: "2026-01-15T00:00:00.000Z",
      },
      {
        id: "rec_h",
        type: "expense",
        category: "Insurance",
        amount: 75,
        date: "2026-01-15",
        recurring: true,
        recurrenceInterval: 6,
        createdAt: "2026-01-15T00:00:00.000Z",
      },
      {
        id: "rec_y",
        type: "expense",
        category: "Insurance",
        amount: 75,
        date: "2026-01-15",
        recurring: true,
        recurrenceInterval: 12,
        createdAt: "2026-01-15T00:00:00.000Z",
      },
    ];
  });

  it("clamps the 31st of January to February's last valid day, not a March rollover", async () => {
    await exportSpreadsheet("xlsx");
    const feb = rowById(`${DERIVED_RECURRING_PREFIX}rec_clamp:2026-02`);
    expect(feb?.Date).toBe("2026-02-28");
    // The classic JS-Date-arithmetic bug this guards against: new
    // Date(2026, 1, 31) silently rolls over to March 3rd instead of
    // clamping - assert that never happens.
    expect(rowById(`${DERIVED_RECURRING_PREFIX}rec_clamp:2026-03`)?.Date).not.toBe(
      "2026-03-03"
    );
  });

  it("keeps a 31-day month unclamped once the day is valid there", async () => {
    await exportSpreadsheet("xlsx");
    // March has 31 days, so the 31st survives unclamped.
    expect(rowById(`${DERIVED_RECURRING_PREFIX}rec_clamp:2026-03`)?.Date).toBe(
      "2026-03-31"
    );
  });

  it("spaces quarterly (interval 3) projections 3 months apart, not monthly", async () => {
    await exportSpreadsheet("xlsx");
    expect(rowById(`${DERIVED_RECURRING_PREFIX}rec_q:2026-04`)?.Date).toBe("2026-04-15");
    expect(rowById(`${DERIVED_RECURRING_PREFIX}rec_q:2026-02`)).toBeUndefined();
    expect(rowById(`${DERIVED_RECURRING_PREFIX}rec_q:2026-03`)).toBeUndefined();
  });

  it("spaces semiannual (interval 6) projections 6 months apart", async () => {
    await exportSpreadsheet("xlsx");
    expect(rowById(`${DERIVED_RECURRING_PREFIX}rec_h:2026-07`)?.Date).toBe("2026-07-15");
    expect(rowById(`${DERIVED_RECURRING_PREFIX}rec_h:2026-04`)).toBeUndefined();
  });

  it("spaces yearly (interval 12) projections 12 months apart", async () => {
    await exportSpreadsheet("xlsx");
    expect(rowById(`${DERIVED_RECURRING_PREFIX}rec_y:2027-01`)?.Date).toBe("2027-01-15");
    expect(rowById(`${DERIVED_RECURRING_PREFIX}rec_y:2026-07`)).toBeUndefined();
  });
});

/**
 * Currency migration tests (convertAllStoredData).
 *
 * The real convertAmount math runs; every storage collection is mocked so we
 * can feed fixtures in and capture what gets written back. To make assertions
 * obvious, the tests convert "USD" -> "X" with a rate snapshot {USD:1, X:2},
 * so every converted value is exactly doubled (convertAmount rounds to 2 dp).
 */

import { convertAllStoredData } from "../currencyMigration";
import {
  getDebtsIncludingDeleted,
  saveDebts,
  getPaymentsIncludingDeleted,
  savePayments,
} from "../../storage/debtStorage";
import {
  getBudgetEntriesIncludingDeleted,
  saveBudgetEntries,
  getAllLimitsByMonth,
  saveCategoryBudgetLimits,
} from "../../storage/budgetStorage";
import {
  getSavingsGoalsIncludingDeleted,
  saveSavingsGoals,
} from "../../storage/savingsGoalStorage";
import {
  getAssetAccountsIncludingDeleted,
  saveAssetAccounts,
} from "../../storage/assetAccountStorage";
import {
  getNetWorthSnapshots,
  saveNetWorthSnapshots,
} from "../../storage/netWorthSnapshotStorage";
import {
  getDebtMilestonePlan,
  saveDebtMilestonePlan,
} from "../../storage/debtMilestoneStorage";

jest.mock("../../storage/debtStorage", () => ({
  getDebtsIncludingDeleted: jest.fn(),
  saveDebts: jest.fn(),
  getPaymentsIncludingDeleted: jest.fn(),
  savePayments: jest.fn(),
}));
jest.mock("../../storage/budgetStorage", () => ({
  getBudgetEntriesIncludingDeleted: jest.fn(),
  saveBudgetEntries: jest.fn(),
  getAllLimitsByMonth: jest.fn(),
  saveCategoryBudgetLimits: jest.fn(),
}));
jest.mock("../../storage/savingsGoalStorage", () => ({
  getSavingsGoalsIncludingDeleted: jest.fn(),
  saveSavingsGoals: jest.fn(),
}));
jest.mock("../../storage/assetAccountStorage", () => ({
  getAssetAccountsIncludingDeleted: jest.fn(),
  saveAssetAccounts: jest.fn(),
}));
jest.mock("../../storage/netWorthSnapshotStorage", () => ({
  getNetWorthSnapshots: jest.fn(),
  saveNetWorthSnapshots: jest.fn(),
}));
jest.mock("../../storage/debtMilestoneStorage", () => ({
  getDebtMilestonePlan: jest.fn(),
  saveDebtMilestonePlan: jest.fn(),
}));

const m = (fn: unknown) => fn as jest.Mock;

// Rate snapshot that doubles every value (USD base = 1, X = 2 units/USD).
const DOUBLE = { USD: 1, X: 2 };
const convert = () => convertAllStoredData("USD", "X", DOUBLE);

const firstArg = (fn: unknown): any => m(fn).mock.calls[0][0];

beforeEach(() => {
  jest.clearAllMocks();
  // Default everything to empty so each test only populates what it asserts.
  m(getDebtsIncludingDeleted).mockResolvedValue([]);
  m(getPaymentsIncludingDeleted).mockResolvedValue([]);
  m(getBudgetEntriesIncludingDeleted).mockResolvedValue([]);
  m(getAllLimitsByMonth).mockResolvedValue({});
  m(getSavingsGoalsIncludingDeleted).mockResolvedValue([]);
  m(getAssetAccountsIncludingDeleted).mockResolvedValue([]);
  m(getNetWorthSnapshots).mockResolvedValue([]);
  m(getDebtMilestonePlan).mockResolvedValue({ steps: [] });
});

describe("no-op cases", () => {
  it("returns zero counts and writes nothing when the codes match", async () => {
    const result = await convertAllStoredData("USD", "USD", DOUBLE);
    expect(result).toEqual({
      debts: 0,
      payments: 0,
      budgetEntries: 0,
      categoryLimitMonths: 0,
      savingsGoals: 0,
      assetAccounts: 0,
      netWorthSnapshots: 0,
      milestoneSteps: 0,
    });
    expect(getDebtsIncludingDeleted).not.toHaveBeenCalled();
    expect(saveDebts).not.toHaveBeenCalled();
  });

  it("does not call any setter when all collections are empty", async () => {
    const result = await convert();
    expect(result.debts).toBe(0);
    expect(saveDebts).not.toHaveBeenCalled();
    expect(savePayments).not.toHaveBeenCalled();
    expect(saveBudgetEntries).not.toHaveBeenCalled();
    expect(saveCategoryBudgetLimits).not.toHaveBeenCalled();
    expect(saveSavingsGoals).not.toHaveBeenCalled();
    expect(saveAssetAccounts).not.toHaveBeenCalled();
    expect(saveNetWorthSnapshots).not.toHaveBeenCalled();
    expect(saveDebtMilestonePlan).not.toHaveBeenCalled();
  });
});

describe("debts", () => {
  it("scales balance, originalBalance and minPayment, and bumps updatedAt", async () => {
    m(getDebtsIncludingDeleted).mockResolvedValue([
      {
        id: "d1",
        name: "Visa",
        balance: 1000,
        originalBalance: 2000,
        minPayment: 50,
        rate: 19.9,
        updatedAt: "2020-01-01T00:00:00.000Z",
      },
    ]);
    const result = await convert();

    const saved = firstArg(saveDebts)[0];
    expect(saved).toMatchObject({
      id: "d1",
      balance: 2000,
      originalBalance: 4000,
      minPayment: 100,
      rate: 19.9, // non-money field untouched
    });
    expect(saved.updatedAt).not.toBe("2020-01-01T00:00:00.000Z");
    expect(Date.parse(saved.updatedAt)).not.toBeNaN();
    expect(result.debts).toBe(1);
  });
});

describe("payments", () => {
  it("converts amount, and appliedAmount only when present", async () => {
    m(getPaymentsIncludingDeleted).mockResolvedValue([
      { id: "p1", debtId: "d1", amount: 75, appliedAmount: 75, date: "2026-02-01" },
      { id: "p2", debtId: "d1", amount: 40, date: "2026-03-01" },
    ]);
    const result = await convert();

    const saved = firstArg(savePayments);
    expect(saved[0]).toMatchObject({ id: "p1", amount: 150, appliedAmount: 150 });
    expect(saved[1].amount).toBe(80);
    expect(saved[1].appliedAmount).toBeUndefined();
    expect(result.payments).toBe(2);
  });
});

describe("budget entries", () => {
  it("converts the amount on every entry", async () => {
    m(getBudgetEntriesIncludingDeleted).mockResolvedValue([
      { id: "e1", type: "expense", category: "Food", amount: 30, date: "2026-06-01" },
    ]);
    const result = await convert();
    expect(firstArg(saveBudgetEntries)[0]).toMatchObject({ id: "e1", amount: 60 });
    expect(result.budgetEntries).toBe(1);
  });
});

describe("category limits by month", () => {
  it("converts each month's limits and counts the months", async () => {
    m(getAllLimitsByMonth).mockResolvedValue({
      "2026-01": [{ category: "Food", monthlyLimit: 400 }],
      "2026-02": [{ category: "Food", monthlyLimit: 500 }],
      "2026-03": [], // empty month is skipped
    });
    const result = await convert();

    expect(saveCategoryBudgetLimits).toHaveBeenCalledTimes(2);
    // Each call passes (limits, monthKey).
    const calls = m(saveCategoryBudgetLimits).mock.calls;
    const byMonth = Object.fromEntries(calls.map((c) => [c[1], c[0]]));
    expect(byMonth["2026-01"][0]).toMatchObject({ monthlyLimit: 800 });
    expect(byMonth["2026-02"][0]).toMatchObject({ monthlyLimit: 1000 });
    expect(result.categoryLimitMonths).toBe(2);
  });
});

describe("savings goals & asset accounts", () => {
  it("converts goal target/current amounts", async () => {
    m(getSavingsGoalsIncludingDeleted).mockResolvedValue([
      { id: "g1", name: "EF", category: "emergency_fund", targetAmount: 10000, currentAmount: 2500 },
    ]);
    const result = await convert();
    expect(firstArg(saveSavingsGoals)[0]).toMatchObject({
      targetAmount: 20000,
      currentAmount: 5000,
    });
    expect(result.savingsGoals).toBe(1);
  });

  it("converts asset account balances", async () => {
    m(getAssetAccountsIncludingDeleted).mockResolvedValue([
      { id: "a1", name: "Checking", category: "cash", balance: 1500 },
    ]);
    const result = await convert();
    expect(firstArg(saveAssetAccounts)[0]).toMatchObject({ balance: 3000 });
    expect(result.assetAccounts).toBe(1);
  });
});

describe("net worth snapshots", () => {
  it("scales the amounts but preserves dayKey/capturedAt (no updatedAt)", async () => {
    m(getNetWorthSnapshots).mockResolvedValue([
      {
        dayKey: "2026-06-22",
        capturedAt: "2026-06-22T00:00:00.000Z",
        totalAssets: 1000,
        totalDebt: 200,
        netWorth: 800,
      },
    ]);
    const result = await convert();

    const saved = firstArg(saveNetWorthSnapshots)[0];
    expect(saved).toMatchObject({
      dayKey: "2026-06-22",
      capturedAt: "2026-06-22T00:00:00.000Z",
      totalAssets: 2000,
      totalDebt: 400,
      netWorth: 1600,
    });
    expect(result.netWorthSnapshots).toBe(1);
  });
});

describe("milestone plan", () => {
  it("converts numeric step targets, leaves non-numeric steps untouched", async () => {
    m(getDebtMilestonePlan).mockResolvedValue({
      version: 1,
      steps: [
        { key: "keel", targetAmount: 1000 },
        { key: "sail", targetAmount: 5000 },
        { key: "open", targetAmount: null }, // no numeric target
      ],
    });
    const result = await convert();

    const saved = firstArg(saveDebtMilestonePlan);
    expect(saved.steps[0]).toMatchObject({ key: "keel", targetAmount: 2000 });
    expect(saved.steps[1]).toMatchObject({ key: "sail", targetAmount: 10000 });
    expect(saved.steps[2]).toMatchObject({ key: "open", targetAmount: null });
    expect(result.milestoneSteps).toBe(2);
  });

  it("does not save the plan when no step has a numeric target", async () => {
    m(getDebtMilestonePlan).mockResolvedValue({
      version: 1,
      steps: [{ key: "open", targetAmount: null }],
    });
    const result = await convert();
    expect(saveDebtMilestonePlan).not.toHaveBeenCalled();
    expect(result.milestoneSteps).toBe(0);
  });
});

describe("rate fallback", () => {
  it("uses the static table when no rate snapshot is supplied", async () => {
    m(getDebtsIncludingDeleted).mockResolvedValue([
      { id: "d1", name: "Visa", balance: 100, originalBalance: 100, minPayment: 10 },
    ]);
    // USD -> EUR via the baked-in static table (0.92).
    await convertAllStoredData("USD", "EUR");
    expect(firstArg(saveDebts)[0]).toMatchObject({ balance: 92 });
  });
});

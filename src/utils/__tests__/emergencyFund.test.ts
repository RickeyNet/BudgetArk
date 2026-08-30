// BudgetArk - Emergency Fund Resolution tests
//
// Pins the linked-accounts-over-goal resolution that Bridge, Budget, Charts,
// net worth, achievements, and the spreadsheet export all share.

import {
  getEmergencyFundSource,
  resolveEmergencyFundAmount,
  resolveEmergencyFundGoal,
  sumSavingsReserve,
} from "../emergencyFund";
import type { AssetAccount, BudgetEntry, SavingsGoal } from "../../types";

const efGoal = (over: Partial<SavingsGoal> = {}): SavingsGoal => ({
  id: "g1",
  name: "Emergency Fund",
  category: "emergency_fund",
  targetAmount: 1000,
  currentAmount: 250,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

const account = (over: Partial<AssetAccount> = {}): AssetAccount => ({
  id: "a1",
  name: "HYSA",
  category: "savings",
  balance: 500,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

describe("getEmergencyFundSource", () => {
  it("is not linked when no account carries the flag", () => {
    const source = getEmergencyFundSource([account()]);
    expect(source).toEqual({ linked: false, accounts: [], linkedAmount: 0 });
  });

  it("sums the balances of all designated live accounts", () => {
    const a = account({ id: "a1", balance: 500, isEmergencyFund: true });
    const b = account({ id: "a2", balance: 250.5, isEmergencyFund: true });
    const c = account({ id: "a3", balance: 9999 });
    const source = getEmergencyFundSource([a, b, c]);
    expect(source.linked).toBe(true);
    expect(source.accounts).toEqual([a, b]);
    expect(source.linkedAmount).toBe(750.5);
  });

  it("ignores tombstoned accounts even when flagged", () => {
    const dead = account({
      isEmergencyFund: true,
      deletedAt: "2026-02-01T00:00:00.000Z",
    });
    expect(getEmergencyFundSource([dead]).linked).toBe(false);
  });

  it("treats a non-boolean truthy flag as not designated", () => {
    const smuggled = account({
      isEmergencyFund: "yes" as unknown as boolean,
    });
    expect(getEmergencyFundSource([smuggled]).linked).toBe(false);
  });
});

describe("resolveEmergencyFundAmount", () => {
  it("prefers the linked-account total over the goal amount", () => {
    const linked = account({ balance: 1200, isEmergencyFund: true });
    expect(resolveEmergencyFundAmount([efGoal()], [linked])).toBe(1200);
  });

  it("falls back to the emergency-fund goal when nothing is linked", () => {
    expect(resolveEmergencyFundAmount([efGoal()], [account()])).toBe(250);
  });

  it("returns 0 with no goal and no linked accounts", () => {
    expect(resolveEmergencyFundAmount([], [])).toBe(0);
  });

  it("skips a tombstoned emergency-fund goal", () => {
    const dead = efGoal({ deletedAt: "2026-02-01T00:00:00.000Z" });
    expect(resolveEmergencyFundAmount([dead], [])).toBe(0);
  });
});

const entry = (over: Partial<BudgetEntry> = {}): BudgetEntry => ({
  id: "e1",
  type: "expense",
  category: "Savings",
  amount: 100,
  date: "2026-03-01",
  createdAt: "2026-03-01T00:00:00.000Z",
  updatedAt: "2026-03-01T00:00:00.000Z",
  ...over,
});

describe("sumSavingsReserve", () => {
  it("counts only Savings expenses - not Retirement/Investing or income", () => {
    expect(
      sumSavingsReserve([
        entry({ amount: 100 }),
        entry({ id: "e2", amount: 50 }),
        entry({ id: "e3", category: "Retirement", amount: 999 }),
        entry({ id: "e4", category: "Investing", amount: 999 }),
        entry({ id: "e5", type: "income", category: "Salary", amount: 999 }),
      ])
    ).toBe(150);
    expect(sumSavingsReserve([])).toBe(0);
  });
});

describe("resolveEmergencyFundGoal", () => {
  const resolve = (over: Partial<Parameters<typeof resolveEmergencyFundGoal>[0]> = {}) =>
    resolveEmergencyFundGoal({
      savingsGoals: [],
      assetAccounts: [],
      keelTarget: 0,
      savingsReserve: 0,
      ...over,
    });

  it("is null when there is no goal, no Keel target, and no savings yet", () => {
    expect(resolve()).toBeNull();
  });

  it("prefers the explicit emergency_fund goal", () => {
    const goal = efGoal({ targetAmount: 5000, currentAmount: 1200 });
    expect(resolve({ savingsGoals: [goal], keelTarget: 999, savingsReserve: 42 })).toBe(goal);
  });

  it("synthesises a goal from the Keel target + Savings reserve", () => {
    expect(resolve({ keelTarget: 3000, savingsReserve: 450 })).toMatchObject({
      id: "__keel_ef__",
      category: "emergency_fund",
      targetAmount: 3000,
      currentAmount: 450,
    });
    // Either side alone is enough for the fund to appear.
    expect(resolve({ savingsReserve: 10 })?.currentAmount).toBe(10);
    expect(resolve({ keelTarget: 10 })?.targetAmount).toBe(10);
  });

  it("linked mode overlays the designated accounts' total, keeping the explicit target", () => {
    const goal = efGoal({ targetAmount: 5000, currentAmount: 1200 });
    const linked = resolve({
      savingsGoals: [goal],
      assetAccounts: [
        account({ isEmergencyFund: true, balance: 800 }),
        account({ id: "a2", isEmergencyFund: true, balance: 700 }),
        account({ id: "a3", balance: 99999 }),
        account({ id: "a4", isEmergencyFund: true, balance: 5, deletedAt: "2026-02-01T00:00:00.000Z" }),
      ],
    });
    expect(linked).toMatchObject({ id: "g1", targetAmount: 5000, currentAmount: 1500 });
  });

  it("linked mode creates a synthetic goal when nothing else exists", () => {
    expect(
      resolve({ assetAccounts: [account({ isEmergencyFund: true, balance: 250 })] })
    ).toMatchObject({ id: "__linked_ef__", targetAmount: 0, currentAmount: 250 });
  });
});

// BudgetArk - Emergency Fund Resolution tests
//
// Pins the linked-accounts-over-goal resolution that Bridge, Budget, Charts,
// net worth, achievements, and the spreadsheet export all share.

import {
  getEmergencyFundSource,
  resolveEmergencyFundAmount,
} from "../emergencyFund";
import type { AssetAccount, SavingsGoal } from "../../types";

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

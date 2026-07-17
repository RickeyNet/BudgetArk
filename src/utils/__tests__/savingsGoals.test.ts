// BudgetArk - Savings Goal Helpers tests
//
// Pins the emergency-fund contribution logic that Budget and Bridge share
// (formerly two drifting copies).

jest.mock("../uuid", () => ({ generateUUID: () => "gen-uuid" }));

// eslint-disable-next-line import/first -- import after the mock factory registers
import { applyEmergencyFundContribution } from "../savingsGoals";
// eslint-disable-next-line import/first
import type { SavingsGoal } from "../../types";

const NOW = "2026-07-16T12:00:00.000Z";

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

describe("applyEmergencyFundContribution", () => {
  it("adds to an existing emergency-fund goal and restamps updatedAt", () => {
    const result = applyEmergencyFundContribution([efGoal()], 100, 1000, NOW)!;
    expect(result).toHaveLength(1);
    expect(result[0].currentAmount).toBe(350);
    expect(result[0].updatedAt).toBe(NOW);
  });

  it("floors the balance at 0 on an over-withdrawal", () => {
    const result = applyEmergencyFundContribution([efGoal()], -500, 1000, NOW)!;
    expect(result[0].currentAmount).toBe(0);
  });

  it("creates the goal (with the keel target) when none exists", () => {
    const other: SavingsGoal = efGoal({ id: "g2", category: "travel" });
    const result = applyEmergencyFundContribution([other], 75, 1500, NOW)!;
    expect(result).toHaveLength(2);
    const created = result[1];
    expect(created).toMatchObject({
      id: "gen-uuid",
      category: "emergency_fund",
      targetAmount: 1500,
      currentAmount: 75,
      createdAt: NOW,
      updatedAt: NOW,
    });
  });

  it("does not mutate the input array or the existing goal", () => {
    const goals = [efGoal()];
    applyEmergencyFundContribution(goals, 100, 1000, NOW);
    expect(goals[0].currentAmount).toBe(250);
    expect(goals[0].updatedAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("returns null for zero or non-finite amounts", () => {
    expect(applyEmergencyFundContribution([efGoal()], 0, 1000, NOW)).toBeNull();
    expect(applyEmergencyFundContribution([efGoal()], NaN, 1000, NOW)).toBeNull();
    expect(applyEmergencyFundContribution([efGoal()], Infinity, 1000, NOW)).toBeNull();
  });
});

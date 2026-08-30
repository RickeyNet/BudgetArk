// BudgetArk - Savings Goal Helpers
//
// Pure logic for savings-goal mutations shared by the Budget and Bridge
// screens. The emergency-fund contribution used to be a ~40-line handler
// copy-pasted into both screens (and already drifting between them); the
// pure update lives here now, and each screen keeps only its own thin
// shell of state updates and refresh side effects.

import { SavingsGoal } from "../types";
import { generateUUID } from "./uuid";

/**
 * Applies a (positive or negative) contribution to the emergency-fund goal,
 * creating the goal if it doesn't exist yet so the contribution persists.
 * The balance floors at 0 - a correction can't drive the fund negative.
 *
 * Returns the new goals array, or null when `amount` is zero/non-finite
 * (nothing to apply; callers keep their state untouched).
 */
export const applyEmergencyFundContribution = (
  goals: SavingsGoal[],
  amount: number,
  keelTarget: number,
  nowIso: string = new Date().toISOString()
): SavingsGoal[] | null => {
  if (!Number.isFinite(amount) || amount === 0) return null;

  const existing = goals.find((goal) => goal.category === "emergency_fund");
  if (existing) {
    const updatedGoal: SavingsGoal = {
      ...existing,
      currentAmount: Math.max(0, existing.currentAmount + amount),
      updatedAt: nowIso,
    };
    return goals.map((goal) => (goal.id === existing.id ? updatedGoal : goal));
  }

  // Create a real savings goal so the contribution persists.
  return [
    ...goals,
    {
      id: generateUUID(),
      name: "Emergency Fund",
      category: "emergency_fund",
      targetAmount: keelTarget,
      currentAmount: Math.max(0, amount),
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];
};

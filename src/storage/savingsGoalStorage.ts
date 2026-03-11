import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SavingsGoal } from "../types";

const STORAGE_KEY = "@budgetark_savings_goals";

export const getSavingsGoals = async (): Promise<SavingsGoal[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as SavingsGoal[]) : [];
};

export const saveSavingsGoals = async (goals: SavingsGoal[]): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
};

export const addSavingsGoal = async (goal: SavingsGoal): Promise<SavingsGoal[]> => {
  const goals = await getSavingsGoals();
  const updated = [...goals, goal];
  await saveSavingsGoals(updated);
  return updated;
};

export const updateSavingsGoal = async (
  goalId: string,
  updates: Partial<SavingsGoal>
): Promise<SavingsGoal[]> => {
  const goals = await getSavingsGoals();
  const updated = goals.map((goal) =>
    goal.id === goalId
      ? {
          ...goal,
          ...updates,
          updatedAt: new Date().toISOString(),
        }
      : goal
  );
  await saveSavingsGoals(updated);
  return updated;
};

export const deleteSavingsGoal = async (goalId: string): Promise<SavingsGoal[]> => {
  const goals = await getSavingsGoals();
  const updated = goals.filter((goal) => goal.id !== goalId);
  await saveSavingsGoals(updated);
  return updated;
};

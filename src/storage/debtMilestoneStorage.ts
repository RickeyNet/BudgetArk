import * as EncryptedStorage from "./encryptedStorage";
import {
  DEFAULT_DEBT_MILESTONE_STEPS,
  DebtMilestoneKey,
  DebtMilestonePlan,
  DebtMilestoneStep,
} from "../types";

const DEBT_MILESTONE_PLAN_KEY = "@budgetark_debt_milestones" as const;

const createDefaultPlan = (): DebtMilestonePlan => ({
  currentStepKey: "keel",
  steps: DEFAULT_DEBT_MILESTONE_STEPS.map((step) => ({
    ...step,
    isCompleted: false,
  })),
  updatedAt: new Date().toISOString(),
});

const normalizePlan = (raw: DebtMilestonePlan): DebtMilestonePlan => {
  const steps = DEFAULT_DEBT_MILESTONE_STEPS.map((template) => {
    const found = raw.steps?.find((step) => step.key === template.key);
    return {
      ...template,
      targetAmount: found?.targetAmount ?? template.targetAmount,
      isCompleted: !!found?.isCompleted,
      completedAt: found?.completedAt,
    } satisfies DebtMilestoneStep;
  });

  const hasCurrent = steps.some((step) => step.key === raw.currentStepKey);
  return {
    currentStepKey: hasCurrent ? raw.currentStepKey : "keel",
    steps,
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
};

export const getDebtMilestonePlan = async (): Promise<DebtMilestonePlan> => {
  const raw = await EncryptedStorage.getItem(DEBT_MILESTONE_PLAN_KEY);
  if (!raw) {
    const plan = createDefaultPlan();
    await EncryptedStorage.setItem(DEBT_MILESTONE_PLAN_KEY, JSON.stringify(plan));
    return plan;
  }

  try {
    const parsed = JSON.parse(raw) as DebtMilestonePlan;
    const normalized = normalizePlan(parsed);
    if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
      await EncryptedStorage.setItem(DEBT_MILESTONE_PLAN_KEY, JSON.stringify(normalized));
    }
    return normalized;
  } catch {
    const fallback = createDefaultPlan();
    await EncryptedStorage.setItem(DEBT_MILESTONE_PLAN_KEY, JSON.stringify(fallback));
    return fallback;
  }
};

export const saveDebtMilestonePlan = async (
  plan: DebtMilestonePlan
): Promise<void> => {
  const next: DebtMilestonePlan = {
    ...plan,
    updatedAt: new Date().toISOString(),
  };
  await EncryptedStorage.setItem(DEBT_MILESTONE_PLAN_KEY, JSON.stringify(next));
};

export const updateDebtMilestoneStep = async (
  key: DebtMilestoneKey,
  updates: Partial<Pick<DebtMilestoneStep, "isCompleted" | "targetAmount">>
): Promise<DebtMilestonePlan> => {
  const plan = await getDebtMilestonePlan();
  const next: DebtMilestonePlan = {
    ...plan,
    steps: plan.steps.map((step) => {
      if (step.key !== key) return step;
      const nextCompleted =
        typeof updates.isCompleted === "boolean"
          ? updates.isCompleted
          : step.isCompleted;
      return {
        ...step,
        targetAmount:
          typeof updates.targetAmount === "number"
            ? updates.targetAmount
            : step.targetAmount,
        isCompleted: nextCompleted,
        completedAt: nextCompleted ? new Date().toISOString() : undefined,
      };
    }),
    updatedAt: new Date().toISOString(),
  };
  await saveDebtMilestonePlan(next);
  return next;
};

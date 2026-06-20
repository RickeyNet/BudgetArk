import * as EncryptedStorage from "./encryptedStorage";
import {
  DEFAULT_DEBT_MILESTONE_STEPS,
  DebtMilestoneKey,
  DebtMilestonePlan,
  DebtMilestoneStep,
} from "../types";
import { getOrCreateUser } from "./userStorage";
import { getCurrencyPreferenceOption } from "../utils/currencyPreferences";
import { localizeUsdTarget } from "../utils/currencyConversion";

const DEBT_MILESTONE_PLAN_KEY = "@budgetark_debt_milestones" as const;

/**
 * Seed a fresh plan, converting each step's canonical USD target anchor into
 * the user's selected currency so a non-USD user starts with a sensible local
 * goal (e.g. the keel emergency fund reads ~10,600 kr, not 1,200). This only
 * runs when no plan exists yet; existing stored plans keep their own targets
 * (see normalizePlan) so we never silently rewrite a user's saved figures.
 */
const createDefaultPlan = async (): Promise<DebtMilestonePlan> => {
  let currencyCode = "USD";
  try {
    const user = await getOrCreateUser();
    currencyCode = getCurrencyPreferenceOption(
      user.currencyPreferenceId
    ).currencyCode;
  } catch {
    // Fall back to USD anchors if the user/currency can't be read.
  }

  return {
    currentStepKey: "keel",
    steps: DEFAULT_DEBT_MILESTONE_STEPS.map((step) => ({
      ...step,
      targetAmount:
        typeof step.targetAmount === "number"
          ? localizeUsdTarget(step.targetAmount, currencyCode)
          : step.targetAmount,
      isCompleted: false,
    })),
    updatedAt: new Date().toISOString(),
  };
};

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
    const plan = await createDefaultPlan();
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
    const fallback = await createDefaultPlan();
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

/**
 * Sync-only setter that preserves the incoming peer's `updatedAt` instead of
 * stamping `now`. Used by `applyIncomingDiff` so a merged-in remote plan
 * doesn't get re-broadcast as a fresh edit on the next outbound diff -
 * which used to cause a small ping-pong on every paired sync.
 */
export const saveDebtMilestonePlanFromSync = async (
  plan: DebtMilestonePlan
): Promise<void> => {
  await EncryptedStorage.setItem(DEBT_MILESTONE_PLAN_KEY, JSON.stringify(plan));
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

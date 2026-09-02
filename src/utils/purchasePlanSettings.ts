/**
 * BudgetArk - Purchase Plan Settings
 * File: src/utils/purchasePlanSettings.ts
 *
 * The plan list's ranking method, allocation mode, and combined monthly
 * set-aside, as one device-local record (persisted by
 * storage/purchasePlanSettingsStorage). Pure parse/defaults live here so
 * the fail-closed rules are unit-testable on Node: an unknown method or
 * mode falls back to the default, a non-finite amount to "not set" (the
 * list then suggests one from the plans and cash flow).
 */

import type {
  PlanAllocationMode,
  PlanPriorityMethod,
} from "./purchasePlanner";
import { PLAN_ALLOCATION_MODES, PLAN_PRIORITY_METHODS } from "./purchasePlanner";

export type PurchasePlanSettings = {
  method: PlanPriorityMethod;
  allocation: PlanAllocationMode;
  /** Combined monthly set-aside across all plans; null = never set (suggest one). */
  combinedMonthly: number | null;
};

export const DEFAULT_PURCHASE_PLAN_SETTINGS: PurchasePlanSettings = {
  method: "snowball",
  allocation: "rollover",
  combinedMonthly: null,
};

/** Upper bound on a stored set-aside - anything larger is treated as corrupt. */
export const MAX_COMBINED_MONTHLY = 1_000_000;

const isMethod = (value: unknown): value is PlanPriorityMethod =>
  typeof value === "string" &&
  (PLAN_PRIORITY_METHODS as readonly string[]).includes(value);

const isMode = (value: unknown): value is PlanAllocationMode =>
  typeof value === "string" &&
  (PLAN_ALLOCATION_MODES as readonly string[]).includes(value);

/** Fail-closed per field: garbage in any field only resets that field. */
export const parsePurchasePlanSettings = (raw: string | null): PurchasePlanSettings => {
  if (!raw) return { ...DEFAULT_PURCHASE_PLAN_SETTINGS };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ...DEFAULT_PURCHASE_PLAN_SETTINGS };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ...DEFAULT_PURCHASE_PLAN_SETTINGS };
  }
  const record = parsed as Record<string, unknown>;
  const amount = record.combinedMonthly;
  return {
    method: isMethod(record.method) ? record.method : DEFAULT_PURCHASE_PLAN_SETTINGS.method,
    allocation: isMode(record.allocation)
      ? record.allocation
      : DEFAULT_PURCHASE_PLAN_SETTINGS.allocation,
    combinedMonthly:
      typeof amount === "number" &&
      Number.isFinite(amount) &&
      amount >= 0 &&
      amount <= MAX_COMBINED_MONTHLY
        ? amount
        : null,
  };
};

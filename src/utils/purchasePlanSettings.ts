/**
 * BudgetArk - Purchase Plan Settings
 * File: src/utils/purchasePlanSettings.ts
 *
 * The plan list's ranking method, allocation mode, and combined monthly
 * set-aside, plus the planner tool's cost-analysis inputs (hours per week,
 * a typed hourly take-home, the finance-vs-save APR and term), as one
 * device-local record (persisted by storage/purchasePlanSettingsStorage).
 * Pure parse/defaults live here so the fail-closed rules are
 * unit-testable on Node: an unknown method or mode falls back to the
 * default, a non-finite amount to "not set" (the UI then suggests one).
 * Two components write this record (the list and the planner card), so
 * the store merges patches rather than replacing the whole record.
 */

import type {
  PlanAllocationMode,
  PlanPriorityMethod,
} from "./purchasePlanner";
import {
  DEFAULT_HOURS_PER_WEEK,
  PLAN_ALLOCATION_MODES,
  PLAN_PRIORITY_METHODS,
} from "./purchasePlanner";

export type PurchasePlanSettings = {
  method: PlanPriorityMethod;
  allocation: PlanAllocationMode;
  /** Combined monthly set-aside across all plans; null = never set (suggest one). */
  combinedMonthly: number | null;
  /** Hours worked per week, for "hours of work". */
  hoursPerWeek: number;
  /** Take-home per hour typed by hand; null = derive from budget income. */
  hourlyOverride: number | null;
  /** APR for the finance-vs-save comparison; null = suggest from debts. */
  financeApr: number | null;
  /** Loan term for the comparison, in months. */
  financeTermMonths: number;
};

export const DEFAULT_PURCHASE_PLAN_SETTINGS: PurchasePlanSettings = {
  method: "snowball",
  allocation: "rollover",
  combinedMonthly: null,
  hoursPerWeek: DEFAULT_HOURS_PER_WEEK,
  hourlyOverride: null,
  financeApr: null,
  financeTermMonths: 24,
};

/** Upper bound on a stored set-aside - anything larger is treated as corrupt. */
export const MAX_COMBINED_MONTHLY = 1_000_000;
export const MAX_HOURS_PER_WEEK = 168;
export const MAX_HOURLY_RATE = 10_000;
export const MAX_FINANCE_APR = 100;
export const MAX_FINANCE_TERM_MONTHS = 360;

const finiteIn = (value: unknown, min: number, max: number): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;

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
  const defaults = DEFAULT_PURCHASE_PLAN_SETTINGS;
  return {
    method: isMethod(record.method) ? record.method : defaults.method,
    allocation: isMode(record.allocation) ? record.allocation : defaults.allocation,
    combinedMonthly: finiteIn(record.combinedMonthly, 0, MAX_COMBINED_MONTHLY)
      ? record.combinedMonthly
      : null,
    hoursPerWeek: finiteIn(record.hoursPerWeek, 1, MAX_HOURS_PER_WEEK)
      ? record.hoursPerWeek
      : defaults.hoursPerWeek,
    hourlyOverride: finiteIn(record.hourlyOverride, 0.01, MAX_HOURLY_RATE)
      ? record.hourlyOverride
      : null,
    financeApr: finiteIn(record.financeApr, 0, MAX_FINANCE_APR) ? record.financeApr : null,
    financeTermMonths:
      finiteIn(record.financeTermMonths, 1, MAX_FINANCE_TERM_MONTHS) &&
      Number.isInteger(record.financeTermMonths)
        ? record.financeTermMonths
        : defaults.financeTermMonths,
  };
};

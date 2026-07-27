/**
 * BudgetArk - Cash-Flow Projection Math
 * File: src/utils/cashFlow.ts
 *
 * Pure logic behind the Budget tab's month-start cash-flow feature: the
 * user records their real checking balance at the start of each month
 * (ground truth, self-correcting - deliberately chosen over a rollover
 * chain that re-derives every prior month), and the Budget screen projects
 *
 *   starting cash + income - expenses = projected end of month
 *
 * plus a "safe to spend" figure (this month's net) and a reconciliation
 * line comparing last month's projection against the balance the user
 * actually entered. The storage shell lives in
 * src/storage/monthlyBalanceStorage.ts; the UI in components/CashFlowCard
 * and components/MonthBalancePromptModal.
 */

import type { MonthStartBalance } from "../types";
import { isMonthKey, isMonthStartBalanceRecord } from "./recordValidators";

export type MonthStartBalanceMap = Record<string, MonthStartBalance>;

/** `2026-07` → `2026-06`, handling the January → December year rollover. */
export const previousMonthKey = (monthKey: string): string => {
  const year = Number(monthKey.slice(0, 4));
  const month = Number(monthKey.slice(5, 7));
  return month === 1
    ? `${year - 1}-12`
    : `${year}-${String(month - 1).padStart(2, "0")}`;
};

/**
 * Fail-closed parse of the stored/imported/synced balance map. Invalid
 * entries are dropped individually rather than rejecting the whole map -
 * one corrupt month must not take down the user's whole balance history.
 * Anything that isn't an object at the top level parses to empty.
 */
export const parseMonthStartBalances = (raw: unknown): MonthStartBalanceMap => {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
  const out: MonthStartBalanceMap = {};
  for (const [monthKey, record] of Object.entries(raw)) {
    if (!isMonthKey(monthKey)) continue;
    if (!isMonthStartBalanceRecord(record)) continue;
    out[monthKey] = {
      balance: record.balance as number,
      capturedAt: record.capturedAt as string,
      updatedAt: record.updatedAt as string,
    };
  }
  return out;
};

export type CashFlowProjection = {
  /** This month's income minus expenses - the "safe to spend" figure. */
  net: number;
  /** startingBalance + net: where checking lands if the month goes to plan. */
  projectedEnd: number;
};

export const computeCashFlow = (input: {
  startingBalance: number;
  income: number;
  expenses: number;
}): CashFlowProjection => {
  const net = input.income - input.expenses;
  return { net, projectedEnd: input.startingBalance + net };
};

export type Reconciliation = {
  /** What last month's projection said this month should have started at. */
  expected: number;
  /** actual - expected: positive means the user ended ABOVE plan. */
  delta: number;
};

/**
 * Compares last month's projected end-of-month against the balance the
 * user actually entered for this month. `previousNet` is last month's
 * income minus expenses computed by the caller with the same month math
 * the Budget screen displays (recurring entries + debt payment plan), so
 * projection and reconciliation can never disagree about what "plan" was.
 */
export const computeReconciliation = (input: {
  previousBalance: number;
  previousNet: number;
  actualBalance: number;
}): Reconciliation => {
  const expected = input.previousBalance + input.previousNet;
  return { expected, delta: input.actualBalance - expected };
};

/** Rounds to cents so projections never render float dust like 449.99999. */
export const roundCashAmount = (value: number): number =>
  Math.round(value * 100) / 100;

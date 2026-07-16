/**
 * BudgetArk - Paycheck Math
 * File: src/utils/paycheckMath.ts
 *
 * Pure helpers for the W-2 / 1099 income-type fields on budget entries:
 * the per-entry 1099 tax set-aside and the monthly rollups (401(k)
 * contributed, tax dollars to reserve) shown on the Budget summary card.
 * Kept side-effect free so the logic is unit-testable on Node.
 */

import { BudgetEntry } from "../types";

/** The subset of BudgetEntry the paycheck math reads. */
type PaycheckFields = Pick<
  BudgetEntry,
  "type" | "amount" | "incomeType" | "retirementContribution" | "taxSetAsideRate"
>;

const roundToCents = (value: number): number => Math.round(value * 100) / 100;

/**
 * Clamps a user/imported set-aside rate to the meaningful 0-100 range.
 * Non-finite input collapses to 0 so a corrupt rate can never produce a
 * NaN dollar figure on screen.
 */
export const clampTaxSetAsideRate = (rate: number): number => {
  if (!Number.isFinite(rate)) return 0;
  return Math.min(100, Math.max(0, rate));
};

/**
 * Dollars of this entry to set aside for end-of-year taxes. Non-zero only
 * for 1099 income entries with a positive amount and rate.
 */
export const taxSetAsideForEntry = (entry: PaycheckFields): number => {
  if (entry.type !== "income" || entry.incomeType !== "1099") return 0;
  if (!Number.isFinite(entry.amount) || entry.amount <= 0) return 0;
  const rate = clampTaxSetAsideRate(entry.taxSetAsideRate ?? 0);
  return roundToCents((entry.amount * rate) / 100);
};

/**
 * 401(k) dollars withheld from this entry's paycheck. Non-zero only for
 * W-2 income entries with a positive contribution recorded.
 */
export const retirementContributionForEntry = (entry: PaycheckFields): number => {
  if (entry.type !== "income" || entry.incomeType !== "w2") return 0;
  const contribution = entry.retirementContribution;
  if (!Number.isFinite(contribution as number) || (contribution as number) <= 0) {
    return 0;
  }
  return roundToCents(contribution as number);
};

export interface PaycheckSummary {
  /** Total 401(k) dollars withheld across the W-2 entries. */
  retirementContribution: number;
  /** Total dollars to set aside for taxes across the 1099 entries. */
  taxSetAside: number;
  /** Gross 1099 income the set-aside was computed from. */
  income1099: number;
}

/**
 * Rolls up the paycheck extras for a set of entries (callers pass the
 * already-month-filtered list, so recurring expansion is theirs to handle).
 */
export const summarizePaychecks = (
  entries: readonly PaycheckFields[]
): PaycheckSummary => {
  let retirementContribution = 0;
  let taxSetAside = 0;
  let income1099 = 0;
  for (const entry of entries) {
    retirementContribution += retirementContributionForEntry(entry);
    const setAside = taxSetAsideForEntry(entry);
    taxSetAside += setAside;
    if (entry.type === "income" && entry.incomeType === "1099" && entry.amount > 0) {
      income1099 += entry.amount;
    }
  }
  return {
    retirementContribution: roundToCents(retirementContribution),
    taxSetAside: roundToCents(taxSetAside),
    income1099: roundToCents(income1099),
  };
};

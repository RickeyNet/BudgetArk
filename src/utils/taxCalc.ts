/**
 * BudgetArk - Take-Home Pay Math
 * File: src/utils/taxCalc.ts
 *
 * Pure functions behind the Charts-tab income tax calculator: marginal
 * bracket math, FICA (Social Security + Medicare + Additional Medicare),
 * state tax with the documented v1 approximations (see stateTaxData2026),
 * and the take-home orchestrator. No storage, no network - node-testable.
 *
 * Withholding model:
 *  - Traditional 401(k) reduces income tax bases but NOT FICA wages.
 *  - HSA + health premiums (Section 125 cafeteria plan) reduce BOTH the
 *    income tax bases and FICA wages - the common employer setup.
 * Everything is an estimate - credits, itemized deductions, and local
 * taxes are out of scope by design (the UI says so).
 */

import {
  FEDERAL_BRACKETS_2026,
  FEDERAL_STANDARD_DEDUCTION_2026,
  FICA_2026,
  type FilingStatus,
  type TaxBracket,
} from "../data/taxData2026";
import { findStateTax, type StateTaxConfig } from "../data/stateTaxData2026";

/** Mirrors importData/recordValidators MAX_MONEY - inputs clamp, never throw. */
const MAX_INCOME = 1_000_000_000;

const clampMoney = (value: number): number =>
  Number.isFinite(value) ? Math.min(Math.max(value, 0), MAX_INCOME) : 0;

const round2 = (value: number): number => Math.round(value * 100) / 100;

/** Marginal tax over a sorted bracket table (first entry must be over: 0). */
export const calcBracketTax = (taxable: number, brackets: TaxBracket[]): number => {
  const base = clampMoney(taxable);
  if (base <= 0 || brackets.length === 0) return 0;
  let tax = 0;
  for (let i = 0; i < brackets.length; i++) {
    const from = brackets[i].over;
    if (base <= from) break;
    const to = i + 1 < brackets.length ? brackets[i + 1].over : Infinity;
    tax += (Math.min(base, to) - from) * brackets[i].rate;
  }
  return round2(tax);
};

/**
 * The rate the NEXT dollar of taxable income is taxed at. Zero taxable
 * income returns 0, not the bottom bracket: a salary under the standard
 * deduction has taxable income clamped to 0, and the earner's next dollar
 * is still swallowed by the deduction - showing "10% marginal" would be
 * wrong.
 */
export const marginalRateFor = (taxable: number, brackets: TaxBracket[]): number => {
  const base = clampMoney(taxable);
  if (base <= 0) return 0;
  let rate = 0;
  for (const bracket of brackets) {
    if (base >= bracket.over) rate = bracket.rate;
  }
  return rate;
};

export const calcFederalTax = (taxable: number, status: FilingStatus): number =>
  calcBracketTax(taxable, FEDERAL_BRACKETS_2026[status]);

export interface FicaBreakdown {
  socialSecurity: number;
  medicare: number;
  additionalMedicare: number;
  total: number;
}

/** Employee-side FICA on cafeteria-plan-reduced wages. */
export const calcFICA = (ficaWages: number, status: FilingStatus): FicaBreakdown => {
  const wages = clampMoney(ficaWages);
  const socialSecurity = round2(
    Math.min(wages, FICA_2026.socialSecurityWageBase) * FICA_2026.socialSecurityRate
  );
  const medicare = round2(wages * FICA_2026.medicareRate);
  const threshold = FICA_2026.additionalMedicareThreshold[status];
  const additionalMedicare = round2(
    Math.max(0, wages - threshold) * FICA_2026.additionalMedicareRate
  );
  return {
    socialSecurity,
    medicare,
    additionalMedicare,
    total: round2(socialSecurity + medicare + additionalMedicare),
  };
};

/**
 * State income tax estimate. Approximations (documented in the data file):
 * married-joint doubles the single-filer bracket thresholds and uses the
 * joint deduction; married-separate and head-of-household reuse the single
 * table.
 */
export const calcStateTax = (
  income: number,
  state: StateTaxConfig | undefined,
  status: FilingStatus
): number => {
  if (!state || state.type === "none") return 0;
  const joint = status === "marriedJoint";
  const deduction = state.standardDeduction
    ? joint
      ? state.standardDeduction.marriedJoint
      : state.standardDeduction.single
    : 0;
  const taxable = Math.max(0, clampMoney(income) - deduction);
  let tax = 0;
  if (state.type === "flat") {
    tax = taxable * (state.rate ?? 0);
  } else if (state.brackets) {
    const brackets = joint
      ? state.brackets.map((b) => ({ rate: b.rate, over: b.over * 2 }))
      : state.brackets;
    tax = calcBracketTax(taxable, brackets);
  }
  const credit = state.taxCredit
    ? joint
      ? state.taxCredit.marriedJoint
      : state.taxCredit.single
    : 0;
  return round2(Math.max(0, tax - credit));
};

export const PAY_FREQUENCY_OPTIONS = [
  { value: 52, label: "Weekly" },
  { value: 26, label: "Biweekly" },
  { value: 24, label: "Semimonthly" },
  { value: 12, label: "Monthly" },
] as const;

export interface TakeHomeInput {
  grossAnnual: number;
  status: FilingStatus;
  stateCode: string;
  /** Percent of gross into a traditional 401(k), 0-100. */
  retirement401kPercent: number;
  /** Annual HSA contribution through payroll. */
  hsaAnnual: number;
  /** Monthly employee health premium (pre-tax). */
  healthPremiumMonthly: number;
  payPeriodsPerYear: number;
}

export interface TakeHomeResult {
  grossAnnual: number;
  pretax401k: number;
  pretaxCafeteria: number;
  federalTaxable: number;
  federalTax: number;
  stateTax: number;
  fica: FicaBreakdown;
  totalTax: number;
  takeHomeAnnual: number;
  takeHomePerPeriod: number;
  /** totalTax / gross, 0-1. */
  effectiveRate: number;
  /** Federal marginal bracket rate, 0-1. */
  marginalFederalRate: number;
}

export const calcTakeHome = (input: TakeHomeInput): TakeHomeResult => {
  const gross = clampMoney(input.grossAnnual);
  const pct = Number.isFinite(input.retirement401kPercent)
    ? Math.min(Math.max(input.retirement401kPercent, 0), 100)
    : 0;

  const pretax401k = round2(Math.min(gross, gross * (pct / 100)));
  // Cafeteria-plan deductions can't exceed what's left after the 401(k).
  const pretaxCafeteria = round2(
    Math.min(
      Math.max(0, gross - pretax401k),
      clampMoney(input.hsaAnnual) + clampMoney(input.healthPremiumMonthly) * 12
    )
  );

  const ficaWages = Math.max(0, gross - pretaxCafeteria);
  const incomeBase = Math.max(0, gross - pretax401k - pretaxCafeteria);

  const federalTaxable = Math.max(
    0,
    incomeBase - FEDERAL_STANDARD_DEDUCTION_2026[input.status]
  );
  const federalTax = calcFederalTax(federalTaxable, input.status);
  const stateTax = calcStateTax(incomeBase, findStateTax(input.stateCode), input.status);
  const fica = calcFICA(ficaWages, input.status);

  const totalTax = round2(federalTax + stateTax + fica.total);
  const takeHomeAnnual = round2(
    Math.max(0, gross - pretax401k - pretaxCafeteria - totalTax)
  );
  const periods =
    Number.isFinite(input.payPeriodsPerYear) && input.payPeriodsPerYear >= 1
      ? input.payPeriodsPerYear
      : 12;

  return {
    grossAnnual: gross,
    pretax401k,
    pretaxCafeteria,
    federalTaxable,
    federalTax,
    stateTax,
    fica,
    totalTax,
    takeHomeAnnual,
    takeHomePerPeriod: round2(takeHomeAnnual / periods),
    effectiveRate: gross > 0 ? totalTax / gross : 0,
    marginalFederalRate: marginalRateFor(
      federalTaxable,
      FEDERAL_BRACKETS_2026[input.status]
    ),
  };
};

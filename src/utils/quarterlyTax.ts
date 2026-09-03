/**
 * BudgetArk - Quarterly Estimated Tax
 * File: src/utils/quarterlyTax.ts
 *
 * Pure math behind the Charts-tab "Quarterly Taxes" tool for 1099 income:
 * per IRS quarter, the 1099 income logged, the dollars the per-entry
 * set-aside rate already reserved (paycheckMath), and an estimated payment
 * due. The estimate follows the IRS annualized-income installment shape:
 * year-to-date 1099 income through the quarter's end is annualized with
 * the Schedule AI factors (4, 2.4, 1.5, 1), the year's tax on that
 * (self-employment tax + federal income tax on the SE-adjusted, standard-
 * deducted base, from the bundled 2026 tables) is taken, and the quarter
 * owes its cumulative share (22.5 / 45 / 67.5 / 90 %) minus what earlier
 * quarters were already assessed. Federal only - no state, no credits, no
 * W-2 withholding offset - and the card says so. Due dates are bundled
 * constants (no network); a "paid" mark per quarter is device-local
 * (storage/quarterlyTaxPaidStorage).
 */

import type { BudgetEntry } from "../types";
import {
  FEDERAL_STANDARD_DEDUCTION_2026,
  FICA_2026,
  type FilingStatus,
} from "../data/taxData2026";
import { calcFederalTax } from "./taxCalc";
import { taxSetAsideForEntry } from "./paycheckMath";
import { entriesForMonth } from "./billFulfillment";
import { roundToCents } from "./money";

export type QuarterIndex = 1 | 2 | 3 | 4;

export type TaxQuarterDef = {
  index: QuarterIndex;
  label: string;
  /** Calendar months (1-12) whose income falls in this quarter. */
  months: number[];
  monthsLabel: string;
  /** Payment due date: month (1-12) and day; `nextYear` for the January one. */
  due: { month: number; day: number; nextYear: boolean };
  /** Schedule AI annualization factor for income through the quarter's end. */
  annualizationFactor: number;
  /** Share of the annualized year's tax that must be paid in by this due date. */
  cumulativeShare: number;
};

/** IRS estimated-tax quarters (uneven by design: Q2 is two months, Q3 three, Q4 four). */
export const TAX_QUARTERS: readonly TaxQuarterDef[] = [
  { index: 1, label: "Q1", months: [1, 2, 3], monthsLabel: "Jan–Mar", due: { month: 4, day: 15, nextYear: false }, annualizationFactor: 4, cumulativeShare: 0.225 },
  { index: 2, label: "Q2", months: [4, 5], monthsLabel: "Apr–May", due: { month: 6, day: 15, nextYear: false }, annualizationFactor: 2.4, cumulativeShare: 0.45 },
  { index: 3, label: "Q3", months: [6, 7, 8], monthsLabel: "Jun–Aug", due: { month: 9, day: 15, nextYear: false }, annualizationFactor: 1.5, cumulativeShare: 0.675 },
  { index: 4, label: "Q4", months: [9, 10, 11, 12], monthsLabel: "Sep–Dec", due: { month: 1, day: 15, nextYear: true }, annualizationFactor: 1, cumulativeShare: 0.9 },
];

/** Net earnings from self-employment are 92.35% of net profit. */
export const SE_NET_EARNINGS_FACTOR = 0.9235;

/** Days before the due date at which a quarter reads as "due soon". */
export const DUE_SOON_DAYS = 30;

export const quarterKey = (year: number, index: QuarterIndex): string => `${year}-Q${index}`;

/** Local due date for a quarter of `year`. */
export const quarterDueDate = (year: number, quarter: TaxQuarterDef): Date =>
  new Date(year + (quarter.due.nextYear ? 1 : 0), quarter.due.month - 1, quarter.due.day);

export interface SelfEmploymentTax {
  socialSecurity: number;
  medicare: number;
  total: number;
  /** Half of the SE tax - deductible from income before the income-tax base. */
  deductibleHalf: number;
}

/**
 * Self-employment tax on a year's net 1099 profit. Both halves of Social
 * Security (12.4% up to the wage base) and Medicare (2.9%), plus the
 * Additional Medicare 0.9% above the filing-status threshold. Any W-2
 * wages that would use up part of the wage base are not considered.
 */
export const calcSelfEmploymentTax = (netProfit: number, status: FilingStatus): SelfEmploymentTax => {
  const base = Math.max(0, Number.isFinite(netProfit) ? netProfit : 0) * SE_NET_EARNINGS_FACTOR;
  const socialSecurity = Math.min(base, FICA_2026.socialSecurityWageBase) * FICA_2026.socialSecurityRate * 2;
  const threshold = FICA_2026.additionalMedicareThreshold[status];
  const medicare =
    base * FICA_2026.medicareRate * 2 +
    Math.max(0, base - threshold) * FICA_2026.additionalMedicareRate;
  const total = roundToCents(socialSecurity + medicare);
  return {
    socialSecurity: roundToCents(socialSecurity),
    medicare: roundToCents(medicare),
    total,
    deductibleHalf: roundToCents(total / 2),
  };
};

export interface AnnualTaxEstimate {
  selfEmployment: SelfEmploymentTax;
  federalIncomeTax: number;
  total: number;
}

/** Federal tax for a year with `annualIncome` of 1099 income and nothing else. */
export const estimateAnnualTaxOn1099 = (annualIncome: number, status: FilingStatus): AnnualTaxEstimate => {
  const selfEmployment = calcSelfEmploymentTax(annualIncome, status);
  const taxable = Math.max(
    0,
    annualIncome - selfEmployment.deductibleHalf - FEDERAL_STANDARD_DEDUCTION_2026[status]
  );
  const federalIncomeTax = calcFederalTax(taxable, status);
  return {
    selfEmployment,
    federalIncomeTax,
    total: roundToCents(selfEmployment.total + federalIncomeTax),
  };
};

export type QuarterPaidRecord = {
  paidAt: string;
  /** What the user says they paid; optional. */
  amount?: number;
};

export type QuarterStatus = "none" | "paid" | "overdue" | "due-soon" | "upcoming";

export interface QuarterRow {
  key: string;
  quarter: TaxQuarterDef;
  dueDate: Date;
  /** 1099 income logged in the quarter's months. */
  income1099: number;
  /** Dollars the per-entry set-aside rate reserved in the quarter. */
  setAside: number;
  /** Year-to-date 1099 income through the quarter's end. */
  cumulativeIncome: number;
  annualizedIncome: number;
  /** Estimated payment for this quarter. */
  estimatedDue: number;
  paid: QuarterPaidRecord | null;
  status: QuarterStatus;
}

export interface QuarterlyTaxYear {
  year: number;
  rows: QuarterRow[];
  totalIncome: number;
  totalSetAside: number;
  totalEstimatedDue: number;
  /** Set-aside minus estimated due across the year (negative = under-reserved). */
  reserveGap: number;
  hasIncome: boolean;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const daysUntil = (from: Date, to: Date): number =>
  Math.round(
    (new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime() -
      new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime()) /
      MS_PER_DAY
  );

/**
 * The year's four quarters. Recurring 1099 income counts in every month it
 * is active (entriesForMonth - the Budget screen's month rule). `paid`
 * is keyed by quarterKey.
 */
export const buildQuarterlyTaxYear = (input: {
  entries: readonly BudgetEntry[];
  year: number;
  status: FilingStatus;
  paid: Readonly<Record<string, QuarterPaidRecord>>;
  now?: Date;
}): QuarterlyTaxYear => {
  const now = input.now ?? new Date();
  const rows: QuarterRow[] = [];
  let cumulativeIncome = 0;
  let assessedSoFar = 0;

  for (const quarter of TAX_QUARTERS) {
    let income1099 = 0;
    let setAside = 0;
    for (const month of quarter.months) {
      const monthKey = `${input.year}-${String(month).padStart(2, "0")}`;
      for (const entry of entriesForMonth(input.entries, monthKey)) {
        if (entry.type !== "income" || entry.incomeType !== "1099") continue;
        if (!Number.isFinite(entry.amount) || entry.amount <= 0) continue;
        income1099 += entry.amount;
        setAside += taxSetAsideForEntry(entry);
      }
    }
    cumulativeIncome += income1099;
    const annualizedIncome = roundToCents(cumulativeIncome * quarter.annualizationFactor);
    const requiredCumulative = estimateAnnualTaxOn1099(annualizedIncome, input.status).total * quarter.cumulativeShare;
    const estimatedDue = roundToCents(Math.max(0, requiredCumulative - assessedSoFar));
    assessedSoFar += estimatedDue;

    const key = quarterKey(input.year, quarter.index);
    const paid = input.paid[key] ?? null;
    const dueDate = quarterDueDate(input.year, quarter);
    let status: QuarterStatus;
    if (paid) status = "paid";
    else if (estimatedDue <= 0 && income1099 <= 0) status = "none";
    else {
      const days = daysUntil(now, dueDate);
      status = days < 0 ? "overdue" : days <= DUE_SOON_DAYS ? "due-soon" : "upcoming";
    }

    rows.push({
      key,
      quarter,
      dueDate,
      income1099: roundToCents(income1099),
      setAside: roundToCents(setAside),
      cumulativeIncome: roundToCents(cumulativeIncome),
      annualizedIncome,
      estimatedDue,
      paid,
      status,
    });
  }

  const totalIncome = roundToCents(rows.reduce((sum, r) => sum + r.income1099, 0));
  const totalSetAside = roundToCents(rows.reduce((sum, r) => sum + r.setAside, 0));
  const totalEstimatedDue = roundToCents(rows.reduce((sum, r) => sum + r.estimatedDue, 0));
  return {
    year: input.year,
    rows,
    totalIncome,
    totalSetAside,
    totalEstimatedDue,
    reserveGap: roundToCents(totalSetAside - totalEstimatedDue),
    hasIncome: totalIncome > 0,
  };
};

/** Fail-closed parse of the stored paid map. */
export const parseQuarterPaidMap = (raw: string | null): Record<string, QuarterPaidRecord> => {
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
  const out: Record<string, QuarterPaidRecord> = {};
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (!/^\d{4}-Q[1-4]$/.test(key)) continue;
    if (typeof value !== "object" || value === null) continue;
    const record = value as Record<string, unknown>;
    if (typeof record.paidAt !== "string" || Number.isNaN(Date.parse(record.paidAt))) continue;
    const amount =
      typeof record.amount === "number" && Number.isFinite(record.amount) && record.amount >= 0
        ? record.amount
        : undefined;
    out[key] = amount === undefined ? { paidAt: record.paidAt } : { paidAt: record.paidAt, amount };
  }
  return out;
};

/** The tax year whose quarters are "current": January still belongs to last year's Q4 window. */
export const defaultTaxYear = (now: Date = new Date()): number =>
  now.getMonth() === 0 && now.getDate() <= 15 ? now.getFullYear() - 1 : now.getFullYear();

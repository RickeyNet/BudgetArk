/**
 * BudgetArk - Annual Financial Report aggregator
 * File: src/utils/annualReport.ts
 *
 * Pure, on-device aggregation of a single calendar year's financial picture:
 * debt paid, money set aside, net-worth change, top spending category, and
 * months that stayed under budget. Every figure is derived from data the app
 * already stores — no new write paths, nothing leaves the device.
 *
 * The share text intentionally contains only aggregates and percentages
 * (no debt names, descriptions, or account labels) so a screenshot/text
 * share carries no PII, matching the TODO requirement.
 */

import {
  BudgetCategory,
  BudgetEntry,
  CategoryBudgetLimit,
  NetWorthSnapshot,
  Payment,
} from "../types";

/**
 * Categories that represent money moved *into* savings rather than spending.
 * Mirrors `RESERVE_CATEGORIES` in `utils/netWorth.ts` so "contributed" here
 * lines up with what the net-worth math counts as an asset inflow.
 */
export const RESERVE_CATEGORIES: ReadonlySet<BudgetCategory> = new Set<BudgetCategory>([
  "Savings",
  "Retirement",
  "Investing",
]);

export interface AnnualCategorySpend {
  category: BudgetCategory;
  amount: number;
}

export interface AnnualNetWorth {
  start: number | null;
  end: number | null;
  change: number | null;
  /** YYYY-MM-DD of the baseline snapshot, or null when unavailable. */
  startDayKey: string | null;
  /** YYYY-MM-DD of the latest in-year snapshot, or null. */
  endDayKey: string | null;
}

export interface AnnualReportData {
  year: number;
  hasData: boolean;
  totalIncome: number;
  totalExpenses: number;
  /** income − expenses for the year. */
  netSaved: number;
  /** Sum of reserve-category expense entries (Savings/Retirement/Investing). */
  totalContributed: number;
  /** Sum of all debt payments dated in the year. */
  debtPaid: number;
  paymentCount: number;
  netWorth: AnnualNetWorth;
  /** Top spending categories (excludes reserve categories), highest first. */
  topCategories: AnnualCategorySpend[];
  biggestCategory: AnnualCategorySpend | null;
  monthsUnderBudget: number;
  /** Months in the year that had any saved category limits to check against. */
  monthsWithLimits: number;
  /** 12 entries, Jan→Dec, for a sparkline. */
  monthlySpending: { label: string; value: number }[];
  /** netSaved / totalIncome × 100, or null when there was no income. */
  savingsRate: number | null;
}

/* ─── Month-key helpers ─── */

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** YYYY-MM for a given year + 0-based month index. */
const monthKeyFor = (year: number, monthIndex: number): string =>
  `${year}-${String(monthIndex + 1).padStart(2, "0")}`;

/** YYYY-MM of an ISO date string (uses local time, like the rest of the app). */
const monthKeyOfDate = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const yearOfDate = (iso: string): number => new Date(iso).getFullYear();

/* ─── Per-month aggregation (year-scoped, recurring-aware) ─── */

interface MonthAgg {
  income: number;
  expenses: number;
  byCategory: Record<string, number>;
}

/**
 * A recurring entry repeats every month from its start month onward — same
 * rule `budgetInsights`/`BudgetScreen` use. A one-off counts only in its own
 * month. Both are evaluated against an explicit `monthKey` so we can build a
 * report for any past calendar year, not just a trailing window.
 */
const entryAppliesToMonth = (entry: BudgetEntry, monthKey: string): boolean => {
  const entryMonth = monthKeyOfDate(entry.date);
  return entry.recurring ? entryMonth <= monthKey : entryMonth === monthKey;
};

const buildMonthAggregates = (
  entries: BudgetEntry[],
  year: number
): Record<string, MonthAgg> => {
  const aggs: Record<string, MonthAgg> = {};
  for (let m = 0; m < 12; m++) {
    aggs[monthKeyFor(year, m)] = { income: 0, expenses: 0, byCategory: {} };
  }

  for (const entry of entries) {
    if (!Number.isFinite(entry.amount) || entry.amount <= 0) continue;
    for (let m = 0; m < 12; m++) {
      const key = monthKeyFor(year, m);
      if (!entryAppliesToMonth(entry, key)) continue;
      const agg = aggs[key];
      if (entry.type === "income") {
        agg.income += entry.amount;
      } else {
        agg.expenses += entry.amount;
        agg.byCategory[entry.category] =
          (agg.byCategory[entry.category] ?? 0) + entry.amount;
      }
    }
  }

  return aggs;
};

/* ─── Net worth change over the year ─── */

const buildNetWorthForYear = (
  snapshots: NetWorthSnapshot[],
  year: number
): AnnualNetWorth => {
  const empty: AnnualNetWorth = {
    start: null,
    end: null,
    change: null,
    startDayKey: null,
    endDayKey: null,
  };
  if (snapshots.length === 0) return empty;

  // Storage already returns these sorted by dayKey ascending.
  const yearPrefix = `${year}-`;
  const inYear = snapshots.filter((s) => s.dayKey.startsWith(yearPrefix));
  if (inYear.length === 0) return empty;

  // Prefer the last snapshot from before the year as the baseline so the
  // change reflects the full year's movement, not just the gap between the
  // first and last in-year captures.
  const priorBaseline = [...snapshots]
    .filter((s) => s.dayKey < `${year}-01-01`)
    .pop();

  const startSnap = priorBaseline ?? inYear[0];
  const endSnap = inYear[inYear.length - 1];

  return {
    start: startSnap.netWorth,
    end: endSnap.netWorth,
    change: endSnap.netWorth - startSnap.netWorth,
    startDayKey: startSnap.dayKey,
    endDayKey: endSnap.dayKey,
  };
};

/* ─── Public API ─── */

export interface AnnualReportInputs {
  entries: BudgetEntry[];
  payments: Payment[];
  snapshots: NetWorthSnapshot[];
  limitsByMonth: Record<string, CategoryBudgetLimit[]>;
}

/**
 * Calendar years that have *any* data (budget entries, payments, or net-worth
 * snapshots), most recent first. The current year is always included so the
 * picker is never empty on a fresh install.
 */
export const listReportYears = (inputs: {
  entries: BudgetEntry[];
  payments: Payment[];
  snapshots: NetWorthSnapshot[];
}): number[] => {
  const years = new Set<number>();
  years.add(new Date().getFullYear());

  for (const e of inputs.entries) {
    const y = yearOfDate(e.date);
    if (Number.isFinite(y)) years.add(y);
  }
  for (const p of inputs.payments) {
    const y = yearOfDate(p.date);
    if (Number.isFinite(y)) years.add(y);
  }
  for (const s of inputs.snapshots) {
    const y = parseInt(s.dayKey.slice(0, 4), 10);
    if (Number.isFinite(y)) years.add(y);
  }

  return [...years].sort((a, b) => b - a);
};

export const buildAnnualReport = (
  year: number,
  { entries, payments, snapshots, limitsByMonth }: AnnualReportInputs
): AnnualReportData => {
  const monthAggs = buildMonthAggregates(entries, year);

  let totalIncome = 0;
  let totalExpenses = 0;
  let totalContributed = 0;
  const categoryTotals: Partial<Record<BudgetCategory, number>> = {};
  const monthlySpending: { label: string; value: number }[] = [];

  for (let m = 0; m < 12; m++) {
    const agg = monthAggs[monthKeyFor(year, m)];
    totalIncome += agg.income;
    totalExpenses += agg.expenses;
    monthlySpending.push({ label: MONTH_LABELS[m], value: agg.expenses });

    for (const [cat, amount] of Object.entries(agg.byCategory) as [
      BudgetCategory,
      number,
    ][]) {
      if (RESERVE_CATEGORIES.has(cat)) {
        totalContributed += amount;
      } else {
        categoryTotals[cat] = (categoryTotals[cat] ?? 0) + amount;
      }
    }
  }

  const topCategories: AnnualCategorySpend[] = (
    Object.entries(categoryTotals) as [BudgetCategory, number][]
  )
    .map(([category, amount]) => ({ category, amount }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  // Debt paid: payments dated within the calendar year.
  let debtPaid = 0;
  let paymentCount = 0;
  for (const p of payments) {
    if (!Number.isFinite(p.amount) || p.amount <= 0) continue;
    if (yearOfDate(p.date) !== year) continue;
    debtPaid += p.amount;
    paymentCount += 1;
  }

  // Months under budget: only months that actually have saved limits count
  // toward the denominator. Limit history retains a full trailing year (13
  // months), so the current calendar year is fully checkable; years older
  // than that have aged-out limits — we report "X / Y" against the months
  // we can still verify.
  let monthsUnderBudget = 0;
  let monthsWithLimits = 0;
  for (let m = 0; m < 12; m++) {
    const key = monthKeyFor(year, m);
    const limits = limitsByMonth[key];
    if (!limits || limits.length === 0) continue;
    monthsWithLimits += 1;
    const byCategory = monthAggs[key].byCategory;
    const allUnder = limits.every(
      (lim) => (byCategory[lim.category] ?? 0) <= lim.monthlyLimit
    );
    if (allUnder) monthsUnderBudget += 1;
  }

  const netWorth = buildNetWorthForYear(snapshots, year);
  const netSaved = totalIncome - totalExpenses;
  const savingsRate =
    totalIncome > 0 ? (netSaved / totalIncome) * 100 : null;

  const hasData =
    totalIncome > 0 ||
    totalExpenses > 0 ||
    totalContributed > 0 ||
    debtPaid > 0 ||
    netWorth.change != null;

  return {
    year,
    hasData,
    totalIncome,
    totalExpenses,
    netSaved,
    totalContributed,
    debtPaid,
    paymentCount,
    netWorth,
    topCategories: topCategories.slice(0, 5),
    biggestCategory: topCategories[0] ?? null,
    monthsUnderBudget,
    monthsWithLimits,
    monthlySpending,
    savingsRate,
  };
};

/**
 * Builds the shareable summary. Aggregates and percentages only — no debt
 * names, entry descriptions, or account labels — so sharing leaks no PII.
 */
export const formatAnnualReportShareText = (
  data: AnnualReportData,
  formatCurrency: (n: number) => string
): string => {
  const lines: string[] = [];
  lines.push(`⚓ My ${data.year} BudgetArk Report`);
  lines.push("");
  lines.push(`💳 Debt paid: ${formatCurrency(data.debtPaid)}`);
  lines.push(`🐖 Set aside: ${formatCurrency(data.totalContributed)}`);

  if (data.netWorth.change != null) {
    const change = data.netWorth.change;
    const sign = change > 0 ? "+" : change < 0 ? "−" : "";
    lines.push(`📈 Net worth: ${sign}${formatCurrency(Math.abs(change))}`);
  }

  if (data.savingsRate != null) {
    lines.push(`💰 Savings rate: ${Math.round(data.savingsRate)}%`);
  }

  if (data.monthsWithLimits > 0) {
    lines.push(
      `🎯 Months under budget: ${data.monthsUnderBudget}/${data.monthsWithLimits}`
    );
  }

  if (data.biggestCategory) {
    lines.push(`🏷️ Top category: ${data.biggestCategory.category}`);
  }

  lines.push("");
  lines.push("Tracked offline with BudgetArk.");
  return lines.join("\n");
};

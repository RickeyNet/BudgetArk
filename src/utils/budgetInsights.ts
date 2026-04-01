import { BudgetCategory, BudgetEntry, CategoryBudgetLimit } from "../types";

/* ─── Month-key helpers (same logic as BudgetScreen) ─── */

const getMonthKey = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
};

const getMonthKeyOffset = (
  offset: number,
  fromDate: Date = new Date()
): string => {
  const cursor = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
  cursor.setMonth(cursor.getMonth() + offset);
  return getMonthKey(cursor);
};

const isDateInMonthKey = (dateISO: string, monthKey: string): boolean =>
  getMonthKey(new Date(dateISO)) === monthKey;

const isRecurringInMonth = (dateISO: string, monthKey: string): boolean =>
  getMonthKey(new Date(dateISO)) <= monthKey;

/* ─── Types ─── */

export interface MonthSummary {
  monthKey: string;
  totalIncome: number;
  totalExpenses: number;
  net: number;
  byCategory: Partial<Record<BudgetCategory, number>>;
}

export interface CategoryChange {
  category: BudgetCategory;
  current: number;
  previous: number;
  delta: number;
  percentChange: number | null; // null when previous is 0
}

export interface Streak {
  label: string;
  count: number;
  type: "positive" | "warning";
}

export interface MonthlyReviewData {
  summaries: MonthSummary[];
  categoryChanges: CategoryChange[];
  streaks: Streak[];
  avgMonthlySpending: number;
  currentMonthSpending: number;
  spendingVsAvgPercent: number | null;
}

/* ─── Core computation ─── */

const getEntriesForMonth = (
  entries: BudgetEntry[],
  monthKey: string
): BudgetEntry[] =>
  entries.filter((entry) =>
    entry.recurring
      ? isRecurringInMonth(entry.date, monthKey)
      : isDateInMonthKey(entry.date, monthKey)
  );

const buildMonthSummary = (
  entries: BudgetEntry[],
  monthKey: string
): MonthSummary => {
  const monthly = getEntriesForMonth(entries, monthKey);
  const byCategory: Partial<Record<BudgetCategory, number>> = {};
  let totalIncome = 0;
  let totalExpenses = 0;

  for (const entry of monthly) {
    if (entry.type === "income") {
      totalIncome += entry.amount;
    } else {
      totalExpenses += entry.amount;
      byCategory[entry.category] =
        (byCategory[entry.category] ?? 0) + entry.amount;
    }
  }

  return {
    monthKey,
    totalIncome,
    totalExpenses,
    net: totalIncome - totalExpenses,
    byCategory,
  };
};

/**
 * Build summaries for the last `months` months (most recent last).
 */
export const buildMonthSummaries = (
  entries: BudgetEntry[],
  months: number = 6
): MonthSummary[] => {
  const summaries: MonthSummary[] = [];
  // oldest first → newest last
  for (let i = months - 1; i >= 0; i--) {
    const key = getMonthKeyOffset(-i);
    summaries.push(buildMonthSummary(entries, key));
  }
  return summaries;
};

/* ─── Category changes (current vs previous month) ─── */

export const computeCategoryChanges = (
  summaries: MonthSummary[]
): CategoryChange[] => {
  if (summaries.length < 2) return [];

  const current = summaries[summaries.length - 1];
  const previous = summaries[summaries.length - 2];

  const allCategories = new Set<BudgetCategory>();
  for (const cat of Object.keys(current.byCategory) as BudgetCategory[]) {
    allCategories.add(cat);
  }
  for (const cat of Object.keys(previous.byCategory) as BudgetCategory[]) {
    allCategories.add(cat);
  }

  const changes: CategoryChange[] = [];
  for (const category of allCategories) {
    const cur = current.byCategory[category] ?? 0;
    const prev = previous.byCategory[category] ?? 0;
    if (cur === 0 && prev === 0) continue;

    changes.push({
      category,
      current: cur,
      previous: prev,
      delta: cur - prev,
      percentChange: prev > 0 ? ((cur - prev) / prev) * 100 : null,
    });
  }

  // Sort by absolute delta descending (biggest changes first)
  changes.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  return changes;
};

/* ─── Streaks ─── */

export const computeStreaks = (
  summaries: MonthSummary[],
  limitsByMonth: Record<string, CategoryBudgetLimit[]>
): Streak[] => {
  const streaks: Streak[] = [];

  // 1. Consecutive months with positive net (income > expenses)
  let positiveNetCount = 0;
  for (let i = summaries.length - 1; i >= 0; i--) {
    if (summaries[i].totalIncome > 0 && summaries[i].net >= 0) {
      positiveNetCount++;
    } else {
      break;
    }
  }
  if (positiveNetCount >= 2) {
    streaks.push({
      label: "Positive net income",
      count: positiveNetCount,
      type: "positive",
    });
  }

  // 2. Consecutive months under total budget limits
  let underBudgetCount = 0;
  for (let i = summaries.length - 1; i >= 0; i--) {
    const summary = summaries[i];
    const limits = limitsByMonth[summary.monthKey];
    if (!limits || limits.length === 0) break;

    let allUnder = true;
    for (const limit of limits) {
      const spent = summary.byCategory[limit.category] ?? 0;
      if (spent > limit.monthlyLimit) {
        allUnder = false;
        break;
      }
    }
    if (allUnder) {
      underBudgetCount++;
    } else {
      break;
    }
  }
  if (underBudgetCount >= 2) {
    streaks.push({
      label: "All categories under budget",
      count: underBudgetCount,
      type: "positive",
    });
  }

  // 3. Consecutive months expenses decreased
  let decreasingCount = 0;
  for (let i = summaries.length - 1; i >= 1; i--) {
    if (
      summaries[i].totalExpenses > 0 &&
      summaries[i].totalExpenses < summaries[i - 1].totalExpenses
    ) {
      decreasingCount++;
    } else {
      break;
    }
  }
  if (decreasingCount >= 2) {
    streaks.push({
      label: "Spending decreasing",
      count: decreasingCount,
      type: "positive",
    });
  }

  // 4. Consecutive months expenses increased (warning)
  let increasingCount = 0;
  for (let i = summaries.length - 1; i >= 1; i--) {
    if (
      summaries[i].totalExpenses > 0 &&
      summaries[i].totalExpenses > summaries[i - 1].totalExpenses
    ) {
      increasingCount++;
    } else {
      break;
    }
  }
  if (increasingCount >= 2) {
    streaks.push({
      label: "Spending increasing",
      count: increasingCount,
      type: "warning",
    });
  }

  return streaks;
};

/* ─── Full review builder ─── */

export const buildMonthlyReview = (
  entries: BudgetEntry[],
  limitsByMonth: Record<string, CategoryBudgetLimit[]>,
  months: number = 6
): MonthlyReviewData => {
  const summaries = buildMonthSummaries(entries, months);
  const categoryChanges = computeCategoryChanges(summaries);
  const streaks = computeStreaks(summaries, limitsByMonth);

  // Past months only (exclude current month for average)
  const pastSummaries = summaries.slice(0, -1).filter((s) => s.totalExpenses > 0);
  const avgMonthlySpending =
    pastSummaries.length > 0
      ? pastSummaries.reduce((sum, s) => sum + s.totalExpenses, 0) /
        pastSummaries.length
      : 0;

  const currentMonthSpending =
    summaries[summaries.length - 1]?.totalExpenses ?? 0;

  const spendingVsAvgPercent =
    avgMonthlySpending > 0
      ? ((currentMonthSpending - avgMonthlySpending) / avgMonthlySpending) * 100
      : null;

  return {
    summaries,
    categoryChanges,
    streaks,
    avgMonthlySpending,
    currentMonthSpending,
    spendingVsAvgPercent,
  };
};

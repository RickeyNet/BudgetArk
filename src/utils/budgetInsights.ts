import { BudgetCategory, BudgetEntry, CategoryBudgetLimit, Person } from "../types";
import { isEntryActiveInMonth } from "./recurrence";
import { getMonthKeyOffset } from "./budgetMonths";


/* ─── Types ─── */

export interface MonthSummary {
  monthKey: string;
  totalIncome: number;
  totalExpenses: number;
  net: number;
  byCategory: Record<string, number>;
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

export interface CategorySpendingComparison {
  category: BudgetCategory;
  current: number;
  average: number;
  delta: number;
  percentChange: number | null;
  monthsAveraged: number;
}

export interface PersonCategorySpend {
  category: string;
  total: number;
}

export interface PersonMonthSpending {
  personId: string;
  name: string;
  /** True when the entry references a person id that no longer exists. */
  deleted: boolean;
  total: number;
  entryCount: number;
  /** Sorted by total descending. */
  byCategory: PersonCategorySpend[];
}

export interface MonthlyReviewData {
  summaries: MonthSummary[];
  categoryChanges: CategoryChange[];
  categoryComparisons: CategorySpendingComparison[];
  streaks: Streak[];
  avgMonthlySpending: number;
  currentMonthSpending: number;
  spendingVsAvgPercent: number | null;
  /** Current-month expenses grouped by assigned person; sorted by total descending. */
  personSpending: PersonMonthSpending[];
}

/* ─── Core computation ─── */

const getEntriesForMonth = (
  entries: BudgetEntry[],
  monthKey: string
): BudgetEntry[] =>
  entries.filter((entry) => isEntryActiveInMonth(entry, monthKey));

const buildMonthSummary = (
  entries: BudgetEntry[],
  monthKey: string
): MonthSummary => {
  const monthly = getEntriesForMonth(entries, monthKey);
  const byCategory: Record<string, number> = {};
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

/* ─── Category comparisons (current vs 3-month avg) ─── */

const MIN_SIGNIFICANT_CATEGORY_SPEND = 20;
const MIN_SIGNIFICANT_CATEGORY_DELTA = 10;
const MAX_PERCENT_SCORE = 160;
const MAX_DELTA_SCORE = 250;

const getCategoryComparisonRankScore = (
  comparison: CategorySpendingComparison
): number => {
  const { current, average, delta, percentChange } = comparison;
  const absDelta = Math.abs(delta);
  const materialSpend = Math.max(current, average);
  const isIncrease = delta > 0;
  const isNewCategory = average === 0 && current > 0;
  const isStoppedCategory = current === 0 && average > 0;

  if (
    materialSpend < MIN_SIGNIFICANT_CATEGORY_SPEND &&
    absDelta < MIN_SIGNIFICANT_CATEGORY_DELTA
  ) {
    return -1000;
  }

  const cappedPercent = Math.min(
    Math.abs(percentChange ?? (isNewCategory || isStoppedCategory ? 100 : 0)),
    MAX_PERCENT_SCORE
  );
  const cappedDelta = Math.min(absDelta, MAX_DELTA_SCORE);

  let score = cappedPercent * 0.45 + cappedDelta * 0.35;

  if (materialSpend >= 100) score += 18;
  else if (materialSpend >= 50) score += 10;
  else if (materialSpend >= MIN_SIGNIFICANT_CATEGORY_SPEND) score += 4;

  if (absDelta >= 100) score += 16;
  else if (absDelta >= 50) score += 9;
  else if (absDelta >= MIN_SIGNIFICANT_CATEGORY_DELTA) score += 4;

  if (isIncrease) score += 12;
  else if (delta < 0) score += 2;

  if (isNewCategory || isStoppedCategory) {
    score -= materialSpend >= 75 ? 10 : 24;
  }

  return score;
};

export const computeCategorySpendingComparisons = (
  summaries: MonthSummary[],
  months: number = 3
): CategorySpendingComparison[] => {
  if (summaries.length < 2) return [];

  const current = summaries[summaries.length - 1];
  const priorMonths = summaries
    .slice(Math.max(0, summaries.length - (months + 1)), -1)
    .filter((summary) => summary.totalIncome > 0 || summary.totalExpenses > 0);

  if (priorMonths.length === 0) return [];

  const categories = new Set<BudgetCategory>();
  (Object.keys(current.byCategory) as BudgetCategory[]).forEach((category) => {
    categories.add(category);
  });
  priorMonths.forEach((summary) => {
    (Object.keys(summary.byCategory) as BudgetCategory[]).forEach((category) => {
      categories.add(category);
    });
  });

  const comparisons: CategorySpendingComparison[] = [];

  categories.forEach((category) => {
    const currentAmount = current.byCategory[category] ?? 0;
    const average =
      priorMonths.reduce(
        (sum, summary) => sum + (summary.byCategory[category] ?? 0),
        0
      ) / priorMonths.length;

    if (currentAmount === 0 && average === 0) return;

    const delta = currentAmount - average;
    comparisons.push({
      category,
      current: currentAmount,
      average,
      delta,
      percentChange: average > 0 ? (delta / average) * 100 : null,
      monthsAveraged: priorMonths.length,
    });
  });

  comparisons.sort((a, b) => {
    const aScore = getCategoryComparisonRankScore(a);
    const bScore = getCategoryComparisonRankScore(b);
    if (bScore !== aScore) return bScore - aScore;
    if (Math.abs(b.delta) !== Math.abs(a.delta)) {
      return Math.abs(b.delta) - Math.abs(a.delta);
    }
    const aPercent = Math.abs(a.percentChange ?? 0);
    const bPercent = Math.abs(b.percentChange ?? 0);
    return bPercent - aPercent;
  });

  return comparisons;
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

/* ─── Per-person spending (who spent what this month) ─── */

const UNKNOWN_PERSON_NAME = "(deleted person)";

/**
 * Groups one month's person-assigned expenses per person, with a
 * per-category breakdown. Entries assigned to an id missing from `people`
 * (deleted, or not yet synced) still report under a placeholder name so
 * their spend never silently vanishes from the review.
 */
export const computePersonMonthSpending = (
  entries: BudgetEntry[],
  people: readonly Person[],
  monthKey: string
): PersonMonthSpending[] => {
  const personById = new Map(people.map((p) => [p.id, p]));
  const groups = new Map<
    string,
    { spending: PersonMonthSpending; catTotals: Map<string, number> }
  >();

  for (const entry of entries) {
    if (entry.type !== "expense" || !entry.personId) continue;
    if (!isEntryActiveInMonth(entry, monthKey)) continue;

    let group = groups.get(entry.personId);
    if (!group) {
      const person = personById.get(entry.personId);
      group = {
        spending: {
          personId: entry.personId,
          name: person?.name ?? UNKNOWN_PERSON_NAME,
          deleted: !person || !!person.deletedAt,
          total: 0,
          entryCount: 0,
          byCategory: [],
        },
        catTotals: new Map(),
      };
      groups.set(entry.personId, group);
    }

    group.spending.total += entry.amount;
    group.spending.entryCount += 1;
    group.catTotals.set(
      entry.category,
      (group.catTotals.get(entry.category) ?? 0) + entry.amount
    );
  }

  const result: PersonMonthSpending[] = [];
  for (const { spending, catTotals } of groups.values()) {
    spending.byCategory = Array.from(catTotals, ([category, total]) => ({
      category,
      total,
    })).sort((a, b) => b.total - a.total);
    result.push(spending);
  }
  result.sort((a, b) => b.total - a.total);
  return result;
};

/* ─── Full review builder ─── */

export const buildMonthlyReview = (
  entries: BudgetEntry[],
  limitsByMonth: Record<string, CategoryBudgetLimit[]>,
  months: number = 6,
  people: readonly Person[] = []
): MonthlyReviewData => {
  const summaries = buildMonthSummaries(entries, months);
  const categoryChanges = computeCategoryChanges(summaries);
  const categoryComparisons = computeCategorySpendingComparisons(summaries);
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

  const currentMonthKey =
    summaries[summaries.length - 1]?.monthKey ?? getMonthKeyOffset(0);
  const personSpending = computePersonMonthSpending(
    entries,
    people,
    currentMonthKey
  );

  const spendingVsAvgPercent =
    avgMonthlySpending > 0
      ? ((currentMonthSpending - avgMonthlySpending) / avgMonthlySpending) * 100
      : null;

  return {
    summaries,
    categoryChanges,
    categoryComparisons,
    streaks,
    avgMonthlySpending,
    currentMonthSpending,
    spendingVsAvgPercent,
    personSpending,
  };
};

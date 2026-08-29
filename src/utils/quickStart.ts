/**
 * BudgetArk - Quick Start
 * File: src/utils/quickStart.ts
 *
 * Turns an onboarding template (data/quickStartTemplates) plus the two
 * numbers the user may have typed - monthly take-home pay and the housing
 * payment - into what gets written: category limits for the current month
 * and up to two recurring entries. Without an income figure there is
 * nothing to size limits from, so only the housing line (if given) is
 * seeded. Pure and unit-tested; OnboardingScreen assigns ids and persists.
 */

import type { BudgetCategory, CategoryBudgetLimit, NewBudgetEntryInput } from "../types";
import type { QuickStartTemplate } from "../data/quickStartTemplates";
import { buildEntryDateISO } from "./entryDate";

export interface QuickStartInputs {
  /** YYYY-MM the seed lands in (the install month). */
  monthKey: string;
  /** ISO timestamp stamped on the limits (LWW). */
  now: string;
  income: number | null;
  housing: number | null;
}

export interface QuickStartSeed {
  entries: NewBudgetEntryInput[];
  limits: CategoryBudgetLimit[];
}

/** Lenient money parse for the onboarding inputs: "$2,400" -> 2400; junk/zero -> null. */
export const parseQuickStartAmount = (text: string): number | null => {
  const n = parseFloat(text.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
};

/** Limits are rounded to a tidy 5 so a $3,137 paycheck doesn't yield $313.70 limits. */
const roundTo5 = (n: number): number => Math.max(5, Math.round(n / 5) * 5);

export const buildQuickStartSeed = (
  template: QuickStartTemplate,
  { monthKey, now, income, housing }: QuickStartInputs
): QuickStartSeed => {
  const entries: NewBudgetEntryInput[] = [];
  const firstOfMonth = buildEntryDateISO(monthKey, 1);

  if (income) {
    entries.push({
      type: "income",
      category: "Salary",
      amount: income,
      description: "Take-home pay",
      date: firstOfMonth,
      recurring: true,
      recurrenceInterval: 1,
    });
  }
  if (housing) {
    entries.push({
      type: "expense",
      category: "Housing",
      amount: housing,
      description: "Rent / mortgage",
      date: firstOfMonth,
      recurring: true,
      recurrenceInterval: 1,
    });
  }

  const limits: CategoryBudgetLimit[] = [];
  if (income) {
    for (const [category, percent] of Object.entries(template.allocations) as [
      BudgetCategory,
      number,
    ][]) {
      if (!(percent > 0)) continue;
      // The real housing payment beats the template's share of income.
      const amount =
        category === "Housing" && housing ? housing : roundTo5((income * percent) / 100);
      limits.push({ category, monthlyLimit: amount, updatedAt: now });
    }
    if (template.zeroBased) {
      // Every dollar assigned: the rounding remainder (either sign) lands in
      // Savings so the limits total take-home pay exactly.
      const total = limits.reduce((sum, l) => sum + l.monthlyLimit, 0);
      const remainder = Math.round((income - total) * 100) / 100;
      const savings = limits.find((l) => l.category === "Savings");
      if (savings && savings.monthlyLimit + remainder > 0) {
        savings.monthlyLimit = Math.round((savings.monthlyLimit + remainder) * 100) / 100;
      }
    }
  }

  return { entries, limits };
};

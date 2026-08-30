/**
 * BudgetArk - Quick-Start Templates
 * File: src/data/quickStartTemplates.ts
 *
 * The four starting points offered during onboarding. A template is a set
 * of category allocations as a share of monthly take-home pay: applied
 * (utils/quickStart) it becomes category limits for the current month,
 * plus a recurring income line and a recurring housing line when the user
 * gave those two numbers. Limits are what make the Budget tab show
 * category rows before any spending exists, so a new install lands on a
 * budget that already looks like one. Every number stays editable - the
 * templates are a first draft, never a lock. No custom categories are
 * created; the built-in list already covers each template.
 */

import type { BudgetCategory } from "../types";

export type QuickStartTemplateId = "single" | "couple" | "debt-heavy" | "zero-based";

export interface QuickStartTemplate {
  id: QuickStartTemplateId;
  emoji: string;
  title: string;
  tagline: string;
  /** One or two sentences on the onboarding card. */
  description: string;
  /** Percent of take-home pay per category. Need not total 100. */
  allocations: Partial<Record<BudgetCategory, number>>;
  /** Every dollar assigned: rounding remainder is pushed into Savings so limits total take-home exactly. */
  zeroBased: boolean;
  /** The name step nudges toward "Finish + Build Your Ark". */
  suggestsArkSetup: boolean;
}

export const QUICK_START_TEMPLATES: readonly QuickStartTemplate[] = [
  {
    id: "single",
    emoji: "🧑",
    title: "Single",
    tagline: "One income, balanced 50/30/20",
    description:
      "Needs around half, wants under a third, and a fifth toward savings and retirement. The everyday default.",
    allocations: {
      Housing: 30,
      Grocery: 10,
      Restaurant: 6,
      Transportation: 10,
      Utilities: 5,
      Healthcare: 3,
      Fitness: 2,
      Entertainment: 5,
      Shopping: 5,
      Savings: 15,
      Retirement: 6,
      Other: 3,
    },
    zeroBased: false,
    suggestsArkSetup: false,
  },
  {
    id: "couple",
    emoji: "🧑‍🤝‍🧑",
    title: "Couple / household",
    tagline: "Shared costs, a travel line, room for two",
    description:
      "Groceries and insurance sized for two, a travel budget, and savings split between a cushion and retirement. Pair phones later to share it.",
    allocations: {
      Housing: 28,
      Grocery: 12,
      Restaurant: 5,
      Transportation: 10,
      Utilities: 6,
      Insurance: 4,
      Healthcare: 4,
      Entertainment: 4,
      Shopping: 5,
      Travel: 4,
      Savings: 12,
      Retirement: 6,
    },
    zeroBased: false,
    suggestsArkSetup: false,
  },
  {
    id: "debt-heavy",
    emoji: "⛓️",
    title: "Paying down debt",
    tagline: "Lean wants, a quarter of pay free for payoff",
    description:
      "Wants trimmed hard so about 27% of take-home is left for debt payments, which the Debts tab plans for you. Pairs with Build Your Ark.",
    allocations: {
      Housing: 30,
      Grocery: 10,
      Restaurant: 2,
      Transportation: 8,
      Utilities: 5,
      Insurance: 4,
      Healthcare: 3,
      Entertainment: 2,
      Shopping: 2,
      Savings: 5,
      Other: 2,
    },
    zeroBased: false,
    suggestsArkSetup: true,
  },
  {
    id: "zero-based",
    emoji: "🎯",
    title: "Zero-based",
    tagline: "Every dollar gets a job",
    description:
      "Limits across every category add up to exactly your take-home pay, giving included. Nothing is left unassigned.",
    allocations: {
      Housing: 30,
      Grocery: 10,
      Restaurant: 4,
      Transportation: 10,
      Utilities: 5,
      Insurance: 4,
      Healthcare: 4,
      Fitness: 2,
      Entertainment: 4,
      Shopping: 4,
      Giving: 3,
      Savings: 10,
      Retirement: 7,
      Other: 3,
    },
    zeroBased: true,
    suggestsArkSetup: false,
  },
];

export const quickStartTemplateById = (
  id: QuickStartTemplateId | null | undefined
): QuickStartTemplate | null =>
  id ? (QUICK_START_TEMPLATES.find((t) => t.id === id) ?? null) : null;

/**
 * BudgetArk - English strings: bundled data (templates)
 * File: src/i18n/locales/en/dataTemplates.ts
 *
 * Covers: quickStartTemplates.ts onboarding templates, keyed by the exact
 * template id. Allocations and category names are data, not text, and stay
 * in the data file. Resolved lazily from src/data via src/i18n/translate.ts.
 */

import type { QuickStartTemplateId } from "../../../data/quickStartTemplates";

type TemplateCopy = { title: string; tagline: string; description: string };

export const dataTemplates = {
  single: {
    title: "Single",
    tagline: "One income, balanced 50/30/20",
    description:
      "Needs around half, wants under a third, and a fifth toward savings and retirement. The everyday default.",
  },
  couple: {
    title: "Couple / household",
    tagline: "Shared costs, a travel line, room for two",
    description:
      "Groceries and insurance sized for two, a travel budget, and savings split between a cushion and retirement. Pair phones later to share it.",
  },
  "debt-heavy": {
    title: "Paying down debt",
    tagline: "Lean wants, a quarter of pay free for payoff",
    description:
      "Wants trimmed hard so about 27% of take-home is left for debt payments, which the Debts tab plans for you. Pairs with Build Your Ark.",
  },
  "zero-based": {
    title: "Zero-based",
    tagline: "Every dollar gets a job",
    description:
      "Limits across every category add up to exactly your take-home pay, giving included. Nothing is left unassigned.",
  },
} as const satisfies Record<QuickStartTemplateId, TemplateCopy>;

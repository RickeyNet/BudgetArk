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
 *
 * Title / tagline / description live in src/i18n/locales/{en,de}/dataTemplates.ts
 * keyed by template id and are resolved lazily through getters (see
 * src/i18n/translate.ts) so the cards read in the active language.
 */

import type { BudgetCategory } from "../types";
import { t } from "../i18n/translate";

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
    get title() {
      return t("data.templates.single.title");
    },
    get tagline() {
      return t("data.templates.single.tagline");
    },
    get description() {
      return t("data.templates.single.description");
    },
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
    get title() {
      return t("data.templates.couple.title");
    },
    get tagline() {
      return t("data.templates.couple.tagline");
    },
    get description() {
      return t("data.templates.couple.description");
    },
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
    get title() {
      return t("data.templates.debt-heavy.title");
    },
    get tagline() {
      return t("data.templates.debt-heavy.tagline");
    },
    get description() {
      return t("data.templates.debt-heavy.description");
    },
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
    get title() {
      return t("data.templates.zero-based.title");
    },
    get tagline() {
      return t("data.templates.zero-based.tagline");
    },
    get description() {
      return t("data.templates.zero-based.description");
    },
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
  id ? (QUICK_START_TEMPLATES.find((template) => template.id === id) ?? null) : null;

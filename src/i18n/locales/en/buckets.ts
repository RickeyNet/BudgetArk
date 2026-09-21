/**
 * BudgetArk - English strings: 50/30/20 bucket labels
 * File: src/i18n/locales/en/buckets.ts
 *
 * Keyed by the `BudgetBucket` id. Shared by the Budget tab's bucket card,
 * the reassign-bucket sheet, the category pickers and Manage Categories -
 * one table so "Needs" never drifts between surfaces.
 */

import type { BudgetBucket } from "../../../types";

export const buckets = {
  needs: "Needs",
  wants: "Wants",
  savings: "Savings",
} as const satisfies Record<BudgetBucket, string>;

/**
 * BudgetArk - Rule Nudges
 * File: src/services/connections/ruleNudges.ts
 *
 * Why: the "always do this" checkbox is easy to miss, so people file the
 * same coffee shop by hand month after month. Once a merchant has been
 * approved into the same category a few times with no rule on file, the
 * Review Inbox offers to make it a rule in one tap. Pure - the modal hands
 * in the live entries and rules it already has.
 */

import type {
  BudgetEntry,
  BudgetEntryType,
  CategoryName,
  MerchantRule,
  PendingTransaction,
} from "../../types";
import { matchMerchantRule } from "./merchant";

/** Hand approvals of one merchant into one category before we nudge. */
export const RULE_NUDGE_MIN_APPROVALS = 3;

export interface RuleNudge {
  merchant: string;
  category: CategoryName;
  type: BudgetEntryType;
  /** How many approved entries back the suggestion. */
  count: number;
}

/**
 * The rule to offer for `item`, or null. Counts live bank-approved entries
 * (`source: "bank"`, not deleted) whose merchant key equals the item's and
 * whose type matches; the most-used category wins, ties go to the first
 * seen. Silent when a rule already covers the merchant (exact or prefix -
 * the same matcher the ingest uses), when the merchant is blank, or when
 * the best category has fewer than RULE_NUDGE_MIN_APPROVALS approvals.
 */
export const suggestRuleFromHistory = (
  item: Pick<PendingTransaction, "merchant" | "suggestedType">,
  entries: readonly BudgetEntry[],
  rules: readonly MerchantRule[],
): RuleNudge | null => {
  if (!item.merchant) return null;
  if (matchMerchantRule(item.merchant, [...rules])) return null;

  const counts = new Map<CategoryName, number>();
  for (const entry of entries) {
    if (entry.deletedAt) continue;
    if (entry.source !== "bank" || entry.merchant !== item.merchant) continue;
    if (entry.type !== item.suggestedType) continue;
    counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);
  }

  let best: { category: CategoryName; count: number } | null = null;
  for (const [category, count] of counts) {
    if (!best || count > best.count) best = { category, count };
  }
  if (!best || best.count < RULE_NUDGE_MIN_APPROVALS) return null;
  return {
    merchant: item.merchant,
    category: best.category,
    type: item.suggestedType,
    count: best.count,
  };
};

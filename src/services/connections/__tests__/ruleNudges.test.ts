/**
 * BudgetArk - Rule Nudge Tests
 * File: src/services/connections/__tests__/ruleNudges.test.ts
 *
 * The Review Inbox's "you've done this before" suggestion: counts only
 * bank-approved, live, same-type entries for the merchant; needs the
 * threshold; stays silent once any rule (exact or prefix) covers it.
 */

import {
  makeBudgetEntry,
  makeMerchantRule,
  makePendingTransaction,
} from "../../../__tests__/fixtures";
import { RULE_NUDGE_MIN_APPROVALS, suggestRuleFromHistory } from "../ruleNudges";

const approved = (n: number, category = "Grocery", over = {}) =>
  Array.from({ length: n }, (_, i) =>
    makeBudgetEntry({
      id: `e${category}${i}`,
      source: "bank",
      merchant: "COSTCO WHSE",
      category,
      ...over,
    }),
  );

describe("suggestRuleFromHistory", () => {
  const item = makePendingTransaction({ merchant: "COSTCO WHSE" });

  it("offers the most-used category once the threshold is met", () => {
    const entries = [...approved(RULE_NUDGE_MIN_APPROVALS), ...approved(1, "Shopping")];
    expect(suggestRuleFromHistory(item, entries, [])).toEqual({
      merchant: "COSTCO WHSE",
      category: "Grocery",
      type: "expense",
      count: RULE_NUDGE_MIN_APPROVALS,
    });
  });

  it("is null below the threshold, even when the total across categories clears it", () => {
    const entries = [
      ...approved(RULE_NUDGE_MIN_APPROVALS - 1),
      ...approved(RULE_NUDGE_MIN_APPROVALS - 1, "Shopping"),
    ];
    expect(suggestRuleFromHistory(item, entries, [])).toBeNull();
  });

  it("ignores manual, deleted, other-merchant and other-type entries", () => {
    const entries = [
      ...approved(RULE_NUDGE_MIN_APPROVALS - 1),
      makeBudgetEntry({ id: "manual", merchant: "COSTCO WHSE", category: "Grocery" }),
      makeBudgetEntry({
        id: "gone",
        source: "bank",
        merchant: "COSTCO WHSE",
        category: "Grocery",
        deletedAt: "2026-06-01T00:00:00.000Z",
      }),
      makeBudgetEntry({ id: "other", source: "bank", merchant: "TARGET", category: "Grocery" }),
      makeBudgetEntry({
        id: "refund",
        source: "bank",
        merchant: "COSTCO WHSE",
        category: "Grocery",
        type: "income",
      }),
    ];
    expect(suggestRuleFromHistory(item, entries, [])).toBeNull();
  });

  it("stays silent when a rule already covers the merchant, exactly or by prefix", () => {
    const entries = approved(RULE_NUDGE_MIN_APPROVALS);
    expect(
      suggestRuleFromHistory(item, entries, [makeMerchantRule({ merchantKey: "COSTCO WHSE" })]),
    ).toBeNull();
    expect(
      suggestRuleFromHistory(item, entries, [makeMerchantRule({ merchantKey: "COSTCO WHSE #12" })]),
    ).toBeNull();
    expect(
      suggestRuleFromHistory(item, entries, [makeMerchantRule({ merchantKey: "coffee shop" })]),
    ).not.toBeNull();
  });

  it("is null for an item with no merchant key", () => {
    expect(
      suggestRuleFromHistory(
        makePendingTransaction({ merchant: "" }),
        approved(RULE_NUDGE_MIN_APPROVALS),
        [],
      ),
    ).toBeNull();
  });
});

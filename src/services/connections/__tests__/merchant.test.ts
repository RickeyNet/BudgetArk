import {
  normalizeMerchant,
  matchMerchantRule,
  replanInboxForRules,
} from "../merchant";
import type { MerchantRule, PendingTransaction } from "../../../types";

const rule = (merchantKey: string, category: string): MerchantRule => ({
  id: merchantKey,
  merchantKey,
  category,
  type: "expense",
  useCount: 0,
  createdAt: "2026-06-01",
  updatedAt: "2026-06-01",
});

const item = (
  id: string,
  merchant: string,
  suggestedCategory?: string,
): PendingTransaction => ({
  id,
  connectionId: "conn-1",
  externalAccountId: "acct-1",
  providerTxId: id,
  pending: false,
  postedAt: "2026-07-01",
  amount: -12.5,
  description: merchant,
  merchant,
  suggestedType: "expense",
  suggestedCategory,
  fetchedAt: "2026-07-01",
  updatedAt: "2026-07-01",
});

describe("normalizeMerchant", () => {
  it("uppercases and collapses whitespace", () => {
    expect(normalizeMerchant("  blue   bottle coffee ")).toBe(
      "BLUE BOTTLE COFFEE",
    );
  });

  it("drops store numbers, dates, and long reference ids", () => {
    expect(normalizeMerchant("COSTCO WHSE #1234 06/28")).toBe("COSTCO WHSE");
    expect(normalizeMerchant("AMZN Mktp US*RT4Y12ABC123")).toBe("AMZN MKTP US");
    expect(normalizeMerchant("SHELL 57442889001")).toBe("SHELL");
  });

  it("strips separator punctuation and control characters", () => {
    expect(normalizeMerchant("SQ *BLUE BOTTLE")).toBe("SQ BLUE BOTTLE");
    expect(normalizeMerchant("BAD\x00CHAR")).toBe("BADCHAR");
  });

  it("caps at 40 characters and handles no-identity descriptions", () => {
    expect(normalizeMerchant("A".repeat(60)).length).toBeLessThanOrEqual(40);
    expect(normalizeMerchant("#12345 06/28")).toBe("");
    expect(normalizeMerchant("")).toBe("");
  });
});

describe("matchMerchantRule", () => {
  const rules = [
    rule("COSTCO WHSE", "Grocery"),
    rule("COSTCO WHSE GAS", "Transportation"),
    rule("SHELL", "Transportation"),
  ];

  it("prefers an exact match over a prefix match", () => {
    expect(matchMerchantRule("COSTCO WHSE", rules)?.category).toBe("Grocery");
    expect(matchMerchantRule("COSTCO WHSE GAS", rules)?.category).toBe(
      "Transportation",
    );
  });

  it("falls back to the longest prefix relationship", () => {
    // Merchant extends a stored key
    expect(matchMerchantRule("COSTCO WHSE GAS STATION", rules)?.category).toBe(
      "Transportation",
    );
  });

  it("requires a minimum length before prefix matching", () => {
    // "SHELL" is 5 chars (< 6) so it can only match exactly.
    expect(matchMerchantRule("SHELL", rules)?.category).toBe("Transportation");
    expect(matchMerchantRule("SHELL OIL", rules)).toBeUndefined();
    expect(matchMerchantRule("SQ", [rule("SQUARE PAYMENTS", "Other")])).toBeUndefined();
  });

  it("returns undefined for an empty merchant or no rules", () => {
    expect(matchMerchantRule("", rules)).toBeUndefined();
    expect(matchMerchantRule("NOWHERE", [])).toBeUndefined();
  });
});

describe("replanInboxForRules", () => {
  const NOW = "2026-07-27T12:00:00.000Z";

  it("rewrites suggestions when a rule's category changed", () => {
    const items = [item("a", "COSTCO WHSE", "Grocery")];
    const plan = replanInboxForRules(items, [rule("COSTCO WHSE", "Shopping")], NOW);
    expect(plan.dismissIds).toEqual([]);
    expect(plan.updatedItems).toHaveLength(1);
    expect(plan.updatedItems[0].suggestedCategory).toBe("Shopping");
    expect(plan.updatedItems[0].updatedAt).toBe(NOW);
  });

  it("leaves already-correct items untouched", () => {
    const items = [item("a", "COSTCO WHSE", "Grocery")];
    const plan = replanInboxForRules(items, [rule("COSTCO WHSE", "Grocery")], NOW);
    expect(plan.updatedItems).toEqual([]);
    expect(plan.dismissIds).toEqual([]);
  });

  it("dismisses items now covered by an ignore rule", () => {
    const ignore: MerchantRule = {
      ...rule("CHASE PAYMENT", "Other"),
      action: "ignore",
    };
    const items = [
      item("a", "CHASE PAYMENT"),
      item("b", "COSTCO WHSE", "Grocery"),
    ];
    const plan = replanInboxForRules(items, [ignore, rule("COSTCO WHSE", "Grocery")], NOW);
    expect(plan.dismissIds).toEqual(["a"]);
    expect(plan.updatedItems).toEqual([]);
  });

  it("clears suggestions when the matching rule was deleted", () => {
    const items = [item("a", "COSTCO WHSE", "Grocery")];
    const plan = replanInboxForRules(items, [], NOW);
    expect(plan.updatedItems).toHaveLength(1);
    expect(plan.updatedItems[0].suggestedCategory).toBeUndefined();
  });

  it("hands an item to another matching rule after a deletion", () => {
    // "COSTCO WHSE GAS" rule deleted; the shorter "COSTCO WHSE" rule
    // still prefix-matches, exactly as a fresh ingest would.
    const items = [item("a", "COSTCO WHSE GAS", "Transportation")];
    const plan = replanInboxForRules(items, [rule("COSTCO WHSE", "Grocery")], NOW);
    expect(plan.updatedItems).toHaveLength(1);
    expect(plan.updatedItems[0].suggestedCategory).toBe("Grocery");
  });

  it("skips items without a merchant key", () => {
    const items = [item("a", "", undefined)];
    const plan = replanInboxForRules(items, [rule("COSTCO WHSE", "Grocery")], NOW);
    expect(plan.updatedItems).toEqual([]);
    expect(plan.dismissIds).toEqual([]);
  });
});

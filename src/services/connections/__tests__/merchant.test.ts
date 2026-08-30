import {
  normalizeMerchant,
  matchMerchantRule,
  replanInboxForRules,
  selectAutoApprovable,
  renameForRule,
} from "../merchant";
import { sanitizeTextInput } from "../../../utils/sanitize";
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

describe("renameForRule", () => {
  it("remembers a real rename and ignores an untouched name", () => {
    expect(renameForRule("Costco", "COSTCO WHSE #1234")).toBe("Costco");
    expect(renameForRule("COSTCO WHSE #1234", "COSTCO WHSE #1234")).toBeUndefined();
    expect(renameForRule("  COSTCO WHSE #1234 ", "COSTCO WHSE #1234")).toBeUndefined();
    expect(renameForRule("", "COSTCO WHSE #1234")).toBeUndefined();
  });

  it("does not treat a control character in the bank text as a rename", () => {
    // The saved name went through sanitizeTextInput (control chars
    // stripped); the raw bank text didn't. Comparing raw vs sanitized used
    // to pin the bank's own text as a "rename" rule.
    const bankText = "COSTCOWHSE #1234";
    // What the inbox saves for an untouched name is the sanitized bank text.
    expect(renameForRule(sanitizeTextInput(bankText), bankText)).toBeUndefined();
    // A genuine edit on top of such text is still remembered.
    expect(renameForRule("Costco", bankText)).toBe("Costco");
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

  it("rewrites the suggested name, business, and person when a rule gains them", () => {
    const items = [item("a", "COSTCO WHSE", "Grocery")];
    const withExtras: MerchantRule = {
      ...rule("COSTCO WHSE", "Grocery"),
      renameTo: "Costco",
      businessId: "biz-1",
      personId: "per-1",
    };
    const plan = replanInboxForRules(items, [withExtras], NOW);
    expect(plan.updatedItems).toHaveLength(1);
    expect(plan.updatedItems[0].suggestedName).toBe("Costco");
    expect(plan.updatedItems[0].suggestedBusinessId).toBe("biz-1");
    expect(plan.updatedItems[0].suggestedPersonId).toBe("per-1");
  });

  it("clears a stale name/business/person and never tags income with them", () => {
    const tagged: PendingTransaction = {
      ...item("a", "COSTCO WHSE", "Grocery"),
      suggestedName: "Costco",
      suggestedBusinessId: "biz-1",
      suggestedPersonId: "per-1",
    };
    const plan = replanInboxForRules([tagged], [rule("COSTCO WHSE", "Grocery")], NOW);
    expect(plan.updatedItems).toHaveLength(1);
    expect(plan.updatedItems[0].suggestedName).toBeUndefined();
    expect(plan.updatedItems[0].suggestedBusinessId).toBeUndefined();
    expect(plan.updatedItems[0].suggestedPersonId).toBeUndefined();

    const income: PendingTransaction = {
      ...item("b", "COSTCO WHSE", "Grocery"),
      amount: 25,
      suggestedType: "income",
    };
    const incomePlan = replanInboxForRules(
      [income],
      [{ ...rule("COSTCO WHSE", "Grocery"), businessId: "biz-1", personId: "per-1" }],
      NOW,
    );
    expect(incomePlan.updatedItems).toEqual([]);
  });

  it("keeps the account-level person fallback when no rule names one", () => {
    const cardPerson = new Map([["acct-1", "per-card"]]);
    // Fresh item with the card person already applied: replan is a no-op.
    const applied: PendingTransaction = {
      ...item("a", "COSTCO WHSE", "Grocery"),
      suggestedPersonId: "per-card",
    };
    const plan = replanInboxForRules(
      [applied],
      [rule("COSTCO WHSE", "Grocery")],
      NOW,
      cardPerson,
    );
    expect(plan.updatedItems).toEqual([]);

    // A rule's person wins; deleting it falls back to the card person
    // instead of clearing.
    const rulePlan = replanInboxForRules(
      [applied],
      [{ ...rule("COSTCO WHSE", "Grocery"), personId: "per-rule" }],
      NOW,
      cardPerson,
    );
    expect(rulePlan.updatedItems[0].suggestedPersonId).toBe("per-rule");

    const deletedPlan = replanInboxForRules(
      [{ ...applied, suggestedPersonId: "per-rule" }],
      [],
      NOW,
      cardPerson,
    );
    expect(deletedPlan.updatedItems[0].suggestedPersonId).toBe("per-card");
  });

  it("suggests every person on a multi-person rule and clears a stale second person", () => {
    const family: MerchantRule = {
      ...rule("COSTCO WHSE", "Grocery"),
      personId: "per-a",
      personIds: ["per-a", "per-b"],
    };
    const plan = replanInboxForRules([item("a", "COSTCO WHSE", "Grocery")], [family], NOW);
    expect(plan.updatedItems).toHaveLength(1);
    expect(plan.updatedItems[0].suggestedPersonId).toBe("per-a");
    expect(plan.updatedItems[0].suggestedPersonIds).toEqual(["per-a", "per-b"]);

    // Already carrying exactly those people: no rewrite.
    const applied: PendingTransaction = {
      ...item("b", "COSTCO WHSE", "Grocery"),
      suggestedPersonId: "per-a",
      suggestedPersonIds: ["per-a", "per-b"],
    };
    expect(replanInboxForRules([applied], [family], NOW).updatedItems).toEqual([]);

    // Rule trimmed to one person: the second is dropped from the item too.
    const solo = replanInboxForRules(
      [applied],
      [{ ...rule("COSTCO WHSE", "Grocery"), personId: "per-a" }],
      NOW,
    );
    expect(solo.updatedItems[0].suggestedPersonId).toBe("per-a");
    expect(solo.updatedItems[0].suggestedPersonIds).toBeUndefined();
  });

  it("never applies the account person fallback to income", () => {
    const income: PendingTransaction = {
      ...item("a", "PAYROLL"),
      amount: 1500,
      suggestedType: "income",
    };
    const plan = replanInboxForRules(
      [income],
      [],
      NOW,
      new Map([["acct-1", "per-card"]]),
    );
    expect(plan.updatedItems).toEqual([]);
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

  it("treats an approve rule like categorize (suggests, never dismisses)", () => {
    const approve: MerchantRule = {
      ...rule("COSTCO WHSE", "Grocery"),
      action: "approve",
    };
    const plan = replanInboxForRules([item("a", "COSTCO WHSE")], [approve], NOW);
    expect(plan.dismissIds).toEqual([]);
    expect(plan.updatedItems[0].suggestedCategory).toBe("Grocery");
  });
});

describe("selectAutoApprovable", () => {
  const approveRule: MerchantRule = {
    ...rule("COSTCO WHSE", "Grocery"),
    action: "approve",
  };

  it("selects posted items matched by an approve rule (prefix match included)", () => {
    const items = [
      item("a", "COSTCO WHSE"),
      item("b", "COSTCO WHSE GAS STATION"),
      item("c", "SHELL"),
    ];
    const result = selectAutoApprovable(items, [approveRule]);
    expect(result.map((r) => r.item.id)).toEqual(["a", "b"]);
    expect(result[0].rule.id).toBe(approveRule.id);
  });

  it("never selects pending, transfer-likely, duplicate-likely, or merchantless items", () => {
    const items = [
      { ...item("pending", "COSTCO WHSE"), pending: true },
      { ...item("transfer", "COSTCO WHSE"), transferLikely: true },
      { ...item("dup", "COSTCO WHSE"), duplicateLikely: true },
      item("blank", ""),
      item("ok", "COSTCO WHSE"),
    ];
    const result = selectAutoApprovable(items, [approveRule]);
    expect(result.map((r) => r.item.id)).toEqual(["ok"]);
  });

  it("ignores categorize and ignore rules", () => {
    const items = [item("a", "COSTCO WHSE")];
    expect(selectAutoApprovable(items, [rule("COSTCO WHSE", "Grocery")])).toEqual([]);
    expect(
      selectAutoApprovable(items, [
        { ...rule("COSTCO WHSE", "Grocery"), action: "ignore" },
      ]),
    ).toEqual([]);
  });
});

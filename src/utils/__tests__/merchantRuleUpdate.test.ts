/**
 * Tests for buildMerchantRuleUpdate - the Merchant Rules editor's save
 * payload. The contract that matters is the tri-state: `undefined` means
 * "leave the stored value alone", `null` means "clear it". Flipping a rule
 * to "always skip" must send undefined for every category field so the old
 * category/rename/business/person survive a flip back.
 */

import {
  buildMerchantRuleUpdate,
  type MerchantRuleEditForm,
} from "../merchantRuleUpdate";
import { makeMerchantRule } from "../../__tests__/fixtures";

const buildForm = (
  over: Partial<MerchantRuleEditForm> = {}
): MerchantRuleEditForm => ({
  ignore: false,
  autoApprove: false,
  category: "Restaurant",
  renameTo: "",
  businessId: undefined,
  personId: undefined,
  ...over,
});

describe("buildMerchantRuleUpdate", () => {
  const rule = makeMerchantRule({
    id: "rule-7",
    category: "Restaurant",
    renameTo: "Corner Coffee",
    businessId: "business-1",
    personId: "person-1",
  });

  it("targets the rule being edited", () => {
    expect(buildMerchantRuleUpdate(buildForm(), rule).ruleId).toBe("rule-7");
  });

  describe("action transitions", () => {
    it("is categorize by default", () => {
      expect(buildMerchantRuleUpdate(buildForm(), rule).action).toBe(
        "categorize"
      );
    });

    it("is approve when auto-approve is checked", () => {
      expect(
        buildMerchantRuleUpdate(buildForm({ autoApprove: true }), rule).action
      ).toBe("approve");
    });

    it("is ignore when 'always skip' is picked, even with auto-approve set", () => {
      expect(
        buildMerchantRuleUpdate(
          buildForm({ ignore: true, autoApprove: true }),
          rule
        ).action
      ).toBe("ignore");
    });
  });

  it("sends the drafted category while categorizing", () => {
    expect(
      buildMerchantRuleUpdate(buildForm({ category: "Grocery" }), rule).category
    ).toBe("Grocery");
  });

  it("leaves every category field untouched when switching to ignore", () => {
    const update = buildMerchantRuleUpdate(
      buildForm({
        ignore: true,
        category: "Grocery",
        renameTo: "Something else",
        businessId: "business-2",
        personId: "person-2",
      }),
      rule
    );

    expect(update).toEqual({
      ruleId: "rule-7",
      action: "ignore",
      category: undefined,
      renameTo: undefined,
      businessId: undefined,
      personId: undefined,
    });
  });

  it("clears business and person with null when the pickers are set to none", () => {
    const update = buildMerchantRuleUpdate(buildForm(), rule);

    expect(update.businessId).toBeNull();
    expect(update.personId).toBeNull();
  });

  it("sends the picked business and person ids as-is", () => {
    const update = buildMerchantRuleUpdate(
      buildForm({ businessId: "business-9", personId: "person-9" }),
      rule
    );

    expect(update.businessId).toBe("business-9");
    expect(update.personId).toBe("person-9");
  });

  it("passes the rename field through verbatim, empty string included", () => {
    // Empty clears the rename downstream; trimming/sanitizing is the
    // service's job, so the raw text goes out unchanged.
    expect(buildMerchantRuleUpdate(buildForm(), rule).renameTo).toBe("");
    expect(
      buildMerchantRuleUpdate(buildForm({ renameTo: "  Corner  " }), rule)
        .renameTo
    ).toBe("  Corner  ");
  });

  it("never stamps updatedAt or touches the rule's identity fields", () => {
    // updatedAt/merchantKey/createdAt/useCount belong to the storage layer
    // (updateMerchantRule); a payload carrying them would be a bug.
    const update = buildMerchantRuleUpdate(buildForm(), rule);

    expect(Object.keys(update).sort()).toEqual([
      "action",
      "businessId",
      "category",
      "personId",
      "recurringEntryId",
      "renameTo",
      "ruleId",
    ]);
    expect(rule.updatedAt).toBe(makeMerchantRule().updatedAt);
  });
});

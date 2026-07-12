/**
 * Tests for the quick-add deep link builder + fail-closed validator.
 */

import { BUDGET_CATEGORIES } from "../../types";
import { buildQuickAddUri, parseQuickAddUri } from "../quickAddLink";

describe("buildQuickAddUri", () => {
  it("builds a bare link when no category is given", () => {
    expect(buildQuickAddUri()).toBe("budgetark://quick-add");
  });

  it("builds a category link with URI encoding", () => {
    expect(buildQuickAddUri("Grocery")).toBe(
      "budgetark://quick-add?category=Grocery"
    );
    expect(buildQuickAddUri("Debt Payments")).toBe(
      "budgetark://quick-add?category=Debt%20Payments"
    );
  });

  it("round-trips every built-in category through the parser", () => {
    for (const category of BUDGET_CATEGORIES) {
      expect(parseQuickAddUri(buildQuickAddUri(category))).toEqual({
        category,
      });
    }
  });
});

describe("parseQuickAddUri", () => {
  it("accepts a bare quick-add link", () => {
    expect(parseQuickAddUri("budgetark://quick-add")).toEqual({
      category: undefined,
    });
  });

  it("accepts a trailing slash and case-insensitive scheme/host", () => {
    expect(parseQuickAddUri("budgetark://quick-add/")).toEqual({
      category: undefined,
    });
    expect(parseQuickAddUri("BudgetArk://Quick-Add?category=Food")).toEqual({
      category: "Food",
    });
  });

  it("decodes plus and percent-encoded spaces in the category", () => {
    expect(
      parseQuickAddUri("budgetark://quick-add?category=Debt+Payments")
    ).toEqual({ category: "Debt Payments" });
    expect(
      parseQuickAddUri("budgetark://quick-add?category=Debt%20Payments")
    ).toEqual({ category: "Debt Payments" });
  });

  it("ignores unrelated query params but still finds category", () => {
    expect(
      parseQuickAddUri("budgetark://quick-add?utm=x&category=Shopping")
    ).toEqual({ category: "Shopping" });
  });

  it("rejects non-quick-add URLs entirely", () => {
    expect(parseQuickAddUri("https://quick-add?category=Food")).toBeNull();
    expect(parseQuickAddUri("budgetark://settings")).toBeNull();
    expect(parseQuickAddUri("budgetark://quick-add/extra/path")).toBeNull();
    expect(parseQuickAddUri("budgetark://quick-add#fragment")).toBeNull();
    expect(parseQuickAddUri("")).toBeNull();
    expect(parseQuickAddUri(null)).toBeNull();
    expect(parseQuickAddUri(undefined)).toBeNull();
    expect(parseQuickAddUri("not a url at all")).toBeNull();
  });

  it("rejects oversized URLs", () => {
    const long = `budgetark://quick-add?category=${"A".repeat(300)}`;
    expect(parseQuickAddUri(long)).toBeNull();
  });

  it("drops unknown, forged, or malformed categories but keeps the link valid", () => {
    expect(
      parseQuickAddUri("budgetark://quick-add?category=NotARealCategory")
    ).toEqual({ category: undefined });
    // Custom categories are deliberately not accepted over the link (v1).
    expect(
      parseQuickAddUri("budgetark://quick-add?category=My%20Custom")
    ).toEqual({ category: undefined });
    // Malformed percent-encoding fails closed.
    expect(parseQuickAddUri("budgetark://quick-add?category=%E0%A4%A")).toEqual(
      { category: undefined }
    );
    // Control characters fail closed.
    expect(parseQuickAddUri("budgetark://quick-add?category=Food%00")).toEqual(
      { category: undefined }
    );
    // Case must match the built-in exactly - no fuzzy matching.
    expect(parseQuickAddUri("budgetark://quick-add?category=grocery")).toEqual(
      { category: undefined }
    );
  });
});

/**
 * BudgetArk - Asset Category Hint tests
 * File: src/services/connections/__tests__/assetCategoryHint.test.ts
 *
 * The name-based category guess behind the wizard's "+ New account"
 * default. Specific words must beat generic ones and unknown names must
 * fall back to checking.
 */

import { suggestAssetCategory } from "../assetCategoryHint";

describe("suggestAssetCategory", () => {
  it.each([
    ["Fidelity 401(k)", "retirement"],
    ["401K PLAN", "retirement"],
    ["403(b) Retirement Plan", "retirement"],
    ["Roth IRA", "retirement"],
    ["Traditional IRA - Vanguard", "retirement"],
    ["Company Pension", "retirement"],
    ["TSP", "retirement"],
    ["HSA Cash", "hsa"],
    ["Health Savings Account", "hsa"],
    ["Individual Brokerage", "investment"],
    ["Investment Account", "investment"],
    ["529 College", "investment"],
    ["High Yield Savings", "savings"],
    ["Online Savings", "savings"],
    ["Money Market", "savings"],
    ["12 Month CD", "savings"],
    ["Emergency Fund", "savings"],
    ["Total Checking", "checking"],
    ["Everyday Chequing", "checking"],
    ["Cash Management Account", "checking"],
  ])("%s -> %s", (name, expected) => {
    expect(suggestAssetCategory(name)).toBe(expected);
  });

  it("prefers the specific word when a name carries several", () => {
    // "Health Savings" must not read as plain savings; a Roth is not checking.
    expect(suggestAssetCategory("Health Savings Checking")).toBe("hsa");
    expect(suggestAssetCategory("Roth IRA Savings")).toBe("retirement");
  });

  it("normalizes separators and case", () => {
    expect(suggestAssetCategory("ROTH-IRA_2024")).toBe("retirement");
    expect(suggestAssetCategory("hsa.cash")).toBe("hsa");
  });

  it("does not match words embedded in other words", () => {
    // "cd" inside "cdirect", "ira" inside "Kira" would be false positives.
    expect(suggestAssetCategory("Kira Rewards")).toBe("checking");
    expect(suggestAssetCategory("Circadian Account")).toBe("checking");
  });

  it("falls back to checking for unknown or empty names", () => {
    expect(suggestAssetCategory("")).toBe("checking");
    expect(suggestAssetCategory("Primary Account ...1234")).toBe("checking");
  });
});

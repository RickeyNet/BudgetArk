import { BUDGET_CATEGORIES } from "../../types";
import {
  PROTECTED_BUILT_IN_CATEGORIES,
  SELECTABLE_BUILT_IN_CATEGORIES,
  canHideBuiltInCategory,
  parseHiddenBuiltInCategories,
  visibleBuiltInCategories,
} from "../categoryVisibility";

describe("SELECTABLE_BUILT_IN_CATEGORIES", () => {
  it("is the built-in list minus the feature-driven and legacy names, in order", () => {
    expect(SELECTABLE_BUILT_IN_CATEGORIES).toEqual(
      BUDGET_CATEGORIES.filter((c) => !["Freelance", "Debt Payments", "Food"].includes(c))
    );
  });
});

describe("canHideBuiltInCategory", () => {
  it("allows selectable built-ins except the protected fallback", () => {
    expect(canHideBuiltInCategory("Fitness")).toBe(true);
    expect(canHideBuiltInCategory("Other")).toBe(false);
    expect(canHideBuiltInCategory("Food")).toBe(false);
    expect(canHideBuiltInCategory("Pets")).toBe(false); // custom, not built-in
    expect(PROTECTED_BUILT_IN_CATEGORIES).toEqual(["Other"]);
  });
});

describe("parseHiddenBuiltInCategories", () => {
  it("fails closed: junk, non-arrays, unknown and protected names are dropped; dupes collapse", () => {
    expect(parseHiddenBuiltInCategories(null)).toEqual([]);
    expect(parseHiddenBuiltInCategories("{bad")).toEqual([]);
    expect(parseHiddenBuiltInCategories('{"a":1}')).toEqual([]);
    expect(
      parseHiddenBuiltInCategories(JSON.stringify(["Fitness", "Other", "Nope", 3, "Fitness", "Travel"]))
    ).toEqual(["Fitness", "Travel"]);
  });
});

describe("visibleBuiltInCategories", () => {
  it("removes hidden names and keeps canonical order, from a Set or an array", () => {
    const fromSet = visibleBuiltInCategories(new Set(["Fitness", "Tech"]));
    expect(fromSet).not.toContain("Fitness");
    expect(fromSet).not.toContain("Tech");
    expect(fromSet.indexOf("Housing")).toBeLessThan(fromSet.indexOf("Grocery"));
    expect(visibleBuiltInCategories(["Travel"])).toHaveLength(SELECTABLE_BUILT_IN_CATEGORIES.length - 1);
    expect(visibleBuiltInCategories([])).toEqual(SELECTABLE_BUILT_IN_CATEGORIES);
  });
});

/**
 * Tests for resolveCategoryBuckets - which 50/30/20 bucket each spend
 * category lands in, and the per-bucket lists the Budget bucket card
 * renders. Pins the override-beats-default precedence, the custom-category
 * fallback, the "zero spend never appears" rule, and the amount ordering.
 */

import { resolveCategoryBuckets } from "../categoryBucketResolve";
import { makeCustomCategory } from "../../__tests__/fixtures";

describe("resolveCategoryBuckets", () => {
  it("uses the built-in default bucket for known categories", () => {
    const { bucketByCategory } = resolveCategoryBuckets({
      expensesByCategory: { Housing: 1200, Restaurant: 90, Savings: 300 },
      bucketOverrides: {},
      customCategories: [],
    });

    expect(bucketByCategory).toEqual({
      Housing: "needs",
      Restaurant: "wants",
      Savings: "savings",
    });
  });

  it("lets a user override beat the built-in default", () => {
    const { bucketByCategory, categoriesByBucket } = resolveCategoryBuckets({
      expensesByCategory: { Housing: 1200 },
      bucketOverrides: { Housing: "wants" },
      customCategories: [],
    });

    expect(bucketByCategory.Housing).toBe("wants");
    expect(categoriesByBucket.needs).toEqual([]);
    expect(categoriesByBucket.wants).toEqual([
      { category: "Housing", amount: 1200, hasOverride: true },
    ]);
  });

  it("honours a custom category's declared default bucket", () => {
    const { bucketByCategory } = resolveCategoryBuckets({
      expensesByCategory: { Pets: 40 },
      bucketOverrides: {},
      customCategories: [
        makeCustomCategory({ name: "Pets", defaultBucket: "needs" }),
      ],
    });

    expect(bucketByCategory.Pets).toBe("needs");
  });

  it("falls back to wants for a custom category with no declared bucket, and for an unknown one", () => {
    const { bucketByCategory } = resolveCategoryBuckets({
      expensesByCategory: { Pets: 40, "Ghost Category": 10 },
      bucketOverrides: {},
      customCategories: [makeCustomCategory({ name: "Pets" })],
    });

    expect(bucketByCategory.Pets).toBe("wants");
    expect(bucketByCategory["Ghost Category"]).toBe("wants");
  });

  it("excludes zero and negative amounts from both outputs", () => {
    const { bucketByCategory, categoriesByBucket } = resolveCategoryBuckets({
      expensesByCategory: { Housing: 0, Restaurant: -20, Grocery: 300 },
      bucketOverrides: {},
      customCategories: [],
    });

    expect(bucketByCategory).toEqual({ Grocery: "needs" });
    expect(categoriesByBucket.needs).toEqual([
      { category: "Grocery", amount: 300, hasOverride: false },
    ]);
    expect(categoriesByBucket.wants).toEqual([]);
  });

  it("orders each bucket's categories by amount, descending", () => {
    const { categoriesByBucket } = resolveCategoryBuckets({
      expensesByCategory: {
        Restaurant: 90,
        Shopping: 400,
        Entertainment: 200,
        Housing: 1200,
      },
      bucketOverrides: {},
      customCategories: [],
    });

    expect(categoriesByBucket.wants.map((line) => line.category)).toEqual([
      "Shopping",
      "Entertainment",
      "Restaurant",
    ]);
    expect(categoriesByBucket.needs.map((line) => line.category)).toEqual([
      "Housing",
    ]);
    expect(categoriesByBucket.savings).toEqual([]);
  });

  it("always returns all three buckets, even with no spend", () => {
    const { bucketByCategory, categoriesByBucket } = resolveCategoryBuckets({
      expensesByCategory: {},
      bucketOverrides: {},
      customCategories: [],
    });

    expect(bucketByCategory).toEqual({});
    expect(categoriesByBucket).toEqual({ needs: [], wants: [], savings: [] });
  });
});

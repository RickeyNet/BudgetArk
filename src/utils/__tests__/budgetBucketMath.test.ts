import {
  EMPTY_BUCKET_TOTALS,
  totalsByBucket,
  targetForBucket,
  varianceForBucket,
  pctOfIncome,
  clamp01,
} from "../budgetBucketMath";

describe("totalsByBucket", () => {
  const bucketByCategory = {
    Housing: "needs",
    Restaurant: "wants",
    Savings: "savings",
  } as const;

  it("groups category spend into buckets", () => {
    const totals = totalsByBucket(
      { Housing: 1000, Restaurant: 200, Savings: 300 },
      bucketByCategory as any
    );
    expect(totals).toEqual({ needs: 1000, wants: 200, savings: 300 });
  });

  it("sums multiple categories into the same bucket", () => {
    const totals = totalsByBucket(
      { Housing: 1000, Rent: 500 },
      { Housing: "needs", Rent: "needs" } as any
    );
    expect(totals.needs).toBe(1500);
  });

  it("skips unmapped categories and non-positive/non-finite amounts", () => {
    const totals = totalsByBucket(
      { Housing: 1000, Unknown: 999, Restaurant: -50, Savings: NaN },
      bucketByCategory as any
    );
    expect(totals).toEqual({ needs: 1000, wants: 0, savings: 0 });
  });

  it("does not mutate EMPTY_BUCKET_TOTALS", () => {
    totalsByBucket({ Housing: 1000 }, bucketByCategory as any);
    expect(EMPTY_BUCKET_TOTALS).toEqual({ needs: 0, wants: 0, savings: 0 });
  });
});

describe("targetForBucket", () => {
  it("applies the 50/30/20 split", () => {
    expect(targetForBucket("needs", 1000)).toBe(500);
    expect(targetForBucket("wants", 1000)).toBe(300);
    expect(targetForBucket("savings", 1000)).toBe(200);
  });

  it("returns 0 for non-positive or non-finite income", () => {
    expect(targetForBucket("needs", 0)).toBe(0);
    expect(targetForBucket("needs", -100)).toBe(0);
    expect(targetForBucket("needs", NaN)).toBe(0);
  });
});

describe("varianceForBucket", () => {
  it("is actual minus target", () => {
    expect(varianceForBucket(600, 500)).toBe(100);
    expect(varianceForBucket(400, 500)).toBe(-100);
  });
});

describe("pctOfIncome", () => {
  it("computes a percentage", () => {
    expect(pctOfIncome(250, 1000)).toBe(25);
  });

  it("returns 0 for invalid amounts or income", () => {
    expect(pctOfIncome(0, 1000)).toBe(0);
    expect(pctOfIncome(250, 0)).toBe(0);
    expect(pctOfIncome(NaN, 1000)).toBe(0);
  });
});

describe("clamp01", () => {
  it("clamps to the [0, 1] range", () => {
    expect(clamp01(-0.5)).toBe(0);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(1.5)).toBe(1);
  });

  it("returns 0 for non-finite input", () => {
    expect(clamp01(NaN)).toBe(0);
    expect(clamp01(Infinity)).toBe(0); // non-finite short-circuits to 0
  });
});

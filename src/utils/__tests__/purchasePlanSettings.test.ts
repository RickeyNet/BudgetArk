/**
 * BudgetArk - Purchase Plan Settings tests
 * File: src/utils/__tests__/purchasePlanSettings.test.ts
 *
 * The device-local plan-list preferences must parse fail-closed per field:
 * a bad method or mode resets just that field, a bad amount reads as
 * "never set" so the list suggests one.
 */

import {
  DEFAULT_PURCHASE_PLAN_SETTINGS,
  MAX_COMBINED_MONTHLY,
  parsePurchasePlanSettings,
} from "../purchasePlanSettings";

describe("parsePurchasePlanSettings", () => {
  it("returns defaults for null, garbage JSON, and non-objects", () => {
    expect(parsePurchasePlanSettings(null)).toEqual(DEFAULT_PURCHASE_PLAN_SETTINGS);
    expect(parsePurchasePlanSettings("{nope")).toEqual(DEFAULT_PURCHASE_PLAN_SETTINGS);
    expect(parsePurchasePlanSettings("[1,2]")).toEqual(DEFAULT_PURCHASE_PLAN_SETTINGS);
    expect(parsePurchasePlanSettings("42")).toEqual(DEFAULT_PURCHASE_PLAN_SETTINGS);
  });

  it("round-trips a valid record", () => {
    const record = { method: "custom", allocation: "parallel", combinedMonthly: 250 };
    expect(parsePurchasePlanSettings(JSON.stringify(record))).toEqual(record);
  });

  it("resets only the bad field", () => {
    expect(
      parsePurchasePlanSettings(
        JSON.stringify({ method: "avalanche", allocation: "parallel", combinedMonthly: 100 }),
      ),
    ).toEqual({ method: "snowball", allocation: "parallel", combinedMonthly: 100 });
    expect(
      parsePurchasePlanSettings(
        JSON.stringify({ method: "soonest", allocation: 7, combinedMonthly: 100 }),
      ),
    ).toEqual({ method: "soonest", allocation: "rollover", combinedMonthly: 100 });
  });

  it("treats a negative, non-finite, oversized, or non-numeric amount as never set", () => {
    for (const amount of [-1, "200", Number.NaN, Number.POSITIVE_INFINITY, MAX_COMBINED_MONTHLY + 1]) {
      expect(
        parsePurchasePlanSettings(JSON.stringify({ method: "snowball", allocation: "rollover", combinedMonthly: amount })),
      ).toEqual({ ...DEFAULT_PURCHASE_PLAN_SETTINGS, combinedMonthly: null });
    }
    expect(parsePurchasePlanSettings(JSON.stringify({ combinedMonthly: 0 })).combinedMonthly).toBe(0);
  });

  it("does not hand back the shared default object", () => {
    const parsed = parsePurchasePlanSettings(null);
    parsed.method = "custom";
    expect(DEFAULT_PURCHASE_PLAN_SETTINGS.method).toBe("snowball");
  });
});

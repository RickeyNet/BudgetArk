/**
 * BudgetArk - Purchase Plan Settings tests
 * File: src/utils/__tests__/purchasePlanSettings.test.ts
 *
 * The device-local plan-list + cost-analysis preferences must parse
 * fail-closed per field: a bad method or mode resets just that field, a
 * bad amount reads as "never set" so the UI suggests one, and the analysis
 * inputs fall back to their defaults individually.
 */

import {
  DEFAULT_PURCHASE_PLAN_SETTINGS,
  MAX_COMBINED_MONTHLY,
  MAX_FINANCE_APR,
  MAX_HOURLY_RATE,
  MAX_HOURS_PER_WEEK,
  parsePurchasePlanSettings,
} from "../purchasePlanSettings";

const VALID = {
  method: "custom",
  allocation: "parallel",
  combinedMonthly: 250,
  hoursPerWeek: 35,
  hourlyOverride: 28.5,
  financeApr: 19.9,
  financeTermMonths: 36,
};

describe("parsePurchasePlanSettings", () => {
  it("returns defaults for null, garbage JSON, and non-objects", () => {
    expect(parsePurchasePlanSettings(null)).toEqual(DEFAULT_PURCHASE_PLAN_SETTINGS);
    expect(parsePurchasePlanSettings("{nope")).toEqual(DEFAULT_PURCHASE_PLAN_SETTINGS);
    expect(parsePurchasePlanSettings("[1,2]")).toEqual(DEFAULT_PURCHASE_PLAN_SETTINGS);
    expect(parsePurchasePlanSettings("42")).toEqual(DEFAULT_PURCHASE_PLAN_SETTINGS);
  });

  it("round-trips a valid record", () => {
    expect(parsePurchasePlanSettings(JSON.stringify(VALID))).toEqual(VALID);
  });

  it("fills fields a pre-analysis record never had with their defaults", () => {
    const old = { method: "soonest", allocation: "rollover", combinedMonthly: 100 };
    expect(parsePurchasePlanSettings(JSON.stringify(old))).toEqual({
      ...DEFAULT_PURCHASE_PLAN_SETTINGS,
      ...old,
    });
  });

  it("resets only the bad field", () => {
    expect(parsePurchasePlanSettings(JSON.stringify({ ...VALID, method: "avalanche" }))).toEqual({
      ...VALID,
      method: "snowball",
    });
    expect(parsePurchasePlanSettings(JSON.stringify({ ...VALID, allocation: 7 }))).toEqual({
      ...VALID,
      allocation: "rollover",
    });
    expect(parsePurchasePlanSettings(JSON.stringify({ ...VALID, hoursPerWeek: 0 }))).toEqual({
      ...VALID,
      hoursPerWeek: 40,
    });
    expect(
      parsePurchasePlanSettings(JSON.stringify({ ...VALID, hoursPerWeek: MAX_HOURS_PER_WEEK + 1 })),
    ).toEqual({ ...VALID, hoursPerWeek: 40 });
    expect(parsePurchasePlanSettings(JSON.stringify({ ...VALID, financeTermMonths: 2.5 }))).toEqual({
      ...VALID,
      financeTermMonths: 24,
    });
    expect(parsePurchasePlanSettings(JSON.stringify({ ...VALID, financeTermMonths: 0 }))).toEqual({
      ...VALID,
      financeTermMonths: 24,
    });
  });

  it("treats a negative, non-finite, oversized, or non-numeric amount as never set", () => {
    for (const amount of [-1, "200", Number.NaN, Number.POSITIVE_INFINITY, MAX_COMBINED_MONTHLY + 1]) {
      expect(
        parsePurchasePlanSettings(JSON.stringify({ ...VALID, combinedMonthly: amount })).combinedMonthly,
      ).toBeNull();
    }
    expect(parsePurchasePlanSettings(JSON.stringify({ combinedMonthly: 0 })).combinedMonthly).toBe(0);
  });

  it("nullable analysis inputs fall back to null on junk", () => {
    for (const rate of [0, -5, "28", MAX_HOURLY_RATE + 1]) {
      expect(
        parsePurchasePlanSettings(JSON.stringify({ ...VALID, hourlyOverride: rate })).hourlyOverride,
      ).toBeNull();
    }
    for (const apr of [-1, "19.9", MAX_FINANCE_APR + 0.5]) {
      expect(parsePurchasePlanSettings(JSON.stringify({ ...VALID, financeApr: apr })).financeApr).toBeNull();
    }
    expect(parsePurchasePlanSettings(JSON.stringify({ ...VALID, financeApr: 0 })).financeApr).toBe(0);
  });

  it("does not hand back the shared default object", () => {
    const parsed = parsePurchasePlanSettings(null);
    parsed.method = "custom";
    expect(DEFAULT_PURCHASE_PLAN_SETTINGS.method).toBe("snowball");
  });
});

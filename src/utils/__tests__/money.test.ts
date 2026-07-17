// BudgetArk - Money Math tests
//
// Pins the shared cent-rounding contract now that three independent copies
// were consolidated (connections/types re-export, paycheckMath, and
// currencyConversion's inline).

import { roundToCents } from "../money";

describe("roundToCents", () => {
  it("sheds float accumulation artifacts", () => {
    // The classic: 2060.02 + 2060.01 + 2060.02 in float land.
    expect(roundToCents(6180.049999999999)).toBe(6180.05);
    expect(roundToCents(0.1 + 0.2)).toBe(0.3);
  });

  it("uses Math.round semantics (halves round toward +infinity)", () => {
    expect(roundToCents(1.005000001)).toBe(1.01);
    expect(roundToCents(2.675000001)).toBe(2.68);
    // Negative values past the half round DOWN (away from zero) under
    // Math.round - documented here so nobody "fixes" it by accident.
    expect(roundToCents(-50.005000001)).toBe(-50.01);
  });

  it("preserves exact cent values, negatives, and zero", () => {
    expect(roundToCents(1234.56)).toBe(1234.56);
    expect(roundToCents(-42.42)).toBe(-42.42);
    expect(roundToCents(0)).toBe(0);
  });

  it("collapses non-finite input to 0 instead of propagating NaN", () => {
    expect(roundToCents(NaN)).toBe(0);
    expect(roundToCents(Infinity)).toBe(0);
    expect(roundToCents(-Infinity)).toBe(0);
  });
});

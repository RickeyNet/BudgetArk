// BudgetArk - Money Math tests
//
// Pins the shared cent-rounding contract now that three independent copies
// were consolidated (connections/types re-export, paycheckMath, and
// currencyConversion's inline).

import { formatBankBalance, roundToCents } from "../money";

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

describe("formatBankBalance", () => {
  it("formats in the bank's own currency, not the app display currency", () => {
    expect(formatBankBalance(1234.5, "USD")).toContain("1,234.50");
    expect(formatBankBalance(1234.5, "EUR")).toContain("1,234.50");
    expect(formatBankBalance(1234.5, "EUR")).not.toContain("$");
  });

  it("defaults to USD when the link carries no currency code", () => {
    expect(formatBankBalance(12.5)).toBe(formatBankBalance(12.5, "USD"));
  });

  it("never throws on an unknown code - falls back to number + code", () => {
    expect(formatBankBalance(12.499, "XX1")).toBe("12.50 XX1");
    expect(formatBankBalance(Number.NaN, "???")).toBe("0.00 ???");
  });
});

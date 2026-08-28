// BudgetArk - parseMoneyInput tests
//
// Pins the single comma/decimal rule now shared by the search filter, the
// month-start balance prompt, the purchase planner, the tax calculator and
// the currency converter.

import { MAX_MONEY_INPUT, parseMoneyInput } from "../parseMoneyInput";

describe("parseMoneyInput", () => {
  it("parses plain integers and decimals, ignoring whitespace and symbols", () => {
    expect(parseMoneyInput("100")).toBe(100);
    expect(parseMoneyInput("0.5")).toBe(0.5);
    expect(parseMoneyInput(" 42.75 ")).toBe(42.75);
    expect(parseMoneyInput("$1,234.56")).toBe(1234.56);
    expect(parseMoneyInput("€ 12,50")).toBe(12.5);
    expect(parseMoneyInput("1\u00a0234,56")).toBe(1234.56);
  });

  it("one comma + no dot = decimal comma; otherwise commas are thousands", () => {
    expect(parseMoneyInput("1,5")).toBe(1.5);
    expect(parseMoneyInput("1234,56")).toBe(1234.56);
    expect(parseMoneyInput("1,234.56")).toBe(1234.56);
    expect(parseMoneyInput("1,000")).toBe(1); // documented: single comma is decimal
    expect(parseMoneyInput("1,000,000")).toBe(1_000_000);
    expect(parseMoneyInput("1,000.00")).toBe(1000);
  });

  it("accepts a bare leading/trailing decimal point", () => {
    expect(parseMoneyInput(".5")).toBe(0.5);
    expect(parseMoneyInput("5.")).toBe(5);
  });

  it("returns null (never 0) for empty or unusable text", () => {
    for (const text of ["", "   ", "abc", "12abc", "1.2.3", ".", "-", "$", "1,2,3.4.5"]) {
      expect(parseMoneyInput(text)).toBeNull();
    }
  });

  it("rejects negatives unless allowed, and never returns -0", () => {
    expect(parseMoneyInput("-5")).toBeNull();
    expect(parseMoneyInput("-5", { allowNegative: true })).toBe(-5);
    expect(parseMoneyInput("-1,234.56", { allowNegative: true })).toBe(-1234.56);
    expect(parseMoneyInput("-1234,56", { allowNegative: true })).toBe(-1234.56);
    expect(Object.is(parseMoneyInput("-0", { allowNegative: true }), 0)).toBe(true);
    expect(parseMoneyInput("--5", { allowNegative: true })).toBeNull();
  });

  it("clamps the magnitude to the money cap (or a caller-supplied max)", () => {
    expect(parseMoneyInput("99999999999999")).toBe(MAX_MONEY_INPUT);
    expect(parseMoneyInput("-99999999999999", { allowNegative: true })).toBe(-MAX_MONEY_INPUT);
    expect(parseMoneyInput("500", { max: 100 })).toBe(100);
  });
});

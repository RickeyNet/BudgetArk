/**
 * BudgetArk - Savings Interest Tests
 * File: src/utils/__tests__/savingsInterest.test.ts
 *
 * The APY helpers behind the Bridge account rows: input parsing (fail
 * closed to "no APY"), yearly interest, the high-yield gap, and the two
 * description lines.
 */

import {
  calcAnnualInterest,
  calcApyGap,
  describeApy,
  describeApyGap,
  formatApy,
  MAX_APY_PERCENT,
  MIN_APY_GAP_TO_SHOW,
  parseApyInput,
  REFERENCE_HYSA_APY,
} from "../savingsInterest";

const money = (amount: number) => `$${amount.toFixed(2)}`;

describe("parseApyInput", () => {
  it("accepts plain and percent-suffixed numbers, rounded to 2 dp", () => {
    expect(parseApyInput("4.5")).toBe(4.5);
    expect(parseApyInput(" 4.5% ")).toBe(4.5);
    expect(parseApyInput("0.4567")).toBe(0.46);
  });

  it("returns undefined for blank, zero, negative, junk, or over the cap", () => {
    expect(parseApyInput("")).toBeUndefined();
    expect(parseApyInput("   ")).toBeUndefined();
    expect(parseApyInput("0")).toBeUndefined();
    expect(parseApyInput("-1")).toBeUndefined();
    expect(parseApyInput("abc")).toBeUndefined();
    expect(parseApyInput("4,5")).toBeUndefined();
    expect(parseApyInput(String(MAX_APY_PERCENT + 0.01))).toBeUndefined();
    expect(parseApyInput(String(MAX_APY_PERCENT))).toBe(MAX_APY_PERCENT);
  });
});

describe("calcAnnualInterest / calcApyGap", () => {
  it("computes simple yearly interest in cents", () => {
    expect(calcAnnualInterest(3200, 4.5)).toBe(144);
    expect(calcAnnualInterest(1234.56, 0.01)).toBe(0.12);
  });

  it("is 0 for a zero/negative balance or rate and for non-finite input", () => {
    expect(calcAnnualInterest(0, 4.5)).toBe(0);
    expect(calcAnnualInterest(100, 0)).toBe(0);
    expect(calcAnnualInterest(-100, 4.5)).toBe(0);
    expect(calcAnnualInterest(Number.NaN, 4.5)).toBe(0);
  });

  it("gap is the extra a reference-rate account would earn, never negative", () => {
    expect(calcApyGap(10_000, 0.5)).toBe((REFERENCE_HYSA_APY - 0.5) * 100);
    expect(calcApyGap(10_000, REFERENCE_HYSA_APY)).toBe(0);
    expect(calcApyGap(10_000, 5)).toBe(0);
    expect(calcApyGap(10_000, 1, 3)).toBe(200);
  });
});

describe("formatApy / describeApy / describeApyGap", () => {
  it("trims trailing zeros and caps at 2 dp", () => {
    expect(formatApy(4.5)).toBe("4.5%");
    expect(formatApy(4)).toBe("4%");
    expect(formatApy(0.01)).toBe("0.01%");
    expect(formatApy(4.123)).toBe("4.12%");
  });

  it("describes the rate and yearly earnings on one line", () => {
    expect(describeApy(3200, 4.5, money)).toBe("4.5% APY · ~$144.00/yr");
  });

  it("only mentions the high-yield gap when it is worth at least the floor", () => {
    expect(describeApyGap(10_000, 0.5, money)).toBe(
      `A typical ${formatApy(REFERENCE_HYSA_APY)} high-yield account would add about $350.00/yr`,
    );
    expect(describeApyGap(10_000, REFERENCE_HYSA_APY, money)).toBeNull();
    // Gap just under the floor is silent, at the floor it shows.
    const balance = (MIN_APY_GAP_TO_SHOW / REFERENCE_HYSA_APY) * 100;
    expect(describeApyGap(balance - 1, 0, money)).toBeNull();
    expect(describeApyGap(balance, 0, money)).not.toBeNull();
  });
});

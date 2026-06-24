import {
  simulatePayoffPlan,
  calcMonthsToPayoff,
  calcTotalInterest,
  calcInvestmentGrowth,
  calcInvestmentTimeline,
  calcPaymentForGoalDate,
  calcMonthsUntilDate,
  parseGoalDateLocal,
  formatCurrency,
  generatePayoffSchedule,
  type PayoffDebtInput,
} from "../calculations";

describe("calcMonthsToPayoff", () => {
  it("returns 0 for a zero balance", () => {
    expect(calcMonthsToPayoff(0, 19.9, 100)).toBe(0);
  });

  it("returns Infinity when no payment is made", () => {
    expect(calcMonthsToPayoff(1000, 5, 0)).toBe(Infinity);
  });

  it("uses simple division at 0% interest, rounding up", () => {
    expect(calcMonthsToPayoff(1200, 0, 100)).toBe(12);
    expect(calcMonthsToPayoff(1000, 0, 300)).toBe(4); // 3.33 -> 4
  });

  it("returns Infinity when payment does not cover monthly interest", () => {
    // 12% APR on 10,000 = 100/mo interest; paying exactly 100 never reduces it
    expect(calcMonthsToPayoff(10000, 12, 100)).toBe(Infinity);
  });

  it("amortizes a real interest-bearing loan", () => {
    expect(calcMonthsToPayoff(1000, 12, 100)).toBe(11);
  });
});

describe("calcTotalInterest", () => {
  it("is 0 for a 0% loan", () => {
    expect(calcTotalInterest(1000, 0, 100)).toBe(0);
  });

  it("is 0 when the loan is unsolvable", () => {
    expect(calcTotalInterest(10000, 12, 100)).toBe(0);
  });

  it("accrues positive interest on an interest-bearing loan", () => {
    const interest = calcTotalInterest(1000, 12, 100);
    expect(interest).toBeGreaterThan(0);
    expect(interest).toBeLessThan(1000);
  });
});

describe("calcInvestmentGrowth", () => {
  it("returns 0 for no contribution or no time", () => {
    expect(calcInvestmentGrowth(0, 7, 10)).toBe(0);
    expect(calcInvestmentGrowth(100, 7, 0)).toBe(0);
  });

  it("sums contributions at 0% return", () => {
    expect(calcInvestmentGrowth(100, 0, 10)).toBe(12000); // 100 * 12 * 10
  });

  it("compounds a positive return", () => {
    // 100/mo at 12% annual for 1 year ~= 1268.25
    expect(calcInvestmentGrowth(100, 12, 1)).toBeCloseTo(1268.25, 1);
  });

  it("supports negative (deflationary) returns without flooring to 0", () => {
    const result = calcInvestmentGrowth(100, -10, 5);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(100 * 12 * 5); // less than raw contributions
  });
});

describe("calcInvestmentTimeline", () => {
  it("produces one entry per year (inclusive of year 0)", () => {
    const timeline = calcInvestmentTimeline(100, 7, 5);
    expect(timeline).toHaveLength(6);
    expect(timeline[0]).toEqual({ year: 0, total: 0, contributed: 0, interest: 0 });
  });

  it("keeps contributed + interest consistent with total", () => {
    const timeline = calcInvestmentTimeline(100, 7, 3);
    for (const row of timeline) {
      expect(row.total).toBe(row.contributed + row.interest);
    }
  });
});

describe("calcPaymentForGoalDate", () => {
  it("returns 0 for a zero balance", () => {
    expect(calcPaymentForGoalDate(0, 10, 12)).toBe(0);
  });

  it("returns Infinity when no months remain", () => {
    expect(calcPaymentForGoalDate(1000, 10, 0)).toBe(Infinity);
  });

  it("splits evenly at 0% interest", () => {
    expect(calcPaymentForGoalDate(1200, 0, 12)).toBe(100);
  });

  it("requires more than even split when interest accrues", () => {
    expect(calcPaymentForGoalDate(1200, 24, 12)).toBeGreaterThan(100);
  });
});

describe("calcMonthsUntilDate", () => {
  it("never returns a negative number for past dates", () => {
    expect(calcMonthsUntilDate("2000-01-01")).toBe(0);
  });

  it("counts whole months forward in UTC", () => {
    const now = new Date();
    const future = new Date(
      Date.UTC(now.getUTCFullYear() + 1, now.getUTCMonth(), 1)
    );
    expect(calcMonthsUntilDate(future.toISOString())).toBe(12);
  });
});

describe("parseGoalDateLocal", () => {
  it("keeps the goal on its intended calendar day (no UTC roll-back)", () => {
    const d = parseGoalDateLocal("2026-12-01");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(11); // December, not November
    expect(d.getDate()).toBe(1); // the 1st, not the 30th of the prior month
  });

  it("ignores any time component on the stored value", () => {
    const d = parseGoalDateLocal("2026-07-01T00:00:00.000Z");
    expect(d.getMonth()).toBe(6); // July
    expect(d.getDate()).toBe(1);
  });
});

describe("formatCurrency", () => {
  it("formats USD by default", () => {
    expect(formatCurrency(1234.5)).toBe("$1,234.50");
  });

  it("respects locale and currency code", () => {
    // Just assert it contains the converted number and doesn't throw.
    expect(formatCurrency(1000, "en-US", "EUR")).toContain("1,000");
  });
});

describe("generatePayoffSchedule", () => {
  it("ends at a zero balance for a solvable loan", () => {
    const schedule = generatePayoffSchedule(1000, 0, 100);
    expect(schedule.length).toBe(10);
    expect(schedule[schedule.length - 1].balance).toBe(0);
  });

  it("returns an empty schedule when the payment cannot cover interest", () => {
    expect(generatePayoffSchedule(10000, 12, 100)).toEqual([]);
  });
});

describe("simulatePayoffPlan", () => {
  const debts: PayoffDebtInput[] = [
    { id: "a", balance: 1000, rate: 0, minPayment: 100 },
    { id: "b", balance: 500, rate: 0, minPayment: 50 },
  ];

  it("handles an empty debt list", () => {
    const result = simulatePayoffPlan([], "avalanche");
    expect(result.monthsToPayoff).toBe(0);
    expect(result.isPayoffPossible).toBe(true);
    expect(result.totalPaid).toBe(0);
  });

  it("pays off a solvable plan in finite time", () => {
    const result = simulatePayoffPlan(debts, "snowball", 0);
    expect(result.isPayoffPossible).toBe(true);
    expect(result.monthsToPayoff).toBe(10);
    expect(result.totalPaid).toBeCloseTo(1500, 5);
    expect(result.totalInterestPaid).toBe(0);
  });

  it("clears debts faster with an extra payment", () => {
    const base = simulatePayoffPlan(debts, "snowball", 0);
    const boosted = simulatePayoffPlan(debts, "snowball", 200);
    expect(boosted.monthsToPayoff).toBeLessThan(base.monthsToPayoff);
  });

  it("flags an unsolvable plan as Infinity", () => {
    const result = simulatePayoffPlan(
      [{ id: "x", balance: 10000, rate: 24, minPayment: 10 }],
      "avalanche"
    );
    expect(result.monthsToPayoff).toBe(Infinity);
    expect(result.isPayoffPossible).toBe(false);
  });
});

import {
  simulatePayoffPlan,
  calcMonthsToPayoff,
  calcTotalInterest,
  calcInvestmentGrowth,
  calcInvestmentTimeline,
  calcLumpSumGrowth,
  compareInvestmentScenarios,
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

  it("folds an optional starting balance into year 0 and every total", () => {
    const timeline = calcInvestmentTimeline(100, 7, 3, 5000);
    expect(timeline[0]).toEqual({ year: 0, total: 5000, contributed: 5000, interest: 0 });
    for (const row of timeline) {
      expect(row.total).toBe(row.contributed + row.interest);
    }
    // Lump + contributions = the two growth paths added together
    const last = timeline[3];
    expect(last.total).toBe(
      Math.round(calcInvestmentGrowth(100, 7, 3) + calcLumpSumGrowth(5000, 7, 3))
    );
    expect(last.contributed).toBe(5000 + 100 * 12 * 3);
  });

  it("is unchanged when the starting balance is omitted", () => {
    expect(calcInvestmentTimeline(100, 7, 3)).toEqual(calcInvestmentTimeline(100, 7, 3, 0));
  });
});

describe("calcLumpSumGrowth", () => {
  it("returns 0 for no principal", () => {
    expect(calcLumpSumGrowth(0, 7, 10)).toBe(0);
  });

  it("returns the principal at 0 years or 0% return", () => {
    expect(calcLumpSumGrowth(1000, 7, 0)).toBe(1000);
    expect(calcLumpSumGrowth(1000, 0, 10)).toBe(1000);
  });

  it("compounds monthly like calcInvestmentGrowth", () => {
    // 1000 at 12% annual, monthly compounding, 1 year = 1000 * 1.01^12
    expect(calcLumpSumGrowth(1000, 12, 1)).toBeCloseTo(1126.83, 1);
  });

  it("shrinks under a negative return without going below 0", () => {
    const result = calcLumpSumGrowth(1000, -10, 5);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(1000);
  });
});

describe("compareInvestmentScenarios", () => {
  it("reports each scenario and their sum", () => {
    const cmp = compareInvestmentScenarios(40000, 500, 7, 20);
    expect(cmp.lumpOnly.putIn).toBe(40000);
    expect(cmp.lumpOnly.endValue).toBe(Math.round(calcLumpSumGrowth(40000, 7, 20)));
    expect(cmp.monthlyOnly.putIn).toBe(120000);
    expect(cmp.monthlyOnly.endValue).toBe(Math.round(calcInvestmentGrowth(500, 7, 20)));
    expect(cmp.both.putIn).toBe(160000);
    expect(cmp.both.endValue).toBe(
      Math.round(calcLumpSumGrowth(40000, 7, 20) + calcInvestmentGrowth(500, 7, 20))
    );
    for (const s of [cmp.lumpOnly, cmp.monthlyOnly, cmp.both]) {
      expect(s.growth).toBe(s.endValue - s.putIn);
    }
  });

  it("finds the year the monthly plan overtakes the lump sum", () => {
    // $500/mo at 7% passes $40,000-left-alone during year 10
    expect(compareInvestmentScenarios(40000, 500, 7, 20).crossoverYear).toBe(10);
  });

  it("returns null when there is no crossover within the horizon", () => {
    expect(compareInvestmentScenarios(40000, 500, 7, 5).crossoverYear).toBeNull();
  });

  it("returns null when either scenario is empty", () => {
    expect(compareInvestmentScenarios(0, 500, 7, 20).crossoverYear).toBeNull();
    expect(compareInvestmentScenarios(40000, 0, 7, 20).crossoverYear).toBeNull();
    expect(compareInvestmentScenarios(0, 500, 7, 20).lumpOnly).toEqual({ putIn: 0, endValue: 0, growth: 0 });
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

  describe("avalanche vs snowball ordering", () => {
    it("avalanche's extra payment targets the highest-rate debt; snowball's targets the smallest balance", () => {
      // Small balance / low rate vs large balance / high rate - the two
      // strategies must disagree on which one the extra payment hits first.
      const mixed: PayoffDebtInput[] = [
        { id: "H", balance: 200, rate: 5, minPayment: 10 },
        { id: "L", balance: 1000, rate: 30, minPayment: 10 },
      ];
      // Capped at 1 month so only the first extra-payment allocation shows
      // through debtsClearedInFirstYear (the only per-debt signal the public
      // API exposes - simulatePayoffPlan never returns per-debt balances).
      const avalanche = simulatePayoffPlan(mixed, "avalanche", 200, 1);
      const snowball = simulatePayoffPlan(mixed, "snowball", 200, 1);
      // Snowball's extra fully retires the small-balance debt (H, $200)
      // within that one capped month.
      expect(snowball.debtsClearedInFirstYear).toBe(1);
      // Avalanche instead routes the extra into the high-rate debt (L),
      // so nothing clears yet even though H's balance is smaller.
      expect(avalanche.debtsClearedInFirstYear).toBe(0);
    });

    it("avalanche accrues less total interest than snowball on a mixed rate/balance debt set", () => {
      const debts: PayoffDebtInput[] = [
        { id: "X", balance: 3000, rate: 24, minPayment: 60 },
        { id: "Y", balance: 500, rate: 5, minPayment: 20 },
        { id: "Z", balance: 1500, rate: 12, minPayment: 40 },
      ];
      const avalanche = simulatePayoffPlan(debts, "avalanche", 300);
      const snowball = simulatePayoffPlan(debts, "snowball", 300);
      expect(avalanche.isPayoffPossible).toBe(true);
      expect(snowball.isPayoffPossible).toBe(true);
      // Paying down the highest-rate balance first is mathematically
      // optimal for total interest - snowball's balance-first order costs
      // more here (and clears the debts slower, since less interest
      // accrual is offset by the same extra dollars).
      expect(avalanche.totalInterestPaid).toBeLessThan(snowball.totalInterestPaid);
      expect(avalanche.monthsToPayoff).toBeLessThanOrEqual(snowball.monthsToPayoff);
    });
  });
});

describe("generatePayoffSchedule with non-zero interest", () => {
  // $1000 balance, 12% APR (1%/mo), $100/mo payment. Verified independently
  // month-by-month (interest = balance * 0.01, principal = min(100 - interest,
  // balance)) outside this codebase - not derived by calling the function
  // under test:
  //   mo 1: interest 10.000000, principal 90.000000, balance 910.000000
  //   mo 10: interest 1.568325, principal 98.431675, balance 58.400871
  //   mo 11: interest 0.584009, principal 58.400871, balance 0.000000
  //   total interest across all 11 months: 58.984880
  it("matches a hand-computed 12% APR / $100 payment amortization", () => {
    const schedule = generatePayoffSchedule(1000, 12, 100);
    expect(schedule).toHaveLength(11);

    expect(schedule[0]).toEqual({
      month: 1,
      interestPaid: 10,
      principalPaid: 90,
      balance: 910,
    });

    // Final month's principal payment is reduced to just the remaining
    // balance, not the full $100 - the same fix calcTotalInterest's own
    // doc comment describes (treating it as a full payment overstated
    // interest badly).
    const last = schedule[schedule.length - 1];
    expect(last.month).toBe(11);
    expect(last.balance).toBe(0);
    expect(last.principalPaid).toBeCloseTo(58.400871, 5);
    expect(last.interestPaid).toBeCloseTo(0.584009, 5);

    const totalInterest = schedule.reduce((sum, m) => sum + m.interestPaid, 0);
    expect(totalInterest).toBeCloseTo(58.98488, 4);

    // Cross-check: calcTotalInterest computes the same figure via
    // calcMonthsToPayoff's closed-form month count rather than by walking
    // generatePayoffSchedule's array, so agreement confirms both paths.
    expect(calcTotalInterest(1000, 12, 100)).toBeCloseTo(totalInterest, 5);
  });
});

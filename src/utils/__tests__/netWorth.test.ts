import { calculateNetWorthTotals } from "../netWorth";

// `npm run typecheck` (tsc) covers this file even though ts-jest itself is
// transpile-only, but these fixtures deliberately stay partial-shape (only
// the fields calculateNetWorthTotals reads), so `as any` is the accurate
// escape hatch rather than a shared full-record builder.
const entry = (over: Record<string, unknown>): any => ({
  id: "e",
  type: "expense",
  category: "Food",
  amount: 0,
  date: "2026-06-01",
  createdAt: "2026-06-01",
  ...over,
});

describe("calculateNetWorthTotals", () => {
  it("returns all zeros for empty inputs", () => {
    expect(
      calculateNetWorthTotals({
        entries: [],
        debts: [],
        savingsGoals: [],
        assetAccounts: [],
      })
    ).toEqual({ totalAssets: 0, totalDebt: 0, netWorth: 0 });
  });

  it("counts reserve-category expense entries as assets", () => {
    const result = calculateNetWorthTotals({
      entries: [entry({ category: "Savings", amount: 500 })],
      debts: [],
      savingsGoals: [],
      assetAccounts: [],
    });
    expect(result.totalAssets).toBe(500);
    expect(result.netWorth).toBe(500);
  });

  it("ignores non-reserve and income entries", () => {
    const result = calculateNetWorthTotals({
      entries: [
        entry({ category: "Food", amount: 300 }),
        entry({ type: "income", category: "Salary", amount: 5000 }),
      ],
      debts: [],
      savingsGoals: [],
      assetAccounts: [],
    });
    expect(result.totalAssets).toBe(0);
  });

  it("excludes linked-account entries to avoid double-counting", () => {
    const result = calculateNetWorthTotals({
      entries: [entry({ category: "Investing", amount: 200, linkedAccountId: "acct-1" })],
      debts: [],
      savingsGoals: [],
      assetAccounts: [{ balance: 200 } as any],
    });
    // Only the asset account balance counts, not the linked entry.
    expect(result.totalAssets).toBe(200);
  });

  it("aggregates goals, entries, assets and subtracts debt", () => {
    const result = calculateNetWorthTotals({
      entries: [entry({ category: "Retirement", amount: 500 })],
      debts: [{ balance: 400 } as any, { balance: 100 } as any],
      savingsGoals: [{ currentAmount: 300 } as any],
      assetAccounts: [{ balance: 1000 } as any],
    });
    expect(result.totalAssets).toBe(1800); // 300 + 500 + 1000
    expect(result.totalDebt).toBe(500);
    expect(result.netWorth).toBe(1300);
  });

  it("can report a negative net worth", () => {
    const result = calculateNetWorthTotals({
      entries: [],
      debts: [{ balance: 1000 } as any],
      savingsGoals: [],
      assetAccounts: [],
    });
    expect(result.netWorth).toBe(-1000);
  });

  it("adds priced holdings value to total assets", () => {
    const result = calculateNetWorthTotals({
      entries: [],
      debts: [],
      savingsGoals: [],
      assetAccounts: [{ balance: 1000 } as any],
      holdings: [
        { symbol: "AAPL", shares: 2 } as any,
        { symbol: "VTI", shares: 1 } as any,
      ],
      quotes: {
        AAPL: { price: 100, asOf: "2026-06-27T00:00:00.000Z" },
        VTI: { price: 300, asOf: "2026-06-27T00:00:00.000Z" },
      },
    });
    // 1000 asset balance + (2×100 + 1×300) holdings
    expect(result.totalAssets).toBe(1500);
    expect(result.netWorth).toBe(1500);
  });

  it("treats an unpriced holding as zero (never corrupts the total)", () => {
    const result = calculateNetWorthTotals({
      entries: [],
      debts: [],
      savingsGoals: [],
      assetAccounts: [],
      holdings: [{ symbol: "TSLA", shares: 5 } as any],
      quotes: {}, // no cached price yet
    });
    expect(result.totalAssets).toBe(0);
  });

  it("is unchanged when holdings/quotes are omitted (backward compatible)", () => {
    const result = calculateNetWorthTotals({
      entries: [],
      debts: [],
      savingsGoals: [{ currentAmount: 250 } as any],
      assetAccounts: [{ balance: 750 } as any],
    });
    expect(result.totalAssets).toBe(1000);
  });

  it("skips the emergency-fund goal when EF-designated accounts exist", () => {
    const result = calculateNetWorthTotals({
      entries: [],
      debts: [],
      savingsGoals: [
        { category: "emergency_fund", currentAmount: 900 } as any,
        { category: "travel", currentAmount: 40 } as any,
      ],
      assetAccounts: [
        { category: "savings", balance: 1200, isEmergencyFund: true } as any,
      ],
    });
    // EF money lives in the designated account balance; the goal's stored
    // amount must not be added on top. Other goals still count.
    expect(result.totalAssets).toBe(1240);
  });

  it("still counts the emergency-fund goal when no account is designated", () => {
    const result = calculateNetWorthTotals({
      entries: [],
      debts: [],
      savingsGoals: [{ category: "emergency_fund", currentAmount: 900 } as any],
      assetAccounts: [{ category: "savings", balance: 1200 } as any],
    });
    expect(result.totalAssets).toBe(2100);
  });
});

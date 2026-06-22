import { calculateNetWorthTotals } from "../netWorth";

// ts-jest runs with isolatedModules (transpile-only), so light `as any` casts
// keep these fixtures concise without dragging in the full record shapes.
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
});

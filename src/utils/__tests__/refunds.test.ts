import { countsAsSpending, isEarnedIncome, isRefundEntry, spendingAmount } from "../refunds";
import { incomeRowsForMonth } from "../billFulfillment";
import { incomeTrackedBusinessIds, personalMonth } from "../businessProfit";
import { buildExpenseCategoryRows } from "../expenseCategoryRows";
import { isBudgetEntryItem } from "../recordValidators";
import type { BudgetEntry } from "../../types";

const MONTH = "2026-03";

const entry = (over: Partial<BudgetEntry> = {}): BudgetEntry => ({
  id: "e1",
  type: "expense",
  category: "Shopping",
  amount: 100,
  date: "2026-03-15T12:00:00.000Z",
  createdAt: "2026-03-15T12:00:00.000Z",
  updatedAt: "2026-03-15T12:00:00.000Z",
  ...over,
});

const refund = (over: Partial<BudgetEntry> = {}): BudgetEntry =>
  entry({ id: "r1", type: "income", refund: true, amount: 40, ...over });

describe("refund helpers", () => {
  it("treats a marked one-off deposit as negative spending, not income", () => {
    const r = refund();
    expect(isRefundEntry(r)).toBe(true);
    expect(isEarnedIncome(r)).toBe(false);
    expect(countsAsSpending(r)).toBe(true);
    expect(spendingAmount(r)).toBe(-40);
  });

  it("leaves ordinary income and expenses alone", () => {
    const pay = entry({ type: "income", category: "Salary", amount: 3000 });
    expect(isRefundEntry(pay)).toBe(false);
    expect(isEarnedIncome(pay)).toBe(true);
    expect(countsAsSpending(pay)).toBe(false);
    expect(spendingAmount(pay)).toBe(0);
    expect(spendingAmount(entry())).toBe(100);
  });

  it("ignores the flag on an expense or a recurring income", () => {
    expect(isRefundEntry(entry({ refund: true }))).toBe(false);
    expect(spendingAmount(entry({ refund: true }))).toBe(100);
    const recurringIncome = entry({ type: "income", refund: true, recurring: true });
    expect(isRefundEntry(recurringIncome)).toBe(false);
    expect(isEarnedIncome(recurringIncome)).toBe(true);
  });
});

describe("refunds across the month views", () => {
  const entries = [
    entry({ id: "buy", amount: 100 }),
    refund({ id: "back", amount: 40 }),
    entry({ id: "pay", type: "income", category: "Salary", amount: 3000 }),
  ];

  it("keeps a refund out of the income list", () => {
    expect(incomeRowsForMonth(entries, MONTH).map((row) => row.entry.id)).toEqual(["pay"]);
  });

  it("lists the refund under its spending category as a credit", () => {
    const rows = buildExpenseCategoryRows({
      monthlyEntries: entries,
      customCategoryNames: [],
      spendingByCategory: { Shopping: 60 },
      limitByCategory: {},
      businessOnly: false,
      debtPaymentPlanForMonth: [],
      recordedDebtPaymentsForMonth: [],
      selectedMonthDate: new Date(2026, 2, 1),
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].spent).toBe(60);
    const back = rows[0].entries.find((e) => e.id === "back");
    expect(back).toMatchObject({ amount: -40, refund: true });
    expect(rows[0].entries.find((e) => e.id === "buy")?.refund).toBeUndefined();
  });

  it("still lists the category when the refund cancels the month's spending", () => {
    const rows = buildExpenseCategoryRows({
      monthlyEntries: [refund({ id: "back" })],
      customCategoryNames: [],
      spendingByCategory: { Shopping: -40 },
      limitByCategory: {},
      businessOnly: false,
      debtPaymentPlanForMonth: [],
      recordedDebtPaymentsForMonth: [],
      selectedMonthDate: new Date(2026, 2, 1),
    });
    expect(rows.map((row) => row.category)).toEqual(["Shopping"]);
    expect(rows[0].entries).toHaveLength(1);
  });

  it("does not make a business income-tracking, and nets as lower expenses in one that is", () => {
    expect(incomeTrackedBusinessIds([refund({ businessId: "llc" })]).size).toBe(0);
    const month = personalMonth(
      [
        entry({ id: "sale", type: "income", category: "Freelance", amount: 500, businessId: "shop" }),
        entry({ id: "supplies", amount: 100, businessId: "shop" }),
        refund({ id: "back", amount: 40, businessId: "shop" }),
      ],
      MONTH
    );
    expect(month.businesses[0]).toMatchObject({ income: 500, expenses: 60, profit: 440 });
  });
});

describe("refund validation", () => {
  it("accepts a boolean flag and rejects anything else", () => {
    expect(isBudgetEntryItem(refund())).toBe(true);
    expect(isBudgetEntryItem({ ...refund(), refund: "yes" })).toBe(false);
  });
});

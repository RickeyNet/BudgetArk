/**
 * Tests for buildExpenseCategoryRows - the Budget tab's Spending rows.
 *
 * Covers what the row builder decides on the screen's behalf: which
 * categories earn a row (spend, or a limit outside the business-only
 * filter), the limit/ratio contract, the three synthetic Debt Payments
 * entry kinds, and the spend-descending order.
 */

import {
  buildExpenseCategoryRows,
  type ExpenseCategoryRowsInput,
} from "../expenseCategoryRows";
import {
  FIXTURE_TIME,
  makeBudgetEntry,
  makeDebt,
  makePayment,
} from "../../__tests__/fixtures";

const MONTH_DATE = new Date("2026-06-01T00:00:00.000Z");

const buildInput = (
  over: Partial<ExpenseCategoryRowsInput> = {}
): ExpenseCategoryRowsInput => ({
  monthlyEntries: [],
  customCategoryNames: [],
  spendingByCategory: {},
  limitByCategory: {},
  businessOnly: false,
  debtPaymentPlanForMonth: [],
  recordedDebtPaymentsForMonth: [],
  selectedMonthDate: MONTH_DATE,
  ...over,
});

describe("buildExpenseCategoryRows", () => {
  it("builds a row from a category's entries", () => {
    const rows = buildExpenseCategoryRows(
      buildInput({
        monthlyEntries: [
          makeBudgetEntry({ id: "e1", category: "Grocery", amount: 60 }),
          makeBudgetEntry({
            id: "e2",
            category: "Grocery",
            amount: 40,
            description: "Milk",
          }),
        ],
        spendingByCategory: { Grocery: 100 },
      })
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].category).toBe("Grocery");
    expect(rows[0].spent).toBe(100);
    expect(rows[0].entries.map((e) => e.id)).toEqual(["e1", "e2"]);
    expect(rows[0].entries[1].description).toBe("Milk");
  });

  it("carries entry metadata (attachment count, private flag, recurrence)", () => {
    const rows = buildExpenseCategoryRows(
      buildInput({
        monthlyEntries: [
          makeBudgetEntry({
            id: "e1",
            category: "Grocery",
            amount: 60,
            recurring: true,
            recurrenceInterval: 3,
            isPrivate: true,
            attachments: [{ id: "att-1", createdAt: FIXTURE_TIME }],
          }),
        ],
        spendingByCategory: { Grocery: 60 },
      })
    );

    expect(rows[0].entries[0]).toMatchObject({
      recurring: true,
      recurrenceInterval: 3,
      isPrivate: true,
      attachmentCount: 1,
    });
  });

  it("shows a limit-only category normally but hides it in business-only mode", () => {
    const withLimit = buildExpenseCategoryRows(
      buildInput({ limitByCategory: { Grocery: 400 } })
    );
    expect(withLimit.map((r) => r.category)).toEqual(["Grocery"]);
    expect(withLimit[0].spent).toBe(0);
    expect(withLimit[0].limit).toBe(400);

    const businessOnly = buildExpenseCategoryRows(
      buildInput({ limitByCategory: { Grocery: 400 }, businessOnly: true })
    );
    expect(businessOnly).toEqual([]);
  });

  it("drops limits (and so ratios) while business-only is active", () => {
    const rows = buildExpenseCategoryRows(
      buildInput({
        businessOnly: true,
        limitByCategory: { Grocery: 400 },
        spendingByCategory: { Grocery: 200 },
        monthlyEntries: [
          makeBudgetEntry({
            id: "biz",
            category: "Grocery",
            amount: 200,
            businessId: "business-1",
          }),
          makeBudgetEntry({ id: "personal", category: "Grocery", amount: 50 }),
        ],
      })
    );

    expect(rows[0].limit).toBeNull();
    expect(rows[0].ratio).toBeNull();
    // Only the business-tagged entry survives the filter.
    expect(rows[0].entries.map((e) => e.id)).toEqual(["biz"]);
  });

  it("returns a null ratio without a limit and spent/limit with one", () => {
    const noLimit = buildExpenseCategoryRows(
      buildInput({ spendingByCategory: { Grocery: 120 } })
    );
    expect(noLimit[0].limit).toBeNull();
    expect(noLimit[0].ratio).toBeNull();

    const withLimit = buildExpenseCategoryRows(
      buildInput({
        spendingByCategory: { Grocery: 120 },
        limitByCategory: { Grocery: 400 },
      })
    );
    expect(withLimit[0].ratio).toBeCloseTo(0.3);
  });

  it("includes custom categories with spend", () => {
    const rows = buildExpenseCategoryRows(
      buildInput({
        customCategoryNames: ["Pets"],
        spendingByCategory: { Pets: 30 },
        monthlyEntries: [
          makeBudgetEntry({ id: "pet", category: "Pets", amount: 30 }),
        ],
      })
    );

    expect(rows.map((r) => r.category)).toEqual(["Pets"]);
    expect(rows[0].entries.map((e) => e.id)).toEqual(["pet"]);
  });

  it("sorts rows by spend, descending", () => {
    const rows = buildExpenseCategoryRows(
      buildInput({
        spendingByCategory: { Grocery: 50, Housing: 900, Shopping: 300 },
      })
    );

    expect(rows.map((r) => r.category)).toEqual([
      "Housing",
      "Shopping",
      "Grocery",
    ]);
  });

  it("includes recurring entries that the month projection already expanded", () => {
    // monthlyEntries is recurring-aware upstream: a monthly entry anchored
    // in an earlier month arrives here with the selected month's date.
    const rows = buildExpenseCategoryRows(
      buildInput({
        monthlyEntries: [
          makeBudgetEntry({
            id: "rent",
            category: "Housing",
            amount: 1200,
            recurring: true,
            recurrenceInterval: 1,
            date: "2026-06-01T00:00:00.000Z",
          }),
        ],
        spendingByCategory: { Housing: 1200 },
      })
    );

    expect(rows[0].entries.map((e) => e.id)).toEqual(["rent"]);
    expect(rows[0].entries[0].recurring).toBe(true);
  });

  describe("synthetic Debt Payments entries", () => {
    const debt = makeDebt({ id: "d1", name: "Visa", minPayment: 100 });

    it("adds an auto-debt- row when nothing was paid", () => {
      const rows = buildExpenseCategoryRows(
        buildInput({
          spendingByCategory: { "Debt Payments": 100 },
          debtPaymentPlanForMonth: [{ debt, paid: 0, amount: 100 }],
        })
      );

      expect(rows[0].entries).toEqual([
        {
          id: "auto-debt-d1",
          amount: 100,
          description: "Visa minimum payment (planned)",
          date: MONTH_DATE.toISOString(),
        },
      ]);
    });

    it("adds a debt-min-topup- row when the planned minimum exceeds what was logged", () => {
      const payment = makePayment({ id: "p1", debtId: "d1", amount: 40 });
      const rows = buildExpenseCategoryRows(
        buildInput({
          spendingByCategory: { "Debt Payments": 100 },
          debtPaymentPlanForMonth: [{ debt, paid: 40, amount: 100 }],
          recordedDebtPaymentsForMonth: [payment],
        })
      );

      expect(rows[0].entries.map((e) => e.id)).toEqual([
        "payment-p1",
        "debt-min-topup-d1",
      ]);
      expect(rows[0].entries[1]).toMatchObject({
        amount: 60,
        description: "Visa minimum (planned)",
      });
    });

    it("omits the top-up row when logged payments already meet the plan", () => {
      const payment = makePayment({ id: "p1", debtId: "d1", amount: 150 });
      const rows = buildExpenseCategoryRows(
        buildInput({
          spendingByCategory: { "Debt Payments": 150 },
          debtPaymentPlanForMonth: [{ debt, paid: 150, amount: 150 }],
          recordedDebtPaymentsForMonth: [payment],
        })
      );

      expect(rows[0].entries.map((e) => e.id)).toEqual(["payment-p1"]);
    });

    it("leaves debt rows out of the business-only view", () => {
      const rows = buildExpenseCategoryRows(
        buildInput({
          businessOnly: true,
          spendingByCategory: { "Debt Payments": 100 },
          debtPaymentPlanForMonth: [{ debt, paid: 0, amount: 100 }],
        })
      );

      expect(rows[0].category).toBe("Debt Payments");
      expect(rows[0].entries).toEqual([]);
    });
  });
});

describe("buildExpenseCategoryRows - bill fulfilment badges", () => {
  const bill = makeBudgetEntry({
    id: "electric",
    category: "Utilities",
    description: "Electric",
    amount: 120,
    date: "2026-03-15T12:00:00",
    recurring: true,
    recurrenceInterval: 1,
  });
  const actual = makeBudgetEntry({
    id: "actual",
    category: "Utilities",
    description: "CITY POWER",
    amount: 137.42,
    date: "2026-06-03T12:00:00",
    fulfillsRecurringId: "electric",
  });

  it("names the bill and its estimate on the actual charge", () => {
    const rows = buildExpenseCategoryRows(
      buildInput({
        monthlyEntries: [actual],
        spendingByCategory: { Utilities: 137.42 },
        entriesById: new Map([
          [bill.id, bill],
          [actual.id, actual],
        ]),
      })
    );
    expect(rows[0].entries[0]).toMatchObject({
      id: "actual",
      fulfillsRecurringId: "electric",
      billLabel: "Electric",
      billEstimate: 120,
    });
  });

  it("carries the id but no label when the bill is unknown or the map is absent", () => {
    const withoutMap = buildExpenseCategoryRows(
      buildInput({ monthlyEntries: [actual], spendingByCategory: { Utilities: 137.42 } })
    );
    expect(withoutMap[0].entries[0]).toMatchObject({ fulfillsRecurringId: "electric" });
    expect(withoutMap[0].entries[0].billLabel).toBeUndefined();

    const dangling = buildExpenseCategoryRows(
      buildInput({
        monthlyEntries: [actual],
        spendingByCategory: { Utilities: 137.42 },
        entriesById: new Map([[actual.id, actual]]),
      })
    );
    expect(dangling[0].entries[0].billLabel).toBeUndefined();
    expect(dangling[0].entries[0].billEstimate).toBeUndefined();
  });
});

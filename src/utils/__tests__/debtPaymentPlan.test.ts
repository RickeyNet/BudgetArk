import { buildDebtPaymentPlanForMonth } from "../debtPaymentPlan";
import { paymentMonthKey } from "../debtDueCalendar";
import type { Debt, Payment } from "../../types";

// Minimal fixtures - `as any` keeps them concise (ts-jest is transpile-only).
const debt = (over: Partial<Debt> = {}): Debt =>
  ({
    id: "d1",
    name: "Card",
    balance: 1000,
    minPayment: 150,
    ...over,
  }) as any;

const payment = (over: Partial<Payment> = {}): Payment =>
  ({
    id: "p1",
    debtId: "d1",
    amount: 150,
    date: "2026-06-15T12:00:00.000Z",
    ...over,
  }) as any;

const CUR = "2026-07";

describe("paymentMonthKey", () => {
  it("buckets full ISO timestamps by the local calendar month", () => {
    // Built from local components so the assertion holds in any timezone:
    // an evening payment on the last day of June must stay in June even
    // when its UTC serialization rolls into July.
    const juneEvening = new Date(2026, 5, 30, 20, 0, 0);
    expect(paymentMonthKey(juneEvening.toISOString())).toBe("2026-06");

    const julyJustAfterMidnight = new Date(2026, 6, 1, 0, 5, 0);
    expect(paymentMonthKey(julyJustAfterMidnight.toISOString())).toBe("2026-07");
  });

  it("keeps the stored prefix for date-only strings", () => {
    // Parsing "2026-06-01" as UTC midnight would shift it into May 31 for
    // timezones west of UTC - the stored month must win.
    expect(paymentMonthKey("2026-06-01")).toBe("2026-06");
    expect(paymentMonthKey("2026-06-30")).toBe("2026-06");
  });
});

describe("buildDebtPaymentPlanForMonth", () => {
  describe("current month", () => {
    it("floors an unpaid active debt at its minimum payment", () => {
      const plan = buildDebtPaymentPlanForMonth([debt()], [], CUR, CUR);
      expect(plan).toHaveLength(1);
      expect(plan[0]).toMatchObject({ paid: 0, amount: 150 });
    });

    it("keeps the minimum floor over a partial payment", () => {
      const plan = buildDebtPaymentPlanForMonth(
        [debt()],
        [payment({ amount: 100 })],
        CUR,
        CUR
      );
      expect(plan[0]).toMatchObject({ paid: 100, amount: 150 });
    });

    it("counts payments above the minimum in full", () => {
      const plan = buildDebtPaymentPlanForMonth(
        [debt()],
        [payment({ amount: 150 }), payment({ id: "p2", amount: 100 })],
        CUR,
        CUR
      );
      expect(plan[0]).toMatchObject({ paid: 250, amount: 250 });
    });

    it("keeps payments on a debt paid down to zero", () => {
      const plan = buildDebtPaymentPlanForMonth(
        [debt({ balance: 0 })],
        [payment({ amount: 150 })],
        CUR,
        CUR
      );
      expect(plan[0]).toMatchObject({ paid: 150, amount: 150 });
    });

    it("omits paid-off debts with no payments this month", () => {
      const plan = buildDebtPaymentPlanForMonth([debt({ balance: 0 })], [], CUR, CUR);
      expect(plan).toHaveLength(0);
    });
  });

  describe("past months", () => {
    it("counts only what was actually paid - no minimum floor", () => {
      const plan = buildDebtPaymentPlanForMonth(
        [debt()],
        [payment({ amount: 100 })],
        "2026-06",
        CUR
      );
      expect(plan[0]).toMatchObject({ paid: 100, amount: 100 });
    });

    it("omits debts with no payments instead of inventing a planned row", () => {
      const plan = buildDebtPaymentPlanForMonth([debt()], [], "2026-06", CUR);
      expect(plan).toHaveLength(0);
    });

    it("is unaffected by a minimum payment raised after the month closed", () => {
      const plan = buildDebtPaymentPlanForMonth(
        [debt({ minPayment: 500 })],
        [payment({ amount: 150 })],
        "2026-06",
        CUR
      );
      expect(plan[0]).toMatchObject({ paid: 150, amount: 150 });
    });
  });

  describe("future months", () => {
    it("floors active debts at the minimum like the current month", () => {
      const plan = buildDebtPaymentPlanForMonth([debt()], [], "2026-08", CUR);
      expect(plan[0]).toMatchObject({ paid: 0, amount: 150 });
    });
  });
});

import {
  addMonthsClamped,
  calcPaymentVelocity,
  diffCalendarYMD,
  projectDebtFree,
  type PaymentLike,
} from "../debtFreeCountdown";
import type { PayoffDebtInput } from "../calculations";

/** Mid-month local "now" so current-month vs complete-month rules are clear. */
const NOW = new Date(2026, 6, 15); // 2026-07-15 local

const payment = (
  isoDate: string,
  amount: number,
  deletedAt?: string
): PaymentLike => ({ date: isoDate, amount, deletedAt });

/** A local-noon ISO stamp inside the given year/month (1-based month). */
const inMonth = (year: number, month1: number, day = 10): string =>
  new Date(year, month1 - 1, day, 12).toISOString();

const debt = (over: Partial<PayoffDebtInput> = {}): PayoffDebtInput => ({
  id: over.id ?? "d1",
  balance: over.balance ?? 1000,
  rate: over.rate ?? 12,
  minPayment: over.minPayment ?? 100,
  debtClass: over.debtClass,
});

describe("addMonthsClamped", () => {
  it("adds whole months keeping the day", () => {
    expect(addMonthsClamped(new Date(2026, 0, 15), 2)).toEqual(
      new Date(2026, 2, 15)
    );
  });

  it("clamps Jan 31 into February", () => {
    expect(addMonthsClamped(new Date(2026, 0, 31), 1)).toEqual(
      new Date(2026, 1, 28)
    );
    // 2028 is a leap year.
    expect(addMonthsClamped(new Date(2028, 0, 31), 1)).toEqual(
      new Date(2028, 1, 29)
    );
  });

  it("crosses year boundaries", () => {
    expect(addMonthsClamped(new Date(2026, 10, 30), 3)).toEqual(
      new Date(2027, 1, 28)
    );
  });
});

describe("diffCalendarYMD", () => {
  it("returns zeros for same day or a past target", () => {
    expect(diffCalendarYMD(NOW, NOW)).toEqual({ years: 0, months: 0, days: 0 });
    expect(diffCalendarYMD(NOW, new Date(2026, 6, 1))).toEqual({
      years: 0,
      months: 0,
      days: 0,
    });
  });

  it("counts plain day spans", () => {
    expect(diffCalendarYMD(NOW, new Date(2026, 6, 27))).toEqual({
      years: 0,
      months: 0,
      days: 12,
    });
  });

  it("splits whole months plus leftover days", () => {
    // Jul 15 -> Sep 14 = 1 month (Aug 15) + 30 days.
    expect(diffCalendarYMD(NOW, new Date(2026, 8, 14))).toEqual({
      years: 0,
      months: 1,
      days: 30,
    });
    // Jul 15 -> Sep 15 = exactly 2 months.
    expect(diffCalendarYMD(NOW, new Date(2026, 8, 15))).toEqual({
      years: 0,
      months: 2,
      days: 0,
    });
  });

  it("splits years, months, and days", () => {
    expect(diffCalendarYMD(NOW, new Date(2028, 9, 20))).toEqual({
      years: 2,
      months: 3,
      days: 5,
    });
  });

  it("handles month-end clamping in the borrow", () => {
    // Jan 31 -> Mar 1: one month lands on Feb 28 (clamped), +1 day.
    expect(diffCalendarYMD(new Date(2026, 0, 31), new Date(2026, 2, 1))).toEqual({
      years: 0,
      months: 1,
      days: 1,
    });
  });
});

describe("calcPaymentVelocity", () => {
  it("returns null with no usable payments", () => {
    expect(calcPaymentVelocity([], NOW)).toBeNull();
    expect(
      calcPaymentVelocity([payment(inMonth(2026, 6), 100, "2026-06-20")], NOW)
    ).toBeNull();
    expect(calcPaymentVelocity([payment("garbage-date", 100)], NOW)).toBeNull();
    expect(calcPaymentVelocity([payment(inMonth(2026, 6), 0)], NOW)).toBeNull();
  });

  it("averages over the complete months since the first payment", () => {
    // First payment in May; window is Jan-Jun, so May + Jun are sampled.
    const velocity = calcPaymentVelocity(
      [payment(inMonth(2026, 5), 300), payment(inMonth(2026, 6), 500)],
      NOW
    );
    expect(velocity).toEqual({
      monthlyAverage: 400,
      monthsSampled: 2,
      basis: "history",
    });
  });

  it("counts a zero-payment month after the first payment against the pace", () => {
    // First payment in April, nothing in May, June again: (200 + 0 + 400) / 3.
    const velocity = calcPaymentVelocity(
      [payment(inMonth(2026, 4), 200), payment(inMonth(2026, 6), 400)],
      NOW
    );
    expect(velocity).toEqual({
      monthlyAverage: 200,
      monthsSampled: 3,
      basis: "history",
    });
  });

  it("ignores months older than the six-month window", () => {
    // Window with NOW=Jul 2026 is Jan-Jun; a 2025 payment only anchors the
    // start - all six window months count, the old amount itself does not.
    const velocity = calcPaymentVelocity(
      [payment(inMonth(2025, 1), 10_000), payment(inMonth(2026, 6), 600)],
      NOW
    );
    expect(velocity).toEqual({
      monthlyAverage: 100,
      monthsSampled: 6,
      basis: "history",
    });
  });

  it("adds the current month to the sample only when it has payments", () => {
    const withCurrent = calcPaymentVelocity(
      [payment(inMonth(2026, 6), 300), payment(inMonth(2026, 7, 2), 900)],
      NOW
    );
    expect(withCurrent).toEqual({
      monthlyAverage: 600,
      monthsSampled: 2,
      basis: "history",
    });

    const withoutCurrent = calcPaymentVelocity(
      [payment(inMonth(2026, 6), 300)],
      NOW
    );
    expect(withoutCurrent?.monthsSampled).toBe(1);
    expect(withoutCurrent?.monthlyAverage).toBe(300);
  });

  it("uses this month's payments alone for a brand-new payer", () => {
    const velocity = calcPaymentVelocity([payment(inMonth(2026, 7, 3), 250)], NOW);
    expect(velocity).toEqual({
      monthlyAverage: 250,
      monthsSampled: 1,
      basis: "current-month",
    });
  });
});

describe("projectDebtFree", () => {
  it("reports no-debts with an empty list", () => {
    const projection = projectDebtFree([], [], "avalanche", NOW);
    expect(projection.status).toBe("no-debts");
    expect(projection.projectedDate).toBeNull();
  });

  it("reports debt-free when every balance is zero", () => {
    const projection = projectDebtFree(
      [debt({ balance: 0 })],
      [payment(inMonth(2026, 6), 100)],
      "avalanche",
      NOW
    );
    expect(projection.status).toBe("debt-free");
  });

  it("falls back to minimum payments with no payment history", () => {
    const projection = projectDebtFree(
      [debt({ balance: 1200, rate: 0, minPayment: 100 })],
      [],
      "avalanche",
      NOW
    );
    expect(projection.status).toBe("counting");
    expect(projection.velocity.basis).toBe("minimums");
    expect(projection.paceMonthly).toBe(100);
    expect(projection.monthsToPayoff).toBe(12);
    expect(projection.projectedDate).toEqual(addMonthsClamped(new Date(2026, 6, 15), 12));
  });

  it("feeds velocity above the minimums into the simulation as extra", () => {
    // $1200 @ 0% with $100 min: minimums alone take 12 months; a $200/mo
    // demonstrated pace should halve that.
    const projection = projectDebtFree(
      [debt({ balance: 1200, rate: 0, minPayment: 100 })],
      [payment(inMonth(2026, 5), 200), payment(inMonth(2026, 6), 200)],
      "avalanche",
      NOW
    );
    expect(projection.velocity.basis).toBe("history");
    expect(projection.paceMonthly).toBe(200);
    expect(projection.monthsToPayoff).toBe(6);
    expect(projection.velocityBelowMinimums).toBe(false);
  });

  it("floors the pace at the minimums and flags a below-minimum history", () => {
    const projection = projectDebtFree(
      [debt({ balance: 1200, rate: 0, minPayment: 100 })],
      [payment(inMonth(2026, 5), 40), payment(inMonth(2026, 6), 40)],
      "avalanche",
      NOW
    );
    expect(projection.velocityBelowMinimums).toBe(true);
    expect(projection.paceMonthly).toBe(100); // simulated at minimums
    expect(projection.monthsToPayoff).toBe(12);
  });

  it("reports not-solvable when interest outruns the pace", () => {
    // 60% APR on $10k = $500/mo interest; $50 minimum can't touch it.
    const projection = projectDebtFree(
      [debt({ balance: 10_000, rate: 60, minPayment: 50 })],
      [],
      "avalanche",
      NOW
    );
    expect(projection.status).toBe("not-solvable");
    expect(projection.monthsToPayoff).toBe(Infinity);
    expect(projection.projectedDate).toBeNull();
  });

  it("includes every debt class - the mortgage counts toward debt-free", () => {
    const projection = projectDebtFree(
      [
        debt({ id: "card", balance: 1000, rate: 0, minPayment: 100 }),
        debt({
          id: "house",
          balance: 12_000,
          rate: 0,
          minPayment: 500,
          debtClass: "house",
        }),
      ],
      [],
      "avalanche",
      NOW
    );
    expect(projection.status).toBe("counting");
    // $13k total at $600/mo combined minimums (0%) ≈ 24 months, not the
    // 10 months the card alone would take.
    expect(projection.monthsToPayoff).toBe(24);
  });
});

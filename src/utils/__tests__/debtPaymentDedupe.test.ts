/**
 * dedupeMinimumDuePayments is the repair for the double-counted
 * minimum-payment sync bug: two paired phones each confirm the same
 * "minimum due" prompt before syncing, and the id-based merge keeps both
 * rows. The dedupe must collapse exactly those rows - and, critically,
 * must NEVER touch a user who genuinely paid the minimum twice in one
 * month (their balance reflects both decrements, so the balance gate
 * reports no unexplained gap).
 */
import {
  dedupeMinimumDuePayments,
  minimumDuePaymentId,
  MINIMUM_DUE_PAYMENT_ID_PREFIX,
} from "../debtPaymentDedupe";

const NOW = "2026-07-11T12:00:00.000Z";
const JUL_5 = "2026-07-05T10:00:00.000Z";
const JUL_8 = "2026-07-08T10:00:00.000Z";
const JUN_5 = "2026-06-05T10:00:00.000Z";

const debt = (over: Record<string, unknown> = {}): any => ({
  id: "d1",
  name: "Visa",
  balance: 950,
  originalBalance: 1000,
  rate: 19.9,
  minPayment: 50,
  createdAt: JUN_5,
  updatedAt: JUL_8,
  ...over,
});

const payment = (over: Record<string, unknown> = {}): any => ({
  id: "p1",
  debtId: "d1",
  amount: 50,
  appliedAmount: 50,
  date: JUL_5,
  updatedAt: JUL_5,
  ...over,
});

describe("minimumDuePaymentId", () => {
  it("derives the same id from the same debt and month", () => {
    expect(minimumDuePaymentId("d1", "2026-07")).toBe("duemin:d1:2026-07");
    expect(
      minimumDuePaymentId("d1", "2026-07").startsWith(
        MINIMUM_DUE_PAYMENT_ID_PREFIX
      )
    ).toBe(true);
  });

  it("differs across months and debts", () => {
    expect(minimumDuePaymentId("d1", "2026-07")).not.toBe(
      minimumDuePaymentId("d1", "2026-08")
    );
    expect(minimumDuePaymentId("d1", "2026-07")).not.toBe(
      minimumDuePaymentId("d2", "2026-07")
    );
  });
});

describe("dedupeMinimumDuePayments", () => {
  it("collapses the cross-device duplicate: two minimum rows, balance decremented once", () => {
    // Original 1000, both phones logged the $50 minimum, LWW kept a single
    // decrement -> balance 950 but two rows claiming $100 applied.
    const payments = [
      payment({ id: "uuid-a", date: JUL_5 }),
      payment({ id: "uuid-b", date: JUL_8 }),
    ];
    const result = dedupeMinimumDuePayments([debt()], payments, NOW);

    expect(result.removedCount).toBe(1);
    const live = result.payments.filter((p) => !p.deletedAt);
    expect(live.map((p) => p.id)).toEqual(["uuid-a"]); // earliest date survives
    const removed = result.payments.find((p) => p.id === "uuid-b")!;
    expect(removed.deletedAt).toBe(NOW);
    expect(removed.updatedAt).toBe(NOW);
  });

  it("never touches a genuine double payment (both decrements applied, no gap)", () => {
    // User really paid the minimum twice: 1000 - 50 - 50 = 900.
    const payments = [
      payment({ id: "uuid-a", date: JUL_5 }),
      payment({ id: "uuid-b", date: JUL_8 }),
    ];
    const result = dedupeMinimumDuePayments(
      [debt({ balance: 900 })],
      payments,
      NOW
    );
    expect(result.removedCount).toBe(0);
    expect(result.payments.every((p) => !p.deletedAt)).toBe(true);
  });

  it("prefers the deterministic-id row as survivor even when dated later", () => {
    const payments = [
      payment({ id: "uuid-a", date: JUL_5 }),
      payment({ id: minimumDuePaymentId("d1", "2026-07"), date: JUL_8 }),
    ];
    const result = dedupeMinimumDuePayments([debt()], payments, NOW);
    const live = result.payments.filter((p) => !p.deletedAt);
    expect(live.map((p) => p.id)).toEqual([minimumDuePaymentId("d1", "2026-07")]);
  });

  it("picks the same survivor regardless of input order (devices must agree)", () => {
    const a = payment({ id: "uuid-a", date: JUL_5 });
    const b = payment({ id: "uuid-b", date: JUL_5 }); // same date -> id tiebreak
    const forward = dedupeMinimumDuePayments([debt()], [a, b], NOW);
    const reversed = dedupeMinimumDuePayments([debt()], [b, a], NOW);
    const removedForward = forward.payments.find((p) => p.deletedAt)!.id;
    const removedReversed = reversed.payments.find((p) => p.deletedAt)!.id;
    expect(removedForward).toBe(removedReversed);
    expect(removedForward).toBe("uuid-b");
  });

  it("leaves minimum payments in different months alone", () => {
    // Gap exists (e.g. a hand-edited balance) but each month has one row -
    // there is no pair to collapse.
    const payments = [
      payment({ id: "uuid-jun", date: JUN_5 }),
      payment({ id: "uuid-jul", date: JUL_5 }),
    ];
    const result = dedupeMinimumDuePayments([debt()], payments, NOW);
    expect(result.removedCount).toBe(0);
  });

  it("ignores rows whose amount is not the debt's minimum", () => {
    const payments = [
      payment({ id: "uuid-a", amount: 75, appliedAmount: 75, date: JUL_5 }),
      payment({ id: "uuid-b", amount: 75, appliedAmount: 75, date: JUL_8 }),
    ];
    const result = dedupeMinimumDuePayments(
      [debt({ balance: 925 })], // gap of 75, but rows aren't minimum-shaped
      payments,
      NOW
    );
    expect(result.removedCount).toBe(0);
  });

  it("ignores already-tombstoned rows", () => {
    const payments = [
      payment({ id: "uuid-a", date: JUL_5 }),
      payment({ id: "uuid-b", date: JUL_8, deletedAt: JUL_8 }),
    ];
    const result = dedupeMinimumDuePayments([debt()], payments, NOW);
    expect(result.removedCount).toBe(0);
  });

  it("removes only as many rows as the unexplained gap accounts for", () => {
    // Three rows claiming $150, balance dropped $100 -> exactly one row is
    // a phantom; the other two decrements really happened.
    const payments = [
      payment({ id: "uuid-a", date: JUL_5 }),
      payment({ id: "uuid-b", date: JUL_8 }),
      payment({ id: "uuid-c", date: "2026-07-09T10:00:00.000Z" }),
    ];
    const result = dedupeMinimumDuePayments(
      [debt({ balance: 900 })],
      payments,
      NOW
    );
    expect(result.removedCount).toBe(1);
    expect(result.payments.filter((p) => !p.deletedAt)).toHaveLength(2);
  });

  it("removes two phantoms when the gap covers both", () => {
    const payments = [
      payment({ id: "uuid-a", date: JUL_5 }),
      payment({ id: "uuid-b", date: JUL_8 }),
      payment({ id: "uuid-c", date: "2026-07-09T10:00:00.000Z" }),
    ];
    const result = dedupeMinimumDuePayments(
      [debt({ balance: 950 })], // only one $50 decrement ever applied
      payments,
      NOW
    );
    expect(result.removedCount).toBe(2);
    expect(result.payments.filter((p) => !p.deletedAt)).toHaveLength(1);
    expect(result.payments.find((p) => !p.deletedAt)!.id).toBe("uuid-a");
  });

  it("skips debts without an originalBalance (cannot verify the gap)", () => {
    const legacyDebt = debt({ originalBalance: undefined });
    const payments = [
      payment({ id: "uuid-a", date: JUL_5 }),
      payment({ id: "uuid-b", date: JUL_8 }),
    ];
    const result = dedupeMinimumDuePayments([legacyDebt], payments, NOW);
    expect(result.removedCount).toBe(0);
  });

  it("falls back to amount when appliedAmount is missing (legacy rows)", () => {
    const payments = [
      payment({ id: "uuid-a", date: JUL_5, appliedAmount: undefined }),
      payment({ id: "uuid-b", date: JUL_8, appliedAmount: undefined }),
    ];
    const result = dedupeMinimumDuePayments([debt()], payments, NOW);
    expect(result.removedCount).toBe(1);
  });

  it("handles multiple debts independently", () => {
    const debts = [
      debt(), // d1: duplicated
      debt({ id: "d2", balance: 900, originalBalance: 1000 }), // d2: genuine double
    ];
    const payments = [
      payment({ id: "a1", date: JUL_5 }),
      payment({ id: "a2", date: JUL_8 }),
      payment({ id: "b1", debtId: "d2", date: JUL_5 }),
      payment({ id: "b2", debtId: "d2", date: JUL_8 }),
    ];
    const result = dedupeMinimumDuePayments(debts, payments, NOW);
    expect(result.removedCount).toBe(1);
    expect(result.payments.find((p) => p.deletedAt)!.debtId).toBe("d1");
  });

  it("returns the payments unchanged when there is nothing to do", () => {
    const payments = [payment({ id: "uuid-a" })];
    const result = dedupeMinimumDuePayments([debt()], payments, NOW);
    expect(result.removedCount).toBe(0);
    expect(result.payments).toEqual(payments);
  });
});

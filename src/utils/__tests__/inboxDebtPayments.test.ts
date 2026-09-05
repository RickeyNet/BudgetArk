/**
 * BudgetArk - Review Inbox Debt Payments Tests
 * File: src/utils/__tests__/inboxDebtPayments.test.ts
 *
 * Pins the pure half of "a bank outflow can be logged as a debt payment
 * from the Review Inbox": which debts the bill picker offers and in what
 * order, the debt-pill id round trip (never mistaken for a bill id), and
 * the deterministic, length-bounded Payment id that keeps a retry or a
 * partner's copy of the same decision from paying a debt twice.
 */

import { makeDebt, makePayment } from "../../__tests__/fixtures";
import { minimumDuePaymentId } from "../debtPaymentDedupe";
import {
  DEBT_OPTION_PREFIX,
  INBOX_PAYMENT_ID_PREFIX,
  PAYMENT_MATCH_WINDOW_DAYS,
  debtIdFromOption,
  debtOptionId,
  findAlreadyLoggedPayment,
  inboxPaymentId,
  isInboxPaymentId,
  nearbyManualPayments,
  rankDebtCandidates,
} from "../inboxDebtPayments";

describe("debt pill ids", () => {
  it("round-trips a debt id through the picker value", () => {
    expect(debtOptionId("d1")).toBe(`${DEBT_OPTION_PREFIX}d1`);
    expect(debtIdFromOption(debtOptionId("d1"))).toBe("d1");
  });

  it("is undefined for a bill's entry id, nothing, or a bare prefix", () => {
    expect(debtIdFromOption("3f2b-entry-uuid")).toBeUndefined();
    expect(debtIdFromOption(undefined)).toBeUndefined();
    expect(debtIdFromOption(null)).toBeUndefined();
    expect(debtIdFromOption("")).toBeUndefined();
    expect(debtIdFromOption(DEBT_OPTION_PREFIX)).toBeUndefined();
  });
});

describe("rankDebtCandidates", () => {
  const visa = makeDebt({ id: "visa", name: "Visa", balance: 900, minPayment: 50 });
  const car = makeDebt({ id: "car", name: "Car loan", balance: 8000, minPayment: 310 });
  const student = makeDebt({
    id: "student",
    name: "Student loan",
    balance: 12000,
    minPayment: 120,
  });

  it("offers only live debts that still carry a balance", () => {
    const paidOff = makeDebt({ id: "old", name: "Old card", balance: 0, minPayment: 25 });
    const deleted = makeDebt({
      id: "gone",
      name: "Gone",
      balance: 500,
      deletedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(
      rankDebtCandidates([paidOff, visa, deleted]).map((debt) => debt.id)
    ).toEqual(["visa"]);
  });

  it("keeps the currently picked debt even when it no longer qualifies", () => {
    const paidOff = makeDebt({ id: "old", name: "Zed card", balance: 0 });
    expect(
      rankDebtCandidates([paidOff, visa], { keepId: "old" }).map((debt) => debt.id)
    ).toEqual(["visa", "old"]);
  });

  it("ranks by closeness of the minimum to the charge amount", () => {
    expect(
      rankDebtCandidates([visa, car, student], { amount: 300 }).map((debt) => debt.id)
    ).toEqual(["car", "student", "visa"]);
    expect(
      rankDebtCandidates([visa, car, student], { amount: 55 }).map((debt) => debt.id)
    ).toEqual(["visa", "student", "car"]);
  });

  it("falls back to larger minimum, then name, when no amount is known", () => {
    const twin = makeDebt({ id: "twin", name: "Amex", balance: 400, minPayment: 50 });
    expect(
      rankDebtCandidates([visa, twin, student, car]).map((debt) => debt.id)
    ).toEqual(["car", "student", "twin", "visa"]);
    // Zero / non-finite amounts are treated as unknown.
    expect(rankDebtCandidates([visa, car], { amount: 0 }).map((d) => d.id)).toEqual([
      "car",
      "visa",
    ]);
    expect(rankDebtCandidates([visa, car], { amount: NaN }).map((d) => d.id)).toEqual([
      "car",
      "visa",
    ]);
  });

  it("does not mutate the input", () => {
    const input = [visa, car];
    rankDebtCandidates(input, { amount: 300 });
    expect(input.map((d) => d.id)).toEqual(["visa", "car"]);
  });
});

describe("inboxPaymentId", () => {
  it("is deterministic for the same pending id and distinct across ids", () => {
    expect(inboxPaymentId("simplefin:ACT-1:TXN-1")).toBe(
      inboxPaymentId("simplefin:ACT-1:TXN-1")
    );
    expect(inboxPaymentId("simplefin:ACT-1:TXN-1")).not.toBe(
      inboxPaymentId("simplefin:ACT-1:TXN-2")
    );
  });

  it("is prefixed and bounded regardless of how long the pending id is", () => {
    const id = inboxPaymentId(`csv:${"x".repeat(400)}:${"y".repeat(400)}`);
    expect(id.startsWith(INBOX_PAYMENT_ID_PREFIX)).toBe(true);
    // prefix + 64 hex chars: always under the synced-record text limit a
    // partner's isPaymentItem validates ids against (120).
    expect(id).toMatch(/^inbox:[0-9a-f]{64}$/);
    expect(id.length).toBeLessThanOrEqual(120);
    expect(isInboxPaymentId(id)).toBe(true);
    expect(isInboxPaymentId(minimumDuePaymentId("visa", "2026-09"))).toBe(false);
    expect(isInboxPaymentId("manual-uuid")).toBe(false);
  });
});

describe("due-day reminder overlap guard", () => {
  // The due prompt confirmed on the 3rd: a deterministic duemin: row for
  // the minimum. The bank posts the transfer on the 6th.
  const promptLogged = makePayment({
    id: minimumDuePaymentId("visa", "2026-09"),
    debtId: "visa",
    amount: 50,
    date: "2026-09-03T14:00:00.000Z",
  });
  const POSTED = "2026-09-06T12:00:00.000Z";

  it("matches the prompt-logged minimum to the bank row for the same amount within the window", () => {
    expect(findAlreadyLoggedPayment([promptLogged], "visa", 50, POSTED)?.id).toBe(
      promptLogged.id
    );
    // To the cent, either direction.
    expect(findAlreadyLoggedPayment([promptLogged], "visa", 50.01, POSTED)).toBeDefined();
    expect(findAlreadyLoggedPayment([promptLogged], "visa", 49.99, POSTED)).toBeDefined();
  });

  it("matches a hand-logged payment too, and follows the window across a month boundary", () => {
    const manual = makePayment({
      id: "manual-uuid",
      debtId: "visa",
      amount: 120,
      date: "2026-08-30T09:00:00.000Z",
    });
    expect(
      findAlreadyLoggedPayment([manual], "visa", 120, "2026-09-02T12:00:00.000Z")?.id
    ).toBe("manual-uuid");
    // Just outside the window: not the same payment.
    const later = new Date(Date.parse(manual.date) + (PAYMENT_MATCH_WINDOW_DAYS + 1) * 86400_000);
    expect(findAlreadyLoggedPayment([manual], "visa", 120, later.toISOString())).toBeUndefined();
  });

  it("never matches a different amount, another debt, a deleted row, or a bank-logged row", () => {
    // Paid more than the minimum the prompt logged: ambiguous, no match.
    expect(findAlreadyLoggedPayment([promptLogged], "visa", 300, POSTED)).toBeUndefined();
    expect(findAlreadyLoggedPayment([promptLogged], "amex", 50, POSTED)).toBeUndefined();
    expect(
      findAlreadyLoggedPayment([{ ...promptLogged, deletedAt: POSTED }], "visa", 50, POSTED)
    ).toBeUndefined();
    // Two imported transfers of the same amount are two real payments -
    // each already unique by its own hashed id.
    const bankLogged = makePayment({
      id: inboxPaymentId("simplefin:ACT-1:TXN-9"),
      debtId: "visa",
      amount: 50,
      date: "2026-09-04T12:00:00.000Z",
    });
    expect(findAlreadyLoggedPayment([bankLogged], "visa", 50, POSTED)).toBeUndefined();
    expect(nearbyManualPayments([bankLogged], "visa", POSTED)).toEqual([]);
  });

  it("lists nearby non-bank payments closest first, whatever their amount", () => {
    const farther = makePayment({ id: "m-far", debtId: "visa", amount: 300, date: "2026-09-01T12:00:00.000Z" });
    const nearer = makePayment({ id: "m-near", debtId: "visa", amount: 75, date: "2026-09-05T12:00:00.000Z" });
    const outside = makePayment({ id: "m-out", debtId: "visa", amount: 50, date: "2026-08-01T12:00:00.000Z" });
    expect(
      nearbyManualPayments([farther, outside, nearer, promptLogged], "visa", POSTED).map((p) => p.id)
    ).toEqual(["m-near", promptLogged.id, "m-far"]);
    // Unparseable dates are skipped rather than matched.
    expect(nearbyManualPayments([{ ...nearer, date: "not a date" }], "visa", POSTED)).toEqual([]);
  });
});

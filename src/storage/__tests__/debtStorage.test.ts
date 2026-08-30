/**
 * recordPayment gained same-id handling when prompt-logged minimums moved
 * to deterministic ids (debt + month): a live record with the same id must
 * make a repeat log a no-op (one real-world payment, one balance
 * decrement), and a tombstoned one must be revived in place so two records
 * never share an id. repairDuplicateMinimumDuePayments is the launch-time
 * cleanup for data duplicated by the pre-deterministic-id sync bug.
 * Storage is mocked with an in-memory map; everything else runs real.
 */
import type { Debt, Payment } from "../../types";
import {
  recordPayment,
  deletePayment,
  repairDuplicateMinimumDuePayments,
} from "../debtStorage";
import { minimumDuePaymentId } from "../../utils/debtPaymentDedupe";

let mockStore: Map<string, string>;

jest.mock("../encryptedStorage", () => ({
  getItem: jest.fn(async (k: string) => (mockStore.has(k) ? mockStore.get(k) : null)),
  setItem: jest.fn(async (k: string, v: string) => {
    mockStore.set(k, v);
  }),
  removeItem: jest.fn(async (k: string) => {
    mockStore.delete(k);
  }),
  multiSet: jest.fn(async (pairs: [string, string][]) => {
    for (const [k, v] of pairs) mockStore.set(k, v);
  }),
}));

const DEBTS_KEY = "@budgetark_debts";
const PAYMENTS_KEY = "@budgetark_payments";

const T0 = "2026-06-01T00:00:00.000Z";
const T1 = "2026-07-05T00:00:00.000Z";
const T2 = "2026-07-08T00:00:00.000Z";

const debt = (over: Partial<Debt> = {}): Debt =>
  ({
    id: "d1",
    name: "Visa",
    balance: 1000,
    originalBalance: 1000,
    rate: 19.9,
    minPayment: 50,
    owner: "mine",
    debtClass: "personal_credit",
    debtClassSource: "manual",
    createdAt: T0,
    updatedAt: T0,
    ...over,
  }) as Debt;

const paymentInput = (over: Partial<Payment> = {}): Payment =>
  ({
    id: minimumDuePaymentId("d1", "2026-07"),
    debtId: "d1",
    amount: 50,
    date: T1,
    updatedAt: T1,
    ...over,
  }) as Payment;

const seed = (debts: Debt[], payments: Payment[] = []) => {
  mockStore.set(DEBTS_KEY, JSON.stringify(debts));
  mockStore.set(PAYMENTS_KEY, JSON.stringify(payments));
};

const storedPayments = (): Payment[] =>
  JSON.parse(mockStore.get(PAYMENTS_KEY) ?? "[]");
const storedDebts = (): Debt[] => JSON.parse(mockStore.get(DEBTS_KEY) ?? "[]");

beforeEach(() => {
  mockStore = new Map();
});

describe("recordPayment with deterministic ids", () => {
  it("records a new payment and decrements the balance once", async () => {
    seed([debt()]);
    const result = await recordPayment(paymentInput());
    expect(result.debts[0].balance).toBe(950);
    expect(result.payments).toHaveLength(1);
    expect(result.payments[0].appliedAmount).toBe(50);
  });

  it("no-ops when a live payment with the same id already exists", async () => {
    // e.g. the partner's copy of this month's minimum synced in while the
    // prompt was still on screen - confirming must not double-decrement.
    seed([debt()]);
    await recordPayment(paymentInput());
    const result = await recordPayment(paymentInput({ date: T2, updatedAt: T2 }));
    expect(result.debts[0].balance).toBe(950); // not 900
    expect(result.payments).toHaveLength(1);
    expect(storedPayments()).toHaveLength(1);
  });

  it("revives a tombstoned same-id payment instead of appending a twin", async () => {
    // Delete this month's log, then re-confirm the prompt: same id again.
    seed([debt()]);
    await recordPayment(paymentInput());
    await deletePayment(paymentInput().id); // restores balance to 1000
    expect(storedDebts()[0].balance).toBe(1000);

    const result = await recordPayment(paymentInput({ date: T2, updatedAt: T2 }));
    expect(result.debts[0].balance).toBe(950);
    expect(result.payments).toHaveLength(1); // revived, not duplicated
    const all = storedPayments();
    expect(all).toHaveLength(1);
    expect(all[0].deletedAt).toBeUndefined();
    expect(all[0].updatedAt).toBe(T2); // revival wins LWW over the delete
  });
});

describe("repairDuplicateMinimumDuePayments", () => {
  it("tombstones the sync-created duplicate and leaves the balance alone", async () => {
    // Post-merge shape of the bug: two rows for one real payment, balance
    // decremented once (950).
    seed(
      [debt({ balance: 950, updatedAt: T2 })],
      [
        paymentInput({ id: "uuid-partner", appliedAmount: 50 }),
        paymentInput({
          id: "uuid-local",
          date: T2,
          updatedAt: T2,
          appliedAmount: 50,
        }),
      ]
    );
    const removed = await repairDuplicateMinimumDuePayments();
    expect(removed).toBe(1);
    const all = storedPayments();
    expect(all.filter((p) => !p.deletedAt)).toHaveLength(1);
    expect(storedDebts()[0].balance).toBe(950); // untouched
  });

  it("is idempotent - a second run finds nothing", async () => {
    seed(
      [debt({ balance: 950, updatedAt: T2 })],
      [
        paymentInput({ id: "uuid-partner", appliedAmount: 50 }),
        paymentInput({
          id: "uuid-local",
          date: T2,
          updatedAt: T2,
          appliedAmount: 50,
        }),
      ]
    );
    await repairDuplicateMinimumDuePayments();
    expect(await repairDuplicateMinimumDuePayments()).toBe(0);
  });

  it("does not touch a genuine double payment", async () => {
    seed(
      [debt({ balance: 900, updatedAt: T2 })], // both decrements applied
      [
        paymentInput({ id: "uuid-1", appliedAmount: 50 }),
        paymentInput({
          id: "uuid-2",
          date: T2,
          updatedAt: T2,
          appliedAmount: 50,
        }),
      ]
    );
    expect(await repairDuplicateMinimumDuePayments()).toBe(0);
    expect(storedPayments().every((p) => !p.deletedAt)).toBe(true);
  });
});

/**
 * debtStorage's read/write edges that the recordPayment suite doesn't reach.
 *
 * Guards, in order:
 *  - `saveDebts` may be handed a live-only array (screens read through
 *    `getDebts`), so stored tombstones must survive the round-trip or Undo
 *    breaks and the partner resurrects the deletion on its next sync.
 *  - the debt CRUD helpers: soft-delete instead of splice, `updatedAt`
 *    stamping for LWW, and unknown ids being no-ops.
 *  - `restorePayment` re-applying the balance reduction it reverses, clamped
 *    at zero, and `deletePayment` reversing `appliedAmount` (falling back to
 *    `amount` only for pre-appliedAmount records).
 *  - the legacy "car_house" debt class being split into car/house on read and
 *    repaired in storage.
 *  - the payoff-strategy envelope migration: a legacy bare value gains an
 *    epoch stamp (so any remote edit wins LWW), and anything unrecognized
 *    fails closed to null rather than guessing a strategy.
 *
 * Storage is mocked with an in-memory map; all debtStorage logic runs real.
 */
import type { Debt, Payment } from "../../types";
import { makeDebt, makePayment } from "../../__tests__/fixtures";
import {
  addDebt,
  deleteDebt,
  deletePayment,
  getDebts,
  getDebtsIncludingDeleted,
  getPayoffStrategyEnvelope,
  getPayoffStrategyPreference,
  recordPayment,
  restoreDebt,
  restorePayment,
  saveDebts,
  savePayoffStrategyEnvelope,
  savePayoffStrategyPreference,
  updateDebt,
} from "../debtStorage";

let mockStore: Map<string, string>;

jest.mock("../encryptedStorage", () => ({
  getItem: jest.fn(async (k: string) => (mockStore.has(k) ? mockStore.get(k)! : null)),
  setItem: jest.fn(async (k: string, v: string) => {
    mockStore.set(k, v);
  }),
  removeItem: jest.fn(async (k: string) => {
    mockStore.delete(k);
  }),
  multiSet: jest.fn(async (pairs: [string, string][]) => {
    for (const [k, v] of pairs) mockStore.set(k, v);
  }),
  // Faithful read-modify-write: the real one runs the updater inside the
  // per-key write queue and skips the write on null / same-value returns.
  updateItem: jest.fn(
    async (k: string, updater: (current: string | null) => string | null) => {
      const current = mockStore.has(k) ? mockStore.get(k)! : null;
      const next = updater(current);
      if (next === null || next === current) return;
      mockStore.set(k, next);
    }
  ),
}));

const DEBTS_KEY = "@budgetark_debts";
const PAYMENTS_KEY = "@budgetark_payments";
const STRATEGY_KEY = "@budgetark_payoff_strategy";

const T0 = "2026-06-01T00:00:00.000Z";
const T1 = "2026-07-05T00:00:00.000Z";
const EPOCH = "1970-01-01T00:00:00.000Z";

const seedDebts = (debts: unknown[]) =>
  mockStore.set(DEBTS_KEY, JSON.stringify(debts));
const seedPayments = (payments: unknown[]) =>
  mockStore.set(PAYMENTS_KEY, JSON.stringify(payments));

const storedDebts = (): Debt[] => JSON.parse(mockStore.get(DEBTS_KEY) ?? "[]");
const storedPayments = (): Payment[] =>
  JSON.parse(mockStore.get(PAYMENTS_KEY) ?? "[]");

/**
 * A stored record from before cars and mortgages were separate classes.
 * Typed as a loose record because "car_house" is no longer a `DebtClass`.
 */
const carHouseRecord = (
  name: string,
  over: Record<string, unknown> = {}
): Record<string, unknown> => ({
  ...makeDebt({ id: "legacy-1", name }),
  debtClass: "car_house",
  ...over,
});

beforeEach(() => {
  mockStore = new Map();
});

describe("saveDebts preserves tombstones", () => {
  it("re-attaches a stored tombstone missing from a live-only array", async () => {
    seedDebts([
      makeDebt({ id: "d1" }),
      makeDebt({ id: "d2", deletedAt: T0, updatedAt: T0 }),
    ]);
    // What a screen holds: getDebts() output, tombstone already filtered out.
    await saveDebts([makeDebt({ id: "d1", balance: 900 })]);

    const all = storedDebts();
    expect(all.map((d) => d.id).sort()).toEqual(["d1", "d2"]);
    expect(all.find((d) => d.id === "d2")!.deletedAt).toBe(T0);
    expect(all.find((d) => d.id === "d1")!.balance).toBe(900);
  });

  it("lets an incoming live record win over a stored tombstone of the same id", async () => {
    seedDebts([makeDebt({ id: "d1", deletedAt: T0, updatedAt: T0 })]);
    await saveDebts([makeDebt({ id: "d1", updatedAt: T1 })]);

    const all = storedDebts();
    expect(all).toHaveLength(1);
    expect(all[0].deletedAt).toBeUndefined();
  });

  it("drops a stored LIVE record absent from the incoming array", async () => {
    // Deliberate: that is how cleanup paths discard corrupt records.
    seedDebts([makeDebt({ id: "d1" }), makeDebt({ id: "d2" })]);
    await saveDebts([makeDebt({ id: "d1" })]);
    expect(storedDebts().map((d) => d.id)).toEqual(["d1"]);
  });

  it("treats unparseable stored JSON as empty rather than throwing", async () => {
    mockStore.set(DEBTS_KEY, "{not json");
    await saveDebts([makeDebt({ id: "d1" })]);
    expect(storedDebts().map((d) => d.id)).toEqual(["d1"]);
  });
});

describe("debt CRUD helpers", () => {
  it("addDebt appends and returns only live debts", async () => {
    seedDebts([makeDebt({ id: "gone", deletedAt: T0, updatedAt: T0 })]);
    const live = await addDebt(makeDebt({ id: "new" }));

    expect(live.map((d) => d.id)).toEqual(["new"]);
    // The tombstone is still on disk for the next sync to emit.
    expect(
      storedDebts()
        .map((d) => d.id)
        .sort()
    ).toEqual(["gone", "new"]);
  });

  it("deleteDebt tombstones in place instead of removing the record", async () => {
    seedDebts([makeDebt({ id: "d1" }), makeDebt({ id: "d2" })]);
    const live = await deleteDebt("d1");

    expect(live.map((d) => d.id)).toEqual(["d2"]);
    const dead = storedDebts().find((d) => d.id === "d1")!;
    expect(dead.deletedAt).toBeTruthy();
    // deletedAt and updatedAt share one stamp so sync orders the delete
    // correctly against a concurrent edit.
    expect(dead.updatedAt).toBe(dead.deletedAt);
  });

  it("deleteDebt is a no-op for an unknown id", async () => {
    seedDebts([makeDebt({ id: "d1" })]);
    const live = await deleteDebt("nope");
    expect(live).toHaveLength(1);
    expect(storedDebts()[0].deletedAt).toBeUndefined();
    expect(storedDebts()[0].updatedAt).toBe(makeDebt().updatedAt);
  });

  it("updateDebt merges the partial and restamps updatedAt", async () => {
    seedDebts([
      makeDebt({ id: "d1", updatedAt: T0 }),
      makeDebt({ id: "d2", updatedAt: T0 }),
    ]);
    const live = await updateDebt("d1", { balance: 42, name: "Renamed" });

    const updated = live.find((d) => d.id === "d1")!;
    expect(updated.balance).toBe(42);
    expect(updated.name).toBe("Renamed");
    expect(updated.rate).toBe(makeDebt().rate); // untouched fields survive
    expect(updated.updatedAt).not.toBe(T0);
    // Siblings keep their stamp so they do not win LWW they never earned.
    expect(live.find((d) => d.id === "d2")!.updatedAt).toBe(T0);
  });

  it("updateDebt on an unknown id changes nothing", async () => {
    seedDebts([makeDebt({ id: "d1", updatedAt: T0 })]);
    await updateDebt("nope", { balance: 1 });
    expect(storedDebts()[0]).toEqual(makeDebt({ id: "d1", updatedAt: T0 }));
  });

  it("restoreDebt clears the tombstone and bumps updatedAt", async () => {
    seedDebts([makeDebt({ id: "d1", deletedAt: T0, updatedAt: T0 })]);
    const live = await restoreDebt("d1");

    expect(live.map((d) => d.id)).toEqual(["d1"]);
    const revived = storedDebts()[0];
    expect(revived.deletedAt).toBeUndefined();
    // The revival must win LWW against the delete the partner already has.
    expect(revived.updatedAt).not.toBe(T0);
  });

  it("restoreDebt leaves a live debt (or an unknown id) untouched", async () => {
    seedDebts([makeDebt({ id: "d1", updatedAt: T0 })]);
    await restoreDebt("d1");
    await restoreDebt("nope");
    expect(storedDebts()[0].updatedAt).toBe(T0);
  });
});

describe("restorePayment / deletePayment balance reversal", () => {
  it("round-trips a normal payment: delete adds back, restore takes it off again", async () => {
    seedDebts([makeDebt({ id: "d1", balance: 1000 })]);
    seedPayments([]);
    await recordPayment(makePayment({ id: "p1", debtId: "d1", amount: 50 }));
    expect(storedDebts()[0].balance).toBe(950);

    await deletePayment("p1");
    expect(storedDebts()[0].balance).toBe(1000);

    const result = await restorePayment("p1");
    expect(result.debts[0].balance).toBe(950);
    expect(result.payments).toHaveLength(1);
    expect(result.payments[0].deletedAt).toBeUndefined();
    expect(result.payments[0].appliedAmount).toBe(50);
  });

  it("reverses only the delta an overpayment actually applied", async () => {
    // $50 paid against a $30 balance: the balance clamps at 0, so deleting
    // the payment must add back 30, not 50.
    seedDebts([makeDebt({ id: "d1", balance: 30 })]);
    seedPayments([]);
    await recordPayment(makePayment({ id: "p1", debtId: "d1", amount: 50 }));
    expect(storedDebts()[0].balance).toBe(0);
    expect(storedPayments()[0].appliedAmount).toBe(30);

    await deletePayment("p1");
    expect(storedDebts()[0].balance).toBe(30);

    const result = await restorePayment("p1");
    expect(result.debts[0].balance).toBe(0); // clamped, not -20
    expect(result.payments[0].appliedAmount).toBe(30);
  });

  it("restamps appliedAmount with what the RESTORE applied, not the original", async () => {
    // The debt shrank while the payment sat deleted, so re-applying clamps
    // to less than it originally did.
    seedDebts([makeDebt({ id: "d1", balance: 20, updatedAt: T0 })]);
    seedPayments([
      makePayment({
        id: "p1",
        debtId: "d1",
        amount: 50,
        appliedAmount: 50,
        deletedAt: T0,
        updatedAt: T0,
      }),
    ]);

    const result = await restorePayment("p1");
    expect(result.debts[0].balance).toBe(0);
    expect(result.payments[0].appliedAmount).toBe(20);
  });

  it("falls back to `amount` when a legacy record has no appliedAmount", async () => {
    seedDebts([makeDebt({ id: "d1", balance: 950 })]);
    seedPayments([makePayment({ id: "p1", debtId: "d1", amount: 50 })]);

    const result = await deletePayment("p1");
    expect(result.debts[0].balance).toBe(1000);
  });

  it("documents the legacy fallback over-restoring a clamped overpayment", async () => {
    // Current behaviour: without appliedAmount there is no record of the
    // clamp, so the full amount is added back and the balance ends up higher
    // than was ever owed. Pre-appliedAmount data only - recordPayment has
    // stamped appliedAmount since the field was introduced.
    seedDebts([makeDebt({ id: "d1", balance: 0 })]);
    seedPayments([makePayment({ id: "p1", debtId: "d1", amount: 50 })]);

    const result = await deletePayment("p1");
    expect(result.debts[0].balance).toBe(50);
  });

  it("revives the payment with appliedAmount 0 when its debt is gone", async () => {
    seedDebts([makeDebt({ id: "d1", deletedAt: T0, updatedAt: T0 })]);
    seedPayments([
      makePayment({
        id: "p1",
        debtId: "d1",
        amount: 50,
        deletedAt: T0,
        updatedAt: T0,
      }),
    ]);

    const result = await restorePayment("p1");
    expect(result.debts).toHaveLength(0);
    expect(result.payments[0].appliedAmount).toBe(0);
    // The tombstoned debt kept its stamp - nothing was applied to it.
    expect(storedDebts()[0].updatedAt).toBe(T0);
  });

  it("is a no-op for a live payment id or an unknown one", async () => {
    seedDebts([makeDebt({ id: "d1", balance: 1000, updatedAt: T0 })]);
    seedPayments([
      makePayment({ id: "p1", debtId: "d1", amount: 50, updatedAt: T0 }),
    ]);

    await restorePayment("p1"); // not tombstoned
    await restorePayment("nope");
    expect(storedDebts()[0].balance).toBe(1000);
    expect(storedPayments()[0].updatedAt).toBe(T0);
  });
});

describe("legacy car_house debt class split on read", () => {
  it("routes a mortgage-sounding name to house and anything else to car", async () => {
    seedDebts([
      carHouseRecord("Home Mortgage", { id: "a" }),
      carHouseRecord("Subaru Loan", { id: "b" }),
      // No car/house keyword at all: the split falls back to "car", the more
      // common secured-debt case.
      carHouseRecord("Bank of Nowhere", { id: "c" }),
    ]);

    const debts = await getDebts();
    const byId = Object.fromEntries(debts.map((d) => [d.id, d.debtClass]));
    expect(byId).toEqual({ a: "house", b: "car", c: "car" });
  });

  it("repairs the stored records so the next read skips the migration", async () => {
    seedDebts([carHouseRecord("Home Mortgage")]);
    await getDebtsIncludingDeleted();

    expect(storedDebts()[0].debtClass).toBe("house");
    expect(JSON.stringify(storedDebts())).not.toContain("car_house");
  });

  it("keeps an explicit debtClassSource but infers a missing one", async () => {
    seedDebts([
      carHouseRecord("Home Mortgage", { id: "a", debtClassSource: "manual" }),
      carHouseRecord("Home Mortgage", { id: "b", debtClassSource: undefined }),
    ]);

    const debts = await getDebts();
    expect(debts.find((d) => d.id === "a")!.debtClassSource).toBe("manual");
    expect(debts.find((d) => d.id === "b")!.debtClassSource).toBe("inferred");
  });

  it("infers from the name when debtClass is missing entirely", async () => {
    const withSource: Record<string, unknown> = {
      ...makeDebt({ id: "x", name: "Toyota Auto Loan" }),
    };
    delete withSource.debtClass;
    const withoutSource: Record<string, unknown> = {
      ...makeDebt({ id: "y", name: "Toyota Auto Loan" }),
    };
    delete withoutSource.debtClass;
    delete withoutSource.debtClassSource;
    seedDebts([withSource, withoutSource]);

    const debts = await getDebts();
    expect(debts.map((d) => d.debtClass)).toEqual(["car", "car"]);
    // Documents current behaviour: normalizeDebt only rewrites
    // debtClassSource when the STORED source is itself invalid, so a record
    // whose class it just inferred can keep claiming "manual".
    expect(debts.find((d) => d.id === "x")!.debtClassSource).toBe("manual");
    expect(debts.find((d) => d.id === "y")!.debtClassSource).toBe("inferred");
  });
});

describe("payoff strategy envelope migration", () => {
  it("returns null when nothing is stored", async () => {
    await expect(getPayoffStrategyEnvelope()).resolves.toBeNull();
    await expect(getPayoffStrategyPreference()).resolves.toBeNull();
  });

  it("wraps a legacy bare value in an epoch-stamped envelope and writes it back", async () => {
    mockStore.set(STRATEGY_KEY, "snowball");

    await expect(getPayoffStrategyEnvelope()).resolves.toEqual({
      value: "snowball",
      updatedAt: EPOCH,
    });
    // Epoch means any real remote edit wins LWW on the next sync.
    expect(JSON.parse(mockStore.get(STRATEGY_KEY)!)).toEqual({
      value: "snowball",
      updatedAt: EPOCH,
    });
    // Second read takes the envelope branch, not the legacy one.
    await expect(getPayoffStrategyPreference()).resolves.toBe("snowball");
  });

  it("returns a well-formed envelope untouched", async () => {
    const envelope = { value: "avalanche", updatedAt: T1 };
    mockStore.set(STRATEGY_KEY, JSON.stringify(envelope));
    await expect(getPayoffStrategyEnvelope()).resolves.toEqual(envelope);
  });

  it.each([
    ["an unrecognized bare string", "aggressive"],
    ["malformed JSON", "{value:"],
    [
      "an envelope with an invalid strategy",
      '{"value":"aggressive","updatedAt":"2026-07-05T00:00:00.000Z"}',
    ],
    ["an envelope with a non-string updatedAt", '{"value":"custom","updatedAt":123}'],
    ["an envelope missing updatedAt", '{"value":"custom"}'],
    ["a JSON scalar", "42"],
    ["JSON null", "null"],
  ])("fails closed to null on %s", async (_label, raw) => {
    mockStore.set(STRATEGY_KEY, raw);
    await expect(getPayoffStrategyEnvelope()).resolves.toBeNull();
    await expect(getPayoffStrategyPreference()).resolves.toBeNull();
  });

  it("stamps a fresh timestamp on a local save but preserves an incoming peer's", async () => {
    await savePayoffStrategyPreference("custom");
    const local = await getPayoffStrategyEnvelope();
    expect(local!.value).toBe("custom");
    expect(local!.updatedAt).not.toBe(EPOCH);
    expect(Number.isNaN(Date.parse(local!.updatedAt))).toBe(false);

    await savePayoffStrategyEnvelope({ value: "avalanche", updatedAt: T0 });
    await expect(getPayoffStrategyEnvelope()).resolves.toEqual({
      value: "avalanche",
      updatedAt: T0,
    });
  });
});

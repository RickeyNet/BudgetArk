import {
  buildRentRoll,
  buildTenant,
  buildTenantLedger,
  businessTenants,
  isRentPayment,
  isTenantsValue,
  isValidTenant,
  lastDueMonth,
  normalizeRentTerms,
  removeTenant,
  rentForMonth,
  resolveTenantId,
  setRentFrom,
  upsertTenant,
} from "../tenants";
import type { BudgetEntry, Tenant } from "../../types";
import { MAX_TENANTS_PER_BUSINESS } from "../../types";

const tenant = (over: Partial<Tenant> = {}): Tenant => ({
  id: "t1",
  name: "Sam",
  rents: [{ from: "2026-01", amount: 1000 }],
  createdAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

const payment = (over: Partial<BudgetEntry> = {}): BudgetEntry => ({
  id: "p1",
  type: "income",
  category: "Other",
  amount: 1000,
  date: "2026-01-03T12:00:00.000Z",
  createdAt: "2026-01-03T12:00:00.000Z",
  updatedAt: "2026-01-03T12:00:00.000Z",
  businessId: "house",
  tenantId: "t1",
  ...over,
});

// Local-time constructor: the ledger reads the wall clock.
const day = (y: number, m: number, d: number): Date => new Date(y, m - 1, d, 12);

describe("isValidTenant", () => {
  it("accepts a well-formed tenant and rejects malformed ones", () => {
    expect(isValidTenant(tenant())).toBe(true);
    expect(isValidTenant(tenant({ dueDay: 31, openingBalance: 0, endMonth: "2026-12" }))).toBe(true);
    expect(isValidTenant(tenant({ rents: [] }))).toBe(false);
    expect(isValidTenant(tenant({ rents: [{ from: "2026-13", amount: 5 }] }))).toBe(false);
    expect(isValidTenant(tenant({ rents: [{ from: "2026-01", amount: -1 }] }))).toBe(false);
    expect(isValidTenant(tenant({ name: "  " }))).toBe(false);
    expect(isValidTenant(tenant({ dueDay: 0 }))).toBe(false);
    expect(isValidTenant(tenant({ dueDay: 1.5 }))).toBe(false);
    expect(isValidTenant(tenant({ openingBalance: Number.NaN }))).toBe(false);
    expect(isValidTenant(tenant({ endMonth: "soon" }))).toBe(false);
    expect(isValidTenant({ ...tenant(), createdAt: "nope" })).toBe(false);
    expect(isValidTenant(null)).toBe(false);
  });

  it("bounds the list and skips invalid records when reading", () => {
    expect(isTenantsValue(undefined)).toBe(true);
    expect(isTenantsValue([tenant()])).toBe(true);
    expect(isTenantsValue("x")).toBe(false);
    expect(isTenantsValue([tenant(), { id: "bad" }])).toBe(false);
    expect(
      isTenantsValue(
        Array.from({ length: MAX_TENANTS_PER_BUSINESS + 1 }, (_, i) => tenant({ id: `t${i}` }))
      )
    ).toBe(false);
    const mixed = [tenant(), { id: "bad" }] as unknown as Tenant[];
    expect(businessTenants({ tenants: mixed }).map((t) => t.id)).toEqual(["t1"]);
    expect(businessTenants(undefined)).toEqual([]);
  });
});

describe("rent terms", () => {
  it("sorts, dedupes by month and rounds", () => {
    expect(
      normalizeRentTerms([
        { from: "2026-06", amount: 1100.004 },
        { from: "2026-01", amount: 1000 },
        { from: "2026-06", amount: 1150 },
      ])
    ).toEqual([
      { from: "2026-01", amount: 1000 },
      { from: "2026-06", amount: 1150 },
    ]);
  });

  it("applies a rent increase from its month only", () => {
    const rents = setRentFrom([{ from: "2026-01", amount: 1000 }], "2026-04", 1200);
    const t = tenant({ rents });
    expect(rentForMonth(t, "2025-12")).toBe(0);
    expect(rentForMonth(t, "2026-03")).toBe(1000);
    expect(rentForMonth(t, "2026-04")).toBe(1200);
    expect(rentForMonth(t, "2027-01")).toBe(1200);
  });
});

describe("buildTenant / upsert / remove", () => {
  it("cleans form input into a stored tenant", () => {
    const built = buildTenant({
      id: "t9",
      name: "  Sam   Lee ",
      rents: [{ from: "2026-02", amount: 950.5 }],
      dueDay: 1,
      openingBalance: 0,
      createdAt: "2026-02-01T00:00:00.000Z",
    });
    expect(built).toEqual({
      id: "t9",
      name: "Sam Lee",
      rents: [{ from: "2026-02", amount: 950.5 }],
      createdAt: "2026-02-01T00:00:00.000Z",
    });
  });

  it("keeps a non-default due day, opening balance and move-out month", () => {
    const built = buildTenant({
      id: "t9",
      name: "Sam",
      rents: [{ from: "2026-02", amount: 900 }],
      dueDay: 5,
      openingBalance: 300,
      endMonth: "2026-08",
      createdAt: "2026-02-01T00:00:00.000Z",
    });
    expect(built).toMatchObject({ dueDay: 5, openingBalance: 300, endMonth: "2026-08" });
  });

  it("refuses a nameless tenant, no rent, or a move-out before the first month", () => {
    const base = { id: "t9", createdAt: "2026-02-01T00:00:00.000Z" };
    expect(buildTenant({ ...base, name: " ", rents: [{ from: "2026-02", amount: 1 }] })).toBeNull();
    expect(buildTenant({ ...base, name: "Sam", rents: [] })).toBeNull();
    expect(
      buildTenant({
        ...base,
        name: "Sam",
        rents: [{ from: "2026-02", amount: 1 }],
        endMonth: "2026-01",
      })
    ).toBeNull();
  });

  it("upserts by id, caps the list and removes", () => {
    const list = [tenant()];
    expect(upsertTenant(list, tenant({ name: "Sam L" }))).toEqual([tenant({ name: "Sam L" })]);
    expect(upsertTenant(list, tenant({ id: "t2" }))?.map((t) => t.id)).toEqual(["t1", "t2"]);
    const full = Array.from({ length: MAX_TENANTS_PER_BUSINESS }, (_, i) => tenant({ id: `x${i}` }));
    expect(upsertTenant(full, tenant({ id: "new" }))).toBeNull();
    expect(removeTenant(list, "t1")).toEqual([]);
  });
});

describe("lastDueMonth", () => {
  it("charges the month once its due day arrives", () => {
    expect(lastDueMonth({ dueDay: 5 }, day(2026, 3, 4))).toBe("2026-02");
    expect(lastDueMonth({ dueDay: 5 }, day(2026, 3, 5))).toBe("2026-03");
    expect(lastDueMonth({}, day(2026, 1, 1))).toBe("2026-01");
    expect(lastDueMonth({ dueDay: 15 }, day(2026, 1, 3))).toBe("2025-12");
  });

  it("clamps a late due day in a short month", () => {
    expect(lastDueMonth({ dueDay: 31 }, day(2026, 4, 29))).toBe("2026-03");
    expect(lastDueMonth({ dueDay: 31 }, day(2026, 4, 30))).toBe("2026-04");
  });
});

describe("isRentPayment", () => {
  it("counts only live one-off earned income for this business and tenant", () => {
    expect(isRentPayment(payment(), "house", "t1")).toBe(true);
    expect(isRentPayment(payment({ tenantId: "t2" }), "house", "t1")).toBe(false);
    expect(isRentPayment(payment({ businessId: "other" }), "house", "t1")).toBe(false);
    expect(isRentPayment(payment({ recurring: true }), "house", "t1")).toBe(false);
    expect(isRentPayment(payment({ refund: true }), "house", "t1")).toBe(false);
    expect(isRentPayment(payment({ type: "expense" }), "house", "t1")).toBe(false);
    expect(
      isRentPayment(payment({ deletedAt: "2026-01-05T00:00:00.000Z" }), "house", "t1")
    ).toBe(false);
  });
});

describe("buildTenantLedger", () => {
  it("shows a tenant who pays in full as paid up", () => {
    const ledger = buildTenantLedger(
      tenant(),
      "house",
      [payment({ id: "a" }), payment({ id: "b", date: "2026-02-02T12:00:00.000Z" })],
      day(2026, 2, 10)
    );
    expect(ledger).toMatchObject({ charged: 2000, paid: 2000, outstanding: 0, credit: 0 });
    expect(ledger.months.map((m) => m.status)).toEqual(["paid", "paid"]);
    expect(ledger.unpaidMonthCount).toBe(0);
  });

  it("carries a short payment forward as rent still owed", () => {
    const ledger = buildTenantLedger(
      tenant(),
      "house",
      [payment({ id: "a", amount: 600 })],
      day(2026, 1, 20)
    );
    expect(ledger.outstanding).toBe(400);
    expect(ledger.months).toEqual([
      { monthKey: "2026-01", rent: 1000, paid: 600, outstanding: 400, status: "partial" },
    ]);
  });

  it("applies payments to the oldest month first", () => {
    const ledger = buildTenantLedger(
      tenant(),
      "house",
      [
        payment({ id: "a", amount: 600 }),
        payment({ id: "b", amount: 1000, date: "2026-02-03T12:00:00.000Z" }),
      ],
      day(2026, 3, 2)
    );
    // 3 months charged (3000), 1600 received: Jan paid, Feb part, Mar unpaid.
    expect(ledger.outstanding).toBe(1400);
    expect(ledger.months.map((m) => [m.monthKey, m.status, m.outstanding])).toEqual([
      ["2026-01", "paid", 0],
      ["2026-02", "partial", 400],
      ["2026-03", "unpaid", 1000],
    ]);
    expect(ledger.unpaidMonthCount).toBe(2);
    expect(ledger.payments.map((p) => p.id)).toEqual(["b", "a"]);
  });

  it("does not charge a month before its due day", () => {
    const ledger = buildTenantLedger(tenant({ dueDay: 10 }), "house", [], day(2026, 2, 9));
    expect(ledger.months.map((m) => m.monthKey)).toEqual(["2026-01"]);
    expect(ledger.outstanding).toBe(1000);
  });

  it("charges nothing before the tenant's first month", () => {
    const ledger = buildTenantLedger(
      tenant({ rents: [{ from: "2026-06", amount: 1000 }] }),
      "house",
      [],
      day(2026, 3, 15)
    );
    expect(ledger.months).toEqual([]);
    expect(ledger.outstanding).toBe(0);
  });

  it("holds an overpayment as credit toward coming months", () => {
    const ledger = buildTenantLedger(
      tenant(),
      "house",
      [payment({ amount: 1500 })],
      day(2026, 1, 20)
    );
    expect(ledger).toMatchObject({ outstanding: 0, credit: 500 });
    const february = buildTenantLedger(
      tenant(),
      "house",
      [payment({ amount: 1500 })],
      day(2026, 2, 20)
    );
    expect(february).toMatchObject({ outstanding: 500, credit: 0 });
    expect(february.months[1]).toMatchObject({ paid: 500, status: "partial" });
  });

  it("pays down an opening balance before any month", () => {
    const ledger = buildTenantLedger(
      tenant({ openingBalance: 300 }),
      "house",
      [payment({ amount: 1000 })],
      day(2026, 1, 20)
    );
    expect(ledger).toMatchObject({
      openingBalance: 300,
      openingOutstanding: 0,
      outstanding: 300,
    });
    expect(ledger.months[0]).toMatchObject({ paid: 700, outstanding: 300 });
  });

  it("charges each month at the rent in effect then", () => {
    const ledger = buildTenantLedger(
      tenant({
        rents: [
          { from: "2026-01", amount: 1000 },
          { from: "2026-03", amount: 1200 },
        ],
      }),
      "house",
      [],
      day(2026, 3, 15)
    );
    expect(ledger.months.map((m) => m.rent)).toEqual([1000, 1000, 1200]);
    expect(ledger.charged).toBe(3200);
  });

  it("stops charging after the tenant moves out but keeps the debt", () => {
    const ledger = buildTenantLedger(
      tenant({ endMonth: "2026-02" }),
      "house",
      [payment()],
      day(2026, 6, 15)
    );
    expect(ledger.months.map((m) => m.monthKey)).toEqual(["2026-01", "2026-02"]);
    expect(ledger).toMatchObject({ outstanding: 1000, movedOut: true });
  });

  it("ignores other tenants' payments, estimates and refunds", () => {
    const ledger = buildTenantLedger(
      tenant(),
      "house",
      [
        payment({ id: "x", tenantId: "t2" }),
        payment({ id: "y", recurring: true }),
        payment({ id: "z", refund: true }),
      ],
      day(2026, 1, 20)
    );
    expect(ledger.paid).toBe(0);
    expect(ledger.outstanding).toBe(1000);
  });
});

describe("buildRentRoll", () => {
  it("totals what every tenant owes, biggest balance first", () => {
    const roll = buildRentRoll(
      {
        id: "house",
        tenants: [
          tenant({ id: "t1", name: "Sam" }),
          tenant({ id: "t2", name: "Alex", rents: [{ from: "2026-01", amount: 800 }] }),
          tenant({ id: "t3", name: "Gone", endMonth: "2025-12", rents: [{ from: "2025-12", amount: 500 }] }),
        ],
      },
      [payment({ id: "a", tenantId: "t1" }), payment({ id: "b", tenantId: "t3", amount: 500, date: "2025-12-02T12:00:00.000Z" })],
      day(2026, 1, 20)
    );
    expect(roll.ledgers.map((l) => [l.tenant.name, l.outstanding])).toEqual([
      ["Alex", 800],
      ["Gone", 0],
      ["Sam", 0],
    ]);
    expect(roll.totalOutstanding).toBe(800);
    expect(roll.monthlyRent).toBe(1800);
  });

  it("is empty for a business without tenants", () => {
    expect(buildRentRoll({ id: "llc" }, [payment()])).toMatchObject({
      ledgers: [],
      totalOutstanding: 0,
      monthlyRent: 0,
    });
  });
});

describe("resolveTenantId", () => {
  const business = { tenants: [tenant()] };
  it("keeps a real tenant on income only", () => {
    expect(resolveTenantId("t1", business, { type: "income" })).toBe("t1");
    expect(resolveTenantId("t1", business, { type: "expense" })).toBeUndefined();
    expect(resolveTenantId("t1", business, { type: "income", refund: true })).toBeUndefined();
    expect(resolveTenantId("gone", business, { type: "income" })).toBeUndefined();
    expect(resolveTenantId("t1", undefined, { type: "income" })).toBeUndefined();
    expect(resolveTenantId(null, business, { type: "income" })).toBeUndefined();
  });
});

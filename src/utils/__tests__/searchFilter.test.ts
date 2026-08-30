/**
 * BudgetArk - tests for the global search & advanced filter engine.
 *
 * Pins the deliberate filter semantics: entry-type/category filters narrow
 * results to budget entries, a date range hides standing debts (their
 * payments still surface), tombstones never match, and per-group caps
 * report pre-cap totals.
 */

import type { BudgetEntry, Debt, Payment } from "../../types";
import {
  DEFAULT_SEARCH_FILTERS,
  DELETED_DEBT_NAME,
  MAX_RESULTS_PER_GROUP,
  collectEntryCategories,
  countActiveFilters,
  hasActiveSearch,
  searchRecords,
  type SearchFilters,
} from "../searchFilter";

const NOW = new Date("2026-07-20T12:00:00");

let nextId = 0;
const id = () => `id-${++nextId}`;

const makeDebt = (overrides: Partial<Debt> = {}): Debt => ({
  id: id(),
  name: "Chase Visa",
  balance: 1200,
  originalBalance: 2000,
  rate: 19.9,
  minPayment: 50,
  owner: "mine",
  debtClass: "personal_credit",
  debtClassSource: "manual",
  createdAt: "2026-01-01T12:00:00",
  updatedAt: "2026-01-01T12:00:00",
  ...overrides,
});

const makePayment = (overrides: Partial<Payment> = {}): Payment => ({
  id: id(),
  debtId: "debt-1",
  amount: 100,
  date: "2026-07-10T12:00:00",
  updatedAt: "2026-07-10T12:00:00",
  ...overrides,
});

const makeEntry = (overrides: Partial<BudgetEntry> = {}): BudgetEntry => ({
  id: id(),
  type: "expense",
  category: "Grocery",
  amount: 45.5,
  date: "2026-07-08T12:00:00",
  createdAt: "2026-07-08T12:00:00",
  updatedAt: "2026-07-08T12:00:00",
  ...overrides,
});

const filters = (overrides: Partial<SearchFilters> = {}): SearchFilters => ({
  ...DEFAULT_SEARCH_FILTERS,
  ...overrides,
});

const search = (
  data: { debts?: Debt[]; payments?: Payment[]; entries?: BudgetEntry[] },
  f: SearchFilters
) =>
  searchRecords(
    { debts: data.debts ?? [], payments: data.payments ?? [], entries: data.entries ?? [] },
    f,
    NOW
  );

describe("hasActiveSearch / countActiveFilters", () => {
  it("is inactive with defaults and a blank/whitespace query", () => {
    expect(hasActiveSearch(filters())).toBe(false);
    expect(hasActiveSearch(filters({ query: "   " }))).toBe(false);
  });

  it("activates on query text or any non-default filter", () => {
    expect(hasActiveSearch(filters({ query: "visa" }))).toBe(true);
    expect(hasActiveSearch(filters({ scope: "debts" }))).toBe(true);
    expect(hasActiveSearch(filters({ datePreset: "30d" }))).toBe(true);
    expect(hasActiveSearch(filters({ amountMin: 10 }))).toBe(true);
  });

  it("counts each non-default filter once, excluding the query", () => {
    expect(countActiveFilters(filters({ query: "visa" }))).toBe(0);
    expect(
      countActiveFilters(
        filters({
          scope: "entries",
          entryType: "expense",
          categories: ["Grocery"],
          datePreset: "90d",
          amountMin: 1,
          amountMax: 100,
        })
      )
    ).toBe(6);
  });
});

describe("inactive search", () => {
  it("returns empty groups instead of dumping every record", () => {
    const result = search(
      { debts: [makeDebt()], payments: [makePayment()], entries: [makeEntry()] },
      filters()
    );
    expect(result.totals.overall).toBe(0);
    expect(result.debts).toHaveLength(0);
    expect(result.payments).toHaveLength(0);
    expect(result.entries).toHaveLength(0);
  });
});

describe("query matching", () => {
  it("matches debts by name, case-insensitive, all tokens required", () => {
    const chase = makeDebt({ name: "Chase Visa" });
    const carLoan = makeDebt({ name: "Car Loan", debtClass: "car" });
    const result = search({ debts: [chase, carLoan] }, filters({ query: "chase VISA" }));
    expect(result.debts.map((d) => d.id)).toEqual([chase.id]);
  });

  it("matches debts by owner and class labels", () => {
    const partnerCard = makeDebt({ name: "Amex", owner: "partner" });
    const mortgage = makeDebt({ name: "Home", debtClass: "house" });
    expect(
      search({ debts: [partnerCard, mortgage] }, filters({ query: "partner" })).debts
    ).toHaveLength(1);
    expect(
      search({ debts: [partnerCard, mortgage] }, filters({ query: "mortgage" })).debts
    ).toHaveLength(1);
  });

  it("matches payments through the parent debt's name", () => {
    const debt = makeDebt({ id: "debt-1", name: "Chase Visa" });
    const other = makeDebt({ id: "debt-2", name: "Car Loan", debtClass: "car" });
    const onChase = makePayment({ debtId: "debt-1" });
    const onCar = makePayment({ debtId: "debt-2" });
    const result = search(
      { debts: [debt, other], payments: [onChase, onCar] },
      filters({ query: "chase", scope: "payments" })
    );
    expect(result.payments.map((h) => h.payment.id)).toEqual([onChase.id]);
    expect(result.payments[0].debtName).toBe("Chase Visa");
  });

  it("labels payments to a missing or tombstoned debt as deleted", () => {
    const gone = makeDebt({ id: "debt-gone", deletedAt: "2026-06-01T00:00:00" });
    const orphan = makePayment({ debtId: "debt-gone" });
    const result = search(
      { debts: [gone], payments: [orphan] },
      filters({ query: "deleted", scope: "payments" })
    );
    expect(result.payments).toHaveLength(1);
    expect(result.payments[0].debtName).toBe(DELETED_DEBT_NAME);
  });

  it("matches entries by description, category, and merchant", () => {
    const coffee = makeEntry({ description: "Morning coffee", category: "Restaurant" });
    const grocery = makeEntry({ category: "Grocery" });
    const costco = makeEntry({ merchant: "costco", category: "Shopping" });
    const data = { entries: [coffee, grocery, costco] };
    expect(search(data, filters({ query: "coffee" })).entries).toEqual([coffee]);
    expect(search(data, filters({ query: "grocery" })).entries).toEqual([grocery]);
    expect(search(data, filters({ query: "costco" })).entries).toEqual([costco]);
  });

  it("matches amounts and dates as plain digit strings", () => {
    const entry = makeEntry({ amount: 45.5, date: "2026-05-08T12:00:00" });
    expect(search({ entries: [entry] }, filters({ query: "45.5" })).entries).toHaveLength(1);
    expect(search({ entries: [entry] }, filters({ query: "2026-05" })).entries).toHaveLength(1);
    expect(search({ entries: [entry] }, filters({ query: "99.99" })).entries).toHaveLength(0);
  });

  it("never matches tombstoned records", () => {
    const deletedDebt = makeDebt({ deletedAt: "2026-06-01T00:00:00" });
    const deletedPayment = makePayment({ deletedAt: "2026-06-01T00:00:00" });
    const deletedEntry = makeEntry({
      description: "ghost",
      deletedAt: "2026-06-01T00:00:00",
    });
    const result = search(
      { debts: [deletedDebt], payments: [deletedPayment], entries: [deletedEntry] },
      filters({ query: "a", amountMin: 0 })
    );
    expect(result.totals.overall).toBe(0);
  });
});

describe("scope", () => {
  const data = {
    debts: [makeDebt({ id: "debt-1" })],
    payments: [makePayment({ debtId: "debt-1" })],
    entries: [makeEntry()],
  };

  it("narrows to a single collection", () => {
    const debtsOnly = search(data, filters({ scope: "debts", amountMin: 0 }));
    expect(debtsOnly.totals).toMatchObject({ debts: 1, payments: 0, entries: 0 });

    const paymentsOnly = search(data, filters({ scope: "payments", amountMin: 0 }));
    expect(paymentsOnly.totals).toMatchObject({ debts: 0, payments: 1, entries: 0 });

    const entriesOnly = search(data, filters({ scope: "entries", amountMin: 0 }));
    expect(entriesOnly.totals).toMatchObject({ debts: 0, payments: 0, entries: 1 });
  });
});

describe("entry-only filters narrow results to entries", () => {
  const data = {
    debts: [makeDebt({ id: "debt-1" })],
    payments: [makePayment({ debtId: "debt-1" })],
    entries: [
      makeEntry({ type: "income", category: "Salary", description: "Paycheck" }),
      makeEntry({ type: "expense", category: "Grocery" }),
    ],
  };

  it("entryType hides debts and payments", () => {
    const result = search(data, filters({ entryType: "income" }));
    expect(result.totals).toMatchObject({ debts: 0, payments: 0, entries: 1 });
    expect(result.entries[0].type).toBe("income");
  });

  it("categories hide debts and payments and filter entries", () => {
    const result = search(data, filters({ categories: ["Grocery"] }));
    expect(result.totals).toMatchObject({ debts: 0, payments: 0, entries: 1 });
    expect(result.entries[0].category).toBe("Grocery");
  });
});

describe("date range", () => {
  it("filters payments and entries by preset cutoff", () => {
    const recent = makePayment({ date: "2026-07-15T12:00:00" });
    const old = makePayment({ date: "2026-04-01T12:00:00" });
    const result = search(
      { payments: [recent, old] },
      filters({ scope: "payments", datePreset: "30d" })
    );
    expect(result.payments.map((h) => h.payment.id)).toEqual([recent.id]);
  });

  it("'This year' starts at Jan 1 of the reference year", () => {
    const january = makeEntry({ date: "2026-01-02T12:00:00" });
    const lastYear = makeEntry({ date: "2025-12-30T12:00:00" });
    const result = search(
      { entries: [january, lastYear] },
      filters({ scope: "entries", datePreset: "year" })
    );
    expect(result.entries).toEqual([january]);
  });

  it("hides standing debts while active - their payments still surface", () => {
    const debt = makeDebt({ id: "debt-1", name: "Chase Visa" });
    const payment = makePayment({ debtId: "debt-1", date: "2026-07-15T12:00:00" });
    const result = search(
      { debts: [debt], payments: [payment] },
      filters({ query: "chase", datePreset: "30d" })
    );
    expect(result.totals.debts).toBe(0);
    expect(result.totals.payments).toBe(1);
  });

  it("fails closed on unparseable dates", () => {
    const broken = makeEntry({ date: "not-a-date" });
    const active = search(
      { entries: [broken] },
      filters({ scope: "entries", datePreset: "30d" })
    );
    expect(active.entries).toHaveLength(0);
    // Without a date filter the record still lists.
    const anyTime = search({ entries: [broken] }, filters({ scope: "entries" }));
    expect(anyTime.entries).toHaveLength(1);
  });
});

describe("amount range", () => {
  it("applies inclusive bounds to entry and payment amounts", () => {
    const small = makeEntry({ amount: 10 });
    const mid = makeEntry({ amount: 50 });
    const large = makeEntry({ amount: 500 });
    const result = search(
      { entries: [small, mid, large] },
      filters({ scope: "entries", amountMin: 10, amountMax: 50 })
    );
    expect(result.entries.map((e) => e.amount).sort((a, b) => a - b)).toEqual([10, 50]);
  });

  it("applies to a debt's current balance", () => {
    const big = makeDebt({ balance: 10_000 });
    const smallDebt = makeDebt({ balance: 300 });
    const result = search(
      { debts: [big, smallDebt] },
      filters({ scope: "debts", amountMax: 1000 })
    );
    expect(result.debts.map((d) => d.id)).toEqual([smallDebt.id]);
  });
});

describe("ordering and caps", () => {
  it("sorts payments and entries newest-first", () => {
    const older = makeEntry({ date: "2026-06-01T12:00:00" });
    const newer = makeEntry({ date: "2026-07-01T12:00:00" });
    const result = search({ entries: [older, newer] }, filters({ scope: "entries" }));
    expect(result.entries.map((e) => e.id)).toEqual([newer.id, older.id]);
  });

  it("sorts debts active-first by balance, paid-off last", () => {
    const paidOff = makeDebt({ balance: 0 });
    const small = makeDebt({ balance: 100 });
    const large = makeDebt({ balance: 9000 });
    const result = search(
      { debts: [paidOff, small, large] },
      filters({ scope: "debts", amountMin: 0 })
    );
    expect(result.debts.map((d) => d.id)).toEqual([large.id, small.id, paidOff.id]);
  });

  it("caps each group but reports pre-cap totals", () => {
    const entries = Array.from({ length: MAX_RESULTS_PER_GROUP + 10 }, (_, i) =>
      makeEntry({ date: `2026-06-${String((i % 28) + 1).padStart(2, "0")}T12:00:00` })
    );
    const result = search({ entries }, filters({ scope: "entries" }));
    expect(result.entries).toHaveLength(MAX_RESULTS_PER_GROUP);
    expect(result.totals.entries).toBe(MAX_RESULTS_PER_GROUP + 10);
  });
});

describe("collectEntryCategories", () => {
  it("dedupes, sorts, and skips tombstoned entries", () => {
    const categories = collectEntryCategories([
      makeEntry({ category: "Grocery" }),
      makeEntry({ category: "Grocery" }),
      makeEntry({ category: "Coffee Shops" }),
      makeEntry({ category: "Salary", type: "income" }),
      makeEntry({ category: "Ghost", deletedAt: "2026-06-01T00:00:00" }),
    ]);
    expect(categories).toEqual(["Coffee Shops", "Grocery", "Salary"]);
  });
});

import { applyMissedRecurringLinkedAccountContributions as applyMissed } from "../linkedAccountRecurring";

// ts-jest is transpile-only; light `as any` casts keep fixtures concise.
const entry = (over: Record<string, unknown> = {}): any => ({
  id: "e1",
  type: "expense",
  category: "Savings",
  amount: 100,
  date: "2026-01-15",
  recurring: true,
  recurrenceInterval: 1,
  linkedAccountId: "a1",
  ...over,
});

const account = (over: Record<string, unknown> = {}): any => ({
  id: "a1",
  name: "Brokerage",
  category: "investment",
  balance: 500,
  updatedAt: "2020-01-01T00:00:00.000Z",
  ...over,
});

// April 2026, in UTC (the module buckets months by UTC).
const APRIL = new Date(Date.UTC(2026, 3, 10));

describe("applyMissedRecurringLinkedAccountContributions", () => {
  it("credits the linked account for each missed monthly cycle", () => {
    const entries = [entry()]; // started Jan, never applied
    const accounts = [account({ balance: 500 })];
    const result = applyMissed(entries, accounts, APRIL);

    // Feb + Mar + Apr = 3 cycles * 100
    expect(result.changed).toBe(true);
    expect(result.assetAccounts[0].balance).toBe(800);
    expect(result.entries[0].lastAppliedMonth).toBe("2026-04");
  });

  it("stamps updatedAt on a credited account", () => {
    const result = applyMissed([entry()], [account()], APRIL);
    expect(result.assetAccounts[0].updatedAt).not.toBe("2020-01-01T00:00:00.000Z");
    expect(Date.parse(result.assetAccounts[0].updatedAt as string)).not.toBeNaN();
  });

  it("does not mutate the input entries or accounts", () => {
    const entries = [entry()];
    const accounts = [account({ balance: 500 })];
    applyMissed(entries, accounts, APRIL);
    expect(accounts[0].balance).toBe(500);
    expect(entries[0].lastAppliedMonth).toBeUndefined();
  });

  it("aggregates multiple entries linked to the same account", () => {
    const entries = [
      entry({ id: "e1", amount: 100 }),
      entry({ id: "e2", amount: 50 }),
    ];
    const result = applyMissed(entries, [account({ balance: 0 })], APRIL);
    // each: Feb+Mar+Apr = 3 cycles -> (100+50)*3 = 450
    expect(result.assetAccounts[0].balance).toBe(450);
  });

  it("is a no-op (same references) when nothing is recurring or linked", () => {
    const entries = [entry({ recurring: false })];
    const accounts = [account()];
    const result = applyMissed(entries, accounts, APRIL);
    expect(result.changed).toBe(false);
    expect(result.entries).toBe(entries);
    expect(result.assetAccounts).toBe(accounts);
  });

  it("skips an entry whose linked account no longer exists (keeps catch-up pending)", () => {
    const entries = [entry({ linkedAccountId: "ghost" })];
    const accounts = [account({ id: "a1" })];
    const result = applyMissed(entries, accounts, APRIL);
    expect(result.changed).toBe(false);
    expect(result.assetAccounts[0].balance).toBe(500);
    // marker left untouched so a future relink can still apply the misses
    expect(result.entries[0].lastAppliedMonth).toBeUndefined();
  });

  it("skips an entry already applied this month", () => {
    const entries = [entry({ lastAppliedMonth: "2026-04" })];
    const result = applyMissed(entries, [account()], APRIL);
    expect(result.changed).toBe(false);
    expect(result.assetAccounts[0].balance).toBe(500);
  });

  it("advances the marker without crediting when no cycle lands in the gap", () => {
    // Quarterly entry started Jan; between Jan and Feb no new cycle lands.
    const entries = [
      entry({ recurrenceInterval: 3, date: "2026-01-15", lastAppliedMonth: "2026-01" }),
    ];
    const accounts = [account({ balance: 500 })];
    const result = applyMissed(entries, accounts, new Date(Date.UTC(2026, 1, 10)));
    expect(result.changed).toBe(true);
    expect(result.assetAccounts[0].balance).toBe(500); // no credit
    expect(result.entries[0].lastAppliedMonth).toBe("2026-02"); // marker advanced
  });

  it("resumes from lastAppliedMonth rather than the entry start", () => {
    // Already applied through Feb; only Mar + Apr remain = 2 cycles.
    const entries = [entry({ lastAppliedMonth: "2026-02" })];
    const result = applyMissed(entries, [account({ balance: 0 })], APRIL);
    expect(result.assetAccounts[0].balance).toBe(200);
  });
});

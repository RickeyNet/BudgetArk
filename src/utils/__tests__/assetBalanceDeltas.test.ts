/**
 * applyBalanceDeltas is the pure half of "this budget entry moved money
 * in/out of a linked account". It must net per-account, stamp updatedAt
 * only on accounts it actually touched (so an untouched account never
 * wins a last-write-wins merge it didn't earn), ignore unknown ids, and
 * return the same reference when there is nothing to do so callers can
 * skip the write.
 */
import type { AssetAccount } from "../../types";
import { applyBalanceDeltas, netBalanceDeltas } from "../assetBalanceDeltas";

const T0 = "2026-01-01T00:00:00.000Z";
const NOW = "2026-08-26T12:00:00.000Z";

const account = (over: Partial<AssetAccount> = {}): AssetAccount => ({
  id: "a1",
  name: "Checking",
  category: "savings",
  balance: 100,
  createdAt: T0,
  updatedAt: T0,
  ...over,
});

describe("netBalanceDeltas", () => {
  it("sums per account and drops zero-net and non-finite amounts", () => {
    const totals = netBalanceDeltas([
      { accountId: "a1", amount: 10 },
      { accountId: "a1", amount: -4 },
      { accountId: "a2", amount: 5 },
      { accountId: "a2", amount: -5 },
      { accountId: "a3", amount: Number.NaN },
    ]);
    expect(Array.from(totals.entries())).toEqual([["a1", 6]]);
  });
});

describe("applyBalanceDeltas", () => {
  it("shifts only the affected accounts and stamps their updatedAt", () => {
    const accounts = [account(), account({ id: "a2", name: "Savings", balance: 500 })];
    const next = applyBalanceDeltas(accounts, [{ accountId: "a1", amount: -25 }], NOW);

    expect(next).not.toBe(accounts);
    expect(next[0]).toEqual({ ...accounts[0], balance: 75, updatedAt: NOW });
    // Untouched account keeps its identity and its old updatedAt.
    expect(next[1]).toBe(accounts[1]);
    expect(next[1].updatedAt).toBe(T0);
  });

  it("nets several deltas onto one account", () => {
    const next = applyBalanceDeltas(
      [account()],
      [
        { accountId: "a1", amount: 10 },
        { accountId: "a1", amount: 15 },
        { accountId: "a1", amount: -5 },
      ],
      NOW
    );
    expect(next[0].balance).toBe(120);
  });

  it("returns the same array when there is nothing to apply", () => {
    const accounts = [account()];
    expect(applyBalanceDeltas(accounts, [], NOW)).toBe(accounts);
    // Delta for an account this device doesn't have (deleted on partner).
    expect(applyBalanceDeltas(accounts, [{ accountId: "ghost", amount: 9 }], NOW)).toBe(
      accounts
    );
    // Deltas that cancel out.
    expect(
      applyBalanceDeltas(
        accounts,
        [
          { accountId: "a1", amount: 9 },
          { accountId: "a1", amount: -9 },
        ],
        NOW
      )
    ).toBe(accounts);
  });

  it("does not mutate its input", () => {
    const accounts = [account()];
    applyBalanceDeltas(accounts, [{ accountId: "a1", amount: 50 }], NOW);
    expect(accounts[0].balance).toBe(100);
    expect(accounts[0].updatedAt).toBe(T0);
  });
});

/**
 * BudgetArk - Credit-Card Balance Planner Tests
 * File: src/services/connections/__tests__/debtBalances.test.ts
 *
 * Pins the bank -> Debt-tab balance rules: sign-tolerant magnitude, cent
 * rounding, the originalBalance high-water mark, unchanged-skip, and the
 * link/debt gating (off toggle, missing/deleted debt, unfetched account).
 */

import { makeDebt, makeExternalAccountLink } from "../../../__tests__/fixtures";
import type { NormalizedAccount } from "../types";
import {
  debtBalanceFromProvider,
  debtFieldsForProviderBalance,
  linkUpdatesDebtBalance,
  planDebtBalanceUpdates,
} from "../debtBalances";

const account = (over: Partial<NormalizedAccount> = {}): NormalizedAccount => ({
  externalAccountId: "ACT-1",
  name: "Sapphire",
  balance: -1234.56,
  ...over,
});

describe("debtBalanceFromProvider", () => {
  it("uses the magnitude regardless of the provider's sign convention", () => {
    expect(debtBalanceFromProvider(-1234.56)).toBe(1234.56);
    expect(debtBalanceFromProvider(1234.56)).toBe(1234.56);
  });

  it("rounds to cents and treats non-finite input as 0", () => {
    expect(debtBalanceFromProvider(-10.005)).toBe(10.01);
    expect(debtBalanceFromProvider(-0)).toBe(0);
    expect(debtBalanceFromProvider(Number.NaN)).toBe(0);
    expect(debtBalanceFromProvider(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe("linkUpdatesDebtBalance", () => {
  it("is on by default for a linked card and off only when explicitly false", () => {
    expect(linkUpdatesDebtBalance({ debtId: "debt-1" })).toBe(true);
    expect(linkUpdatesDebtBalance({ debtId: "debt-1", updateDebtBalance: true })).toBe(true);
    expect(linkUpdatesDebtBalance({ debtId: "debt-1", updateDebtBalance: false })).toBe(false);
    expect(linkUpdatesDebtBalance({ debtId: null })).toBe(false);
    expect(linkUpdatesDebtBalance({ debtId: undefined, updateDebtBalance: true })).toBe(false);
  });
});

describe("debtFieldsForProviderBalance", () => {
  it("returns null when the balance is already current", () => {
    expect(debtFieldsForProviderBalance({ balance: 500, originalBalance: 1000 }, -500)).toBeNull();
  });

  it("returns just the balance when it stays within originalBalance", () => {
    expect(debtFieldsForProviderBalance({ balance: 500, originalBalance: 1000 }, -750)).toEqual({
      balance: 750,
    });
  });

  it("raises originalBalance as a high-water mark when new charges exceed it", () => {
    expect(debtFieldsForProviderBalance({ balance: 0, originalBalance: 0.01 }, -320)).toEqual({
      balance: 320,
      originalBalance: 320,
    });
  });

  it("does not lower originalBalance when the card is paid down", () => {
    expect(debtFieldsForProviderBalance({ balance: 900, originalBalance: 1000 }, 0)).toEqual({
      balance: 0,
    });
  });
});

describe("planDebtBalanceUpdates", () => {
  const debt = makeDebt({ id: "debt-1", balance: 100, originalBalance: 1000 });

  it("plans an update for a linked card whose bank balance moved", () => {
    const plan = planDebtBalanceUpdates({
      links: [makeExternalAccountLink({ debtId: "debt-1" })],
      debts: [debt],
      accounts: [account({ balance: -250 })],
    });
    expect(plan).toEqual([{ debtId: "debt-1", balance: 250 }]);
  });

  it("skips links with balance mirroring turned off", () => {
    const plan = planDebtBalanceUpdates({
      links: [makeExternalAccountLink({ debtId: "debt-1", updateDebtBalance: false })],
      debts: [debt],
      accounts: [account({ balance: -250 })],
    });
    expect(plan).toEqual([]);
  });

  it("skips links whose debt is missing or tombstoned", () => {
    const plan = planDebtBalanceUpdates({
      links: [
        makeExternalAccountLink({ id: "l1", debtId: "nope" }),
        makeExternalAccountLink({ id: "l2", externalAccountId: "ACT-2", debtId: "debt-1" }),
      ],
      debts: [{ ...debt, deletedAt: "2026-06-01T00:00:00.000Z" }],
      accounts: [account(), account({ externalAccountId: "ACT-2" })],
    });
    expect(plan).toEqual([]);
  });

  it("skips accounts the provider did not return this pass", () => {
    const plan = planDebtBalanceUpdates({
      links: [makeExternalAccountLink({ debtId: "debt-1", externalAccountId: "ACT-9" })],
      debts: [debt],
      accounts: [account()],
    });
    expect(plan).toEqual([]);
  });

  it("skips an unchanged balance and carries the high-water mark when it grows", () => {
    expect(
      planDebtBalanceUpdates({
        links: [makeExternalAccountLink({ debtId: "debt-1" })],
        debts: [debt],
        accounts: [account({ balance: -100 })],
      }),
    ).toEqual([]);
    expect(
      planDebtBalanceUpdates({
        links: [makeExternalAccountLink({ debtId: "debt-1" })],
        debts: [debt],
        accounts: [account({ balance: -1500 })],
      }),
    ).toEqual([{ debtId: "debt-1", balance: 1500, originalBalance: 1500 }]);
  });

  it("emits one update per debt when two links point at the same card", () => {
    const plan = planDebtBalanceUpdates({
      links: [
        makeExternalAccountLink({ id: "l1", externalAccountId: "ACT-1", debtId: "debt-1" }),
        makeExternalAccountLink({ id: "l2", externalAccountId: "ACT-2", debtId: "debt-1" }),
      ],
      debts: [debt],
      accounts: [account({ balance: -300 }), account({ externalAccountId: "ACT-2", balance: -400 })],
    });
    expect(plan).toEqual([{ debtId: "debt-1", balance: 400 }]);
  });
});

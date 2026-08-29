/**
 * applyAndPersistMissedContributions: the side-effecting shell around the
 * (separately tested) catch-up math. What these tests pin is the SAVE
 * ORDER - entries (lastAppliedMonth marker) must commit before assets (new
 * balance). Reversing or parallelizing the saves lets a reader on another
 * tab see (newBalance, oldLastApplied) and re-apply the contribution,
 * silently double-crediting the asset. This invariant used to live as a
 * comment duplicated in BudgetScreen and BridgeScreen.
 */

// Shared invocation log so the order across BOTH mocked modules is visible.
const calls: string[] = [];
jest.mock("../../storage/budgetStorage", () => ({
  saveBudgetEntries: jest.fn(async () => {
    calls.push("saveBudgetEntries");
  }),
}));
jest.mock("../../storage/assetAccountStorage", () => ({
  saveAssetAccounts: jest.fn(async () => {
    calls.push("saveAssetAccounts");
  }),
}));

// eslint-disable-next-line import/first -- import after the mock factories register
import { applyAndPersistMissedContributions } from "../linkedAccountRecurringApply";
// eslint-disable-next-line import/first -- import after the mock factories register
import { makeBudgetEntry, makeAssetAccount } from "../../__tests__/fixtures";
// eslint-disable-next-line import/first -- import after the mock factories register
import type { BudgetEntry, AssetAccount } from "../../types";

const budgetStorage = require("../../storage/budgetStorage");
const assetStorage = require("../../storage/assetAccountStorage");

const entry = (over: Partial<BudgetEntry> = {}): BudgetEntry =>
  makeBudgetEntry({
    id: "e1",
    category: "Savings",
    date: "2026-01-15",
    recurring: true,
    recurrenceInterval: 1,
    linkedAccountId: "a1",
    ...over,
  });

const account = (over: Partial<AssetAccount> = {}): AssetAccount =>
  makeAssetAccount({
    id: "a1",
    name: "Brokerage",
    category: "investment",
    balance: 500,
    updatedAt: "2020-01-01T00:00:00.000Z",
    ...over,
  });

const APRIL = new Date(Date.UTC(2026, 3, 10));

beforeEach(() => {
  jest.clearAllMocks();
  calls.length = 0;
});

describe("applyAndPersistMissedContributions", () => {
  it("persists entries BEFORE assets when contributions were applied", async () => {
    const result = await applyAndPersistMissedContributions(
      [entry()],
      [account()],
      APRIL
    );

    expect(result.changed).toBe(true);
    expect(result.assetAccounts[0].balance).toBe(800); // Feb+Mar+Apr * 100
    // The double-credit protection: marker first, balance second.
    expect(calls).toEqual(["saveBudgetEntries", "saveAssetAccounts"]);
    expect(budgetStorage.saveBudgetEntries).toHaveBeenCalledWith(result.entries);
    expect(assetStorage.saveAssetAccounts).toHaveBeenCalledWith(result.assetAccounts);
  });

  it("writes nothing when there is nothing to apply", async () => {
    const entries = [entry({ recurring: false })];
    const accounts = [account()];
    const result = await applyAndPersistMissedContributions(entries, accounts, APRIL);

    expect(result.changed).toBe(false);
    // Same references back - callers can setState with them directly.
    expect(result.entries).toBe(entries);
    expect(result.assetAccounts).toBe(accounts);
    expect(calls).toEqual([]);
  });

  it("does not save assets if the entries save throws (marker must land first)", async () => {
    budgetStorage.saveBudgetEntries.mockRejectedValueOnce(new Error("disk full"));
    await expect(
      applyAndPersistMissedContributions([entry()], [account()], APRIL)
    ).rejects.toThrow("disk full");
    expect(assetStorage.saveAssetAccounts).not.toHaveBeenCalled();
  });
});

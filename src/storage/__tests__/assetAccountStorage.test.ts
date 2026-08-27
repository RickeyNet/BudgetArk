/**
 * Asset account CRUD mirrors budgetStorage's atomic read-modify-write
 * contract: mutations fold into what is CURRENTLY stored so a partner
 * sync or bank balance refresh that landed behind a mounted screen is
 * never reverted. `adjustAssetAccountBalances` is the Budget screen's
 * linked-account path (entry add/edit/delete/undo) and must net deltas
 * onto the stored balances, not onto the screen's snapshot.
 */
import type { AssetAccount } from "../../types";
import {
  addAssetAccount,
  adjustAssetAccountBalances,
  deleteAssetAccount,
  getAssetAccounts,
  restoreAssetAccount,
  updateAssetAccount,
} from "../assetAccountStorage";

let mockStore: Map<string, string>;

jest.mock("../encryptedStorage", () => ({
  getItem: jest.fn(async (k: string) => (mockStore.has(k) ? mockStore.get(k)! : null)),
  setItem: jest.fn(async (k: string, v: string) => {
    mockStore.set(k, v);
  }),
  removeItem: jest.fn(async (k: string) => {
    mockStore.delete(k);
  }),
  updateItem: jest.fn(
    async (k: string, updater: (current: string | null) => string | null) => {
      const next = updater(mockStore.has(k) ? mockStore.get(k)! : null);
      if (next !== null) mockStore.set(k, next);
    }
  ),
}));

const KEY = "@budgetark_asset_accounts";
const T0 = "2026-06-01T00:00:00.000Z";

const account = (over: Partial<AssetAccount> = {}): AssetAccount =>
  ({
    id: "a1",
    name: "Checking",
    category: "savings",
    balance: 100,
    createdAt: T0,
    updatedAt: T0,
    ...over,
  }) as AssetAccount;

const seed = (accounts: AssetAccount[]) => mockStore.set(KEY, JSON.stringify(accounts));
const stored = (): AssetAccount[] => JSON.parse(mockStore.get(KEY) ?? "[]");
const ids = (list: AssetAccount[]) => list.map((a) => a.id).sort();

beforeEach(() => {
  mockStore = new Map();
});

describe("adjustAssetAccountBalances", () => {
  it("nets deltas onto the STORED balance, not the caller's snapshot", async () => {
    // Bank sync refreshed a1 to 250 after the screen loaded it at 100.
    seed([account({ id: "a1", balance: 250 }), account({ id: "a2", balance: 50 })]);
    const live = await adjustAssetAccountBalances([
      { accountId: "a1", amount: -30 },
      { accountId: "a1", amount: 5 },
    ]);
    const a1 = live.find((a) => a.id === "a1")!;
    expect(a1.balance).toBe(225);
    expect(new Date(a1.updatedAt).getTime()).toBeGreaterThan(new Date(T0).getTime());
    // Untouched account keeps its LWW timestamp.
    expect(live.find((a) => a.id === "a2")?.updatedAt).toBe(T0);
    expect(stored().find((a) => a.id === "a1")?.balance).toBe(225);
  });

  it("is a no-op for empty / unknown / cancelling deltas and still returns live accounts", async () => {
    seed([account(), account({ id: "gone", deletedAt: T0 })]);
    const before = mockStore.get(KEY);
    const live = await adjustAssetAccountBalances([
      { accountId: "ghost", amount: 10 },
      { accountId: "a1", amount: 4 },
      { accountId: "a1", amount: -4 },
    ]);
    expect(ids(live)).toEqual(["a1"]);
    expect(mockStore.get(KEY)).toBe(before);
  });
});

describe("add / update", () => {
  it("add appends alongside records the caller never saw and ignores a duplicate id", async () => {
    seed([account({ id: "a-partner" })]);
    await addAssetAccount(account({ id: "a-new" }));
    await addAssetAccount(account({ id: "a-new", balance: 999 }));
    const all = stored();
    expect(ids(all)).toEqual(["a-new", "a-partner"]);
    expect(all.find((a) => a.id === "a-new")?.balance).toBe(100);
  });

  it("update patches in place, re-stamps updatedAt, and can clear the emergency-fund flag", async () => {
    seed([account({ id: "a1", isEmergencyFund: true }), account({ id: "a-partner" })]);
    const live = await updateAssetAccount("a1", { name: "Renamed", isEmergencyFund: undefined });
    const a1 = live.find((a) => a.id === "a1")!;
    expect(a1.name).toBe("Renamed");
    expect(a1.isEmergencyFund).toBeUndefined();
    expect(new Date(a1.updatedAt).getTime()).toBeGreaterThan(new Date(T0).getTime());
    expect(ids(live)).toEqual(["a-partner", "a1"]);
  });
});

describe("delete / restore", () => {
  it("soft-deletes with a tombstone and restore clears it", async () => {
    seed([account({ id: "a1" }), account({ id: "a2" })]);
    expect(ids(await deleteAssetAccount("a1"))).toEqual(["a2"]);
    expect(stored().find((a) => a.id === "a1")?.deletedAt).toBeTruthy();
    expect(ids(await restoreAssetAccount("a1"))).toEqual(["a1", "a2"]);
    expect(ids(await getAssetAccounts())).toEqual(["a1", "a2"]);
  });
});

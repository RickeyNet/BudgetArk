/**
 * JSON import pipeline tests (importFromString).
 *
 * importFromString runs the real parse → validate → sanitize → merge logic.
 * Only the I/O edges are mocked:
 *   - ../storage/encryptedStorage  -> in-memory Map (inspectable via __store)
 *   - expo-document-picker / expo-file-system -> inert (only the file-picker
 *     path touches them, which we don't exercise here)
 *   - ./exportData -> just the two encryption-prefix constants, so importData's
 *     transitive (react-native + storage) dependency tree never loads
 *   - ./uuid -> deterministic ids
 */

const ENC_V1 = "__BUDGETARK_ENC__:";
const ENC_V2 = "__BUDGETARK_ENC2__:";

jest.mock("../../storage/encryptedStorage", () => {
  const store = new Map<string, string>();
  return {
    __store: store,
    getItem: jest.fn(async (k: string) => (store.has(k) ? store.get(k)! : null)),
    setItem: jest.fn(async (k: string, v: string) => {
      store.set(k, v);
    }),
    removeItem: jest.fn(async (k: string) => {
      store.delete(k);
    }),
    multiRemove: jest.fn(async (keys: string[]) => {
      keys.forEach((k) => store.delete(k));
    }),
  };
});

jest.mock("expo-document-picker", () => ({}));
jest.mock("expo-file-system", () => ({ File: class {} }));
jest.mock("../exportData", () => ({
  ENCRYPTED_EXPORT_PREFIX: "__BUDGETARK_ENC__:",
  ENCRYPTED_EXPORT_PREFIX_V2: "__BUDGETARK_ENC2__:",
}));

let uuidCounter = 0;
jest.mock("../uuid", () => ({
  generateUUID: () => `gen-uuid-${++uuidCounter}`,
}));

import { importFromString, isEncryptedExport } from "../importData";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const storageMock = require("../../storage/encryptedStorage") as {
  __store: Map<string, string>;
};

const KEYS = {
  DEBTS: "@budgetark_debts",
  BUDGET_ENTRIES: "@budgetark_budget_entries",
  HOLDINGS: "@budgetark_holdings",
};

const validDebt = (over: Record<string, unknown> = {}) => ({
  id: "d1",
  name: "Visa",
  balance: 1000,
  originalBalance: 2000,
  rate: 19.9,
  minPayment: 50,
  createdAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

const validEntry = (over: Record<string, unknown> = {}) => ({
  id: "e1",
  type: "expense",
  category: "Food",
  amount: 12.5,
  date: "2026-06-01",
  createdAt: "2026-06-01T00:00:00.000Z",
  ...over,
});

const validHolding = (over: Record<string, unknown> = {}) => ({
  id: "h1",
  symbol: "AAPL",
  shares: 10,
  costBasis: 1500,
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-02T00:00:00.000Z",
  ...over,
});

const readStore = (key: string): any => {
  const raw = storageMock.__store.get(key);
  return raw ? JSON.parse(raw) : null;
};

beforeEach(() => {
  storageMock.__store.clear();
  uuidCounter = 0;
});

describe("isEncryptedExport", () => {
  it("detects v1 and v2 encrypted exports", () => {
    expect(isEncryptedExport(ENC_V1 + "abc")).toBe(true);
    expect(isEncryptedExport(ENC_V2 + "a.b.c")).toBe(true);
    expect(isEncryptedExport("  " + ENC_V2 + "a.b.c")).toBe(true); // leading ws
  });

  it("returns false for plain JSON", () => {
    expect(isEncryptedExport('{"debts":[]}')).toBe(false);
  });
});

describe("importFromString - validation", () => {
  it("rejects text that is not valid JSON", async () => {
    await expect(importFromString("not json{")).rejects.toThrow(/not valid JSON/i);
  });

  it("rejects JSON that is not a BudgetArk export", async () => {
    await expect(importFromString('{"hello":"world"}')).rejects.toThrow(
      /does not appear to be a BudgetArk export/i
    );
  });

  it("rejects a payload that is too large", async () => {
    const huge = "x".repeat(12_000_001);
    await expect(importFromString(huge)).rejects.toThrow(/too large/i);
  });

  it("rejects an encrypted export when no password is given", async () => {
    await expect(importFromString(ENC_V2 + "salt.iv.ct")).rejects.toThrow(
      /password-encrypted/i
    );
  });

  it("reports the first invalid budget entry with a reason", async () => {
    const payload = JSON.stringify({
      budgetEntries: [validEntry(), validEntry({ id: "e2", amount: "oops" })],
    });
    await expect(importFromString(payload)).rejects.toThrow(/quoted string/i);
  });
});

describe("importFromString - merge mode", () => {
  it("imports debts into empty storage", async () => {
    const result = await importFromString(
      JSON.stringify({ debts: [validDebt()] }),
      "merge"
    );
    expect(result.debts).toBe(1);
    const stored = readStore(KEYS.DEBTS);
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe("d1");
  });

  it("adds new records alongside existing ones", async () => {
    storageMock.__store.set(KEYS.DEBTS, JSON.stringify([validDebt({ id: "d0" })]));
    const result = await importFromString(
      JSON.stringify({ debts: [validDebt({ id: "d1" })] }),
      "merge"
    );
    expect(result.debts).toBe(1);
    const ids = readStore(KEYS.DEBTS).map((d: any) => d.id);
    expect(ids).toEqual(["d0", "d1"]);
  });

  it("keeps the local record when the incoming one is older (last-write-wins)", async () => {
    storageMock.__store.set(
      KEYS.DEBTS,
      JSON.stringify([validDebt({ balance: 100, updatedAt: "2026-06-10T00:00:00.000Z" })])
    );
    const result = await importFromString(
      JSON.stringify({
        debts: [validDebt({ balance: 999, updatedAt: "2026-01-01T00:00:00.000Z" })],
      }),
      "merge"
    );
    expect(result.debts).toBe(0); // nothing touched
    expect(readStore(KEYS.DEBTS)[0].balance).toBe(100);
  });

  it("overwrites the local record when the incoming one is newer", async () => {
    storageMock.__store.set(
      KEYS.DEBTS,
      JSON.stringify([validDebt({ balance: 100, updatedAt: "2026-01-01T00:00:00.000Z" })])
    );
    await importFromString(
      JSON.stringify({
        debts: [validDebt({ balance: 999, updatedAt: "2026-06-10T00:00:00.000Z" })],
      }),
      "merge"
    );
    expect(readStore(KEYS.DEBTS)[0].balance).toBe(999);
  });

  it("computes staleDays from exportedAt", async () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 86400_000).toISOString();
    const result = await importFromString(
      JSON.stringify({ debts: [validDebt()], exportedAt: tenDaysAgo }),
      "merge"
    );
    expect(result.staleDays).toBe(10);
  });
});

describe("importFromString - holdings", () => {
  it("imports holdings into empty storage", async () => {
    const result = await importFromString(
      JSON.stringify({ holdings: [validHolding()] }),
      "merge"
    );
    expect(result.holdings).toBe(1);
    const stored = readStore(KEYS.HOLDINGS);
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ id: "h1", symbol: "AAPL", shares: 10 });
  });

  it("rejects a holding with a malformed symbol", async () => {
    await expect(
      importFromString(
        JSON.stringify({ holdings: [validHolding({ symbol: "bad symbol" })] })
      )
    ).rejects.toThrow(/holdings contains/i);
  });

  it("applies last-write-wins against an existing holding", async () => {
    storageMock.__store.set(
      KEYS.HOLDINGS,
      JSON.stringify([
        validHolding({ shares: 5, updatedAt: "2026-06-10T00:00:00.000Z" }),
      ])
    );
    await importFromString(
      JSON.stringify({
        holdings: [validHolding({ shares: 99, updatedAt: "2026-01-01T00:00:00.000Z" })],
      }),
      "merge"
    );
    // Incoming is older -> local 5 shares preserved.
    expect(readStore(KEYS.HOLDINGS)[0].shares).toBe(5);
  });
});

describe("importFromString - replace mode", () => {
  it("replaces existing records wholesale", async () => {
    storageMock.__store.set(
      KEYS.DEBTS,
      JSON.stringify([validDebt({ id: "old1" }), validDebt({ id: "old2" })])
    );
    const result = await importFromString(
      JSON.stringify({ debts: [validDebt({ id: "new1" })] }),
      "replace"
    );
    expect(result.debts).toBe(1);
    const ids = readStore(KEYS.DEBTS).map((d: any) => d.id);
    expect(ids).toEqual(["new1"]);
  });
});

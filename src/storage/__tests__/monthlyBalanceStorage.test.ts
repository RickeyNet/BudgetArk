/**
 * BudgetArk - month-start balance storage tests
 * File: src/storage/__tests__/monthlyBalanceStorage.test.ts
 *
 * Guards the Budget tab's cash-flow projection input: setMonthStartBalance
 * validates the month key, stamps capturedAt/updatedAt, and read-modify-writes
 * atomically so a concurrent write to another month isn't clobbered; the
 * sync-facing raw setter must NOT re-stamp timestamps; and the once-per-month
 * prompt marker only ever holds a valid month key. Storage is an in-memory
 * map, matching debtStorage.test.ts's pattern.
 */
import { makeMonthStartBalance } from "../../__tests__/fixtures";
import {
  getLastBalancePromptMonth,
  getMonthStartBalances,
  saveMonthStartBalancesFromSync,
  setLastBalancePromptMonth,
  setMonthStartBalance,
} from "../monthlyBalanceStorage";

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

const BALANCES_KEY = "@budgetark_month_start_balances";
const PROMPT_KEY = "@budgetark_month_balance_prompt";

beforeEach(() => {
  mockStore = new Map();
});

describe("setMonthStartBalance", () => {
  it("records the balance and stamps capturedAt/updatedAt to now", async () => {
    const result = await setMonthStartBalance("2026-06", 1234.56);
    expect(result["2026-06"].balance).toBe(1234.56);
    expect(result["2026-06"].capturedAt).toBe(result["2026-06"].updatedAt);
    expect(Number.isNaN(Date.parse(result["2026-06"].capturedAt))).toBe(false);
  });

  it("throws on an invalid month key rather than silently storing garbage", async () => {
    await expect(setMonthStartBalance("2026-13", 100)).rejects.toThrow(
      "Invalid month key: 2026-13"
    );
    await expect(setMonthStartBalance("not-a-month", 100)).rejects.toThrow();
    expect(mockStore.has(BALANCES_KEY)).toBe(false);
  });

  it("merges into the existing map rather than replacing it", async () => {
    await setMonthStartBalance("2026-05", 100);
    const result = await setMonthStartBalance("2026-06", 200);
    expect(Object.keys(result).sort()).toEqual(["2026-05", "2026-06"]);
    expect(result["2026-05"].balance).toBe(100);
  });

  it("overwrites the same month's balance on a second call", async () => {
    await setMonthStartBalance("2026-06", 100);
    const result = await setMonthStartBalance("2026-06", 999);
    expect(Object.keys(result)).toEqual(["2026-06"]);
    expect(result["2026-06"].balance).toBe(999);
  });

  it("recovers from a corrupted existing store rather than throwing", async () => {
    mockStore.set(BALANCES_KEY, "{not json");
    const result = await setMonthStartBalance("2026-06", 100);
    expect(Object.keys(result)).toEqual(["2026-06"]);
  });
});

describe("getMonthStartBalances", () => {
  it("returns {} when nothing is stored", async () => {
    expect(await getMonthStartBalances()).toEqual({});
  });

  it("returns {} for corrupted JSON", async () => {
    mockStore.set(BALANCES_KEY, "{not json");
    expect(await getMonthStartBalances()).toEqual({});
  });

  it("drops entries with an invalid month key or malformed record", async () => {
    mockStore.set(
      BALANCES_KEY,
      JSON.stringify({
        "2026-06": makeMonthStartBalance({ balance: 500 }),
        "2026-13": makeMonthStartBalance({ balance: 999 }), // invalid month key
        "2026-07": { balance: "not a number" }, // malformed record
      })
    );
    const result = await getMonthStartBalances();
    expect(Object.keys(result)).toEqual(["2026-06"]);
  });
});

describe("saveMonthStartBalancesFromSync", () => {
  it("writes the map verbatim without re-stamping timestamps", async () => {
    const map = {
      "2026-06": makeMonthStartBalance({
        balance: 777,
        capturedAt: "2020-01-01T00:00:00.000Z",
        updatedAt: "2020-01-01T00:00:00.000Z",
      }),
    };
    await saveMonthStartBalancesFromSync(map);
    const result = await getMonthStartBalances();
    expect(result).toEqual(map);
  });
});

describe("last balance prompt month", () => {
  it("returns null when never set", async () => {
    expect(await getLastBalancePromptMonth()).toBeNull();
  });

  it("round-trips a valid month key", async () => {
    await setLastBalancePromptMonth("2026-06");
    expect(await getLastBalancePromptMonth()).toBe("2026-06");
  });

  it("returns null for a stored value that isn't a valid month key (fail-closed)", async () => {
    mockStore.set(PROMPT_KEY, "garbage");
    expect(await getLastBalancePromptMonth()).toBeNull();
  });

  it("is stored independently of the balances key", async () => {
    await setLastBalancePromptMonth("2026-06");
    expect(mockStore.has(BALANCES_KEY)).toBe(false);
    expect(mockStore.has(PROMPT_KEY)).toBe(true);
  });
});

/**
 * JSON export tests (buildExportMessage) plus an encrypt -> decrypt round-trip
 * back through the real importFromString.
 *
 * exportData is the REAL module here (crypto-js runs for real). Its storage
 * getters and react-native's Share are mocked; the in-memory encryptedStorage
 * mock receives whatever the round-trip import writes.
 */

jest.mock("react-native", () => ({
  Share: { share: jest.fn(), sharedAction: "sharedAction" },
}));

// --- exportData's data sources (return fixtures) ---
const fixtures = {
  debts: [
    {
      id: "d1",
      name: "Visa",
      balance: 1000,
      originalBalance: 2000,
      rate: 19.9,
      minPayment: 50,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    },
  ],
  payments: [
    {
      id: "p1",
      debtId: "d1",
      amount: 75,
      date: "2026-02-01",
      updatedAt: "2026-02-01T00:00:00.000Z",
    },
  ],
  budgetEntries: [
    {
      id: "e1",
      type: "expense",
      category: "Food",
      amount: 30,
      date: "2026-03-01",
      createdAt: "2026-03-01T00:00:00.000Z",
    },
    // A bank-imported entry: its provenance fields must survive the export
    // round-trip (externalTxId is the connections-sync dedup identity).
    {
      id: "e2",
      type: "expense",
      category: "Grocery",
      amount: 82.14,
      description: "COSTCO WHSE #1234",
      date: "2026-03-02",
      createdAt: "2026-03-02T00:00:00.000Z",
      updatedAt: "2026-03-02T00:00:00.000Z",
      source: "bank",
      externalTxId: "simplefin:ACT-1:TXN-99",
      merchant: "COSTCO WHSE",
    },
  ],
  holdings: [
    {
      id: "h1",
      symbol: "AAPL",
      shares: 10,
      costBasis: 1500,
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-02T00:00:00.000Z",
    },
  ],
  user: {
    id: "user-1",
    displayName: "Tester",
    createdAt: "2026-01-01T00:00:00.000Z",
    onboardingComplete: true,
    currencyPreferenceId: "usd",
  },
};

jest.mock("../../storage/debtStorage", () => ({
  getDebtsIncludingDeleted: jest.fn(async () => fixturesRef.debts),
  getPaymentsIncludingDeleted: jest.fn(async () => fixturesRef.payments),
  getPayoffStrategyEnvelope: jest.fn(async () => ({
    value: "avalanche",
    updatedAt: "2026-01-05T00:00:00.000Z",
  })),
}));
jest.mock("../../storage/budgetStorage", () => ({
  getBudgetEntriesIncludingDeleted: jest.fn(async () => fixturesRef.budgetEntries),
  getAllLimitsByMonth: jest.fn(async () => ({})),
  getCategoryBudgetLimits: jest.fn(async () => []),
}));
jest.mock("../../storage/userStorage", () => ({
  getOrCreateUser: jest.fn(async () => fixturesRef.user),
}));
jest.mock("../../storage/savingsGoalStorage", () => ({
  getSavingsGoalsIncludingDeleted: jest.fn(async () => []),
}));
jest.mock("../../storage/assetAccountStorage", () => ({
  getAssetAccountsIncludingDeleted: jest.fn(async () => []),
}));
jest.mock("../../storage/holdingsStorage", () => ({
  getHoldingsIncludingDeleted: jest.fn(async () => fixturesRef.holdings),
}));
jest.mock("../../storage/debtMilestoneStorage", () => ({
  getDebtMilestonePlan: jest.fn(async () => null),
}));
jest.mock("../../storage/netWorthSnapshotStorage", () => ({
  getNetWorthSnapshots: jest.fn(async () => []),
}));
jest.mock("../../storage/customCategoriesStorage", () => ({
  getCustomCategories: jest.fn(async () => []),
}));
jest.mock("../../storage/categoryBucketOverridesStorage", () => ({
  getCategoryBucketOverrides: jest.fn(async () => ({})),
}));
jest.mock("../../storage/achievementsStorage", () => ({
  getUnlockedAchievements: jest.fn(async () => ({})),
}));
jest.mock("../../storage/achievementStatsStorage", () => ({
  getAchievementStats: jest.fn(async () => null),
}));
jest.mock("../../storage/debtDueReminderStorage", () => ({
  getDebtDueDismissals: jest.fn(async () => ({})),
}));
jest.mock("../../storage/backupReminderStorage", () => ({
  recordBackup: jest.fn(async () => {}),
}));

// --- importFromString's I/O edges (for the round-trip) ---
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
jest.mock("../uuid", () => ({ generateUUID: () => "gen-uuid" }));

// `fixturesRef` lets the jest.mock factories (hoisted above imports) reach the
// fixtures object without a TDZ error.
const fixturesRef = fixtures;

import { buildExportMessage, ENCRYPTED_EXPORT_PREFIX_V2 } from "../exportData";
import { importFromString, isEncryptedExport } from "../importData";

const storageMock = require("../../storage/encryptedStorage") as {
  __store: Map<string, string>;
};

beforeEach(() => storageMock.__store.clear());

describe("buildExportMessage - plain JSON", () => {
  it("produces a complete, parseable export payload", async () => {
    const message = await buildExportMessage();
    const payload = JSON.parse(message);

    expect(payload).toMatchObject({
      user: { id: "user-1", displayName: "Tester" },
      payoffStrategy: "avalanche",
      payoffStrategyUpdatedAt: "2026-01-05T00:00:00.000Z",
    });
    expect(payload.debts).toHaveLength(1);
    expect(payload.payments).toHaveLength(1);
    expect(payload.budgetEntries).toHaveLength(2);
    expect(payload.holdings).toHaveLength(1);
    expect(payload.holdings[0]).toMatchObject({ symbol: "AAPL", shares: 10 });
    expect(typeof payload.exportedAt).toBe("string");
    expect(payload.appVersion).toBeTruthy();
  });

  it("round-trips through importFromString", async () => {
    const message = await buildExportMessage();
    const result = await importFromString(message, "replace");
    expect(result.debts).toBe(1);
    expect(result.payments).toBe(1);
    expect(result.budgetEntries).toBe(2);
    expect(result.holdings).toBe(1);
    expect(result.payoffStrategy).toBe(true);
  });

  it("carries bank-entry provenance fields through the round-trip", async () => {
    const message = await buildExportMessage();
    const payload = JSON.parse(message);
    expect(payload.budgetEntries[1]).toMatchObject({
      source: "bank",
      externalTxId: "simplefin:ACT-1:TXN-99",
      merchant: "COSTCO WHSE",
    });

    await importFromString(message, "replace");
    const stored = JSON.parse(
      storageMock.__store.get("@budgetark_budget_entries") ?? "[]",
    );
    const bankEntry = stored.find((e: { id: string }) => e.id === "e2");
    expect(bankEntry).toMatchObject({
      source: "bank",
      externalTxId: "simplefin:ACT-1:TXN-99",
      merchant: "COSTCO WHSE",
    });
  });

  it("never exports connection collections, credentials, or inbox data", async () => {
    const message = await buildExportMessage();
    const payload = JSON.parse(message);
    // Regression fence for the never-export rule (see exportData.ts comment):
    // no top-level key may reference the per-device bank-connection stores.
    const forbidden = /connection|secret|pendingtransaction|merchantrule|ingestledger|accountlink/i;
    for (const key of Object.keys(payload)) {
      expect(key).not.toMatch(forbidden);
    }
  });
});

describe("buildExportMessage - encrypted", () => {
  // PBKDF2 (250k iterations) is deliberately slow, so build the encrypted
  // envelope once and reuse it across the assertions below.
  let encrypted: string;
  beforeAll(async () => {
    encrypted = await buildExportMessage("hunter2");
  });

  it("emits a v2-prefixed envelope recognized as encrypted", () => {
    expect(encrypted.startsWith(ENCRYPTED_EXPORT_PREFIX_V2)).toBe(true);
    expect(isEncryptedExport(encrypted)).toBe(true);
    // salt.iv.ciphertext envelope after the prefix
    expect(encrypted.slice(ENCRYPTED_EXPORT_PREFIX_V2.length).split(".")).toHaveLength(3);
  });

  it("decrypts and imports with the correct password", async () => {
    const result = await importFromString(encrypted, "replace", "hunter2");
    expect(result.debts).toBe(1);
    expect(result.budgetEntries).toBe(2);
  });

  it("fails to import with the wrong password", async () => {
    await expect(
      importFromString(encrypted, "replace", "wrong-password")
    ).rejects.toThrow(/decryption failed/i);
  });

  it("refuses an encrypted import with no password", async () => {
    await expect(importFromString(encrypted, "replace")).rejects.toThrow(
      /password-encrypted/i
    );
  });
});

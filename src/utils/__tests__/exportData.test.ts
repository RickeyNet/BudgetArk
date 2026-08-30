/**
 * JSON export tests (buildExportMessage) plus an encrypt -> decrypt round-trip
 * back through the real importFromString, and the file-based share step
 * (shareExportMessage).
 *
 * exportData is the REAL module here (crypto runs for real). Its storage
 * getters, expo-file-system and the share helper are mocked; the in-memory
 * encryptedStorage mock receives whatever the round-trip import writes.
 */

import {
  buildExportFilename,
  buildExportMessage,
  shareExportMessage,
} from "../exportData";
import { ENCRYPTED_EXPORT_PREFIX_V3 } from "../exportEncryption";
import { importFromString, isEncryptedExport } from "../importData";
import { makeDebt, makePayment, makeBudgetEntry } from "../../__tests__/fixtures";

// No `Share` here on purpose: the export must never go out as
// `Share.share({ message })` text (Android's ~1MB Intent ceiling silently
// swallowed large backups). If exportData ever imports it again, this mock
// makes the import undefined and the share tests below fail loudly.
jest.mock("react-native", () => ({ Platform: { OS: "android" } }));

/** Records every temp file the export writes so tests can inspect/assert deletion. */
type MockFileRecord = {
  uri: string;
  content?: string;
  encoding?: string;
  exists: boolean;
  deleted: boolean;
};
const mockFiles: MockFileRecord[] = [];
const mockShareLocalFile = jest.fn(async (_uri: string, _opts: unknown) => {});
jest.mock("../iosNativeShare", () => ({
  shareLocalFile: (uri: string, opts: unknown) => mockShareLocalFile(uri, opts),
  waitForIosModalTeardown: jest.fn(async () => {}),
}));

// --- exportData's data sources (return fixtures) ---
const fixtures = {
  debts: [
    makeDebt({
      id: "d1",
      originalBalance: 2000,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    }),
  ],
  payments: [
    makePayment({
      id: "p1",
      debtId: "d1",
      amount: 75,
      date: "2026-02-01",
      updatedAt: "2026-02-01T00:00:00.000Z",
    }),
  ],
  budgetEntries: [
    makeBudgetEntry({
      id: "e1",
      category: "Food",
      amount: 30,
      date: "2026-03-01",
      createdAt: "2026-03-01T00:00:00.000Z",
    }),
    // A bank-imported entry: its provenance fields must survive the export
    // round-trip (externalTxId is the connections-sync dedup identity).
    makeBudgetEntry({
      id: "e2",
      category: "Grocery",
      amount: 82.14,
      description: "COSTCO WHSE #1234",
      date: "2026-03-02",
      createdAt: "2026-03-02T00:00:00.000Z",
      updatedAt: "2026-03-02T00:00:00.000Z",
      source: "bank",
      externalTxId: "simplefin:ACT-1:TXN-99",
      merchant: "COSTCO WHSE",
    }),
    // A business-tagged expense with a receipt photo: businessId and the
    // attachment METADATA must survive the round-trip; image bytes must not
    // exist anywhere in the export (files are device-local).
    makeBudgetEntry({
      id: "e3",
      category: "Tech",
      amount: 129.99,
      date: "2026-03-03",
      createdAt: "2026-03-03T00:00:00.000Z",
      businessId: "b1",
      personId: "per1",
      attachments: [
        {
          id: "att-1",
          createdAt: "2026-03-03T00:00:00.000Z",
          width: 1600,
          height: 1200,
        },
      ],
    }),
  ],
  businesses: [
    {
      id: "b1",
      name: "Acme Consulting LLC",
      createdAt: "2026-02-01T00:00:00.000Z",
      updatedAt: "2026-02-01T00:00:00.000Z",
    },
    // Tombstoned business: must be exported so a restore can't resurrect it.
    {
      id: "b2",
      name: "Old Side Hustle",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-02-15T00:00:00.000Z",
      deletedAt: "2026-02-15T00:00:00.000Z",
    },
  ],
  people: [
    {
      id: "per1",
      name: "Sam",
      createdAt: "2026-02-01T00:00:00.000Z",
      updatedAt: "2026-02-01T00:00:00.000Z",
    },
    // Tombstoned person: same restore-can't-resurrect rationale as b2.
    {
      id: "per2",
      name: "Old Roommate",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-02-15T00:00:00.000Z",
      deletedAt: "2026-02-15T00:00:00.000Z",
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
  monthStartBalances: {
    "2026-03": {
      balance: 3200.5,
      capturedAt: "2026-03-01T09:00:00.000Z",
      updatedAt: "2026-03-01T09:00:00.000Z",
    },
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
  getAllLimitsByMonthIncludingDeleted: jest.fn(async () => ({})),
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
jest.mock("../../storage/businessStorage", () => ({
  getBusinessesIncludingDeleted: jest.fn(async () => fixturesRef.businesses),
}));
jest.mock("../../storage/personStorage", () => ({
  getPeopleIncludingDeleted: jest.fn(async () => fixturesRef.people),
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
jest.mock("../../storage/monthlyBalanceStorage", () => ({
  getMonthStartBalances: jest.fn(async () => fixturesRef.monthStartBalances),
}));
jest.mock("../../storage/debtDueReminderStorage", () => ({
  getDebtDueDismissals: jest.fn(async () => ({})),
}));
jest.mock("../../storage/cardKeepAliveDismissalStorage", () => ({
  getCardKeepAliveDismissals: jest.fn(async () => ({
    "debt-1:2026-07": "2026-07-19T00:00:00.000Z",
  })),
}));
jest.mock("../../storage/learningProgressStorage", () => ({
  getLearningProgress: jest.fn(async () => ({
    completedLessons: { "ch1-l1-what-is-budget": "2026-04-01T00:00:00.000Z" },
    currentLessonId: "ch1-l2-needs-wants-savings",
    affiliateTapCount: 0,
    showAffiliateLinks: false,
    version: 1,
  })),
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
jest.mock("expo-file-system", () => ({
  Paths: { document: "doc", cache: "cache" },
  File: class {
    uri: string;
    exists = false;
    private rec: MockFileRecord;
    constructor(dir: string, name: string) {
      this.uri = `${dir}/${name}`;
      this.rec = { uri: this.uri, exists: false, deleted: false };
      mockFiles.push(this.rec);
    }
    create() {
      this.exists = true;
      this.rec.exists = true;
    }
    write(content: string, opts: { encoding: string }) {
      this.rec.content = content;
      this.rec.encoding = opts?.encoding;
    }
    delete() {
      this.exists = false;
      this.rec.exists = false;
      this.rec.deleted = true;
    }
  },
}));
jest.mock("../uuid", () => ({ generateUUID: () => "gen-uuid" }));

// `fixturesRef` lets the jest.mock factories (hoisted above imports) reach the
// fixtures object without a TDZ error.
const fixturesRef = fixtures;

const storageMock = require("../../storage/encryptedStorage") as {
  __store: Map<string, string>;
};

const backupReminderMock = require("../../storage/backupReminderStorage") as {
  recordBackup: jest.Mock;
};

beforeEach(() => {
  storageMock.__store.clear();
  mockFiles.length = 0;
  mockShareLocalFile.mockClear();
  mockShareLocalFile.mockImplementation(async () => {});
  backupReminderMock.recordBackup.mockClear();
});

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
    expect(payload.budgetEntries).toHaveLength(3);
    expect(payload.holdings).toHaveLength(1);
    expect(payload.businesses).toHaveLength(2);
    expect(payload.holdings[0]).toMatchObject({ symbol: "AAPL", shares: 10 });
    expect(typeof payload.exportedAt).toBe("string");
    expect(payload.appVersion).toBeTruthy();
    // Learning progress rides along in backups (not sync) so a device
    // migration keeps completed lessons.
    expect(payload.learningProgress).toMatchObject({
      completedLessons: { "ch1-l1-what-is-budget": "2026-04-01T00:00:00.000Z" },
      currentLessonId: "ch1-l2-needs-wants-savings",
    });
  });

  it("round-trips through importFromString", async () => {
    const message = await buildExportMessage();
    const result = await importFromString(message, "replace");
    expect(result.debts).toBe(1);
    expect(result.payments).toBe(1);
    expect(result.budgetEntries).toBe(3);
    expect(result.holdings).toBe(1);
    expect(result.businesses).toBe(2);
    expect(result.payoffStrategy).toBe(true);
  });

  it("carries businesses (incl. tombstones) and entry businessId through the round-trip", async () => {
    const message = await buildExportMessage();
    const payload = JSON.parse(message);
    expect(payload.businesses.find((b: any) => b.id === "b2").deletedAt).toBe(
      "2026-02-15T00:00:00.000Z"
    );

    await importFromString(message, "replace");
    const storedBusinesses = JSON.parse(
      storageMock.__store.get("@budgetark_businesses") ?? "{}",
    );
    expect(storedBusinesses.businesses).toHaveLength(2);
    expect(
      storedBusinesses.businesses.find((b: any) => b.id === "b2").deletedAt
    ).toBeTruthy();

    const storedEntries = JSON.parse(
      storageMock.__store.get("@budgetark_budget_entries") ?? "[]",
    );
    expect(storedEntries.find((e: any) => e.id === "e3").businessId).toBe("b1");
  });

  it("carries people (incl. tombstones) and entry personId through the round-trip", async () => {
    const message = await buildExportMessage();
    const payload = JSON.parse(message);
    expect(payload.people).toHaveLength(2);
    expect(payload.people.find((p: any) => p.id === "per2").deletedAt).toBe(
      "2026-02-15T00:00:00.000Z"
    );

    await importFromString(message, "replace");
    const storedPeople = JSON.parse(
      storageMock.__store.get("@budgetark_people") ?? "{}",
    );
    expect(storedPeople.people).toHaveLength(2);
    expect(
      storedPeople.people.find((p: any) => p.id === "per2").deletedAt
    ).toBeTruthy();

    const storedEntries = JSON.parse(
      storageMock.__store.get("@budgetark_budget_entries") ?? "[]",
    );
    expect(storedEntries.find((e: any) => e.id === "e3").personId).toBe("per1");
  });

  it("carries month-start balances through the round-trip with LWW merge", async () => {
    const message = await buildExportMessage();
    const payload = JSON.parse(message);
    expect(payload.monthStartBalances["2026-03"].balance).toBe(3200.5);

    // Merge: a newer local month survives, the imported month lands.
    storageMock.__store.set(
      "@budgetark_month_start_balances",
      JSON.stringify({
        "2026-04": {
          balance: 999,
          capturedAt: "2026-04-01T00:00:00.000Z",
          updatedAt: "2026-04-01T00:00:00.000Z",
        },
      })
    );
    await importFromString(message, "merge");
    const stored = JSON.parse(
      storageMock.__store.get("@budgetark_month_start_balances") ?? "{}",
    );
    expect(stored["2026-03"].balance).toBe(3200.5);
    expect(stored["2026-04"].balance).toBe(999);
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

  it("carries attachment metadata but never image bytes", async () => {
    const message = await buildExportMessage();
    const payload = JSON.parse(message);
    const tagged = payload.budgetEntries.find((e: any) => e.id === "e3");
    expect(tagged.attachments).toEqual([
      {
        id: "att-1",
        createdAt: "2026-03-03T00:00:00.000Z",
        width: 1600,
        height: 1200,
      },
    ]);
    // Regression fence: photos are device-local encrypted files; the JSON
    // backup must never embed image content (data URIs or base64 blobs).
    expect(message).not.toMatch(/data:image/i);
    expect(message).not.toMatch(/"base64"/i);
    // No string value anywhere in the export is remotely image-sized.
    const walk = (value: unknown): void => {
      if (typeof value === "string") {
        expect(value.length).toBeLessThan(10_000);
      } else if (Array.isArray(value)) {
        value.forEach(walk);
      } else if (value && typeof value === "object") {
        Object.values(value).forEach(walk);
      }
    };
    walk(payload);

    await importFromString(message, "replace");
    const stored = JSON.parse(
      storageMock.__store.get("@budgetark_budget_entries") ?? "[]",
    );
    expect(stored.find((e: any) => e.id === "e3").attachments).toHaveLength(1);
  });

  it("includes card keep-alive dismissals in the export payload", async () => {
    const message = await buildExportMessage();
    const payload = JSON.parse(message);
    expect(payload.cardKeepAliveDismissals).toEqual({
      "debt-1:2026-07": "2026-07-19T00:00:00.000Z",
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

  it("never exports the app-lock PIN record", async () => {
    const message = await buildExportMessage();
    const payload = JSON.parse(message);
    // The @budgetark_app_lock record is per-device by contract (see
    // appLockStorage.ts): a backup restored onto another phone must not
    // carry a PIN gate, and its hash/salt must never leave the device.
    for (const key of Object.keys(payload)) {
      expect(key).not.toMatch(/applock|app_lock|pin/i);
    }
    expect(message).not.toContain("saltHex");
    expect(message).not.toContain("hashHex");
  });
});

describe("buildExportMessage - encrypted", () => {
  // PBKDF2 (250k iterations) is deliberately slow, so build the encrypted
  // envelope once and reuse it across the assertions below.
  let encrypted: string;
  beforeAll(async () => {
    encrypted = await buildExportMessage("hunter2");
  });

  it("emits a v3-prefixed (encrypt-then-MAC) envelope recognized as encrypted", () => {
    expect(encrypted.startsWith(ENCRYPTED_EXPORT_PREFIX_V3)).toBe(true);
    expect(isEncryptedExport(encrypted)).toBe(true);
    // salt.iv.ciphertext.mac envelope after the prefix
    expect(encrypted.slice(ENCRYPTED_EXPORT_PREFIX_V3.length).split(".")).toHaveLength(4);
  });

  it("decrypts and imports with the correct password", async () => {
    const result = await importFromString(encrypted, "replace", "hunter2");
    expect(result.debts).toBe(1);
    expect(result.budgetEntries).toBe(3);
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

describe("shareExportMessage - file-based share", () => {
  const plain = JSON.stringify({ exportedAt: "2026-08-30T00:00:00.000Z", debts: [] });
  const encrypted = `${ENCRYPTED_EXPORT_PREFIX_V3}aa.bb.cc.dd`;

  it("writes the payload to a temp file and shares the file, never message text", async () => {
    await shareExportMessage(plain);

    expect(mockFiles).toHaveLength(1);
    const [file] = mockFiles;
    expect(file.uri).toMatch(/^cache\/budgetark-backup-\d{8}-\d{4}\.json$/);
    expect(file.content).toBe(plain);
    expect(file.encoding).toBe("utf8");
    expect(mockShareLocalFile).toHaveBeenCalledTimes(1);
    expect(mockShareLocalFile).toHaveBeenCalledWith(
      file.uri,
      expect.objectContaining({ mimeType: "application/json", UTI: "public.json" })
    );
    // The share helper receives a file URI, not the payload itself.
    expect(mockShareLocalFile.mock.calls[0][0]).not.toContain("exportedAt");
  });

  it("labels an encrypted envelope as plain text (it isn't JSON)", async () => {
    await shareExportMessage(encrypted);

    expect(mockFiles[0].uri).toMatch(/\.txt$/);
    expect(mockFiles[0].content).toBe(encrypted);
    expect(mockShareLocalFile).toHaveBeenCalledWith(
      mockFiles[0].uri,
      expect.objectContaining({ mimeType: "text/plain", UTI: "public.plain-text" })
    );
  });

  it("deletes the temp file after the share sheet closes and stamps the backup", async () => {
    await shareExportMessage(plain);

    expect(mockFiles[0].deleted).toBe(true);
    expect(mockFiles[0].exists).toBe(false);
    expect(backupReminderMock.recordBackup).toHaveBeenCalledTimes(1);
  });

  it("deletes the temp file even when sharing throws, and does not stamp the backup", async () => {
    mockShareLocalFile.mockImplementation(async () => {
      throw new Error("Sharing is not available on this device.");
    });

    await expect(shareExportMessage(plain)).rejects.toThrow(/not available/);
    expect(mockFiles[0].deleted).toBe(true);
    expect(backupReminderMock.recordBackup).not.toHaveBeenCalled();
  });

  it("has no size ceiling: a multi-megabyte export is written and shared as-is", async () => {
    // ~3MB - comfortably past Android's ~1MB Binder transaction limit that
    // killed the old Share.share({ message }) path.
    const big = JSON.stringify({ blob: "x".repeat(3_000_000) });

    await shareExportMessage(big);

    expect(mockFiles[0].content).toHaveLength(big.length);
    expect(mockShareLocalFile).toHaveBeenCalledTimes(1);
  });
});

describe("buildExportFilename", () => {
  it("stamps the date/time and picks the extension by encryption", () => {
    const at = new Date(2026, 7, 30, 9, 5); // 2026-08-30 09:05 local
    expect(buildExportFilename(false, at)).toBe("budgetark-backup-20260830-0905.json");
    expect(buildExportFilename(true, at)).toBe("budgetark-backup-20260830-0905.txt");
  });
});

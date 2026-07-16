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

import { importFromString, isEncryptedExport } from "../importData";

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

  it("keeps the newer local budget limit when the incoming one is older (LWW)", async () => {
    // Regression: the limits merge used to replace per-category limits
    // unconditionally, so importing a stale backup rolled back limits the
    // user had edited since the export - and the import stamp made the
    // rollback propagate to a sync partner as a "fresh" edit.
    const LIMITS_KEY = "@budgetark_budget_limits_by_month";
    storageMock.__store.set(
      LIMITS_KEY,
      JSON.stringify({
        "2026-06": [
          { category: "Food", monthlyLimit: 500, updatedAt: "2026-06-10T00:00:00.000Z" },
        ],
      })
    );
    await importFromString(
      JSON.stringify({
        budgetLimitsByMonth: {
          "2026-06": [
            { category: "Food", monthlyLimit: 100, updatedAt: "2026-01-01T00:00:00.000Z" },
          ],
        },
      }),
      "merge"
    );
    expect(readStore(LIMITS_KEY)["2026-06"][0].monthlyLimit).toBe(500);
  });

  it("applies the incoming budget limit when it is newer", async () => {
    const LIMITS_KEY = "@budgetark_budget_limits_by_month";
    storageMock.__store.set(
      LIMITS_KEY,
      JSON.stringify({
        "2026-06": [
          { category: "Food", monthlyLimit: 500, updatedAt: "2026-01-01T00:00:00.000Z" },
        ],
      })
    );
    await importFromString(
      JSON.stringify({
        budgetLimitsByMonth: {
          "2026-06": [
            { category: "Food", monthlyLimit: 100, updatedAt: "2026-06-10T00:00:00.000Z" },
          ],
        },
      }),
      "merge"
    );
    expect(readStore(LIMITS_KEY)["2026-06"][0].monthlyLimit).toBe(100);
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

describe("importFromString - merge preserves device-local attachments", () => {
  // Attachment metadata points at encrypted photo files on THIS device, and
  // spreadsheet rows carry no attachments column. A merge re-import of an
  // unchanged entry (updatedAt tie -> incoming wins) must not strip the
  // local attachments - the orphan sweep would then delete the photo files.
  const attachment = { id: "att-1", createdAt: "2026-06-01T00:00:00.000Z", width: 1600, height: 1200 };

  it("keeps local attachments when the winning incoming entry has none (spreadsheet round-trip)", async () => {
    const ts = "2026-06-05T00:00:00.000Z";
    storageMock.__store.set(
      KEYS.BUDGET_ENTRIES,
      JSON.stringify([validEntry({ updatedAt: ts, attachments: [attachment] })])
    );
    await importFromString(
      JSON.stringify({
        budgetEntries: [validEntry({ updatedAt: ts, amount: 99 })],
      }),
      "merge"
    );
    const stored = readStore(KEYS.BUDGET_ENTRIES)[0];
    expect(stored.amount).toBe(99); // incoming won the tie...
    expect(stored.attachments).toEqual([attachment]); // ...but photos survive
  });

  it("keeps local attachments even when the incoming entry is strictly newer without any", async () => {
    storageMock.__store.set(
      KEYS.BUDGET_ENTRIES,
      JSON.stringify([
        validEntry({ updatedAt: "2026-06-01T00:00:00.000Z", attachments: [attachment] }),
      ])
    );
    await importFromString(
      JSON.stringify({
        budgetEntries: [validEntry({ updatedAt: "2026-06-10T00:00:00.000Z" })],
      }),
      "merge"
    );
    expect(readStore(KEYS.BUDGET_ENTRIES)[0].attachments).toEqual([attachment]);
  });

  it("lets an incoming entry that carries its own attachments win (JSON round-trip)", async () => {
    const incomingAttachment = { id: "att-2", createdAt: "2026-06-08T00:00:00.000Z" };
    storageMock.__store.set(
      KEYS.BUDGET_ENTRIES,
      JSON.stringify([
        validEntry({ updatedAt: "2026-06-01T00:00:00.000Z", attachments: [attachment] }),
      ])
    );
    await importFromString(
      JSON.stringify({
        budgetEntries: [
          validEntry({
            updatedAt: "2026-06-10T00:00:00.000Z",
            attachments: [incomingAttachment],
          }),
        ],
      }),
      "merge"
    );
    expect(readStore(KEYS.BUDGET_ENTRIES)[0].attachments).toEqual([incomingAttachment]);
  });
});

describe("importFromString - businesses", () => {
  const BUSINESSES_KEY = "@budgetark_businesses";
  const validBusiness = (over: Record<string, unknown> = {}) => ({
    id: "b1",
    name: "Acme Consulting LLC",
    createdAt: "2026-02-01T00:00:00.000Z",
    updatedAt: "2026-02-01T00:00:00.000Z",
    ...over,
  });

  it("imports businesses into empty storage in the {businesses, version} store shape", async () => {
    const result = await importFromString(
      JSON.stringify({ businesses: [validBusiness()] }),
      "merge"
    );
    expect(result.businesses).toBe(1);
    const stored = readStore(BUSINESSES_KEY);
    expect(stored.businesses).toHaveLength(1);
    expect(stored.businesses[0].name).toBe("Acme Consulting LLC");
    expect(stored.version).toBe(1);
  });

  it("applies last-write-wins against an existing business", async () => {
    storageMock.__store.set(
      BUSINESSES_KEY,
      JSON.stringify({
        businesses: [
          validBusiness({ name: "Newer Local", updatedAt: "2026-06-10T00:00:00.000Z" }),
        ],
        version: 1,
      })
    );
    await importFromString(
      JSON.stringify({
        businesses: [
          validBusiness({ name: "Stale Import", updatedAt: "2026-01-01T00:00:00.000Z" }),
        ],
      }),
      "merge"
    );
    expect(readStore(BUSINESSES_KEY).businesses[0].name).toBe("Newer Local");
  });

  it("does not resurrect a locally-tombstoned business from a stale import", async () => {
    storageMock.__store.set(
      BUSINESSES_KEY,
      JSON.stringify({
        businesses: [
          validBusiness({
            deletedAt: "2026-06-10T00:00:00.000Z",
            updatedAt: "2026-06-10T00:00:00.000Z",
          }),
        ],
        version: 1,
      })
    );
    await importFromString(
      JSON.stringify({
        businesses: [validBusiness({ updatedAt: "2026-01-01T00:00:00.000Z" })],
      }),
      "merge"
    );
    expect(readStore(BUSINESSES_KEY).businesses[0].deletedAt).toBeTruthy();
  });

  it("rejects a business with an oversized name", async () => {
    await expect(
      importFromString(
        JSON.stringify({ businesses: [validBusiness({ name: "a".repeat(41) })] })
      )
    ).rejects.toThrow(/businesses contains/i);
  });

  it("imports entries carrying a businessId", async () => {
    await importFromString(
      JSON.stringify({ budgetEntries: [validEntry({ businessId: "b1" })] }),
      "merge"
    );
    expect(readStore(KEYS.BUDGET_ENTRIES)[0].businessId).toBe("b1");
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

/**
 * Golden-fixture decryption tests.
 *
 * These ciphertexts were produced ONCE with crypto-js 4.2.0, exactly the way
 * the app's export code builds them (v1: legacy `CryptoJS.AES.encrypt(json,
 * password).toString()`; v2: PBKDF2-SHA256 250k + AES-256-CBC in the
 * `saltHex.ivHex.ctBase64` envelope), and then hard-coded here. They stand in
 * for a backup created by an OLDER app version: if a future dependency bump
 * (crypto-js, RN, Hermes, polyfills) changes how these decrypt, users' old
 * encrypted backups become unrestorable - and this suite catches it before a
 * release does.
 *
 * DO NOT regenerate these to make a failing test pass - a failure here means
 * real users' existing backups are broken. Both fixtures encrypt the same
 * payload: one debt ("golden-debt-1" / balance 1234.56) and one budget entry
 * ("golden-entry-1" / amount 42.5), exportedAt 2026-07-01.
 */
describe("importFromString - golden encrypted fixtures (cross-version compat)", () => {
  const PASSWORD = "correct horse battery staple";

  const GOLDEN_V1 =
    "__BUDGETARK_ENC__:U2FsdGVkX18NG7bLLXCwDd2m01OzAFy3EeElDQ+0EdDqq/AczxG1O8e0cQyAqKJjUzNcHeJokgQqxCH+gndcv5YRCMRLn4frSwyaN8e0umZM3EAGumplurc5u68ZVYg18CNr9pArzOOL0SCA546wi4/DNhsxAxCvbPsJVDUxSRhoZTGDPFIzpIuG5rrdFWkVAgfl72hQxmJBL/jx9boMYYT6+nUnJ0jeRUpjBpGgv+h7GyiWGBf3RVlbdVSJe00SnHku7WacaU94zodeQ5VTr9X/0k151m44YlnbtJ4V07D0K9s1A+ByTNpUoDih08AzTz6Ok1vsERpB67BR7H+6gjNpUYIgi0y+fVi5yrpa/3V4qlCvPkWVnf3/znW9umDK8tohVqa/rXu8d83oA3MGE55yw6rHNYgixORAwoxaLRo4RDbCB4u5javsPHD4AjTJrKECXQuQw/FelHWO6LBvfns7dy6hz8alHT2PRJPtmVb7TcOwRTqRLOj6SPylp9tY2041deHQlKARfc3Dmg9yIhRrk+y3OcRPmAWOzHut7t8kSuTaSebe1dOYoMpDE/IgEyan4nNKJT+Ub7Rpj9FAOKmmtXcWSM6uWHFxqammIUFCiMNqSkY2phg9mVxfAWJq";

  const GOLDEN_V2 =
    "__BUDGETARK_ENC2__:5cc8a60f88f7953938c9601f815f565c.386f7d86ad34e950b6ada09c01470016.FF+ZWKWJuomqYZ21hXdNivgRx/IBoXdJB5PUcIEc5Xk2G4Nhc4Aeg5QgwFiU2FVbW2pBtPWIiV2dwFO8/IVyfb6MJBRiloqmd0PjgY3qy314RrlEPwJpRLF1idzztDZO7MPIR28sYl2Bua/E3CnvJkRgcxKfUH2SywYw/IHR5Y1hHBbduAXMU9GsSv7ntNGnDuALjv6YoCZGnhfcHrguY6pc00rTqepVVrCmX90N9DrIYOx4cySFtHjVLAZN6cvrk8HIKoc0A7JZRBM3y646VDq2HssnrmlCv9DloGO3++YgVkSyaJaUGShTDZpOXr9QOxgTZZJK8mPvcyrtRugekJtThL2dElyss0HYU0aUfvQnXlDaXVbye5Wsd3vl29uZE/T9gfswGhCu+j2FUPOaTxRTxlP6/6gJR2ALEbmXJ+L5//IACgBe2hWE+WF+bQLd6sSI2kZCM03FblrrfSe1GaIwFJRPMn/8PJxiEB1thf2MyEcaIJ5BDmB0KIOtADdxSJlPYS+7IQYkixy0oSW09gZIqvjdiJb7QuWS7SbWXdA61QKI/jS2YQ39h5UVnNOr8cJ2Btrvanx9fo3uUb8xY8V2Qxvb+3Cg8vFi7OAH+T8=";

  const expectGoldenPayloadStored = () => {
    const debts = readStore(KEYS.DEBTS);
    expect(debts).toHaveLength(1);
    expect(debts[0]).toMatchObject({ id: "golden-debt-1", balance: 1234.56 });
    const entries = readStore(KEYS.BUDGET_ENTRIES);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ id: "golden-entry-1", amount: 42.5 });
  };

  it("decrypts and imports a v1 (legacy KDF) encrypted backup", async () => {
    const result = await importFromString(GOLDEN_V1, "merge", PASSWORD);
    expect(result.debts).toBe(1);
    expect(result.budgetEntries).toBe(1);
    expectGoldenPayloadStored();
  });

  // The v2 tests each run a real 250k-iteration PBKDF2 in pure JS, which can
  // take a few seconds on a slow CI runner - hence the raised timeouts.
  it(
    "decrypts and imports a v2 (PBKDF2) encrypted backup",
    async () => {
      const result = await importFromString(GOLDEN_V2, "merge", PASSWORD);
      expect(result.debts).toBe(1);
      expect(result.budgetEntries).toBe(1);
      expectGoldenPayloadStored();
    },
    30_000
  );

  it("rejects the v1 backup with a wrong password", async () => {
    await expect(
      importFromString(GOLDEN_V1, "merge", "wrong-password")
    ).rejects.toThrow(/password may be incorrect/i);
    expect(storageMock.__store.size).toBe(0);
  });

  it(
    "rejects the v2 backup with a wrong password",
    async () => {
      await expect(
        importFromString(GOLDEN_V2, "merge", "wrong-password")
      ).rejects.toThrow(/password may be incorrect/i);
      expect(storageMock.__store.size).toBe(0);
    },
    30_000
  );
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

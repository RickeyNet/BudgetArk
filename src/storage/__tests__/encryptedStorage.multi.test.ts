/**
 * encryptedStorage's multi-key and read-repair edges, which the golden
 * V1/V2/V3 fixture suite in encryptedStorage.test.ts doesn't cover.
 *
 * What this guards:
 *  - `multiSet` rejects duplicate keys. The per-key write-queue map keeps one
 *    tail per key, so a duplicate would let an earlier queued write resolve
 *    AFTER the multiSet and silently clobber it.
 *  - `multiSet`'s encryption behaviour is pinned exactly as implemented,
 *    INCLUDING its vault contract (plaintext fallback for ordinary data, fail-closed
 *    no `requireEncryption` option, so no secret-bearing caller may use it.
 *  - `decryptStoredRaw` fails closed: tampered or garbage envelopes, and
 *    encrypted blobs with no vault key, raise rather than handing back
 *    ciphertext or a guess.
 *  - `migrateStoredValue`'s stale-write guard: the V1/plaintext upgrade-in-
 *    place must not revert a legitimate write that landed while the read was
 *    waiting on the secure vault.
 *  - `multiRemove` serializes against in-flight writes on the same keys, so a
 *    reset can't be undone by a write it raced.
 *
 * Native edges (AppState, AsyncStorage, SecureStore) are mocked; the AES/HMAC
 * math runs for real through the Node quick-crypto shim.
 */

// Captured so tests can simulate a background transition, which clears the
// module's in-memory master-key cache.
let mockAppStateCallback: ((state: string) => void) | undefined;
jest.mock("react-native", () => ({
  AppState: {
    addEventListener: (_event: string, cb: (state: string) => void) => {
      mockAppStateCallback = cb;
      return { remove: () => {} };
    },
  },
  // Android: the keychain-accessibility rewrite is an iOS-only concern and
  // returns before any I/O here, keeping these tests to one moving part.
  Platform: { OS: "android" },
}));

const mockAsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiSet: jest.fn(),
};
jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: mockAsyncStorage,
}));

const mockSecureStore = {
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "WHEN_UNLOCKED_THIS_DEVICE_ONLY",
};
jest.mock("expo-secure-store", () => mockSecureStore);

// eslint-disable-next-line import/first -- import after the native-module mocks are registered
import {
  DecryptionError,
  getItem,
  multiRemove,
  multiSet,
  setItem,
  updateItem,
  EncryptionUnavailableError,
} from "../encryptedStorage";

const MASTER_KEY = "3f".repeat(32); // 64-hex master key like the real generator makes
const V3 = "__ENCV3__:";

/** In-memory AsyncStorage shared by the suites; re-wired per test. */
const store = new Map<string, string>();

const wireStore = () => {
  mockAsyncStorage.getItem.mockImplementation(async (k: string) =>
    store.has(k) ? store.get(k)! : null
  );
  mockAsyncStorage.setItem.mockImplementation(async (k: string, v: string) => {
    store.set(k, v);
  });
  mockAsyncStorage.removeItem.mockImplementation(async (k: string) => {
    store.delete(k);
  });
  mockAsyncStorage.multiSet.mockImplementation(async (pairs: [string, string][]) => {
    for (const [k, v] of pairs) store.set(k, v);
  });
};

const wireWorkingVault = () => {
  mockSecureStore.getItemAsync.mockResolvedValue(MASTER_KEY);
  mockSecureStore.setItemAsync.mockResolvedValue(undefined);
  mockSecureStore.deleteItemAsync.mockResolvedValue(undefined);
};

/** No stored key and no way to mint one: encryption is unavailable. */
const wireBrokenVault = () => {
  mockSecureStore.getItemAsync.mockResolvedValue(null);
  mockSecureStore.setItemAsync.mockRejectedValue(new Error("keystore unavailable"));
};

const freshEnvironment = () => {
  jest.clearAllMocks();
  (global as { __DEV__?: boolean }).__DEV__ = false;
  store.clear();
  mockAppStateCallback?.("background"); // cold master-key cache per test
  wireStore();
};

describe("multiSet", () => {
  // withTimeout arms a 5s setTimeout it never clears on the winning race
  // branch; fake timers keep it from holding the event loop open.
  beforeAll(() => jest.useFakeTimers());
  afterAll(() => jest.useRealTimers());

  beforeEach(() => {
    freshEnvironment();
    wireWorkingVault();
  });

  it("writes every pair as its own V3 envelope in one native call", async () => {
    await multiSet([
      ["@debts", '[{"id":"d1","balance":1000}]'],
      ["@payments", '[{"id":"p1"}]'],
    ]);

    expect(mockAsyncStorage.multiSet).toHaveBeenCalledTimes(1);
    expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
    for (const key of ["@debts", "@payments"]) {
      expect(store.get(key)!.startsWith(V3)).toBe(true);
    }
    expect(store.get("@debts")).not.toContain("balance"); // actually encrypted
    await expect(getItem("@debts")).resolves.toBe('[{"id":"d1","balance":1000}]');
    await expect(getItem("@payments")).resolves.toBe('[{"id":"p1"}]');
  });

  it("throws on duplicate keys without writing anything", async () => {
    await expect(
      multiSet([
        ["@debts", "first"],
        ["@debts", "second"],
      ])
    ).rejects.toThrow(/duplicate keys/);
    expect(mockAsyncStorage.multiSet).not.toHaveBeenCalled();
    expect(store.size).toBe(0);
  });

  it("does nothing at all for an empty pair list", async () => {
    await multiSet([]);
    expect(mockAsyncStorage.multiSet).not.toHaveBeenCalled();
  });

  it("runs after an in-flight setItem on the same key rather than racing it", async () => {
    const order: string[] = [];
    mockAsyncStorage.setItem.mockImplementation(async (k: string, v: string) => {
      order.push("setItem");
      store.set(k, v);
    });
    mockAsyncStorage.multiSet.mockImplementation(async (pairs: [string, string][]) => {
      order.push("multiSet");
      for (const [k, v] of pairs) store.set(k, v);
    });

    // Deliberately not awaited: the multiSet must queue behind it.
    const write = setItem("@debts", "from-setItem");
    const both = multiSet([
      ["@debts", "from-multiSet"],
      ["@payments", "other"],
    ]);
    await Promise.all([write, both]);

    expect(order).toEqual(["setItem", "multiSet"]);
    await expect(getItem("@debts")).resolves.toBe("from-multiSet");
  });

  it("queues a setItem issued right after multiSet behind it", async () => {
    // multiSet claims its per-key queue tail synchronously - before the
    // vault-key lookup - so a setItem started in the same tick queues
    // behind it and lands last. (It used to await the key first, leaving a
    // window where the later setItem ran first and was silently clobbered.)
    const order: string[] = [];
    mockAsyncStorage.setItem.mockImplementation(async (k: string, v: string) => {
      order.push("setItem");
      store.set(k, v);
    });
    mockAsyncStorage.multiSet.mockImplementation(async (pairs: [string, string][]) => {
      order.push("multiSet");
      for (const [k, v] of pairs) store.set(k, v);
    });

    const both = multiSet([["@debts", "from-multiSet"]]);
    const write = setItem("@debts", "from-setItem");
    await Promise.all([both, write]);

    expect(order).toEqual(["multiSet", "setItem"]);
    await expect(getItem("@debts")).resolves.toBe("from-setItem");
  });
});

/**
 * multiSet mirrors setItem's vault contract: ordinary app data degrades to
 * plaintext when the vault is unavailable (data-loss avoidance), while a
 * `requireEncryption` caller fails closed with EncryptionUnavailableError
 * and nothing reaches AsyncStorage (CLAUDE.md rule 2).
 */
describe("multiSet with no vault key", () => {
  beforeAll(() => jest.useFakeTimers());
  afterAll(() => jest.useRealTimers());

  beforeEach(() => {
    freshEnvironment();
    wireBrokenVault();
  });

  it("rejects with EncryptionUnavailableError and writes nothing when encryption is required", async () => {
    await expect(
      multiSet(
        [
          ["@secret-a", "token"],
          ["@secret-b", "more"],
        ],
        { requireEncryption: true }
      )
    ).rejects.toBeInstanceOf(EncryptionUnavailableError);

    expect(mockAsyncStorage.multiSet).not.toHaveBeenCalled();
    expect(store.has("@secret-a")).toBe(false);
    expect(store.has("@secret-b")).toBe(false);
    // The failed call must not wedge the per-key queue for later writes.
    await setItem("@secret-a", "later");
    expect(store.get("@secret-a")).toBe("later");
  });

  it("falls back to plaintext for ordinary data instead of throwing", async () => {
    await multiSet([
      ["@debts", "ordinary-app-data"],
      ["@payments", "more-data"],
    ]);

    expect(store.get("@debts")).toBe("ordinary-app-data");
    expect(store.get("@payments")).toBe("more-data");
    // ...and reads back through the same plaintext read-only mode.
    await expect(getItem("@debts")).resolves.toBe("ordinary-app-data");
  });
});

describe("decryptStoredRaw fails closed", () => {
  beforeAll(() => jest.useFakeTimers());
  afterAll(() => jest.useRealTimers());

  beforeEach(() => {
    freshEnvironment();
    wireWorkingVault();
  });

  it("raises inside updateItem on a tampered V3 value, leaving it untouched", async () => {
    // updateItem decrypts INSIDE the write queue, a separate call site from
    // getItem's - it must fail closed there too.
    await setItem("@k", "authentic");
    const raw = store.get("@k")!;
    const lastDot = raw.lastIndexOf(".");
    const tampered =
      raw.slice(0, lastDot + 1) +
      (raw[lastDot + 1] === "A" ? "B" : "A") +
      raw.slice(lastDot + 2);
    store.set("@k", tampered);

    const updater = jest.fn(() => "replacement");
    await expect(updateItem("@k", updater)).rejects.toBeInstanceOf(DecryptionError);
    expect(updater).not.toHaveBeenCalled();
    expect(store.get("@k")).toBe(tampered); // no salvage write
  });

  it.each([
    ["a V3 envelope with a garbage body", V3 + "garbage"],
    ["a V3 envelope with a valid-looking but wrong HMAC", V3 + "0".repeat(64) + ".00.AAAA"],
    ["a V2 envelope with a garbage body", "__ENCV2__:garbage"],
    ["a V1 envelope with a garbage body", "__ENC__:garbage"],
  ])("raises DecryptionError for %s", async (_label, raw) => {
    store.set("@k", raw);
    await expect(getItem("@k")).rejects.toBeInstanceOf(DecryptionError);
    // Never hands the caller the raw blob as if it were plaintext.
    expect(store.get("@k")).toBe(raw);
  });

  it("raises rather than returning ciphertext when the vault key is gone", async () => {
    await setItem("@k", "secret-ish");
    const encrypted = store.get("@k")!;

    // The keystore breaks (mismatched Keystore, sideloaded install...).
    mockAppStateCallback?.("background");
    wireBrokenVault();

    await expect(getItem("@k")).rejects.toBeInstanceOf(DecryptionError);
    expect(store.get("@k")).toBe(encrypted);
  });

  it("still reads pre-encryption plaintext when the vault key is gone", async () => {
    // Documented read-only fallback: don't encrypt what we can't decrypt
    // later, and don't lose the value either.
    store.set("@legacy", '{"plain":"json"}');
    mockAppStateCallback?.("background");
    wireBrokenVault();

    await expect(getItem("@legacy")).resolves.toBe('{"plain":"json"}');
    expect(store.get("@legacy")).toBe('{"plain":"json"}'); // not re-encrypted
  });
});

describe("migrateStoredValue upgrade-in-place", () => {
  beforeAll(() => jest.useFakeTimers());
  afterAll(() => jest.useRealTimers());

  beforeEach(() => {
    freshEnvironment();
    wireWorkingVault();
  });

  it("upgrades a legacy plaintext value to V3 when nothing else writes", async () => {
    store.set("@k", "legacy-plaintext");
    await expect(getItem("@k")).resolves.toBe("legacy-plaintext");
    expect(store.get("@k")!.startsWith(V3)).toBe(true);
    await expect(getItem("@k")).resolves.toBe("legacy-plaintext");
  });

  it("does not clobber a write that landed while the read awaited the vault", async () => {
    store.set("@k", "legacy-plaintext");

    // Fire a real setItem the instant the getItem read completes - the same
    // shape as a user edit landing during the SecureStore round-trip that
    // follows. Without the re-check in migrateStoredValue, the migration
    // would write the encrypted OLD value over it.
    let concurrentWrite: Promise<void> | null = null;
    mockAsyncStorage.getItem.mockImplementation(async (k: string) => {
      const current = store.has(k) ? store.get(k)! : null;
      if (k === "@k" && concurrentWrite === null) {
        concurrentWrite = setItem("@k", "newer-value");
      }
      return current;
    });

    // The read still returns the value it actually saw.
    await expect(getItem("@k")).resolves.toBe("legacy-plaintext");
    await concurrentWrite;

    // But storage holds the newer write, not a resurrected "legacy-plaintext".
    expect(store.get("@k")!.startsWith(V3)).toBe(true);
    await expect(getItem("@k")).resolves.toBe("newer-value");
  });
});

describe("multiRemove", () => {
  beforeAll(() => jest.useFakeTimers());
  afterAll(() => jest.useRealTimers());

  beforeEach(() => {
    freshEnvironment();
    wireWorkingVault();
  });

  it("clears every key it is given and tolerates absent ones", async () => {
    await setItem("@a", "one");
    await setItem("@b", "two");

    await multiRemove(["@a", "@b", "@never-existed"]);

    expect(store.size).toBe(0);
    await expect(getItem("@a")).resolves.toBeNull();
  });

  it("runs after an in-flight setItem on the same key, so the key stays gone", async () => {
    const order: string[] = [];
    mockAsyncStorage.setItem.mockImplementation(async (k: string, v: string) => {
      order.push("setItem");
      store.set(k, v);
    });
    mockAsyncStorage.removeItem.mockImplementation(async (k: string) => {
      order.push("removeItem");
      store.delete(k);
    });

    const write = setItem("@a", "value"); // deliberately not awaited
    const remove = multiRemove(["@a"]);
    await Promise.all([write, remove]);

    expect(order).toEqual(["setItem", "removeItem"]);
    expect(store.has("@a")).toBe(false);
  });
});

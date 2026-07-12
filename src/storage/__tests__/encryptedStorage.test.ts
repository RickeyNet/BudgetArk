/**
 * Guarantee that secret-bearing writes never degrade to plaintext.
 *
 * Connection credentials pass `requireEncryption: true`; if the OS secure
 * keystore can't hand back the AES master key (broken/mismatched Keystore,
 * some sideloaded installs), the write must throw rather than silently store
 * the secret in the clear. Ordinary app data keeps its plaintext fallback so a
 * broken keystore doesn't cause data loss.
 */

// Captured so tests can simulate a background transition (which clears the
// module's in-memory key cache - needed to test vault-unavailable paths
// after a key has already been cached by earlier tests).
let mockAppStateCallback: ((state: string) => void) | undefined;
jest.mock("react-native", () => ({
  AppState: {
    addEventListener: (_event: string, cb: (state: string) => void) => {
      mockAppStateCallback = cb;
      return { remove: () => {} };
    },
  },
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
};
jest.mock("expo-secure-store", () => mockSecureStore);

// eslint-disable-next-line import/first -- import after the native-module mocks are registered
import CryptoJS from "crypto-js";
// eslint-disable-next-line import/first
import {
  getItem,
  setItem,
  isEncryptionAvailable,
  DecryptionError,
  EncryptionUnavailableError,
  encryptStringWithMasterKey,
  decryptStringWithMasterKey,
} from "../encryptedStorage";

describe("encryptedStorage: no plaintext for secret-bearing writes", () => {
  // withTimeout() arms a 5s setTimeout it never clears on the winning race
  // branch; fake timers keep that from holding the event loop open after the
  // run (resolution comes from the mocked promises, not the timer).
  beforeAll(() => jest.useFakeTimers());
  afterAll(() => jest.useRealTimers());

  beforeEach(() => {
    jest.clearAllMocks();
    // react-native defines __DEV__ globally; the module logs under it on error.
    (global as { __DEV__?: boolean }).__DEV__ = false;
    // Simulate an unavailable secure keystore: no stored key, and writing a
    // fresh one fails - so the AES master key can never be obtained.
    mockSecureStore.getItemAsync.mockResolvedValue(null);
    mockSecureStore.setItemAsync.mockRejectedValue(new Error("keystore unavailable"));
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
  });

  it("reports encryption unavailable when the keystore can't provide a key", async () => {
    await expect(isEncryptionAvailable()).resolves.toBe(false);
  });

  it("throws instead of writing plaintext when requireEncryption is set", async () => {
    await expect(
      setItem("@budgetark_connection_secrets", "sensitive-token", {
        requireEncryption: true,
      }),
    ).rejects.toBeInstanceOf(EncryptionUnavailableError);
    // Nothing reached the underlying store.
    expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it("still falls back to plaintext for ordinary app data (no flag)", async () => {
    await setItem("@ordinary_key", "value");
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith("@ordinary_key", "value");
  });
});

/**
 * Cross-version format coverage for the native-crypto migration (2026-07).
 *
 * The V1/V2 fixtures are produced HERE with real crypto-js - the library
 * every pre-migration install used - and must decrypt through the new
 * native implementation, then upgrade in place to V3. If any of these fail,
 * an app update would brick users' stored data.
 */
describe("encryptedStorage: V3 format + V1/V2/plaintext migration", () => {
  const MASTER_KEY = "ab".repeat(32); // 64-hex master key like the real generator makes
  const store = new Map<string, string>();

  beforeAll(() => jest.useFakeTimers());
  afterAll(() => jest.useRealTimers());

  beforeEach(() => {
    jest.clearAllMocks();
    store.clear();
    mockSecureStore.getItemAsync.mockResolvedValue(MASTER_KEY);
    mockSecureStore.setItemAsync.mockResolvedValue(undefined);
    mockAsyncStorage.getItem.mockImplementation(async (k: string) =>
      store.has(k) ? store.get(k)! : null
    );
    mockAsyncStorage.setItem.mockImplementation(async (k: string, v: string) => {
      store.set(k, v);
    });
  });

  it("writes V3 and reads it back", async () => {
    await setItem("@k", '{"balance":1234.56}');
    const raw = store.get("@k")!;
    expect(raw.startsWith("__ENCV3__:")).toBe(true);
    expect(raw).not.toContain("balance"); // actually encrypted
    await expect(getItem("@k")).resolves.toBe('{"balance":1234.56}');
  });

  it("round-trips an empty string (legitimate value, not a failure)", async () => {
    await setItem("@k", "");
    await expect(getItem("@k")).resolves.toBe("");
  });

  it("decrypts a crypto-js V2 value and upgrades it to V3 in place", async () => {
    const plaintext = '{"debts":[{"id":"d1"}]}';
    const ciphertext = CryptoJS.AES.encrypt(plaintext, MASTER_KEY).toString();
    const hmac = CryptoJS.HmacSHA256(ciphertext, MASTER_KEY).toString(
      CryptoJS.enc.Hex
    );
    store.set("@k", "__ENCV2__:" + hmac + "." + ciphertext);

    await expect(getItem("@k")).resolves.toBe(plaintext);
    expect(store.get("@k")!.startsWith("__ENCV3__:")).toBe(true);
    await expect(getItem("@k")).resolves.toBe(plaintext); // still reads post-migration
  });

  it("decrypts a crypto-js V1 value (no HMAC) and upgrades it to V3", async () => {
    const plaintext = "legacy value";
    const ciphertext = CryptoJS.AES.encrypt(plaintext, MASTER_KEY).toString();
    store.set("@k", "__ENC__:" + ciphertext);

    await expect(getItem("@k")).resolves.toBe(plaintext);
    expect(store.get("@k")!.startsWith("__ENCV3__:")).toBe(true);
  });

  it("re-encrypts pre-encryption plaintext to V3 on read", async () => {
    store.set("@k", '{"plain":"json"}');
    await expect(getItem("@k")).resolves.toBe('{"plain":"json"}');
    expect(store.get("@k")!.startsWith("__ENCV3__:")).toBe(true);
  });

  it("throws DecryptionError on a tampered V3 value", async () => {
    await setItem("@k", "authentic");
    const raw = store.get("@k")!;
    // Flip a ciphertext character (after the second dot).
    const lastDot = raw.lastIndexOf(".");
    const flipped =
      raw.slice(0, lastDot + 1) +
      (raw[lastDot + 1] === "A" ? "B" : "A") +
      raw.slice(lastDot + 2);
    store.set("@k", flipped);
    await expect(getItem("@k")).rejects.toBeInstanceOf(DecryptionError);
  });

  it("throws DecryptionError on a tampered V2 value", async () => {
    const ciphertext = CryptoJS.AES.encrypt("secret", MASTER_KEY).toString();
    store.set("@k", "__ENCV2__:" + "0".repeat(64) + "." + ciphertext);
    await expect(getItem("@k")).rejects.toBeInstanceOf(DecryptionError);
  });

  /**
   * Master-key string helpers used by the receipt-attachment store to
   * encrypt image files that live OUTSIDE AsyncStorage. Same V3 envelope,
   * so the fixtures above already pin the format.
   */
  describe("encryptStringWithMasterKey / decryptStringWithMasterKey", () => {
    it("round-trips an arbitrary string through the V3 envelope", async () => {
      const blob = await encryptStringWithMasterKey("jpeg-base64-payload==");
      expect(blob).not.toBeNull();
      expect(blob!.startsWith("__ENCV3__:")).toBe(true);
      expect(blob).not.toContain("jpeg-base64-payload");
      await expect(decryptStringWithMasterKey(blob!)).resolves.toBe(
        "jpeg-base64-payload=="
      );
    });

    it("returns null on tampered or non-V3 input instead of throwing", async () => {
      const blob = (await encryptStringWithMasterKey("receipt"))!;
      const lastDot = blob.lastIndexOf(".");
      const flipped =
        blob.slice(0, lastDot + 1) +
        (blob[lastDot + 1] === "A" ? "B" : "A") +
        blob.slice(lastDot + 2);
      await expect(decryptStringWithMasterKey(flipped)).resolves.toBeNull();
      await expect(decryptStringWithMasterKey("not-an-envelope")).resolves.toBeNull();
    });

    it("returns null (never plaintext) when the vault is unavailable", async () => {
      // Drop the in-memory key cache, then make the vault fail.
      mockAppStateCallback?.("background");
      mockSecureStore.getItemAsync.mockResolvedValue(null);
      mockSecureStore.setItemAsync.mockRejectedValue(new Error("keystore down"));
      await expect(encryptStringWithMasterKey("receipt")).resolves.toBeNull();
    });
  });
});

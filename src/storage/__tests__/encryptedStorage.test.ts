/**
 * Guarantee that secret-bearing writes never degrade to plaintext.
 *
 * Connection credentials pass `requireEncryption: true`; if the OS secure
 * keystore can't hand back the AES master key (broken/mismatched Keystore,
 * some sideloaded installs), the write must throw rather than silently store
 * the secret in the clear. Ordinary app data keeps its plaintext fallback so a
 * broken keystore doesn't cause data loss.
 */

jest.mock("react-native", () => ({
  AppState: { addEventListener: () => ({ remove: () => {} }) },
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
import {
  setItem,
  isEncryptionAvailable,
  EncryptionUnavailableError,
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

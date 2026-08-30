/**
 * Security invariant (see CLAUDE.md rule 2): bank connection secrets must
 * fail closed, never fall back to plaintext. Every write in this module
 * goes through `EncryptedStorage.setItem(..., { requireEncryption: true })`,
 * so when the secure keystore is unavailable, `setItem` rejects with
 * `EncryptionUnavailableError` and that rejection MUST propagate out of
 * every exported write helper here - never be swallowed into a silent
 * plaintext write or a resolved promise. Also pins `setTellerAccessToken`'s
 * provider-mismatch refusal: it silently declines to write rather than
 * touching a SimpleFIN (or missing) record.
 *
 * encryptedStorage itself pulls in react-native/expo-secure-store, so it's
 * mocked wholesale here (per the repo's "never import react-native in a
 * test" rule). The mock re-declares `EncryptionUnavailableError` with the
 * same name/shape as the real class (see encryptedStorage.ts) so
 * `instanceof` checks against the class this test imports - which resolves
 * to the mock's export - work exactly like the production error would.
 */
import type { SimplefinSecrets, TellerSecrets } from "../connectionSecretsStorage";

let mockStore: Map<string, string>;
let encryptionAvailable: boolean;

jest.mock("../encryptedStorage", () => {
  class EncryptionUnavailableError extends Error {
    constructor(key: string) {
      super(`Secure keystore unavailable; refusing to store "${key}" unencrypted`);
      this.name = "EncryptionUnavailableError";
    }
  }
  return {
    EncryptionUnavailableError,
    getItem: jest.fn(async (k: string) =>
      mockStore.has(k) ? mockStore.get(k)! : null
    ),
    setItem: jest.fn(
      async (k: string, v: string, options?: { requireEncryption?: boolean }) => {
        if (!encryptionAvailable && options?.requireEncryption) {
          throw new EncryptionUnavailableError(k);
        }
        mockStore.set(k, v);
      }
    ),
    removeItem: jest.fn(async (k: string) => {
      mockStore.delete(k);
    }),
  };
});

// eslint-disable-next-line import/first -- import after the encryptedStorage mock is registered
import {
  deleteConnectionSecrets,
  getConnectionSecrets,
  hasSecretsForProvider,
  setConnectionSecrets,
  setTellerAccessToken,
} from "../connectionSecretsStorage";
// eslint-disable-next-line import/first
import { EncryptionUnavailableError } from "../encryptedStorage";

const KEY = "@budgetark_connection_secrets";

const simplefin = (over: Partial<SimplefinSecrets> = {}): SimplefinSecrets => ({
  provider: "simplefin",
  accessUrl: "https://user:pass@bridge.simplefin.org/simplefin",
  ...over,
});

const teller = (over: Partial<TellerSecrets> = {}): TellerSecrets => ({
  provider: "teller",
  applicationId: "app_123",
  environment: "development",
  certificatePem: "-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----",
  privateKeyPem: "-----BEGIN PRIVATE KEY-----\nxyz\n-----END PRIVATE KEY-----",
  accessTokens: {},
  ...over,
});

beforeEach(() => {
  mockStore = new Map();
  encryptionAvailable = true;
});

describe("fail-closed: EncryptionUnavailableError propagates, never a plaintext fallback", () => {
  it("setConnectionSecrets rejects and writes nothing when the keystore is unavailable", async () => {
    encryptionAvailable = false;
    await expect(
      setConnectionSecrets("conn-1", simplefin())
    ).rejects.toBeInstanceOf(EncryptionUnavailableError);
    expect(mockStore.has(KEY)).toBe(false);
  });

  it("deleteConnectionSecrets rejects and leaves the stored map untouched", async () => {
    encryptionAvailable = true;
    await setConnectionSecrets("conn-1", simplefin());
    const before = mockStore.get(KEY);

    encryptionAvailable = false;
    await expect(deleteConnectionSecrets("conn-1")).rejects.toBeInstanceOf(
      EncryptionUnavailableError
    );
    expect(mockStore.get(KEY)).toBe(before);
  });

  it("setTellerAccessToken rejects and does not persist the new token", async () => {
    encryptionAvailable = true;
    await setConnectionSecrets("conn-1", teller());

    encryptionAvailable = false;
    await expect(
      setTellerAccessToken("conn-1", "enroll-1", "secret-token")
    ).rejects.toBeInstanceOf(EncryptionUnavailableError);

    // Read back with encryption restored: no accessToken was written.
    encryptionAvailable = true;
    const secrets = (await getConnectionSecrets("conn-1")) as TellerSecrets;
    expect(secrets.accessTokens).toEqual({});
  });

  it("never falls back to writing the plaintext JSON when the vault is unavailable", async () => {
    encryptionAvailable = false;
    await expect(setConnectionSecrets("conn-1", simplefin())).rejects.toThrow(
      EncryptionUnavailableError
    );
    // The whole point of requireEncryption: no value under this key at all,
    // encrypted or not - rule 2 forbids a plaintext degrade path here.
    expect(mockStore.has(KEY)).toBe(false);
  });
});

describe("setTellerAccessToken - provider mismatch refusal", () => {
  it("silently declines to write when the stored secrets are SimpleFIN, not Teller", async () => {
    await setConnectionSecrets("conn-1", simplefin());
    const before = mockStore.get(KEY);

    await setTellerAccessToken("conn-1", "enroll-1", "should-not-persist");

    expect(mockStore.get(KEY)).toBe(before);
    const secrets = await getConnectionSecrets("conn-1");
    expect(secrets?.provider).toBe("simplefin");
  });

  it("silently declines to write when there are no secrets at all for the connection", async () => {
    await setTellerAccessToken("missing-conn", "enroll-1", "token");
    expect(mockStore.has(KEY)).toBe(false);
    expect(await getConnectionSecrets("missing-conn")).toBeUndefined();
  });

  it("does write when the stored secrets are Teller, merging into accessTokens", async () => {
    await setConnectionSecrets("conn-1", teller({ accessTokens: { "e-old": "tok-old" } }));
    await setTellerAccessToken("conn-1", "e-new", "tok-new");
    const secrets = (await getConnectionSecrets("conn-1")) as TellerSecrets;
    expect(secrets.accessTokens).toEqual({ "e-old": "tok-old", "e-new": "tok-new" });
  });
});

describe("basic CRUD", () => {
  it("getConnectionSecrets returns undefined for an unknown connection", async () => {
    expect(await getConnectionSecrets("nope")).toBeUndefined();
  });

  it("deleteConnectionSecrets is a no-op (no write) when the id is absent", async () => {
    await setConnectionSecrets("conn-1", simplefin());
    const before = mockStore.get(KEY);
    await deleteConnectionSecrets("does-not-exist");
    expect(mockStore.get(KEY)).toBe(before);
  });

  it("hasSecretsForProvider matches only the stored provider", async () => {
    await setConnectionSecrets("conn-1", simplefin());
    expect(await hasSecretsForProvider("conn-1", "simplefin")).toBe(true);
    expect(await hasSecretsForProvider("conn-1", "teller")).toBe(false);
    expect(await hasSecretsForProvider("missing", "simplefin")).toBe(false);
  });

  it("getConnectionSecrets returns undefined on corrupt storage", async () => {
    mockStore.set(KEY, "{not json");
    expect(await getConnectionSecrets("conn-1")).toBeUndefined();
  });
});

/**
 * v3 export envelope (encrypt-then-MAC) contract tests.
 *
 * Runs the real crypto via the quick-crypto → Node crypto Jest mapping.
 * The properties that matter:
 *   - round-trip: what encrypt writes, decrypt reads
 *   - tamper-evidence: ANY altered character fails BEFORE decryption
 *   - wrong password: same failure (MAC key derives from the password)
 *   - fail-closed on malformed envelopes
 * The golden fixture pins the byte format: it was produced by the initial
 * implementation and must keep decrypting in every future version, or an
 * app update would strand users' password-protected backups. Do not
 * regenerate it to make a failing test pass.
 */

import {
  ENCRYPTED_EXPORT_PREFIX_V3,
  EXPORT_DECRYPT_ERROR_MESSAGE,
  __setPbkdf2IterationsForTests,
  decryptExportEnvelopeV3,
  encryptExportEnvelopeV3,
} from "../exportEncryption";

const PASSWORD = "correct horse battery staple";

// Real iteration count needs headroom on slow CI runners; the fast-override
// tests below don't.
const REAL_ITERATIONS_TIMEOUT_MS = 30_000;

const stripPrefix = (envelope: string): string => {
  expect(envelope.startsWith(ENCRYPTED_EXPORT_PREFIX_V3)).toBe(true);
  return envelope.slice(ENCRYPTED_EXPORT_PREFIX_V3.length);
};

describe("encryptExportEnvelopeV3 / decryptExportEnvelopeV3 (envelope framing)", () => {
  // These assertions care about framing/tamper-evidence/fail-closed parsing,
  // not the KDF itself (that's covered separately, at the real cost, below
  // and by nativeCrypto's own tests) - run them at a trivial iteration
  // count so the suite doesn't pay the real 250k cost five times over.
  beforeEach(() => {
    __setPbkdf2IterationsForTests(8);
  });

  afterEach(() => {
    __setPbkdf2IterationsForTests(null);
  });

  it("round-trips JSON and never leaks plaintext into the envelope", async () => {
    const json = '{"debts":[{"id":"d1","balance":1234.56}]}';
    const envelope = await encryptExportEnvelopeV3(json, PASSWORD);
    expect(envelope).not.toContain("balance");
    // prefix + salt(32) "." iv(32) "." ct "." mac(64)
    expect(stripPrefix(envelope).split(".")).toHaveLength(4);
    await expect(
      decryptExportEnvelopeV3(stripPrefix(envelope), PASSWORD)
    ).resolves.toBe(json);
  });

  it("detects a single flipped ciphertext character (tamper-evidence)", async () => {
    const envelope = stripPrefix(
      await encryptExportEnvelopeV3('{"debts":[]}', PASSWORD)
    );
    const [salt, iv, ct, mac] = envelope.split(".");
    const flippedCt = (ct[0] === "A" ? "B" : "A") + ct.slice(1);
    await expect(
      decryptExportEnvelopeV3(`${salt}.${iv}.${flippedCt}.${mac}`, PASSWORD)
    ).rejects.toThrow(EXPORT_DECRYPT_ERROR_MESSAGE);
    // A flipped MAC character must fail identically.
    const flippedMac = (mac[0] === "a" ? "b" : "a") + mac.slice(1);
    await expect(
      decryptExportEnvelopeV3(`${salt}.${iv}.${ct}.${flippedMac}`, PASSWORD)
    ).rejects.toThrow(EXPORT_DECRYPT_ERROR_MESSAGE);
  });

  it("rejects a wrong password with the same error", async () => {
    const envelope = stripPrefix(
      await encryptExportEnvelopeV3('{"debts":[]}', PASSWORD)
    );
    await expect(
      decryptExportEnvelopeV3(envelope, "wrong-password")
    ).rejects.toThrow(EXPORT_DECRYPT_ERROR_MESSAGE);
  });

  it("fails closed on malformed envelopes", async () => {
    for (const bad of [
      "",
      "a.b.c", // v2 shape (3 parts)
      "a.b.c.d.e", // too many parts
      `${"z".repeat(32)}.${"0".repeat(32)}.Y3Q=.${"0".repeat(64)}`, // non-hex salt
      `${"0".repeat(30)}.${"0".repeat(32)}.Y3Q=.${"0".repeat(64)}`, // short salt
    ]) {
      await expect(decryptExportEnvelopeV3(bad, PASSWORD)).rejects.toThrow(
        EXPORT_DECRYPT_ERROR_MESSAGE
      );
    }
  });

  it("uses a fresh salt and iv per export (same input, different envelopes)", async () => {
    const json = '{"debts":[]}';
    const a = await encryptExportEnvelopeV3(json, PASSWORD);
    const b = await encryptExportEnvelopeV3(json, PASSWORD);
    expect(a).not.toBe(b);
    expect(stripPrefix(a).split(".")[0]).not.toBe(stripPrefix(b).split(".")[0]);
  });
});

describe("encryptExportEnvelopeV3 / decryptExportEnvelopeV3 (real iteration count)", () => {
  // No override here - `EXPORT_KDF_ITERATIONS` (250k) applies, so at least
  // one full encrypt+decrypt round trip exercises production's actual KDF
  // cost instead of only the fast-overridden framing checks above.
  it(
    "round-trips JSON at the real PBKDF2 cost",
    async () => {
      const json = '{"debts":[{"id":"d1","balance":1234.56}]}';
      const envelope = await encryptExportEnvelopeV3(json, PASSWORD);
      expect(envelope).not.toContain("balance");
      expect(stripPrefix(envelope).split(".")).toHaveLength(4);
      await expect(
        decryptExportEnvelopeV3(stripPrefix(envelope), PASSWORD)
      ).resolves.toBe(json);
    },
    REAL_ITERATIONS_TIMEOUT_MS
  );
});

describe("golden v3 fixture (format pin)", () => {
  // Also runs at the real iteration count (no override set): the fixture
  // below was produced at 250k and must keep decrypting at that same cost.
  const GOLDEN_V3 =
    "__BUDGETARK_ENC3__:e4ce337ab5f32dca2275e146bf1383c8.edba4dc9b36d04890d92ca94b7991b9a.1wFvm+thlCi7xYwCJ1B6OQqLeqjJczErMhaxqrvVr2a7yuKaciPgZ19F7Q2aFcxl+c/Jcfj8lVEPgUXUgCIL2mTEujxFA1vq5mf4Hmg4PbarLiQ0zp+QTTffIL7NbjdAIUpRHfk5lKjK8/iwsAAm5W8qS4ZaHTObkMjc9GBsj2epB2NinmjAExMzcYgEpasPizeNKpL+nPIz5sna9GI+eZmbIR75h1zrdCZt6fJuWzLDVQB/hoVt8Czi8lrzLajK9Qs8L9QTIHL3v/EY4nkBAnGf+RPH/X8P+Y7brXGf7z/IZldL5XHWVZgA2LY5hxV32HIzvpKuz+UNw0VQVRFyroidaG//8v/UIrlc1AmcZRENY26fMWplBz7uJjHEPmYkes+1OKul5ULadVeN4pcZDrKXnEDCes1mV4u+v+dLJY0pZcwN1IJOHacjntFQG6hzTaoRBrLrIzoa6DrHqPWrxdvQMMenapeBs3dgBD/Gcq9TEvbmtZ0B61mrWsWxJHNGC/vmD9c6RNqL8kbYwmxr33sTBdxAvmx8Fk1buhZKqZ5CcNm70MSnkDHWTTLVtYzfnEBr/+lx1nz3YwgbewOM3GOik+6BP+nbKm1rFdepCg8=.de54b3aedf30c9221c3962593574ecba5b7752b60d964815792e90783df30951";

  it(
    "decrypts the pinned fixture (same golden payload as the v1/v2 fixtures)",
    async () => {
      const json = await decryptExportEnvelopeV3(
        GOLDEN_V3.slice(ENCRYPTED_EXPORT_PREFIX_V3.length),
        PASSWORD
      );
      const payload = JSON.parse(json);
      expect(payload.debts[0]).toMatchObject({
        id: "golden-debt-1",
        balance: 1234.56,
      });
      expect(payload.budgetEntries[0]).toMatchObject({
        id: "golden-entry-1",
        amount: 42.5,
      });
    },
    REAL_ITERATIONS_TIMEOUT_MS
  );
});

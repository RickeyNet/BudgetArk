/**
 * Cross-implementation compatibility tests for the native crypto wrapper.
 *
 * Every assertion pits nativeCrypto (node crypto in Jest; quick-crypto on
 * device - both OpenSSL) against crypto-js, the library that produced all
 * ciphertexts existing installs hold. If any of these fail, users' stored
 * data or backups would stop decrypting after the migration - fix the
 * wrapper, never the expectation.
 */
import CryptoJS from "crypto-js";
import {
  aesCbcDecryptFromBase64,
  aesCbcEncryptToBase64,
  base64ToBytes,
  bytesToHex,
  decryptLegacyCryptoJsBlob,
  hexToBytes,
  hmacSha256Hex,
  pbkdf2Sha256,
  randomHex,
  utf8ToBytes,
} from "../nativeCrypto";

const SAMPLE_TEXTS = [
  "hello world",
  '{"debts":[{"id":"d1","balance":1234.56}]}',
  "unicode: åäö → 你好 🎉 emoji and ﬁ ligatures",
  "", // empty plaintext round-trips too
];

describe("byte/string helpers vs crypto-js encoders", () => {
  it("utf8ToBytes matches CryptoJS.enc.Utf8.parse", () => {
    for (const text of SAMPLE_TEXTS) {
      const ours = bytesToHex(utf8ToBytes(text));
      const theirs = CryptoJS.enc.Utf8.parse(text).toString(CryptoJS.enc.Hex);
      expect(ours).toBe(theirs);
    }
  });

  it("hex and base64 helpers round-trip and match crypto-js", () => {
    const hex = "00ff10a5c3d2e1b4000102030405060708090a0b";
    expect(bytesToHex(hexToBytes(hex))).toBe(hex);
    const b64 = CryptoJS.enc.Hex.parse(hex).toString(CryptoJS.enc.Base64);
    expect(bytesToHex(base64ToBytes(b64))).toBe(hex);
  });
});

describe("PBKDF2-SHA256 parity", () => {
  it("derives the same key as CryptoJS.PBKDF2 (1k iterations)", async () => {
    const saltHex = "5cc8a60f88f7953938c9601f815f565c";
    const password = "correct horse battery staple";
    const ours = await pbkdf2Sha256(password, hexToBytes(saltHex), 1_000, 32);
    const theirs = CryptoJS.PBKDF2(password, CryptoJS.enc.Hex.parse(saltHex), {
      keySize: 256 / 32,
      iterations: 1_000,
      hasher: CryptoJS.algo.SHA256,
    }).toString(CryptoJS.enc.Hex);
    expect(bytesToHex(ours)).toBe(theirs);
  });
});

describe("AES-256-CBC parity", () => {
  const keyHex =
    "603deb1015ca71be2b73aef0857d77811f352c073b6108d72d9810a30914dff4";
  const ivHex = "000102030405060708090a0b0c0d0e0f";

  it("decrypts ciphertext produced by crypto-js with explicit key/iv", () => {
    for (const text of SAMPLE_TEXTS) {
      const cjs = CryptoJS.AES.encrypt(text, CryptoJS.enc.Hex.parse(keyHex), {
        iv: CryptoJS.enc.Hex.parse(ivHex),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });
      const ctB64 = cjs.ciphertext.toString(CryptoJS.enc.Base64);
      expect(
        aesCbcDecryptFromBase64(ctB64, hexToBytes(keyHex), hexToBytes(ivHex))
      ).toBe(text);
    }
  });

  it("produces ciphertext crypto-js can decrypt (old app reads new export)", () => {
    for (const text of SAMPLE_TEXTS) {
      const ctB64 = aesCbcEncryptToBase64(
        text,
        hexToBytes(keyHex),
        hexToBytes(ivHex)
      );
      const decrypted = CryptoJS.AES.decrypt(
        CryptoJS.lib.CipherParams.create({
          ciphertext: CryptoJS.enc.Base64.parse(ctB64),
        }),
        CryptoJS.enc.Hex.parse(keyHex),
        {
          iv: CryptoJS.enc.Hex.parse(ivHex),
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7,
        }
      ).toString(CryptoJS.enc.Utf8);
      expect(decrypted).toBe(text);
    }
  });

  it("never yields the plaintext under a wrong key", () => {
    // A wrong key usually surfaces as a PKCS7 padding throw, but garbage can
    // occasionally parse as valid padding - the guarantee is only that the
    // correct plaintext never comes back.
    const ctB64 = aesCbcEncryptToBase64(
      "secret",
      hexToBytes(keyHex),
      hexToBytes(ivHex)
    );
    const wrongKey = hexToBytes(keyHex.replace("6", "7"));
    let result: string | null = null;
    try {
      result = aesCbcDecryptFromBase64(ctB64, wrongKey, hexToBytes(ivHex));
    } catch {
      result = null; // padding error - the common outcome
    }
    expect(result).not.toBe("secret");
  });
});

describe("HMAC-SHA256 parity", () => {
  it("matches CryptoJS.HmacSHA256 with string keys", () => {
    const key = "a".repeat(64); // hex-string master key, used as utf8 - as encryptedStorage does
    for (const text of SAMPLE_TEXTS) {
      expect(hmacSha256Hex(text, key)).toBe(
        CryptoJS.HmacSHA256(text, key).toString(CryptoJS.enc.Hex)
      );
    }
  });
});

describe("legacy crypto-js passphrase blobs (EVP_BytesToKey)", () => {
  it("decrypts CryptoJS.AES.encrypt(text, passphrase).toString() output", () => {
    for (const text of SAMPLE_TEXTS.filter((t) => t.length > 0)) {
      for (const passphrase of ["pw", "correct horse battery staple", "åäö→密码"]) {
        const blob = CryptoJS.AES.encrypt(text, passphrase).toString();
        expect(decryptLegacyCryptoJsBlob(blob, passphrase)).toBe(text);
      }
    }
  });

  it("throws on a wrong passphrase or garbage input", () => {
    const blob = CryptoJS.AES.encrypt("secret", "right").toString();
    expect(() => decryptLegacyCryptoJsBlob(blob, "wrong")).toThrow();
    expect(() => decryptLegacyCryptoJsBlob("bm90IHNhbHRlZA==", "x")).toThrow();
  });
});

describe("randomHex", () => {
  it("returns the requested byte length in hex and varies per call", () => {
    const a = randomHex(16);
    const b = randomHex(16);
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(a).not.toBe(b);
  });
});

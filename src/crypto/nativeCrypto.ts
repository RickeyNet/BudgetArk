/**
 * BudgetArk - Native Crypto Wrapper
 * File: src/crypto/nativeCrypto.ts
 *
 * Thin wrapper over react-native-quick-crypto (OpenSSL via JSI/Nitro) exposing
 * exactly the primitives BudgetArk uses. Replaces crypto-js for the hot paths
 * (encrypted backups, encryptedStorage) - pure-JS PBKDF2 froze the UI thread
 * for seconds; native runs the same math in milliseconds.
 *
 * COMPATIBILITY IS THE CONTRACT. Everything here must produce byte-identical
 * output to the crypto-js code it replaced, because ciphertexts created by
 * older app versions must keep decrypting forever:
 *   - PBKDF2-SHA256 / AES-256-CBC / HMAC-SHA256 are deterministic standards -
 *     same inputs, same bytes, regardless of implementation.
 *   - `evpKdf` reimplements OpenSSL's legacy EVP_BytesToKey (single-round MD5)
 *     exactly as crypto-js's default-KDF `AES.encrypt(text, passphrase)` used
 *     it, so legacy v1 backups and pre-V3 storage values still decrypt.
 * The golden-fixture tests in importData.test.ts and encryptedStorage.test.ts
 * pin this: fixtures were produced by the OLD crypto-js code and must decrypt
 * with THIS module. Do not regenerate fixtures to make a failing test pass.
 *
 * In Jest, `react-native-quick-crypto` is mapped to Node's built-in `crypto`
 * (jest.config.js moduleNameMapper) - both are OpenSSL-backed with the same
 * node API, so tests exercise the real math without native modules.
 */

import QuickCrypto from "react-native-quick-crypto";

/* ── Pure-JS byte/string helpers ──
 * Deliberately dependency-free: quick-crypto's Buffer polyfill and Hermes's
 * TextEncoder/TextDecoder coverage vary by platform/runtime, and these are
 * trivial. All hot-path bulk conversion happens inside the native cipher via
 * update()/final() string encodings; these helpers only touch small values
 * (keys, salts, IVs, passwords). */

export const hexToBytes = (hex: string): Uint8Array => {
  if (hex.length % 2 !== 0 || /[^0-9a-fA-F]/.test(hex)) {
    throw new Error("Invalid hex input");
  }
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
};

export const bytesToHex = (bytes: Uint8Array): string => {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
};

const B64_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Decodes standard base64 (with optional padding) into bytes. */
export const base64ToBytes = (b64: string): Uint8Array => {
  const clean = b64.replace(/[\r\n\s]/g, "");
  const unpadded = clean.replace(/=+$/, "");
  const out = new Uint8Array(Math.floor((unpadded.length * 3) / 4));
  let bits = 0;
  let bitCount = 0;
  let idx = 0;
  for (const ch of unpadded) {
    const val = B64_CHARS.indexOf(ch);
    if (val === -1) throw new Error("Invalid base64 input");
    bits = (bits << 6) | val;
    bitCount += 6;
    if (bitCount >= 8) {
      bitCount -= 8;
      out[idx++] = (bits >> bitCount) & 0xff;
    }
  }
  return out;
};

/** UTF-8 encodes a string (matches crypto-js's Utf8.parse byte-for-byte). */
export const utf8ToBytes = (text: string): Uint8Array => {
  const out: number[] = [];
  for (let i = 0; i < text.length; i++) {
    let code = text.charCodeAt(i);
    // Combine surrogate pairs into a single code point.
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const low = text.charCodeAt(i + 1);
      if (low >= 0xdc00 && low <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (low - 0xdc00);
        i++;
      }
    }
    if (code < 0x80) out.push(code);
    else if (code < 0x800) out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    else if (code < 0x10000) {
      out.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      );
    } else {
      out.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      );
    }
  }
  return new Uint8Array(out);
};

/* ── Primitives ── */

/** N cryptographically-random bytes, hex-encoded. */
export const randomHex = (byteLength: number): string =>
  bytesToHex(new Uint8Array(QuickCrypto.randomBytes(byteLength)));

/**
 * PBKDF2-SHA256, off the JS thread. Resolves with the raw derived key.
 * This is the call that took seconds in crypto-js; native OpenSSL does the
 * same 250k iterations in tens of milliseconds on a background thread.
 */
export const pbkdf2Sha256 = (
  password: string,
  salt: Uint8Array,
  iterations: number,
  keyLength: number
): Promise<Uint8Array> =>
  new Promise((resolve, reject) => {
    QuickCrypto.pbkdf2(
      password,
      salt,
      iterations,
      keyLength,
      "sha256",
      (err: Error | null, derived: unknown) => {
        if (err || !derived) {
          reject(err ?? new Error("PBKDF2 failed"));
          return;
        }
        resolve(new Uint8Array(derived as ArrayBufferLike & ArrayLike<number>));
      }
    );
  });

/** AES-256-CBC with PKCS7 padding: utf8 plaintext in, base64 ciphertext out. */
export const aesCbcEncryptToBase64 = (
  plaintextUtf8: string,
  key: Uint8Array,
  iv: Uint8Array
): string => {
  const cipher = QuickCrypto.createCipheriv("aes-256-cbc", key, iv);
  return (
    (cipher.update(plaintextUtf8, "utf8", "base64") as string) +
    (cipher.final("base64") as string)
  );
};

/**
 * AES-256-CBC decrypt: base64 ciphertext in, utf8 plaintext out.
 * Throws on bad padding (which is how a wrong key/password usually surfaces).
 */
export const aesCbcDecryptFromBase64 = (
  ciphertextB64: string,
  key: Uint8Array,
  iv: Uint8Array
): string => {
  const decipher = QuickCrypto.createDecipheriv("aes-256-cbc", key, iv);
  return (
    (decipher.update(ciphertextB64, "base64", "utf8") as string) +
    (decipher.final("utf8") as string)
  );
};

/** HMAC-SHA256 over a utf8 string with a utf8 string key, hex output. */
export const hmacSha256Hex = (data: string, key: string): string =>
  QuickCrypto.createHmac("sha256", key)
    .update(data, "utf8")
    .digest("hex") as string;

/** SHA-256 of a utf8 string, as raw bytes. */
export const sha256Bytes = (text: string): Uint8Array => {
  // Not chained: quick-crypto types update() as returning the written bytes
  // rather than the Hash (node returns `this`), so chaining doesn't typecheck.
  const hash = QuickCrypto.createHash("sha256");
  hash.update(text, "utf8");
  return new Uint8Array(hash.digest());
};

/* ── Legacy crypto-js (OpenSSL EVP_BytesToKey) compatibility ── */

/**
 * OpenSSL's legacy EVP_BytesToKey KDF with MD5 - the default KDF behind
 * crypto-js's `AES.encrypt(text, passphrase)`. Weak by design (single MD5
 * round); kept ONLY to decrypt data written by older app versions. Never
 * use for new encryption.
 */
const evpKdf = (
  passwordBytes: Uint8Array,
  salt: Uint8Array
): { key: Uint8Array; iv: Uint8Array } => {
  const KEY_LEN = 32;
  const IV_LEN = 16;
  let derived = new Uint8Array(0);
  let block = new Uint8Array(0);
  while (derived.length < KEY_LEN + IV_LEN) {
    const md5 = QuickCrypto.createHash("md5");
    if (block.length > 0) md5.update(block);
    md5.update(passwordBytes);
    md5.update(salt);
    block = new Uint8Array(md5.digest());
    const next = new Uint8Array(derived.length + block.length);
    next.set(derived);
    next.set(block, derived.length);
    derived = next;
  }
  return {
    key: derived.slice(0, KEY_LEN),
    iv: derived.slice(KEY_LEN, KEY_LEN + IV_LEN),
  };
};

/**
 * Decrypts a crypto-js `AES.encrypt(text, passphrase).toString()` blob:
 * base64 of "Salted__" + 8-byte salt + AES-256-CBC ciphertext, key/iv from
 * EVP_BytesToKey. Returns the utf8 plaintext; throws on malformed input or
 * bad padding (wrong passphrase).
 */
export const decryptLegacyCryptoJsBlob = (
  blobB64: string,
  passphrase: string
): string => {
  const raw = base64ToBytes(blobB64);
  // "Salted__" magic (crypto-js always salts passphrase-derived ciphertexts)
  const MAGIC = [0x53, 0x61, 0x6c, 0x74, 0x65, 0x64, 0x5f, 0x5f];
  if (raw.length < 17 || !MAGIC.every((b, i) => raw[i] === b)) {
    throw new Error("Not an OpenSSL-salted ciphertext");
  }
  const salt = raw.slice(8, 16);
  const ciphertext = raw.slice(16);
  const { key, iv } = evpKdf(utf8ToBytes(passphrase), salt);
  const decipher = QuickCrypto.createDecipheriv("aes-256-cbc", key, iv);
  // hex input encoding rather than raw bytes: quick-crypto's update() typing
  // requires an explicit input encoding when an output encoding is used.
  return (
    (decipher.update(bytesToHex(ciphertext), "hex", "utf8") as string) +
    (decipher.final("utf8") as string)
  );
};

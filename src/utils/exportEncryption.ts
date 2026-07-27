/**
 * BudgetArk - Export Envelope Encryption (v3)
 * File: src/utils/exportEncryption.ts
 *
 * The password-protected export format, in a module with no react-native or
 * storage dependencies so both the export writer (utils/exportData.ts) and
 * the import reader (utils/importData.ts) - and pure-logic tests - share one
 * implementation.
 *
 * v3 is encrypt-then-MAC (the v1.4.16 security-audit follow-up): earlier
 * formats had no integrity tag over the ciphertext, so the app could not
 * distinguish "wrong password" from "corrupted file", and an attacker could
 * flip ciphertext bits undetected (CBC malleability). v3 appends an
 * HMAC-SHA256 over the whole envelope body, verified BEFORE any decryption
 * is attempted.
 *
 * Format after the prefix:
 *   <salt-hex (32)> "." <iv-hex (32)> "." <ciphertext-base64> "." <mac-hex (64)>
 *
 * Key derivation: one PBKDF2-SHA256 (250k iterations) call producing 64
 * bytes - first 32 are the AES-256-CBC key, last 32 the HMAC key. Deriving
 * both halves from a single call keeps the KDF cost identical to v2 per
 * password guess while giving the MAC an independent key (proper
 * encrypt-then-MAC key separation).
 *
 * Compatibility: import still reads v1 (legacy crypto-js KDF) and v2
 * (PBKDF2, no MAC) backups forever; only the WRITE path moved to v3. The
 * deliberate cost: an app version older than v3-support cannot import a new
 * password-protected export - acceptable because both halves of a household
 * update from the same release train, and unencrypted exports are unchanged.
 */

import {
  aesCbcDecryptFromBase64,
  aesCbcEncryptToBase64,
  constantTimeEquals,
  hexToBytes,
  hmacSha256HexWithKeyBytes,
  pbkdf2Sha256,
  randomHex,
} from "../crypto/nativeCrypto";

/** v3 prefix - salt.iv.ciphertext.mac, encrypt-then-MAC. */
export const ENCRYPTED_EXPORT_PREFIX_V3 = "__BUDGETARK_ENC3__:";

/** Matches v2 and the storage layer; changing it would need a new version. */
export const EXPORT_KDF_ITERATIONS = 250_000;

const SALT_BYTES = 16;
const IV_BYTES = 16;
const AES_KEY_BYTES = 32;
const MAC_KEY_BYTES = 32;
/** Hex length of an HMAC-SHA256 tag. */
const MAC_HEX_LENGTH = 64;

/**
 * Single failure message for every v3 read failure (bad MAC, malformed
 * envelope, padding error). A wrong password and a tampered file are
 * cryptographically indistinguishable here - the MAC key derives from the
 * password - so the message honestly names both.
 */
export const EXPORT_DECRYPT_ERROR_MESSAGE =
  "Decryption failed. The password may be incorrect, or the file may have been altered.";

const deriveKeys = async (
  password: string,
  saltHex: string
): Promise<{ aesKey: Uint8Array; macKey: Uint8Array }> => {
  const derived = await pbkdf2Sha256(
    password,
    hexToBytes(saltHex),
    EXPORT_KDF_ITERATIONS,
    AES_KEY_BYTES + MAC_KEY_BYTES
  );
  return {
    aesKey: derived.slice(0, AES_KEY_BYTES),
    macKey: derived.slice(AES_KEY_BYTES),
  };
};

/**
 * Encrypts an export JSON string into a full prefixed v3 envelope.
 * The MAC covers "salt.iv.ciphertext" - every field the reader parses - so
 * nothing is trusted before verification.
 */
export const encryptExportEnvelopeV3 = async (
  json: string,
  password: string
): Promise<string> => {
  const saltHex = randomHex(SALT_BYTES);
  const ivHex = randomHex(IV_BYTES);
  const { aesKey, macKey } = await deriveKeys(password, saltHex);
  const ctB64 = aesCbcEncryptToBase64(json, aesKey, hexToBytes(ivHex));
  const body = `${saltHex}.${ivHex}.${ctB64}`;
  const macHex = hmacSha256HexWithKeyBytes(body, macKey);
  return `${ENCRYPTED_EXPORT_PREFIX_V3}${body}.${macHex}`;
};

/**
 * Verifies and decrypts a v3 envelope (the part AFTER the prefix).
 * Fail-closed: any malformed structure, MAC mismatch, or decrypt error
 * throws EXPORT_DECRYPT_ERROR_MESSAGE - the payload is untrusted input and
 * is never parsed before the MAC check passes.
 */
export const decryptExportEnvelopeV3 = async (
  envelope: string,
  password: string
): Promise<string> => {
  const fail = (): never => {
    throw new Error(EXPORT_DECRYPT_ERROR_MESSAGE);
  };

  const parts = envelope.split(".");
  if (parts.length !== 4) fail();
  const [saltHex, ivHex, ctB64, macHex] = parts;
  if (
    saltHex.length !== SALT_BYTES * 2 ||
    ivHex.length !== IV_BYTES * 2 ||
    macHex.length !== MAC_HEX_LENGTH
  ) {
    fail();
  }

  try {
    const { aesKey, macKey } = await deriveKeys(password, saltHex);
    const expectedMac = hmacSha256HexWithKeyBytes(
      `${saltHex}.${ivHex}.${ctB64}`,
      macKey
    );
    if (!constantTimeEquals(expectedMac, macHex)) fail();
    return aesCbcDecryptFromBase64(ctB64, aesKey, hexToBytes(ivHex));
  } catch {
    return fail();
  }
};

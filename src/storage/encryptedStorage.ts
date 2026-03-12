/**
 * BudgetArk — Encrypted Storage Wrapper
 * File: src/storage/encryptedStorage.ts
 *
 * Drop-in replacement for AsyncStorage.getItem/setItem that encrypts
 * all values at rest using AES-256 with HMAC-SHA256 integrity verification.
 *
 * How it works (for newcomers):
 *
 * ENCRYPTION (writing data):
 *   1. Your plain data (e.g. '{"name":"Car Loan","balance":5000}') needs to
 *      be scrambled so nobody can read it if they access the device storage.
 *   2. We generate a random "key" (a long secret string) and store it in the
 *      phone's secure vault (iOS Keychain / Android Keystore). This vault is
 *      hardware-protected — even other apps can't read it.
 *   3. We use AES-256 encryption (a military-grade algorithm) to scramble the
 *      data using that key. The result looks like random gibberish.
 *   4. We then create an HMAC — a "digital signature" of the encrypted data
 *      using the same key. This lets us detect if anyone tampered with the
 *      stored data (explained more below).
 *   5. We store: prefix + HMAC + "." + encrypted data in AsyncStorage.
 *
 * DECRYPTION (reading data):
 *   1. We read the stored value and split it into the HMAC and encrypted data.
 *   2. We recalculate what the HMAC *should* be for that encrypted data.
 *   3. If our calculated HMAC doesn't match the stored HMAC, someone has
 *      tampered with the data — we reject it and return null (safe fallback).
 *   4. If the HMAC matches, we decrypt and return the original data.
 *
 * WHY HMAC MATTERS:
 *   Without HMAC, an attacker with filesystem access could modify the
 *   encrypted data (e.g. change a debt balance) and the app would happily
 *   decrypt the corrupted result. HMAC acts like a tamper-evident seal —
 *   if anything changes, the seal breaks and we know not to trust the data.
 *
 * LEGACY MIGRATION:
 *   If the app reads data that was stored before encryption was added (plain
 *   JSON text), it automatically encrypts it in the new format. This means
 *   users upgrading from older versions don't lose their data.
 */

import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import CryptoJS from "crypto-js";

/** Key name used to store/retrieve the encryption key from the secure vault */
const ENCRYPTION_KEY_ALIAS = "budgetark_encryption_key";

/**
 * Prefix markers to identify encrypted data in storage.
 * __ENCV2__: = current format (AES + HMAC integrity check)
 * __ENC__:   = old format (AES only, no HMAC) — still readable for migration
 */
const ENCRYPTED_V2_PREFIX = "__ENCV2__:";
const ENCRYPTED_V1_PREFIX = "__ENC__:";

/**
 * In-memory cache for the encryption key so we don't hit the secure vault
 * on every single read/write. Cleared when the app is backgrounded to reduce
 * the window of exposure on compromised devices.
 */
let cachedKey: string | null = null;

/**
 * Clear the cached encryption key whenever the app leaves the foreground.
 * The key will be re-fetched from SecureStore on the next storage operation.
 */
AppState.addEventListener("change", (state) => {
  if (state !== "active") {
    cachedKey = null;
  }
});

/**
 * Lazily loads or creates the AES encryption key.
 *
 * First time the app runs: generates 32 random bytes (256 bits) and stores
 * them in the platform's secure vault (Keychain on iOS, Keystore on Android).
 *
 * Every time after: loads the existing key from the vault and caches it in
 * memory so subsequent calls are instant.
 */
const getEncryptionKey = async (): Promise<string> => {
  if (cachedKey) return cachedKey;

  let key = await SecureStore.getItemAsync(ENCRYPTION_KEY_ALIAS);
  if (!key) {
    // Generate 32 random bytes = 256-bit key, converted to a hex string
    key = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
    await SecureStore.setItemAsync(ENCRYPTION_KEY_ALIAS, key);
  }

  cachedKey = key;
  return key;
};

/**
 * Encrypts plaintext and creates an HMAC integrity signature.
 *
 * Steps:
 *   1. AES.encrypt() scrambles the plaintext using the key.
 *      CryptoJS automatically generates a random salt each time, so
 *      encrypting the same text twice produces different ciphertexts.
 *   2. HmacSHA256() creates a "fingerprint" of the ciphertext using the key.
 *      If even one character of the ciphertext is changed, the fingerprint
 *      will be completely different.
 *   3. We combine them as: prefix + hmac + "." + ciphertext
 *
 * @param plaintext — the original data to protect
 * @param key — the encryption key from the secure vault
 * @returns the encrypted string with integrity signature
 */
const encrypt = (plaintext: string, key: string): string => {
  const ciphertext = CryptoJS.AES.encrypt(plaintext, key).toString();
  const hmac = CryptoJS.HmacSHA256(ciphertext, key).toString(CryptoJS.enc.Hex);
  return ENCRYPTED_V2_PREFIX + hmac + "." + ciphertext;
};

/**
 * Decrypts a V2 encrypted value after verifying its HMAC integrity.
 *
 * Steps:
 *   1. Split the stored value into the HMAC and ciphertext parts.
 *   2. Recalculate what the HMAC should be for this ciphertext.
 *   3. Compare our calculated HMAC with the stored HMAC.
 *      - If they match: data is untampered, safe to decrypt.
 *      - If they don't match: data was modified, reject it.
 *   4. If valid, decrypt the ciphertext back to the original plaintext.
 *
 * @returns the decrypted plaintext, or null if integrity check fails
 */
const decryptV2 = (stored: string, key: string): string | null => {
  // Remove the prefix to get "hmac.ciphertext"
  const payload = stored.slice(ENCRYPTED_V2_PREFIX.length);
  const dotIndex = payload.indexOf(".");

  if (dotIndex === -1) return null; // malformed data

  const storedHmac = payload.slice(0, dotIndex);
  const ciphertext = payload.slice(dotIndex + 1);

  // Recalculate the HMAC and compare
  const calculatedHmac = CryptoJS.HmacSHA256(ciphertext, key).toString(
    CryptoJS.enc.Hex
  );

  if (storedHmac !== calculatedHmac) {
    // Integrity check failed — data has been tampered with
    return null;
  }

  // HMAC matches — safe to decrypt
  const bytes = CryptoJS.AES.decrypt(ciphertext, key);
  const plaintext = bytes.toString(CryptoJS.enc.Utf8);
  return plaintext || null;
};

/**
 * Decrypts a V1 encrypted value (no HMAC — legacy format).
 * Used only for migrating data from the old encryption format to V2.
 */
const decryptV1 = (stored: string, key: string): string | null => {
  const ciphertext = stored.slice(ENCRYPTED_V1_PREFIX.length);
  const bytes = CryptoJS.AES.decrypt(ciphertext, key);
  const plaintext = bytes.toString(CryptoJS.enc.Utf8);
  return plaintext || null;
};

/** Checks which format (if any) the stored value uses */
const isEncryptedV2 = (value: string): boolean =>
  value.startsWith(ENCRYPTED_V2_PREFIX);

const isEncryptedV1 = (value: string): boolean =>
  value.startsWith(ENCRYPTED_V1_PREFIX);

/**
 * Reads and decrypts a value from AsyncStorage.
 *
 * Handles three cases:
 *   1. V2 encrypted (current) — verify HMAC, then decrypt.
 *   2. V1 encrypted (old format without HMAC) — decrypt and re-encrypt as V2.
 *   3. Legacy plaintext (pre-encryption) — re-encrypt as V2.
 *
 * If HMAC verification fails (tampered data), returns null as a safe fallback
 * rather than returning corrupted data to the app.
 */
export const getItem = async (key: string): Promise<string | null> => {
  const raw = await AsyncStorage.getItem(key);
  if (raw === null) return null;

  const encKey = await getEncryptionKey();

  // Case 1: Current V2 format — verify integrity then decrypt
  if (isEncryptedV2(raw)) {
    return decryptV2(raw, encKey);
  }

  // Case 2: Old V1 format (no HMAC) — decrypt and upgrade to V2
  if (isEncryptedV1(raw)) {
    const plaintext = decryptV1(raw, encKey);
    if (plaintext !== null) {
      await AsyncStorage.setItem(key, encrypt(plaintext, encKey));
    }
    return plaintext;
  }

  // Case 3: Legacy plaintext — encrypt as V2 for future reads
  await AsyncStorage.setItem(key, encrypt(raw, encKey));
  return raw;
};

/**
 * Encrypts and stores a value in AsyncStorage using V2 format (AES + HMAC).
 */
export const setItem = async (
  key: string,
  value: string
): Promise<void> => {
  const encKey = await getEncryptionKey();
  await AsyncStorage.setItem(key, encrypt(value, encKey));
};

/**
 * Removes a value from AsyncStorage (no encryption needed for deletion).
 */
export const removeItem = async (key: string): Promise<void> => {
  await AsyncStorage.removeItem(key);
};

/**
 * Removes multiple values from AsyncStorage.
 */
export const multiRemove = async (keys: string[]): Promise<void> => {
  await AsyncStorage.multiRemove(keys);
};

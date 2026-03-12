/**
 * BudgetArk — Encrypted Storage Wrapper
 * File: src/storage/encryptedStorage.ts
 *
 * Drop-in replacement for AsyncStorage.getItem/setItem that encrypts
 * all values at rest using AES-256.
 *
 * - Encryption key is generated once and stored in expo-secure-store
 *   (iOS Keychain / Android Keystore).
 * - Data is AES-encrypted before being written to AsyncStorage.
 * - A prefix marker distinguishes encrypted values from legacy plaintext,
 *   enabling transparent migration on first read after the update.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import CryptoJS from "crypto-js";

const ENCRYPTION_KEY_ALIAS = "budgetark_encryption_key";
const ENCRYPTED_PREFIX = "__ENC__:";

let cachedKey: string | null = null;

/**
 * Lazily loads or creates the AES encryption key.
 * The key is stored in the platform's secure enclave (Keychain/Keystore)
 * and cached in memory for the session.
 */
const getEncryptionKey = async (): Promise<string> => {
  if (cachedKey) return cachedKey;

  let key = await SecureStore.getItemAsync(ENCRYPTION_KEY_ALIAS);
  if (!key) {
    key = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
    await SecureStore.setItemAsync(ENCRYPTION_KEY_ALIAS, key);
  }

  cachedKey = key;
  return key;
};

const encrypt = (plaintext: string, key: string): string => {
  const encrypted = CryptoJS.AES.encrypt(plaintext, key).toString();
  return ENCRYPTED_PREFIX + encrypted;
};

const decrypt = (ciphertext: string, key: string): string => {
  const raw = ciphertext.slice(ENCRYPTED_PREFIX.length);
  const bytes = CryptoJS.AES.decrypt(raw, key);
  return bytes.toString(CryptoJS.enc.Utf8);
};

const isEncrypted = (value: string): boolean =>
  value.startsWith(ENCRYPTED_PREFIX);

/**
 * Reads and decrypts a value from AsyncStorage.
 * If the value is legacy plaintext (pre-encryption), it transparently
 * re-encrypts it in place and returns the original value.
 */
export const getItem = async (key: string): Promise<string | null> => {
  const raw = await AsyncStorage.getItem(key);
  if (raw === null) return null;

  const encKey = await getEncryptionKey();

  if (isEncrypted(raw)) {
    return decrypt(raw, encKey);
  }

  // Legacy plaintext — migrate by re-encrypting in place
  await AsyncStorage.setItem(key, encrypt(raw, encKey));
  return raw;
};

/**
 * Encrypts and stores a value in AsyncStorage.
 */
export const setItem = async (
  key: string,
  value: string
): Promise<void> => {
  const encKey = await getEncryptionKey();
  await AsyncStorage.setItem(key, encrypt(value, encKey));
};

/**
 * Removes a value from AsyncStorage (no encryption needed).
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

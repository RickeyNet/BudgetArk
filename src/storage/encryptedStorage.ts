/**
 * BudgetArk - Encrypted Storage Wrapper
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
 *      hardware-protected - even other apps can't read it.
 *   3. We use AES-256 encryption (a military-grade algorithm) to scramble the
 *      data using that key. The result looks like random gibberish.
 *   4. We then create an HMAC - a "digital signature" of the encrypted data
 *      using the same key. This lets us detect if anyone tampered with the
 *      stored data (explained more below).
 *   5. We store: prefix + HMAC + "." + encrypted data in AsyncStorage.
 *
 * DECRYPTION (reading data):
 *   1. We read the stored value and split it into the HMAC and encrypted data.
 *   2. We recalculate what the HMAC *should* be for that encrypted data.
 *   3. If our calculated HMAC doesn't match the stored HMAC, someone has
 *      tampered with the data - we reject it and return null (safe fallback).
 *   4. If the HMAC matches, we decrypt and return the original data.
 *
 * WHY HMAC MATTERS:
 *   Without HMAC, an attacker with filesystem access could modify the
 *   encrypted data (e.g. change a debt balance) and the app would happily
 *   decrypt the corrupted result. HMAC acts like a tamper-evident seal -
 *   if anything changes, the seal breaks and we know not to trust the data.
 *
 * LEGACY MIGRATION:
 *   If the app reads data stored in an older format - plain JSON text from
 *   before encryption existed, or the V1/V2 crypto-js formats from before the
 *   native-crypto migration - it automatically re-encrypts it as V3. Users
 *   upgrading from any older version keep their data.
 *
 * IMPLEMENTATION (2026-07): crypto runs natively (react-native-quick-crypto /
 * OpenSSL) instead of pure-JS crypto-js. This layer wraps EVERY storage
 * read/write, so moving AES+HMAC off the JS interpreter speeds up the whole
 * app. V1/V2 values decrypt through an EVP_BytesToKey-compatible helper
 * (byte-identical to crypto-js's passphrase mode - pinned by fixtures in
 * encryptedStorage.test.ts) and upgrade to V3 on first read.
 */

import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import {
  aesCbcDecryptFromBase64,
  aesCbcEncryptToBase64,
  decryptLegacyCryptoJsBlob,
  hexToBytes,
  hmacSha256Hex,
  randomHex,
  sha256Bytes,
} from "../crypto/nativeCrypto";

/** Key name used to store/retrieve the encryption key from the secure vault */
const ENCRYPTION_KEY_ALIAS = "budgetark_encryption_key";

/**
 * Prefix markers to identify encrypted data in storage.
 * __ENCV3__: = current format (native AES-256-CBC with explicit IV + HMAC).
 *              Layout: prefix + hmac-hex + "." + iv-hex + "." + ct-base64,
 *              HMAC-SHA256 over "iv-hex.ct-base64" so the IV is
 *              tamper-protected too. AES key = the 32 raw bytes of the hex
 *              master key (not passphrase-derived - no weak EVP KDF).
 * __ENCV2__: = crypto-js format (passphrase AES + HMAC) - readable, migrated
 * __ENC__:   = oldest format (passphrase AES, no HMAC) - readable, migrated
 */
const ENCRYPTED_V3_PREFIX = "__ENCV3__:";
const ENCRYPTED_V2_PREFIX = "__ENCV2__:";
const ENCRYPTED_V1_PREFIX = "__ENC__:";

/**
 * In-memory cache for the encryption key so we don't hit the secure vault
 * on every single read/write. Cleared when the app is backgrounded to reduce
 * the window of exposure on compromised devices.
 */
let cachedKey: string | null = null;

/**
 * Timeout duration for AsyncStorage operations (milliseconds).
 * 5 seconds is generous enough for slow/low-end devices while still
 * preventing indefinite hangs from degraded flash storage or backed-up I/O.
 */
const STORAGE_TIMEOUT_MS = 5_000;

/**
 * Wraps a promise with a timeout. If the operation doesn't resolve within
 * the given duration, the returned promise rejects with a descriptive error.
 *
 * Used to guard every AsyncStorage call so a stalled I/O queue can't freeze
 * the app indefinitely.
 */
const withTimeout = <T>(
  operation: Promise<T>,
  label: string,
  ms: number = STORAGE_TIMEOUT_MS,
): Promise<T> =>
  Promise.race([
    operation,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`AsyncStorage operation timed out after ${ms}ms: ${label}`)),
        ms,
      ),
    ),
  ]);

/**
 * Clear the cached encryption key whenever the app leaves the foreground.
 * The key will be re-fetched from SecureStore on the next storage operation.
 * Stored as a module-level subscription so only one listener is ever registered.
 */
const _appStateSubscription = AppState.addEventListener("change", (state) => {
  if (state !== "active") {
    cachedKey = null;
  }
});
// Prevent unused variable warning while keeping the reference alive
void _appStateSubscription;

/**
 * Lazily loads or creates the AES encryption key.
 *
 * First time the app runs: generates 32 random bytes (256 bits) and stores
 * them in the platform's secure vault (Keychain on iOS, Keystore on Android).
 *
 * Every time after: loads the existing key from the vault and caches it in
 * memory so subsequent calls are instant.
 */
const getEncryptionKey = async (): Promise<string | null> => {
  if (cachedKey) return cachedKey;

  try {
    let key = await SecureStore.getItemAsync(ENCRYPTION_KEY_ALIAS);
    if (!key) {
      // Generate 32 random bytes = 256-bit key, converted to a hex string
      key = randomHex(32);
      await SecureStore.setItemAsync(ENCRYPTION_KEY_ALIAS, key);
    }

    cachedKey = key;
    return key;
  } catch (error) {
    // SecureStore can fail on sideloaded APKs with mismatched signing keys
    // or on devices with broken Keystore. Return null to signal that
    // encryption is unavailable - callers will fall back to plaintext.
    if (__DEV__) console.error("SecureStore access failed:", error);
    return null;
  }
};

/**
 * Converts the SecureStore master key into raw AES key bytes. Keys generated
 * by this module are always 64 hex chars (32 bytes); anything else (never
 * observed, but a bricked storage layer is the worst failure mode we have)
 * degrades to SHA-256 of the string, which still yields a stable 32 bytes.
 */
const aesKeyBytes = (key: string): Uint8Array =>
  /^[0-9a-fA-F]{64}$/.test(key) ? hexToBytes(key) : sha256Bytes(key);

/**
 * Encrypts plaintext into the V3 format and signs it.
 *
 * Steps:
 *   1. Generate a fresh random IV, so encrypting the same text twice
 *      produces different ciphertexts.
 *   2. AES-256-CBC encrypt the plaintext with the master key's raw bytes.
 *   3. HMAC-SHA256 over "iv.ciphertext" creates a tamper-evident
 *      fingerprint - if anything changes, verification fails on read.
 *   4. Combine as: prefix + hmac + "." + iv-hex + "." + ct-base64
 *
 * @param plaintext - the original data to protect
 * @param key - the hex master key from the secure vault
 * @returns the encrypted string with integrity signature
 */
const encrypt = (plaintext: string, key: string): string => {
  const ivHex = randomHex(16);
  const ciphertext = aesCbcEncryptToBase64(
    plaintext,
    aesKeyBytes(key),
    hexToBytes(ivHex)
  );
  const payload = ivHex + "." + ciphertext;
  const hmac = hmacSha256Hex(payload, key);
  return ENCRYPTED_V3_PREFIX + hmac + "." + payload;
};

/**
 * Decrypts a V3 value after verifying its HMAC integrity.
 * Returns the plaintext (an empty string is a legitimate value), or null if
 * the value is malformed or fails verification/decryption.
 */
const decryptV3 = (stored: string, key: string): string | null => {
  // Remove the prefix to get "hmac.ivHex.ctBase64"
  const body = stored.slice(ENCRYPTED_V3_PREFIX.length);
  const dotIndex = body.indexOf(".");
  if (dotIndex === -1) return null; // malformed data

  const storedHmac = body.slice(0, dotIndex);
  const payload = body.slice(dotIndex + 1); // "ivHex.ctBase64"
  if (storedHmac !== hmacSha256Hex(payload, key)) {
    return null; // integrity check failed - data has been tampered with
  }

  const ivDot = payload.indexOf(".");
  if (ivDot === -1) return null;
  try {
    return aesCbcDecryptFromBase64(
      payload.slice(ivDot + 1),
      aesKeyBytes(key),
      hexToBytes(payload.slice(0, ivDot))
    );
  } catch {
    return null;
  }
};

/**
 * Decrypts a V2 value (crypto-js passphrase format + HMAC) after verifying
 * integrity. Read-only: V2 is never written anymore; a successful read
 * upgrades the value to V3 in place.
 */
const decryptV2 = (stored: string, key: string): string | null => {
  // Remove the prefix to get "hmac.ciphertext"
  const payload = stored.slice(ENCRYPTED_V2_PREFIX.length);
  const dotIndex = payload.indexOf(".");

  if (dotIndex === -1) return null; // malformed data

  const storedHmac = payload.slice(0, dotIndex);
  const ciphertext = payload.slice(dotIndex + 1);

  // Recalculate the HMAC and compare (same string-keyed HMAC crypto-js used)
  if (storedHmac !== hmacSha256Hex(ciphertext, key)) {
    return null; // integrity check failed - data has been tampered with
  }

  // HMAC matches - safe to decrypt. An empty plaintext is a legitimate
  // value, not a failure, so no `|| null` collapse here.
  try {
    return decryptLegacyCryptoJsBlob(ciphertext, key);
  } catch {
    return null;
  }
};

/**
 * Decrypts a V1 value (crypto-js passphrase format, no HMAC - oldest).
 * Used only for migrating data from the old encryption format forward.
 */
const decryptV1 = (stored: string, key: string): string | null => {
  const ciphertext = stored.slice(ENCRYPTED_V1_PREFIX.length);
  try {
    return decryptLegacyCryptoJsBlob(ciphertext, key) || null;
  } catch {
    return null;
  }
};

/** Checks which format (if any) the stored value uses */
const isEncryptedV3 = (value: string): boolean =>
  value.startsWith(ENCRYPTED_V3_PREFIX);

const isEncryptedV2 = (value: string): boolean =>
  value.startsWith(ENCRYPTED_V2_PREFIX);

const isEncryptedV1 = (value: string): boolean =>
  value.startsWith(ENCRYPTED_V1_PREFIX);

/**
 * Error thrown when encrypted data fails integrity verification or decryption.
 * Distinguishes data corruption from a missing key (which returns null).
 */
export class DecryptionError extends Error {
  constructor(key: string) {
    super(`Decryption or integrity check failed for key: ${key}`);
    this.name = "DecryptionError";
  }
}

/**
 * Thrown by `setItem`/`multiSet` when a caller requires encryption but the
 * secure vault is unavailable. Callers holding secrets (e.g. bank
 * credentials) pass `requireEncryption` so the value is never written in
 * plaintext - they surface this to the user instead of degrading silently.
 */
export class EncryptionUnavailableError extends Error {
  constructor(key: string) {
    super(`Secure keystore unavailable; refusing to store "${key}" unencrypted`);
    this.name = "EncryptionUnavailableError";
  }
}

/**
 * Whether the AES master key can be obtained from the OS secure vault. Returns
 * false only when SecureStore itself fails (broken/mismatched Keystore, some
 * sideloaded installs), which is exactly when encrypted writes would fall back
 * to plaintext. Use this to gate features that must never persist plaintext.
 */
export const isEncryptionAvailable = async (): Promise<boolean> =>
  (await getEncryptionKey()) !== null;

/**
 * Reads and decrypts a value from AsyncStorage.
 *
 * Handles four cases:
 *   1. V3 encrypted (current, native) - verify HMAC, then decrypt.
 *   2. V2 encrypted (crypto-js era) - verify, decrypt, re-encrypt as V3.
 *   3. V1 encrypted (no HMAC) - decrypt and re-encrypt as V3.
 *   4. Legacy plaintext (pre-encryption) - re-encrypt as V3.
 *
 * Returns null only when the key does not exist in storage.
 * Throws DecryptionError if HMAC verification or decryption fails (tampered/corrupted data).
 */
export const getItem = async (key: string): Promise<string | null> => {
  const raw = await withTimeout(AsyncStorage.getItem(key), `getItem(${key})`);
  if (raw === null) return null;

  const encKey = await getEncryptionKey();

  // If SecureStore is unavailable, fall back to plaintext read-only mode.
  // Don't encrypt data we can't decrypt later.
  if (encKey === null) {
    if (isEncryptedV3(raw) || isEncryptedV2(raw) || isEncryptedV1(raw)) {
      // Data was encrypted but we can't access the key - treat as unreadable
      throw new DecryptionError(key);
    }
    // Legacy plaintext - return as-is without encrypting
    return raw;
  }

  // Case 1: Current V3 format - verify integrity then decrypt
  if (isEncryptedV3(raw)) {
    const result = decryptV3(raw, encKey);
    if (result === null) {
      throw new DecryptionError(key);
    }
    return result;
  }

  // Case 2: V2 crypto-js format - verify, decrypt, upgrade to V3
  if (isEncryptedV2(raw)) {
    const result = decryptV2(raw, encKey);
    if (result === null) {
      throw new DecryptionError(key);
    }
    await migrateStoredValue(key, raw, encrypt(result, encKey));
    return result;
  }

  // Case 3: Old V1 format (no HMAC) - decrypt and upgrade to V3
  if (isEncryptedV1(raw)) {
    const plaintext = decryptV1(raw, encKey);
    if (plaintext === null) {
      throw new DecryptionError(key);
    }
    await migrateStoredValue(key, raw, encrypt(plaintext, encKey));
    return plaintext;
  }

  // Case 4: Legacy plaintext - encrypt as V3 for future reads
  await migrateStoredValue(key, raw, encrypt(raw, encKey));
  return raw;
};

/**
 * Upgrade-in-place write for getItem's V1/plaintext migration paths. Goes
 * through the per-key queue AND re-checks the stored value first: this read
 * awaited a SecureStore round-trip after loading `expectedRaw`, so a
 * legitimate setItem may have landed in between - a direct write here would
 * silently revert the key to its pre-edit value.
 */
const migrateStoredValue = (
  key: string,
  expectedRaw: string,
  nextValue: string
): Promise<void> =>
  enqueueWrite(key, async () => {
    const current = await withTimeout(
      AsyncStorage.getItem(key),
      `getItem(${key})`
    );
    if (current !== expectedRaw) return;
    await withTimeout(AsyncStorage.setItem(key, nextValue), `setItem(${key})`);
  });

/**
 * Per-key write queue. Concurrent saves to the same storage key (e.g.
 * `recordPayment` mutating debts while `applyIncomingDiff` also writes
 * debts) used to race because each call did `getX → mutate → saveX` on its
 * own snapshot, so the second writer would overwrite the first writer's
 * changes. Serializing per key ensures the second write reads-after-write
 * the first completes - at the storage layer at least, the load-mutate-save
 * pattern in callers still has its own race window between load and save.
 *
 * The map only tracks the *latest* tail of the chain per key. A finished
 * write that's no longer at the tail can be garbage-collected; while the
 * tail Promise is pending, all subsequent enqueues chain off of it.
 */
const writeQueues = new Map<string, Promise<void>>();

const enqueueWrite = (key: string, run: () => Promise<void>): Promise<void> => {
  const previous = writeQueues.get(key) ?? Promise.resolve();
  // Run after previous resolves OR rejects - a failed write shouldn't block
  // the next attempt forever.
  const next = previous.catch(() => {}).then(run);
  writeQueues.set(key, next);
  // Best-effort cleanup: if this is still the tail when it settles, drop it
  // so the map doesn't grow unbounded. Use then(cleanup, cleanup) rather than
  // finally() so a *rejected* write (timeout, or an EncryptionUnavailableError
  // from a requireEncryption caller) doesn't leave an unhandled rejection on
  // this detached cleanup branch - finally() re-raises, the mapped handlers
  // don't. The returned `next` still rejects for the caller to handle.
  const cleanup = () => {
    if (writeQueues.get(key) === next) {
      writeQueues.delete(key);
    }
  };
  next.then(cleanup, cleanup);
  return next;
};

/**
 * Encrypts and stores a value in AsyncStorage using V2 format (AES + HMAC).
 * Writes for the same key are serialized - see writeQueues comment above.
 */
export const setItem = async (
  key: string,
  value: string,
  options?: { requireEncryption?: boolean }
): Promise<void> => {
  return enqueueWrite(key, async () => {
    const encKey = await getEncryptionKey();
    if (encKey === null) {
      if (options?.requireEncryption) {
        // Secret-bearing caller: never degrade to plaintext.
        throw new EncryptionUnavailableError(key);
      }
      // SecureStore unavailable - store as plaintext to avoid data loss
      await withTimeout(AsyncStorage.setItem(key, value), `setItem(${key})`);
      return;
    }
    await withTimeout(AsyncStorage.setItem(key, encrypt(value, encKey)), `setItem(${key})`);
  });
};

/**
 * Removes a value from AsyncStorage (no encryption needed for deletion).
 * Serialized through the same per-key queue as setItem.
 */
export const removeItem = async (key: string): Promise<void> => {
  return enqueueWrite(key, () =>
    withTimeout(AsyncStorage.removeItem(key), `removeItem(${key})`)
  );
};

/**
 * Removes multiple values from AsyncStorage. Each key is enqueued through its
 * own write chain so a multiRemove serializes correctly against any in-flight
 * setItem on the same keys.
 */
export const multiRemove = async (keys: string[]): Promise<void> => {
  await Promise.all(
    keys.map((key) =>
      enqueueWrite(key, () =>
        withTimeout(AsyncStorage.removeItem(key), `multiRemove(${key})`)
      )
    )
  );
};

/**
 * Writes multiple key/value pairs in one AsyncStorage `multiSet` call so a
 * compound update (e.g. `recordPayment` saving debts and payments) hits a
 * single native write rather than two sequential ones. This shrinks the
 * window where a timeout can leave one key updated and the other stale.
 *
 * Each pair is enqueued through its own per-key write chain *before* the
 * combined `multiSet` runs, so it still serializes correctly against any
 * in-flight `setItem`/`removeItem` on the same keys. We don't promise
 * atomicity at the platform layer (AsyncStorage's `multiSet` isn't a
 * transaction on Android), but a single I/O is meaningfully safer than two.
 *
 * Throws on failure - callers must handle the inconsistency rather than
 * silently leaving partial state.
 */
export const multiSet = async (
  pairs: readonly (readonly [string, string])[]
): Promise<void> => {
  if (pairs.length === 0) return;

  // Duplicate keys would silently last-write-wins at the platform layer while
  // the per-key write-queue tail map only retains one entry, so any earlier
  // queued write for that key could resolve *after* this multiSet and clobber
  // it. Cheap to detect; nightmare to debug if it ever happened.
  const keys = pairs.map(([k]) => k);
  if (new Set(keys).size !== keys.length) {
    throw new Error("multiSet: duplicate keys are not allowed");
  }

  const encKey = await getEncryptionKey();
  const encrypted: [string, string][] = pairs.map(([key, value]) => [
    key,
    encKey === null ? value : encrypt(value, encKey),
  ]);

  // Take the tail of every per-key chain so this multiSet runs after any
  // in-flight write for those keys. We splice ourselves in as the new tail
  // for each so subsequent setItem calls on those keys queue behind us.
  const previousTails = pairs.map(
    ([key]) => writeQueues.get(key) ?? Promise.resolve()
  );

  let resolveTail: () => void = () => {};
  const tail = new Promise<void>((resolve) => {
    resolveTail = resolve;
  });
  pairs.forEach(([key]) => writeQueues.set(key, tail));

  try {
    await Promise.all(previousTails.map((p) => p.catch(() => {})));
    await withTimeout(
      AsyncStorage.multiSet(encrypted),
      `multiSet(${pairs.map(([k]) => k).join(",")})`
    );
  } finally {
    resolveTail();
    pairs.forEach(([key]) => {
      if (writeQueues.get(key) === tail) writeQueues.delete(key);
    });
  }
};

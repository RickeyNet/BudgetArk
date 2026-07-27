/**
 * BudgetArk - App Lock (PIN) Logic
 * File: src/utils/appLock.ts
 *
 * Pure logic behind the optional app-launch PIN gate: PIN validation, the
 * versioned persisted record, PBKDF2 hashing, constant-time verification,
 * and the escalating-lockout math. The storage shell lives in
 * src/storage/appLockStorage.ts; the UI in components/AppLockGate.tsx and
 * components/AppLockSetupModal.tsx.
 *
 * The PIN is an on-device privacy gate, NOT an encryption factor: all data
 * is already encrypted with the Keychain/Keystore master key, and a 4-8
 * digit PIN could never survive an offline brute force anyway. The gate's
 * job is to stop someone who is past the device lock screen from casually
 * opening the app. The PIN record never leaves the device: it is not
 * exported, not synced, and is wiped by Reset All Data.
 *
 * FORWARD COMPATIBILITY IS THE CONTRACT: records written by this version
 * must keep unlocking in every future app version (a store or OTA update
 * must never lock a user out). parseAppLockRecord deliberately accepts any
 * record whose known fields validate - even with a newer `version` or
 * unknown extra fields. A future format change must either keep these
 * fields readable or migrate on read; never change the meaning of an
 * existing field - add new optional ones and bump APP_LOCK_VERSION.
 */

import {
  bytesToHex,
  constantTimeEquals,
  hexToBytes,
  pbkdf2Sha256,
  randomHex,
} from "../crypto/nativeCrypto";

// Re-exported so PIN-verification callers keep one import site; the shared
// implementation lives in nativeCrypto so storage/sync HMAC checks use the
// exact same compare.
export { constantTimeEquals };

export const PIN_MIN_LENGTH = 4;
export const PIN_MAX_LENGTH = 8;

export const APP_LOCK_VERSION = 1;

/** Matches the app's PBKDF2 convention (encrypted exports use the same). */
export const PIN_HASH_ITERATIONS = 250_000;
const PIN_SALT_BYTES = 16;
const PIN_HASH_BYTES = 32;

/**
 * Upper bound on iterations accepted from a stored record. A corrupted or
 * tampered record claiming billions of iterations would otherwise freeze
 * every unlock attempt.
 */
const MAX_ACCEPTED_ITERATIONS = 1_000_000;
const MIN_ACCEPTED_ITERATIONS = 1_000;

export type AppLockRecord = {
  version: number;
  /**
   * Length of the chosen PIN, so the lock screen can auto-submit at the
   * right digit count. Mildly leaks the length to someone holding the
   * phone - the standard PIN-screen trade-off, accepted deliberately.
   */
  pinLength: number;
  saltHex: string;
  hashHex: string;
  iterations: number;
  failedAttempts: number;
  /** ISO timestamp the current lockout ends, or null when not locked out. */
  lockoutUntil: string | null;
  createdAt: string;
  updatedAt: string;
};

export const isValidPin = (pin: string): boolean =>
  pin.length >= PIN_MIN_LENGTH &&
  pin.length <= PIN_MAX_LENGTH &&
  /^[0-9]+$/.test(pin);

const isHexOfLength = (value: unknown, length: number): value is string =>
  typeof value === "string" &&
  value.length === length &&
  /^[0-9a-fA-F]+$/.test(value);

/**
 * Parses a stored record, fail-closed on anything malformed (returns null,
 * which callers treat as "lock disabled"). Unknown future versions and
 * extra fields are accepted as long as the fields this version needs to
 * verify a PIN are intact - see the compatibility contract in the header.
 */
export const parseAppLockRecord = (raw: string | null): AppLockRecord | null => {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }
  const record = data as Record<string, unknown>;
  if (
    typeof record.version !== "number" ||
    !Number.isInteger(record.version) ||
    record.version < 1
  ) {
    return null;
  }
  if (
    typeof record.pinLength !== "number" ||
    !Number.isInteger(record.pinLength) ||
    record.pinLength < PIN_MIN_LENGTH ||
    record.pinLength > PIN_MAX_LENGTH
  ) {
    return null;
  }
  if (
    !isHexOfLength(record.saltHex, PIN_SALT_BYTES * 2) ||
    !isHexOfLength(record.hashHex, PIN_HASH_BYTES * 2)
  ) {
    return null;
  }
  if (
    typeof record.iterations !== "number" ||
    !Number.isInteger(record.iterations) ||
    record.iterations < MIN_ACCEPTED_ITERATIONS ||
    record.iterations > MAX_ACCEPTED_ITERATIONS
  ) {
    return null;
  }
  // Attempt-tracking fields degrade gracefully instead of failing the whole
  // record - losing a backoff counter is better than losing the lock.
  const failedAttempts =
    typeof record.failedAttempts === "number" &&
    Number.isInteger(record.failedAttempts) &&
    record.failedAttempts >= 0
      ? record.failedAttempts
      : 0;
  const lockoutUntil =
    typeof record.lockoutUntil === "string" ? record.lockoutUntil : null;
  return {
    version: record.version,
    pinLength: record.pinLength,
    saltHex: record.saltHex,
    hashHex: record.hashHex,
    iterations: record.iterations,
    failedAttempts,
    lockoutUntil,
    createdAt: typeof record.createdAt === "string" ? record.createdAt : "",
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : "",
  };
};

export const hashPin = async (
  pin: string,
  saltHex: string,
  iterations: number
): Promise<string> =>
  bytesToHex(
    await pbkdf2Sha256(pin, hexToBytes(saltHex), iterations, PIN_HASH_BYTES)
  );

export const createAppLockRecord = async (
  pin: string,
  nowIso: string
): Promise<AppLockRecord> => {
  if (!isValidPin(pin)) {
    throw new Error(
      `PIN must be ${PIN_MIN_LENGTH}-${PIN_MAX_LENGTH} digits`
    );
  }
  const saltHex = randomHex(PIN_SALT_BYTES);
  const hashHex = await hashPin(pin, saltHex, PIN_HASH_ITERATIONS);
  return {
    version: APP_LOCK_VERSION,
    pinLength: pin.length,
    saltHex,
    hashHex,
    iterations: PIN_HASH_ITERATIONS,
    failedAttempts: 0,
    lockoutUntil: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
};

export const verifyPinAgainstRecord = async (
  pin: string,
  record: AppLockRecord
): Promise<boolean> => {
  if (!isValidPin(pin)) return false;
  const hashHex = await hashPin(pin, record.saltHex, record.iterations);
  return constantTimeEquals(hashHex, record.hashHex);
};

/* ── Escalating lockout ──
 * The first FREE_ATTEMPTS wrong guesses cost nothing (typos happen). From
 * the next failure on, a lockout starts at LOCKOUT_BASE_MS and doubles per
 * subsequent failure, capped at LOCKOUT_MAX_MS. State persists in the
 * record, so force-quitting the app never resets the clock. */

export const FREE_ATTEMPTS = 4;
const LOCKOUT_BASE_MS = 30_000;
const LOCKOUT_MAX_MS = 5 * 60_000;

export const lockoutDelayMs = (failedAttempts: number): number => {
  if (failedAttempts <= FREE_ATTEMPTS) return 0;
  const doublings = failedAttempts - FREE_ATTEMPTS - 1;
  return Math.min(LOCKOUT_BASE_MS * 2 ** doublings, LOCKOUT_MAX_MS);
};

export const applyFailedAttempt = (
  record: AppLockRecord,
  nowMs: number
): AppLockRecord => {
  const failedAttempts = record.failedAttempts + 1;
  const delay = lockoutDelayMs(failedAttempts);
  return {
    ...record,
    failedAttempts,
    lockoutUntil: delay > 0 ? new Date(nowMs + delay).toISOString() : null,
  };
};

export const applySuccessfulUnlock = (record: AppLockRecord): AppLockRecord => ({
  ...record,
  failedAttempts: 0,
  lockoutUntil: null,
});

export const lockoutRemainingMs = (
  record: AppLockRecord,
  nowMs: number
): number => {
  if (!record.lockoutUntil) return 0;
  const until = Date.parse(record.lockoutUntil);
  if (Number.isNaN(until)) return 0;
  return Math.max(0, until - nowMs);
};

/** "0:07", "1:30", "5:00" - for the "try again in ..." countdown line. */
export const formatLockoutRemaining = (ms: number): string => {
  const totalSeconds = Math.ceil(Math.max(0, ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

/**
 * BudgetArk - App Lock logic tests
 * File: src/utils/__tests__/appLock.test.ts
 *
 * Pins the PIN-gate contract: validation bounds, record round-trip and
 * fail-closed parsing, forward-compatibility with future record versions,
 * hashing/verification, and the escalating-lockout math.
 * react-native-quick-crypto maps to Node's crypto in Jest, so hashing runs
 * the real PBKDF2.
 */

import {
  APP_LOCK_VERSION,
  type AppLockRecord,
  FREE_ATTEMPTS,
  applyFailedAttempt,
  applySuccessfulUnlock,
  constantTimeEquals,
  createAppLockRecord,
  formatLockoutRemaining,
  isValidPin,
  lockoutDelayMs,
  lockoutRemainingMs,
  parseAppLockRecord,
  verifyPinAgainstRecord,
} from "../appLock";

const NOW_ISO = "2026-07-26T12:00:00.000Z";
const NOW_MS = Date.parse(NOW_ISO);

describe("isValidPin", () => {
  it("accepts 4-8 digit PINs", () => {
    expect(isValidPin("0000")).toBe(true);
    expect(isValidPin("123456")).toBe(true);
    expect(isValidPin("99999999")).toBe(true);
  });

  it("rejects wrong lengths and non-digits", () => {
    expect(isValidPin("")).toBe(false);
    expect(isValidPin("123")).toBe(false);
    expect(isValidPin("123456789")).toBe(false);
    expect(isValidPin("12a4")).toBe(false);
    expect(isValidPin("12 4")).toBe(false);
    expect(isValidPin("12.4")).toBe(false);
    // Non-ASCII digits must not slip through a naive \d match.
    expect(isValidPin("١٢٣٤")).toBe(false);
  });
});

describe("createAppLockRecord / verifyPinAgainstRecord", () => {
  it("round-trips: the right PIN verifies, wrong ones do not", async () => {
    const record = await createAppLockRecord("4826", NOW_ISO);
    expect(record.version).toBe(APP_LOCK_VERSION);
    expect(record.pinLength).toBe(4);
    expect(record.failedAttempts).toBe(0);
    expect(record.lockoutUntil).toBeNull();
    await expect(verifyPinAgainstRecord("4826", record)).resolves.toBe(true);
    await expect(verifyPinAgainstRecord("4827", record)).resolves.toBe(false);
    await expect(verifyPinAgainstRecord("48261", record)).resolves.toBe(false);
    await expect(verifyPinAgainstRecord("", record)).resolves.toBe(false);
  });

  it("salts: the same PIN produces different records", async () => {
    const a = await createAppLockRecord("123456", NOW_ISO);
    const b = await createAppLockRecord("123456", NOW_ISO);
    expect(a.saltHex).not.toBe(b.saltHex);
    expect(a.hashHex).not.toBe(b.hashHex);
  });

  it("rejects invalid PINs at creation", async () => {
    await expect(createAppLockRecord("123", NOW_ISO)).rejects.toThrow();
    await expect(createAppLockRecord("12b4", NOW_ISO)).rejects.toThrow();
  });
});

describe("parseAppLockRecord", () => {
  const makeRaw = async () =>
    JSON.stringify(await createAppLockRecord("1234", NOW_ISO));

  it("round-trips a stored record", async () => {
    const record = await createAppLockRecord("1234", NOW_ISO);
    expect(parseAppLockRecord(JSON.stringify(record))).toEqual(record);
  });

  it("treats null/empty/garbage as disabled", () => {
    expect(parseAppLockRecord(null)).toBeNull();
    expect(parseAppLockRecord("")).toBeNull();
    expect(parseAppLockRecord("not json")).toBeNull();
    expect(parseAppLockRecord("42")).toBeNull();
    expect(parseAppLockRecord("[]")).toBeNull();
    expect(parseAppLockRecord("{}")).toBeNull();
  });

  it("fails closed on missing or malformed core fields", async () => {
    const base = JSON.parse(await makeRaw()) as Record<string, unknown>;
    const withField = (key: string, value: unknown) =>
      JSON.stringify({ ...base, [key]: value });

    expect(parseAppLockRecord(withField("saltHex", "zz"))).toBeNull();
    expect(parseAppLockRecord(withField("hashHex", "abcd"))).toBeNull();
    expect(parseAppLockRecord(withField("hashHex", undefined))).toBeNull();
    expect(parseAppLockRecord(withField("pinLength", 3))).toBeNull();
    expect(parseAppLockRecord(withField("pinLength", 9))).toBeNull();
    expect(parseAppLockRecord(withField("pinLength", 4.5))).toBeNull();
    expect(parseAppLockRecord(withField("version", 0))).toBeNull();
    expect(parseAppLockRecord(withField("version", "1"))).toBeNull();
    // Iteration bounds: a tampered record must not freeze every unlock.
    expect(parseAppLockRecord(withField("iterations", 10))).toBeNull();
    expect(parseAppLockRecord(withField("iterations", 2_000_000_000))).toBeNull();
  });

  it("accepts future versions and unknown fields (update compatibility)", async () => {
    const base = JSON.parse(await makeRaw()) as Record<string, unknown>;
    const future = JSON.stringify({
      ...base,
      version: 2,
      someFutureField: { nested: true },
    });
    const parsed = parseAppLockRecord(future);
    expect(parsed).not.toBeNull();
    expect(parsed?.version).toBe(2);
    // A future record must still verify with this version's code.
    await expect(
      verifyPinAgainstRecord("1234", parsed as AppLockRecord)
    ).resolves.toBe(true);
  });

  it("degrades attempt-tracking fields instead of failing the record", async () => {
    const base = JSON.parse(await makeRaw()) as Record<string, unknown>;
    delete base.failedAttempts;
    delete base.lockoutUntil;
    const parsed = parseAppLockRecord(JSON.stringify(base));
    expect(parsed).not.toBeNull();
    expect(parsed?.failedAttempts).toBe(0);
    expect(parsed?.lockoutUntil).toBeNull();
  });
});

describe("constantTimeEquals", () => {
  it("compares correctly", () => {
    expect(constantTimeEquals("", "")).toBe(true);
    expect(constantTimeEquals("abc", "abc")).toBe(true);
    expect(constantTimeEquals("abc", "abd")).toBe(false);
    expect(constantTimeEquals("abc", "ab")).toBe(false);
    expect(constantTimeEquals("abc", "abcd")).toBe(false);
  });
});

describe("lockout math", () => {
  it("gives free attempts, then escalates 30s doubling to a 5-minute cap", () => {
    for (let i = 0; i <= FREE_ATTEMPTS; i++) {
      expect(lockoutDelayMs(i)).toBe(0);
    }
    expect(lockoutDelayMs(FREE_ATTEMPTS + 1)).toBe(30_000);
    expect(lockoutDelayMs(FREE_ATTEMPTS + 2)).toBe(60_000);
    expect(lockoutDelayMs(FREE_ATTEMPTS + 3)).toBe(120_000);
    expect(lockoutDelayMs(FREE_ATTEMPTS + 4)).toBe(240_000);
    expect(lockoutDelayMs(FREE_ATTEMPTS + 5)).toBe(300_000);
    expect(lockoutDelayMs(FREE_ATTEMPTS + 50)).toBe(300_000);
  });

  it("applyFailedAttempt counts up and stamps a lockout past the free tier", async () => {
    let record = await createAppLockRecord("1234", NOW_ISO);
    for (let i = 0; i < FREE_ATTEMPTS; i++) {
      record = applyFailedAttempt(record, NOW_MS);
      expect(record.lockoutUntil).toBeNull();
    }
    expect(record.failedAttempts).toBe(FREE_ATTEMPTS);
    record = applyFailedAttempt(record, NOW_MS);
    expect(record.failedAttempts).toBe(FREE_ATTEMPTS + 1);
    expect(record.lockoutUntil).toBe(
      new Date(NOW_MS + 30_000).toISOString()
    );
  });

  it("applySuccessfulUnlock clears the counter and lockout", async () => {
    let record = await createAppLockRecord("1234", NOW_ISO);
    for (let i = 0; i < FREE_ATTEMPTS + 2; i++) {
      record = applyFailedAttempt(record, NOW_MS);
    }
    const cleared = applySuccessfulUnlock(record);
    expect(cleared.failedAttempts).toBe(0);
    expect(cleared.lockoutUntil).toBeNull();
    // The PIN material is untouched.
    expect(cleared.hashHex).toBe(record.hashHex);
    expect(cleared.saltHex).toBe(record.saltHex);
  });

  it("lockoutRemainingMs handles future, past, absent, and malformed stamps", async () => {
    const record = await createAppLockRecord("1234", NOW_ISO);
    expect(lockoutRemainingMs(record, NOW_MS)).toBe(0);
    const lockedOut = {
      ...record,
      lockoutUntil: new Date(NOW_MS + 45_000).toISOString(),
    };
    expect(lockoutRemainingMs(lockedOut, NOW_MS)).toBe(45_000);
    expect(lockoutRemainingMs(lockedOut, NOW_MS + 60_000)).toBe(0);
    expect(
      lockoutRemainingMs({ ...record, lockoutUntil: "not-a-date" }, NOW_MS)
    ).toBe(0);
  });
});

describe("lockoutRemainingMs clamp", () => {
  it("never reports more than the 5-minute cap, even if the clock was set back", async () => {
    const record = await createAppLockRecord("1234", new Date(NOW_MS).toISOString());
    // Locked out until "a year from now" as far as the (now earlier) clock
    // can tell - e.g. the user changed the date after a lockout.
    const farFuture = { ...record, lockoutUntil: new Date(NOW_MS + 365 * 86_400_000).toISOString() };
    expect(lockoutRemainingMs(farFuture, NOW_MS)).toBe(5 * 60_000);
  });
});

describe("formatLockoutRemaining", () => {
  it("formats m:ss, rounding up partial seconds", () => {
    expect(formatLockoutRemaining(0)).toBe("0:00");
    expect(formatLockoutRemaining(-500)).toBe("0:00");
    expect(formatLockoutRemaining(1)).toBe("0:01");
    expect(formatLockoutRemaining(7_000)).toBe("0:07");
    expect(formatLockoutRemaining(90_000)).toBe("1:30");
    expect(formatLockoutRemaining(300_000)).toBe("5:00");
  });
});

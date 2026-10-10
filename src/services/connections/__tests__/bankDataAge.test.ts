/**
 * BudgetArk - Bank Data Age Tests
 * File: src/services/connections/__tests__/bankDataAge.test.ts
 *
 * Pins the stale-bank rule the Connections manager shows on each account
 * row: whole days floored from the provider's balance-date, stale at two
 * full days, future dates clamped to 0, missing/garbage dates -> null.
 */

import { STALE_BANK_DATA_DAYS, bankDataAge } from "../bankDataAge";

const NOW = Date.parse("2026-10-09T12:00:00.000Z");
const HOUR = 60 * 60 * 1000;

const isoHoursAgo = (hours: number): string => new Date(NOW - hours * HOUR).toISOString();

describe("bankDataAge", () => {
  it("uses a two-day stale threshold", () => {
    expect(STALE_BANK_DATA_DAYS).toBe(2);
  });

  it("returns null for a missing date", () => {
    expect(bankDataAge(undefined, NOW)).toBeNull();
    expect(bankDataAge("", NOW)).toBeNull();
  });

  it("returns null for an unparseable date", () => {
    expect(bankDataAge("not-a-date", NOW)).toBeNull();
  });

  it("is 0 days and fresh for a balance from earlier today", () => {
    expect(bankDataAge(isoHoursAgo(3), NOW)).toEqual({ days: 0, stale: false });
  });

  it("floors partial days", () => {
    expect(bankDataAge(isoHoursAgo(47), NOW)).toEqual({ days: 1, stale: false });
  });

  it("turns stale at exactly two full days", () => {
    expect(bankDataAge(isoHoursAgo(48), NOW)).toEqual({ days: 2, stale: true });
  });

  it("stays stale for older data", () => {
    expect(bankDataAge(isoHoursAgo(24 * 9 + 5), NOW)).toEqual({ days: 9, stale: true });
  });

  it("clamps a future balance-date to 0 days", () => {
    expect(bankDataAge(isoHoursAgo(-30), NOW)).toEqual({ days: 0, stale: false });
  });

  it("accepts a date-only balance stamp", () => {
    expect(bankDataAge("2026-10-06", NOW)).toEqual({ days: 3, stale: true });
  });
});

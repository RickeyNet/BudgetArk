/**
 * BudgetArk - Month-Start Balance Storage
 * File: src/storage/monthlyBalanceStorage.ts
 *
 * Persists the `monthKey → MonthStartBalance` map behind the Budget tab's
 * cash-flow projection, plus the per-device "already prompted this month"
 * marker. The balance map is real financial data: it syncs to a paired
 * partner (SyncDiff.monthStartBalances) and rides JSON exports/imports.
 * The prompt marker is UX state: per-device, never synced, never exported.
 * Both keys are wiped by Reset All Data (debtStorage.RESET_KEYS).
 */

import * as EncryptedStorage from "./encryptedStorage";
import type { MonthStartBalance } from "../types";
import {
  parseMonthStartBalances,
  type MonthStartBalanceMap,
} from "../utils/cashFlow";
import { isMonthKey } from "../utils/recordValidators";

const STORAGE_KEY = "@budgetark_month_start_balances";
const PROMPT_KEY = "@budgetark_month_balance_prompt";

export const getMonthStartBalances = async (): Promise<MonthStartBalanceMap> => {
  const raw = await EncryptedStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return parseMonthStartBalances(JSON.parse(raw));
  } catch {
    return {};
  }
};

/**
 * Records the user-entered starting balance for a month, stamping
 * capturedAt/updatedAt now. Atomic via updateItem so a concurrent sync
 * write can't be clobbered by this read-modify-write. Returns the full map
 * so callers can refresh screen state without a second read.
 */
export const setMonthStartBalance = async (
  monthKey: string,
  balance: number
): Promise<MonthStartBalanceMap> => {
  if (!isMonthKey(monthKey)) {
    throw new Error(`Invalid month key: ${monthKey}`);
  }
  const now = new Date().toISOString();
  const record: MonthStartBalance = {
    balance,
    capturedAt: now,
    updatedAt: now,
  };
  let next: MonthStartBalanceMap = { [monthKey]: record };
  await EncryptedStorage.updateItem(STORAGE_KEY, (current) => {
    let existing: MonthStartBalanceMap = {};
    if (current) {
      try {
        existing = parseMonthStartBalances(JSON.parse(current));
      } catch {
        existing = {};
      }
    }
    next = { ...existing, [monthKey]: record };
    return JSON.stringify(next);
  });
  return next;
};

/**
 * Raw setter for the sync/import merge paths - the caller has already run
 * validation and LWW, so this must not re-stamp timestamps.
 */
export const saveMonthStartBalancesFromSync = async (
  map: MonthStartBalanceMap
): Promise<void> => {
  await EncryptedStorage.setItem(STORAGE_KEY, JSON.stringify(map));
};

/**
 * The month (`YYYY-MM`) the once-per-month balance prompt last fired for,
 * or null. Stored the moment the prompt is shown - skipping it still
 * counts, so a "Not now" never re-nags until the next calendar month.
 */
export const getLastBalancePromptMonth = async (): Promise<string | null> => {
  const raw = await EncryptedStorage.getItem(PROMPT_KEY);
  return raw && isMonthKey(raw) ? raw : null;
};

export const setLastBalancePromptMonth = async (
  monthKey: string
): Promise<void> => {
  await EncryptedStorage.setItem(PROMPT_KEY, monthKey);
};

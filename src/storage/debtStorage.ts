/**
 * BudgetArk - Debt Storage Utility
 * File: src/storage/debtStorage.ts
 *
 * Handles all persistent storage operations for debt data.
 * Uses AsyncStorage (key-value store on-device) for offline-first operation.
 *
 * Design decisions:
 * - All debts are stored as a single JSON array under one key for fast reads.
 * - Writes are atomic - the entire array is replaced on each update.
 * - This is efficient for typical use (< 50 debts) and avoids key fragmentation.
 */

import * as EncryptedStorage from "./encryptedStorage";
import { Debt, DebtClass, DebtClassSource, DebtOwner, Payment } from "../types";
import {
  filterLive,
  purgeExpiredTombstones,
  tombstone,
  untombstone,
} from "./tombstones";

export type PayoffStrategyPreference = "custom" | "avalanche" | "snowball";

/**
 * On-disk envelope for the payoff strategy preference. The bare value used
 * to be persisted directly (and over the wire) which gave sync no way to
 * resolve conflicts - the value flip-flopped on every sync direction. The
 * envelope lets us LWW the strategy like every other syncable field.
 */
export interface PayoffStrategyEnvelope {
  value: PayoffStrategyPreference;
  updatedAt: string;
}

const PAYOFF_LEGACY_TIMESTAMP = "1970-01-01T00:00:00.000Z";

/** Storage keys - centralized to prevent typos */
const STORAGE_KEYS = {
  DEBTS: "@budgetark_debts",
  PAYMENTS: "@budgetark_payments",
  PAYOFF_STRATEGY: "@budgetark_payoff_strategy",
} as const;

const isPayoffStrategyPreference = (
  value: unknown
): value is PayoffStrategyPreference =>
  value === "custom" || value === "avalanche" || value === "snowball";

/* ─── Debt CRUD Operations ─── */

const isDebtOwner = (value: unknown): value is DebtOwner =>
  value === "mine" || value === "partner" || value === "joint";

const isDebtClass = (value: unknown): value is DebtClass =>
  value === "personal_credit" || value === "car" || value === "house";

const isDebtClassSource = (value: unknown): value is DebtClassSource =>
  value === "manual" || value === "inferred";

const HOUSE_KEYWORDS = ["mortgage", "house", "home loan", "home"];
const CAR_KEYWORDS = ["car", "auto", "vehicle", "truck"];

export const inferDebtClassFromName = (name: string): DebtClass => {
  const normalized = name.toLowerCase();
  if (HOUSE_KEYWORDS.some((keyword) => normalized.includes(keyword))) return "house";
  if (CAR_KEYWORDS.some((keyword) => normalized.includes(keyword))) return "car";
  return "personal_credit";
};

/**
 * Splits the legacy "car_house" value introduced before BudgetArk separated
 * cars from mortgages. House keywords win; otherwise falls back to "car"
 * (the more common secured-debt case for most users).
 */
const splitLegacyCarHouse = (name: string): DebtClass => {
  const normalized = name.toLowerCase();
  if (HOUSE_KEYWORDS.some((keyword) => normalized.includes(keyword))) return "house";
  return "car";
};

/**
 * Returns the same ref when every field is already in canonical shape, so
 * the steady-state read path (post-migration) doesn't spread + reallocate
 * every debt record on every getDebts call.
 */
const normalizeDebt = (debt: Debt): Debt => {
  const rawClass = (debt as { debtClass?: unknown }).debtClass;
  const ownerOk = isDebtOwner(debt.owner);
  const classOk = isDebtClass(rawClass);
  const sourceOk = isDebtClassSource(debt.debtClassSource);
  const stampOk = !!debt.updatedAt;
  if (ownerOk && classOk && sourceOk && stampOk) return debt;

  let nextClass: DebtClass;
  if (classOk) {
    nextClass = rawClass as DebtClass;
  } else if (rawClass === "car_house") {
    nextClass = splitLegacyCarHouse(debt.name);
  } else {
    nextClass = inferDebtClassFromName(debt.name);
  }
  return {
    ...debt,
    owner: ownerOk ? debt.owner : "mine",
    debtClass: nextClass,
    debtClassSource: sourceOk ? debt.debtClassSource : "inferred",
    updatedAt: debt.updatedAt || debt.createdAt || new Date().toISOString(),
  };
};

/**
 * Retrieves all stored debts (excluding tombstones - those are an
 * implementation detail of sync; UI never sees them).
 *
 * @returns Promise<Debt[]> - array of live debt entries
 */
export const getDebts = async (): Promise<Debt[]> => {
  const all = await getDebtsIncludingDeleted();
  return filterLive(all);
};

/**
 * Sync-only: returns every debt including soft-deleted tombstones, so the
 * diff engine can emit `action: "delete"` for tombstones the partner
 * doesn't yet know about. Tombstones older than the TTL are purged here.
 */
export const getDebtsIncludingDeleted = async (): Promise<Debt[]> => {
  const raw = await EncryptedStorage.getItem(STORAGE_KEYS.DEBTS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Debt[];
    let normalizeChanged = false;
    const normalized = parsed.map((debt) => {
      const next = normalizeDebt(debt);
      if (next !== debt) normalizeChanged = true;
      return next;
    });
    const purged = purgeExpiredTombstones(normalized);
    if (normalizeChanged || purged !== normalized) {
      await saveDebts(purged);
    }
    return purged;
  } catch {
    return [];
  }
};

/**
 * Persists the full debts array (live + tombstones) to device storage.
 * Sync writes go through this so tombstones survive merges; user code
 * should prefer `addDebt`, `updateDebt`, or `deleteDebt`.
 */
export const saveDebts = async (debts: Debt[]): Promise<void> => {
  await EncryptedStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify(debts));
};

/**
 * Adds a single new debt to storage.
 * Appends to the existing array and saves.
 *
 * @param debt - the new debt to add (must include all required fields)
 * @returns Promise<Debt[]> - the updated debts array
 */
export const addDebt = async (debt: Debt): Promise<Debt[]> => {
  const debts = await getDebtsIncludingDeleted();
  debts.push(debt);
  await saveDebts(debts);
  return filterLive(debts);
};

/**
 * Soft-deletes a debt by marking it with `deletedAt: now` and keeping the
 * record in storage. The next paired sync emits `action: "delete"` for
 * this tombstone so the partner removes it locally too. Without the
 * tombstone, the partner would just upsert the record back on its next
 * sync - silently resurrecting the deletion.
 *
 * @param id - the unique ID of the debt to remove
 * @returns Promise<Debt[]> - live (non-tombstoned) debts after the delete
 */
export const deleteDebt = async (id: string): Promise<Debt[]> => {
  const debts = await getDebtsIncludingDeleted();
  const now = new Date().toISOString();
  const next = debts.map((d) => (d.id === id ? tombstone(d, now) : d));
  await saveDebts(next);
  return filterLive(next);
};

/**
 * Updates a specific debt entry by replacing it in the array.
 * Matches by ID and merges the partial update.
 *
 * @param id - the debt ID to update
 * @param updates - partial debt object with only the fields to change
 * @returns Promise<Debt[]> - live (non-tombstoned) debts after the update
 */
export const updateDebt = async (
  id: string,
  updates: Partial<Debt>
): Promise<Debt[]> => {
  const debts = await getDebtsIncludingDeleted();
  const now = new Date().toISOString();
  const updated = debts.map((d) =>
    d.id === id ? { ...d, ...updates, updatedAt: now } : d
  );
  await saveDebts(updated);
  return filterLive(updated);
};

/**
 * Undo a soft-deleted debt: clears the tombstone so it's live again.
 * No-op if the id isn't a tombstone.
 */
export const restoreDebt = async (id: string): Promise<Debt[]> => {
  const debts = await getDebtsIncludingDeleted();
  const now = new Date().toISOString();
  const next = debts.map((d) =>
    d.id === id && d.deletedAt ? untombstone(d, now) : d
  );
  await saveDebts(next);
  return filterLive(next);
};

/* ─── Payment History Operations ─── */

/**
 * Retrieves all payment records from storage.
 *
 * @returns Promise<Payment[]> - array of all payments
 */
const normalizePayment = (payment: Payment): Payment => {
  if (payment.updatedAt) return payment;
  return {
    ...payment,
    updatedAt: payment.date || new Date().toISOString(),
  };
};

export const getPayments = async (): Promise<Payment[]> => {
  const all = await getPaymentsIncludingDeleted();
  return filterLive(all);
};

/**
 * Sync-only: like `getPayments` but returns tombstones too. There's no
 * UI delete for payments today, but the sync layer still needs the
 * tombstone-aware path for symmetry with debts/budget entries - and so
 * a future delete feature plugs in without changing the sync wiring.
 */
export const getPaymentsIncludingDeleted = async (): Promise<Payment[]> => {
  const raw = await EncryptedStorage.getItem(STORAGE_KEYS.PAYMENTS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Payment[];
    let normalizeChanged = false;
    const normalized = parsed.map((payment) => {
      const next = normalizePayment(payment);
      if (next !== payment) normalizeChanged = true;
      return next;
    });
    const purged = purgeExpiredTombstones(normalized);
    if (normalizeChanged || purged !== normalized) {
      await EncryptedStorage.setItem(
        STORAGE_KEYS.PAYMENTS,
        JSON.stringify(purged)
      );
    }
    return purged;
  } catch {
    return [];
  }
};

/**
 * Records a new payment and updates the associated debt's balance.
 * This is a compound operation - it modifies both payments and debts.
 *
 * Both keys are written through a single `multiSet` so a write timeout
 * can't leave the debt's balance reduced without a matching payment row
 * (or vice versa). The per-key write queue inside `EncryptedStorage` also
 * keeps this serialized against any concurrent `setItem`/`removeItem` on
 * either key, including incoming sync diffs that touch debts/payments.
 *
 * @param payment - the payment to record
 * @returns Promise<{ debts: Debt[]; payments: Payment[] }> - updated state
 */
export const recordPayment = async (
  payment: Payment
): Promise<{ debts: Debt[]; payments: Payment[] }> => {
  /* Load full state including tombstones so we don't overwrite them. */
  const [debts, payments] = await Promise.all([
    getDebtsIncludingDeleted(),
    getPaymentsIncludingDeleted(),
  ]);

  /* Calculate updated debt balance - only matches a live debt, never a
   * tombstone (UI couldn't have surfaced a deleted debt to pay). */
  const now = new Date().toISOString();
  const updatedDebts = debts.map((d) => {
    if (d.id === payment.debtId && !d.deletedAt) {
      return { ...d, balance: Math.max(0, d.balance - payment.amount), updatedAt: now };
    }
    return d;
  });

  /* Append the new payment, preserving any existing tombstones. */
  const updatedPayments = [...payments, payment];

  /* Save both in one native AsyncStorage call to shrink the partial-state window. */
  await EncryptedStorage.multiSet([
    [STORAGE_KEYS.DEBTS, JSON.stringify(updatedDebts)],
    [STORAGE_KEYS.PAYMENTS, JSON.stringify(updatedPayments)],
  ]);

  return {
    debts: filterLive(updatedDebts),
    payments: filterLive(updatedPayments),
  };
};

/**
 * Soft-deletes a payment and reverses its effect on the debt balance.
 * A logged-in-error payment had reduced the debt's balance; deleting it
 * must add that amount back, or the balance silently stays wrong. Both
 * keys are written in one multiSet, mirroring recordPayment, so a write
 * timeout can't tombstone the payment without also restoring the balance.
 *
 * @returns updated live debts + payments
 */
export const deletePayment = async (
  paymentId: string
): Promise<{ debts: Debt[]; payments: Payment[] }> => {
  const [debts, payments] = await Promise.all([
    getDebtsIncludingDeleted(),
    getPaymentsIncludingDeleted(),
  ]);
  const now = new Date().toISOString();
  const target = payments.find((p) => p.id === paymentId && !p.deletedAt);

  const updatedPayments = payments.map((p) =>
    p.id === paymentId && !p.deletedAt ? tombstone(p, now) : p
  );
  const updatedDebts =
    target == null
      ? debts
      : debts.map((d) =>
          d.id === target.debtId && !d.deletedAt
            ? { ...d, balance: d.balance + target.amount, updatedAt: now }
            : d
        );

  await EncryptedStorage.multiSet([
    [STORAGE_KEYS.DEBTS, JSON.stringify(updatedDebts)],
    [STORAGE_KEYS.PAYMENTS, JSON.stringify(updatedPayments)],
  ]);
  return {
    debts: filterLive(updatedDebts),
    payments: filterLive(updatedPayments),
  };
};

/**
 * Undo a payment delete: clears the tombstone and re-applies the balance
 * reduction it originally caused. Inverse of deletePayment.
 */
export const restorePayment = async (
  paymentId: string
): Promise<{ debts: Debt[]; payments: Payment[] }> => {
  const [debts, payments] = await Promise.all([
    getDebtsIncludingDeleted(),
    getPaymentsIncludingDeleted(),
  ]);
  const now = new Date().toISOString();
  const target = payments.find((p) => p.id === paymentId && p.deletedAt);

  const updatedPayments = payments.map((p) =>
    p.id === paymentId && p.deletedAt ? untombstone(p, now) : p
  );
  const updatedDebts =
    target == null
      ? debts
      : debts.map((d) =>
          d.id === target.debtId && !d.deletedAt
            ? {
                ...d,
                balance: Math.max(0, d.balance - target.amount),
                updatedAt: now,
              }
            : d
        );

  await EncryptedStorage.multiSet([
    [STORAGE_KEYS.DEBTS, JSON.stringify(updatedDebts)],
    [STORAGE_KEYS.PAYMENTS, JSON.stringify(updatedPayments)],
  ]);
  return {
    debts: filterLive(updatedDebts),
    payments: filterLive(updatedPayments),
  };
};

/**
 * Clears all stored data. Used for account reset / logout.
 * WARNING: This is destructive and cannot be undone.
 *
 * AsyncStorage's `multiRemove` isn't atomic on Android, so a transient
 * I/O failure (or `withTimeout` rejection) can leave the device with some
 * keys cleared and others intact. We use `allSettled` + a single retry
 * pass per key so partial-failure cases get a second chance to complete,
 * and surface a `FailedKeysError` if any key still hasn't cleared. The
 * caller (Profile reset confirm) can then warn the user that the reset
 * is incomplete instead of silently presenting "Done."
 */
// Keys cleared on Reset All Data. User account, pairing state, and sync
// metadata are wiped separately by `confirmReset` (deleteAccount +
// clearPairingState) - they live in different modules. Visual preferences
// (theme, density, haptics, privacy mode) intentionally survive a reset
// since they're cosmetic, not user data.
const RESET_KEYS = [
  STORAGE_KEYS.DEBTS,
  STORAGE_KEYS.PAYMENTS,
  STORAGE_KEYS.PAYOFF_STRATEGY,
  "@budgetark_budget_entries",
  "@budgetark_budget_limits_by_month",
  "@budgetark_savings_goals",
  "@budgetark_net_worth_snapshots",
  "@budgetark_asset_accounts",
  "@budgetark_debt_milestones",
  "@budgetark_open_ark_setup_once",
  // Walkthrough state - without this, a fresh reset wouldn't re-show the
  // first-launch tour even though all the user's data is gone.
  "@budgetark_coachmarks",
  // Backup-reminder version - survives reset would mean the user wouldn't
  // see the "take a backup" nudge again until the next app upgrade.
  "@budgetark_backup_reminder",
  // Release-notes seen state + OTA-installed flag - fresh reset should
  // re-show the latest release notes the same way a fresh install would.
  "@budgetark_last_seen_release_notes_version",
  "@budgetark_ota_update_installed",
  // Update-check preferences - auto vs manual choice belongs to the user
  // identity, not the device, so it should reset with everything else.
  "@budgetark_update_preferences",
  // Learning progress (Charts lesson completions, resume pointer, affiliate
  // flags). Per-device state - a fresh reset should re-show every lesson as
  // unread and clear the Resume card.
  "@budgetark_learning_progress",
] as const;

export class ResetIncompleteError extends Error {
  constructor(public readonly failedKeys: readonly string[]) {
    super(`Reset incomplete: ${failedKeys.length} key(s) failed to clear`);
    this.name = "ResetIncompleteError";
  }
}

const removeAllSettled = async (
  keys: readonly string[]
): Promise<string[]> => {
  const results = await Promise.allSettled(
    keys.map((key) => EncryptedStorage.removeItem(key))
  );
  const failed: string[] = [];
  results.forEach((result, idx) => {
    if (result.status === "rejected") failed.push(keys[idx]);
  });
  return failed;
};

export const clearAllData = async (): Promise<void> => {
  let failed = await removeAllSettled(RESET_KEYS);
  if (failed.length > 0) {
    // Single retry - handles transient timeouts where the underlying
    // AsyncStorage call eventually flushed but our `withTimeout` wrapper
    // already rejected.
    failed = await removeAllSettled(failed);
  }
  if (failed.length > 0) {
    throw new ResetIncompleteError(failed);
  }
};

/**
 * Reads the strategy + the timestamp it was set. New writes go through
 * `savePayoffStrategyPreference`, which stamps `updatedAt: now`. Legacy
 * data persisted as a bare string (no envelope) is normalized to the epoch
 * so any fresh remote edit wins LWW on the next sync.
 */
export const getPayoffStrategyEnvelope = async (): Promise<PayoffStrategyEnvelope | null> => {
  const raw = await EncryptedStorage.getItem(STORAGE_KEYS.PAYOFF_STRATEGY);
  if (raw === null) return null;
  // Legacy: bare string was written directly to encrypted storage before
  // the envelope existed. Synthesize an epoch-stamped envelope and write
  // it back so subsequent reads skip this branch.
  if (isPayoffStrategyPreference(raw)) {
    const legacy: PayoffStrategyEnvelope = {
      value: raw,
      updatedAt: PAYOFF_LEGACY_TIMESTAMP,
    };
    await EncryptedStorage.setItem(
      STORAGE_KEYS.PAYOFF_STRATEGY,
      JSON.stringify(legacy)
    );
    return legacy;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      isPayoffStrategyPreference((parsed as Record<string, unknown>).value) &&
      typeof (parsed as Record<string, unknown>).updatedAt === "string"
    ) {
      return parsed as PayoffStrategyEnvelope;
    }
  } catch {
    // fallthrough - treat as missing
  }
  return null;
};

export const getPayoffStrategyPreference = async (): Promise<PayoffStrategyPreference | null> => {
  const env = await getPayoffStrategyEnvelope();
  return env?.value ?? null;
};

export const savePayoffStrategyPreference = async (
  strategy: PayoffStrategyPreference
): Promise<void> => {
  const envelope: PayoffStrategyEnvelope = {
    value: strategy,
    updatedAt: new Date().toISOString(),
  };
  await EncryptedStorage.setItem(
    STORAGE_KEYS.PAYOFF_STRATEGY,
    JSON.stringify(envelope)
  );
};

/**
 * Sync-only setter that preserves an incoming peer's `updatedAt` instead of
 * stamping it `now`. Lets `applyIncomingDiff` honour LWW correctly: if Bob
 * later sends a sync without changing strategy, his value loses to Alice's
 * because Alice's stamp is older only if hers really is older.
 */
export const savePayoffStrategyEnvelope = async (
  envelope: PayoffStrategyEnvelope
): Promise<void> => {
  await EncryptedStorage.setItem(
    STORAGE_KEYS.PAYOFF_STRATEGY,
    JSON.stringify(envelope)
  );
};

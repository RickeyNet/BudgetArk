/**
 * BudgetArk - Business storage
 * File: src/storage/businessStorage.ts
 *
 * CRUD for user-defined businesses (companies expense entries can be tagged
 * with). Tombstone-aware like savingsGoalStorage - entries reference
 * businesses by id, so deletes must survive locally (Undo) and propagate
 * through P2P sync instead of being silently resurrected by a partner.
 * Names are sanitized and validated (length, control chars, duplicates)
 * before write, mirroring customCategoriesStorage.
 */

import * as EncryptedStorage from "./encryptedStorage";
import {
  Business,
  BUSINESS_STORAGE_VERSION,
  MAX_BUSINESSES,
  MAX_BUSINESS_NAME_LENGTH,
} from "../types";
import {
  filterLive,
  mergePreservingTombstones,
  purgeExpiredTombstones,
  tombstone,
  untombstone,
} from "./tombstones";
import { sanitizeTextInput } from "../utils/sanitize";
import { generateUUID } from "../utils/uuid";

/** Also listed in debtStorage.RESET_KEYS - keep in lockstep. */
const STORAGE_KEY = "@budgetark_businesses";

interface BusinessStore {
  businesses: Business[];
  version: number;
}

export type BusinessMutationResult =
  | { ok: true; businesses: Business[] }
  | { ok: false; error: string };

const readStore = async (): Promise<Business[]> => {
  const raw = await EncryptedStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Partial<BusinessStore>;
    if (!parsed || !Array.isArray(parsed.businesses)) return [];
    const cleaned = parsed.businesses.filter(
      (b): b is Business =>
        !!b && typeof b.id === "string" && typeof b.name === "string"
    );
    const purged = purgeExpiredTombstones(cleaned);
    if (purged !== cleaned) {
      await writeStore(purged);
    }
    return purged;
  } catch {
    return [];
  }
};

const writeStore = async (businesses: Business[]): Promise<void> => {
  const store: BusinessStore = {
    businesses,
    version: BUSINESS_STORAGE_VERSION,
  };
  await EncryptedStorage.setItem(STORAGE_KEY, JSON.stringify(store));
};

/** Live (non-tombstoned) businesses - what every screen renders. */
export const getBusinesses = async (): Promise<Business[]> =>
  filterLive(await readStore());

/**
 * Sync/export-only: includes soft-deleted businesses so the diff engine
 * and JSON export can propagate deletes. See tombstones.ts for why.
 */
export const getBusinessesIncludingDeleted = async (): Promise<Business[]> =>
  readStore();

/**
 * Persists the array. Safe to call with a live-only (`getBusinesses`)
 * array: stored tombstones missing from the input are merged back in so a
 * screen-level save can't erase the soft-deletes Undo and sync need.
 */
export const saveBusinesses = async (businesses: Business[]): Promise<void> => {
  const stored = await readStore();
  await writeStore(mergePreservingTombstones(businesses, stored));
};

/**
 * Bulk write used by P2P sync / replace-mode import after merging. Bypasses
 * per-mutation name validation - the trust boundary already validated each
 * record, and rejecting duplicate names here would brick the very merge
 * sync just computed (entries reference by id; dup names are cosmetic).
 */
export const saveBusinessesFromSync = async (
  businesses: Business[]
): Promise<void> => writeStore(businesses);

/**
 * Validate a candidate name: sanitize, length-cap, case-insensitive
 * duplicate check against live businesses (optionally excluding one id,
 * for rename). Returns the cleaned name or an error string.
 */
const validateName = (
  rawName: string,
  existing: Business[],
  excludeId?: string
): { ok: true; name: string } | { ok: false; error: string } => {
  const name = sanitizeTextInput(rawName).trim();
  if (!name) return { ok: false, error: "Enter a business name." };
  if (name.length > MAX_BUSINESS_NAME_LENGTH) {
    return {
      ok: false,
      error: `Keep it under ${MAX_BUSINESS_NAME_LENGTH} characters.`,
    };
  }
  const lower = name.toLowerCase();
  const clash = existing.some(
    (b) => !b.deletedAt && b.id !== excludeId && b.name.toLowerCase() === lower
  );
  if (clash) {
    return { ok: false, error: `"${name}" already exists.` };
  }
  return { ok: true, name };
};

export const addBusiness = async (
  rawName: string
): Promise<BusinessMutationResult> => {
  const all = await readStore();
  const live = filterLive(all);
  if (live.length >= MAX_BUSINESSES) {
    return {
      ok: false,
      error: `You can have up to ${MAX_BUSINESSES} businesses.`,
    };
  }
  const checked = validateName(rawName, all);
  if (!checked.ok) return checked;

  const now = new Date().toISOString();
  const next: Business[] = [
    ...all,
    {
      id: generateUUID(),
      name: checked.name,
      createdAt: now,
      updatedAt: now,
    },
  ];
  await writeStore(next);
  return { ok: true, businesses: filterLive(next) };
};

export const updateBusiness = async (
  id: string,
  patch: { name?: string }
): Promise<BusinessMutationResult> => {
  const all = await readStore();
  const target = all.find((b) => b.id === id && !b.deletedAt);
  if (!target) return { ok: false, error: "Business not found." };

  let name = target.name;
  if (patch.name !== undefined) {
    const checked = validateName(patch.name, all, id);
    if (!checked.ok) return checked;
    name = checked.name;
  }

  const next = all.map((b) =>
    b.id === id ? { ...b, name, updatedAt: new Date().toISOString() } : b
  );
  await writeStore(next);
  return { ok: true, businesses: filterLive(next) };
};

/** Soft-delete (tombstone) so the delete propagates via sync and is undoable. */
export const deleteBusiness = async (id: string): Promise<Business[]> => {
  const all = await readStore();
  const now = new Date().toISOString();
  const next = all.map((b) => (b.id === id ? tombstone(b, now) : b));
  await writeStore(next);
  return filterLive(next);
};

/** Undo a soft-delete. No-op if the id isn't a tombstone. */
export const restoreBusiness = async (id: string): Promise<Business[]> => {
  const all = await readStore();
  const now = new Date().toISOString();
  const next = all.map((b) =>
    b.id === id && b.deletedAt ? untombstone(b, now) : b
  );
  await writeStore(next);
  return filterLive(next);
};

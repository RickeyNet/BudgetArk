/**
 * BudgetArk - Person storage
 * File: src/storage/personStorage.ts
 *
 * CRUD for user-defined people (household members expense entries can be
 * assigned to - "who spent this"). Deliberately a line-for-line mirror of
 * businessStorage: tombstone-aware because entries reference people by id,
 * so deletes must survive locally (Undo) and propagate through P2P sync
 * instead of being silently resurrected by a partner. Names are sanitized
 * and validated (length, control chars, duplicates) before write.
 */

import * as EncryptedStorage from "./encryptedStorage";
import {
  Person,
  PERSON_STORAGE_VERSION,
  MAX_PEOPLE,
  MAX_PERSON_NAME_LENGTH,
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
const STORAGE_KEY = "@budgetark_people";

interface PersonStore {
  people: Person[];
  version: number;
}

export type PersonMutationResult =
  | { ok: true; people: Person[] }
  | { ok: false; error: string };

const cleanPeople = (people: unknown[]): Person[] =>
  people.filter(
    (p): p is Person =>
      !!p &&
      typeof (p as Person).id === "string" &&
      typeof (p as Person).name === "string"
  );

const readStore = async (): Promise<Person[]> => {
  const raw = await EncryptedStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Partial<PersonStore>;
    if (!parsed || !Array.isArray(parsed.people)) return [];
    const cleaned = cleanPeople(parsed.people);
    const purged = purgeExpiredTombstones(cleaned);
    if (purged !== cleaned) {
      // Atomic recompute instead of writing our own (possibly stale)
      // snapshot: a mutation or sync write landing between the read above
      // and this write must not be reverted by the purge. Bespoke updater
      // (not repairCollectionInPlace) because people persist inside a
      // versioned envelope, not a bare array. Same shape as businessStorage.
      await EncryptedStorage.updateItem(STORAGE_KEY, (current) => {
        if (!current) return null;
        try {
          const cur = JSON.parse(current) as Partial<PersonStore>;
          if (!cur || !Array.isArray(cur.people)) return null;
          const curCleaned = cleanPeople(cur.people);
          const curPurged = purgeExpiredTombstones(curCleaned);
          // Same trigger as the read path: rewrite only when the purge
          // actually dropped a tombstone.
          if (curPurged === curCleaned) return null;
          const store: PersonStore = {
            people: curPurged,
            version: PERSON_STORAGE_VERSION,
          };
          return JSON.stringify(store);
        } catch {
          return null;
        }
      });
    }
    return purged;
  } catch {
    return [];
  }
};

const writeStore = async (people: Person[]): Promise<void> => {
  const store: PersonStore = {
    people,
    version: PERSON_STORAGE_VERSION,
  };
  await EncryptedStorage.setItem(STORAGE_KEY, JSON.stringify(store));
};

/** Live (non-tombstoned) people - what every screen renders. */
export const getPeople = async (): Promise<Person[]> =>
  filterLive(await readStore());

/**
 * Sync/export-only: includes soft-deleted people so the diff engine and
 * JSON export can propagate deletes. See tombstones.ts for why.
 */
export const getPeopleIncludingDeleted = async (): Promise<Person[]> =>
  readStore();

/**
 * Persists the array. Safe to call with a live-only (`getPeople`) array:
 * stored tombstones missing from the input are merged back in so a
 * screen-level save can't erase the soft-deletes Undo and sync need.
 */
export const savePeople = async (people: Person[]): Promise<void> => {
  const stored = await readStore();
  await writeStore(mergePreservingTombstones(people, stored));
};

/**
 * Bulk write used by P2P sync / replace-mode import after merging. Bypasses
 * per-mutation name validation - the trust boundary already validated each
 * record, and rejecting duplicate names here would brick the very merge
 * sync just computed (entries reference by id; dup names are cosmetic).
 */
export const savePeopleFromSync = async (people: Person[]): Promise<void> =>
  writeStore(people);

/**
 * Validate a candidate name: sanitize, length-cap, case-insensitive
 * duplicate check against live people (optionally excluding one id, for
 * rename). Returns the cleaned name or an error string.
 */
const validateName = (
  rawName: string,
  existing: Person[],
  excludeId?: string
): { ok: true; name: string } | { ok: false; error: string } => {
  const name = sanitizeTextInput(rawName).trim();
  if (!name) return { ok: false, error: "Enter a name." };
  if (name.length > MAX_PERSON_NAME_LENGTH) {
    return {
      ok: false,
      error: `Keep it under ${MAX_PERSON_NAME_LENGTH} characters.`,
    };
  }
  const lower = name.toLowerCase();
  const clash = existing.some(
    (p) => !p.deletedAt && p.id !== excludeId && p.name.toLowerCase() === lower
  );
  if (clash) {
    return { ok: false, error: `"${name}" already exists.` };
  }
  return { ok: true, name };
};

export const addPerson = async (
  rawName: string
): Promise<PersonMutationResult> => {
  const all = await readStore();
  const live = filterLive(all);
  if (live.length >= MAX_PEOPLE) {
    return {
      ok: false,
      error: `You can have up to ${MAX_PEOPLE} people.`,
    };
  }
  const checked = validateName(rawName, all);
  if (!checked.ok) return checked;

  const now = new Date().toISOString();
  const next: Person[] = [
    ...all,
    {
      id: generateUUID(),
      name: checked.name,
      createdAt: now,
      updatedAt: now,
    },
  ];
  await writeStore(next);
  return { ok: true, people: filterLive(next) };
};

export const updatePerson = async (
  id: string,
  patch: { name?: string }
): Promise<PersonMutationResult> => {
  const all = await readStore();
  const target = all.find((p) => p.id === id && !p.deletedAt);
  if (!target) return { ok: false, error: "Person not found." };

  let name = target.name;
  if (patch.name !== undefined) {
    const checked = validateName(patch.name, all, id);
    if (!checked.ok) return checked;
    name = checked.name;
  }

  const next = all.map((p) =>
    p.id === id ? { ...p, name, updatedAt: new Date().toISOString() } : p
  );
  await writeStore(next);
  return { ok: true, people: filterLive(next) };
};

/** Soft-delete (tombstone) so the delete propagates via sync and is undoable. */
export const deletePerson = async (id: string): Promise<Person[]> => {
  const all = await readStore();
  const now = new Date().toISOString();
  const next = all.map((p) => (p.id === id ? tombstone(p, now) : p));
  await writeStore(next);
  return filterLive(next);
};

/** Undo a soft-delete. No-op if the id isn't a tombstone. */
export const restorePerson = async (id: string): Promise<Person[]> => {
  const all = await readStore();
  const now = new Date().toISOString();
  const next = all.map((p) =>
    p.id === id && p.deletedAt ? untombstone(p, now) : p
  );
  await writeStore(next);
  return filterLive(next);
};

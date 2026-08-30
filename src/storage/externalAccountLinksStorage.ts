/**
 * BudgetArk - External Account Links Storage
 * File: src/storage/externalAccountLinksStorage.ts
 *
 * Maps provider-side accounts (SimpleFIN/Teller) to local
 * AssetAccounts and carries the per-account import/balance toggles.
 * PER-DEVICE like the parent connection - never synced, never exported.
 * No tombstones (hard-delete is correct for unsynced data).
 */

import * as EncryptedStorage from "./encryptedStorage";
import type { ExternalAccountLink } from "../types";
import { mutateCollectionInPlace } from "./collectionRepair";

const STORAGE_KEY = "@budgetark_external_account_links" as const;

export const getLinks = async (): Promise<ExternalAccountLink[]> => {
  const raw = await EncryptedStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ExternalAccountLink[]) : [];
  } catch {
    return [];
  }
};

const writeLinks = async (links: ExternalAccountLink[]): Promise<void> => {
  await EncryptedStorage.setItem(STORAGE_KEY, JSON.stringify(links));
};

/**
 * Referential cleanup when people are deleted: a link's "whose card is
 * this" is the ingest planner's person fallback, so a dangling id would
 * keep suggesting "(deleted person)" on every import from that account.
 * Atomic; no write when nothing references the ids.
 */
export const clearPersonFromLinks = async (
  personIds: Iterable<string>
): Promise<void> => {
  const ids = new Set(personIds);
  if (ids.size === 0) return;
  await mutateCollectionInPlace<ExternalAccountLink>(STORAGE_KEY, (stored) => {
    const now = new Date().toISOString();
    let changed = false;
    const next = stored.map((link) => {
      if (link.personId == null || !ids.has(link.personId)) return link;
      changed = true;
      const { personId: _dropped, ...rest } = link;
      return { ...rest, updatedAt: now };
    });
    return changed ? next : stored;
  });
};

export const getLinksForConnection = async (
  connectionId: string,
): Promise<ExternalAccountLink[]> => {
  const links = await getLinks();
  return links.filter((link) => link.connectionId === connectionId);
};

/**
 * Insert or replace by (connectionId, externalAccountId) so re-running the
 * account-mapping step of the wizard updates in place instead of duplicating.
 */
export const upsertLink = async (
  link: ExternalAccountLink,
): Promise<ExternalAccountLink[]> => {
  const links = await getLinks();
  const index = links.findIndex(
    (l) =>
      l.connectionId === link.connectionId &&
      l.externalAccountId === link.externalAccountId,
  );
  const updated =
    index >= 0
      ? links.map((l, i) =>
          i === index
            ? { ...link, id: l.id, createdAt: l.createdAt, updatedAt: new Date().toISOString() }
            : l,
        )
      : [...links, link];
  await writeLinks(updated);
  return updated;
};

export const updateLink = async (
  linkId: string,
  updates: Partial<ExternalAccountLink>,
): Promise<ExternalAccountLink[]> => {
  const links = await getLinks();
  const updated = links.map((link) =>
    link.id === linkId
      ? { ...link, ...updates, updatedAt: new Date().toISOString() }
      : link,
  );
  await writeLinks(updated);
  return updated;
};

export const deleteLinksForConnection = async (
  connectionId: string,
): Promise<void> => {
  const links = await getLinks();
  const remaining = links.filter((link) => link.connectionId !== connectionId);
  if (remaining.length === links.length) return;
  await writeLinks(remaining);
};

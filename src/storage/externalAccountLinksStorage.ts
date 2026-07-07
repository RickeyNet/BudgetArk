/**
 * BudgetArk - External Account Links Storage
 * File: src/storage/externalAccountLinksStorage.ts
 *
 * Maps provider-side accounts (SimpleFIN/Schwab/Teller) to local
 * AssetAccounts and carries the per-account import/balance toggles.
 * PER-DEVICE like the parent connection - never synced, never exported.
 * No tombstones (hard-delete is correct for unsynced data).
 */

import * as EncryptedStorage from "./encryptedStorage";
import type { ExternalAccountLink } from "../types";

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

/**
 * BudgetArk - Connections Settings Storage
 * File: src/storage/connectionsSettingsStorage.ts
 *
 * Per-device consent state for the Bank Connections feature. NOT synced.
 * Mirrors holdingsSettingsStorage.ts: the off-device disclosure is shown once
 * before the first connection is added, and stays acknowledged so managing
 * connections later doesn't re-prompt.
 */

import * as EncryptedStorage from "./encryptedStorage";
import type { ConnectionsSettings } from "../types";

const STORAGE_KEY = "@budgetark_connections_settings" as const;

const DEFAULT_SETTINGS: ConnectionsSettings = {
  disclosureAcknowledged: false,
};

export const getConnectionsSettings = async (): Promise<ConnectionsSettings> => {
  const raw = await EncryptedStorage.getItem(STORAGE_KEY);
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    const parsed = JSON.parse(raw) as Partial<ConnectionsSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
};

export const acknowledgeConnectionsDisclosure = async (): Promise<ConnectionsSettings> => {
  const updated: ConnectionsSettings = { disclosureAcknowledged: true };
  await EncryptedStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
};

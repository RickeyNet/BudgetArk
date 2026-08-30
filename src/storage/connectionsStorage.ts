/**
 * BudgetArk - Bank Connections Storage
 * File: src/storage/connectionsStorage.ts
 *
 * Non-secret metadata for the user's bank connections (BYO API). PER-DEVICE:
 * never synced (connection ids are meaningless on a partner device and the
 * feature is credential-adjacent), never exported. Secrets live separately in
 * connectionSecretsStorage.ts so nothing in this module ever touches
 * credential material.
 *
 * No tombstones - per-device data never syncs, so hard-delete is correct.
 */

import * as EncryptedStorage from "./encryptedStorage";
import type { BankConnection } from "../types";
import { deleteConnectionSecrets } from "./connectionSecretsStorage";
import { deleteLinksForConnection } from "./externalAccountLinksStorage";
import { purgePendingForConnection } from "./reviewInboxStorage";

const STORAGE_KEY = "@budgetark_bank_connections" as const;

export const getConnections = async (): Promise<BankConnection[]> => {
  const raw = await EncryptedStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as BankConnection[]) : [];
  } catch {
    return [];
  }
};

const writeConnections = async (
  connections: BankConnection[],
): Promise<void> => {
  await EncryptedStorage.setItem(STORAGE_KEY, JSON.stringify(connections));
};

export const getConnection = async (
  connectionId: string,
): Promise<BankConnection | undefined> => {
  const connections = await getConnections();
  return connections.find((c) => c.id === connectionId);
};

export const addConnection = async (
  connection: BankConnection,
): Promise<BankConnection[]> => {
  const connections = await getConnections();
  const updated = [...connections, connection];
  await writeConnections(updated);
  return updated;
};

export const updateConnection = async (
  connectionId: string,
  updates: Partial<BankConnection>,
): Promise<BankConnection[]> => {
  const connections = await getConnections();
  const updated = connections.map((connection) =>
    connection.id === connectionId
      ? { ...connection, ...updates, updatedAt: new Date().toISOString() }
      : connection,
  );
  await writeConnections(updated);
  return updated;
};

/**
 * Removes a connection and cascades to its credential-adjacent satellites:
 * secrets, account links, and unreviewed inbox items. The ingest LEDGER is
 * deliberately KEPT - reconnecting the same institution later must not
 * re-offer transactions the user already approved or dismissed. Approved
 * BudgetEntries also stay, of course - they're the user's data.
 */
export const deleteConnection = async (
  connectionId: string,
): Promise<BankConnection[]> => {
  const connections = await getConnections();
  const updated = connections.filter((c) => c.id !== connectionId);
  await writeConnections(updated);
  await deleteConnectionSecrets(connectionId);
  await deleteLinksForConnection(connectionId);
  await purgePendingForConnection(connectionId);
  return updated;
};

/**
 * BudgetArk - Pairing Storage
 * File: src/sync/pairingStorage.ts
 *
 * Persists pairing state and sync metadata to encrypted storage.
 */

import * as EncryptedStorage from "../storage/encryptedStorage";
import type { PairingState, SyncMetadata } from "./types";

const STORAGE_KEYS = {
  PAIRING: "@budgetark_pairing",
  SYNC_META: "@budgetark_sync_meta",
} as const;

/* ─── Pairing State ─── */

export const getPairingState = async (): Promise<PairingState | null> => {
  const raw = await EncryptedStorage.getItem(STORAGE_KEYS.PAIRING);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PairingState;
  } catch {
    return null;
  }
};

export const savePairingState = async (state: PairingState): Promise<void> => {
  await EncryptedStorage.setItem(STORAGE_KEYS.PAIRING, JSON.stringify(state));
};

export const clearPairingState = async (): Promise<void> => {
  await EncryptedStorage.multiRemove([
    STORAGE_KEYS.PAIRING,
    STORAGE_KEYS.SYNC_META,
  ]);
};

export const updateHomeSSID = async (ssid: string | undefined): Promise<void> => {
  const state = await getPairingState();
  if (!state) return;
  await savePairingState({ ...state, homeSSID: ssid });
};

export const setAutoSyncEnabled = async (enabled: boolean): Promise<void> => {
  const state = await getPairingState();
  if (!state) return;
  await savePairingState({ ...state, autoSyncEnabled: enabled });
};

/* ─── Sync Metadata ─── */

export const getSyncMetadata = async (): Promise<SyncMetadata> => {
  const raw = await EncryptedStorage.getItem(STORAGE_KEYS.SYNC_META);
  if (!raw) return { lastSyncTimestamp: null, syncCount: 0 };
  try {
    return JSON.parse(raw) as SyncMetadata;
  } catch {
    return { lastSyncTimestamp: null, syncCount: 0 };
  }
};

export const updateSyncMetadata = async (
  timestamp: string
): Promise<void> => {
  const meta = await getSyncMetadata();
  await EncryptedStorage.setItem(
    STORAGE_KEYS.SYNC_META,
    JSON.stringify({
      lastSyncTimestamp: timestamp,
      syncCount: meta.syncCount + 1,
    })
  );
};

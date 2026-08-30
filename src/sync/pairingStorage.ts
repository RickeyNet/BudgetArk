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
  // requireEncryption: `sharedSecret` is the AES + HMAC key for every sync
  // frame. Without this flag encryptedStorage falls back to plaintext
  // AsyncStorage when the keystore is unavailable, which would leave the
  // sync key readable on disk. Throwing EncryptionUnavailableError instead
  // surfaces in PairingModal (commit) and the Profile toggles.
  await EncryptedStorage.setItem(STORAGE_KEYS.PAIRING, JSON.stringify(state), {
    requireEncryption: true,
  });
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
  const next: SyncMetadata = {
    lastSyncTimestamp: timestamp,
    syncCount: meta.syncCount + 1,
    lastSyncCompletedAt: timestamp,
  };
  await EncryptedStorage.setItem(STORAGE_KEYS.SYNC_META, JSON.stringify(next));
};

/**
 * Forces the next sync to send everything, keeping the sync count and the
 * display timestamp. Called after an import/restore: merged records keep
 * their original `updatedAt` (correct for last-write-wins), so with the
 * old watermark in place `computeOutgoingDiff` would filter every restored
 * record older than the last sync out of every future diff - the partner
 * would simply never hear about them. A full re-send is idempotent under
 * LWW, so the only cost is one larger payload. No-op when there is no
 * watermark to reset (never paired / never synced).
 *
 * Limitation (documented, not solved here): this only pushes OUR records
 * to the partner. If a replace-mode restore dropped records the partner
 * had already sent us, the partner's own watermark still hides them, so
 * they come back only when the partner next edits them.
 */
export const resetSyncWatermark = async (): Promise<void> => {
  const meta = await getSyncMetadata();
  if (meta.lastSyncTimestamp === null) return;
  const next: SyncMetadata = {
    lastSyncTimestamp: null,
    syncCount: meta.syncCount,
    lastSyncCompletedAt: meta.lastSyncCompletedAt ?? meta.lastSyncTimestamp,
  };
  await EncryptedStorage.setItem(STORAGE_KEYS.SYNC_META, JSON.stringify(next));
};

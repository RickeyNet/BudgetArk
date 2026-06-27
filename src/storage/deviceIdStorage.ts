/**
 * BudgetArk - Device Id Storage
 * File: src/storage/deviceIdStorage.ts
 *
 * A stable, random per-install id sent to the quote-proxy Worker as the
 * `x-device` header so the Worker can enforce its 1-request-per-week throttle.
 *
 * Privacy: this id is not tied to any account or portfolio. The Worker only
 * ever stores a SHA-256 HASH of it (keyed `throttle:<hash>`), so the raw value
 * never lands server-side. It's generated once and persisted locally.
 */

import * as EncryptedStorage from "./encryptedStorage";
import { generateUUID } from "../utils/uuid";

const STORAGE_KEY = "@budgetark_device_id";

/**
 * Returns the persistent device id, generating and storing one on first call.
 * Concurrent first-calls could each generate an id, but the per-key write
 * queue in encryptedStorage serializes the writes and a later `getDeviceId`
 * settles on whichever landed last - harmless, since any stable value works.
 */
export const getDeviceId = async (): Promise<string> => {
  const existing = await EncryptedStorage.getItem(STORAGE_KEY);
  if (existing) return existing;
  const id = generateUUID();
  await EncryptedStorage.setItem(STORAGE_KEY, id);
  return id;
};

/**
 * BudgetArk - Connection Secrets Storage
 * File: src/storage/connectionSecretsStorage.ts
 *
 * Credential material for bank connections (BYO API): SimpleFIN access URLs,
 * Teller certificates and access tokens.
 *
 * Stored in EncryptedStorage (AES-256 + HMAC, master key in the OS
 * Keychain/Keystore) rather than raw SecureStore because Teller PEM blobs
 * routinely exceed SecureStore's ~2 KB Android soft limit, and
 * EncryptedStorage gives the same at-rest guarantee through one code path
 * with per-key write serialization.
 *
 * THIS KEY MUST NEVER LEAVE THE DEVICE: it must not appear in
 * utils/exportData.ts, in utils/importData.ts KEYS, or anywhere in
 * sync/types.ts SyncDiff. A regression test in
 * utils/__tests__/exportData.test.ts asserts the export payload carries no
 * connection-prefixed keys.
 */

import * as EncryptedStorage from "./encryptedStorage";
import type { BankProvider } from "../types";

const STORAGE_KEY = "@budgetark_connection_secrets" as const;

export interface SimplefinSecrets {
  provider: "simplefin";
  /** The claimed access URL, credentials embedded: https://user:pass@host/... */
  accessUrl: string;
}

export interface TellerSecrets {
  provider: "teller";
  /** The user's Teller application id (from their teller.io dashboard). */
  applicationId: string;
  /**
   * Teller Connect environment this connection was set up in. Persisted so
   * "add another bank" can re-open Teller Connect with the right environment.
   * Optional for connections created before this field existed - treat a
   * missing value as "development" (the free real-bank tier).
   */
  environment?: "sandbox" | "development" | "production";
  /** PEM contents of the user's client certificate (from teller.zip). */
  certificatePem: string;
  /** PEM contents of the matching private key (from teller.zip). */
  privateKeyPem: string;
  /** Access tokens by Teller enrollment id. */
  accessTokens: Record<string, string>;
}

export type ConnectionSecrets = SimplefinSecrets | TellerSecrets;

type SecretsMap = Record<string, ConnectionSecrets>;

const readMap = async (): Promise<SecretsMap> => {
  const raw = await EncryptedStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as SecretsMap)
      : {};
  } catch {
    return {};
  }
};

const writeMap = async (map: SecretsMap): Promise<void> => {
  // requireEncryption: bank credentials must never be written in plaintext.
  // If the secure keystore is unavailable this throws EncryptionUnavailableError
  // rather than degrading - connect flows preflight isEncryptionAvailable() and
  // surface a message, so the user sees the failure instead of a silent leak.
  await EncryptedStorage.setItem(STORAGE_KEY, JSON.stringify(map), {
    requireEncryption: true,
  });
};

export const getConnectionSecrets = async (
  connectionId: string,
): Promise<ConnectionSecrets | undefined> => {
  const map = await readMap();
  return map[connectionId];
};

export const setConnectionSecrets = async (
  connectionId: string,
  secrets: ConnectionSecrets,
): Promise<void> => {
  const map = await readMap();
  map[connectionId] = secrets;
  await writeMap(map);
};

export const deleteConnectionSecrets = async (
  connectionId: string,
): Promise<void> => {
  const map = await readMap();
  if (!(connectionId in map)) return;
  delete map[connectionId];
  await writeMap(map);
};

/** Store/replace the access token for one Teller enrollment. */
export const setTellerAccessToken = async (
  connectionId: string,
  enrollmentId: string,
  accessToken: string,
): Promise<void> => {
  const map = await readMap();
  const existing = map[connectionId];
  if (!existing || existing.provider !== "teller") return;
  map[connectionId] = {
    ...existing,
    accessTokens: { ...existing.accessTokens, [enrollmentId]: accessToken },
  };
  await writeMap(map);
};

/** True when secrets exist for this connection and match the given provider. */
export const hasSecretsForProvider = async (
  connectionId: string,
  provider: BankProvider,
): Promise<boolean> => {
  const secrets = await getConnectionSecrets(connectionId);
  return secrets?.provider === provider;
};

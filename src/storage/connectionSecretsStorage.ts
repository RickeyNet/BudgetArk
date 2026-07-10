/**
 * BudgetArk - Connection Secrets Storage
 * File: src/storage/connectionSecretsStorage.ts
 *
 * Credential material for bank connections (BYO API): SimpleFIN access URLs,
 * Schwab app keys/secrets/tokens, Teller certificates and access tokens.
 *
 * Stored in EncryptedStorage (AES-256 + HMAC, master key in the OS
 * Keychain/Keystore) rather than raw SecureStore because Schwab/Teller blobs
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

export interface SchwabSecrets {
  provider: "schwab";
  /** The user's own developer-app key (client id). */
  appKey: string;
  appSecret: string;
  /** Redirect URI registered on the user's Schwab app, e.g. https://127.0.0.1 */
  redirectUri: string;
  accessToken?: string;
  /** ISO expiry for accessToken (~30 min horizon, minus skew). */
  accessTokenExpiresAt?: string;
  refreshToken?: string;
  /** ISO issue time of refreshToken - drives the 7-day death detection. */
  refreshTokenIssuedAt?: string;
}

export interface TellerSecrets {
  provider: "teller";
  /** The user's Teller application id (from their teller.io dashboard). */
  applicationId: string;
  /** PEM contents of the user's client certificate (from teller.zip). */
  certificatePem: string;
  /** PEM contents of the matching private key (from teller.zip). */
  privateKeyPem: string;
  /** Access tokens by Teller enrollment id. */
  accessTokens: Record<string, string>;
}

export type ConnectionSecrets = SimplefinSecrets | SchwabSecrets | TellerSecrets;

/** Fields a Schwab token exchange/refresh writes back. */
export interface SchwabTokenPatch {
  accessToken?: string;
  accessTokenExpiresAt?: string;
  refreshToken?: string;
  refreshTokenIssuedAt?: string;
}

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

/**
 * Merge refreshed Schwab tokens into the stored secrets. No-op if the
 * connection is missing or isn't a Schwab connection (e.g. it was removed
 * while a sync was in flight).
 */
export const patchSchwabTokens = async (
  connectionId: string,
  patch: SchwabTokenPatch,
): Promise<void> => {
  const map = await readMap();
  const existing = map[connectionId];
  if (!existing || existing.provider !== "schwab") return;
  map[connectionId] = { ...existing, ...patch };
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

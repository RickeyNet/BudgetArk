/**
 * BudgetArk - Bank Connections: Setup Service
 * File: src/services/connections/connectionsService.ts
 *
 * The Add Connection wizard's API: create/claim credentials, discover the
 * provider's accounts BEFORE the user maps them, finalize account links, and
 * remove connections. Never throws - every step returns a typed result with
 * a user-ready message on failure.
 */

import type { BankConnection, BankProvider, ExternalAccountLink } from "../../types";
import { BANK_PROVIDER_LABELS } from "../../types";
import { addConnection, deleteConnection, updateConnection } from "../../storage/connectionsStorage";
import { isEncryptionAvailable } from "../../storage/encryptedStorage";
import {
  getConnectionSecrets,
  setConnectionSecrets,
  setTellerAccessToken,
} from "../../storage/connectionSecretsStorage";
import { upsertLink } from "../../storage/externalAccountLinksStorage";
import { generateUUID } from "../../utils/uuid";
import { claimAccessUrl, fetchSimplefinAccounts } from "./simplefinClient";
import { decodeSetupToken } from "./simplefinParser";
import { fetchTellerData } from "./tellerClient";
import { INITIAL_BACKFILL_DAYS } from "./syncGate";
import type { NormalizedAccount } from "./types";

export type SetupResult =
  | { ok: true; connectionId: string; accounts: NormalizedAccount[] }
  | { ok: false; message: string };

/**
 * Guard every connect flow: bank credentials must never be persisted in
 * plaintext, so if the OS secure keystore is unavailable we refuse to create
 * the connection and return a user-ready message. Returns null when it's safe
 * to proceed. Keeps this module's "never throws" contract intact - the storage
 * layer throws EncryptionUnavailableError as a hard backstop, but callers here
 * bail before reaching it.
 */
const encryptionUnavailableResult = async (): Promise<{
  ok: false;
  message: string;
} | null> => {
  if (await isEncryptionAvailable()) return null;
  return {
    ok: false,
    message:
      "This device can't securely store bank credentials (secure keystore unavailable), so the connection wasn't saved. This can affect rooted or sideloaded installs.",
  };
};

const newConnection = (provider: BankProvider): BankConnection => {
  const now = new Date().toISOString();
  return {
    id: generateUUID(),
    provider,
    name: BANK_PROVIDER_LABELS[provider],
    enabled: true,
    createdAt: now,
    updatedAt: now,
    authStatus: "ok",
  };
};

const discoveryWindow = (): { startDate: Date; endDate: Date } => {
  const now = Date.now();
  return {
    startDate: new Date(now - INITIAL_BACKFILL_DAYS * 24 * 3600_000),
    endDate: new Date(now),
  };
};

/**
 * SimpleFIN: decode + claim the pasted setup token, then list accounts.
 * The connection is persisted only after the claim and first fetch succeed.
 */
export const createSimplefinConnection = async (
  setupToken: string,
): Promise<SetupResult> => {
  const blocked = await encryptionUnavailableResult();
  if (blocked) return blocked;

  const decoded = decodeSetupToken(setupToken);
  if (!decoded.ok) return { ok: false, message: decoded.message };

  const claimed = await claimAccessUrl(decoded.claimUrl);
  if (!claimed.ok) return { ok: false, message: claimed.message };

  const window = discoveryWindow();
  const fetched = await fetchSimplefinAccounts(claimed.accessUrl, {
    startDateEpochSec: window.startDate.getTime() / 1000,
  });
  if (!fetched.ok) {
    return {
      ok: false,
      message: fetched.message ?? "SimpleFIN connected but listing accounts failed.",
    };
  }

  const connection = newConnection("simplefin");
  await addConnection(connection);
  await setConnectionSecrets(connection.id, {
    provider: "simplefin",
    accessUrl: claimed.accessUrl,
  });
  return { ok: true, connectionId: connection.id, accounts: fetched.accounts };
};

/* ── Teller ── */

/**
 * Persist a Teller connection from the user's own developer credentials
 * (application id + certificate/key PEMs from their teller.zip). Bank
 * enrollment happens next via Teller Connect (WebView); until at least one
 * enrollment token is added the connection can't fetch.
 */
export const createTellerConnection = async (opts: {
  applicationId: string;
  certificatePem: string;
  privateKeyPem: string;
}): Promise<{ ok: true; connectionId: string } | { ok: false; message: string }> => {
  const blocked = await encryptionUnavailableResult();
  if (blocked) return blocked;

  const applicationId = opts.applicationId.trim();
  if (!applicationId) {
    return { ok: false, message: "Enter your Teller application id first." };
  }
  if (
    !opts.certificatePem.includes("-----BEGIN CERTIFICATE-----") ||
    !opts.privateKeyPem.includes("-----BEGIN")
  ) {
    return {
      ok: false,
      message:
        "Those files don't look like the certificate.pem and private_key.pem from your teller.zip.",
    };
  }
  const connection = newConnection("teller");
  await addConnection(connection);
  await setConnectionSecrets(connection.id, {
    provider: "teller",
    applicationId,
    certificatePem: opts.certificatePem,
    privateKeyPem: opts.privateKeyPem,
    accessTokens: {},
  });
  return { ok: true, connectionId: connection.id };
};

/**
 * Store the access token from a successful Teller Connect enrollment, then
 * list the enrollment's accounts for the wizard's mapping step.
 */
export const addTellerEnrollment = async (
  connectionId: string,
  enrollmentId: string,
  accessToken: string,
): Promise<SetupResult> => {
  const blocked = await encryptionUnavailableResult();
  if (blocked) return blocked;

  await setTellerAccessToken(connectionId, enrollmentId, accessToken);
  const secrets = await getConnectionSecrets(connectionId);
  if (secrets?.provider !== "teller") {
    return {
      ok: false,
      message: "This connection's stored credentials are missing. Remove and re-add it.",
    };
  }
  const fetched = await fetchTellerData(secrets, {
    startDate: discoveryWindow().startDate,
  });
  if (!fetched.ok) {
    return {
      ok: false,
      message: fetched.message ?? "Teller connected but listing accounts failed.",
    };
  }
  return { ok: true, connectionId, accounts: fetched.accounts };
};

export interface AccountSelection {
  account: NormalizedAccount;
  /** Map balances into this AssetAccount; null = don't track the balance. */
  assetAccountId: string | null;
  importTransactions: boolean;
}

/** Persist the wizard's account-mapping step as ExternalAccountLinks. */
export const finalizeAccountLinks = async (
  connectionId: string,
  selections: AccountSelection[],
): Promise<void> => {
  const now = new Date().toISOString();
  for (const selection of selections) {
    const link: ExternalAccountLink = {
      id: generateUUID(),
      connectionId,
      externalAccountId: selection.account.externalAccountId,
      externalName: selection.account.name,
      currency: selection.account.currency,
      assetAccountId: selection.assetAccountId,
      importTransactions: selection.importTransactions,
      updateBalance: selection.assetAccountId !== null,
      lastExternalBalance: selection.account.balance,
      lastExternalBalanceAt: selection.account.balanceAsOf ?? now,
      createdAt: now,
      updatedAt: now,
    };
    await upsertLink(link);
  }
};

/** Remove a connection (cascades to secrets/links/inbox; ledger stays). */
export const removeConnection = async (connectionId: string): Promise<void> => {
  await deleteConnection(connectionId);
};

/** Rename a connection from the manage screen. */
export const renameConnection = async (
  connectionId: string,
  name: string,
): Promise<void> => {
  const trimmed = name.trim().slice(0, 60);
  if (!trimmed) return;
  await updateConnection(connectionId, { name: trimmed });
};

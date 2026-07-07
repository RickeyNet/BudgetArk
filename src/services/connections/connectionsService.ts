/**
 * BudgetArk - Bank Connections: Setup Service
 * File: src/services/connections/connectionsService.ts
 *
 * The Add Connection wizard's API: create/claim credentials, discover the
 * provider's accounts BEFORE the user maps them, finalize account links, and
 * remove connections. Never throws - every step returns a typed result with
 * a user-ready message on failure.
 *
 * Schwab's browser OAuth spans two calls: beginSchwabAuth stashes the
 * pending app credentials in module memory and returns the authorize URL;
 * completeSchwabAuth exchanges the pasted redirect for tokens. Nothing is
 * persisted until the exchange succeeds.
 */

import type { BankConnection, BankProvider, ExternalAccountLink } from "../../types";
import { BANK_PROVIDER_LABELS } from "../../types";
import { addConnection, deleteConnection, updateConnection } from "../../storage/connectionsStorage";
import {
  getConnectionSecrets,
  setConnectionSecrets,
  setTellerAccessToken,
} from "../../storage/connectionSecretsStorage";
import { upsertLink } from "../../storage/externalAccountLinksStorage";
import { generateUUID } from "../../utils/uuid";
import { claimAccessUrl, fetchSimplefinAccounts } from "./simplefinClient";
import { decodeSetupToken } from "./simplefinParser";
import { buildAuthorizeUrl, extractAuthCode } from "./schwabParser";
import { exchangeAuthCode, fetchSchwabData } from "./schwabClient";
import { fetchTellerData } from "./tellerClient";
import { INITIAL_BACKFILL_DAYS } from "./syncGate";
import type { NormalizedAccount } from "./types";

export type SetupResult =
  | { ok: true; connectionId: string; accounts: NormalizedAccount[] }
  | { ok: false; message: string };

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

interface PendingSchwabAuth {
  appKey: string;
  appSecret: string;
  redirectUri: string;
  /** Set when re-authing an existing connection instead of creating one. */
  reauthConnectionId?: string;
}

let pendingSchwabAuth: PendingSchwabAuth | null = null;

/**
 * Stash the user's Schwab app credentials and return the authorize URL to
 * open in the system browser. For re-auth, pass the existing connection id -
 * stored credentials are reused when key/secret are blank.
 */
export const beginSchwabAuth = async (opts: {
  appKey: string;
  appSecret: string;
  redirectUri?: string;
  reauthConnectionId?: string;
}): Promise<{ ok: true; authUrl: string } | { ok: false; message: string }> => {
  let { appKey, appSecret } = opts;
  let redirectUri = opts.redirectUri?.trim() || "https://127.0.0.1";

  if (opts.reauthConnectionId && (!appKey.trim() || !appSecret.trim())) {
    const stored = await getConnectionSecrets(opts.reauthConnectionId);
    if (stored?.provider !== "schwab") {
      return {
        ok: false,
        message: "This connection's stored credentials are missing. Remove and re-add it.",
      };
    }
    appKey = stored.appKey;
    appSecret = stored.appSecret;
    redirectUri = stored.redirectUri;
  }

  if (!appKey.trim() || !appSecret.trim()) {
    return { ok: false, message: "Enter your Schwab app key and secret first." };
  }

  pendingSchwabAuth = {
    appKey: appKey.trim(),
    appSecret: appSecret.trim(),
    redirectUri,
    reauthConnectionId: opts.reauthConnectionId,
  };
  return { ok: true, authUrl: buildAuthorizeUrl(appKey, redirectUri) };
};

/**
 * Finish the Schwab OAuth round-trip from the pasted redirect URL. Creates
 * the connection (or refreshes the re-authed one) and lists its accounts.
 */
export const completeSchwabAuth = async (
  pastedRedirectUrl: string,
): Promise<SetupResult> => {
  const pending = pendingSchwabAuth;
  if (!pending) {
    return {
      ok: false,
      message: "The Schwab login session expired. Start again from the app key step.",
    };
  }
  const code = extractAuthCode(pastedRedirectUrl);
  if (!code) {
    return {
      ok: false,
      message:
        "No login code found in that address. Copy the FULL address from the browser after approving access (it starts with your callback URL and contains code=...).",
    };
  }

  const exchanged = await exchangeAuthCode(
    pending.appKey,
    pending.appSecret,
    code,
    pending.redirectUri,
  );
  if (!exchanged.ok) return { ok: false, message: exchanged.message };

  const window = discoveryWindow();
  const fetched = await fetchSchwabData(
    {
      appKey: pending.appKey,
      appSecret: pending.appSecret,
      ...exchanged.patch,
    },
    window,
  );
  if (!fetched.ok) {
    return {
      ok: false,
      message: fetched.message ?? "Schwab connected but listing accounts failed.",
    };
  }

  let connectionId: string;
  if (pending.reauthConnectionId) {
    connectionId = pending.reauthConnectionId;
    await updateConnection(connectionId, {
      authStatus: "ok",
      lastErrorCode: undefined,
      lastErrorMessage: undefined,
    });
  } else {
    const connection = newConnection("schwab");
    connectionId = connection.id;
    await addConnection(connection);
  }
  await setConnectionSecrets(connectionId, {
    provider: "schwab",
    appKey: pending.appKey,
    appSecret: pending.appSecret,
    redirectUri: pending.redirectUri,
    ...exchanged.patch,
  });
  pendingSchwabAuth = null;
  return { ok: true, connectionId, accounts: fetched.accounts };
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

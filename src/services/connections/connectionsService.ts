/**
 * BudgetArk - Bank Connections: Setup Service
 * File: src/services/connections/connectionsService.ts
 *
 * The Add Connection wizard's API: create/claim credentials, discover the
 * provider's accounts BEFORE the user maps them, finalize account links, and
 * remove connections. Never throws - every step returns a typed result with
 * a user-ready message on failure.
 */

import type {
  AssetAccountCategory,
  BankConnection,
  BankProvider,
  ExternalAccountLink,
} from "../../types";
import { BANK_PROVIDER_LABELS } from "../../types";
import { addConnection, deleteConnection, updateConnection } from "../../storage/connectionsStorage";
import { isEncryptionAvailable } from "../../storage/encryptedStorage";
import {
  getConnectionSecrets,
  setConnectionSecrets,
  setTellerAccessToken,
} from "../../storage/connectionSecretsStorage";
import { getLinks, updateLink, upsertLink } from "../../storage/externalAccountLinksStorage";
import { getAssetAccounts, updateAssetAccount } from "../../storage/assetAccountStorage";
import { type LinkPreferenceChange, planLinkPreferenceChange } from "./linkPreferences";
import { generateUUID } from "../../utils/uuid";
import { claimAccessUrl, fetchSimplefinAccounts } from "./simplefinClient";
import { decodeSetupToken } from "./simplefinParser";
import { fetchTellerData } from "./tellerClient";
import { INITIAL_BACKFILL_DAYS } from "./syncGate";
import type { NormalizedAccount } from "./types";

export type SetupResult =
  | { ok: true; connectionId: string; accounts: NormalizedAccount[] }
  | {
      ok: false;
      message: string;
      /**
       * Set when the failure happened AFTER the provider consumed the user's
       * single-use credential: the connection and its secrets were saved, so
       * setup can resume later without a fresh token.
       */
      savedConnectionId?: string;
    };

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
 * The claim consumes the single-use token, so the connection + access URL are
 * persisted as soon as the claim succeeds - a failed first fetch (e.g.
 * Bridge's 402 when billing lapses) must not throw the claimed credential
 * away. On such a failure the saved connection id is returned so the wizard
 * can resume account mapping later without a fresh token.
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

  const connection = newConnection("simplefin");
  await addConnection(connection);
  await setConnectionSecrets(connection.id, {
    provider: "simplefin",
    accessUrl: claimed.accessUrl,
  });

  const window = discoveryWindow();
  const fetched = await fetchSimplefinAccounts(claimed.accessUrl, {
    startDateEpochSec: window.startDate.getTime() / 1000,
  });
  if (!fetched.ok) {
    const message =
      fetched.message ?? "SimpleFIN connected but listing accounts failed.";
    await updateConnection(connection.id, {
      authStatus: "error",
      lastErrorCode: fetched.error,
      lastErrorMessage: message,
    });
    return { ok: false, message, savedConnectionId: connection.id };
  }

  return { ok: true, connectionId: connection.id, accounts: fetched.accounts };
};

/**
 * Re-list accounts for a saved SimpleFIN connection whose setup didn't finish
 * (the first fetch after claiming failed). Uses the stored access URL, so no
 * new setup token is needed.
 */
export const discoverSimplefinAccounts = async (
  connectionId: string,
): Promise<SetupResult> => {
  const secrets = await getConnectionSecrets(connectionId);
  if (secrets?.provider !== "simplefin") {
    return {
      ok: false,
      message: "This connection's stored credentials are missing. Remove and re-add it.",
    };
  }
  const fetched = await fetchSimplefinAccounts(secrets.accessUrl, {
    startDateEpochSec: discoveryWindow().startDate.getTime() / 1000,
  });
  if (!fetched.ok) {
    const message = fetched.message ?? "Listing SimpleFIN accounts failed.";
    await updateConnection(connectionId, {
      authStatus: "error",
      lastErrorCode: fetched.error,
      lastErrorMessage: message,
    });
    return { ok: false, message, savedConnectionId: connectionId };
  }
  await updateConnection(connectionId, {
    authStatus: "ok",
    lastErrorCode: undefined,
    lastErrorMessage: undefined,
  });
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
  environment: "sandbox" | "development" | "production";
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
    environment: opts.environment,
    certificatePem: opts.certificatePem,
    privateKeyPem: opts.privateKeyPem,
    accessTokens: {},
  });
  return { ok: true, connectionId: connection.id };
};

/**
 * Info needed to re-open Teller Connect for an existing connection ("add
 * another bank"). Returns null if the connection isn't a Teller connection or
 * its credentials are missing. Environment defaults to "development" for
 * connections created before it was persisted.
 */
export const getTellerAddBankInfo = async (
  connectionId: string,
): Promise<
  | { applicationId: string; environment: "sandbox" | "development" | "production" }
  | null
> => {
  const secrets = await getConnectionSecrets(connectionId);
  if (secrets?.provider !== "teller") return null;
  return {
    applicationId: secrets.applicationId,
    environment: secrets.environment ?? "development",
  };
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

/**
 * Bridge categories a provider account's balance can land in: every one of
 * them. Investment / retirement accounts were excluded at first because the
 * Bridge values them from their tickers, but a bank-reported 401k or
 * brokerage balance is exactly what most people want to track, and the
 * Bridge already counts a stored balance on those accounts (it shows as a
 * "Cash" line under the broker - see bridgeMath.buildHoldingsCategoryData),
 * so a synced balance needs no special casing. Shared by the wizard's mapping
 * step and the Connections manager's after-the-fact editor so both offer the
 * same targets. The order is the picker order.
 */
export const MAPPABLE_ASSET_CATEGORIES: readonly AssetAccountCategory[] = [
  "checking",
  "savings",
  "retirement",
  "investment",
  "hsa",
  "other",
];

export interface AccountSelection {
  account: NormalizedAccount;
  /** Map balances into this AssetAccount; null = don't track the balance. */
  assetAccountId: string | null;
  importTransactions: boolean;
  /** "Whose card is this" - see ExternalAccountLink.personId. */
  personId?: string | null;
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
      personId: selection.personId ?? null,
      updateBalance: selection.assetAccountId !== null,
      lastExternalBalance: selection.account.balance,
      lastExternalBalanceAt: selection.account.balanceAsOf ?? now,
      createdAt: now,
      updatedAt: now,
    };
    await upsertLink(link);
  }
  // Newly mapped accounts deserve history: clearing lastSyncedAt makes the
  // next pass fetch the full INITIAL_BACKFILL_DAYS window instead of the
  // short overlap after the last sync (the ingest ledger dedupes re-fetched
  // transactions on already-linked accounts), and clearing lastAttemptAt
  // lets that pass run immediately instead of waiting out the sync cooldown.
  // No-op on a brand-new connection - both fields are still unset there.
  await updateConnection(connectionId, {
    lastSyncedAt: undefined,
    lastAttemptAt: undefined,
  });
};

/**
 * Edit an account link's import / balance-target choices after setup (the
 * wizard's mapping step is otherwise one-shot). Applies the pure plan from
 * linkPreferences: writes the link, resets the connection's sync window when
 * import just turned on, and seeds a newly chosen target with the last-known
 * provider balance so the Bridge (and anything reading it, like a linked
 * emergency fund) is right immediately instead of after the next sync.
 * Returns the connection's links after the change; unknown ids are a no-op.
 */
export const updateLinkPreferences = async (
  linkId: string,
  change: LinkPreferenceChange,
): Promise<ExternalAccountLink[]> => {
  const links = await getLinks();
  const link = links.find((l) => l.id === linkId);
  if (!link) return [];
  const plan = planLinkPreferenceChange(link, change);

  let all = links;
  if (Object.keys(plan.linkUpdates).length > 0) {
    all = await updateLink(linkId, plan.linkUpdates);
  }
  if (plan.backfill) {
    await updateConnection(link.connectionId, {
      lastSyncedAt: undefined,
      lastAttemptAt: undefined,
    });
  }
  if (plan.seedBalance) {
    const asset = (await getAssetAccounts()).find(
      (a) => a.id === plan.seedBalance?.assetAccountId,
    );
    // Same guards as the sync path: the target must exist; unchanged
    // balances skip the write (updatedAt churn would spam sync diffs).
    if (asset && asset.balance !== plan.seedBalance.balance) {
      await updateAssetAccount(asset.id, { balance: plan.seedBalance.balance });
    }
  }
  return all.filter((l) => l.connectionId === link.connectionId);
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

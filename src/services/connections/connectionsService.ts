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
import {
  addConnection,
  deleteConnection,
  getConnection,
  updateConnection,
} from "../../storage/connectionsStorage";
import { isEncryptionAvailable } from "../../storage/encryptedStorage";
import {
  getConnectionSecrets,
  setConnectionSecrets,
  setTellerAccessToken,
} from "../../storage/connectionSecretsStorage";
import { getLinks, updateLink, upsertLink } from "../../storage/externalAccountLinksStorage";
import { getAssetAccounts, updateAssetAccount } from "../../storage/assetAccountStorage";
import { getDebts, updateDebt } from "../../storage/debtStorage";
import { debtFieldsForProviderBalance } from "./debtBalances";
import {
  buildWizardLink,
  type LinkPreferenceChange,
  planLinkPreferenceChange,
} from "./linkPreferences";
import { generateUUID } from "../../utils/uuid";
import { claimAccessUrl, fetchSimplefinAccounts } from "./simplefinClient";
import { decodeSetupToken } from "./simplefinParser";
import { fetchTellerData } from "./tellerClient";
import { INITIAL_BACKFILL_DAYS } from "./syncGate";
import type { NormalizedAccount } from "./types";
import { t } from "../../i18n/translate";

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
    message: t("helpers.misc.connections.keystoreUnavailable"),
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

export type ReconnectResult = { ok: true } | { ok: false; message: string };

/**
 * SimpleFIN reconnect: claim a fresh setup token for an EXISTING connection
 * (the old access URL was revoked / expired - authStatus "needs-reauth"),
 * replacing only its stored access URL. The connection id is kept, so its
 * per-device account links (Bridge targets, card links, people) survive -
 * removing and re-adding the connection would delete them, which is the
 * whole reason this exists.
 *
 * The claim burns the single-use token, so the new URL is saved the moment
 * the claim succeeds (same reasoning as createSimplefinConnection) and the
 * connection's sync state is reset so the next pass runs immediately and
 * backfills the full initial window (the ingest ledger dedupes). A failed
 * verification fetch afterwards records the error but keeps the new URL.
 */
export const reconnectSimplefin = async (
  connectionId: string,
  setupToken: string,
): Promise<ReconnectResult> => {
  const blocked = await encryptionUnavailableResult();
  if (blocked) return blocked;

  const connection = await getConnection(connectionId);
  if (!connection || connection.provider !== "simplefin") {
    return { ok: false, message: t("helpers.misc.connections.syncFailed") };
  }

  const decoded = decodeSetupToken(setupToken);
  if (!decoded.ok) return { ok: false, message: decoded.message };

  const claimed = await claimAccessUrl(decoded.claimUrl);
  if (!claimed.ok) return { ok: false, message: claimed.message };

  await setConnectionSecrets(connectionId, {
    provider: "simplefin",
    accessUrl: claimed.accessUrl,
  });
  await updateConnection(connectionId, {
    authStatus: "ok",
    lastErrorCode: undefined,
    lastErrorMessage: undefined,
    providerWarnings: undefined,
    lastSyncedAt: undefined,
    lastAttemptAt: undefined,
  });

  const fetched = await fetchSimplefinAccounts(claimed.accessUrl, {
    startDateEpochSec: discoveryWindow().startDate.getTime() / 1000,
  });
  if (!fetched.ok) {
    const message =
      fetched.message ?? "SimpleFIN reconnected but listing accounts failed.";
    await updateConnection(connectionId, {
      authStatus: "error",
      lastErrorCode: fetched.error,
      lastErrorMessage: message,
    });
    return { ok: false, message };
  }
  return { ok: true };
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
      message: t("helpers.misc.connections.credentialsMissing"),
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
    return { ok: false, message: t("helpers.misc.connections.teller.appIdRequired") };
  }
  if (
    !opts.certificatePem.includes("-----BEGIN CERTIFICATE-----") ||
    !opts.privateKeyPem.includes("-----BEGIN")
  ) {
    return {
      ok: false,
      message: t("helpers.misc.connections.teller.badPemFiles"),
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
      message: t("helpers.misc.connections.credentialsMissing"),
    };
  }
  const fetched = await fetchTellerData(secrets, {
    startDate: discoveryWindow().startDate,
  });
  if (!fetched.ok) {
    return {
      ok: false,
      message: fetched.message ?? t("helpers.misc.connections.teller.listAccountsFailed"),
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
  /**
   * "This account IS this credit card on the Debts tab" - see
   * ExternalAccountLink.debtId. Wins over assetAccountId (one balance
   * destination per account).
   */
  debtId?: string | null;
}

/** Persist the wizard's account-mapping step as ExternalAccountLinks. */
export const finalizeAccountLinks = async (
  connectionId: string,
  selections: AccountSelection[],
): Promise<void> => {
  const now = new Date().toISOString();
  for (const selection of selections) {
    // Undecided fields are omitted so a re-run keeps a stored card link /
    // person (see buildWizardLink + upsertLink's preserve-on-undefined).
    const link = buildWizardLink(connectionId, selection, {
      id: generateUUID(),
      nowISO: now,
    });
    const debtId = selection.debtId || null;
    const all = await upsertLink(link);
    if (debtId) {
      // upsertLink keeps an existing link's id (resume path) - resolve it.
      const saved = all.find(
        (l) =>
          l.connectionId === connectionId &&
          l.externalAccountId === link.externalAccountId,
      );
      if (saved) await linkAccountToDebt(saved.id, debtId);
    }
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
 * Choosing a credit card (change.debtId) also clears that card from every
 * other link and seeds the card's balance the same way.
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
  const chosenDebtId = all.find((l) => l.id === linkId)?.debtId;
  if (typeof change.debtId === "string" && chosenDebtId === change.debtId) {
    // One account per card (same rule as the debt editor): any OTHER link
    // feeding this card lets go of it, or two accounts would fight over
    // its balance every sync.
    for (const other of all) {
      if (other.id !== linkId && other.debtId === chosenDebtId) {
        all = await updateLink(other.id, { debtId: null });
      }
    }
  }
  if (plan.seedDebtBalance) {
    const debt = (await getDebts()).find(
      (d) => d.id === plan.seedDebtBalance?.debtId && !d.deletedAt,
    );
    // Same guards as the asset seed: the card must exist; an unchanged
    // balance skips the write (null fields = nothing would change).
    const fields = debt
      ? debtFieldsForProviderBalance(debt, plan.seedDebtBalance.balance)
      : null;
    if (debt && fields) await updateDebt(debt.id, fields);
  }
  return all.filter((l) => l.connectionId === link.connectionId);
};

/**
 * Point a provider account at a credit card on the Debts tab (or unlink it
 * with null) from anywhere outside the debt editor - the wizard's mapping
 * step and the Connections manager. Delegates to updateLinkPreferences, so
 * the card replaces any Bridge target, other links let go of the card, and
 * a known provider balance lands on the card immediately. Mirroring the
 * balance defaults to ON (the point of linking a card).
 */
export const linkAccountToDebt = async (
  linkId: string,
  debtId: string | null,
  opts?: { updateBalance?: boolean },
): Promise<ExternalAccountLink[]> =>
  updateLinkPreferences(
    linkId,
    debtId
      ? { debtId, updateDebtBalance: opts?.updateBalance ?? true }
      : { debtId: null },
  );

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

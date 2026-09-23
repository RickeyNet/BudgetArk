/**
 * BudgetArk - Bank Connections: Teller Client
 * File: src/services/connections/tellerClient.ts
 *
 * Fetch layer for the Teller API using the USER'S OWN developer credentials
 * (application certificate + private key from their teller.zip, plus the
 * access tokens minted by Teller Connect enrollments). Transport is the
 * mTLS socket client; parsing is the pure tellerParser. quotesService
 * contract: never throws.
 *
 * The fetch window is applied client-side: Teller returns recent
 * transactions per account (newest first) and the ingest planner dedupes,
 * so filtering by postedAt >= startDate is sufficient.
 */

import type { TellerSecrets } from "../../storage/connectionSecretsStorage";
import {
  ConnectionErrorCode,
  NormalizedAccount,
  NormalizedTransaction,
  ProviderFetchResult,
} from "./types";
import { tellerGet } from "./tellerMtlsClient";
import { t } from "../../i18n/translate";
import {
  parseTellerAccounts,
  parseTellerBalance,
  parseTellerTransactions,
  toNormalizedAccount,
} from "./tellerParser";

/** Cap per-account transaction pages; the window filter trims the rest. */
const TRANSACTIONS_COUNT = 250;

const errorForStatus = (
  status: number,
): { error: ConnectionErrorCode; message: string } => {
  if (status === 401 || status === 403) {
    return {
      error: "auth-expired",
      message: t("helpers.misc.connections.teller.authRejected"),
    };
  }
  if (status === 429) {
    return {
      error: "rate-limited",
      message: t("helpers.misc.connections.teller.rateLimited"),
    };
  }
  return {
    error: "provider-error",
    message: t("helpers.misc.connections.teller.unexpectedResponse", { status }),
  };
};

const getJson = async (
  secrets: TellerSecrets,
  accessToken: string,
  path: string,
): Promise<
  | { ok: true; json: unknown }
  | { ok: false; error: ConnectionErrorCode; message: string }
> => {
  const result = await tellerGet({
    path,
    accessToken,
    certificatePem: secrets.certificatePem,
    privateKeyPem: secrets.privateKeyPem,
  });
  if (!result.ok) {
    if (result.reason === "tls") {
      return {
        ok: false,
        error: "invalid-credentials",
        message: t("helpers.misc.connections.teller.certificateRefused"),
      };
    }
    return {
      ok: false,
      error: "network",
      message: t("helpers.misc.connections.teller.unreachable"),
    };
  }
  if (result.response.statusCode < 200 || result.response.statusCode >= 300) {
    return { ok: false, ...errorForStatus(result.response.statusCode) };
  }
  try {
    return { ok: true, json: JSON.parse(result.response.body) };
  } catch {
    return {
      ok: false,
      error: "provider-error",
      message: t("helpers.misc.connections.teller.unparsable"),
    };
  }
};

/**
 * List accounts across every enrollment on the connection (used by the
 * wizard's mapping step right after enrollment, and by each sync pass).
 */
export const fetchTellerData = async (
  secrets: TellerSecrets,
  opts: { startDate: Date },
): Promise<ProviderFetchResult> => {
  const tokens = Object.values(secrets.accessTokens);
  if (tokens.length === 0) {
    return {
      ok: false,
      error: "auth-expired",
      message: t("helpers.misc.connections.teller.noEnrollments"),
    };
  }

  const accounts: NormalizedAccount[] = [];
  const transactions: NormalizedTransaction[] = [];
  const startIso = opts.startDate.toISOString();

  for (const token of tokens) {
    const accountsRes = await getJson(secrets, token, "/accounts");
    if (!accountsRes.ok) {
      return { ok: false, error: accountsRes.error, message: accountsRes.message };
    }
    const summaries = parseTellerAccounts(accountsRes.json);

    for (const summary of summaries) {
      const encodedId = encodeURIComponent(summary.externalAccountId);
      const balanceRes = await getJson(
        secrets,
        token,
        `/accounts/${encodedId}/balances`,
      );
      // A balance failure downgrades gracefully: account still syncs
      // transactions, balance shows 0 until the next successful pass.
      const balance = balanceRes.ok ? parseTellerBalance(balanceRes.json) : null;
      accounts.push(toNormalizedAccount(summary, balance));

      const txRes = await getJson(
        secrets,
        token,
        `/accounts/${encodedId}/transactions?count=${TRANSACTIONS_COUNT}`,
      );
      if (!txRes.ok) {
        return { ok: false, error: txRes.error, message: txRes.message };
      }
      const parsed = parseTellerTransactions(txRes.json, summary.externalAccountId);
      transactions.push(...parsed.filter((tx) => tx.postedAt >= startIso));
    }
  }

  return { ok: true, accounts, transactions };
};

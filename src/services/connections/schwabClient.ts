/**
 * BudgetArk - Bank Connections: Schwab Client
 * File: src/services/connections/schwabClient.ts
 *
 * Fetch layer for the Schwab Trader API using the USER'S OWN developer app
 * (BYO key/secret). Parsing lives in schwabParser.ts; the token lifecycle
 * decision lives in schwabTokenState.ts (both pure and unit-tested).
 *
 * Token handling: fetchSchwabData plans the token action first and returns
 * any refreshed tokens as `tokenPatch` EVEN WHEN a later request fails, so
 * the orchestrator can persist them - dropping a rotated refresh token
 * would strand the connection. A refresh rejected with 400/401 means the
 * 7-day refresh token is dead -> "auth-expired" (full browser re-login).
 */

import { basicAuthHeader } from "./base64";
import {
  SCHWAB_TOKEN_URL,
  SCHWAB_TRADER_BASE_URL,
  SchwabTokenPatch,
  parseAccountNumbersResponse,
  parseAccountsResponse,
  parseTokenResponse,
  parseTransactionsResponse,
} from "./schwabParser";
import { planTokenAction, SchwabTokenSnapshot } from "./schwabTokenState";
import {
  ConnectionErrorCode,
  NormalizedAccount,
  NormalizedTransaction,
  ProviderFetchResult,
  REQUEST_TIMEOUT_MS,
} from "./types";

export type TokenResult =
  | { ok: true; patch: SchwabTokenPatch }
  | { ok: false; error: ConnectionErrorCode; message: string };

const postTokenRequest = async (
  appKey: string,
  appSecret: string,
  form: Record<string, string>,
): Promise<TokenResult> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const body = Object.entries(form)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");
    const res = await fetch(SCHWAB_TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: basicAuthHeader(appKey.trim(), appSecret.trim()),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      signal: controller.signal,
    });
    if (res.status === 400 || res.status === 401) {
      const grant = form.grant_type;
      return {
        ok: false,
        error: grant === "refresh_token" ? "auth-expired" : "invalid-credentials",
        message:
          grant === "refresh_token"
            ? "Schwab requires re-approval every 7 days. Reconnect to keep syncing."
            : "Schwab rejected the app key, secret, or login code. Double-check them and try again.",
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        error: "provider-error",
        message: `Schwab returned an unexpected response (HTTP ${res.status}).`,
      };
    }
    const patch = parseTokenResponse((await res.json()) as unknown, Date.now());
    if (!patch) {
      return {
        ok: false,
        error: "provider-error",
        message: "Schwab's token response was missing expected fields.",
      };
    }
    return { ok: true, patch };
  } catch {
    return {
      ok: false,
      error: "network",
      message: "Couldn't reach Schwab. Check your connection and try again.",
    };
  } finally {
    clearTimeout(timer);
  }
};

/** Exchange a freshly pasted authorization code for the first token set. */
export const exchangeAuthCode = (
  appKey: string,
  appSecret: string,
  code: string,
  redirectUri: string,
): Promise<TokenResult> =>
  postTokenRequest(appKey, appSecret, {
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri.trim(),
  });

export const refreshAccessToken = (
  appKey: string,
  appSecret: string,
  refreshToken: string,
): Promise<TokenResult> =>
  postTokenRequest(appKey, appSecret, {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

const getJson = async (
  url: string,
  accessToken: string,
): Promise<
  { ok: true; json: unknown } | { ok: false; status?: number }
> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      signal: controller.signal,
    });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, json: (await res.json()) as unknown };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
};

export interface SchwabFetchInput extends SchwabTokenSnapshot {
  appKey: string;
  appSecret: string;
}

export type SchwabFetchResult = ProviderFetchResult & {
  /** Refreshed tokens to persist - present even when the fetch failed later. */
  tokenPatch?: SchwabTokenPatch;
};

/**
 * Full Schwab data pull: plan the token action, refresh if needed, then
 * accountNumbers (plain->hash map) -> accounts -> per-account transactions.
 * Dates must be ISO-8601 with milliseconds and zone per the Trader API spec.
 */
export const fetchSchwabData = async (
  input: SchwabFetchInput,
  opts: { startDate: Date; endDate: Date; now?: number },
): Promise<SchwabFetchResult> => {
  const nowMs = opts.now ?? Date.now();
  const action = planTokenAction(input, nowMs);
  if (action === "reauth-required") {
    return {
      ok: false,
      error: "auth-expired",
      message: "Schwab requires re-approval every 7 days. Reconnect to keep syncing.",
    };
  }

  let accessToken = input.accessToken ?? "";
  let tokenPatch: SchwabTokenPatch | undefined;
  if (action === "refresh") {
    const refreshed = await refreshAccessToken(
      input.appKey,
      input.appSecret,
      input.refreshToken ?? "",
    );
    if (!refreshed.ok) {
      return { ok: false, error: refreshed.error, message: refreshed.message };
    }
    tokenPatch = refreshed.patch;
    accessToken = refreshed.patch.accessToken;
  }

  const fail = (
    error: ConnectionErrorCode,
    message: string,
    httpStatus?: number,
  ): SchwabFetchResult => ({ ok: false, error, message, httpStatus, tokenPatch });

  const failForStatus = (status: number | undefined, what: string): SchwabFetchResult => {
    if (status === undefined) {
      return fail("network", "Couldn't reach Schwab. Check your connection and try again.");
    }
    if (status === 401 || status === 403) {
      return fail("auth-expired", "Schwab rejected the session. Reconnect to keep syncing.", status);
    }
    if (status === 429) {
      return fail("rate-limited", "Schwab's request limit was reached. Try again later.", status);
    }
    return fail("provider-error", `Schwab returned an unexpected response while fetching ${what} (HTTP ${status}).`, status);
  };

  const numbersRes = await getJson(
    `${SCHWAB_TRADER_BASE_URL}/accounts/accountNumbers`,
    accessToken,
  );
  if (!numbersRes.ok) return failForStatus(numbersRes.status, "account numbers");
  const numbers = parseAccountNumbersResponse(numbersRes.json);
  const hashByNumber = new Map(numbers.map((n) => [n.accountNumber, n.hashValue]));

  const accountsRes = await getJson(`${SCHWAB_TRADER_BASE_URL}/accounts`, accessToken);
  if (!accountsRes.ok) return failForStatus(accountsRes.status, "accounts");
  const accounts: NormalizedAccount[] = parseAccountsResponse(
    accountsRes.json,
    hashByNumber,
  );

  // Trader API requires ISO-8601 with milliseconds, e.g. 2026-06-01T00:00:00.000Z
  const startIso = opts.startDate.toISOString();
  const endIso = opts.endDate.toISOString();
  const transactions: NormalizedTransaction[] = [];
  for (const account of accounts) {
    const url =
      `${SCHWAB_TRADER_BASE_URL}/accounts/${encodeURIComponent(account.externalAccountId)}/transactions` +
      `?startDate=${encodeURIComponent(startIso)}&endDate=${encodeURIComponent(endIso)}`;
    const txRes = await getJson(url, accessToken);
    if (!txRes.ok) return failForStatus(txRes.status, "transactions");
    transactions.push(
      ...parseTransactionsResponse(txRes.json, account.externalAccountId),
    );
  }

  return { ok: true, accounts, transactions, tokenPatch };
};

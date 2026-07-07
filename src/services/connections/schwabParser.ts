/**
 * BudgetArk - Bank Connections: Schwab Parser
 * File: src/services/connections/schwabParser.ts
 *
 * Pure parsing for the Schwab Trader API OAuth flow and REST responses.
 * The user brings their OWN developer app (key + secret) registered at
 * developer.schwab.com; BudgetArk never ships shared Schwab credentials.
 *
 * NOTE: endpoint paths and field names follow the Trader API as documented
 * mid-2026 (verified fields are still worth re-checking against
 * developer.schwab.com when Schwab bumps API versions). The parsers are
 * deliberately tolerant: unknown fields are ignored, unparseable records are
 * dropped rather than fatal. Pure - node-testable.
 */

import {
  NormalizedAccount,
  NormalizedTransaction,
  roundToCents,
} from "./types";

export const SCHWAB_AUTHORIZE_URL = "https://api.schwabapi.com/v1/oauth/authorize";
export const SCHWAB_TOKEN_URL = "https://api.schwabapi.com/v1/oauth/token";
export const SCHWAB_TRADER_BASE_URL = "https://api.schwabapi.com/trader/v1";

/** Seconds shaved off token expiry to absorb clock skew and transit time. */
export const TOKEN_EXPIRY_SKEW_SECONDS = 60;

export const buildAuthorizeUrl = (
  appKey: string,
  redirectUri: string,
): string =>
  `${SCHWAB_AUTHORIZE_URL}?client_id=${encodeURIComponent(appKey.trim())}&redirect_uri=${encodeURIComponent(redirectUri.trim())}`;

/**
 * Extract the authorization code from whatever the user pasted after the
 * browser landed on their (dead) redirect URI. Tolerates the full address-bar
 * URL, surrounding whitespace, extra query params (`&session=...`), and
 * URL-encoding - Schwab codes end in "@" which arrives as "%40" and must be
 * decoded exactly once. Returns null when no code is present.
 */
export const extractAuthCode = (pastedUrl: string): string | null => {
  const trimmed = pastedUrl.trim();
  if (!trimmed) return null;
  const codeMatch = /[?&]code=([^&\s]+)/.exec(trimmed);
  const raw = codeMatch ? codeMatch[1] : /^[^?&\s]+$/.test(trimmed) && !trimmed.startsWith("http") ? trimmed : null;
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};

export interface SchwabTokenPatch {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenIssuedAt: string;
}

/**
 * Parse a /v1/oauth/token response (both authorization_code and
 * refresh_token grants return the same shape). `nowMs` is injectable for
 * tests. Returns null on any surprise.
 */
export const parseTokenResponse = (
  json: unknown,
  nowMs: number,
): SchwabTokenPatch | null => {
  if (typeof json !== "object" || json === null) return null;
  const body = json as Record<string, unknown>;
  const accessToken =
    typeof body.access_token === "string" && body.access_token
      ? body.access_token
      : null;
  const refreshToken =
    typeof body.refresh_token === "string" && body.refresh_token
      ? body.refresh_token
      : null;
  const expiresIn =
    typeof body.expires_in === "number" && Number.isFinite(body.expires_in)
      ? body.expires_in
      : 1800;
  if (!accessToken || !refreshToken) return null;
  return {
    accessToken,
    accessTokenExpiresAt: new Date(
      nowMs + Math.max(0, expiresIn - TOKEN_EXPIRY_SKEW_SECONDS) * 1000,
    ).toISOString(),
    refreshToken,
    refreshTokenIssuedAt: new Date(nowMs).toISOString(),
  };
};

/**
 * Parse /trader/v1/accounts/accountNumbers: an array of
 * {accountNumber, hashValue}. The hashValue is what every other Trader
 * endpoint takes; it also serves as our stable externalAccountId.
 */
export const parseAccountNumbersResponse = (
  json: unknown,
): { accountNumber: string; hashValue: string }[] => {
  if (!Array.isArray(json)) return [];
  const result: { accountNumber: string; hashValue: string }[] = [];
  for (const item of json) {
    if (typeof item !== "object" || item === null) continue;
    const row = item as Record<string, unknown>;
    if (
      typeof row.accountNumber === "string" &&
      row.accountNumber &&
      typeof row.hashValue === "string" &&
      row.hashValue
    ) {
      result.push({
        accountNumber: row.accountNumber,
        hashValue: row.hashValue,
      });
    }
  }
  return result;
};

const maskAccountNumber = (accountNumber: string): string =>
  accountNumber.length > 4
    ? `...${accountNumber.slice(-4)}`
    : accountNumber;

/**
 * Parse /trader/v1/accounts: an array of {securitiesAccount: {accountNumber,
 * type, currentBalances: {liquidationValue | cashBalance, ...}}}. Balance
 * preference: liquidationValue (total account value) falling back to
 * cashBalance. Accounts missing from `hashByNumber` are dropped (no stable
 * id to key them by).
 */
export const parseAccountsResponse = (
  json: unknown,
  hashByNumber: Map<string, string>,
): NormalizedAccount[] => {
  if (!Array.isArray(json)) return [];
  const result: NormalizedAccount[] = [];
  for (const item of json) {
    if (typeof item !== "object" || item === null) continue;
    const wrapper = item as Record<string, unknown>;
    const account = wrapper.securitiesAccount;
    if (typeof account !== "object" || account === null) continue;
    const details = account as Record<string, unknown>;
    const accountNumber =
      typeof details.accountNumber === "string" ? details.accountNumber : null;
    if (!accountNumber) continue;
    const hashValue = hashByNumber.get(accountNumber);
    if (!hashValue) continue;

    let balance = 0;
    const balances = details.currentBalances;
    if (typeof balances === "object" && balances !== null) {
      const b = balances as Record<string, unknown>;
      const liquidation =
        typeof b.liquidationValue === "number" && Number.isFinite(b.liquidationValue)
          ? b.liquidationValue
          : undefined;
      const cash =
        typeof b.cashBalance === "number" && Number.isFinite(b.cashBalance)
          ? b.cashBalance
          : undefined;
      balance = roundToCents(liquidation ?? cash ?? 0);
    }

    const type = typeof details.type === "string" ? details.type : "Account";
    result.push({
      externalAccountId: hashValue,
      name: `Schwab ${type} ${maskAccountNumber(accountNumber)}`,
      currency: "USD",
      balance,
    });
  }
  return result;
};

/**
 * Parse /trader/v1/accounts/{hash}/transactions: an array of transactions
 * with {activityId, time, netAmount, type, description?, transferItems?}.
 * netAmount is signed from the account's perspective (negative = outflow).
 * Rows without a usable id/time/amount are dropped.
 */
export const parseTransactionsResponse = (
  json: unknown,
  externalAccountId: string,
): NormalizedTransaction[] => {
  if (!Array.isArray(json)) return [];
  const result: NormalizedTransaction[] = [];
  for (const item of json) {
    if (typeof item !== "object" || item === null) continue;
    const tx = item as Record<string, unknown>;
    const activityId =
      typeof tx.activityId === "number" || typeof tx.activityId === "string"
        ? String(tx.activityId)
        : typeof tx.transactionId === "number" || typeof tx.transactionId === "string"
          ? String(tx.transactionId)
          : null;
    const time =
      typeof tx.time === "string" && !Number.isNaN(Date.parse(tx.time))
        ? new Date(tx.time).toISOString()
        : null;
    const netAmount =
      typeof tx.netAmount === "number" && Number.isFinite(tx.netAmount)
        ? roundToCents(tx.netAmount)
        : null;
    if (!activityId || !time || netAmount === null) continue;

    const description =
      typeof tx.description === "string" && tx.description
        ? tx.description
        : typeof tx.type === "string"
          ? tx.type
          : "";
    result.push({
      providerTxId: activityId,
      externalAccountId,
      postedAt: time,
      amount: netAmount,
      description,
      pending: tx.status === "PENDING",
    });
  }
  return result;
};

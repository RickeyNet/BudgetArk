/**
 * BudgetArk - Bank Connections: SimpleFIN Parser
 * File: src/services/connections/simplefinParser.ts
 *
 * Pure parsing for the SimpleFIN Bridge protocol (https://www.simplefin.org/protocol.html):
 *  - a SETUP TOKEN is base64 of a one-time claim URL;
 *  - POSTing the claim URL yields an ACCESS URL with basic-auth credentials
 *    embedded (https://user:pass@host/simplefin);
 *  - GET {access}/accounts returns {accounts: [{id, name, currency, balance,
 *    "balance-date", transactions: [{id, posted, amount, description, pending?,
 *    transacted_at?}]}]}.
 *
 * SimpleFIN quirks handled here: money values are DECIMAL STRINGS ("-4.50"),
 * dates are unix epoch SECONDS, and a pending transaction may carry
 * posted: 0 with the real time in transacted_at. Malformed individual
 * transactions are dropped (and counted), never fatal. Pure - node-testable.
 */

import { base64ToUtf8, basicAuthHeader } from "./base64";
import {
  NormalizedAccount,
  NormalizedTransaction,
  roundToCents,
} from "./types";

export interface ParsedAccessUrl {
  /** Credential-free base URL, no trailing slash: https://host/simplefin */
  baseUrl: string;
  /** Ready-to-send `Basic ...` Authorization header value. */
  authHeader: string;
}

/**
 * Decode a pasted SimpleFIN setup token into its claim URL.
 * Tolerates surrounding whitespace; requires an https URL inside.
 */
export const decodeSetupToken = (
  token: string,
): { ok: true; claimUrl: string } | { ok: false; message: string } => {
  const trimmed = token.trim();
  if (!trimmed) {
    return { ok: false, message: "Paste your SimpleFIN setup token first." };
  }
  const decoded = base64ToUtf8(trimmed);
  if (!decoded || !/^https:\/\/\S+$/.test(decoded.trim())) {
    return {
      ok: false,
      message:
        "That doesn't look like a SimpleFIN setup token. Copy the whole token from your SimpleFIN Bridge app page and try again.",
    };
  }
  return { ok: true, claimUrl: decoded.trim() };
};

/**
 * Split an access URL's embedded credentials into a Basic auth header and a
 * credential-free base URL. React Native's fetch does not reliably send
 * URL-embedded basic auth, so the header must be explicit. Returns null when
 * the URL is malformed or carries no credentials.
 */
export const parseAccessUrl = (accessUrl: string): ParsedAccessUrl | null => {
  const match = /^(https?):\/\/([^:/@]+):([^@]+)@(.+)$/.exec(accessUrl.trim());
  if (!match) return null;
  const [, scheme, user, password, rest] = match;
  if (scheme !== "https" && scheme !== "http") return null;
  const baseUrl = `${scheme}://${rest}`.replace(/\/+$/, "");
  return {
    baseUrl,
    authHeader: basicAuthHeader(
      decodeURIComponent(user),
      decodeURIComponent(password),
    ),
  };
};

const epochSecondsToIso = (value: unknown): string | null => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return new Date(value * 1000).toISOString();
};

const parseMoney = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return roundToCents(value);
  }
  if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value.trim())) {
    return roundToCents(parseFloat(value.trim()));
  }
  return null;
};

export interface SimplefinParseResult {
  accounts: NormalizedAccount[];
  transactions: NormalizedTransaction[];
  /** Individually malformed transactions dropped during parsing. */
  droppedTransactions: number;
}

/** Parse a SimpleFIN /accounts response body into normalized shapes. */
export const parseAccountsResponse = (json: unknown): SimplefinParseResult => {
  const result: SimplefinParseResult = {
    accounts: [],
    transactions: [],
    droppedTransactions: 0,
  };
  if (typeof json !== "object" || json === null) return result;
  const rawAccounts = (json as Record<string, unknown>).accounts;
  if (!Array.isArray(rawAccounts)) return result;

  for (const rawAccount of rawAccounts) {
    if (typeof rawAccount !== "object" || rawAccount === null) continue;
    const account = rawAccount as Record<string, unknown>;
    const id = typeof account.id === "string" ? account.id : null;
    const name = typeof account.name === "string" ? account.name : null;
    const balance = parseMoney(account.balance);
    if (!id || !name || balance === null) continue;

    result.accounts.push({
      externalAccountId: id,
      name,
      currency:
        typeof account.currency === "string" ? account.currency : undefined,
      balance,
      balanceAsOf: epochSecondsToIso(account["balance-date"]) ?? undefined,
    });

    const rawTransactions = account.transactions;
    if (!Array.isArray(rawTransactions)) continue;
    for (const rawTx of rawTransactions) {
      if (typeof rawTx !== "object" || rawTx === null) {
        result.droppedTransactions += 1;
        continue;
      }
      const tx = rawTx as Record<string, unknown>;
      const txId = typeof tx.id === "string" && tx.id ? tx.id : null;
      const amount = parseMoney(tx.amount);
      // A pending transaction may report posted: 0 - fall back to transacted_at.
      const postedAt =
        epochSecondsToIso(tx.posted) ?? epochSecondsToIso(tx.transacted_at);
      if (!txId || amount === null || !postedAt) {
        result.droppedTransactions += 1;
        continue;
      }
      result.transactions.push({
        providerTxId: txId,
        externalAccountId: id,
        postedAt,
        amount,
        description:
          typeof tx.description === "string" ? tx.description : "",
        pending: tx.pending === true,
      });
    }
  }
  return result;
};

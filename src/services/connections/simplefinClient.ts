/**
 * BudgetArk - Bank Connections: SimpleFIN Client
 * File: src/services/connections/simplefinClient.ts
 *
 * Thin fetch layer over the SimpleFIN Bridge protocol. All parsing/decision
 * logic lives in simplefinParser.ts (pure, unit-tested); this module only
 * moves bytes. quotesService contract: never throws, AbortController
 * timeouts, failures map to the shared error taxonomy.
 */

import { parseAccessUrl, parseAccountsResponse } from "./simplefinParser";
import {
  ConnectionErrorCode,
  ProviderFetchResult,
  REQUEST_TIMEOUT_MS,
  errorCodeForStatus,
} from "./types";

export type ClaimResult =
  | { ok: true; accessUrl: string }
  | { ok: false; error: ConnectionErrorCode; message: string };

/** SimpleFIN Bridge answers 402 when the account's subscription has lapsed. */
const PAYMENT_REQUIRED_MESSAGE =
  "SimpleFIN Bridge says payment is required. Check your subscription at bridge.simplefin.org, then try again.";

/**
 * Exchange a (single-use) claim URL for the permanent access URL. The
 * response BODY is the access URL. A 403 nearly always means the token was
 * already claimed - the user must generate a fresh one.
 */
export const claimAccessUrl = async (claimUrl: string): Promise<ClaimResult> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(claimUrl, {
      method: "POST",
      headers: { "Content-Length": "0" },
      signal: controller.signal,
    });
    if (res.status === 403) {
      return {
        ok: false,
        error: "invalid-credentials",
        message:
          "That token didn't work - SimpleFIN tokens are single-use, so generate a fresh one in SimpleFIN Bridge and paste it here.",
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        error: errorCodeForStatus(res.status),
        message:
          res.status === 402
            ? PAYMENT_REQUIRED_MESSAGE
            : `SimpleFIN returned an unexpected response (HTTP ${res.status}).`,
      };
    }
    const body = (await res.text()).trim();
    if (!parseAccessUrl(body)) {
      return {
        ok: false,
        error: "provider-error",
        message: "SimpleFIN returned an access URL BudgetArk couldn't read.",
      };
    }
    return { ok: true, accessUrl: body };
  } catch {
    return {
      ok: false,
      error: "network",
      message: "Couldn't reach SimpleFIN. Check your connection and try again.",
    };
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Fetch accounts + transactions since `startDateEpochSec`. Includes pending
 * transactions (`pending=1`) so the Review Inbox can show them early; the
 * ingest planner reconciles them once they post.
 */
export const fetchSimplefinAccounts = async (
  accessUrl: string,
  opts: { startDateEpochSec: number },
): Promise<ProviderFetchResult> => {
  const parsed = parseAccessUrl(accessUrl);
  if (!parsed) {
    return {
      ok: false,
      error: "invalid-credentials",
      message: "The stored SimpleFIN access URL is malformed. Remove and re-add this connection.",
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const url = `${parsed.baseUrl}/accounts?start-date=${Math.floor(opts.startDateEpochSec)}&pending=1`;
    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: parsed.authHeader },
      signal: controller.signal,
    });
    if (!res.ok) {
      return {
        ok: false,
        error: errorCodeForStatus(res.status),
        message:
          res.status === 401 || res.status === 403
            ? "SimpleFIN rejected this connection's credentials."
            : res.status === 402
              ? PAYMENT_REQUIRED_MESSAGE
              : res.status === 429
                ? "SimpleFIN's daily request limit was reached. Try again later."
                : `SimpleFIN returned an unexpected response (HTTP ${res.status}).`,
        httpStatus: res.status,
      };
    }
    const json = (await res.json()) as unknown;
    const { accounts, transactions } = parseAccountsResponse(json);
    return { ok: true, accounts, transactions };
  } catch {
    return {
      ok: false,
      error: "network",
      message: "Couldn't reach SimpleFIN. Check your connection and try again.",
    };
  } finally {
    clearTimeout(timer);
  }
};

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
import { t } from "../../i18n/translate";
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
const paymentRequiredMessage = (): string => t("helpers.misc.connections.simplefin.paymentRequired");

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
        message: t("helpers.misc.connections.simplefin.tokenUsed"),
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        error: errorCodeForStatus(res.status),
        message:
          res.status === 402
            ? paymentRequiredMessage()
            : t("helpers.misc.connections.simplefin.unexpectedResponse", { status: res.status }),
      };
    }
    const body = (await res.text()).trim();
    if (!parseAccessUrl(body)) {
      return {
        ok: false,
        error: "provider-error",
        message: t("helpers.misc.connections.simplefin.accessUrlUnreadable"),
      };
    }
    return { ok: true, accessUrl: body };
  } catch {
    return {
      ok: false,
      error: "network",
      message: t("helpers.misc.connections.simplefin.unreachable"),
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
      message: t("helpers.misc.connections.simplefin.accessUrlMalformed"),
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
            ? t("helpers.misc.connections.simplefin.authRejected")
            : res.status === 402
              ? paymentRequiredMessage()
              : res.status === 429
                ? t("helpers.misc.connections.simplefin.rateLimited")
                : t("helpers.misc.connections.simplefin.unexpectedResponse", { status: res.status }),
        httpStatus: res.status,
      };
    }
    const json = (await res.json()) as unknown;
    const { accounts, transactions, warnings } = parseAccountsResponse(json);
    return { ok: true, accounts, transactions, warnings };
  } catch {
    return {
      ok: false,
      error: "network",
      message: t("helpers.misc.connections.simplefin.unreachable"),
    };
  } finally {
    clearTimeout(timer);
  }
};

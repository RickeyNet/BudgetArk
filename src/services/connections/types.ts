/**
 * BudgetArk - Bank Connections: Shared Service Types
 * File: src/services/connections/types.ts
 *
 * Normalized provider-agnostic shapes plus the error taxonomy shared by the
 * SimpleFIN/Teller clients and the sync orchestrator. Pure types -
 * NO react-native or storage imports (this module is consumed by node-run
 * unit tests).
 */

import type { ConnectionErrorCode } from "../../types";

export type { ConnectionErrorCode };

/** One provider-side account, normalized. */
export interface NormalizedAccount {
  externalAccountId: string;
  name: string;
  currency?: string;
  /** Dollars, signed as reported by the provider (may be negative). */
  balance: number;
  /** ISO timestamp of the balance, when the provider supplies one. */
  balanceAsOf?: string;
}

/** One provider-side transaction, normalized. Negative amount = outflow. */
export interface NormalizedTransaction {
  providerTxId: string;
  externalAccountId: string;
  /** ISO date the transaction posted (or transacted, while pending). */
  postedAt: string;
  amount: number;
  description: string;
  pending: boolean;
}

/**
 * Outcome union for provider fetches - the quotesService contract: clients
 * never throw; every failure maps to a coarse, actionable error code.
 */
export type ProviderFetchResult =
  | {
      ok: true;
      accounts: NormalizedAccount[];
      transactions: NormalizedTransaction[];
    }
  | {
      ok: false;
      error: ConnectionErrorCode;
      message?: string;
      httpStatus?: number;
    };

export const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Round to cents; provider amounts arrive as floats or decimal strings.
 * Re-exported from the shared money helper so parser call sites keep their
 * import path.
 */
export { roundToCents } from "../../utils/money";

/** Map an HTTP failure status to the shared error taxonomy. */
export const errorCodeForStatus = (status: number): ConnectionErrorCode => {
  if (status === 401 || status === 403) return "auth-expired";
  if (status === 429) return "rate-limited";
  return "provider-error";
};

/**
 * BudgetArk - Bank Connections: Teller Parser
 * File: src/services/connections/tellerParser.ts
 *
 * Pure normalization of Teller API responses (https://teller.io/docs/api):
 *  - GET /accounts                  -> [{id, name, institution, type, subtype,
 *                                       last_four, currency, enrollment_id}]
 *  - GET /accounts/{id}/balances    -> {account_id, available, ledger} (string amounts)
 *  - GET /accounts/{id}/transactions-> [{id, account_id, date "YYYY-MM-DD",
 *                                       description, amount (string, negative =
 *                                       outflow), status "posted"|"pending", type}]
 * Amounts arrive as decimal strings; dates as plain calendar dates (normalized
 * to noon UTC so month attribution matches the app's conventions). Malformed
 * rows are dropped, never fatal. Node-testable.
 */

import {
  NormalizedAccount,
  NormalizedTransaction,
  roundToCents,
} from "./types";

const parseMoney = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return roundToCents(value);
  }
  if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value.trim())) {
    return roundToCents(parseFloat(value.trim()));
  }
  return null;
};

/** "2026-06-28" -> noon-UTC ISO (matches the app's entry-date convention). */
const dateToIso = (value: unknown): string | null => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  return `${value}T12:00:00.000Z`;
};

export interface TellerAccountSummary {
  externalAccountId: string;
  name: string;
  currency?: string;
  enrollmentId?: string;
}

/** Parse GET /accounts. Balances arrive separately - see mergeBalance. */
export const parseTellerAccounts = (json: unknown): TellerAccountSummary[] => {
  if (!Array.isArray(json)) return [];
  const result: TellerAccountSummary[] = [];
  for (const item of json) {
    if (typeof item !== "object" || item === null) continue;
    const account = item as Record<string, unknown>;
    const id = typeof account.id === "string" && account.id ? account.id : null;
    if (!id) continue;
    const institution =
      typeof account.institution === "object" && account.institution !== null
        ? (account.institution as Record<string, unknown>)
        : undefined;
    const institutionName =
      typeof institution?.name === "string" ? institution.name : undefined;
    const baseName =
      typeof account.name === "string" && account.name ? account.name : "Account";
    const lastFour =
      typeof account.last_four === "string" && account.last_four
        ? ` ...${account.last_four}`
        : "";
    result.push({
      externalAccountId: id,
      name: `${institutionName ? `${institutionName} ` : ""}${baseName}${lastFour}`,
      currency:
        typeof account.currency === "string" ? account.currency : undefined,
      enrollmentId:
        typeof account.enrollment_id === "string"
          ? account.enrollment_id
          : undefined,
    });
  }
  return result;
};

/** Parse GET /accounts/{id}/balances into a signed dollar amount (ledger preferred). */
export const parseTellerBalance = (json: unknown): number | null => {
  if (typeof json !== "object" || json === null) return null;
  const body = json as Record<string, unknown>;
  return parseMoney(body.ledger) ?? parseMoney(body.available);
};

export const toNormalizedAccount = (
  summary: TellerAccountSummary,
  balance: number | null,
): NormalizedAccount => ({
  externalAccountId: summary.externalAccountId,
  name: summary.name,
  currency: summary.currency,
  balance: balance ?? 0,
});

/** Parse GET /accounts/{id}/transactions. Negative amount = outflow (as-is). */
export const parseTellerTransactions = (
  json: unknown,
  externalAccountId: string,
): NormalizedTransaction[] => {
  if (!Array.isArray(json)) return [];
  const result: NormalizedTransaction[] = [];
  for (const item of json) {
    if (typeof item !== "object" || item === null) continue;
    const tx = item as Record<string, unknown>;
    const id = typeof tx.id === "string" && tx.id ? tx.id : null;
    const amount = parseMoney(tx.amount);
    const postedAt = dateToIso(tx.date);
    if (!id || amount === null || !postedAt) continue;
    result.push({
      providerTxId: id,
      externalAccountId,
      postedAt,
      amount,
      description: typeof tx.description === "string" ? tx.description : "",
      pending: tx.status === "pending",
    });
  }
  return result;
};

/**
 * BudgetArk - Bank Connections: Sync Orchestrator
 * File: src/services/connections/connectionsSyncService.ts
 *
 * Drives a full sync pass across the user's connections: cooldown gating,
 * provider fetch, ingest planning (Review Inbox), balance application, and
 * connection status/error bookkeeping. quotesService contract: never throws;
 * every connection resolves to a typed outcome.
 *
 * Key behaviors:
 *  - `lastAttemptAt` is stamped BEFORE fetching so a failing/rate-limited
 *    provider is never hammered on retry loops.
 *  - Schwab token refreshes are persisted EVEN when a later request fails -
 *    dropping a rotated refresh token would strand the connection.
 *  - Applied balances are clamped at >= 0 (isAssetAccountItem rejects
 *    negatives on the sync receive path); the raw value lands on the link
 *    for display. Unchanged balances skip the write to avoid updatedAt churn
 *    that would spam P2P sync diffs.
 */

import { AppState, AppStateStatus } from "react-native";
import type { BankConnection, ExternalAccountLink } from "../../types";
import { categoryIsPureHoldings } from "../../types";
import {
  getConnections,
  updateConnection,
} from "../../storage/connectionsStorage";
import {
  getConnectionSecrets,
  patchSchwabTokens,
} from "../../storage/connectionSecretsStorage";
import {
  getLinksForConnection,
  updateLink,
} from "../../storage/externalAccountLinksStorage";
import {
  getIngestLedger,
  getPendingTransactions,
  recordLedgerEntries,
  removePendingTransactions,
  upsertPendingTransactions,
} from "../../storage/reviewInboxStorage";
import { getMerchantRules } from "../../storage/merchantRulesStorage";
import { getBudgetEntriesIncludingDeleted } from "../../storage/budgetStorage";
import {
  getAssetAccounts,
  updateAssetAccount,
} from "../../storage/assetAccountStorage";
import { fetchSimplefinAccounts } from "./simplefinClient";
import { fetchSchwabData } from "./schwabClient";
import { fetchTellerData } from "./tellerClient";
import { planIngest } from "./ingest";
import { computeFetchWindow, isSyncDue } from "./syncGate";
import type { NormalizedAccount, ProviderFetchResult } from "./types";

export type ConnectionSyncOutcome =
  | "updated" // fetch succeeded; inbox/balances may have changed
  | "fresh" // cooldown not elapsed; nothing fetched
  | "rate-limited"
  | "needs-reauth"
  | "unavailable" // network/provider failure
  | "disabled"; // connection paused by the user

export interface ConnectionSyncResult {
  connectionId: string;
  outcome: ConnectionSyncOutcome;
  newPendingCount: number;
  updatedPendingCount: number;
  balancesUpdated: number;
  errorMessage?: string;
}

const fetchForConnection = async (
  connection: BankConnection,
  nowMs: number,
): Promise<ProviderFetchResult> => {
  const secrets = await getConnectionSecrets(connection.id);
  if (!secrets || secrets.provider !== connection.provider) {
    return {
      ok: false,
      error: "invalid-credentials",
      message: "This connection's credentials are missing. Remove and re-add it.",
    };
  }
  const window = computeFetchWindow(connection.lastSyncedAt, nowMs);

  if (secrets.provider === "simplefin") {
    return fetchSimplefinAccounts(secrets.accessUrl, {
      startDateEpochSec: window.startDate.getTime() / 1000,
    });
  }

  if (secrets.provider === "schwab") {
    const result = await fetchSchwabData(secrets, {
      startDate: window.startDate,
      endDate: window.endDate,
      now: nowMs,
    });
    // Persist rotated tokens no matter how the fetch ended.
    if (result.tokenPatch) {
      await patchSchwabTokens(connection.id, result.tokenPatch);
    }
    return result;
  }

  return fetchTellerData(secrets, { startDate: window.startDate });
};

const applyBalances = async (
  links: ExternalAccountLink[],
  accounts: NormalizedAccount[],
): Promise<number> => {
  const accountsById = new Map(accounts.map((a) => [a.externalAccountId, a]));
  const assetAccounts = await getAssetAccounts();
  const assetById = new Map(assetAccounts.map((a) => [a.id, a]));
  let updated = 0;

  for (const link of links) {
    const provider = accountsById.get(link.externalAccountId);
    if (!provider) continue;

    // Raw provider balance always lands on the link for display.
    if (
      link.lastExternalBalance !== provider.balance ||
      !link.lastExternalBalanceAt
    ) {
      await updateLink(link.id, {
        lastExternalBalance: provider.balance,
        lastExternalBalanceAt: provider.balanceAsOf ?? new Date().toISOString(),
      });
    }

    if (!link.updateBalance || !link.assetAccountId) continue;
    const asset = assetById.get(link.assetAccountId);
    if (!asset) continue;
    // Investment/retirement accounts are valued purely by holdings; their
    // stored balance stays 0 by design.
    if (categoryIsPureHoldings(asset.category)) continue;

    const clamped = Math.max(0, provider.balance);
    if (asset.balance === clamped) continue;
    await updateAssetAccount(asset.id, { balance: clamped });
    updated += 1;
  }
  return updated;
};

const syncOneConnection = async (
  connection: BankConnection,
  opts: { manual: boolean; nowMs: number },
): Promise<ConnectionSyncResult> => {
  const base: ConnectionSyncResult = {
    connectionId: connection.id,
    outcome: "updated",
    newPendingCount: 0,
    updatedPendingCount: 0,
    balancesUpdated: 0,
  };

  if (!connection.enabled) return { ...base, outcome: "disabled" };
  if (connection.authStatus === "needs-reauth" && !opts.manual) {
    return { ...base, outcome: "needs-reauth" };
  }
  if (!isSyncDue(connection.lastAttemptAt, opts.nowMs, opts.manual)) {
    return { ...base, outcome: "fresh" };
  }

  // Stamp the attempt BEFORE fetching - failed providers must not be hammered.
  await updateConnection(connection.id, {
    lastAttemptAt: new Date(opts.nowMs).toISOString(),
  });

  const result = await fetchForConnection(connection, opts.nowMs);

  if (!result.ok) {
    const outcome: ConnectionSyncOutcome =
      result.error === "auth-expired"
        ? "needs-reauth"
        : result.error === "rate-limited"
          ? "rate-limited"
          : "unavailable";
    await updateConnection(connection.id, {
      authStatus: result.error === "auth-expired" ? "needs-reauth" : "error",
      lastErrorCode: result.error,
      lastErrorMessage: result.message,
    });
    return { ...base, outcome, errorMessage: result.message };
  }

  const links = await getLinksForConnection(connection.id);
  const [inbox, ledger, rules, allEntries] = await Promise.all([
    getPendingTransactions(),
    getIngestLedger(),
    getMerchantRules(),
    getBudgetEntriesIncludingDeleted(),
  ]);
  const knownEntryExternalIds = new Set<string>();
  for (const entry of allEntries) {
    if (entry.externalTxId) knownEntryExternalIds.add(entry.externalTxId);
  }

  const plan = planIngest({
    provider: connection.provider,
    connectionId: connection.id,
    fetched: result.transactions,
    links,
    inbox,
    ledger,
    knownEntryExternalIds,
    rules,
    now: new Date(opts.nowMs).toISOString(),
  });

  if (Object.keys(plan.ledgerAliases).length > 0) {
    await recordLedgerEntries(plan.ledgerAliases);
  }
  const migratedIds = plan.updatedInboxItems.filter(
    (item) => !inbox.some((existing) => existing.id === item.id),
  );
  if (plan.newInboxItems.length > 0 || plan.updatedInboxItems.length > 0) {
    // An id-migrated item (pending->posted rename) leaves its old row behind;
    // upsert the new rows first, then drop the stale ids recorded as aliases.
    await upsertPendingTransactions([
      ...plan.newInboxItems,
      ...plan.updatedInboxItems,
    ]);
    const staleIds = Object.keys(plan.ledgerAliases).filter((key) =>
      inbox.some((existing) => existing.id === key),
    );
    if (staleIds.length > 0) {
      await removePendingTransactions(staleIds);
    }
  }

  const balancesUpdated = await applyBalances(links, result.accounts);

  await updateConnection(connection.id, {
    lastSyncedAt: new Date(opts.nowMs).toISOString(),
    authStatus: "ok",
    lastErrorCode: undefined,
    lastErrorMessage: undefined,
  });

  return {
    ...base,
    outcome: "updated",
    newPendingCount: plan.newInboxItems.length,
    updatedPendingCount: plan.updatedInboxItems.length - migratedIds.length,
    balancesUpdated,
  };
};

let inFlight: Promise<ConnectionSyncResult[]> | null = null;

/**
 * Sync all (or one) connection(s). Concurrent calls share the in-flight
 * pass rather than stacking a second one.
 */
export const syncConnections = async (
  opts: { manual?: boolean; connectionId?: string; now?: number } = {},
): Promise<ConnectionSyncResult[]> => {
  if (inFlight) return inFlight;
  const run = (async () => {
    const nowMs = opts.now ?? Date.now();
    const connections = await getConnections();
    const targets = opts.connectionId
      ? connections.filter((c) => c.id === opts.connectionId)
      : connections;
    const results: ConnectionSyncResult[] = [];
    for (const connection of targets) {
      try {
        results.push(
          await syncOneConnection(connection, {
            manual: opts.manual === true,
            nowMs,
          }),
        );
      } catch {
        // Never let one connection's surprise kill the pass.
        results.push({
          connectionId: connection.id,
          outcome: "unavailable",
          newPendingCount: 0,
          updatedPendingCount: 0,
          balancesUpdated: 0,
          errorMessage: "Something went wrong syncing this connection.",
        });
      }
    }
    return results;
  })();
  inFlight = run;
  try {
    return await run;
  } finally {
    inFlight = null;
  }
};

/** Foreground auto-sync: respects each connection's 6-hour cooldown. */
export const maybeAutoSyncConnections = async (): Promise<void> => {
  await syncConnections({ manual: false });
};

let appStateSubscription: { remove: () => void } | null = null;

/**
 * Register the foreground trigger. Idempotent - safe to call from screen
 * mounts. Mirrors autoSyncManager's AppState pattern.
 */
export const startConnectionsMonitoring = (): void => {
  if (appStateSubscription) return;
  appStateSubscription = AppState.addEventListener(
    "change",
    (state: AppStateStatus) => {
      if (state === "active") {
        void maybeAutoSyncConnections();
      }
    },
  );
  // Also kick one pass at startup registration.
  void maybeAutoSyncConnections();
};

export const stopConnectionsMonitoring = (): void => {
  appStateSubscription?.remove();
  appStateSubscription = null;
};

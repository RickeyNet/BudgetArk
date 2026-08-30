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
 *  - Applied balances are clamped at >= 0 (isAssetAccountItem rejects
 *    negatives on the sync receive path); the raw value lands on the link
 *    for display. Unchanged balances skip the write to avoid updatedAt churn
 *    that would spam P2P sync diffs.
 *  - A link with a `debtId` is a credit card on the Debts tab: its provider
 *    balance mirrors onto the Debt (services/connections/debtBalances) and
 *    its outflows stamp the card keep-alive watch, in ONE debt write per
 *    card per pass.
 */

import { AppState, AppStateStatus } from "react-native";
import type { BankConnection, Debt, ExternalAccountLink } from "../../types";
import { categoryIsPureHoldings } from "../../types";
import {
  getConnections,
  updateConnection,
} from "../../storage/connectionsStorage";
import { getConnectionSecrets } from "../../storage/connectionSecretsStorage";
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
import { getDebts, updateDebt } from "../../storage/debtStorage";
import {
  latestOutflowByAccount,
  planKeepAliveStamps,
} from "../../utils/cardKeepAlive";
import { planDebtBalanceUpdates } from "./debtBalances";
import { rescheduleCardKeepAliveReminders } from "../../notifications/cardKeepAliveReminders";
import { fetchSimplefinAccounts } from "./simplefinClient";
import { fetchTellerData } from "./tellerClient";
import { planIngest } from "./ingest";
import { autoApproveInboxByRules } from "./reviewInboxService";
import { notifyDataChanged } from "../../storage/dataChangeNotifier";
import { computeFetchWindow, isSyncDue } from "./syncGate";
import type {
  NormalizedAccount,
  NormalizedTransaction,
  ProviderFetchResult,
} from "./types";

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
  /** AssetAccount balances + credit-card (debt) balances that changed. */
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

  return fetchTellerData(secrets, { startDate: window.startDate });
};

/**
 * Debt-linked accounts (ExternalAccountLink.debtId = "this account IS this
 * credit card"), two effects in one pass:
 *
 *  1. Balance mirroring - the provider balance replaces the debt's balance
 *     (planDebtBalanceUpdates: live debts, mirroring on, changed values
 *     only, originalBalance raised as a high-water mark).
 *  2. Card keep-alive auto-stamping - a fetched outflow proves the card was
 *     used, so advance `keepAliveLastUsedAt`. Runs off the RAW fetched
 *     transactions (not the Review Inbox plan) on purpose - activity counts
 *     whether or not the user imports transactions from that account.
 *     planKeepAliveStamps is pure: enabled + live debts only, strictly-newer
 *     only, future dates clamped.
 *
 * Both plans merge into at most one updateDebt per card, keeping updatedAt
 * churn on P2P diffs to one write per sync that actually changed something.
 * Stale links (debt deleted) are lazily nulled here. Best-effort: must never
 * fail the sync pass. Returns how many debt balances changed.
 */
const applyDebtLinks = async (
  links: ExternalAccountLink[],
  accounts: readonly NormalizedAccount[],
  transactions: readonly NormalizedTransaction[],
  nowMs: number,
): Promise<number> => {
  if (!links.some((l) => l.debtId)) return 0;
  try {
    const debts = await getDebts();
    const updates = new Map<string, Partial<Debt>>();

    const balanceUpdates = planDebtBalanceUpdates({ links, debts, accounts });
    for (const { debtId, ...fields } of balanceUpdates) {
      updates.set(debtId, fields);
    }

    const stamps = planKeepAliveStamps({
      links,
      debts,
      latestByAccount: latestOutflowByAccount(transactions),
      nowISO: new Date(nowMs).toISOString(),
    });
    for (const stamp of stamps) {
      updates.set(stamp.debtId, {
        ...updates.get(stamp.debtId),
        keepAliveLastUsedAt: stamp.lastUsedAt,
      });
    }

    for (const [debtId, fields] of updates) {
      await updateDebt(debtId, fields);
    }
    for (const link of links) {
      if (link.debtId && !debts.some((d) => d.id === link.debtId)) {
        await updateLink(link.id, { debtId: null });
      }
    }
    if (stamps.length > 0) void rescheduleCardKeepAliveReminders();
    return balanceUpdates.length;
  } catch (error) {
    if (__DEV__) console.error("Debt-linked account update failed:", error);
    return 0;
  }
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
  // Live manually-entered entries: candidates for duplicateLikely flagging
  // (the user tracked a purchase by hand before the bank imported it).
  const manualEntries = allEntries
    .filter((entry) => !entry.deletedAt && entry.source !== "bank")
    .map((entry) => ({
      amount: entry.amount,
      type: entry.type,
      date: entry.date,
    }));

  const plan = planIngest({
    provider: connection.provider,
    connectionId: connection.id,
    fetched: result.transactions,
    links,
    inbox,
    ledger,
    knownEntryExternalIds,
    rules,
    manualEntries,
    now: new Date(opts.nowMs).toISOString(),
  });

  const ledgerWrites = { ...plan.ledgerAliases, ...plan.autoDismissed };
  if (Object.keys(ledgerWrites).length > 0) {
    await recordLedgerEntries(ledgerWrites);
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

  // Auto-approve sweep: items covered by an "approve" merchant rule become
  // entries right away (pending/transfer/duplicate items always stay - see
  // selectAutoApprovable). Best-effort like keep-alive: an inbox-side
  // failure must not mark the connection as broken - the items just wait
  // in the inbox for manual approval.
  try {
    await autoApproveInboxByRules();
  } catch (error) {
    if (__DEV__) console.error("Auto-approve sweep failed:", error);
  }

  const balancesUpdated =
    (await applyBalances(links, result.accounts)) +
    (await applyDebtLinks(
      links,
      result.accounts,
      result.transactions,
      opts.nowMs,
    ));

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
    // An "updated" pass may have written budget entries (auto-approvals),
    // asset balances and keep-alive stamps behind a mounted tab's back;
    // tell the screens to reload (see dataChangeNotifier.ts).
    if (results.some((r) => r.outcome === "updated")) {
      notifyDataChanged("bank-sync");
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

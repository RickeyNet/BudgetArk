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
 *    that would spam P2P sync diffs. Any Bridge category can be a target,
 *    retirement/investment included (their synced balance shows as a Cash
 *    line next to any tickers).
 *  - A link with a `debtId` is a credit card on the Debts tab: its provider
 *    balance mirrors onto the Debt (services/connections/debtBalances) and
 *    its outflows stamp the card keep-alive watch, in ONE debt write per
 *    card per pass.
 *  - The Review-Inbox ingest is guarded as a unit: if it throws, balances
 *    and debt links are still applied, the failure is recorded on the
 *    connection (authStatus "error", retried next pass) and the pass
 *    reports "unavailable" without advancing lastSyncedAt.
 */

import { AppState, AppStateStatus } from "react-native";
import type {
  BankConnection,
  Debt,
  ExternalAccountLink,
  PendingTransaction,
} from "../../types";
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
  recordSkippedTransactions,
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
import { planIngest, planStalePending } from "./ingest";
import {
  applyEntryAmountCorrections,
  autoApproveInboxByRules,
  reconcileInboxWithDecisions,
} from "./reviewInboxService";
import { notifyDataChanged } from "../../storage/dataChangeNotifier";
import {
  computeFetchWindow,
  isSyncDue,
  manualRetryBypassesCooldown,
  nextManualSyncAt,
  planGapBackfill,
} from "./syncGate";
import { t } from "../../i18n/translate";
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
  /**
   * Review Inbox rows this pass retired WITHOUT making an entry (a twin of
   * something already reviewed, an Always Skip rule, a pending charge the
   * bank stopped reporting, a partner's decision) - now listed under the
   * inbox's "Recently skipped". Surfaced so a sync that shrinks the inbox
   * never does so silently (user report: "I clicked sync and lost items").
   */
  skippedCount: number;
  /** Rows the auto-approve sweep turned into entries during this pass. */
  autoApprovedCount: number;
  /** AssetAccount balances + credit-card (debt) balances that changed. */
  balancesUpdated: number;
  errorMessage?: string;
  /**
   * Set when the pass re-fetched from an earlier start than the normal
   * window: a bank behind the bridge came back after going dark (ISO date
   * the second fetch started from), or the user asked for a re-import.
   */
  backfilledFrom?: string;
  /**
   * "fresh" only: when the manual cooldown next lets "Sync now" through
   * (ISO), so the UI can say "try again at ..." instead of silently doing
   * nothing. Undefined when nothing is blocking.
   */
  nextSyncAt?: string;
  /**
   * "updated" only: the bridge's per-institution warnings from this pass
   * (e.g. a bank needing a fresh login), so the UI can say the sync went
   * through but the bridge still reports a bank. Undefined when clean.
   */
  providerWarnings?: string[];
}

const fetchForConnection = async (
  connection: BankConnection,
  startDate: Date,
): Promise<ProviderFetchResult> => {
  const secrets = await getConnectionSecrets(connection.id);
  if (!secrets || secrets.provider !== connection.provider) {
    return {
      ok: false,
      error: "invalid-credentials",
      message: t("helpers.misc.connections.credentialsMissing"),
    };
  }

  if (secrets.provider === "simplefin") {
    return fetchSimplefinAccounts(secrets.accessUrl, {
      startDateEpochSec: startDate.getTime() / 1000,
    });
  }

  return fetchTellerData(secrets, { startDate });
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

/**
 * `gapPendingIds`: accounts whose backlog re-fetch failed this pass. Their
 * link keeps its old balance date (and balance, so the next pass still
 * sees a jump) - planGapBackfill reads that date, and stamping it now
 * would hide the gap forever. `gapResolvedIds`: accounts whose backlog
 * was re-fetched; their date is stamped even when the balance didn't
 * move, so the same gap isn't re-fetched every pass.
 */
const applyBalances = async (
  links: ExternalAccountLink[],
  accounts: NormalizedAccount[],
  gapPendingIds: ReadonlySet<string> = new Set(),
  gapResolvedIds: ReadonlySet<string> = new Set(),
): Promise<number> => {
  const accountsById = new Map(accounts.map((a) => [a.externalAccountId, a]));
  const assetAccounts = await getAssetAccounts();
  const assetById = new Map(assetAccounts.map((a) => [a.id, a]));
  let updated = 0;

  for (const link of links) {
    const provider = accountsById.get(link.externalAccountId);
    if (!provider) continue;

    // Raw provider balance always lands on the link for display - except
    // while its backlog is still owed (see the doc comment above); the
    // asset mirror below still gets the real balance either way.
    if (
      !gapPendingIds.has(link.externalAccountId) &&
      (link.lastExternalBalance !== provider.balance ||
        !link.lastExternalBalanceAt ||
        gapResolvedIds.has(link.externalAccountId))
    ) {
      await updateLink(link.id, {
        lastExternalBalance: provider.balance,
        lastExternalBalanceAt: provider.balanceAsOf ?? new Date().toISOString(),
      });
    }

    if (!link.updateBalance || !link.assetAccountId) continue;
    const asset = assetById.get(link.assetAccountId);
    if (!asset) continue;
    // Every category is a valid target, holdings ones included: a synced
    // 401k / brokerage balance lands on the account's stored balance, which
    // the Bridge counts alongside any tickers and shows as a Cash line (see
    // MAPPABLE_ASSET_CATEGORIES).

    const clamped = Math.max(0, provider.balance);
    if (asset.balance === clamped) continue;
    await updateAssetAccount(asset.id, { balance: clamped });
    updated += 1;
  }
  return updated;
};

/**
 * Records an unexpected (non-provider) sync failure on the connection so the
 * manager shows it. Not an auth problem, so the next pass retries normally.
 */
const recordSyncFailure = async (
  connectionId: string,
  authStatus: BankConnection["authStatus"],
  message: string,
): Promise<void> => {
  await updateConnection(connectionId, {
    authStatus,
    lastErrorCode: "provider-error",
    lastErrorMessage: message,
  });
};

/**
 * Review-Inbox ingest for one fetched pass: plan, settled-amount
 * corrections, ledger writes, inbox upserts/removals, stale-pending
 * retirement and the auto-approve sweep. Throws on a storage failure (the
 * caller records it); returns the inbox counts for the pass result.
 */
const ingestTransactions = async (
  connection: BankConnection,
  result: Extract<ProviderFetchResult, { ok: true }>,
  links: ExternalAccountLink[],
  opts: { nowMs: number; windowStartMs: number },
): Promise<IngestCounts> => {
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

  // Settled-amount corrections go BEFORE the ledger aliases that would
  // stop the planner from re-finding the twin (idempotent, so a crash in
  // between re-applies next pass - see applyEntryAmountCorrections).
  await applyEntryAmountCorrections(plan.amountCorrections);

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
  }
  // Retire inbox rows whose id gained an alias. Runs independently of the
  // upsert above: when a partner-synced decision names the POSTED id and the
  // pending twin is the only thing in the inbox, the planner emits an alias
  // but no new/updated rows - gating the removal on those lists left the
  // pending row alive until the next pass's reconcile.
  const staleIds = Object.keys(plan.ledgerAliases).filter((key) =>
    inbox.some((existing) => existing.id === key),
  );
  // Of those, the rows that are simply GONE (their twin was already
  // dismissed) go on the "Recently skipped" list. A pending->posted
  // migration also aliases the old id, but that row lives on under its
  // posted id (in updatedInboxItems) - not skipped. Rows aliased to an
  // APPROVED decision are tracked money - not skipped either.
  const migratedTo = new Set(plan.updatedInboxItems.map((item) => item.id));
  const duplicateSkipped = staleIds
    .map((id) => inbox.find((existing) => existing.id === id))
    .filter((item): item is PendingTransaction => {
      if (!item) return false;
      const alias = plan.ledgerAliases[item.id];
      return (
        alias.status === "dismissed" &&
        !(alias.aliasOf !== undefined && migratedTo.has(alias.aliasOf))
      );
    });
  await recordSkippedTransactions(duplicateSkipped, "duplicate");
  // Transactions an Always Skip rule dropped on arrival never reached the
  // inbox, but the user still gets to see (and undo) that.
  await recordSkippedTransactions(plan.autoDismissedItems, "rule");
  if (staleIds.length > 0) {
    await removePendingTransactions(staleIds);
  }

  // Pending rows the bank stopped reporting (see planStalePending): judged
  // against the inbox as it stands AFTER this pass's ingest, so a row the
  // planner just updated or migrated is never overwritten with its stale
  // copy. Same crash-safe order as approval: ledger, bookkeeping, removal.
  const inboxAfterIngest = new Map(inbox.map((item) => [item.id, item]));
  for (const item of [...plan.newInboxItems, ...plan.updatedInboxItems]) {
    inboxAfterIngest.set(item.id, item);
  }
  for (const id of staleIds) inboxAfterIngest.delete(id);
  const stale = planStalePending({
    provider: connection.provider,
    connectionId: connection.id,
    inbox: Array.from(inboxAfterIngest.values()),
    fetched: result.transactions,
    fetchedAccountIds: new Set(result.accounts.map((a) => a.externalAccountId)),
    windowStartMs: opts.windowStartMs,
    now: new Date(opts.nowMs).toISOString(),
  });
  if (Object.keys(stale.ledgerWrites).length > 0) {
    await recordLedgerEntries(stale.ledgerWrites);
  }
  if (stale.updatedInboxItems.length > 0) {
    await upsertPendingTransactions(stale.updatedInboxItems);
  }
  if (stale.retireIds.length > 0) {
    await recordSkippedTransactions(
      stale.retireIds
        .map((id) => inboxAfterIngest.get(id))
        .filter((item): item is PendingTransaction => item !== undefined),
      "stale",
    );
    await removePendingTransactions(stale.retireIds);
  }

  // Auto-approve sweep: items covered by an "approve" merchant rule become
  // entries right away (pending/transfer/duplicate items always stay - see
  // selectAutoApprovable). Best-effort like keep-alive: an inbox-side
  // failure must not mark the connection as broken - the items just wait
  // in the inbox for manual approval.
  let autoApprovedCount = 0;
  try {
    autoApprovedCount = await autoApproveInboxByRules();
  } catch (error) {
    if (__DEV__) console.error("Auto-approve sweep failed:", error);
  }

  return {
    newPendingCount: plan.newInboxItems.length,
    updatedPendingCount: plan.updatedInboxItems.length - migratedIds.length,
    skippedCount:
      duplicateSkipped.length +
      plan.autoDismissedItems.length +
      stale.retireIds.length,
    autoApprovedCount,
  };
};

type IngestCounts = Pick<
  ConnectionSyncResult,
  "newPendingCount" | "updatedPendingCount" | "skippedCount" | "autoApprovedCount"
>;

const EMPTY_INGEST_COUNTS: IngestCounts = {
  newPendingCount: 0,
  updatedPendingCount: 0,
  skippedCount: 0,
  autoApprovedCount: 0,
};

const syncOneConnection = async (
  connection: BankConnection,
  opts: { manual: boolean; nowMs: number; backfillDays?: number },
): Promise<ConnectionSyncResult> => {
  const base: ConnectionSyncResult = {
    connectionId: connection.id,
    outcome: "updated",
    ...EMPTY_INGEST_COUNTS,
    balancesUpdated: 0,
  };

  if (!connection.enabled) return { ...base, outcome: "disabled" };
  if (connection.authStatus === "needs-reauth" && !opts.manual) {
    return { ...base, outcome: "needs-reauth" };
  }
  // An explicit re-import is the user's deliberate one-off, so it skips the
  // manual cooldown (still one request against the daily budget). So does a
  // manual retry of a connection that is broken or carries bridge warnings
  // (see manualRetryBypassesCooldown) - auto passes never bypass.
  const bypassCooldown =
    opts.backfillDays !== undefined ||
    (opts.manual && manualRetryBypassesCooldown(connection));
  if (
    !bypassCooldown &&
    !isSyncDue(connection.lastAttemptAt, opts.nowMs, opts.manual)
  ) {
    return {
      ...base,
      outcome: "fresh",
      nextSyncAt:
        nextManualSyncAt(connection.lastAttemptAt, opts.nowMs) ?? undefined,
    };
  }

  // Stamp the attempt BEFORE fetching - failed providers must not be hammered.
  await updateConnection(connection.id, {
    lastAttemptAt: new Date(opts.nowMs).toISOString(),
  });

  const window = computeFetchWindow(
    connection.lastSyncedAt,
    opts.nowMs,
    opts.backfillDays,
  );
  let result = await fetchForConnection(connection, window.startDate);
  let backfilledFrom: string | undefined =
    opts.backfillDays !== undefined ? window.startDate.toISOString() : undefined;

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

  // A bank behind the bridge that just came back after going dark: its
  // backlog predates this window (see planGapBackfill). Re-fetch once from
  // the earlier start and use that superset; a failed second fetch keeps
  // the first result and the gap is retried on the next pass - which only
  // works because applyBalances leaves those links' balance dates alone.
  const gapPendingIds = new Set<string>();
  const gapResolvedIds = new Set<string>();
  if (opts.backfillDays === undefined) {
    const gap = planGapBackfill({
      links,
      accounts: result.accounts,
      windowStartMs: window.startDate.getTime(),
      nowMs: opts.nowMs,
    });
    if (gap) {
      const refetched = await fetchForConnection(connection, gap.startDate);
      if (refetched.ok) {
        result = refetched;
        backfilledFrom = gap.startDate.toISOString();
        for (const id of gap.staleAccountIds) gapResolvedIds.add(id);
      } else {
        for (const id of gap.staleAccountIds) gapPendingIds.add(id);
      }
    }
  }

  // The Review-Inbox ingest is guarded as a whole: a storage throw anywhere
  // in it must not skip the balance + debt-link steps below, or card
  // balances would silently stop moving with nothing on the connection to
  // say why. A failed ingest is recorded on the connection instead and the
  // pass reports "unavailable"; lastSyncedAt stays put so the next pass
  // re-fetches (and the ledger dedupes) the same window.
  let ingestCounts: IngestCounts = EMPTY_INGEST_COUNTS;
  let ingestFailed = false;
  try {
    ingestCounts = await ingestTransactions(connection, result, links, {
      nowMs: opts.nowMs,
      windowStartMs: backfilledFrom
        ? Date.parse(backfilledFrom)
        : window.startDate.getTime(),
    });
  } catch (error) {
    ingestFailed = true;
    if (__DEV__) console.error("Review Inbox ingest failed:", error);
  }

  // A backlog re-fetch whose transactions never reached the inbox is still
  // owed: treat its accounts as gap-pending so their balance dates aren't
  // stamped and the next pass re-detects the gap.
  const balanceGapPending = ingestFailed
    ? new Set([...gapPendingIds, ...gapResolvedIds])
    : gapPendingIds;
  const balanceGapResolved = ingestFailed ? new Set<string>() : gapResolvedIds;

  const balancesUpdated =
    (await applyBalances(
      links,
      result.accounts,
      balanceGapPending,
      balanceGapResolved,
    )) +
    (await applyDebtLinks(
      links,
      result.accounts,
      result.transactions,
      opts.nowMs,
    ));

  if (ingestFailed) {
    const errorMessage = t("helpers.misc.connections.syncFailed");
    // The fetch itself succeeded, so auth is fine: "error" (never
    // needs-reauth), which the next pass retries normally.
    // Best-effort, so the balances already applied still reach the result
    // (and the caller's reload notification).
    try {
      await recordSyncFailure(connection.id, "error", errorMessage);
    } catch (recordError) {
      if (__DEV__) console.error("Recording sync failure failed:", recordError);
    }
    return {
      ...base,
      outcome: "unavailable",
      balancesUpdated,
      errorMessage,
      backfilledFrom,
    };
  }

  const providerWarnings =
    result.warnings && result.warnings.length > 0 ? result.warnings : undefined;
  await updateConnection(connection.id, {
    lastSyncedAt: new Date(opts.nowMs).toISOString(),
    authStatus: "ok",
    lastErrorCode: undefined,
    lastErrorMessage: undefined,
    // Per-institution "needs attention" from the provider: kept while the
    // bridge keeps reporting it, cleared the first time it comes back clean.
    providerWarnings,
  });

  return {
    ...base,
    outcome: "updated",
    ...ingestCounts,
    balancesUpdated,
    backfilledFrom,
    providerWarnings,
  };
};

let inFlight: Promise<ConnectionSyncResult[]> | null = null;

/**
 * Sync all (or one) connection(s). Concurrent calls share the in-flight
 * pass rather than stacking a second one. `backfillDays` is the manager's
 * explicit "Re-import the last N days" (capped at MAX_GAP_BACKFILL_DAYS):
 * it widens the fetch window and skips the manual cooldown; the ledger
 * keeps already-reviewed transactions from resurfacing.
 */
export const syncConnections = async (
  opts: {
    manual?: boolean;
    connectionId?: string;
    now?: number;
    backfillDays?: number;
  } = {},
): Promise<ConnectionSyncResult[]> => {
  if (inFlight) return inFlight;
  const run = (async () => {
    const nowMs = opts.now ?? Date.now();
    // Retire inbox rows a partner has since decided (their entries and
    // dismissals arrive over partner sync, possibly after this device
    // fetched the same transactions). Best-effort: a storage hiccup here
    // must not fail the pass - the next one reconciles again. Rows it
    // skipped are counted on their connection's result below, so the pass
    // still reports them.
    const preSkippedByConnection = new Map<string, number>();
    try {
      const { skipped } = await reconcileInboxWithDecisions();
      for (const item of skipped) {
        preSkippedByConnection.set(
          item.connectionId,
          (preSkippedByConnection.get(item.connectionId) ?? 0) + 1,
        );
      }
    } catch (error) {
      if (__DEV__) console.error("Inbox reconciliation failed:", error);
    }
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
            backfillDays: opts.backfillDays,
          }),
        );
      } catch (error) {
        // Never let one connection's surprise kill the pass.
        if (__DEV__) console.error("Connection sync failed:", error);
        const errorMessage = t("helpers.misc.connections.syncFailed");
        // Best-effort: put the failure on the connection so the manager
        // shows it. A needs-reauth connection keeps that status (a manual
        // retry that blew up proved nothing about its credentials).
        try {
          await recordSyncFailure(
            connection.id,
            connection.authStatus === "needs-reauth" ? "needs-reauth" : "error",
            errorMessage,
          );
        } catch (recordError) {
          if (__DEV__) console.error("Recording sync failure failed:", recordError);
        }
        results.push({
          connectionId: connection.id,
          outcome: "unavailable",
          ...EMPTY_INGEST_COUNTS,
          balancesUpdated: 0,
          errorMessage,
        });
      }
    }
    // Attribute the pre-pass skips to their connections; rows from a
    // connection outside this pass's targets ride on the first result so
    // the count is never dropped.
    for (const [connectionId, count] of preSkippedByConnection) {
      const target =
        results.find((r) => r.connectionId === connectionId) ?? results[0];
      if (target) target.skippedCount += count;
    }
    // An "updated" pass may have written budget entries (auto-approvals),
    // asset balances and keep-alive stamps behind a mounted tab's back - and
    // a pass whose ingest failed can still have applied balances; tell the
    // screens to reload (see dataChangeNotifier.ts).
    if (
      results.some((r) => r.outcome === "updated" || r.balancesUpdated > 0)
    ) {
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

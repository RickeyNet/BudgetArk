/**
 * BudgetArk - Bank Statement Import into the Review Inbox
 * File: src/services/connections/csvStatementImport.ts
 *
 * The side-effecting shell around utils/bankCsvImport: takes the
 * transactions parsed from a downloaded bank CSV and runs them through the
 * SAME ingest planner a SimpleFIN / Teller sync uses, so statement rows get
 * merchant-rule suggestions, auto-approve / ignore rules, duplicate and
 * transfer flags, and the ledger-backed dedupe that keeps a re-imported or
 * overlapping statement from doubling anything. Write order mirrors
 * connectionsSyncService.syncOneConnection (ledger, inbox upsert, stale-row
 * removal, auto-approve sweep) for the same crash-safety reasons.
 *
 * Differences from a live sync, all deliberate:
 * - There is no BankConnection or ExternalAccountLink. The planner needs a
 *   link with importTransactions on to accept an account, so a synthetic,
 *   never-stored link is passed for the statement account
 *   (`csv:<label>`, see statementAccountIdFor).
 * - duplicateLikely is checked against ALL live entries, bank-sourced
 *   included, not just manual ones: a statement covering a period a bank
 *   link already synced carries the same purchases under different ids,
 *   and the flag is how the user spots them (never dropped automatically -
 *   same policy as the sync path).
 * - The inbox cap (MAX_INBOX_SIZE) is enforced here rather than left to the
 *   storage layer, which would silently drop the OLDEST rows. The newest
 *   rows that fit are imported and the rest are reported as deferred; the
 *   same file can be re-imported once the inbox is worked down.
 */

import type { ExternalAccountLink } from "../../types";
import type { NormalizedTransaction } from "./types";
import { getBudgetEntriesIncludingDeleted } from "../../storage/budgetStorage";
import {
  getIngestLedger,
  getPendingTransactions,
  MAX_INBOX_SIZE,
  recordLedgerEntries,
  removePendingTransactions,
  upsertPendingTransactions,
} from "../../storage/reviewInboxStorage";
import { getMerchantRules } from "../../storage/merchantRulesStorage";
import { planIngest } from "./ingest";
import {
  autoApproveInboxByRules,
  reconcileInboxWithDecisions,
} from "./reviewInboxService";
import {
  STATEMENT_CONNECTION_ID,
  selectWithinInboxCapacity,
  statementAccountLabelFrom,
} from "../../utils/bankCsvImport";

export interface StatementImportSummary {
  /** New rows now waiting in the Review Inbox. */
  added: number;
  /** Rows already decided, already in the inbox, or already entries - skipped. */
  alreadyKnown: number;
  /** Rows an "ignore" merchant rule skipped outright. */
  autoDismissed: number;
  /** Inbox rows an "approve" merchant rule turned straight into entries. */
  autoApproved: number;
  /** New rows flagged as a likely duplicate of an existing entry. */
  flaggedDuplicates: number;
  /** Rows that did not fit in the inbox this time (re-import the file later). */
  deferredForCapacity: number;
}

/**
 * Route parsed statement transactions into the Review Inbox. Every row
 * shares the given statement account id (all rows of one file come from
 * one account). Throws only on storage failure; planner outcomes are all
 * reported in the summary.
 */
export const importStatementTransactions = async (
  transactions: readonly NormalizedTransaction[],
  externalAccountId: string,
): Promise<StatementImportSummary> => {
  const summary: StatementImportSummary = {
    added: 0,
    alreadyKnown: 0,
    autoDismissed: 0,
    autoApproved: 0,
    flaggedDuplicates: 0,
    deferredForCapacity: 0,
  };
  if (transactions.length === 0) return summary;

  // Retire inbox rows decided elsewhere first, exactly like a sync pass, so
  // the capacity check below sees the real backlog.
  await reconcileInboxWithDecisions();

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
  const duplicateCandidates = allEntries
    .filter((entry) => !entry.deletedAt)
    .map((entry) => ({ amount: entry.amount, type: entry.type, date: entry.date }));

  const now = new Date().toISOString();
  const syntheticLink: ExternalAccountLink = {
    id: `${STATEMENT_CONNECTION_ID}:${externalAccountId}`,
    connectionId: STATEMENT_CONNECTION_ID,
    externalAccountId,
    externalName: statementAccountLabelFrom(externalAccountId) ?? externalAccountId,
    assetAccountId: null,
    importTransactions: true,
    updateBalance: false,
    createdAt: now,
    updatedAt: now,
  };

  const plan = planIngest({
    provider: "csv",
    connectionId: STATEMENT_CONNECTION_ID,
    fetched: [...transactions],
    links: [syntheticLink],
    inbox,
    ledger,
    knownEntryExternalIds,
    rules,
    manualEntries: duplicateCandidates,
    now,
  });

  const room = Math.max(0, MAX_INBOX_SIZE - inbox.length);
  const { kept, deferred } = selectWithinInboxCapacity(plan.newInboxItems, room);

  const ledgerWrites = { ...plan.ledgerAliases, ...plan.autoDismissed };
  if (Object.keys(ledgerWrites).length > 0) {
    await recordLedgerEntries(ledgerWrites);
  }
  if (kept.length > 0 || plan.updatedInboxItems.length > 0) {
    await upsertPendingTransactions([...kept, ...plan.updatedInboxItems]);
  }
  const staleIds = Object.keys(plan.ledgerAliases).filter((key) =>
    inbox.some((existing) => existing.id === key),
  );
  if (staleIds.length > 0) {
    await removePendingTransactions(staleIds);
  }

  // Best-effort like the sync path: a failed sweep leaves the rows waiting
  // for manual approval instead of failing the import.
  try {
    summary.autoApproved = await autoApproveInboxByRules();
  } catch (error) {
    if (__DEV__) console.error("Statement auto-approve sweep failed:", error);
  }

  summary.added = kept.length;
  summary.deferredForCapacity = deferred.length;
  summary.autoDismissed = Object.keys(plan.autoDismissed).length;
  summary.flaggedDuplicates = kept.filter((item) => item.duplicateLikely).length;
  summary.alreadyKnown = Math.max(
    0,
    transactions.length - plan.newInboxItems.length - summary.autoDismissed,
  );
  return summary;
};

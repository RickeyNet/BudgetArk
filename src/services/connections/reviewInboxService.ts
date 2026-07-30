/**
 * BudgetArk - Bank Connections: Review Inbox Service
 * File: src/services/connections/reviewInboxService.ts
 *
 * Approve/dismiss operations for Review Inbox items, plus merchant-rule
 * management (change a rule's category, flip categorize<->ignore, delete)
 * with inbox re-application. Approval write order is
 * deliberate: BudgetEntry FIRST, ledger second, inbox removal last - a crash
 * mid-way leaves at worst a stale inbox row that the ingest planner will not
 * recreate (the entry's externalTxId now blocks it) and the user can dismiss.
 */

import type {
  BudgetEntry,
  BudgetEntryType,
  CategoryName,
  IngestLedgerEntry,
  MerchantRule,
  PendingTransaction,
} from "../../types";
import { addBudgetEntry } from "../../storage/budgetStorage";
import {
  getPendingTransactions,
  recordLedgerEntries,
  removePendingTransaction,
  removePendingTransactions,
  upsertPendingTransactions,
} from "../../storage/reviewInboxStorage";
import {
  deleteMerchantRule,
  getMerchantRules,
  updateMerchantRule,
  upsertMerchantRule,
} from "../../storage/merchantRulesStorage";
import { generateUUID } from "../../utils/uuid";
import { sanitizeTextInput } from "../../utils/sanitize";
import { pendingFingerprintFor } from "./ingest";
import { matchMerchantRule, replanInboxForRules } from "./merchant";

const MAX_DESCRIPTION_LENGTH = 220;

export interface ApproveOptions {
  pendingId: string;
  category: CategoryName;
  /** Defaults to the item's sign-derived suggestedType. */
  type?: BudgetEntryType;
  /**
   * Defaults to the item's rule-suggested name (renameTo), then its raw
   * description - so bulk approval applies remembered renames.
   */
  description?: string;
  /**
   * Business to tag the entry with (expenses only). `null` = explicitly
   * personal; undefined = fall back to the item's rule-suggested business.
   */
  businessId?: string | null;
  /**
   * Person to assign the entry to (expenses only). Same null/undefined
   * contract as businessId.
   */
  personId?: string | null;
  /**
   * Save a merchant rule so future fetches suggest this category - plus the
   * entered name (when it differs from the bank's text) and business.
   */
  rememberRule?: boolean;
}

const ledgerEntryFor = (
  item: PendingTransaction,
  status: "approved" | "dismissed",
  budgetEntryId?: string,
): IngestLedgerEntry => ({
  status,
  budgetEntryId,
  at: new Date().toISOString(),
  // Captured while the item is still pending so the planner can recognize
  // the posted twin if the provider reissues the transaction id.
  pendingFingerprint: item.pending
    ? pendingFingerprintFor(item.externalAccountId, item.amount, item.postedAt)
    : undefined,
});

/**
 * Turn one inbox item into a BudgetEntry. Returns the created entry, or null
 * when the item no longer exists (double-tap, synced away, etc.).
 */
export const approvePendingTransaction = async (
  opts: ApproveOptions,
): Promise<BudgetEntry | null> => {
  const inbox = await getPendingTransactions();
  const item = inbox.find((p) => p.id === opts.pendingId);
  if (!item) return null;

  const now = new Date().toISOString();
  const type = opts.type ?? item.suggestedType;
  const description = sanitizeTextInput(
    opts.description ?? item.suggestedName ?? item.description,
  )
    .slice(0, MAX_DESCRIPTION_LENGTH)
    .trim();
  const businessId =
    type === "expense"
      ? (opts.businessId === null
          ? undefined
          : opts.businessId ?? item.suggestedBusinessId)
      : undefined;
  const personId =
    type === "expense"
      ? (opts.personId === null
          ? undefined
          : opts.personId ?? item.suggestedPersonId)
      : undefined;
  const entry: BudgetEntry = {
    id: generateUUID(),
    type,
    category: opts.category,
    // BudgetEntry.amount is positive dollars; `type` carries the direction.
    amount: Math.abs(item.amount),
    description: description || undefined,
    date: item.postedAt,
    createdAt: now,
    updatedAt: now,
    source: "bank",
    externalTxId: item.id,
    merchant: item.merchant || undefined,
    businessId,
    personId,
  };

  await addBudgetEntry(entry);
  await recordLedgerEntries({
    [item.id]: ledgerEntryFor(item, "approved", entry.id),
  });
  await removePendingTransaction(item.id);

  if (opts.rememberRule && item.merchant) {
    // Only remember a rename when the saved name actually differs from the
    // bank's default text - an untouched name keeps future imports raw.
    const renameTo =
      description && description !== item.description.trim()
        ? description
        : undefined;
    await upsertMerchantRule({
      id: generateUUID(),
      merchantKey: item.merchant,
      category: opts.category,
      type,
      renameTo,
      businessId,
      personId,
      useCount: 1,
      lastUsedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }
  return entry;
};

/** Dismiss inbox items - they never become entries and never come back. */
export const dismissPendingTransactions = async (
  pendingIds: string[],
): Promise<void> => {
  if (pendingIds.length === 0) return;
  const inbox = await getPendingTransactions();
  const byId = new Map(inbox.map((item) => [item.id, item]));
  const ledgerUpdates: Record<string, IngestLedgerEntry> = {};
  for (const id of pendingIds) {
    const item = byId.get(id);
    if (item) ledgerUpdates[id] = ledgerEntryFor(item, "dismissed");
  }
  await recordLedgerEntries(ledgerUpdates);
  await removePendingTransactions(pendingIds);
};

export const dismissPendingTransaction = (pendingId: string): Promise<void> =>
  dismissPendingTransactions([pendingId]);

/**
 * Skip one item AND remember an "ignore" rule for its merchant, so future
 * syncs auto-dismiss it (credit-card payments, debt payments, transfers).
 * Every other inbox item matching the new rule is dismissed in the same
 * pass. Returns how many items were dismissed. Items without a usable
 * merchant key fall back to a plain single dismiss.
 */
export const dismissAndIgnoreMerchant = async (
  pendingId: string,
): Promise<number> => {
  const inbox = await getPendingTransactions();
  const item = inbox.find((p) => p.id === pendingId);
  if (!item) return 0;
  if (!item.merchant) {
    await dismissPendingTransactions([pendingId]);
    return 1;
  }

  const now = new Date().toISOString();
  const rule: MerchantRule = {
    id: generateUUID(),
    merchantKey: item.merchant,
    action: "ignore",
    // Placeholders - never read while action is "ignore".
    category: "Other",
    type: item.suggestedType,
    useCount: 1,
    lastUsedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  await upsertMerchantRule(rule);

  const ids = inbox
    .filter(
      (p) =>
        p.id === pendingId ||
        (p.merchant ? matchMerchantRule(p.merchant, [rule]) !== undefined : false),
    )
    .map((p) => p.id);
  await dismissPendingTransactions(ids);
  return ids.length;
};

/* ─── Rule management (the "change your selection" surface) ─── */

/**
 * Re-match every inbox item against the current rule set and apply the
 * outcome: items newly covered by an "ignore" rule are dismissed (ledger
 * recorded, so they never resurface), and stale suggested categories are
 * rewritten. Rule changes can't resurrect transactions that were already
 * skipped - the ingest ledger remembers those decisions.
 */
const reapplyRulesToInbox = async (): Promise<{
  dismissedCount: number;
  recategorizedCount: number;
}> => {
  const [inbox, rules] = await Promise.all([
    getPendingTransactions(),
    getMerchantRules(),
  ]);
  const plan = replanInboxForRules(inbox, rules, new Date().toISOString());
  await dismissPendingTransactions(plan.dismissIds);
  if (plan.updatedItems.length > 0) {
    await upsertPendingTransactions(plan.updatedItems);
  }
  return {
    dismissedCount: plan.dismissIds.length,
    recategorizedCount: plan.updatedItems.length,
  };
};

export interface ChangeRuleOptions {
  ruleId: string;
  action: "categorize" | "ignore";
  /** Required when action is "categorize"; ignored otherwise. */
  category?: CategoryName;
  /**
   * Display name for future imports. Empty/whitespace clears the rename.
   * Omit to keep the rule's current value.
   */
  renameTo?: string;
  /**
   * Business to tag future approved expenses with. `null` clears it; omit
   * to keep the rule's current value.
   */
  businessId?: string | null;
  /**
   * Person to assign future approved expenses to. Same null/omit contract
   * as businessId.
   */
  personId?: string | null;
}

/**
 * Change what an existing rule does - switch between "always categorize as X"
 * and "always skip", pick a different category, or adjust the remembered
 * rename/business - then bring the inbox in line with the new behavior.
 */
export const changeMerchantRule = async (
  opts: ChangeRuleOptions,
): Promise<{ dismissedCount: number; recategorizedCount: number }> => {
  const rules = await getMerchantRules();
  const rule = rules.find((r) => r.id === opts.ruleId);
  if (!rule) return { dismissedCount: 0, recategorizedCount: 0 };
  const renameTo =
    opts.renameTo === undefined
      ? rule.renameTo
      : sanitizeTextInput(opts.renameTo).slice(0, MAX_DESCRIPTION_LENGTH).trim() ||
        undefined;
  const businessId =
    opts.businessId === undefined
      ? rule.businessId
      : opts.businessId ?? undefined;
  const personId =
    opts.personId === undefined ? rule.personId : opts.personId ?? undefined;
  await updateMerchantRule(opts.ruleId, {
    action: opts.action,
    category:
      opts.action === "categorize" && opts.category
        ? opts.category
        : rule.category,
    type: rule.type,
    renameTo,
    businessId,
    personId,
  });
  return reapplyRulesToInbox();
};

/** Delete a rule and clear/re-derive the suggestions it produced. */
export const removeMerchantRule = async (
  ruleId: string,
): Promise<{ dismissedCount: number; recategorizedCount: number }> => {
  await deleteMerchantRule(ruleId);
  return reapplyRulesToInbox();
};

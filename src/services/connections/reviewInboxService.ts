/**
 * BudgetArk - Bank Connections: Review Inbox Service
 * File: src/services/connections/reviewInboxService.ts
 *
 * Approve/dismiss operations for Review Inbox items, plus merchant-rule
 * management (change a rule's category, flip approve/categorize/ignore,
 * delete) with inbox re-application - including the auto-approve sweep
 * that turns items covered by an "approve" rule straight into entries.
 * Approval write order is
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
  SavingsGoal,
} from "../../types";
import {
  addBudgetEntry,
  getBudgetEntries,
  getBudgetEntriesIncludingDeleted,
} from "../../storage/budgetStorage";
import { entryMonthKey, isBillCandidate } from "../../utils/billFulfillment";
import { isEntryActiveInMonth } from "../../utils/recurrence";
import { getLinks } from "../../storage/externalAccountLinksStorage";
import { getSavingsGoals, updateSavingsGoal } from "../../storage/savingsGoalStorage";
import { roundToCents } from "../../utils/money";
import {
  getIngestLedger,
  getPendingTransactions,
  recordLedgerEntries,
  removePendingTransaction,
  removePendingTransactions,
  upsertPendingTransactions,
} from "../../storage/reviewInboxStorage";
import {
  deleteMerchantRule,
  getMerchantRules,
  touchRuleUsage,
  updateMerchantRule,
  upsertMerchantRule,
} from "../../storage/merchantRulesStorage";
import { generateUUID } from "../../utils/uuid";
import { sanitizeTextInput } from "../../utils/sanitize";
import { entryPersonIds, personAssignmentFields } from "../../utils/entryPeople";
import { pendingFingerprintFor, planInboxReconciliation } from "./ingest";
import {
  matchMerchantRule,
  renameForRule,
  replanInboxForRules,
  selectAutoApprovable,
} from "./merchant";
import { normalizeLentTo } from "../../utils/loans";

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
   * People to assign the entry to (expenses only) - one or many, see
   * utils/entryPeople. `null` (or `[]`) = explicitly nobody; undefined =
   * fall back to the item's rule/card-suggested people.
   */
  personIds?: readonly string[] | null;
  /**
   * Recurring bill this transaction is the actual charge for (expenses
   * only; see BudgetEntry.fulfillsRecurringId). `null` = explicitly none;
   * undefined = fall back to the item's rule-suggested bill. Always
   * re-validated against the live entries: a bill that is gone, no longer
   * recurring, or off-cycle in the transaction's month yields a plain entry.
   */
  fulfillsRecurringId?: string | null;
  /**
   * Who the money was lent to, when the transaction is a loan the user
   * expects back (expenses only; see BudgetEntry.lentTo). Free text,
   * normalized here. Never remembered on a merchant rule - a loan is a
   * one-off. `null`/undefined = not a loan.
   */
  lentTo?: string | null;
  /**
   * Save an auto-approve merchant rule: future fetches turn matching
   * transactions straight into entries with this category - plus the
   * entered name (when it differs from the bank's text), business, and
   * person. Callers should follow up with applyRulesToInbox() so items
   * already waiting get swept too.
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
 * The bill id an approval may stand in for, or undefined when the requested
 * bill can't be fulfilled in the transaction's month. Reads the live entries
 * so a stale rule (bill deleted, made one-off, linked to an account) never
 * produces a dangling link that hides nothing and confuses the badge.
 */
const resolveFulfillment = async (
  billId: string | undefined,
  postedAt: string,
): Promise<string | undefined> => {
  if (!billId) return undefined;
  const entries = await getBudgetEntries();
  const bill = entries.find((entry) => entry.id === billId);
  if (!bill || !isBillCandidate(bill)) return undefined;
  if (!isEntryActiveInMonth(bill, entryMonthKey(postedAt))) return undefined;
  return billId;
};

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
  const people = personAssignmentFields(
    type === "expense"
      ? (opts.personIds === null
          ? []
          : opts.personIds ??
            entryPersonIds({
              personId: item.suggestedPersonId,
              personIds: item.suggestedPersonIds,
            }))
      : [],
  );
  const fulfillsRecurringId =
    type === "expense"
      ? await resolveFulfillment(
          opts.fulfillsRecurringId === null
            ? undefined
            : opts.fulfillsRecurringId ?? item.suggestedRecurringId,
          item.postedAt,
        )
      : undefined;
  const lentTo = type === "expense" ? normalizeLentTo(opts.lentTo) : undefined;
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
    ...people,
    fulfillsRecurringId,
    lentTo,
  };

  await addBudgetEntry(entry);
  await recordLedgerEntries({
    [item.id]: ledgerEntryFor(item, "approved", entry.id),
  });
  await removePendingTransaction(item.id);

  if (opts.rememberRule && item.merchant) {
    // Only remember a rename when the saved name actually differs from the
    // bank's default text - an untouched name keeps future imports raw.
    // Compared in sanitized form on both sides (see renameForRule): the
    // saved name has been through sanitizeTextInput, the bank text hasn't,
    // so a stray control character used to pin a bogus rename.
    const renameTo = renameForRule(description, item.description);
    await upsertMerchantRule({
      id: generateUUID(),
      merchantKey: item.merchant,
      // Full auto-approve, not just a suggestion - "always do this" on
      // Approve means future imports skip the inbox entirely.
      action: "approve",
      category: opts.category,
      type,
      renameTo,
      businessId,
      // Everyone picked, not just the first - see MerchantRule.personIds.
      ...people,
      // Remember the bill too, so next month's charge fulfils it hands-free.
      recurringEntryId: fulfillsRecurringId,
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

/**
 * Retire inbox rows that were decided elsewhere after they were fetched -
 * a partner's approved entry or dismissed-transaction decision that arrived
 * over sync, or this device's own ledger after a crash between the ledger
 * write and the inbox removal. Runs before every bank-sync pass and after
 * every applied partner diff (see planInboxReconciliation for the rules).
 * Same crash-safe order as approval: ledger first, inbox removal last, so
 * an interrupted run leaves at worst a row the next run retires again.
 * Returns how many rows went.
 */
export const reconcileInboxWithDecisions = async (): Promise<number> => {
  const inbox = await getPendingTransactions();
  if (inbox.length === 0) return 0;
  const [ledger, entries] = await Promise.all([
    getIngestLedger(),
    getBudgetEntriesIncludingDeleted(),
  ]);
  const knownEntries = new Map<string, string>();
  for (const entry of entries) {
    if (entry.externalTxId) knownEntries.set(entry.externalTxId, entry.id);
  }
  const plan = planInboxReconciliation({
    inbox,
    ledger,
    knownEntries,
    now: new Date().toISOString(),
  });
  if (plan.removeIds.length === 0) return 0;
  await recordLedgerEntries(plan.ledgerWrites);
  await removePendingTransactions(plan.removeIds);
  return plan.removeIds.length;
};

export const dismissPendingTransaction = (pendingId: string): Promise<void> =>
  dismissPendingTransactions([pendingId]);

/**
 * File an outflow as a contribution to a purchase plan instead of an
 * expense: the amount lands on the plan's `currentAmount`, the row is
 * retired with a DISMISSED ledger entry (no BudgetEntry - a transfer into
 * savings isn't spending, and the decision still syncs so a partner's
 * inbox retires the same row), and the inbox row goes. Same crash-safe
 * order as approval: the money first, ledger second, inbox removal last.
 * Returns the live goals, or null when the item or plan no longer exists.
 */
export const applyPendingTransferToPlan = async (
  pendingId: string,
  goalId: string,
): Promise<SavingsGoal[] | null> => {
  const inbox = await getPendingTransactions();
  const item = inbox.find((row) => row.id === pendingId);
  if (!item) return null;
  const amount = Math.abs(item.amount);
  if (!(amount > 0)) return null;
  const goals = await getSavingsGoals();
  const goal = goals.find((candidate) => candidate.id === goalId);
  if (!goal || goal.category === "emergency_fund") return null;

  const updated = await updateSavingsGoal(goalId, {
    currentAmount: roundToCents(goal.currentAmount + amount),
  });
  await recordLedgerEntries({ [item.id]: ledgerEntryFor(item, "dismissed") });
  await removePendingTransaction(item.id);
  return updated;
};

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

/**
 * Approve every inbox item covered by an "approve" rule, deriving the
 * entry's fields from the RULE (not the item's possibly-stale suggestions).
 * Pending, transfer-likely, and duplicate-likely items are never touched -
 * see selectAutoApprovable. Returns how many entries were created. Runs
 * after every connections sync pass and after any rule change.
 */
export const autoApproveInboxByRules = async (): Promise<number> => {
  const [inbox, rules] = await Promise.all([
    getPendingTransactions(),
    getMerchantRules(),
  ]);
  const targets = selectAutoApprovable(inbox, rules);
  let approved = 0;
  for (const { item, rule } of targets) {
    const entry = await approvePendingTransaction({
      pendingId: item.id,
      category: rule.category,
      description: rule.renameTo ?? item.description,
      // null = explicitly what the rule says (or nothing), never a stale
      // per-item suggestion from an older rule version.
      businessId: rule.businessId ?? null,
      personIds: entryPersonIds(rule),
      fulfillsRecurringId: rule.recurringEntryId ?? null,
    });
    if (entry) {
      await touchRuleUsage(rule.id);
      approved += 1;
    }
  }
  return approved;
};

/**
 * Bring the inbox fully in line with the current rule set: refresh
 * suggestions, dismiss items covered by ignore rules, then auto-approve
 * items covered by approve rules. Call sites run this after saving an
 * "always do this" rule so the items still waiting get handled too.
 */
export const applyRulesToInbox = async (): Promise<{
  dismissedCount: number;
  recategorizedCount: number;
  autoApprovedCount: number;
}> => {
  const replan = await reapplyRulesToInbox();
  const autoApprovedCount = await autoApproveInboxByRules();
  return { ...replan, autoApprovedCount };
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
  const [inbox, rules, links] = await Promise.all([
    getPendingTransactions(),
    getMerchantRules(),
    getLinks(),
  ]);
  const personIdByAccount = new Map<string, string>();
  for (const link of links) {
    if (link.personId) personIdByAccount.set(link.externalAccountId, link.personId);
  }
  const plan = replanInboxForRules(
    inbox,
    rules,
    new Date().toISOString(),
    personIdByAccount,
  );
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
  action: "categorize" | "ignore" | "approve";
  /** Required when action is "categorize"/"approve"; ignored otherwise. */
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
   * People to assign future approved expenses to (one or many). `null` or
   * `[]` clears them; omit to keep the rule's current people.
   */
  personIds?: readonly string[] | null;
  /**
   * Recurring bill future approved expenses fulfil (see
   * MerchantRule.recurringEntryId). Same null/omit contract as businessId.
   */
  recurringEntryId?: string | null;
}

/**
 * Change what an existing rule does - switch between auto-approve, suggest
 * ("always categorize as X"), and "always skip", pick a different category,
 * or adjust the remembered rename/business/person - then bring the inbox in
 * line with the new behavior (including auto-approving newly covered items).
 */
export const changeMerchantRule = async (
  opts: ChangeRuleOptions,
): Promise<{
  dismissedCount: number;
  recategorizedCount: number;
  autoApprovedCount: number;
}> => {
  const rules = await getMerchantRules();
  const rule = rules.find((r) => r.id === opts.ruleId);
  if (!rule) {
    return { dismissedCount: 0, recategorizedCount: 0, autoApprovedCount: 0 };
  }
  const renameTo =
    opts.renameTo === undefined
      ? rule.renameTo
      : sanitizeTextInput(opts.renameTo).slice(0, MAX_DESCRIPTION_LENGTH).trim() ||
        undefined;
  const businessId =
    opts.businessId === undefined
      ? rule.businessId
      : opts.businessId ?? undefined;
  const people =
    opts.personIds === undefined
      ? { personId: rule.personId, personIds: rule.personIds }
      : personAssignmentFields(opts.personIds ?? []);
  const recurringEntryId =
    opts.recurringEntryId === undefined
      ? rule.recurringEntryId
      : opts.recurringEntryId ?? undefined;
  await updateMerchantRule(opts.ruleId, {
    action: opts.action,
    category:
      opts.action !== "ignore" && opts.category
        ? opts.category
        : rule.category,
    type: rule.type,
    renameTo,
    businessId,
    ...people,
    recurringEntryId,
  });
  return applyRulesToInbox();
};

/** Delete a rule and clear/re-derive the suggestions it produced. */
export const removeMerchantRule = async (
  ruleId: string,
): Promise<{
  dismissedCount: number;
  recategorizedCount: number;
  autoApprovedCount: number;
}> => {
  await deleteMerchantRule(ruleId);
  // The full sweep, not just the replan: deleting one rule can hand items
  // to another prefix-matching rule that auto-approves.
  return applyRulesToInbox();
};

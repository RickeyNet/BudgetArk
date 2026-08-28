/**
 * BudgetArk - Bank Connections: Merchant Normalization + Rule Matching
 * File: src/services/connections/merchant.ts
 *
 * Bank transaction descriptions arrive noisy ("COSTCO WHSE #1234 06/28",
 * "SQ *BLUE BOTTLE COFFEE"). normalizeMerchant collapses them into a stable
 * key that survives store numbers and dates, so one remembered rule covers
 * every visit to the same merchant. Pure - node-testable.
 */

import type { MerchantRule, PendingTransaction } from "../../types";
import { sanitizeTextInput } from "../../utils/sanitize";

export const MERCHANT_KEY_MAX_LENGTH = 40;

/** Minimum key length before prefix matching is allowed (avoids "SQ" matching everything). */
export const MIN_PREFIX_MATCH_LENGTH = 6;

/** Tokens that carry no merchant identity: pure digits, store #1234, dates, long refs. */
const NOISE_TOKEN = /^(#?\d+|\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?|[A-Z0-9]{10,})$/;

/**
 * Collapse a raw bank description into a stable merchant key:
 * uppercase, control chars stripped, punctuation-collapsed, noise tokens
 * (store numbers, dates, reference ids) dropped, capped at 40 chars.
 * Returns "" for descriptions with no usable identity.
 */
export const normalizeMerchant = (description: string): string => {
  const cleaned = sanitizeTextInput(description)
    .toUpperCase()
    .replace(/[*_|,;:~]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  const tokens = cleaned.split(" ").filter((token) => !NOISE_TOKEN.test(token));
  return tokens.join(" ").slice(0, MERCHANT_KEY_MAX_LENGTH).trim();
};

/**
 * Find the rule for a merchant key. Exact match wins; otherwise the longest
 * prefix relationship (either direction, both sides >= MIN_PREFIX_MATCH_LENGTH)
 * so "COSTCO WHSE" still matches a rule saved as "COSTCO WHSE GAS".
 */
/**
 * The rename to remember on a rule, or undefined when the user kept the
 * bank's text. `savedName` is what the Review Inbox saved (already through
 * sanitizeTextInput); `bankDescription` is the provider's raw text, so it
 * is sanitized the same way before comparing - otherwise a control
 * character in the bank text made an untouched name look "renamed" and
 * pinned the bank's own text as a rename rule.
 */
export const renameForRule = (
  savedName: string,
  bankDescription: string,
): string | undefined => {
  const saved = savedName.trim();
  if (!saved) return undefined;
  return saved === sanitizeTextInput(bankDescription).trim() ? undefined : saved;
};

export const matchMerchantRule = (
  merchant: string,
  rules: MerchantRule[],
): MerchantRule | undefined => {
  if (!merchant) return undefined;
  const exact = rules.find((rule) => rule.merchantKey === merchant);
  if (exact) return exact;
  if (merchant.length < MIN_PREFIX_MATCH_LENGTH) return undefined;

  let best: MerchantRule | undefined;
  let bestLength = 0;
  for (const rule of rules) {
    const key = rule.merchantKey;
    if (key.length < MIN_PREFIX_MATCH_LENGTH) continue;
    const shorter = Math.min(key.length, merchant.length);
    if (shorter < MIN_PREFIX_MATCH_LENGTH) continue;
    const isPrefix = key.startsWith(merchant) || merchant.startsWith(key);
    if (isPrefix && shorter > bestLength) {
      best = rule;
      bestLength = shorter;
    }
  }
  return best;
};

export interface AutoApprovable {
  item: PendingTransaction;
  rule: MerchantRule;
}

/**
 * Inbox items an "approve" rule may turn into entries without review.
 * Deliberately conservative - these always stay for the user:
 *  - pending transactions (the posted amount can still change, e.g. tips);
 *  - transferLikely / duplicateLikely items (same exclusions as the bulk
 *    "Approve N with suggested categories" bar);
 *  - items with no usable merchant key.
 * Pure - the service loops the selection through approvePendingTransaction.
 */
export const selectAutoApprovable = (
  items: readonly PendingTransaction[],
  rules: MerchantRule[],
): AutoApprovable[] => {
  const result: AutoApprovable[] = [];
  for (const item of items) {
    if (item.pending || item.transferLikely || item.duplicateLikely) continue;
    if (!item.merchant) continue;
    const rule = matchMerchantRule(item.merchant, rules);
    if (rule?.action !== "approve") continue;
    result.push({ item, rule });
  }
  return result;
};

export interface InboxReplan {
  /** Items whose suggestedCategory changed under the current rule set. */
  updatedItems: PendingTransaction[];
  /** Items now covered by an "ignore" rule - to be dismissed. */
  dismissIds: string[];
}

/**
 * Re-derive inbox items' rule outcomes after the rule set changed (a rule was
 * edited, retargeted, or deleted). Each item is re-matched against the FULL
 * current rule set - so deleting one rule can hand an item to another rule
 * that also prefix-matches it, exactly as a fresh ingest would.
 *
 * `personIdByAccount` is the account-level "whose card is this" fallback
 * (ExternalAccountLink.personId keyed by externalAccountId) - without it a
 * rule edit would wipe card-derived person suggestions that a fresh ingest
 * would have re-applied.
 */
export const replanInboxForRules = (
  items: PendingTransaction[],
  rules: MerchantRule[],
  now: string,
  personIdByAccount?: ReadonlyMap<string, string>,
): InboxReplan => {
  const updatedItems: PendingTransaction[] = [];
  const dismissIds: string[] = [];
  for (const item of items) {
    const rule = item.merchant
      ? matchMerchantRule(item.merchant, rules)
      : undefined;
    if (rule?.action === "ignore") {
      dismissIds.push(item.id);
      continue;
    }
    const suggestedCategory = rule?.category;
    const suggestedName = rule?.renameTo;
    const suggestedBusinessId =
      item.suggestedType === "expense" ? rule?.businessId : undefined;
    const suggestedPersonId =
      item.suggestedType === "expense"
        ? (rule?.personId ?? personIdByAccount?.get(item.externalAccountId))
        : undefined;
    if (
      suggestedCategory !== item.suggestedCategory ||
      suggestedName !== item.suggestedName ||
      suggestedBusinessId !== item.suggestedBusinessId ||
      suggestedPersonId !== item.suggestedPersonId
    ) {
      updatedItems.push({
        ...item,
        suggestedCategory,
        suggestedName,
        suggestedBusinessId,
        suggestedPersonId,
        updatedAt: now,
      });
    }
  }
  return { updatedItems, dismissIds };
};

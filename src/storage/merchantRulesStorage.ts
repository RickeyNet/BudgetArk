/**
 * BudgetArk - Merchant Rules Storage
 * File: src/storage/merchantRulesStorage.ts
 *
 * Remembered merchant -> category rules, created when the user approves a
 * Review Inbox item with "always use this category". Unique on merchantKey.
 * PER-DEVICE in v1 (no tombstones); a safe candidate for P2P sync later -
 * see the note in src/sync/types.ts.
 */

import * as EncryptedStorage from "./encryptedStorage";
import type { MerchantRule } from "../types";

const STORAGE_KEY = "@budgetark_merchant_rules" as const;

export const getMerchantRules = async (): Promise<MerchantRule[]> => {
  const raw = await EncryptedStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MerchantRule[]) : [];
  } catch {
    return [];
  }
};

const writeMerchantRules = async (rules: MerchantRule[]): Promise<void> => {
  await EncryptedStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
};

/**
 * Insert or replace by merchantKey. A re-remembered merchant keeps its id
 * and createdAt but takes the new category/type.
 */
export const upsertMerchantRule = async (
  rule: MerchantRule,
): Promise<MerchantRule[]> => {
  const rules = await getMerchantRules();
  const index = rules.findIndex((r) => r.merchantKey === rule.merchantKey);
  const updated =
    index >= 0
      ? rules.map((r, i) =>
          i === index
            ? {
                ...rule,
                id: r.id,
                createdAt: r.createdAt,
                useCount: r.useCount,
                updatedAt: new Date().toISOString(),
              }
            : r,
        )
      : [...rules, rule];
  await writeMerchantRules(updated);
  return updated;
};

/**
 * Patch an existing rule's behavior (action/category/type/rename/business)
 * by id, preserving its identity fields (merchantKey, createdAt, useCount).
 * Returns the updated list; no-op when the id is unknown.
 */
export const updateMerchantRule = async (
  ruleId: string,
  patch: Pick<
    MerchantRule,
    "action" | "category" | "type" | "renameTo" | "businessId"
  >,
): Promise<MerchantRule[]> => {
  const rules = await getMerchantRules();
  const updated = rules.map((r) =>
    r.id === ruleId
      ? { ...r, ...patch, updatedAt: new Date().toISOString() }
      : r,
  );
  await writeMerchantRules(updated);
  return updated;
};

export const deleteMerchantRule = async (
  ruleId: string,
): Promise<MerchantRule[]> => {
  const rules = await getMerchantRules();
  const remaining = rules.filter((r) => r.id !== ruleId);
  if (remaining.length !== rules.length) {
    await writeMerchantRules(remaining);
  }
  return remaining;
};

/** Bump usage stats when a rule's suggestion is accepted. */
export const touchRuleUsage = async (ruleId: string): Promise<void> => {
  const rules = await getMerchantRules();
  const now = new Date().toISOString();
  const updated = rules.map((r) =>
    r.id === ruleId
      ? { ...r, useCount: r.useCount + 1, lastUsedAt: now, updatedAt: now }
      : r,
  );
  await writeMerchantRules(updated);
};

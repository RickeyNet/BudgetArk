/**
 * BudgetArk - Subscription Ignore List Storage
 * File: src/storage/subscriptionIgnoreStorage.ts
 *
 * Device-local list of merchant keys the user marked "not a subscription"
 * in the Subscription Detective card. Deliberately NOT synced or exported:
 * it is a viewing preference (which rows to hide), and a partner may want
 * to see the same merchant flagged on their own phone. Fail-closed parse -
 * anything that isn't an array of short strings reads as empty.
 */

import * as EncryptedStorage from "./encryptedStorage";
import { MERCHANT_KEY_MAX_LENGTH } from "../services/connections/merchant";

const IGNORE_KEY = "@budgetark_subscription_ignored_merchants" as const;
export const MAX_IGNORED_SUBSCRIPTION_MERCHANTS = 500;

export const parseIgnoredMerchants = (raw: string | null): string[] => {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: string[] = [];
    for (const value of parsed) {
      if (typeof value !== "string" || !value || value.length > MERCHANT_KEY_MAX_LENGTH) {
        continue;
      }
      if (!out.includes(value)) out.push(value);
      if (out.length >= MAX_IGNORED_SUBSCRIPTION_MERCHANTS) break;
    }
    return out;
  } catch {
    return [];
  }
};

export const getIgnoredSubscriptionMerchants = async (): Promise<string[]> =>
  parseIgnoredMerchants(await EncryptedStorage.getItem(IGNORE_KEY));

export const ignoreSubscriptionMerchant = async (merchant: string): Promise<string[]> => {
  let next: string[] = [];
  await EncryptedStorage.updateItem(IGNORE_KEY, (current) => {
    const list = parseIgnoredMerchants(current);
    next = list.includes(merchant)
      ? list
      : [...list, merchant].slice(-MAX_IGNORED_SUBSCRIPTION_MERCHANTS);
    return JSON.stringify(next);
  });
  return next;
};

export const unignoreSubscriptionMerchant = async (merchant: string): Promise<string[]> => {
  let next: string[] = [];
  await EncryptedStorage.updateItem(IGNORE_KEY, (current) => {
    next = parseIgnoredMerchants(current).filter((key) => key !== merchant);
    return JSON.stringify(next);
  });
  return next;
};

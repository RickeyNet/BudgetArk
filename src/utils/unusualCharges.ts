/**
 * BudgetArk - Unusual Charge Flags
 * File: src/utils/unusualCharges.ts
 *
 * Why: a $340 charge from a merchant that usually bills $40, or a $600
 * first-ever charge, deserves a second look before it's approved - fraud,
 * a price hike, or a double charge all look like this. The Review Inbox
 * shows a warning line on such rows. A FLAG ONLY: nothing is ever skipped
 * or held back automatically (same stance as transferLikely). History is
 * the user's own approved entries for the merchant key. Pure.
 */

import type { BudgetEntry, PendingTransaction } from "../types";

/** Approved charges from the merchant before "usual" means anything. */
export const UNUSUAL_MIN_HISTORY = 3;
/** Flag when the charge is at least this multiple of the usual amount... */
export const UNUSUAL_RATIO = 2;
/** ...and at least this much more in absolute terms (a $4 → $9 coffee isn't news). */
export const UNUSUAL_MIN_DELTA = 25;
/** A first-ever charge from a merchant at or above this is worth a look. */
export const FIRST_TIME_LARGE_AMOUNT = 200;

export type UnusualCharge =
  | { kind: "above-usual"; usual: number; ratio: number }
  | { kind: "first-time"; amount: number };

export type FlaggableTransaction = Pick<
  PendingTransaction,
  "id" | "merchant" | "amount" | "transferLikely" | "duplicateLikely"
>;

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/** Merchant key → amounts of live approved expenses, for one pass over entries. */
export const buildMerchantHistory = (
  entries: readonly BudgetEntry[],
): Map<string, number[]> => {
  const history = new Map<string, number[]>();
  for (const entry of entries) {
    if (entry.deletedAt || !entry.merchant || entry.type !== "expense") continue;
    if (entry.recurring) continue;
    history.set(entry.merchant, [...(history.get(entry.merchant) ?? []), entry.amount]);
  }
  return history;
};

/**
 * The flag for one outflow, or null. Inflows, likely transfers and likely
 * duplicates are never flagged (they have their own sections).
 */
export const flagUnusualCharge = (
  item: Omit<FlaggableTransaction, "id">,
  history: ReadonlyMap<string, readonly number[]>,
): UnusualCharge | null => {
  if (!(item.amount < 0) || item.transferLikely || item.duplicateLikely) return null;
  if (!item.merchant) return null;
  const amount = Math.abs(item.amount);
  const past = history.get(item.merchant) ?? [];
  if (past.length === 0) {
    return amount >= FIRST_TIME_LARGE_AMOUNT ? { kind: "first-time", amount } : null;
  }
  if (past.length < UNUSUAL_MIN_HISTORY) return null;
  const usual = Math.round(median([...past]) * 100) / 100;
  if (usual <= 0) return null;
  if (amount >= usual * UNUSUAL_RATIO && amount - usual >= UNUSUAL_MIN_DELTA) {
    return { kind: "above-usual", usual, ratio: Math.round((amount / usual) * 10) / 10 };
  }
  return null;
};

/** Flags for a whole inbox, keyed by pending id (history built once). */
export const flagUnusualCharges = (
  items: readonly FlaggableTransaction[],
  entries: readonly BudgetEntry[],
): Map<string, UnusualCharge> => {
  const history = buildMerchantHistory(entries);
  const flags = new Map<string, UnusualCharge>();
  for (const item of items) {
    const flag = flagUnusualCharge(item, history);
    if (flag) flags.set(item.id, flag);
  }
  return flags;
};

/** One short line for the row. */
export const describeUnusualCharge = (
  flag: UnusualCharge,
  money: (amount: number) => string,
): string =>
  flag.kind === "first-time"
    ? "First charge from this merchant - worth a look"
    : `${flag.ratio}× the usual ${money(flag.usual)} - worth a look`;

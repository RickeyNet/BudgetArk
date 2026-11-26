/**
 * BudgetArk - Refunds (money back on a purchase)
 * File: src/utils/refunds.ts
 *
 * A return lands in the bank feed as a deposit, but it is not income: it
 * is spending coming back. An entry marked `refund` therefore counts as
 * NEGATIVE spending in its (spending) category for the month the money
 * landed, and stays out of every income total and the income list.
 *
 * Stored as an ordinary positive-amount income entry plus the flag,
 * deliberately not as a negative expense: older app versions reject
 * negative amounts outside a few categories, and one rejected entry fails
 * a whole partner sync. An older peer simply sees the refund as income -
 * the pre-refund behavior - and the month's net is identical either way.
 *
 * Every total that splits income from spending asks these helpers instead
 * of reading `type` directly, so no two screens can disagree about which
 * side a refund sits on. Pure and unit-tested.
 */

import type { BudgetEntry } from "../types";

type RefundShape = Pick<BudgetEntry, "type" | "refund" | "recurring">;

/** A one-off deposit the user marked as money back on a purchase. */
export const isRefundEntry = (entry: RefundShape): boolean =>
  entry.type === "income" && entry.refund === true && !entry.recurring;

/** Income that is really income: everything typed income except refunds. */
export const isEarnedIncome = (entry: RefundShape): boolean =>
  entry.type === "income" && !isRefundEntry(entry);

/** Belongs on the spending side: an expense, or a refund offsetting one. */
export const countsAsSpending = (entry: RefundShape): boolean =>
  entry.type === "expense" || isRefundEntry(entry);

/**
 * What the entry adds to spending: its amount for an expense, minus its
 * amount for a refund, 0 for earned income.
 */
export const spendingAmount = (
  entry: RefundShape & Pick<BudgetEntry, "amount">
): number =>
  isRefundEntry(entry) ? -entry.amount : entry.type === "expense" ? entry.amount : 0;

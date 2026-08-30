/**
 * BudgetArk - Recurring Bill Detection
 * File: src/utils/recurringBillDetection.ts
 *
 * The front half of bill fulfilment (utils/billFulfillment): a merchant
 * that has charged once a month for RECURRING_BILL_MIN_MONTHS consecutive
 * months, with no recurring bill on file for it, is almost certainly a
 * bill the user never set up. The Review Inbox offers to create it with
 * the average charge as the estimate and the usual posting day, so the
 * bank teaches the budget instead of the user typing the bill first.
 *
 * "Once a month" is the filter that keeps grocery stores and coffee shops
 * out: any month with two or more charges from the merchant disqualifies
 * it. Pure and unit-tested; the inbox only renders the result.
 */

import type { BudgetEntry, PendingTransaction } from "../types";
import { entryMonthKey } from "./billFulfillment";

/** This charge plus this many prior consecutive monthly charges. */
export const RECURRING_BILL_MIN_MONTHS = 3;

export interface RecurringBillSuggestion {
  merchant: string;
  /** Name for the new bill: the rule's display name, else the last approved name. */
  label: string;
  /** Mean of the charges across the qualifying months, to cents. */
  averageAmount: number;
  /** Median posting day, for the bill's "day it hits". */
  dayOfMonth: number;
  /** Qualifying months, oldest first (the current charge's month last). */
  months: string[];
}

export type DetectableTransaction = Pick<
  PendingTransaction,
  "merchant" | "amount" | "postedAt" | "description"
> &
  Partial<Pick<PendingTransaction, "suggestedName" | "suggestedRecurringId">>;

/** YYYY-MM shifted by `delta` months, pure string math (no timezone). */
export const shiftMonthKey = (monthKey: string, delta: number): string => {
  const [y, m] = monthKey.split("-").map(Number);
  const index = y * 12 + (m - 1) + delta;
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

const dayOf = (iso: string): number => {
  const day = Number(iso.slice(8, 10));
  return Number.isFinite(day) && day >= 1 ? day : 1;
};

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
};

/**
 * Suggest a recurring bill for this pending charge, or null when it does
 * not look like one: an inflow, no merchant key, already expected to
 * fulfil a bill, a bill already on file for the merchant, or the merchant
 * did not post exactly once in each of the preceding months.
 */
export const detectRecurringBill = (
  item: DetectableTransaction,
  entries: readonly BudgetEntry[]
): RecurringBillSuggestion | null => {
  if (!(item.amount < 0) || !item.merchant || item.suggestedRecurringId) return null;
  const merchant = item.merchant;

  const live = entries.filter((e) => !e.deletedAt && e.merchant === merchant);
  if (live.some((e) => e.recurring && e.type === "expense")) return null;

  const priors = live.filter(
    (e) => e.type === "expense" && !e.recurring && !e.fulfillsRecurringId
  );
  const thisMonth = entryMonthKey(item.postedAt);
  const byMonth = new Map<string, BudgetEntry[]>();
  for (const entry of priors) {
    const key = entryMonthKey(entry.date);
    byMonth.set(key, [...(byMonth.get(key) ?? []), entry]);
  }
  // A second charge this month, or two in any prior month, is a store.
  if (byMonth.has(thisMonth)) return null;

  const months: string[] = [];
  const amounts: number[] = [Math.abs(item.amount)];
  const days: number[] = [dayOf(item.postedAt)];
  let lastPrior: BudgetEntry | null = null;
  for (let back = 1; back < RECURRING_BILL_MIN_MONTHS; back++) {
    const key = shiftMonthKey(thisMonth, -back);
    const inMonth = byMonth.get(key);
    if (!inMonth || inMonth.length !== 1) return null;
    months.unshift(key);
    amounts.push(inMonth[0].amount);
    days.push(dayOf(inMonth[0].date));
    if (!lastPrior || inMonth[0].date > lastPrior.date) lastPrior = inMonth[0];
  }
  months.push(thisMonth);

  const label =
    item.suggestedName?.trim() ||
    lastPrior?.description?.trim() ||
    item.description?.trim() ||
    merchant;

  return {
    merchant,
    label,
    averageAmount: round2(amounts.reduce((sum, a) => sum + a, 0) / amounts.length),
    dayOfMonth: Math.min(28, Math.max(1, median(days))),
    months,
  };
};

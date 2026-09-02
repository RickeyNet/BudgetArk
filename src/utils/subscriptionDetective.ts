/**
 * BudgetArk - Subscription Detective
 * File: src/utils/subscriptionDetective.ts
 *
 * Why: subscriptions hide in plain sight - a merchant that charges the
 * same amount once a month (or once a year) with no recurring bill on
 * file. The Charts-tab card lists them with the annualized cost so the
 * user can make each one a bill (it then joins the budget's projections
 * and bill fulfilment) or mark it "not a subscription". Reads only the
 * merchant key that bank-approved entries carry, so manual entries never
 * qualify - the bank teaches the budget, same as recurringBillDetection,
 * which this generalizes: any lookback, yearly cadence, and amount
 * consistency (a restaurant visited once a month is not a subscription).
 * Pure and unit-tested; the card only renders and creates.
 */

import type { BudgetEntry, CategoryName, RecurrenceInterval } from "../types";
import { entryMonthKey } from "./billFulfillment";
import { shiftMonthKey } from "./recurringBillDetection";

/** A monthly subscription needs a charge in each of this many recent months. */
export const SUBSCRIPTION_MIN_MONTHS = 3;
/** A yearly one needs this many consecutive years. */
export const SUBSCRIPTION_MIN_YEARS = 2;
/** Only entries this far back matter (older history is a different life). */
export const SUBSCRIPTION_LOOKBACK_MONTHS = 26;
/** Charges may drift this share of the median (or $5) and still be "the same". */
export const SUBSCRIPTION_AMOUNT_TOLERANCE = 0.3;
export const SUBSCRIPTION_AMOUNT_TOLERANCE_FLOOR = 5;

export type SubscriptionCadence = "monthly" | "yearly";

export interface DetectedSubscription {
  merchant: string;
  /** Display name: the latest charge's description, else the merchant key. */
  label: string;
  /** Category of the latest charge - the bill's default category. */
  category: CategoryName;
  cadence: SubscriptionCadence;
  /** Mean charge across the qualifying occurrences, to cents. */
  averageAmount: number;
  /** averageAmount × 12 for monthly, × 1 for yearly. */
  annualCost: number;
  occurrences: number;
  /** ISO date of the latest charge. */
  lastDate: string;
  /** Median posting day, for the bill's "day it hits" (1-28). */
  dayOfMonth: number;
}

export interface SubscriptionScan {
  subscriptions: DetectedSubscription[];
  annualTotal: number;
  monthlyTotal: number;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

const dayOf = (iso: string): number => {
  const day = Number(iso.slice(8, 10));
  return Number.isFinite(day) && day >= 1 ? day : 1;
};

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/**
 * The spread (largest − smallest) within the tolerance of the smallest
 * charge, or the $5 floor. Measured from the smallest, not a median, so a
 * two-charge yearly pair can't hide a 60% jump between the two.
 */
export const amountsConsistent = (amounts: readonly number[]): boolean => {
  if (amounts.length === 0) return false;
  const smallest = Math.min(...amounts);
  const largest = Math.max(...amounts);
  const band = Math.max(smallest * SUBSCRIPTION_AMOUNT_TOLERANCE, SUBSCRIPTION_AMOUNT_TOLERANCE_FLOOR);
  return largest - smallest <= band;
};

const monthDistance = (fromKey: string, toKey: string): number => {
  const [fy, fm] = fromKey.split("-").map(Number);
  const [ty, tm] = toKey.split("-").map(Number);
  return ty * 12 + tm - (fy * 12 + fm);
};

const build = (
  merchant: string,
  cadence: SubscriptionCadence,
  charges: readonly BudgetEntry[],
): DetectedSubscription => {
  const latest = charges.reduce((best, entry) => (entry.date > best.date ? entry : best));
  const amounts = charges.map((entry) => entry.amount);
  const averageAmount = round2(amounts.reduce((sum, a) => sum + a, 0) / amounts.length);
  return {
    merchant,
    label: latest.description?.trim() || merchant,
    category: latest.category,
    cadence,
    averageAmount,
    annualCost: round2(cadence === "monthly" ? averageAmount * 12 : averageAmount),
    occurrences: charges.length,
    lastDate: latest.date,
    dayOfMonth: Math.min(28, Math.max(1, Math.round(median(charges.map((e) => dayOf(e.date)))))),
  };
};

/**
 * Monthly: exactly one charge in each of the last SUBSCRIPTION_MIN_MONTHS
 * months ending this month or last month (this month's may not have hit
 * yet), never two in any month of the lookback, amounts consistent.
 */
const detectMonthly = (
  merchant: string,
  byMonth: ReadonlyMap<string, BudgetEntry[]>,
  nowKey: string,
): DetectedSubscription | null => {
  for (const charges of byMonth.values()) if (charges.length > 1) return null;
  const anchor = byMonth.has(nowKey)
    ? nowKey
    : byMonth.has(shiftMonthKey(nowKey, -1))
      ? shiftMonthKey(nowKey, -1)
      : null;
  if (!anchor) return null;
  const run: BudgetEntry[] = [];
  for (let back = 0; back < SUBSCRIPTION_MIN_MONTHS; back++) {
    const charges = byMonth.get(shiftMonthKey(anchor, -back));
    if (!charges) return null;
    run.push(charges[0]);
  }
  if (!amountsConsistent(run.map((e) => e.amount))) return null;
  return build(merchant, "monthly", run);
};

/**
 * Yearly: one charge per calendar year in consecutive years ending this
 * year or last year, each landing within a month of the latest one's
 * calendar month, amounts consistent, and no other charges at all.
 */
const detectYearly = (
  merchant: string,
  charges: readonly BudgetEntry[],
  nowKey: string,
): DetectedSubscription | null => {
  if (charges.length < SUBSCRIPTION_MIN_YEARS) return null;
  const sorted = [...charges].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  const latestKey = entryMonthKey(latest.date);
  const monthsAgo = monthDistance(latestKey, nowKey);
  // Still active: the last charge is at most a year (+1 month grace) old.
  if (monthsAgo < 0 || monthsAgo > 13) return null;
  const years = sorted.map((e) => Number(entryMonthKey(e.date).slice(0, 4)));
  for (let i = 1; i < years.length; i++) {
    if (years[i] !== years[i - 1] + 1) return null;
  }
  const latestMonth = Number(latestKey.slice(5, 7));
  for (const entry of sorted) {
    const month = Number(entryMonthKey(entry.date).slice(5, 7));
    const drift = Math.min(
      Math.abs(month - latestMonth),
      12 - Math.abs(month - latestMonth),
    );
    if (drift > 1) return null;
  }
  if (!amountsConsistent(sorted.map((e) => e.amount))) return null;
  return build(merchant, "yearly", sorted);
};

/**
 * Scan live entries for subscription-shaped merchants with no recurring
 * bill on file. `ignoredMerchants` are the user's "not a subscription"
 * answers. Sorted by annual cost, largest first.
 */
export const detectSubscriptions = (
  entries: readonly BudgetEntry[],
  options: { nowKey: string; ignoredMerchants?: readonly string[] },
): SubscriptionScan => {
  const { nowKey } = options;
  const ignored = new Set(options.ignoredMerchants ?? []);
  const windowStart = shiftMonthKey(nowKey, -(SUBSCRIPTION_LOOKBACK_MONTHS - 1));

  const byMerchant = new Map<string, BudgetEntry[]>();
  const hasBill = new Set<string>();
  for (const entry of entries) {
    if (entry.deletedAt || !entry.merchant || entry.type !== "expense") continue;
    if (entry.recurring) {
      hasBill.add(entry.merchant);
      continue;
    }
    if (entry.fulfillsRecurringId) {
      // An actual filed against a bill: that bill already covers it.
      hasBill.add(entry.merchant);
      continue;
    }
    const key = entryMonthKey(entry.date);
    if (key < windowStart || key > nowKey) continue;
    byMerchant.set(entry.merchant, [...(byMerchant.get(entry.merchant) ?? []), entry]);
  }

  const subscriptions: DetectedSubscription[] = [];
  for (const [merchant, charges] of byMerchant) {
    if (hasBill.has(merchant) || ignored.has(merchant)) continue;
    const byMonth = new Map<string, BudgetEntry[]>();
    for (const entry of charges) {
      const key = entryMonthKey(entry.date);
      byMonth.set(key, [...(byMonth.get(key) ?? []), entry]);
    }
    const found = detectMonthly(merchant, byMonth, nowKey) ?? detectYearly(merchant, charges, nowKey);
    if (found) subscriptions.push(found);
  }
  subscriptions.sort((a, b) => b.annualCost - a.annualCost || a.label.localeCompare(b.label));

  const annualTotal = round2(subscriptions.reduce((sum, s) => sum + s.annualCost, 0));
  return { subscriptions, annualTotal, monthlyTotal: round2(annualTotal / 12) };
};

/**
 * The recurring-bill fields for a detected subscription, dated in
 * `nowKey` on its usual day (clamped to the month), with the merchant
 * remembered so the detector never re-offers it. The caller adds id and
 * timestamps (uuid stays out of pure helpers).
 */
export const subscriptionBillFields = (
  subscription: DetectedSubscription,
  nowKey: string,
  lastDayOfMonth: number,
): Omit<BudgetEntry, "id" | "createdAt" | "updatedAt"> => {
  const day = Math.min(subscription.dayOfMonth, lastDayOfMonth);
  const interval: RecurrenceInterval = subscription.cadence === "monthly" ? 1 : 12;
  return {
    type: "expense",
    category: subscription.category,
    amount: subscription.averageAmount,
    description: subscription.label,
    date: `${nowKey}-${String(day).padStart(2, "0")}`,
    recurring: true,
    recurrenceInterval: interval,
    merchant: subscription.merchant,
  };
};

/** "monthly" / "yearly" for a row. */
export const describeCadence = (cadence: SubscriptionCadence): string =>
  cadence === "monthly" ? "monthly" : "yearly";

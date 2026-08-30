/**
 * BudgetArk - Tracking Strip
 * File: src/utils/trackingStrip.ts
 *
 * The numbers behind the Bridge tab's tracking strip: month-to-date spend
 * against the month's limits, how long since anything was logged, and the
 * last few entries the user actually recorded. The app opens on Bridge
 * while the logging habit lives on Budget; the strip answers "did I log?"
 * and "what did I just spend?" without the tab switch. Pure and unit-
 * tested; TrackingStripCard only renders it.
 *
 * "Logged" means entries the user (or a bank approval) created - recurring
 * templates are projections, not acts of tracking, so they are excluded
 * from the recent list and from the last-tracked clock, though their
 * projected amounts still count toward month-to-date spend exactly as the
 * Budget tab counts them.
 */

import type { BudgetEntry, CategoryBudgetLimit } from "../types";
import { describeFulfillment, entriesForMonth } from "./billFulfillment";

export interface TrackingStripRow {
  id: string;
  date: string;
  /** Description, else the category. */
  label: string;
  category: string;
  amount: number;
  type: BudgetEntry["type"];
  /** Set when the entry is the actual charge for a recurring bill. */
  billLabel: string | null;
}

export interface TrackingStripSummary {
  spentThisMonth: number;
  /** Sum of the month's category limits, null when none are set. */
  totalLimits: number | null;
  /** Whole days since the newest logged entry; null when nothing is logged. */
  daysSinceLastEntry: number | null;
  recent: TrackingStripRow[];
}

export const DEFAULT_RECENT_COUNT = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

const round2 = (n: number): number => Math.round(n * 100) / 100;

export interface TrackingStripInput {
  entries: readonly BudgetEntry[];
  limits: readonly CategoryBudgetLimit[];
  monthKey: string;
  now: Date;
  recentCount?: number;
}

export const buildTrackingStrip = ({
  entries,
  limits,
  monthKey,
  now,
  recentCount = DEFAULT_RECENT_COUNT,
}: TrackingStripInput): TrackingStripSummary => {
  const live = entries.filter((e) => !e.deletedAt);

  const spentThisMonth = round2(
    entriesForMonth(live, monthKey)
      .filter((e) => e.type === "expense")
      .reduce((sum, e) => sum + e.amount, 0)
  );

  const liveLimits = limits.filter((l) => !l.deletedAt && l.monthlyLimit > 0);
  const totalLimits =
    liveLimits.length > 0 ? round2(liveLimits.reduce((s, l) => s + l.monthlyLimit, 0)) : null;

  const logged = live
    .filter((e) => !e.recurring)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  let daysSinceLastEntry: number | null = null;
  if (logged.length > 0) {
    const latest = Date.parse(logged[0].createdAt);
    if (Number.isFinite(latest)) {
      daysSinceLastEntry = Math.max(0, Math.floor((now.getTime() - latest) / DAY_MS));
    }
  }

  const byId = new Map(live.map((e) => [e.id, e]));
  const recent: TrackingStripRow[] = logged.slice(0, recentCount).map((e) => ({
    id: e.id,
    date: e.date,
    label: e.description?.trim() || e.category,
    category: e.category,
    amount: e.amount,
    type: e.type,
    billLabel: describeFulfillment(e, byId)?.billLabel ?? null,
  }));

  return { spentThisMonth, totalLimits, daysSinceLastEntry, recent };
};

/** "today" / "yesterday" / "3 days ago" - the strip's habit line. */
export const describeDaysSince = (days: number | null): string => {
  if (days === null) return "nothing logged yet";
  if (days === 0) return "logged today";
  if (days === 1) return "last entry yesterday";
  return `last entry ${days} days ago`;
};
